import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import * as XLSX from "xlsx";

const DEFAULT_SECRET_PATH =
  "D:\\Harness\\easy-harness-project-materials\\secrets\\qwen.local.env";

function loadSimpleEnvFile(path) {
  if (!path) return;
  try {
    if (!fs.existsSync(path)) return;
    const text = fs.readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index <= 0) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Optional local convenience only. Missing files are expected in hosted runs.
  }
}

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function envNumber(name, fallback, min, max) {
  const value = Number(process.env[name] || "");
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function requireEnv(name, aliases = []) {
  const value = env(name) || aliases.map((item) => env(item)).find(Boolean) || "";
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function compactText(value, limit = 4000) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}

function textFromBlocks(blocks, fallback = "") {
  if (!Array.isArray(blocks)) return fallback || "";
  const text = blocks
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      if (typeof block.text === "string") return block.text;
      if (typeof block.content === "string") return block.content;
      return "";
    })
    .filter(Boolean)
    .join("\n");
  return text || fallback || "";
}

function isImageAttachment(attachment) {
  const type = `${attachment.mime_type || ""}`.toLowerCase();
  const name = `${attachment.name || ""}`.toLowerCase();
  return (
    type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp)$/i.test(name)
  );
}

function fileKind(name = "", mime = "") {
  const lower = name.toLowerCase();
  if (mime.startsWith("text/") || /\.(txt|md|csv|json|tsv)$/i.test(lower))
    return "text";
  if (/\.pdf$/i.test(lower) || mime === "application/pdf") return "pdf_probe";
  if (/\.(xlsx|xlsm|xls)$/i.test(lower)) return "spreadsheet";
  if (/\.(step|stp|dxf|stl|obj|iges|igs|dwg|3mf|fcstd)$/i.test(lower))
    return "cad_or_3d_reference";
  return "metadata_only";
}

function parseCsvPreview(text) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .filter((row) => row.some(Boolean))
    .slice(0, 12);
  if (!rows.length) return [];
  const header = rows[0];
  return rows.slice(1).map((row) =>
    Object.fromEntries(header.map((key, index) => [key || `col_${index + 1}`, row[index] || ""])),
  );
}

async function blobToBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

async function readAttachmentObservation(supabase, attachment) {
  const storage = attachment.storage;
  const base = {
    filename: attachment.name,
    mime_type: attachment.mime_type || storage?.content_type || "application/octet-stream",
  };
  if (!storage?.bucket || !storage.object_path) {
    return {
      ...base,
      parser: "storage_unavailable",
      status: "storage_unavailable",
      evidence_kind: "metadata_with_pending_parser",
      summary: "Attachment metadata exists, but no storage object path is available.",
      confidence: "metadata_only",
    };
  }
  if (!["uploaded", "available"].includes(storage.status || "")) {
    return {
      ...base,
      parser: "storage_unavailable",
      status: "storage_unavailable",
      evidence_kind: "metadata_with_pending_parser",
      summary: `Attachment storage status is ${storage.status || "unknown"}; parsing did not run.`,
      confidence: "metadata_only",
    };
  }

  const kind = fileKind(attachment.name, base.mime_type);
  if (kind === "metadata_only") {
    return {
      ...base,
      parser: kind,
      status: "parser_needed",
      evidence_kind: "metadata_with_pending_parser",
      summary:
        "File received; this worker build does not parse this file type directly yet.",
      confidence: "metadata_only",
    };
  }
  if (kind === "cad_or_3d_reference") {
    return {
      ...base,
      parser: "cad_metadata_probe",
      status: "metadata_extracted",
      evidence_kind: "metadata_observation",
      summary: "CAD/3D reference file received. Treat as dimensional/context evidence unless normalized by Easy Harness.",
      structured_facts: [
        { kind: "cad_file_name", value: attachment.name, source: "filename" },
        { kind: "cad_file_type", value: attachment.name.split(".").pop()?.toUpperCase() || "CAD", source: "filename_extension" },
      ],
      confidence: "metadata_only",
    };
  }

  const { data, error } = await supabase.storage
    .from(storage.bucket)
    .download(storage.object_path);
  if (error || !data) {
    return {
      ...base,
      parser: "storage_download_failed",
      status: "storage_unavailable",
      evidence_kind: "metadata_with_pending_parser",
      summary: `Attachment download failed: ${error?.message || "unknown error"}`,
      confidence: "metadata_only",
    };
  }

  if (kind === "pdf_probe") {
    const bytes = await blobToBytes(data);
    const text = compactText(
      Buffer.from(bytes)
        .toString("latin1")
        .replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " "),
      3000,
    );
    return {
      ...base,
      parser: "pdf_text_probe",
      status: text ? "text_extracted" : "parser_needed",
      evidence_kind: text ? "text_excerpt" : "metadata_with_pending_parser",
      summary: text
        ? `PDF text probe extracted a partial text signal: ${text}`
        : "PDF received but no readable text was extracted by this lightweight probe.",
      text_excerpt: text,
      confidence: text ? "partial_parse" : "metadata_only",
    };
  }

  if (kind === "spreadsheet") {
    const bytes = await blobToBytes(data);
    const workbook = XLSX.read(Buffer.from(bytes), { type: "buffer" });
    const sheets = workbook.SheetNames.slice(0, 4).map((name) => {
      const rows = XLSX.utils
        .sheet_to_json(workbook.Sheets[name], { defval: "", raw: false })
        .slice(0, 20);
      return { sheet_name: name, rows };
    });
    return {
      ...base,
      parser: "xlsx_sheet_probe",
      status: "text_extracted",
      evidence_kind: "structured_table_sample",
      summary: `Spreadsheet probe extracted ${sheets.length} sheet sample(s).`,
      sheets,
      confidence: "parsed",
    };
  }

  const text = compactText(await data.text(), 6000);
  const rows = /\.csv$/i.test(attachment.name) ? parseCsvPreview(text) : [];
  return {
    ...base,
    parser: /\.csv$/i.test(attachment.name) ? "csv_text_probe" : "text_probe",
    status: "text_extracted",
    evidence_kind: rows.length ? "structured_table_sample" : "text_excerpt",
    summary: rows.length
      ? `CSV/text table sample extracted ${rows.length} rows.`
      : `Text excerpt extracted: ${text}`,
    text_excerpt: text,
    table_sample: rows,
    confidence: "parsed",
  };
}

async function createVisionInputs(supabase, attachments) {
  const maxImages = envNumber("AI_DRAFT_MAX_VISION_IMAGES", 4, 0, 12);
  const ttlSeconds = envNumber("AI_DRAFT_SIGNED_URL_TTL_SECONDS", 900, 60, 3600);
  const images = [];
  const observations = [];
  for (const attachment of attachments) {
    if (!isImageAttachment(attachment)) continue;
    if (images.length >= maxImages) continue;
    const storage = attachment.storage;
    if (!storage?.bucket || !storage.object_path) continue;
    const { data, error } = await supabase.storage
      .from(storage.bucket)
      .createSignedUrl(storage.object_path, ttlSeconds);
    if (error || !data?.signedUrl) continue;
    images.push({
      filename: attachment.name,
      mime_type: attachment.mime_type || storage.content_type || "image/png",
      signed_url: data.signedUrl,
    });
    observations.push({
      filename: attachment.name,
      mime_type: attachment.mime_type || storage.content_type || "image/png",
      parser: "qwen_vision_image",
      status: "vision_sent_to_model",
      evidence_kind: "vision_model_input",
      summary: "Image was sent to Qwen as a vision input for request understanding.",
      confidence: "model_observation",
    });
  }
  return { images, observations };
}

function summarizeForModel({ requestRow, messages, attachments, observations }) {
  return [
    `REQUEST ${requestRow.request_number}`,
    `Title: ${requestRow.title}`,
    `Current status: ${requestRow.status}/${requestRow.check_status}`,
    "",
    "Conversation:",
    ...messages.map(
      (message) =>
        `- ${message.author_role}: ${compactText(textFromBlocks(message.blocks, message.body), 1600)}`,
    ),
    "",
    "Files received:",
    ...attachments.map(
      (file) =>
        `- ${file.name} (${file.mime_type || file.storage?.content_type || "unknown"}, ${file.size_bytes || file.storage?.size_bytes || 0} bytes)`,
    ),
    "",
    "Attachment observations:",
    JSON.stringify(observations, null, 2),
  ].join("\n");
}

function draftSystemPrompt() {
  return [
    "You are Easy Harness Intake Agent.",
    "Your job is to convert the customer's words and available attachment evidence into Easy Harness Draft v0.1.",
    "The Draft is for Easy Harness review, quote-path evaluation, and later manufacturing assessment. It is not final BOM, cut list, supplier RFQ, production drawing, or manufacturing release.",
    "Use all supplied conversation text and attachment observations. If an image is supplied as image_url, inspect it carefully but do not convert uncertain visual guesses into production facts.",
    "Do not invent file contents. Only use attachment facts present in text, observations, or model-visible images. Unsupported files can be listed as received evidence and Easy Harness review items.",
    "Ask only true Draft blockers. Prefer zero or one question. Do not ask for details already stated by the customer. Do not ask for factory details the customer likely does not know.",
    "If the connection goal and topology are clear enough, mark ready_for_easy_harness_review and put engineering/manufacturing confirmation under Easy Harness review.",
    "If the connection goal is truly missing, ask one concise connection-goal question.",
    "Return only valid JSON. No Markdown. Use this shape:",
    JSON.stringify(
      {
        schema_version: "easy_harness_draft_v0_1",
        draft_meta: {
          draft_status: "ready_for_easy_harness_review | needs_key_clarification | needs_harness_context | not_harness_related",
          draft_maturity_level: 1,
        },
        user_intent: {
          connection_goal: "",
          intent_type: "",
          from_side: "",
          to_side: [],
        },
        provided_evidence: [
          {
            filename: "",
            evidence_type: "",
            what_it_may_show: "",
            confidence: "parsed | model_observation | metadata_only | customer_supplied",
          },
        ],
        known_requirements: {
          quantity: "",
          overall_length: "",
          endpoints: [],
          wire_or_cable: [],
          pinout_or_circuits: [],
          environment: "",
          electrical_context: "",
          customer_constraints: [],
        },
        captured_professional_details: {
          connectors: [],
          terminals: [],
          wire_gauges: [],
          shielding: [],
          routing_or_lengths: [],
          standards_or_tests: [],
        },
        ai_interpretation: {
          short_understanding: "",
          do_not_assume: [],
        },
        unknowns: {
          ask_user_now: [
            {
              field: "",
              reason: "",
              question: "",
            },
          ],
          ask_user_if_likely_known: [],
          easy_harness_review: [],
          later_supplier_or_engineering_confirmation: [],
          not_applicable: [],
        },
        risk_flags: [],
        user_facing_summary: {
          request_line: "",
          compact_details: [],
          what_we_have: [],
          needed_next: [],
          next_step: "",
        },
        draft_closure: {
          can_close_user_draft: false,
          closure_status: "",
          questions_to_ask: [],
          customer_message_type: "ready_for_review | ask_key_details | needs_harness_context | not_harness_related",
        },
        requirement_map: {
          connection_goal: "",
          endpoints: [],
          harness_sections: [],
          connection_groups: [],
          known_facts: [],
          open_items: [],
          easy_harness_review_items: [],
          evidence_refs: [],
        },
      },
      null,
      2,
    ),
  ].join("\n");
}

function userContentForProvider(prompt, images) {
  if (!images.length) return prompt;
  return [
    { type: "text", text: prompt },
    ...images.map((image) => ({
      type: "image_url",
      image_url: { url: image.signed_url },
    })),
  ];
}

function cleanJsonCandidate(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  return cleaned;
}

function parseJsonObject(text) {
  const cleaned = cleanJsonCandidate(text);
  try {
    return JSON.parse(cleaned);
  } catch (directError) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (sliceError) {
        throw new Error(`Qwen response JSON parse failed: ${sliceError.message}`);
      }
    }
    throw new Error(`Qwen response did not contain valid JSON: ${directError.message}`);
  }
}

async function postQwenChat({ apiKey, baseUrl, model, messages, maxTokens, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Qwen API ${response.status}: ${JSON.stringify(data).slice(0, 1000)}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function repairJsonWithQwen({ apiKey, baseUrl, model, content, parseError, maxTokens, timeoutMs }) {
  const repairPrompt = [
    "Repair the malformed JSON below.",
    "Return valid JSON only. Do not add markdown, comments, explanation, or new fields.",
    "Preserve the original semantics and values as much as possible.",
    `Parser error: ${parseError.message}`,
    "",
    "Malformed JSON:",
    cleanJsonCandidate(content).slice(0, 50000),
  ].join("\n");
  const data = await postQwenChat({
    apiKey,
    baseUrl,
    model,
    maxTokens,
    timeoutMs,
    messages: [
      {
        role: "system",
        content:
          "You are a strict JSON repair tool. You only repair syntax so the JSON can be parsed. You do not reinterpret the request.",
      },
      { role: "user", content: repairPrompt },
    ],
  });
  return data?.choices?.[0]?.message?.content || "";
}

async function qwenJsonCompletion({ prompt, images }) {
  const apiKey = requireEnv("QWEN_API_KEY");
  const baseUrl = env("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const model = env("QWEN_MODEL", "qwen3.6-plus");
  const maxTokens = envNumber("QWEN_MAX_TOKENS", 12000, 1000, 64000);
  const timeoutMs = envNumber("AI_DRAFT_WORKER_QWEN_TIMEOUT_MS", 900000, 60000, 3600000);
  const data = await postQwenChat({
    apiKey,
    baseUrl,
    model,
    maxTokens,
    timeoutMs,
    messages: [
      { role: "system", content: draftSystemPrompt() },
      {
        role: "user",
        content: userContentForProvider(
          [
            "Analyze this Easy Harness request and return Easy Harness Draft v0.1 JSON only.",
            "Use valid JSON syntax: double-quoted keys and strings, no trailing commas, no comments, no markdown.",
            "",
            prompt,
          ].join("\n"),
          images,
        ),
      },
    ],
  });
  const content = data?.choices?.[0]?.message?.content || "";
  let draft;
  let jsonRepaired = false;
  try {
    draft = parseJsonObject(content);
  } catch (parseError) {
    const repaired = await repairJsonWithQwen({
      apiKey,
      baseUrl,
      model,
      content,
      parseError,
      maxTokens,
      timeoutMs,
    });
    draft = parseJsonObject(repaired);
    jsonRepaired = true;
  }
    return {
      draft,
      usage: data?.usage || null,
      model,
      provider: "qwen",
      jsonRepaired,
    };
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function string(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeUnknownItem(item) {
  if (!item) return null;
  if (typeof item === "string") {
    return { field: item, reason: item, question: item };
  }
  if (typeof item === "object") {
    const question = string(item.question || item.field || item.reason);
    if (!question) return null;
    return {
      field: string(item.field, question),
      reason: string(item.reason, question),
      question,
    };
  }
  return null;
}

function normalizeDraft(raw, observations) {
  const draft = raw && typeof raw === "object" ? raw : {};
  const status = string(
    draft?.draft_meta?.draft_status,
    array(draft?.draft_closure?.questions_to_ask).length
      ? "needs_key_clarification"
      : "ready_for_easy_harness_review",
  );
  const askUserNow = array(draft?.unknowns?.ask_user_now)
    .map(normalizeUnknownItem)
    .filter(Boolean)
    .slice(0, 3);
  const questions = array(draft?.draft_closure?.questions_to_ask).filter(Boolean);
  const finalQuestions = questions.length
    ? questions.slice(0, 3).map(String)
    : askUserNow.map((item) => item.question);
  const canClose =
    status === "ready_for_easy_harness_review" ||
    draft?.draft_closure?.can_close_user_draft === true;
  const evidence = array(draft.provided_evidence).length
    ? array(draft.provided_evidence)
    : observations.map((item) => ({
        filename: item.filename,
        evidence_type: item.evidence_kind || item.parser || "attachment",
        what_it_may_show: item.summary || "Uploaded file evidence",
        confidence: item.confidence || "metadata_only",
      }));

  return {
    schema_version: "easy_harness_draft_v0_1",
    ...draft,
    draft_meta: {
      ...(draft.draft_meta || {}),
      draft_status: status,
      draft_maturity_level: Number(draft?.draft_meta?.draft_maturity_level || (canClose ? 3 : 2)),
    },
    user_intent: {
      connection_goal: string(draft?.user_intent?.connection_goal, string(draft?.user_facing_summary?.request_line, "Harness request")),
      intent_type: string(draft?.user_intent?.intent_type, "unknown"),
      from_side: string(draft?.user_intent?.from_side, "unknown"),
      to_side: array(draft?.user_intent?.to_side).map(String),
    },
    provided_evidence: evidence,
    known_requirements: draft.known_requirements || {},
    captured_professional_details: draft.captured_professional_details || {},
    ai_interpretation: {
      short_understanding: string(draft?.ai_interpretation?.short_understanding, string(draft?.user_facing_summary?.request_line, "Harness request")),
      do_not_assume: array(draft?.ai_interpretation?.do_not_assume).map(String),
    },
    unknowns: {
      ask_user_now: canClose ? [] : askUserNow,
      ask_user_if_likely_known: array(draft?.unknowns?.ask_user_if_likely_known),
      easy_harness_review: array(draft?.unknowns?.easy_harness_review),
      later_supplier_or_engineering_confirmation: array(draft?.unknowns?.later_supplier_or_engineering_confirmation),
      not_applicable: array(draft?.unknowns?.not_applicable),
    },
    risk_flags: array(draft.risk_flags),
    user_facing_summary: {
      request_line: string(draft?.user_facing_summary?.request_line, string(draft?.user_intent?.connection_goal, "Harness request")),
      compact_details: array(draft?.user_facing_summary?.compact_details).map(String).slice(0, 8),
      what_we_have: array(draft?.user_facing_summary?.what_we_have).map(String).slice(0, 8),
      needed_next: canClose ? [] : finalQuestions,
      next_step: string(
        draft?.user_facing_summary?.next_step,
        canClose
          ? "Easy Harness will review the remaining selection, file details, and feasibility from here."
          : "Reply with what you know. Unknown items can be reviewed later.",
      ),
    },
    draft_closure: {
      ...(draft.draft_closure || {}),
      can_close_user_draft: canClose,
      closure_status: status,
      questions_to_ask: canClose ? [] : finalQuestions,
      customer_message_type: canClose ? "ready_for_review" : "ask_key_details",
    },
  };
}

function legacyStatusForDraft(draft) {
  const status = draft?.draft_meta?.draft_status || "";
  if (status === "not_harness_related") return "rejected";
  if (status === "ready_for_easy_harness_review") return "accepted";
  return "needs_info";
}

function requestStatusForDraft(draft) {
  const legacy = legacyStatusForDraft(draft);
  if (legacy === "accepted") return "in_review";
  if (legacy === "rejected") return "not_supported";
  return "needs_info";
}

function readinessForDraft(draft) {
  const legacy = legacyStatusForDraft(draft);
  if (legacy === "accepted") return "ready_for_admin_review";
  if (legacy === "rejected") return "not_supported";
  return "needs_user_reply";
}

function buildRequirementMap(draft) {
  return draft.requirement_map || {
    schema_version: "easy_harness_requirement_map_v0_1",
    connection_goal: draft?.user_intent?.connection_goal || draft?.user_facing_summary?.request_line || "Harness request",
    endpoints: [],
    harness_sections: [],
    connection_groups: [],
    known_facts: draft?.user_facing_summary?.what_we_have || [],
    open_items: draft?.draft_closure?.questions_to_ask || [],
    easy_harness_review_items: [
      ...array(draft?.unknowns?.easy_harness_review),
      ...array(draft?.unknowns?.later_supplier_or_engineering_confirmation),
    ],
    evidence_refs: array(draft?.provided_evidence).map((item) => item.filename).filter(Boolean),
  };
}

function buildCheckResult(draft, meta) {
  const questions = array(draft?.draft_closure?.questions_to_ask).slice(0, 3);
  const requirementMap = buildRequirementMap(draft);
  return {
    ...draft,
    adapter: "ai_intake_checking",
    model: meta.model,
    provider: meta.provider,
    reasoning_effort: "external_worker",
    usage: meta.usage,
    checkedAt: new Date().toISOString(),
    status: legacyStatusForDraft(draft),
    readiness: readinessForDraft(draft),
    intake_stage: draft?.draft_meta?.draft_status,
    customer_message_type: draft?.draft_closure?.customer_message_type,
    requirement_map: requirementMap,
    customer_summary: draft?.ai_interpretation?.short_understanding || draft?.user_facing_summary?.request_line,
    confirmed_facts: draft?.user_facing_summary?.what_we_have || [],
    missing: questions,
    questions,
    questions_for_user: questions,
    attachments_reviewed: array(draft?.provided_evidence).map((item) => item.filename).filter(Boolean),
    source: meta.source,
    attachment_observations: meta.attachment_observations,
    agent_runtime: {
      primary_agent_completed: true,
      local_draft_builder_used: false,
      external_worker_completed: true,
      draft_job_id: meta.draft_job_id,
    },
  };
}

function customerMessage(draft) {
  const line = draft?.user_facing_summary?.request_line || "Harness request";
  const details = array(draft?.user_facing_summary?.compact_details).filter(Boolean).join(" · ");
  const questions = array(draft?.draft_closure?.questions_to_ask).slice(0, 3);
  if (legacyStatusForDraft(draft) === "accepted") {
    return [
      "Easy Harness Draft is ready.",
      [line, details].filter(Boolean).join("\n"),
      "Easy Harness will review the remaining selection, file details, and feasibility from here.",
    ].join("\n\n");
  }
  return [
    [line, details].filter(Boolean).join("\n"),
    "To move this forward:",
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    "Approximate answers are fine. If one item is uncertain, say so.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function customerMessageBlocks(draft, body) {
  return [
    { type: "text", text: body },
    {
      type: "draft_summary",
      draftId: "D1",
      title: draft?.user_facing_summary?.request_line || "Harness request",
      status:
        legacyStatusForDraft(draft) === "accepted"
          ? "Ready for Easy Harness review"
          : "Details needed",
      compactDetails: array(draft?.user_facing_summary?.compact_details),
      connectionGoal: draft?.user_intent?.connection_goal || "",
      requirementMap: buildRequirementMap(draft),
      knownDetails: draft?.known_requirements || {},
      files: array(draft?.provided_evidence).map((item) => item.filename).filter(Boolean),
      reviewItems: [
        ...array(draft?.unknowns?.easy_harness_review),
        ...array(draft?.unknowns?.later_supplier_or_engineering_confirmation),
      ].slice(0, 8),
    },
  ];
}

async function claimJob(supabase, workerId) {
  const { data: jobs, error } = await supabase
    .from("draft_jobs")
    .select("*")
    .in("status", ["queued", "retry_needed"])
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  const job = jobs?.[0];
  if (!job) return null;
  const { data: claimed, error: updateError } = await supabase
    .from("draft_jobs")
    .update({
      status: "running",
      locked_by: workerId,
      locked_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      attempt_count: Number(job.attempt_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .in("status", ["queued", "retry_needed"])
    .select("*")
    .single();
  if (updateError) return null;
  return claimed;
}

async function loadJobInput(supabase, job) {
  const { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("id,request_number,customer_id,customer_label,title,status,customer_summary,check_status,check_result,files_count,created_at,updated_at")
    .eq("id", job.request_id)
    .single();
  if (requestError) throw requestError;

  const { data: messages, error: messagesError } = await supabase
    .from("request_messages")
    .select("id,author_role,body,blocks,created_at")
    .eq("request_id", job.request_id)
    .order("created_at", { ascending: true });
  if (messagesError) throw messagesError;

  const { data: attachments, error: attachmentsError } = await supabase
    .from("attachments")
    .select("id,name,mime_type,size_bytes,storage_object_id,purpose,created_at")
    .eq("request_id", job.request_id)
    .order("created_at", { ascending: true });
  if (attachmentsError) throw attachmentsError;

  const storageIds = [...new Set((attachments || []).map((item) => item.storage_object_id).filter(Boolean))];
  const { data: storageRows } = storageIds.length
    ? await supabase
        .from("storage_objects")
        .select("id,bucket,object_path,status,content_type,size_bytes")
        .in("id", storageIds)
    : { data: [] };
  const storageById = new Map((storageRows || []).map((item) => [item.id, item]));
  const attachmentsWithStorage = (attachments || []).map((attachment) => ({
    ...attachment,
    storage: attachment.storage_object_id ? storageById.get(attachment.storage_object_id) : null,
  }));
  return { requestRow, messages: messages || [], attachments: attachmentsWithStorage };
}

async function processJob(supabase, job) {
  await supabase.from("integration_events").insert({
    adapter: "ai_intake_checking",
    action: "draft_worker_started",
    target_type: "request",
    target_id: job.request_id,
    detail: "External Qwen draft worker started.",
    payload: { requestNumber: job.request_number, draftJobId: job.id },
  });

  const { requestRow, messages, attachments } = await loadJobInput(supabase, job);
  const vision = await createVisionInputs(supabase, attachments);
  const nonImageAttachments = attachments.filter((item) => !vision.images.some((image) => image.filename === item.name));
  const observations = [
    ...vision.observations,
    ...(await Promise.all(nonImageAttachments.map((item) => readAttachmentObservation(supabase, item)))),
  ];
  const prompt = summarizeForModel({ requestRow, messages, attachments, observations });
  const generated = await qwenJsonCompletion({ prompt, images: vision.images });
  const draft = normalizeDraft(generated.draft, observations);
  const source = {
    request_id: requestRow.id,
    request_number: requestRow.request_number,
    draft_job_id: job.id,
    runtime: "external_worker",
    draft_model_passes: 1,
    evidence_audit_enabled: false,
    evidence_audit_completed: false,
    message_count: messages.length,
    attachment_count: attachments.length,
    image_count_sent_to_model: vision.images.length,
    image_files_sent_to_model: vision.images.map((image) => image.filename),
    attachment_observation_count: observations.length,
    parsed_attachment_count: observations.filter((item) => ["text_extracted", "metadata_extracted", "vision_sent_to_model"].includes(item.status)).length,
    qwen_file_extract_count: 0,
    cad_metadata_count: observations.filter((item) => item.parser === "cad_metadata_probe").length,
    parser_needed_count: observations.filter((item) => item.status === "parser_needed").length,
    qwen_json_repaired: Boolean(generated.jsonRepaired),
  };
  const checkResult = buildCheckResult(draft, {
    model: generated.model,
    provider: generated.provider,
    usage: generated.usage,
    source,
    attachment_observations: observations,
    draft_job_id: job.id,
  });
  const nextStatus = requestStatusForDraft(draft);
  const nextCheckStatus = legacyStatusForDraft(draft);
  const body = customerMessage(draft);
  const blocks = customerMessageBlocks(draft, body);

  await supabase
    .from("requests")
    .update({
      status: nextStatus,
      check_status: nextCheckStatus,
      check_result: checkResult,
      customer_summary: checkResult.customer_summary || requestRow.customer_summary || requestRow.title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestRow.id);

  await supabase.from("request_messages").insert({
    request_id: requestRow.id,
    author_id: null,
    author_role: "easy_harness",
    body,
    blocks,
    visibility: "thread",
  });

  await supabase
    .from("draft_jobs")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      result_summary: {
        request_status: nextStatus,
        check_status: nextCheckStatus,
        provider: generated.provider,
        model: generated.model,
        qwen_json_repaired: Boolean(generated.jsonRepaired),
        source,
      },
    })
    .eq("id", job.id);

  await supabase.from("integration_events").insert({
    adapter: "ai_intake_checking",
    action: "draft_worker_completed",
    target_type: "request",
    target_id: requestRow.id,
    detail: "External Qwen draft worker completed and saved Draft.",
    payload: {
      requestNumber: requestRow.request_number,
      draftJobId: job.id,
      status: nextStatus,
      checkStatus: nextCheckStatus,
      provider: generated.provider,
      model: generated.model,
      qwenJsonRepaired: Boolean(generated.jsonRepaired),
    },
  });
}

async function failJob(supabase, job, error) {
  const message = error instanceof Error ? error.message : String(error);
  const retry = Number(job.attempt_count || 0) < Number(job.max_attempts || 3);
  await supabase
    .from("draft_jobs")
    .update({
      status: retry ? "retry_needed" : "failed",
      last_error: message.slice(0, 2000),
      finished_at: retry ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  await supabase.from("integration_events").insert({
    adapter: "ai_intake_checking",
    action: retry ? "draft_worker_retry_needed" : "draft_worker_failed",
    target_type: "request",
    target_id: job.request_id,
    detail: message.slice(0, 1000),
    payload: { requestNumber: job.request_number, draftJobId: job.id },
  });
}

async function main() {
  loadSimpleEnvFile(process.env.QWEN_LOCAL_ENV_PATH || DEFAULT_SECRET_PATH);
  const url = requireEnv("SUPABASE_URL", ["VITE_SUPABASE_URL"]);
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("QWEN_API_KEY");

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const workerId = `qwen-draft-worker-${process.pid}`;
  const once = process.argv.includes("--once");
  const pollMs = envNumber("AI_DRAFT_WORKER_POLL_MS", 5000, 1000, 60000);

  do {
    const job = await claimJob(supabase, workerId);
    if (!job) {
      if (once) {
        console.log("No queued draft job.");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      continue;
    }
    console.log(`Processing ${job.request_number} (${job.id}) with Qwen.`);
    try {
      await processJob(supabase, job);
      console.log(`Completed ${job.request_number}.`);
    } catch (error) {
      console.error(`Failed ${job.request_number}:`, error?.message || error);
      await failJob(supabase, job, error);
    }
  } while (!once);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
