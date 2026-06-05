import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const evalPath = resolve(root, "docs", "ai-agent", "evals", "visual_draft_agent_v0_1.json");
const artifactDir = resolve(root, "..", "easy-harness-project-materials", "test-artifacts");
const artifactPath = resolve(artifactDir, "agent-draft-lab-eval-latest.json");
const apiUrl = (process.env.AGENT_DRAFT_LAB_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const timeoutMs = Number(process.env.AGENT_DRAFT_LAB_EVAL_TIMEOUT_MS || 360000);

function parseArgs() {
  const args = process.argv.slice(2);
  const caseArg = args.find((item) => item.startsWith("--case="));
  return {
    all: args.includes("--all"),
    strict: args.includes("--strict"),
    cases: caseArg
      ? new Set(caseArg.slice("--case=".length).split(",").map((item) => item.trim()).filter(Boolean))
      : null,
  };
}

function normalizeText(value) {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9+./ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function flattenText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return normalizeText(value);
  }
  if (Array.isArray(value)) return normalizeText(value.map(flattenText).join(" "));
  if (typeof value === "object") return normalizeText(Object.values(value).map(flattenText).join(" "));
  return "";
}

function phraseMatches(haystack, phrase) {
  const normalizedHaystack = normalizeText(haystack);
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return true;
  if (normalizedHaystack.includes(normalizedPhrase)) return true;
  const tokens = normalizedPhrase.split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return true;
  const hits = tokens.filter((token) => normalizedHaystack.includes(token)).length;
  return hits / tokens.length >= 0.68;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function getMapArea(map, area) {
  if (area === "endpoints") return map?.endpoints || [];
  if (area === "harness_sections") return map?.harnessSections || [];
  if (area === "connection_groups") return map?.connectionGroups || [];
  if (area === "open_items") return map?.openItems || [];
  return map?.[area] || [];
}

async function postJson(url, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    if (!response.ok || !json.ok) {
      throw new Error(json.message || `Agent Lab API failed (${response.status}).`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function addCheck(checks, name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
}

function evaluateCase(caseSpec, apiResult) {
  const draft = apiResult.visual_draft_spec || {};
  const map = draft.requirementMap || {};
  const understanding = draft.understanding || {};
  const readiness = understanding.draftReadiness?.state || draft.readiness || "";
  const evidenceText = flattenText([
    draft.files,
    understanding.evidenceCoverage,
    map.evidenceRefs,
    draft.poster?.evidence_items,
  ]);
  const questionText = flattenText([
    draft.customerQuestions,
    understanding.questionPlan,
  ]);
  const reviewText = flattenText([
    draft.easyHarnessReview,
    map.easyHarnessReviewItems,
  ]);
  const fullText = flattenText(draft);
  const checks = [];

  addCheck(
    checks,
    "readiness",
    readiness === caseSpec.expected_readiness,
    `expected ${caseSpec.expected_readiness}, got ${readiness || "missing"}`,
  );
  if (readiness === "connection_goal_missing") {
    addCheck(
      checks,
      "topology:not_fabricated",
      !Array.isArray(map.connectionGroups) || map.connectionGroups.length === 0,
      `${Array.isArray(map.connectionGroups) ? map.connectionGroups.length : 0} connection group(s)`,
    );
  }

  for (const [area, phrases] of Object.entries(caseSpec.requirement_map_must_include || {})) {
    const areaText = flattenText(getMapArea(map, area));
    for (const phrase of phrases) {
      addCheck(
        checks,
        `map:${area}:${phrase}`,
        phraseMatches(areaText, phrase),
        areaText.slice(0, 220),
      );
    }
  }

  for (const phrase of caseSpec.must_show_received || []) {
    addCheck(
      checks,
      `evidence:${phrase}`,
      phraseMatches(`${evidenceText} ${fullText}`, phrase),
      evidenceText.slice(0, 220),
    );
  }

  for (const phrase of caseSpec.must_understand || []) {
    addCheck(
      checks,
      `understand:${phrase}`,
      phraseMatches(fullText, phrase),
      fullText.slice(0, 220),
    );
  }

  const policy = caseSpec.question_policy || {};
  if (Number.isFinite(policy.max_questions)) {
    const questionCount = Array.isArray(draft.customerQuestions)
      ? draft.customerQuestions.length
      : 0;
    addCheck(
      checks,
      "question:max_count",
      questionCount <= policy.max_questions,
      `max ${policy.max_questions}, got ${questionCount}`,
    );
  }

  for (const phrase of asArray(policy.required_question_meaning)) {
    addCheck(
      checks,
      `question:required:${phrase}`,
      phraseMatches(questionText, phrase),
      questionText.slice(0, 220),
    );
  }

  for (const phrase of policy.must_not_ask || []) {
    addCheck(
      checks,
      `question:must_not_ask:${phrase}`,
      !phraseMatches(questionText, phrase),
      questionText.slice(0, 220),
    );
  }

  if (policy.must_allow_unknown) {
    addCheck(
      checks,
      "question:allow_unknown",
      !questionText ||
        /(unknown|do not know|if known|if available|mark unknown|identify)/i.test(questionText),
      questionText.slice(0, 220),
    );
  }

  if (policy.must_not_block_review) {
    const blockingQuestions = (understanding.questionPlan || []).filter((item) => item.blocksReview);
    addCheck(
      checks,
      "question:not_blocking",
      blockingQuestions.length === 0,
      `${blockingQuestions.length} blocking question(s)`,
    );
  }

  for (const phrase of caseSpec.easy_harness_review_should_include || []) {
    addCheck(
      checks,
      `review:${phrase}`,
      phraseMatches(reviewText, phrase),
      reviewText.slice(0, 220),
    );
  }

  const passed = checks.filter((check) => check.pass).length;
  return {
    id: caseSpec.id,
    model: apiResult.model,
    readiness,
    checks,
    passed,
    total: checks.length,
    pass: passed === checks.length,
    draftSummary: {
      title: draft.title,
      endpointCount: Array.isArray(map.endpoints) ? map.endpoints.length : 0,
      sectionCount: Array.isArray(map.harnessSections) ? map.harnessSections.length : 0,
      connectionGroupCount: Array.isArray(map.connectionGroups) ? map.connectionGroups.length : 0,
      questionCount: Array.isArray(draft.customerQuestions) ? draft.customerQuestions.length : 0,
    },
  };
}

async function main() {
  const options = parseArgs();
  const evalSpec = JSON.parse(readFileSync(evalPath, "utf8"));
  let cases = evalSpec.cases || [];
  if (options.cases) {
    cases = cases.filter((item) => options.cases.has(item.id));
  }

  if (!cases.length) {
    throw new Error("No eval cases selected.");
  }

  const healthResponse = await fetch(`${apiUrl}/health`);
  const health = await healthResponse.json();
  if (!health.ok) throw new Error(`Agent Lab API is not healthy at ${apiUrl}.`);

  const results = [];
  for (const caseSpec of cases) {
    console.log(`RUN ${caseSpec.id}`);
    const apiResult = await postJson(`${apiUrl}/visual-draft`, {
      input: caseSpec.input,
      files: caseSpec.files_or_observations || [],
    });
    const result = evaluateCase(caseSpec, apiResult);
    results.push(result);
    console.log(`${result.pass ? "PASS" : "FAIL"} ${caseSpec.id} ${result.passed}/${result.total}`);
    for (const check of result.checks.filter((item) => !item.pass)) {
      console.log(`  - ${check.name}: ${check.detail}`);
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    apiUrl,
    model: health.model,
    selected: options.cases ? [...options.cases] : "all",
    pass: results.every((result) => result.pass),
    results,
  };

  if (existsSync(resolve(root, "..", "easy-harness-project-materials"))) {
    mkdirSync(artifactDir, { recursive: true });
    writeFileSync(artifactPath, JSON.stringify(report, null, 2));
    console.log(`WROTE ${artifactPath}`);
  }

  if (options.strict && !report.pass) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
