import http from "node:http";
import { readFileSync, existsSync } from "node:fs";

const defaultSecretPath =
  "D:\\Harness\\easy-harness-project-materials\\secrets\\qwen.local.env";
const secretPath = process.env.QWEN_LOCAL_ENV_PATH || defaultSecretPath;
const port = Number(process.env.AGENT_DRAFT_LAB_PORT || 8787);

function readLocalEnv(path) {
  if (!existsSync(path)) {
    throw new Error(`Secret file not found: ${path}`);
  }
  const env = {};
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const separator = line.indexOf("=");
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

function jsonResponse(response, status, body) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function extractJsonObject(text = "") {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Qwen returned an empty response.");
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    if (withoutFence) return withoutFence;
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function safeString(value, fallback = "", limit = 1200) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, limit)
    : fallback;
}

function safeStringArray(value, limit = 8) {
  return Array.isArray(value)
    ? value
        .map((item) => safeString(item, "", 300))
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function uniqueStrings(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function pickField(object, ...keys) {
  if (!object || typeof object !== "object" || Array.isArray(object)) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key)) return object[key];
  }
  return undefined;
}

function pickArray(object, ...keys) {
  const value = pickField(object, ...keys);
  return Array.isArray(value) ? value : [];
}

function pickObject(object, ...keys) {
  const value = pickField(object, ...keys);
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function pickString(object, keys, fallback = "", limit = 1200) {
  return safeString(pickField(object, ...keys), fallback, limit);
}

function pickBoolean(object, ...keys) {
  const value = pickField(object, ...keys);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return /^(true|yes|1)$/i.test(value.trim());
  return Boolean(value);
}

function normalizeCustomerQuestion(question) {
  const value = safeString(question, "", 260);
  if (!value) return "";
  return value.replace(/\?*$/, "?");
}

function normalizeCustomerQuestions(value) {
  const normalized = safeStringArray(value, 5)
    .map(normalizeCustomerQuestion)
    .filter(Boolean);
  return uniqueStrings(normalized).slice(0, 3);
}

function normalizeQuestionPlan(value, fallbackQuestions) {
  const rawItems = Array.isArray(value) ? value : [];
  const planned = rawItems
    .filter((item) => item && typeof item === "object")
    .slice(0, 4)
    .map((item) => {
      const question = normalizeCustomerQuestion(item.question);
      if (!question) return null;
      return {
        question,
        whyNeeded: safeString(
          item.why_needed,
          "This answer changes the evidence-supported connection scope.",
          220,
        ),
        ifUnknown: safeString(
          item.if_unknown,
          "Easy Harness can keep it open when it does not block an honest Draft.",
          220,
        ),
        blocksReview: Boolean(item.blocks_review),
      };
    })
    .filter(Boolean);

  const fallback = fallbackQuestions.map((question) => ({
    question,
    whyNeeded: "This answer helps Easy Harness avoid organizing the wrong harness scope.",
    ifUnknown: "If unknown, Easy Harness can keep it as a review item and continue with the available evidence.",
    blocksReview: false,
  }));

  const combined = [...planned, ...fallback];
  const seen = new Set();
  return combined
    .filter((item) => {
      const key = item.question.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

function normalizeEvidenceItems(value, fallbackFiles) {
  const rawItems = Array.isArray(value) ? value : [];
  const items = rawItems
    .filter((item) => item && typeof item === "object")
    .slice(0, 10)
    .map((item, index) => ({
      source: safeString(item.source, fallbackFiles[index] || `Source ${index + 1}`, 120),
      understood: safeString(item.understood, "Received as customer-provided material.", 220),
      boundary: safeString(item.boundary, "Use as draft evidence, not final production proof.", 220),
      confidence: safeString(item.confidence, "draft", 40),
    }))
    .filter((item) => item.source || item.understood);

  if (items.length) return items;
  return safeStringArray(fallbackFiles, 8).map((file) => ({
    source: file,
    understood: "Received as customer-provided material.",
    boundary: "Content has not been fully interpreted in this lab unless described in the customer text.",
    confidence: "received",
  }));
}

function normalizeFactTrace(value, fallbackFacts) {
  const rawItems = Array.isArray(value) ? value : [];
  const traced = rawItems
    .filter((item) => item && typeof item === "object")
    .slice(0, 12)
    .map((item, index) => ({
      fact: safeString(item.fact, fallbackFacts[index] || "", 220),
      source: safeString(item.source, "Customer message", 120),
      status: safeString(item.status, "understood", 40),
    }))
    .filter((item) => item.fact);

  if (traced.length) return traced;
  return safeStringArray(fallbackFacts, 10).map((fact) => ({
    fact,
    source: "Agent-organized draft; source not linked",
    status: "needs_evidence_link",
  }));
}

function isSupportedEndpoint(endpoint) {
  const label = safeString(endpoint?.label, "", 100).toLowerCase();
  const role = safeString(endpoint?.role, "", 40).toLowerCase();
  const status = safeString(endpoint?.status, "", 40).toLowerCase();
  if (!label || ["unknown", "source", "target", "other end", "endpoint"].includes(label)) {
    return false;
  }
  if (/\b(missing|unknown|unclear|tbd|to confirm|not stated)\b/.test(label)) return false;
  if (/\bunknown\b/.test(role)) return false;
  if (/\b(missing|unknown|unclear|tbd|confirm)\b/.test(status)) return false;
  return true;
}

function normalizeRequirementMap(rawValue, context) {
  const value =
    rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? rawValue
      : {};
  const evidenceCoverage = context.evidenceCoverage || [];
  const knownFacts = context.understoodItems || [];
  const unknownItems = context.unknownItems || [];
  const customerQuestions = context.customerQuestions || [];
  const easyHarnessReview = context.easyHarnessReview || [];

  const rawEndpoints = pickArray(value, "endpoints", "endpoint_list", "endpointList");
  const endpoints = rawEndpoints
    .filter((item) => item && typeof item === "object")
    .slice(0, 10)
    .map((endpoint, index) => ({
      id: pickString(endpoint, ["id"], `endpoint_${index + 1}`, 80),
      label: pickString(endpoint, ["label", "title", "name"], "", 100),
      role: pickString(endpoint, ["role"], "endpoint", 40),
      knownFrom: pickString(endpoint, ["known_from", "knownFrom", "basis"], "", 180),
      status: pickString(endpoint, ["status"], "partial", 40),
      evidenceRefs: safeStringArray(pickField(endpoint, "evidence_refs", "evidenceRefs", "sources"), 4),
    }))
    .filter(isSupportedEndpoint);

  const rawSections = pickArray(value, "harness_sections", "harnessSections", "sections");
  const harnessSections = rawSections
    .filter((item) => item && typeof item === "object")
    .slice(0, 8)
    .map((section, index) => ({
      id: pickString(section, ["id"], `section_${index + 1}`, 80),
      label: pickString(section, ["label", "title", "name"], "", 100),
      type: pickString(section, ["type"], "route_section", 60),
      lengthBasis: pickString(section, ["length_basis", "lengthBasis"], "", 120),
      routeBasis: pickString(section, ["route_basis", "routeBasis"], "", 140),
      status: pickString(section, ["status"], "draft", 40),
    }))
    .filter((section) => section.label);

  const rawGroups = pickArray(value, "connection_groups", "connectionGroups", "wire_groups", "wireGroups");
  const endpointIds = new Set(endpoints.map((endpoint) => endpoint.id));
  const connectionGroups = rawGroups
    .filter((item) => item && typeof item === "object")
    .slice(0, 14)
    .map((group, index) => ({
      id: pickString(group, ["id"], `connection_group_${index + 1}`, 80),
      label: pickString(group, ["label", "title", "name"], "", 100),
      from: pickString(group, ["from", "source"], "", 80),
      to: pickString(group, ["to", "target"], "", 80),
      function: pickString(group, ["function", "purpose"], "unknown", 80),
      knownSignals: safeStringArray(pickField(group, "known_signals", "knownSignals", "signals"), 12),
      status: pickString(group, ["status", "confidence"], "draft", 40),
      evidenceRefs: safeStringArray(pickField(group, "evidence_refs", "evidenceRefs", "sources"), 5),
      reviewNeeded: safeStringArray(pickField(group, "review_needed", "reviewNeeded"), 4),
    }))
    .filter((group) =>
      group.label &&
      group.from &&
      group.to &&
      endpointIds.has(group.from) &&
      endpointIds.has(group.to)
    );

  const rawOpenItems = pickArray(value, "open_items", "openItems", "unknown_items", "unknownItems");
  const openItems = (rawOpenItems.length
    ? rawOpenItems
    : uniqueStrings([...unknownItems, ...customerQuestions]).map((item) => ({
        item,
        owner: "customer_or_easy_harness",
        why_it_matters: "This affects review confidence or final build preparation.",
        blocks_review: false,
      }))
  )
    .filter((item) => item && typeof item === "object")
    .slice(0, 8)
    .map((item) => ({
      item: pickString(item, ["item", "label", "question"], "", 180),
      owner: pickString(item, ["owner"], "easy_harness_review", 60),
      whyItMatters: pickString(item, ["why_it_matters", "whyItMatters"], "This affects review confidence or final build preparation.", 220),
      blocksReview: pickBoolean(item, "blocks_review", "blocksReview"),
    }))
    .filter((item) => item.item);

  const rawEvidenceRefs = pickArray(value, "evidence_refs", "evidenceRefs", "evidence");
  const evidenceRefs = (rawEvidenceRefs.length
    ? rawEvidenceRefs
    : evidenceCoverage.map((item) => ({
        source: item.source,
        supports: item.understood,
        boundary: item.boundary,
      }))
  )
    .filter((item) => item && typeof item === "object")
    .slice(0, 10)
    .map((item) => ({
      source: pickString(item, ["source", "file"], "Customer-provided material", 120),
      supports: pickString(item, ["supports", "understood"], "Draft evidence", 220),
      boundary: pickString(item, ["boundary"], "Use as draft evidence until Easy Harness confirms the details.", 220),
    }));

  return {
    schemaVersion: "easy_harness_requirement_map_v0_1",
    connectionGoal:
      pickString(value, ["connection_goal", "connectionGoal"], "", 260) ||
      context.goal ||
      "",
    endpoints,
    harnessSections,
    connectionGroups,
    knownFacts: safeStringArray(pickField(value, "known_facts", "knownFacts"), 10).length
      ? safeStringArray(pickField(value, "known_facts", "knownFacts"), 10)
      : safeStringArray(knownFacts, 10),
    openItems,
    easyHarnessReviewItems: safeStringArray(
      pickField(value, "easy_harness_review_items", "easyHarnessReviewItems"),
      8,
    ).length
      ? safeStringArray(pickField(value, "easy_harness_review_items", "easyHarnessReviewItems"), 8)
      : safeStringArray(easyHarnessReview, 8),
    evidenceRefs,
  };
}

function hasMeaningfulConnectionGoal(value) {
  const goal = safeString(value, "", 260).toLowerCase();
  if (goal.length < 8) return false;
  return ![
    "customer wiring harness request",
    "harness connection request",
    "easy harness visual draft",
    "connection goal missing",
    "unknown",
    "not yet clear",
  ].some((placeholder) => goal === placeholder || goal.startsWith(`${placeholder}:`));
}

function hasSupportedTopology(requirementMap) {
  const endpointIds = new Set(
    (requirementMap.endpoints || [])
      .filter(isSupportedEndpoint)
      .map((endpoint) => endpoint.id),
  );
  return endpointIds.size >= 2 && (requirementMap.connectionGroups || []).some(
    (group) =>
      endpointIds.has(group.from) &&
      endpointIds.has(group.to) &&
      group.from !== group.to,
  );
}

function hasEvidenceSupportedGoal(requirementMap) {
  return hasMeaningfulConnectionGoal(requirementMap.connectionGoal) &&
    hasSupportedTopology(requirementMap);
}

function reconcileQuestionsForClosure(questions, requirementMap, questionPlan) {
  const normalized = uniqueStrings(questions).slice(0, 3);
  if (hasEvidenceSupportedGoal(requirementMap)) {
    const blocking = new Set(
      questionPlan
        .filter((item) => item.blocksReview)
        .map((item) => item.question.toLowerCase()),
    );
    return normalized.filter((question) => blocking.has(question.toLowerCase()));
  }
  const connectionGoalQuestion = "What should this harness or cable connect, copy, or replace?";
  return [connectionGoalQuestion];
}

function reconcileQuestionPlan(questionPlan, customerQuestions) {
  const existingByQuestion = new Map(
    questionPlan.map((item) => [item.question.toLowerCase(), item]),
  );
  return customerQuestions.map((question) =>
    existingByQuestion.get(question.toLowerCase()) || {
      question,
      whyNeeded: "This answer is needed to establish an evidence-supported connection goal.",
      ifUnknown: "Easy Harness can keep uncertain details open, but cannot draw an unsupported connection.",
      blocksReview: true,
    }
  );
}

function normalizeDraftReadinessState(requirementMap, customerQuestions) {
  if (!hasEvidenceSupportedGoal(requirementMap)) return "connection_goal_missing";
  return customerQuestions.length
    ? "needs_customer_reply"
    : "ready_for_easy_harness_review";
}

function readinessReasonForState(state, rawReadiness, customerQuestions) {
  const rawState = safeString(rawReadiness.state, "", 60);
  const rawReason = safeString(rawReadiness.reason, "", 260);
  if (rawState === state && rawReason) return rawReason;
  if (state === "connection_goal_missing") {
    return "Easy Harness received the supplied material, but the current input does not yet say what the harness should connect, copy, or replace.";
  }
  if (state === "needs_customer_reply") {
    return customerQuestions.length
      ? "A short customer reply would materially improve the draft before Easy Harness review."
      : "One basic request detail is still needed before the visual draft should be treated as review-ready.";
  }
  return rawReason || "The connection basis is clear enough for Easy Harness review.";
}

function customerNextStepForState(state, rawReadiness, customerQuestions) {
  const rawState = safeString(rawReadiness.state, "", 60);
  const rawNextStep = safeString(rawReadiness.customer_next_step || rawReadiness.customerNextStep, "", 180);
  if (rawState === state && rawNextStep) return rawNextStep;
  if (state === "connection_goal_missing") {
    return "Tell Easy Harness what this harness should connect, copy, or replace.";
  }
  if (state === "needs_customer_reply") {
    return customerQuestions.length
      ? "Reply to the listed questions, or mark unknown."
      : "Reply to the listed clarification, or mark it unknown.";
  }
  return rawNextStep || "No immediate customer reply is required before review.";
}

function normalizeVisualDraftSpec(raw, fallbackInput, fallbackFiles) {
  const value =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const poster = pickObject(value, "poster");
  const rawPosterBoards = pickArray(poster, "boards", "endpoints");
  const boards = rawPosterBoards.length
    ? rawPosterBoards
        .filter((item) => item && typeof item === "object")
        .slice(0, 8)
        .map((board, index) => ({
          id: pickString(board, ["id"], `board_${index + 1}`, 80),
          title: pickString(board, ["title", "label", "name"], `Device ${index + 1}`, 80),
          subtitle: pickString(board, ["subtitle", "known_from", "knownFrom"], "", 120),
          role: pickString(board, ["role"], "endpoint", 40),
          tone: pickString(board, ["tone"], index === 0 ? "dark" : "teal", 20),
          ports: safeStringArray(pickField(board, "ports", "signals"), 10),
        }))
    : [];
  const rawPosterWireGroups = pickArray(poster, "wire_groups", "wireGroups", "connection_groups", "connectionGroups");
  const wireGroups = rawPosterWireGroups.length
    ? rawPosterWireGroups
        .filter((item) => item && typeof item === "object")
        .slice(0, 14)
        .map((group, index) => ({
          id: pickString(group, ["id"], `wire_group_${index + 1}`, 80),
          label: pickString(group, ["label", "title", "name"], `Wire group ${index + 1}`, 80),
          from: pickString(group, ["from", "source"], boards[0]?.id || "source", 80),
          to: pickString(group, ["to", "target"], boards[Math.min(index + 1, boards.length - 1)]?.id || "target", 80),
          route_zone: pickString(group, ["route_zone", "routeZone"], "", 80),
          purpose: pickString(group, ["purpose", "function"], "", 160),
          signals: safeStringArray(pickField(group, "signals", "known_signals", "knownSignals"), 12),
          optional: pickBoolean(group, "optional"),
          confidence: pickString(group, ["confidence", "status"], "draft", 40),
        }))
    : [];
  const rawCallouts = pickArray(poster, "callouts");
  const callouts = rawCallouts.length
    ? rawCallouts
        .filter((item) => item && typeof item === "object")
        .slice(0, 6)
        .map((callout, index) => ({
          title: pickString(callout, ["title", "label"], `Callout ${index + 1}`, 80),
          body: pickString(callout, ["body", "text"], "", 260),
          tone: pickString(callout, ["tone"], index === 0 ? "warning" : "info", 20),
        }))
    : [];

  let customerQuestions = normalizeCustomerQuestions(
    pickField(value, "customer_questions", "customerQuestions"),
  );
  const unknownItems = uniqueStrings(
    safeStringArray(pickField(poster, "unknown_items", "unknownItems"), 8)
      .filter(Boolean),
  );
  const understanding = pickObject(value, "understanding");
  const evidenceCoverage = normalizeEvidenceItems(
    pickField(understanding, "evidence_coverage", "evidenceCoverage"),
    fallbackFiles,
  );
  const understoodFromCustomer = safeStringArray(
    pickField(understanding, "understood_from_customer", "understoodFromCustomer"),
    8,
  );
  const understoodFromFiles = safeStringArray(
    pickField(understanding, "understood_from_files", "understoodFromFiles"),
    8,
  );
  const understoodItems = uniqueStrings([
    ...understoodFromCustomer,
    ...understoodFromFiles,
    ...safeStringArray(pickField(value, "summary_points", "summaryPoints"), 6),
  ]).slice(0, 10);
  let questionPlan = normalizeQuestionPlan(
    pickField(understanding, "question_plan", "questionPlan"),
    customerQuestions,
  );
  const factTrace = normalizeFactTrace(
    pickField(understanding, "fact_trace", "factTrace"),
    understoodItems,
  );
  const rawReadiness = pickObject(understanding, "draft_readiness", "draftReadiness");
  const goal =
    pickString(understanding, ["customer_goal", "customerGoal"], "", 260) ||
    pickString(value, ["title"], "Customer wiring harness request", 180);
  const easyHarnessReview = safeStringArray(pickField(value, "easy_harness_review", "easyHarnessReview"), 8);
  let requirementMap = normalizeRequirementMap(pickField(value, "requirement_map", "requirementMap"), {
    boards,
    wireGroups,
    evidenceCoverage,
    understoodItems,
    unknownItems,
    customerQuestions,
    easyHarnessReview,
    routeZones: pickField(poster, "route_zones", "routeZones"),
    goal,
  });
  customerQuestions = reconcileQuestionsForClosure(
    customerQuestions,
    requirementMap,
    questionPlan,
  );
  questionPlan = reconcileQuestionPlan(questionPlan, customerQuestions);
  const readinessState = normalizeDraftReadinessState(
    requirementMap,
    customerQuestions,
  );

  return {
    schema_version: "easy_harness_visual_draft_spec_v0_1",
    visualType: "ai_poster",
    title:
      pickString(value, ["title"], "", 120) ||
      "Easy Harness visual wiring draft",
    promise:
      pickString(value, ["customer_takeaway", "customerTakeaway"], "", 500) ||
      "Easy Harness organized the submitted material into a visual draft for review.",
    known: safeStringArray(pickField(value, "summary_points", "summaryPoints"), 8),
    customerQuestions,
    easyHarnessReview,
    files: safeStringArray(fallbackFiles, 12),
    requirementMap,
    understanding: {
      goal,
      understood: understoodItems,
      factTrace,
      evidenceCoverage,
      notYetKnown: unknownItems.length ? unknownItems : customerQuestions,
      replyNeeded: customerQuestions,
      questionPlan,
      draftReadiness: {
        state: readinessState,
        reason: readinessReasonForState(readinessState, rawReadiness, customerQuestions),
        customerNextStep: customerNextStepForState(readinessState, rawReadiness, customerQuestions),
      },
      readinessSignal:
        pickString(understanding, ["readiness_signal", "readinessSignal"], "", 260) ||
        (customerQuestions.length
          ? "A short customer reply is still useful before Easy Harness review."
          : "Enough request structure is available for Easy Harness review."),
    },
    confidence: {
      connection: pickString(pickObject(value, "confidence"), ["connection"], "draft", 60),
      fileEvidence: pickString(pickObject(value, "confidence"), ["file_evidence", "fileEvidence"], "customer supplied material", 80),
      production: pickString(pickObject(value, "confidence"), ["production_boundary", "productionBoundary"], "visual draft only", 80),
    },
    poster: {
      headline:
        pickString(poster, ["headline"], "", 120) ||
        pickString(value, ["title"], "Easy Harness visual draft", 120),
      subheadline:
        pickString(poster, ["subheadline"], "", 180) ||
        "AI-organized wiring basis from customer-provided material.",
      warning:
        pickString(poster, ["warning"], "", 220) ||
        "Draft only. Easy Harness confirms final pin map, connector selection, and production details.",
      boards,
      wire_groups: wireGroups,
      route_zones: safeStringArray(pickField(poster, "route_zones", "routeZones"), 6),
      callouts,
      evidence_items:
        safeStringArray(pickField(poster, "evidence_items", "evidenceItems"), 8).length
          ? safeStringArray(pickField(poster, "evidence_items", "evidenceItems"), 8)
          : safeStringArray(fallbackFiles, 8),
      unknown_items:
        unknownItems.length
          ? unknownItems
          : customerQuestions,
    },
    raw_input_excerpt: safeString(fallbackInput, "", 1000),
  };
}

function visualDraftPrompt({ input, files }) {
  const fileList = safeStringArray(files, 20);
  const schema = {
    schema_version: "easy_harness_visual_draft_spec_v0_1",
    title: "string",
    customer_takeaway: "string",
    visual_style: "wiring_poster",
    requirement_map: {
      schema_version: "easy_harness_requirement_map_v0_1",
      connection_goal: "plain connection goal",
      endpoints: [
        {
          id: "short_id",
          label: "device, board, connector end, bare-wire end, sample, or other evidence-supported endpoint",
          role: "source | target | branch_end | auxiliary | unknown",
          known_from: "customer text, parsed file observation, or model-visible observation",
          status: "identified | partial | unknown",
          evidence_refs: ["source labels"],
        },
      ],
      harness_sections: [
        {
          id: "short_id",
          label: "main trunk, branch, route zone, or cable carrier",
          type: "trunk | branch | route_zone | sample_copy | unknown",
          length_basis: "known length, approximate length, sample reference, or unknown",
          route_basis: "routing basis if known",
          status: "known | approximate | draft | unknown",
        },
      ],
      connection_groups: [
        {
          id: "short_id",
          label: "wire/function group",
          from: "endpoint id",
          to: "endpoint id",
          function: "power | signal | data | sensor | motor | safety | mixed | unknown",
          known_signals: ["signals, pin names, functions, or high-level labels"],
          status: "provided | parsed | inferred | draft | unknown",
          evidence_refs: ["source labels"],
          review_needed: ["Easy Harness review items for this group"],
        },
      ],
      known_facts: ["standardized facts usable by the visual draft"],
      open_items: [
        {
          item: "missing or uncertain item",
          owner: "customer | easy_harness_review | customer_or_easy_harness",
          why_it_matters: "why it matters",
          blocks_review: false,
        },
      ],
      easy_harness_review_items: ["internal review items"],
      evidence_refs: [
        {
          source: "customer text, file name, or attachment observation",
          supports: "what it supports in the map",
          boundary: "what should not be claimed yet",
        },
      ],
    },
    understanding: {
      customer_goal: "one sentence in plain customer language",
      understood_from_customer: ["facts explicitly stated or strongly implied by customer text"],
      understood_from_files: ["facts or file-level evidence available from filenames/observations only"],
      evidence_coverage: [
        {
          source: "file name or customer text",
          understood: "what this source contributes to the draft",
          boundary: "what should not be claimed from this source yet",
          confidence: "received | parsed | visual | inferred | unknown",
        },
      ],
      fact_trace: [
        {
          fact: "specific understood fact",
          source: "customer text, source file, or attachment observation",
          status: "provided | parsed | inferred | needs confirmation",
        },
      ],
      question_plan: [
        {
          question: "customer-facing question",
          why_needed: "why this is truly necessary for the draft or review",
          if_unknown: "what happens if the customer does not know",
          blocks_review: false,
        },
      ],
      draft_readiness: {
        state: "ready_for_easy_harness_review | needs_customer_reply | connection_goal_missing",
        reason: "plain-language reason",
        customer_next_step: "what the customer should do now",
      },
      readiness_signal: "why the request can continue, or what still blocks it",
    },
    summary_points: ["string"],
    customer_questions: ["max 3 concise questions"],
    easy_harness_review: ["string"],
    confidence: {
      connection: "clear | partial | unknown",
      file_evidence: "string",
      production_boundary: "string",
    },
    poster: {
      headline: "string",
      subheadline: "string",
      warning: "string",
      boards: [
        {
          id: "short_id",
          title: "customer-facing device/board/end name",
          subtitle: "what this side represents",
          role: "source | target | auxiliary | unknown",
          tone: "dark | teal | amber | blue | warning",
          ports: ["short labels"],
        },
      ],
      wire_groups: [
        {
          id: "short_id",
          label: "wire group label",
          from: "board id",
          to: "board id",
          route_zone: "routing/branch/cable-chain/loom section",
          purpose: "power | signal | data | mixed | sensor | motor | unknown",
          signals: ["short signal/pin/function labels"],
          optional: false,
          confidence: "confirmed | parsed | inferred | unknown",
        },
      ],
      route_zones: ["short route labels"],
      callouts: [
        {
          title: "short title",
          body: "short body",
          tone: "warning | question | review | info",
        },
      ],
      evidence_items: ["what evidence was used"],
      unknown_items: ["what remains unclear"],
    },
  };

  return [
    "You are Easy Harness Visual Draft Agent.",
    "Your task is to think through a customer's messy wiring-harness request and produce a structured visual_draft_spec for a customer-facing wiring poster.",
    "This is not a production drawing and not a final BOM. It is a visual request draft that helps the customer feel their need has been organized clearly enough to continue toward review/quote.",
    "First principle: understand everything the customer provided, show that understanding back to the customer, then ask only for the minimum missing information needed to continue.",
    "Before designing the poster, create requirement_map. This is the standardized harness requirement map between messy input and visual output.",
    "Use the snake_case field names from the schema exactly. Do not switch field names to camelCase, even though the post-processor can tolerate it.",
    "The poster must be derived from requirement_map; do not make unrelated visual groups that are absent from the standardized map.",
    "Separate three things clearly: what the customer explicitly provided, what files/observations contributed, and what Easy Harness still needs to review internally.",
    "Do not invent exact pin-to-pin mappings, connector part numbers, wire gauges, or manufacturing facts unless they are explicit in the customer's text or file observations.",
    "If the available file information is only a filename or file type, say it was received and what it may represent; do not claim you read its internal content.",
    "For every uploaded file or attachment observation listed, include it in understanding.evidence_coverage, even if the boundary is that it is only received and not fully interpreted.",
    "Create understanding.fact_trace so each important understood fact has a source and a status. This is how the customer can feel the draft really listened.",
    "Create understanding.question_plan for every customer question. Each question must explain why it matters, what happens if unknown, and whether it truly blocks review.",
    "Ready for Easy Harness review means the evidence-supported connection goal and topology are clear enough to organize honestly. It does not mean quote-ready or production-ready.",
    "A missing detail blocks Draft review only when its absence prevents an honest representation of what connects, copies, replaces, or adapts. Engineering choices, quote refinements, and manufacturing confirmations normally belong in easy_harness_review.",
    "customer_questions must contain only true Draft blockers. Do not put optional, helpful, or Easy-Harness-owned questions there. Prefer zero or one blocker question; use two or three only when separate answers are genuinely required to establish the request scope.",
    "If a missing item can be resolved by Easy Harness from photos, samples, or internal review, put it in easy_harness_review instead of blocking the customer.",
    "You may organize high-level boards/devices, wire groups, route zones, optional items, and review callouts only when the supplied evidence supports that organization.",
    "Prefer a clear poster-like organization: main device/board on one side, target boards/devices on the other, grouped colored wire bundles between them, callout boxes for decisions/risk, and evidence/unknown lists.",
    "Ask at most three customer questions, and only ask questions that change the customer's request intent or build scope.",
    "Do not ask the customer for exact connector part numbers, crimp specs, shield termination details, datasheets, or engineering validation facts unless the customer explicitly says they have them and the draft cannot proceed without them.",
    "If a power/load rating matters, ask it in customer language such as device voltage/current or device model if available, and allow unknown. Put detailed wire gauge, fuse, thermal, shielding, and connector validation under easy_harness_review.",
    "If photos, samples, or sketches can let Easy Harness review the unknown internally, do not make that a customer blocker.",
    "A connection goal must come from supplied evidence. A file type, filename, connector name, pin table, or generic request label is evidence received, but is not by itself a connection goal.",
    "Do not turn an application, use case, environment, or industry context into a device endpoint unless the customer text or parsed observations explicitly state that the harness connects to that object.",
    "Do not create endpoints, wire groups, routes, or connections merely to make the poster look complete. If topology is not supported, leave those arrays empty, set draft_readiness.state to connection_goal_missing, and ask exactly one question: What should this harness or cable connect, copy, or replace?",
    "There is no universal Draft checklist. Quantity, length, environment, voltage, current, and other details are not automatically blocking; decide whether they block this request from the evidence and explain that decision in question_plan.",
    "The latest explicit customer instruction supersedes older or conflicting evidence. Keep conflicts visible for Easy Harness review instead of silently choosing.",
    "Use every supplied file in evidence_coverage. Only parsed observations or model-visible contents may support facts; otherwise state that the file was received without claiming its contents.",
    "Return JSON only, exactly matching this schema shape. No Markdown, no prose outside JSON.",
    JSON.stringify(schema, null, 2),
    "",
    "Customer input:",
    safeString(input, "", 8000),
    "",
    "Files or attachment observations available:",
    fileList.length ? fileList.map((file) => `- ${file}`).join("\n") : "- No files listed",
  ].join("\n");
}

async function qwenJsonCompletion({ apiKey, baseUrl, model, system, prompt, maxTokens = 6000 }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Qwen request failed (${response.status}): ${raw.slice(0, 600)}`);
  }
  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Qwen returned no message content.");
  return {
    parsed: JSON.parse(extractJsonObject(content)),
    usage: data.usage || null,
  };
}

function visualDraftAuditPrompt(payload, candidate) {
  const files = safeStringArray(payload.files, 24);
  return [
    "Audit and revise the candidate Easy Harness visual draft against the supplied evidence.",
    "Return a corrected JSON object with exactly the same overall schema shape as the candidate. Do not return commentary.",
    "This pass protects evidence honesty and Draft closure. Do not make the draft more complete by inventing missing details.",
    "Keep an endpoint only when customer text or a parsed/model-visible attachment observation explicitly supports that distinct object as part of the connection, copy, replacement, or adaptation goal.",
    "A connector name, filename, file type, pin table, application, use case, environment, industry, voltage context, or generic request label is not by itself a second endpoint.",
    "Keep a connection_group only when both endpoints and the relationship between them are explicitly supported.",
    "Keep route and length sections only when the supplied evidence supports them. Preserve useful supported context without turning it into topology.",
    "Filename-only and received-only materials may be acknowledged in evidence_coverage, but cannot support claims about their contents.",
    "customer_questions must contain only true Draft blockers: answers required to represent honestly what connects, copies, replaces, or adapts.",
    "Move quote refinements, engineering choices, connector identification, electrical validation, and manufacturing decisions to easy_harness_review.",
    "If no evidence-supported topology remains, keep any explicitly supplied standalone objects if useful, leave connection_groups empty, set draft_readiness.state to connection_goal_missing, and ask exactly one question: What should this harness or cable connect, copy, or replace?",
    "If an evidence-supported topology remains and there are no true Draft blockers, set draft_readiness.state to ready_for_easy_harness_review and leave customer_questions empty.",
    "Preserve every supplied file in evidence_coverage and preserve the latest explicit customer instruction over older evidence.",
    "",
    "Customer input:",
    safeString(payload.input, "", 8000),
    "",
    "Files or attachment observations:",
    files.length ? files.map((file) => `- ${file}`).join("\n") : "- No files listed",
    "",
    "Candidate visual draft JSON:",
    JSON.stringify(candidate),
  ].join("\n");
}

async function callQwenVisualDraft(payload) {
  const env = readLocalEnv(secretPath);
  const apiKey = env.QWEN_API_KEY || "";
  if (!apiKey) throw new Error("QWEN_API_KEY is missing or empty.");
  const baseUrl = (env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const model = env.QWEN_MODEL || "qwen3.6-plus";
  const generated = await qwenJsonCompletion({
    apiKey,
    baseUrl,
    model,
    system: "You are Easy Harness Visual Draft Agent. Think carefully, then output only valid JSON.",
    prompt: visualDraftPrompt(payload),
  });
  const auditEnabled = env.AI_DRAFT_LAB_ENABLE_EVIDENCE_AUDIT !== "false";
  const audited = auditEnabled
    ? await qwenJsonCompletion({
        apiKey,
        baseUrl,
        model,
        system:
          "You are Easy Harness Evidence Audit Agent. Remove unsupported claims and nonblocking customer questions, then output only corrected valid JSON.",
        prompt: visualDraftAuditPrompt(payload, generated.parsed),
      })
    : generated;
  return {
    provider: "qwen",
    model,
    passes: auditEnabled ? 2 : 1,
    usage: auditEnabled
      ? { generation: generated.usage, evidence_audit: audited.usage }
      : generated.usage,
    visual_draft_spec: normalizeVisualDraftSpec(
      audited.parsed,
      payload.input || "",
      payload.files || [],
    ),
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return jsonResponse(response, 204, {});

  try {
    if (request.method === "GET" && request.url === "/health") {
      const env = readLocalEnv(secretPath);
      return jsonResponse(response, 200, {
        ok: true,
        provider: env.AI_DRAFT_PROVIDER || "qwen",
        model: env.QWEN_MODEL || "qwen3.6-plus",
        hasQwenKey: Boolean(env.QWEN_API_KEY),
      });
    }

    if (request.method === "POST" && request.url === "/visual-draft") {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const input = safeString(payload.input, "", 12000);
      const files = safeStringArray(payload.files, 24);
      if (!input && !files.length) {
        return jsonResponse(response, 400, {
          ok: false,
          code: "missing_input",
          message: "input or files are required.",
        });
      }
      const result = await callQwenVisualDraft({ input, files });
      return jsonResponse(response, 200, { ok: true, ...result });
    }

    return jsonResponse(response, 404, {
      ok: false,
      code: "not_found",
      message: "Use GET /health or POST /visual-draft.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(response, 500, {
      ok: false,
      code: "agent_lab_api_error",
      message,
    });
  }
});

server.requestTimeout = 20 * 60 * 1000;

server.listen(port, "127.0.0.1", () => {
  console.log(
    `Easy Harness Agent Draft Lab API listening on http://127.0.0.1:${port}`,
  );
  console.log(`Using local env file: ${secretPath}`);
});
