import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";
import {
  integrationNotConfigured,
  jsonResponse,
  optionsResponse,
  readJson,
  requiredEnv,
} from "../_shared/response.ts";

type CheckingRequest = {
  mode?: "upload_assistant_preview" | string;
  requestId?: string;
  trigger?: "initial_request" | "customer_followup" | "manual" | string;
  force?: boolean;
  preview?: Record<string, unknown>;
};

declare const EdgeRuntime:
  | { waitUntil?: (promise: Promise<unknown>) => void }
  | undefined;

type RequestRow = {
  id: string;
  request_number: string;
  customer_id: string;
  customer_label: string;
  title: string;
  status: string;
  customer_summary: string;
  check_status: string;
  check_result: Record<string, unknown>;
  files_count: number;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  author_role: string;
  body: string;
  blocks: Array<Record<string, unknown>> | Record<string, unknown> | null;
  created_at: string;
};

type AttachmentRow = {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_object_id: string | null;
  purpose: string;
  created_at: string;
};

type StorageRow = {
  id: string;
  bucket: string;
  object_path: string;
  status: string;
  content_type: string | null;
  size_bytes: number | null;
};

type DraftVisionImage = {
  filename: string;
  mime_type: string;
  signed_url: string;
};

type DraftVisionDiagnostics = {
  attachment_vision_enabled: boolean;
  vision_max_images: number;
  image_attachment_count: number;
  vision_not_image_count: number;
  vision_missing_storage_count: number;
  vision_storage_not_ready_count: number;
  vision_signed_url_failed_count: number;
  vision_skipped_after_limit_count: number;
};

type DraftVisionSelection = {
  images: DraftVisionImage[];
  diagnostics: DraftVisionDiagnostics;
};

type AttachmentObservation = {
  filename: string;
  mime_type: string;
  parser:
    | "qwen_vision_image"
    | "text_excerpt"
    | "csv_excerpt"
    | "pdf_text_probe"
    | "xlsx_table_probe"
    | "qwen_file_extract"
    | "cad_metadata_probe"
    | "parser_needed"
    | "storage_unavailable";
  status:
    | "vision_sent_to_model"
    | "text_extracted"
    | "file_extracted"
    | "metadata_extracted"
    | "parser_needed"
    | "storage_unavailable"
    | "not_supported_yet";
  evidence_kind:
    | "vision_model_input"
    | "model_file_extract"
    | "cad_metadata"
    | "parsed_text"
    | "metadata_with_pending_parser";
  summary: string;
  text_excerpt?: string;
  structured_facts?: Array<Record<string, unknown>>;
  tables?: Array<Record<string, unknown>>;
  provider_file_id?: string;
  confidence: "model_observation" | "parsed" | "metadata_only";
};

type DraftStatus =
  | "not_harness_related"
  | "needs_harness_context"
  | "needs_key_clarification"
  | "ready_for_easy_harness_review"
  | "closed_for_easy_harness_review";

type FieldValue = {
  value: string;
  source: string | null;
  confidence: "confirmed" | "partial" | "unknown" | "user_provided" | string;
};

type UnknownItem = {
  field: string;
  reason: string;
  question?: string;
};

type EasyHarnessDraft = {
  schema_version: "easy_harness_draft_v0_1";
  draft_meta: {
    draft_status: DraftStatus;
    draft_maturity_level: number;
    last_updated_reason: string;
    provider?: string;
    model?: string;
  };
  user_intent: {
    intent_type:
      | "new_custom_harness"
      | "replacement"
      | "copy_old_harness"
      | "adapter"
      | "pigtail"
      | "device_port_connection"
      | "unknown"
      | string;
    connection_goal: string;
    from_side: string;
    to_side: string[];
    desired_outcome: string;
    intent_confidence: "clear" | "partial" | "vague" | "unknown" | string;
  };
  provided_evidence: Array<{
    type: string;
    filename?: string;
    content_summary?: string;
    relevance:
      | "relevant"
      | "likely_relevant"
      | "unclear"
      | "not_relevant"
      | string;
    what_it_may_show: string;
    used_in_draft: boolean;
    needs_review: boolean;
  }>;
  known_requirements: Record<string, FieldValue>;
  captured_professional_details: {
    connectors: Array<Record<string, unknown>>;
    terminals: Array<Record<string, unknown>>;
    wire_gauge: FieldValue | null;
    pinout: Array<Record<string, unknown>>;
    materials: Array<Record<string, unknown>>;
    shielding: FieldValue | null;
    testing_requirements: Array<Record<string, unknown>>;
  };
  ai_interpretation: {
    short_understanding: string;
    likely_harness_type: string;
    likely_use: "power" | "signal" | "data" | "mixed" | "unknown" | string;
    complexity_estimate:
      | "simple"
      | "simple_to_moderate"
      | "moderate"
      | "complex"
      | "unknown"
      | string;
    do_not_assume: string[];
  };
  unknowns: {
    ask_user_now: UnknownItem[];
    ask_user_if_likely_known: UnknownItem[];
    easy_harness_review: UnknownItem[];
    later_supplier_or_engineering_confirmation: UnknownItem[];
    not_applicable: UnknownItem[];
  };
  risk_flags: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical" | string;
    description: string;
    needs_user_question: boolean;
    review_owner:
      | "user"
      | "easy_harness"
      | "supplier_or_engineering"
      | "user_or_easy_harness"
      | string;
  }>;
  user_facing_summary: {
    request_line: string;
    compact_details: string[];
    what_we_have: string[];
    needed_next: string[];
    next_step: string;
  };
  requirement_map: RequirementMap;
  draft_closure: {
    can_close_user_draft: boolean;
    closure_status: DraftStatus;
    closure_reason: string;
    next_action:
      | "ask_user"
      | "easy_harness_review"
      | "request_harness_related_input"
      | "no_action"
      | string;
    questions_to_ask: string[];
    customer_message_type:
      | "needs_harness_context"
      | "ask_key_details"
      | "ready_for_review"
      | "not_harness_related"
      | string;
  };
};

type RequirementMapEndpoint = {
  id: string;
  label: string;
  role: string;
  known_from: string;
  status: string;
  evidence_refs: string[];
};

type RequirementMapSection = {
  id: string;
  label: string;
  type: string;
  length_basis: string;
  route_basis: string;
  status: string;
};

type RequirementMapConnectionGroup = {
  id: string;
  label: string;
  from: string;
  to: string;
  function: string;
  known_signals: string[];
  status: string;
  evidence_refs: string[];
  review_needed: string[];
};

type RequirementMapOpenItem = {
  item: string;
  owner: "customer" | "easy_harness_review" | "customer_or_easy_harness" | string;
  why_it_matters: string;
  blocks_review: boolean;
};

type RequirementMapEvidenceRef = {
  source: string;
  supports: string;
  boundary: string;
};

type RequirementMap = {
  schema_version: "easy_harness_requirement_map_v0_1";
  connection_goal: string;
  endpoints: RequirementMapEndpoint[];
  harness_sections: RequirementMapSection[];
  connection_groups: RequirementMapConnectionGroup[];
  known_facts: string[];
  open_items: RequirementMapOpenItem[];
  easy_harness_review_items: string[];
  evidence_refs: RequirementMapEvidenceRef[];
};

// Provider adapter: Easy Harness Draft can run on Qwen first, with DeepSeek kept as fallback.
const schemaVersion = "easy_harness_draft_v0_1";
const adapterId = "easy-harness-draft-agent-v0-2";
const supportedStatus = new Set([
  "draft_saved",
  "checking",
  "needs_info",
  "not_supported",
  "in_review",
]);
const isUuidLike = (value = "") =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

function envFlag(name: string) {
  return ["1", "true", "yes", "on"].includes(
    (Deno.env.get(name) || "").trim().toLowerCase(),
  );
}

function envFlagDefault(name: string, fallback: boolean) {
  const raw = (Deno.env.get(name) || "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function envNumber(name: string, fallback: number, min: number, max: number) {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function platformWallClockMs() {
  return envNumber("AI_DRAFT_PLATFORM_WALL_CLOCK_MS", 140000, 60000, 390000);
}

function providerRequestTimeoutMs() {
  const maxSafeMs = Math.max(15000, platformWallClockMs() - 30000);
  return envNumber(
    "AI_DRAFT_PROVIDER_REQUEST_TIMEOUT_MS",
    Math.min(110000, maxSafeMs),
    15000,
    maxSafeMs,
  );
}

function draftJobBudgetMs() {
  const maxSafeMs = Math.max(60000, platformWallClockMs() - 20000);
  return envNumber(
    "AI_DRAFT_JOB_BUDGET_MS",
    Math.min(125000, maxSafeMs),
    60000,
    maxSafeMs,
  );
}

function draftFirstPassTimeoutMs() {
  const maxSafeMs = Math.max(30000, draftJobBudgetMs() - 25000);
  return envNumber(
    "AI_DRAFT_FIRST_PASS_TIMEOUT_MS",
    Math.min(100000, maxSafeMs),
    30000,
    maxSafeMs,
  );
}

function draftAuditPassTimeoutMs() {
  const maxSafeMs = Math.max(15000, draftJobBudgetMs() - 10000);
  return envNumber(
    "AI_DRAFT_AUDIT_PASS_TIMEOUT_MS",
    Math.min(20000, maxSafeMs),
    15000,
    Math.min(180000, maxSafeMs),
  );
}

function edgeFastResponseMs() {
  const maxSafeMs = Math.max(0, platformWallClockMs() - 30000);
  return envNumber(
    "AI_UPLOAD_ASSISTANT_FAST_RESPONSE_MS",
    Math.min(45000, maxSafeMs),
    0,
    maxSafeMs,
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number,
  label: string,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function attachmentVisionEnabled() {
  return (
    selectedDraftProvider() === "qwen" &&
    (envFlag("AI_DRAFT_ENABLE_ATTACHMENT_VISION") ||
      envFlag("QWEN_ENABLE_VISION"))
  );
}

function qwenFileExtractEnabled() {
  return (
    selectedDraftProvider() === "qwen" &&
    (envFlag("AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT") ||
      envFlag("QWEN_ENABLE_FILE_EXTRACT"))
  );
}

function isImageAttachment(attachment: AttachmentRow & { storage?: StorageRow }) {
  const mime = (attachment.mime_type || attachment.storage?.content_type || "")
    .toLowerCase()
    .trim();
  return (
    mime.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp)$/i.test(attachment.name || "")
  );
}

function isPlainTextAttachment(attachment: AttachmentRow & { storage?: StorageRow }) {
  const name = (attachment.name || "").toLowerCase();
  const mime = (attachment.mime_type || attachment.storage?.content_type || "")
    .toLowerCase()
    .trim();
  return (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    /\.(txt|md|json|log)$/i.test(name)
  );
}

function isCsvAttachment(attachment: AttachmentRow & { storage?: StorageRow }) {
  const name = (attachment.name || "").toLowerCase();
  const mime = (attachment.mime_type || attachment.storage?.content_type || "")
    .toLowerCase()
    .trim();
  return mime.includes("csv") || /\.csv$/i.test(name);
}

function isPdfAttachment(attachment: AttachmentRow & { storage?: StorageRow }) {
  const name = (attachment.name || "").toLowerCase();
  const mime = (attachment.mime_type || attachment.storage?.content_type || "")
    .toLowerCase()
    .trim();
  return mime.includes("pdf") || /\.pdf$/i.test(name);
}

function isSpreadsheetAttachment(attachment: AttachmentRow & { storage?: StorageRow }) {
  const name = (attachment.name || "").toLowerCase();
  const mime = (attachment.mime_type || attachment.storage?.content_type || "")
    .toLowerCase()
    .trim();
  return (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    /\.(xlsx|xlsm)$/i.test(name)
  );
}

function isOfficeDocumentAttachment(attachment: AttachmentRow & { storage?: StorageRow }) {
  const name = (attachment.name || "").toLowerCase();
  const mime = (attachment.mime_type || attachment.storage?.content_type || "")
    .toLowerCase()
    .trim();
  return (
    mime.includes("word") ||
    mime.includes("officedocument") ||
    /\.(docx|pptx|epub|mobi)$/i.test(name)
  );
}

function isCadAttachment(attachment: AttachmentRow & { storage?: StorageRow }) {
  const name = (attachment.name || "").toLowerCase();
  const mime = (attachment.mime_type || attachment.storage?.content_type || "")
    .toLowerCase()
    .trim();
  return (
    mime.includes("cad") ||
    mime.includes("iges") ||
    mime.includes("step") ||
    mime.includes("stl") ||
    /\.(step|stp|igs|iges|dxf|dwg|stl|obj|3mf|amf|fcstd)$/i.test(name)
  );
}

function isQwenFileExtractCandidate(attachment: AttachmentRow & { storage?: StorageRow }) {
  const name = (attachment.name || "").toLowerCase();
  return (
    isImageAttachment(attachment) ||
    isPlainTextAttachment(attachment) ||
    isCsvAttachment(attachment) ||
    isPdfAttachment(attachment) ||
    isSpreadsheetAttachment(attachment) ||
    isOfficeDocumentAttachment(attachment) ||
    /\.(docx|pptx|epub|mobi)$/i.test(name)
  );
}

function parserNeededLabel(attachment: AttachmentRow & { storage?: StorageRow }) {
  const name = (attachment.name || "").toLowerCase();
  const mime = (attachment.mime_type || attachment.storage?.content_type || "")
    .toLowerCase()
    .trim();
  if (mime.includes("pdf") || /\.pdf$/i.test(name)) return "PDF text/OCR parser";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    /\.(xlsx?|xlsm)$/i.test(name)
  )
    return "spreadsheet parser";
  if (isCadAttachment(attachment))
    return "CAD parser";
  return "file-specific parser";
}

function fileExtractParserNeededLabel(attachment: AttachmentRow & { storage?: StorageRow }) {
  if (isPdfAttachment(attachment)) return "Qwen file-extract or PDF page-image pipeline";
  if (isSpreadsheetAttachment(attachment)) return "Qwen file-extract or spreadsheet render pipeline";
  if (isOfficeDocumentAttachment(attachment)) return "Qwen file-extract document pipeline";
  if (isCadAttachment(attachment)) return "CAD preview/metadata conversion pipeline";
  if (isImageAttachment(attachment)) return "vision/OCR model pipeline";
  return parserNeededLabel(attachment);
}

function compactText(value = "", limit = 8000) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function xmlDecode(value = "") {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTextFacts(text = "") {
  const facts: Array<Record<string, unknown>> = [];
  const patterns: Array<[string, RegExp]> = [
    ["quantity", /\b\d+\s*(pcs?|pieces?|units?|sets?|pairs?)\b/gi],
    ["length", /\b\d+(?:\.\d+)?\s*(mm|cm|m|meter|meters|in|inch|inches|ft|feet)\b/gi],
    ["voltage", /\b\d+(?:\.\d+)?\s*(v|volt|volts)\b/gi],
    ["current", /\b\d+(?:\.\d+)?\s*(a|amp|amps)\b/gi],
    ["connector_or_part", /\b[A-Z]{1,6}[-_]?\d{2,}[A-Z0-9_-]*\b/g],
    ["pin_assignment", /\bpin\s*\d{1,3}\s*(?:[:=\-]|\s+)\s*[A-Za-z0-9+/_\- ]{1,40}/gi],
  ];
  for (const [kind, pattern] of patterns) {
    const matches = [...text.matchAll(pattern)]
      .map((match) => match[0].trim())
      .filter(Boolean)
      .slice(0, 12);
    for (const value of matches) facts.push({ kind, value, source: "attachment_text" });
  }
  return facts.slice(0, 40);
}

function parseDelimitedRows(text = "", maxRows = 80, maxColumns = 30) {
  const sample = text.slice(0, 4000);
  const commaCount = (sample.match(/,/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;
  const delimiter = tabCount > commaCount ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length && rows.length < maxRows; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(compactText(cell, 500));
      cell = "";
    } else if (char === "\n") {
      row.push(compactText(cell, 500));
      rows.push(row.slice(0, maxColumns));
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(compactText(cell, 500));
    rows.push(row.slice(0, maxColumns));
  }

  return rows.filter((item) => item.some(Boolean));
}

function tableSummary(
  rows: string[][],
  source: string,
  sheetName = "Table",
): Record<string, unknown> | null {
  if (!rows.length) return null;
  const headers = rows[0].map((item, index) => item || `column_${index + 1}`);
  const sampleRows = rows.slice(1, 8).map((row) =>
    headers.reduce((memo, header, index) => {
      if (row[index]) memo[header] = row[index];
      return memo;
    }, {} as Record<string, string>)
  );
  return {
    source,
    sheet_name: sheetName,
    row_count: Math.max(rows.length - 1, 0),
    column_count: Math.max(...rows.map((row) => row.length)),
    headers: headers.slice(0, 30),
    sample_rows: sampleRows,
  };
}

function extractTableFacts(rows: string[][], source: string) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((item) => item.toLowerCase().trim());
  const findColumn = (...needles: string[]) =>
    headers.findIndex((header) => needles.some((needle) => header.includes(needle)));
  const pinColumn = findColumn("pin", "cavity", "position");
  const signalColumn = findColumn("signal", "function", "circuit");
  const colorColumn = findColumn("color", "colour");
  const fromColumn = findColumn("from", "end a", "connector a");
  const toColumn = findColumn("to", "end b", "connector b");
  const partColumn = findColumn("part", "connector", "terminal", "sku", "mpn");
  const quantityColumn = findColumn("qty", "quantity");
  const facts: Array<Record<string, unknown>> = [];

  for (const [rowIndex, row] of rows.slice(1, 41).entries()) {
    const columns: Record<string, string> = {};
    for (const index of [
      pinColumn,
      signalColumn,
      colorColumn,
      fromColumn,
      toColumn,
      partColumn,
      quantityColumn,
    ]) {
      if (index >= 0 && row[index]) columns[rows[0][index] || `column_${index + 1}`] = row[index];
    }
    if (pinColumn >= 0 && Object.keys(columns).length) {
      facts.push({
        kind: "pinout_table_row",
        source,
        row_index: rowIndex + 2,
        columns,
      });
    } else if ((partColumn >= 0 || quantityColumn >= 0) && Object.keys(columns).length) {
      facts.push({
        kind: "bom_or_parts_table_row",
        source,
        row_index: rowIndex + 2,
        columns,
      });
    }
  }

  return facts.slice(0, 40);
}

function bytesToLatin1(bytes: Uint8Array) {
  const chunks: string[] = [];
  for (let index = 0; index < bytes.length; index += 8192) {
    chunks.push(String.fromCharCode(...bytes.slice(index, index + 8192)));
  }
  return chunks.join("");
}

function textFromBytes(bytes: Uint8Array, limit = 2000000) {
  return new TextDecoder("utf-8", { fatal: false }).decode(
    bytes.slice(0, Math.min(bytes.length, limit)),
  );
}

function isMostlyTextBytes(bytes: Uint8Array) {
  const sample = bytes.slice(0, Math.min(bytes.length, 8192));
  if (!sample.length) return false;
  let control = 0;
  let zero = 0;
  for (const byte of sample) {
    if (byte === 0) zero += 1;
    if (byte < 9 || (byte > 13 && byte < 32)) control += 1;
  }
  return zero / sample.length < 0.02 && control / sample.length < 0.08;
}

function cadExtension(name = "") {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return (match?.[1] || "").toLowerCase();
}

function pushUnique(target: string[], value = "", limit = 40) {
  const clean = compactText(value, 500);
  if (clean && !target.includes(clean) && target.length < limit) {
    target.push(clean);
  }
}

function numberValue(value = "") {
  const number = Number(value.replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function boundsFromPoints(points: number[][]) {
  const valid = points.filter((point) =>
    point.length >= 3 && point.every((item) => Number.isFinite(item))
  );
  if (!valid.length) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const point of valid) {
    for (let index = 0; index < 3; index += 1) {
      min[index] = Math.min(min[index], point[index]);
      max[index] = Math.max(max[index], point[index]);
    }
  }
  return {
    min,
    max,
    size: max.map((value, index) => Number((value - min[index]).toFixed(4))),
  };
}

function topCounts(values: string[], limit = 20) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function cadSummaryFromFacts(kind: string, facts: Array<Record<string, unknown>>) {
  const bits: string[] = [`CAD ${kind.toUpperCase()} metadata extracted`];
  const products = facts
    .filter((item) => item.kind === "cad_product_name")
    .map((item) => String(item.value || ""))
    .filter(Boolean)
    .slice(0, 3);
  const bounds = facts.find((item) => item.kind === "cad_bounding_box");
  const layers = facts.find((item) => item.kind === "cad_layers");
  if (products.length) bits.push(`products: ${products.join(", ")}`);
  if (bounds?.value && typeof bounds.value === "object") {
    const value = bounds.value as Record<string, unknown>;
    bits.push(`bounds size: ${JSON.stringify(value.size || value)}`);
  }
  if (Array.isArray(layers?.value)) {
    bits.push(`layers: ${(layers.value as string[]).slice(0, 5).join(", ")}`);
  }
  return bits.join("; ");
}

function parseStepCad(text: string) {
  const facts: Array<Record<string, unknown>> = [];
  const productNames: string[] = [];
  for (const match of text.matchAll(/\bPRODUCT\s*\(\s*'([^']*)'/gi)) {
    pushUnique(productNames, match[1], 12);
  }
  for (const name of productNames) {
    facts.push({ kind: "cad_product_name", value: name, source: "step_product" });
  }
  const fileName = /\bFILE_NAME\s*\(\s*'([^']*)'/i.exec(text)?.[1];
  if (fileName) facts.push({ kind: "cad_file_name", value: fileName, source: "step_header" });
  const schema = /\bFILE_SCHEMA\s*\(\s*\(\s*'([^']*)'/i.exec(text)?.[1];
  if (schema) facts.push({ kind: "cad_schema", value: schema, source: "step_header" });

  const entityTypes = [...text.matchAll(/#\d+\s*=\s*([A-Z0-9_]+)\s*\(/g)]
    .map((match) => match[1]);
  facts.push({
    kind: "cad_entity_counts",
    value: topCounts(entityTypes),
    source: "step_entities",
  });

  if (/SI_UNIT\s*\([^)]*\.MILLI\./i.test(text)) {
    facts.push({ kind: "cad_unit_hint", value: "millimetre", source: "step_si_unit" });
  } else if (/SI_UNIT\s*\([^)]*\.METRE\./i.test(text)) {
    facts.push({ kind: "cad_unit_hint", value: "metre", source: "step_si_unit" });
  }

  const points: number[][] = [];
  for (const match of text.matchAll(/CARTESIAN_POINT\s*\([^)]*\(\s*([^)]+)\s*\)/gi)) {
    const point = match[1].split(",").map((item) => Number(item.trim()));
    if (point.length >= 3 && point.every(Number.isFinite)) points.push(point.slice(0, 3));
    if (points.length >= 10000) break;
  }
  const bounds = boundsFromPoints(points);
  if (bounds) facts.push({ kind: "cad_bounding_box", value: bounds, source: "step_cartesian_points" });
  if (points.length) facts.push({ kind: "cad_point_count_sampled", value: points.length, source: "step_cartesian_points" });

  return {
    text: compactText(
      [
        fileName ? `STEP file: ${fileName}` : "",
        schema ? `Schema: ${schema}` : "",
        productNames.length ? `Products: ${productNames.join(", ")}` : "",
      ].filter(Boolean).join("\n"),
    ),
    facts,
  };
}

function parseObjCad(text: string) {
  const facts: Array<Record<string, unknown>> = [];
  const points: number[][] = [];
  const objects: string[] = [];
  const groups: string[] = [];
  let faceCount = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("v ")) {
      const point = line.split(/\s+/).slice(1, 4).map(Number);
      if (point.length === 3 && point.every(Number.isFinite)) points.push(point);
    } else if (line.startsWith("f ")) {
      faceCount += 1;
    } else if (line.startsWith("o ")) {
      pushUnique(objects, line.slice(2), 20);
    } else if (line.startsWith("g ")) {
      pushUnique(groups, line.slice(2), 20);
    }
  }
  const bounds = boundsFromPoints(points);
  if (bounds) facts.push({ kind: "cad_bounding_box", value: bounds, source: "obj_vertices" });
  facts.push({ kind: "cad_vertex_count", value: points.length, source: "obj_vertices" });
  facts.push({ kind: "cad_face_count", value: faceCount, source: "obj_faces" });
  if (objects.length) facts.push({ kind: "cad_object_names", value: objects, source: "obj_objects" });
  if (groups.length) facts.push({ kind: "cad_group_names", value: groups, source: "obj_groups" });
  return {
    text: compactText(`OBJ vertices: ${points.length}\nFaces: ${faceCount}\nObjects: ${objects.join(", ")}\nGroups: ${groups.join(", ")}`),
    facts,
  };
}

function parseTextStlCad(text: string) {
  const points: number[][] = [];
  for (const match of text.matchAll(/\bvertex\s+([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi)) {
    points.push([Number(match[1]), Number(match[2]), Number(match[3])]);
    if (points.length >= 30000) break;
  }
  const facetCount = (text.match(/\bfacet\s+normal\b/gi) || []).length;
  const facts: Array<Record<string, unknown>> = [
    { kind: "cad_triangle_count", value: facetCount, source: "stl_text" },
    { kind: "cad_vertex_count_sampled", value: points.length, source: "stl_text" },
  ];
  const bounds = boundsFromPoints(points);
  if (bounds) facts.push({ kind: "cad_bounding_box", value: bounds, source: "stl_text_vertices" });
  return {
    text: compactText(`ASCII STL facets: ${facetCount}\nVertices sampled: ${points.length}`),
    facts,
  };
}

function parseBinaryStlCad(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangleCount = bytes.byteLength >= 84 ? view.getUint32(80, true) : 0;
  const points: number[][] = [];
  const maxTriangles = Math.min(triangleCount, 10000);
  for (let triangle = 0; triangle < maxTriangles; triangle += 1) {
    const base = 84 + triangle * 50;
    if (base + 50 > bytes.byteLength) break;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = base + 12 + vertex * 12;
      points.push([
        view.getFloat32(offset, true),
        view.getFloat32(offset + 4, true),
        view.getFloat32(offset + 8, true),
      ]);
    }
  }
  const facts: Array<Record<string, unknown>> = [
    { kind: "cad_triangle_count", value: triangleCount, source: "stl_binary" },
    { kind: "cad_vertex_count_sampled", value: points.length, source: "stl_binary" },
  ];
  const bounds = boundsFromPoints(points);
  if (bounds) facts.push({ kind: "cad_bounding_box", value: bounds, source: "stl_binary_vertices" });
  return {
    text: compactText(`Binary STL triangles: ${triangleCount}\nVertices sampled: ${points.length}`),
    facts,
  };
}

function parseDxfCad(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const layers: string[] = [];
  const entityTypes: string[] = [];
  const points: number[][] = [];
  let unitCode = "";
  let currentX: number | null = null;
  let currentY: number | null = null;
  let currentZ: number | null = null;
  const unitsByCode: Record<string, string> = {
    "0": "unitless",
    "1": "inches",
    "2": "feet",
    "4": "millimetres",
    "5": "centimetres",
    "6": "metres",
  };

  for (let index = 0; index < lines.length - 1; index += 2) {
    const code = lines[index];
    const value = lines[index + 1] || "";
    if (code === "0" && /^[A-Z_][A-Z0-9_]*$/i.test(value)) entityTypes.push(value.toUpperCase());
    if (code === "8") pushUnique(layers, value, 80);
    if (value === "$INSUNITS") {
      for (let lookahead = index + 2; lookahead < Math.min(lines.length - 1, index + 12); lookahead += 2) {
        if (lines[lookahead] === "70") {
          unitCode = lines[lookahead + 1] || "";
          break;
        }
      }
    }
    if (code === "10") currentX = numberValue(value);
    if (code === "20") currentY = numberValue(value);
    if (code === "30") {
      currentZ = numberValue(value);
      if (currentX !== null && currentY !== null && currentZ !== null) {
        points.push([currentX, currentY, currentZ]);
        currentX = null;
        currentY = null;
        currentZ = null;
      }
    }
    if (points.length >= 20000) break;
  }

  const facts: Array<Record<string, unknown>> = [
    { kind: "cad_entity_counts", value: topCounts(entityTypes), source: "dxf_entities" },
  ];
  if (layers.length) facts.push({ kind: "cad_layers", value: layers, source: "dxf_layers" });
  if (unitCode) facts.push({ kind: "cad_unit_hint", value: unitsByCode[unitCode] || `INSUNITS ${unitCode}`, source: "dxf_insunits" });
  const bounds = boundsFromPoints(points);
  if (bounds) facts.push({ kind: "cad_bounding_box", value: bounds, source: "dxf_points" });
  if (points.length) facts.push({ kind: "cad_point_count_sampled", value: points.length, source: "dxf_points" });
  return {
    text: compactText(`DXF layers: ${layers.join(", ")}\nUnits: ${unitCode ? unitsByCode[unitCode] || unitCode : "unknown"}\nEntities: ${JSON.stringify(topCounts(entityTypes, 10))}`),
    facts,
  };
}

function parseIgesCad(text: string) {
  const facts: Array<Record<string, unknown>> = [];
  const globalLine = text.split(/\r?\n/).find((line) => /G\s*\d*\s*$/.test(line)) || "";
  const entityTypes = [...text.matchAll(/^\s*\d+\s+(\d+)\s+/gm)].map((match) => match[1]);
  if (entityTypes.length) {
    facts.push({ kind: "cad_entity_counts", value: topCounts(entityTypes), source: "iges_directory" });
  }
  if (globalLine) facts.push({ kind: "cad_global_section_hint", value: compactText(globalLine, 1000), source: "iges_global" });
  return {
    text: compactText(`IGES entity types: ${JSON.stringify(topCounts(entityTypes, 10))}\n${globalLine}`),
    facts,
  };
}

function extractCadMetadata(bytes: Uint8Array, attachment: AttachmentRow & { storage?: StorageRow }) {
  const extension = cadExtension(attachment.name);
  const kind = extension || "cad";
  if (["dwg", "3mf", "fcstd"].includes(extension)) return null;

  let parsed: { text: string; facts: Array<Record<string, unknown>> } | null = null;
  const canReadText = isMostlyTextBytes(bytes);
  const text = canReadText ? textFromBytes(bytes) : "";

  if (["step", "stp"].includes(extension) && text) parsed = parseStepCad(text);
  else if (extension === "dxf" && text) parsed = parseDxfCad(text);
  else if (["igs", "iges"].includes(extension) && text) parsed = parseIgesCad(text);
  else if (extension === "obj" && text) parsed = parseObjCad(text);
  else if (extension === "stl") {
    parsed = text.trim().toLowerCase().startsWith("solid")
      ? parseTextStlCad(text)
      : parseBinaryStlCad(bytes);
  } else if (text) {
    parsed = {
      text: compactText(text),
      facts: extractTextFacts(text),
    };
  }

  if (!parsed || (!parsed.text && !parsed.facts.length)) return null;
  const facts = [
    { kind: "cad_file_type", value: kind.toUpperCase(), source: "filename_extension" },
    { kind: "cad_file_size_bytes", value: bytes.byteLength, source: "storage_object" },
    ...parsed.facts,
  ];
  return {
    text: parsed.text,
    facts,
    summary: cadSummaryFromFacts(kind, facts),
  };
}

function unescapePdfString(value = "") {
  return value
    .replace(/\\([nrtbf()\\])/g, (_match, char) => {
      const map: Record<string, string> = {
        n: " ",
        r: " ",
        t: " ",
        b: " ",
        f: " ",
        "(": "(",
        ")": ")",
        "\\": "\\",
      };
      return map[char] || char;
    })
    .replace(/\\[0-7]{1,3}/g, " ")
    .trim();
}

function extractPdfTextProbe(bytes: Uint8Array) {
  const raw = bytesToLatin1(bytes);
  const snippets: string[] = [];
  const literalText = /\((?:\\.|[^\\)]){2,300}\)\s*Tj/g;
  const arrayText = /\[((?:\s*\((?:\\.|[^\\)]){1,300}\)\s*){1,80})\]\s*TJ/g;
  const clean = (value: string) => compactText(unescapePdfString(value), 500);

  for (const match of raw.matchAll(literalText)) {
    const inner = match[0].replace(/\)\s*Tj\s*$/, "").slice(1);
    const text = clean(inner);
    if (/[A-Za-z0-9]/.test(text)) snippets.push(text);
    if (snippets.length >= 80) break;
  }
  for (const match of raw.matchAll(arrayText)) {
    const pieces = [...match[1].matchAll(/\((?:\\.|[^\\)]){1,300}\)/g)]
      .map((piece) => clean(piece[0].slice(1, -1)))
      .filter(Boolean);
    const text = compactText(pieces.join(" "), 1000);
    if (/[A-Za-z0-9]/.test(text)) snippets.push(text);
    if (snippets.length >= 100) break;
  }

  return compactText([...new Set(snippets)].join(" "), 8000);
}

function readU16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

function listZipEntries(bytes: Uint8Array) {
  const minOffset = Math.max(0, bytes.length - 66000);
  let eocdOffset = -1;
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readU32(bytes, offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("ZIP end record not found.");

  const entryCount = readU16(bytes, eocdOffset + 10);
  let offset = readU32(bytes, eocdOffset + 16);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (readU32(bytes, offset) !== 0x02014b50) break;
    const method = readU16(bytes, offset + 10);
    const compressedSize = readU32(bytes, offset + 20);
    const nameLength = readU16(bytes, offset + 28);
    const extraLength = readU16(bytes, offset + 30);
    const commentLength = readU16(bytes, offset + 32);
    const localHeaderOffset = readU32(bytes, offset + 42);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    entries.push({ name, method, compressedSize, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readZipEntry(bytes: Uint8Array, entry: ZipEntry) {
  const offset = entry.localHeaderOffset;
  if (readU32(bytes, offset) !== 0x04034b50) {
    throw new Error(`Invalid local ZIP header for ${entry.name}.`);
  }
  const nameLength = readU16(bytes, offset + 26);
  const extraLength = readU16(bytes, offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  const compressed = bytes.slice(start, start + entry.compressedSize);
  if (entry.method === 0) return compressed;
  if (entry.method !== 8) throw new Error(`Unsupported ZIP compression method ${entry.method}.`);
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function xmlAttr(tag: string, name: string) {
  const match = new RegExp(`\\b${name}=["']([^"']*)["']`).exec(tag);
  return match ? xmlDecode(match[1]) : "";
}

function xlsxSheetPath(target = "") {
  const clean = target.replace(/^\/+/, "").replace(/^\.\//, "");
  if (clean.startsWith("xl/")) return clean;
  return `xl/${clean}`;
}

function columnIndexFromRef(ref = "") {
  const letters = ref.replace(/[^A-Z]/gi, "").toUpperCase();
  let value = 0;
  for (const char of letters) value = value * 26 + char.charCodeAt(0) - 64;
  return Math.max(value - 1, 0);
}

function extractSharedStrings(xml = "") {
  const values: string[] = [];
  for (const match of xml.matchAll(/<si\b[\s\S]*?<\/si>/g)) {
    const pieces = [...match[0].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map((item) => xmlDecode(item[1]))
      .join("");
    values.push(compactText(pieces, 1000));
  }
  return values;
}

function parseWorksheetRows(xml = "", sharedStrings: string[] = []) {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = xmlAttr(attrs, "r");
      const type = xmlAttr(attrs, "t");
      const column = columnIndexFromRef(ref);
      const rawValue = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] || "";
      const inlineValue = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/.exec(body)?.[1] || "";
      let value = "";
      if (type === "s") value = sharedStrings[Number(rawValue)] || "";
      else if (type === "inlineStr") value = xmlDecode(inlineValue);
      else value = xmlDecode(rawValue);
      if (value) cells[column] = compactText(value, 500);
    }
    if (cells.some(Boolean)) rows.push(cells);
    if (rows.length >= 80) break;
  }
  return rows;
}

async function extractXlsxTables(bytes: Uint8Array) {
  const entries = listZipEntries(bytes);
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const entryText = async (name: string) => {
    const entry = byName.get(name);
    if (!entry) return "";
    return new TextDecoder().decode(await readZipEntry(bytes, entry));
  };
  const sharedStrings = extractSharedStrings(await entryText("xl/sharedStrings.xml"));
  const workbookXml = await entryText("xl/workbook.xml");
  const relsXml = await entryText("xl/_rels/workbook.xml.rels");
  const relTargets = new Map<string, string>();
  for (const rel of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = rel[0];
    const id = xmlAttr(tag, "Id");
    const target = xmlAttr(tag, "Target");
    if (id && target) relTargets.set(id, xlsxSheetPath(target));
  }

  const sheets: Array<{ name: string; path: string }> = [];
  for (const sheet of workbookXml.matchAll(/<sheet\b[^>]*>/g)) {
    const tag = sheet[0];
    const name = xmlAttr(tag, "name") || `Sheet ${sheets.length + 1}`;
    const relId = xmlAttr(tag, "r:id");
    const path = relTargets.get(relId) || `xl/worksheets/sheet${sheets.length + 1}.xml`;
    sheets.push({ name, path });
  }
  if (!sheets.length) {
    for (const entry of entries.filter((item) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(item.name)).slice(0, 5)) {
      sheets.push({ name: entry.name.replace(/^.*\/|\.xml$/g, ""), path: entry.name });
    }
  }

  const tables: Array<Record<string, unknown>> = [];
  const facts: Array<Record<string, unknown>> = [];
  const textParts: string[] = [];
  for (const sheet of sheets.slice(0, 5)) {
    const xml = await entryText(sheet.path);
    if (!xml) continue;
    const rows = parseWorksheetRows(xml, sharedStrings);
    const summary = tableSummary(rows, "attachment_xlsx", sheet.name);
    if (!summary) continue;
    tables.push(summary);
    facts.push(...extractTableFacts(rows, `attachment_xlsx:${sheet.name}`));
    textParts.push(
      rows
        .slice(0, 20)
        .map((row) => row.filter(Boolean).join(" | "))
        .filter(Boolean)
        .join("\n"),
    );
  }

  return {
    text: compactText(textParts.filter(Boolean).join("\n"), 8000),
    tables,
    facts: facts.slice(0, 80),
  };
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeArrayOfRecords(value: unknown, limit = 80) {
  return Array.isArray(value)
    ? value
        .filter((item) => item && typeof item === "object" && !Array.isArray(item))
        .slice(0, limit) as Array<Record<string, unknown>>
    : [];
}

function safeText(value: unknown, limit = 8000) {
  return typeof value === "string" ? compactText(value, limit) : "";
}

function normalizeQwenFileExtractResult(
  raw: unknown,
  fallbackFilename: string,
) {
  const value =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
  const textExcerpt = safeText(
    value.text_excerpt || value.visible_text || value.extracted_text || "",
  );
  const tables = safeArrayOfRecords(value.tables, 20);
  const facts = safeArrayOfRecords(value.structured_facts, 120);
  return {
    filename: safeText(value.filename, 500) || fallbackFilename,
    summary:
      safeText(value.summary, 1200) ||
      "Qwen file-extract returned document observations for Draft intake.",
    text_excerpt: textExcerpt,
    structured_facts: facts.length ? facts : extractTextFacts(textExcerpt),
    tables,
  };
}

async function uploadQwenFileForExtract(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
) {
  const { apiKey, baseUrl } = draftModelConfig();
  const form = new FormData();
  const fileBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  form.append("purpose", "file-extract");
  form.append(
    "file",
    new Blob([fileBuffer], { type: mimeType || "application/octet-stream" }),
    filename || "attachment",
  );

  const response = await fetchWithTimeout(
    `${baseUrl}/files`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    },
    providerRequestTimeoutMs(),
    "Qwen file upload",
  );
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Qwen file upload failed (${response.status}): ${raw.slice(0, 400)}`);
  }
  const parsed = JSON.parse(raw);
  if (!parsed?.id) throw new Error("Qwen file upload did not return a file id.");
  return String(parsed.id);
}

async function waitForQwenFileReady(fileId: string) {
  const { apiKey, baseUrl } = draftModelConfig();
  const attempts = envNumber("AI_DRAFT_QWEN_FILE_EXTRACT_POLL_ATTEMPTS", 8, 1, 30);
  const intervalMs = envNumber("AI_DRAFT_QWEN_FILE_EXTRACT_POLL_INTERVAL_MS", 750, 100, 5000);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetchWithTimeout(
      `${baseUrl}/files/${fileId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
      envNumber("AI_DRAFT_PROVIDER_STATUS_TIMEOUT_MS", 15000, 5000, 60000),
      "Qwen file status check",
    );
    if (!response.ok) return;
    const data = await response.json();
    const status = String(data?.status || "").toLowerCase();
    if (!status || ["processed", "ready", "uploaded", "available", "ok"].includes(status)) return;
    if (["failed", "error", "cancelled", "canceled"].includes(status)) {
      throw new Error(`Qwen file ${fileId} processing failed with status ${status}.`);
    }
    await sleep(intervalMs);
  }
}

async function callQwenFileExtractModel(fileId: string, filename: string, mimeType: string) {
  const { apiKey, baseUrl } = draftModelConfig();
  const model = Deno.env.get("QWEN_FILE_EXTRACT_MODEL") || "qwen-long";
  const maxTokens = envNumber("QWEN_FILE_EXTRACT_MAX_TOKENS", 5000, 1000, 12000);
  const prompt = [
    "Extract Easy Harness request evidence from the attached customer file.",
    "Return JSON only with these keys:",
    "filename, summary, text_excerpt, structured_facts, tables, uncertainties.",
    "Focus on visible or extracted evidence relevant to a custom wiring harness: connector labels/models, pin numbers, pinout rows, wire colors, wire gauge, lengths, quantity, voltage/current, BOM/part rows, dimensions, notes, title blocks, and unclear items.",
    "Do not invent missing engineering facts. If a table, drawing, scan, photo, or handwriting is unclear, record an uncertainty instead of guessing.",
    `File name: ${filename}`,
    `MIME type: ${mimeType}`,
  ].join("\n");

  const response = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: maxTokens,
        messages: [
          {
            role: "system",
            content:
              "You are Easy Harness File Understanding Agent. You inspect only the attached file and produce structured observations for the Draft Agent.",
          },
          {
            role: "system",
            content: `fileid://${fileId}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    },
    providerRequestTimeoutMs(),
    "Qwen file extract",
  );
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Qwen file extract failed (${response.status}): ${raw.slice(0, 500)}`);
  }
  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Qwen file extract returned an empty result.");
  return normalizeQwenFileExtractResult(
    JSON.parse(extractJsonObject(content)),
    filename,
  );
}

async function buildQwenFileExtractObservation(
  attachment: AttachmentRow & { storage?: StorageRow },
  bytes: Uint8Array,
) {
  const storage = attachment.storage;
  const mimeType =
    attachment.mime_type ||
    storage?.content_type ||
    "application/octet-stream";
  const fileId = await uploadQwenFileForExtract(bytes, attachment.name, mimeType);
  await waitForQwenFileReady(fileId);
  const extracted = await callQwenFileExtractModel(
    fileId,
    attachment.name,
    mimeType,
  );

  return {
    filename: attachment.name,
    mime_type: mimeType,
    parser: "qwen_file_extract",
    status: "file_extracted",
    evidence_kind: "model_file_extract",
    summary: extracted.summary,
    text_excerpt: extracted.text_excerpt,
    structured_facts: extracted.structured_facts,
    tables: extracted.tables,
    provider_file_id: fileId,
    confidence: "model_observation",
  } as AttachmentObservation;
}

function logCheckingEvent(event: string, payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      event: `easy_harness_run_checking_${event}`,
      ...payload,
    }),
  );
}

const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schema_version",
    "draft_meta",
    "user_intent",
    "provided_evidence",
    "known_requirements",
    "captured_professional_details",
    "ai_interpretation",
    "unknowns",
    "risk_flags",
    "user_facing_summary",
    "requirement_map",
    "draft_closure",
  ],
  properties: {
    schema_version: { type: "string", enum: [schemaVersion] },
    draft_meta: {
      type: "object",
      additionalProperties: false,
      required: ["draft_status", "draft_maturity_level", "last_updated_reason"],
      properties: {
        draft_status: {
          type: "string",
          enum: [
            "not_harness_related",
            "needs_harness_context",
            "needs_key_clarification",
            "ready_for_easy_harness_review",
            "closed_for_easy_harness_review",
          ],
        },
        draft_maturity_level: { type: "number" },
        last_updated_reason: { type: "string" },
      },
    },
    user_intent: {
      type: "object",
      additionalProperties: false,
      required: [
        "intent_type",
        "connection_goal",
        "from_side",
        "to_side",
        "desired_outcome",
        "intent_confidence",
      ],
      properties: {
        intent_type: { type: "string" },
        connection_goal: { type: "string" },
        from_side: { type: "string" },
        to_side: { type: "array", items: { type: "string" } },
        desired_outcome: { type: "string" },
        intent_confidence: { type: "string" },
      },
    },
    provided_evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type",
          "relevance",
          "what_it_may_show",
          "used_in_draft",
          "needs_review",
        ],
        properties: {
          type: { type: "string" },
          filename: { type: "string" },
          content_summary: { type: "string" },
          relevance: { type: "string" },
          what_it_may_show: { type: "string" },
          used_in_draft: { type: "boolean" },
          needs_review: { type: "boolean" },
        },
      },
    },
    known_requirements: { type: "object", additionalProperties: true },
    captured_professional_details: {
      type: "object",
      additionalProperties: true,
    },
    ai_interpretation: { type: "object", additionalProperties: true },
    unknowns: {
      type: "object",
      additionalProperties: false,
      required: [
        "ask_user_now",
        "ask_user_if_likely_known",
        "easy_harness_review",
        "later_supplier_or_engineering_confirmation",
        "not_applicable",
      ],
      properties: {
        ask_user_now: {
          type: "array",
          items: { type: "object", additionalProperties: true },
        },
        ask_user_if_likely_known: {
          type: "array",
          items: { type: "object", additionalProperties: true },
        },
        easy_harness_review: {
          type: "array",
          items: { type: "object", additionalProperties: true },
        },
        later_supplier_or_engineering_confirmation: {
          type: "array",
          items: { type: "object", additionalProperties: true },
        },
        not_applicable: {
          type: "array",
          items: { type: "object", additionalProperties: true },
        },
      },
    },
    risk_flags: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    user_facing_summary: {
      type: "object",
      additionalProperties: false,
      required: [
        "request_line",
        "compact_details",
        "what_we_have",
        "needed_next",
        "next_step",
      ],
      properties: {
        request_line: { type: "string" },
        compact_details: {
          type: "array",
          items: { type: "string" },
          maxItems: 6,
        },
        what_we_have: { type: "array", items: { type: "string" }, maxItems: 6 },
        needed_next: { type: "array", items: { type: "string" }, maxItems: 3 },
        next_step: { type: "string" },
      },
    },
    requirement_map: {
      type: "object",
      additionalProperties: false,
      required: [
        "schema_version",
        "connection_goal",
        "endpoints",
        "harness_sections",
        "connection_groups",
        "known_facts",
        "open_items",
        "easy_harness_review_items",
        "evidence_refs",
      ],
      properties: {
        schema_version: {
          type: "string",
          enum: ["easy_harness_requirement_map_v0_1"],
        },
        connection_goal: { type: "string" },
        endpoints: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "label",
              "role",
              "known_from",
              "status",
              "evidence_refs",
            ],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              role: { type: "string" },
              known_from: { type: "string" },
              status: { type: "string" },
              evidence_refs: { type: "array", items: { type: "string" } },
            },
          },
        },
        harness_sections: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "label",
              "type",
              "length_basis",
              "route_basis",
              "status",
            ],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              type: { type: "string" },
              length_basis: { type: "string" },
              route_basis: { type: "string" },
              status: { type: "string" },
            },
          },
        },
        connection_groups: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "label",
              "from",
              "to",
              "function",
              "known_signals",
              "status",
              "evidence_refs",
              "review_needed",
            ],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              from: { type: "string" },
              to: { type: "string" },
              function: { type: "string" },
              known_signals: { type: "array", items: { type: "string" } },
              status: { type: "string" },
              evidence_refs: { type: "array", items: { type: "string" } },
              review_needed: { type: "array", items: { type: "string" } },
            },
          },
        },
        known_facts: { type: "array", items: { type: "string" } },
        open_items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["item", "owner", "why_it_matters", "blocks_review"],
            properties: {
              item: { type: "string" },
              owner: { type: "string" },
              why_it_matters: { type: "string" },
              blocks_review: { type: "boolean" },
            },
          },
        },
        easy_harness_review_items: {
          type: "array",
          items: { type: "string" },
        },
        evidence_refs: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["source", "supports", "boundary"],
            properties: {
              source: { type: "string" },
              supports: { type: "string" },
              boundary: { type: "string" },
            },
          },
        },
      },
    },
    draft_closure: {
      type: "object",
      additionalProperties: false,
      required: [
        "can_close_user_draft",
        "closure_status",
        "closure_reason",
        "next_action",
        "questions_to_ask",
        "customer_message_type",
      ],
      properties: {
        can_close_user_draft: { type: "boolean" },
        closure_status: {
          type: "string",
          enum: [
            "not_harness_related",
            "needs_harness_context",
            "needs_key_clarification",
            "ready_for_easy_harness_review",
            "closed_for_easy_harness_review",
          ],
        },
        closure_reason: { type: "string" },
        next_action: { type: "string" },
        questions_to_ask: {
          type: "array",
          items: { type: "string" },
          maxItems: 3,
        },
        customer_message_type: {
          type: "string",
          enum: [
            "needs_harness_context",
            "ask_key_details",
            "ready_for_review",
            "not_harness_related",
          ],
        },
      },
    },
  },
} as const;

function textFromBlocks(blocks: MessageRow["blocks"], fallback = "") {
  if (!Array.isArray(blocks)) return fallback;
  return (
    blocks
      .map((block) => {
        if (block.type === "text" && typeof block.text === "string")
          return block.text;
        if (block.type === "event" && typeof block.body === "string")
          return `${block.title || "Event"}: ${block.body}`;
        if (block.type === "attachments" && Array.isArray(block.files))
          return `Attachments: ${block.files.join(", ")}`;
        if (block.type === "price" && block.amount)
          return `Harness price released: ${block.amount}`;
        return "";
      })
      .filter(Boolean)
      .join("\n") || fallback
  );
}

function roleLabel(role: string) {
  if (role === "customer") return "Customer";
  if (role === "easy_harness") return "Easy Harness";
  if (role === "event") return "System event";
  return "System";
}

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeList(value: unknown, limit = 12) {
  return Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim())
        .slice(0, limit)
    : [];
}

function normalizeUnknownList(value: unknown, limit = 10): UnknownItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((item) => {
      if (typeof item === "string") {
        const text = normalizeString(item, "");
        return text ? { field: text, reason: text } : null;
      }
      if (item && typeof item === "object") {
        const raw = item as Record<string, unknown>;
        const field = normalizeString(raw.field, "");
        const reason = normalizeString(raw.reason, "");
        const question = normalizeString(raw.question, "");
        if (!field && !reason && !question) return null;
        return {
          field: field || reason || question,
          reason: reason || question || field,
          question: question || undefined,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => {
      const text = [item.field, item.reason, item.question]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .trim();
      if (!text) return false;
      if (/^unknown[_\s-]*item$/.test(String(item.field).toLowerCase())) return false;
      if (/^(needs?\s+later\s+confirmation|later confirmation|review item)$/i.test(String(item.reason).trim())) return false;
      if (text === "unknown_item needs later confirmation.") return false;
      const key = [item.field, item.reason, item.question || ""].join("|").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function normalizeFieldValue(value: unknown): FieldValue {
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;
    return {
      value: normalizeString(raw.value, "unknown"),
      source: normalizeString(raw.source, "") || null,
      confidence: normalizeString(raw.confidence, "unknown"),
    };
  }
  if (typeof value === "string" && value.trim()) {
    return { value: value.trim(), source: "model", confidence: "partial" };
  }
  return { value: "unknown", source: null, confidence: "unknown" };
}

function isKnownFieldValue(value: FieldValue | undefined | null) {
  if (!value) return false;
  const text = normalizeString(value.value, "").toLowerCase();
  return Boolean(
    text && !["unknown", "not specified", "n/a", "none", "null"].includes(text),
  );
}

function fieldText(value: FieldValue | undefined | null) {
  return isKnownFieldValue(value) ? normalizeString(value?.value, "") : "";
}

function hasKnownRequirement(draft: EasyHarnessDraft, keys: string[]) {
  return keys.some((key) => isKnownFieldValue(draft.known_requirements[key]));
}

function hasQuantityBasis(draft: EasyHarnessDraft) {
  return hasKnownRequirement(draft, [
    "quantity",
    "qty",
    "pieces",
    "piece_count",
    "order_quantity",
  ]);
}

function hasLengthOrScaleBasis(draft: EasyHarnessDraft) {
  return hasKnownRequirement(draft, [
    "length",
    "estimated_length",
    "approximate_length",
    "full_length",
    "cable_length",
    "harness_length",
    "scale",
    "dimensions",
  ]);
}

function hasUseOrEnvironmentBasis(draft: EasyHarnessDraft) {
  if (
    hasKnownRequirement(draft, [
      "environment",
      "use_environment",
      "use_case",
      "application",
      "application_type",
      "equipment",
      "device",
      "usage",
      "purpose",
      "voltage",
      "current",
      "power",
    ])
  )
    return true;
  return false;
}

function hasVoltageBasis(draft: EasyHarnessDraft) {
  return hasKnownRequirement(draft, ["voltage", "volts", "v_rating"]);
}

function hasCurrentOrPowerBasis(draft: EasyHarnessDraft) {
  return hasKnownRequirement(draft, [
    "current",
    "max_current",
    "maximum_current",
    "power",
    "wattage",
    "load",
    "amp",
    "amps",
    "a_rating",
  ]);
}

function addUnknownOnce(target: UnknownItem[], field: string, reason: string, question?: string) {
  if (!field || !reason) return;
  if (target.some((item) => item.field === field || item.reason === reason)) return;
  target.push({ field, reason, question });
}

function isMeaningfulDraftText(value: unknown) {
  const text = normalizeString(value, "");
  const lower = text.toLowerCase();
  if (
    !text ||
    [
      "unknown",
      "not specified",
      "n/a",
      "none",
      "tbd",
      "harness request",
      "customer wiring harness request",
      "customer request basis",
      "source",
      "target",
      "other end",
      "endpoint",
    ].includes(lower)
  )
    return false;
  if (
    /\b(connection goal|source|target|other end)\b.{0,60}\b(missing|needed|unknown|not stated|to confirm)\b/i.test(
      text,
    ) ||
    /^define what\b.{0,100}\b(connects?|copies|replaces)\b/i.test(text)
  )
    return false;
  return true;
}

function supportedRequirementMapEndpoints(draft: EasyHarnessDraft) {
  return draft.requirement_map.endpoints.filter((endpoint) => {
    const status = normalizeString(endpoint.status, "").toLowerCase();
    const role = normalizeString(endpoint.role, "").toLowerCase();
    return (
      isMeaningfulDraftText(endpoint.label) &&
      !/\b(unknown|missing|unclear|tbd|confirm)\b/.test(status) &&
      !/\bunknown\b/.test(role)
    );
  });
}

function hasSupportedConnectionGroup(draft: EasyHarnessDraft) {
  const endpointIds = new Set(
    supportedRequirementMapEndpoints(draft).map((endpoint) => endpoint.id),
  );
  return draft.requirement_map.connection_groups.some((group) => {
    const status = normalizeString(group.status, "").toLowerCase();
    return (
      endpointIds.has(group.from) &&
      endpointIds.has(group.to) &&
      group.from !== group.to &&
      !/\b(unknown|missing)\b/.test(status)
    );
  });
}

function hasSampleOrReferenceCopyBasis(draft: EasyHarnessDraft) {
  const intentType = normalizeString(draft.user_intent.intent_type, "").toLowerCase();
  const hasMeaningfulGoal = [
    draft.user_intent.connection_goal,
    draft.requirement_map.connection_goal,
  ].some(isMeaningfulDraftText);
  return (
    ["copy_old_harness", "replacement"].includes(intentType) &&
    hasMeaningfulGoal &&
    draft.provided_evidence.length > 0
  );
}

function hasKnownTargetBasis(draft: EasyHarnessDraft) {
  if (isKnownFieldValue(draft.known_requirements.connector_end_b)) return true;
  if (isKnownFieldValue(draft.known_requirements.end_b_connector)) return true;
  if (isKnownFieldValue(draft.known_requirements.end_b_type)) return true;
  if (draft.user_intent.to_side.some(isMeaningfulDraftText)) return true;
  return supportedRequirementMapEndpoints(draft).some((endpoint) =>
    /\b(target|branch_end|auxiliary)\b/i.test(endpoint.role),
  );
}

function hasConnectionGoalBasis(draft: EasyHarnessDraft) {
  if (hasSampleOrReferenceCopyBasis(draft)) return true;
  const hasMeaningfulGoal = [
    draft.user_intent.connection_goal,
    draft.requirement_map.connection_goal,
  ].some(isMeaningfulDraftText);
  if (!hasMeaningfulGoal) return false;
  return (
    hasKnownTargetBasis(draft) ||
    supportedRequirementMapEndpoints(draft).length >= 2 ||
    hasSupportedConnectionGroup(draft)
  );
}

function setNeedsQuestionDraftState(
  draft: EasyHarnessDraft,
  status: DraftStatus,
  reason: string,
  questions: UnknownItem[],
  messageType: EasyHarnessDraft["draft_closure"]["customer_message_type"],
) {
  const selected = questions.slice(0, 3);
  return {
    ...draft,
    draft_meta: {
      ...draft.draft_meta,
      draft_status: status,
      draft_maturity_level: Math.min(
        Number(draft.draft_meta.draft_maturity_level || 2),
        status === "needs_harness_context" ? 1 : 2,
      ),
    },
    unknowns: {
      ...draft.unknowns,
      ask_user_now: selected,
      ask_user_if_likely_known: [],
    },
    user_facing_summary: {
      ...draft.user_facing_summary,
      needed_next: selected.map((item) => item.question || item.reason || item.field),
      next_step:
        status === "needs_harness_context"
          ? "Add the connection goal so Easy Harness can prepare the Draft."
          : "Reply with the missing basics, or mark them unknown.",
    },
    draft_closure: {
      ...draft.draft_closure,
      can_close_user_draft: false,
      closure_status: status,
      closure_reason: reason,
      next_action: "ask_user",
      questions_to_ask: selected.map((item) => item.question || item.reason || item.field),
      customer_message_type: messageType,
    },
  };
}

function applyDraftClosureGuards(draft: EasyHarnessDraft): EasyHarnessDraft {
  if (draft.draft_meta.draft_status === "not_harness_related") return draft;

  if (!hasConnectionGoalBasis(draft)) {
    const question: UnknownItem = {
      field: "connection_goal",
      reason:
        "The current evidence does not yet support a clear connection, copy, or replacement goal.",
      question: "What should this harness or cable connect, copy, or replace?",
    };
    return setNeedsQuestionDraftState(
      {
        ...draft,
        user_intent: {
          ...draft.user_intent,
          connection_goal: "",
          intent_confidence: "vague",
        },
      },
      "needs_harness_context",
      "Easy Harness received the available material, but the evidence does not yet support a clear connection goal.",
      [question],
      "needs_harness_context",
    );
  }

  return draft;
}

function customerQuestionLabel(item: UnknownItem | string) {
  if (typeof item === "string") return normalizeString(item, "");
  return normalizeString(item.question || item.reason || item.field, "");
}

function questionField(question: string) {
  const text = question.toLowerCase();
  if (
    /\bquantity|how many\b/.test(text) &&
    /\blength|measurement|sample that can be measured\b/.test(text)
  )
    return "quantity_and_length";
  if (/\b(other end|opposite end|connect to what|connect, copy, or replace|connection goal)\b/.test(text))
    return "connection_goal_or_other_end";
  if (/\bquantity|how many\b/.test(text)) return "quantity";
  if (/\blength|measurement|sample that can be measured\b/.test(text))
    return "length_or_measurement_basis";
  if (/\bcurrent|power|voltage\b/.test(text)) return "voltage_current_or_power";
  if (/\bpin|shield|spare|wire colors?|termination\b/.test(text))
    return "pin_population_or_termination";
  if (/\bused|equipment|environment\b/.test(text)) return "use_context";
  return "draft_blocking_detail";
}

function canonicalQuestionField(value: string) {
  const field = normalizeString(value, "").toLowerCase().replace(/[\s-]+/g, "_");
  if (/^(qty|quantity|pieces|piece_count|order_quantity)$/.test(field))
    return "quantity";
  if (
    /^(length|overall_length|harness_length|estimated_length|approximate_length|length_or_measurement_basis)$/.test(
      field,
    )
  )
    return "length_or_measurement_basis";
  if (/^(quantity_and_length|length_and_quantity)$/.test(field))
    return "quantity_and_length";
  if (/^(connection_goal|request_scope|connection_goal_or_other_end)$/.test(field))
    return "connection_goal_or_other_end";
  if (/^(other_end|target|end_b|connector_end_b)$/.test(field))
    return "other_end";
  if (/^(use_context|environment|application|use_case)$/.test(field))
    return "use_context";
  if (/^(voltage|current|power|current_or_power|voltage_current_or_power)$/.test(field))
    return "voltage_current_or_power";
  return questionField(value);
}

function questionFieldIsKnown(draft: EasyHarnessDraft, field: string) {
  if (field === "quantity") return hasQuantityBasis(draft);
  if (field === "length_or_measurement_basis") return hasLengthOrScaleBasis(draft);
  if (field === "quantity_and_length")
    return hasQuantityBasis(draft) && hasLengthOrScaleBasis(draft);
  if (field === "connection_goal_or_other_end")
    return hasConnectionGoalBasis(draft);
  if (field === "other_end") return hasKnownTargetBasis(draft);
  if (field === "use_context") return hasUseOrEnvironmentBasis(draft);
  if (field === "voltage_current_or_power")
    return hasVoltageBasis(draft) && hasCurrentOrPowerBasis(draft);
  return false;
}

function resolvedQuestionLabel(
  draft: EasyHarnessDraft,
  question: string,
  field: string,
) {
  if (field !== "quantity_and_length") {
    return questionFieldIsKnown(draft, field) ? "" : question;
  }
  const hasQuantity = hasQuantityBasis(draft);
  const hasLength = hasLengthOrScaleBasis(draft);
  if (hasQuantity && hasLength) return "";
  if (hasQuantity)
    return "What approximate length or measurement basis should Easy Harness use, if known?";
  if (hasLength) return "What quantity is needed, if known?";
  return question;
}

function customerQuestionSet(draft: EasyHarnessDraft, limit = 3) {
  const rawQuestions: Array<{ question: string; field: string }> = [
    ...draft.unknowns.ask_user_now.map((item) => ({
      question: customerQuestionLabel(item),
      field: canonicalQuestionField(item.field || customerQuestionLabel(item)),
    })),
    ...draft.draft_closure.questions_to_ask.map((question) => ({
      question,
      field: canonicalQuestionField(question),
    })),
    ...draft.user_facing_summary.needed_next.map((question) => ({
      question,
      field: canonicalQuestionField(question),
    })),
  ];
  const output: string[] = [];
  const seen = new Set<string>();
  const seenFields = new Set<string>();
  for (const raw of rawQuestions) {
    const question = resolvedQuestionLabel(
      draft,
      normalizeString(raw.question, ""),
      raw.field,
    );
    const key = question.toLowerCase();
    const field = canonicalQuestionField(raw.field || question);
    const overlapsCombinedField =
      field === "quantity_and_length"
        ? seenFields.has("quantity") || seenFields.has("length_or_measurement_basis")
        : ["quantity", "length_or_measurement_basis"].includes(field) &&
          seenFields.has("quantity_and_length");
    if (
      !question ||
      seen.has(key) ||
      overlapsCombinedField ||
      (field !== "draft_blocking_detail" && seenFields.has(field))
    )
      continue;
    seen.add(key);
    seenFields.add(field);
    if (field === "quantity_and_length") {
      seenFields.add("quantity");
      seenFields.add("length_or_measurement_basis");
    }
    output.push(question);
    if (output.length >= limit) break;
  }
  if (
    !output.length &&
    draft.draft_meta.draft_status === "needs_harness_context"
  ) {
    output.push("What should this harness or cable connect, copy, or replace?");
  }
  return output;
}

function questionItemFor(draft: EasyHarnessDraft, question: string): UnknownItem {
  const existing = [
    ...draft.unknowns.ask_user_now,
    ...draft.unknowns.ask_user_if_likely_known,
  ].find((item) => customerQuestionLabel(item).toLowerCase() === question.toLowerCase());
  if (existing) return { ...existing, question };
  return {
    field: canonicalQuestionField(question),
    reason: "This detail is needed before Easy Harness can prepare the Draft.",
    question,
  };
}

function finalizeCustomerQuestions(draft: EasyHarnessDraft): EasyHarnessDraft {
  if (
    draft.draft_closure.can_close_user_draft ||
    draft.draft_meta.draft_status === "ready_for_easy_harness_review" ||
    draft.draft_meta.draft_status === "closed_for_easy_harness_review" ||
    draft.draft_meta.draft_status === "not_harness_related"
  ) {
    return {
      ...draft,
      user_facing_summary: { ...draft.user_facing_summary, needed_next: [] },
      draft_closure: { ...draft.draft_closure, questions_to_ask: [] },
    };
  }

  const questions = customerQuestionSet(draft, 3);
  const questionItems = questions.map((question) => questionItemFor(draft, question));
  return {
    ...draft,
    unknowns: {
      ...draft.unknowns,
      ask_user_now: questionItems,
    },
    user_facing_summary: {
      ...draft.user_facing_summary,
      needed_next: questions,
    },
    draft_closure: {
      ...draft.draft_closure,
      questions_to_ask: questions,
    },
  };
}

function applyGenericReviewBoundaries(draft: EasyHarnessDraft): EasyHarnessDraft {
  if (!draft.provided_evidence.some((item) => item.needs_review)) return draft;
  const easyHarnessReview = [...draft.unknowns.easy_harness_review];
  addUnknownOnce(
    easyHarnessReview,
    "attachment_evidence_review",
    "Review the supplied files and observations before relying on unresolved file details.",
  );
  return {
    ...draft,
    unknowns: {
      ...draft.unknowns,
      easy_harness_review: easyHarnessReview,
    },
  };
}

function enforceDraftReadiness(draft: EasyHarnessDraft): EasyHarnessDraft {
  const claimedReady =
    draft.draft_closure.can_close_user_draft ||
    draft.draft_meta.draft_status === "ready_for_easy_harness_review" ||
    draft.draft_meta.draft_status === "closed_for_easy_harness_review";
  if (!claimedReady) return draft;

  const questions = customerQuestionSet(draft, 3);
  if (!questions.length) return draft;
  const askNow = questions.map((question) => questionItemFor(draft, question));

  return {
    ...draft,
    draft_meta: {
      ...draft.draft_meta,
      draft_status: "needs_key_clarification",
      draft_maturity_level: Math.min(
        Number(draft.draft_meta.draft_maturity_level || 2),
        2,
      ),
    },
    unknowns: {
      ...draft.unknowns,
      ask_user_now: askNow,
    },
    user_facing_summary: {
      ...draft.user_facing_summary,
      needed_next: questions,
      next_step: "Reply with the requested clarification, or mark it unknown.",
    },
    draft_closure: {
      ...draft.draft_closure,
      can_close_user_draft: false,
      closure_status: "needs_key_clarification",
      closure_reason:
        "The connection goal is understood, but the Agent marked a customer clarification as blocking Draft closure.",
      next_action: "ask_user",
      questions_to_ask: questions,
      customer_message_type: "ask_key_details",
    },
  };
}

function normalizeKnownRequirements(
  value: unknown,
): Record<string, FieldValue> {
  if (!value || typeof value !== "object") return {};
  const output: Record<string, FieldValue> = {};
  for (const [key, rawValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    output[key] = normalizeFieldValue(rawValue);
  }
  return output;
}

function normalizeArrayObjects(
  value: unknown,
  limit = 12,
): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .slice(0, limit) as Array<Record<string, unknown>>;
}

function normalizeRequirementMapValue(value: unknown): RequirementMap {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const endpointIds = new Map<string, string>();
  const usedEndpointIds = new Set<string>();
  const endpoints = normalizeArrayObjects(raw.endpoints, 10)
    .map((item, index) => {
      const label = normalizeString(item.label, "");
      if (!label) return null;
      const rawId = normalizeString(item.id, "") || `endpoint_${index + 1}`;
      const baseId = slugId(rawId || label, `endpoint_${index + 1}`);
      let id = baseId;
      let suffix = 2;
      while (usedEndpointIds.has(id)) {
        id = `${baseId}_${suffix}`;
        suffix += 1;
      }
      usedEndpointIds.add(id);
      endpointIds.set(rawId, id);
      endpointIds.set(slugId(rawId, rawId), id);
      return {
        id,
        label,
        role: normalizeString(item.role, "endpoint"),
        known_from: normalizeString(item.known_from, "Easy Harness Draft"),
        status: normalizeString(item.status, "partial"),
        evidence_refs: normalizeList(item.evidence_refs, 8),
      };
    })
    .filter(Boolean) as RequirementMapEndpoint[];
  const endpointId = (value: unknown) => {
    const rawId = normalizeString(value, "");
    if (!rawId) return "";
    return endpointIds.get(rawId) || endpointIds.get(slugId(rawId, rawId)) || "";
  };
  const sections = normalizeArrayObjects(raw.harness_sections, 8)
    .map((item, index) => {
      const label =
        normalizeString(item.label, "") || normalizeString(item.type, "");
      if (!label) return null;
      return {
        id: slugId(normalizeString(item.id, "") || label, `section_${index + 1}`),
        label,
        type: normalizeString(item.type, "route_section"),
        length_basis: normalizeString(item.length_basis, ""),
        route_basis: normalizeString(item.route_basis, ""),
        status: normalizeString(item.status, "partial"),
      };
    })
    .filter(Boolean) as RequirementMapSection[];
  const groups = normalizeArrayObjects(raw.connection_groups, 12)
    .map((item, index) => {
      if (endpoints.length < 2) return null;
      const from = endpointId(item.from);
      const to = endpointId(item.to);
      if (!from || !to || from === to) return null;
      return {
        id: slugId(
          normalizeString(item.id, "") ||
            normalizeString(item.label, "") ||
            `connection_group_${index + 1}`,
          `connection_group_${index + 1}`,
        ),
        label: normalizeString(item.label, "Harness connection"),
        from,
        to,
        function: normalizeString(item.function, "draft connection"),
        known_signals: normalizeList(item.known_signals, 12),
        status: normalizeString(item.status, "partial"),
        evidence_refs: normalizeList(item.evidence_refs, 8),
        review_needed: normalizeList(item.review_needed, 8),
      };
    })
    .filter(Boolean) as RequirementMapConnectionGroup[];
  const openItems = normalizeArrayObjects(raw.open_items, 8)
    .map((item) => {
      const question =
        normalizeString(item.item, "") ||
        normalizeString(item.question, "") ||
        normalizeString(item.reason, "");
      if (!question) return null;
      return {
        item: question,
        owner: normalizeString(item.owner, "customer_or_easy_harness"),
        why_it_matters: normalizeString(
          item.why_it_matters,
          "This affects Draft clarity or Easy Harness review.",
        ),
        blocks_review:
          typeof item.blocks_review === "boolean" ? item.blocks_review : false,
      };
    })
    .filter(Boolean) as RequirementMapOpenItem[];
  const evidenceRefs = normalizeArrayObjects(raw.evidence_refs, 12)
    .map((item) => {
      const source = normalizeString(item.source, "");
      if (!source) return null;
      return {
        source,
        supports: normalizeString(item.supports, "Draft evidence"),
        boundary: normalizeString(
          item.boundary,
          "Customer-provided Draft evidence.",
        ),
      };
    })
    .filter(Boolean) as RequirementMapEvidenceRef[];
  return {
    schema_version: "easy_harness_requirement_map_v0_1",
    connection_goal: normalizeString(raw.connection_goal, ""),
    endpoints,
    harness_sections: sections,
    connection_groups: groups,
    known_facts: normalizeList(raw.known_facts, 12),
    open_items: openItems,
    easy_harness_review_items: normalizeList(
      raw.easy_harness_review_items,
      10,
    ),
    evidence_refs: evidenceRefs,
  };
}

function normalizeDraft(
  value: Record<string, unknown>,
  provider = "deepseek",
  model = "deepseek-v4-pro",
  trigger = "manual",
): EasyHarnessDraft {
  const meta =
    value.draft_meta && typeof value.draft_meta === "object"
      ? (value.draft_meta as Record<string, unknown>)
      : {};
  const closure =
    value.draft_closure && typeof value.draft_closure === "object"
      ? (value.draft_closure as Record<string, unknown>)
      : {};
  const validStatuses: DraftStatus[] = [
    "not_harness_related",
    "needs_harness_context",
    "needs_key_clarification",
    "ready_for_easy_harness_review",
    "closed_for_easy_harness_review",
  ];
  const rawClosureStatus = normalizeString(
    closure.closure_status || meta.draft_status,
    "needs_harness_context",
  ) as DraftStatus;
  const closureStatus = validStatuses.includes(rawClosureStatus)
    ? rawClosureStatus
    : "needs_harness_context";
  const canClose =
    typeof closure.can_close_user_draft === "boolean"
      ? closure.can_close_user_draft
      : closureStatus === "ready_for_easy_harness_review" ||
        closureStatus === "closed_for_easy_harness_review";
  const questions = normalizeList(closure.questions_to_ask, 3);
  const messageType = [
    "needs_harness_context",
    "ask_key_details",
    "ready_for_review",
    "not_harness_related",
  ].includes(normalizeString(closure.customer_message_type))
    ? normalizeString(closure.customer_message_type)
    : closureStatus === "not_harness_related"
      ? "not_harness_related"
      : closureStatus === "needs_harness_context"
        ? "needs_harness_context"
        : canClose
          ? "ready_for_review"
          : "ask_key_details";
  const intent =
    value.user_intent && typeof value.user_intent === "object"
      ? (value.user_intent as Record<string, unknown>)
      : {};
  const summary =
    value.user_facing_summary && typeof value.user_facing_summary === "object"
      ? (value.user_facing_summary as Record<string, unknown>)
      : {};
  const ai =
    value.ai_interpretation && typeof value.ai_interpretation === "object"
      ? (value.ai_interpretation as Record<string, unknown>)
      : {};
  const prof =
    value.captured_professional_details &&
    typeof value.captured_professional_details === "object"
      ? (value.captured_professional_details as Record<string, unknown>)
      : {};
  const unknowns =
    value.unknowns && typeof value.unknowns === "object"
      ? (value.unknowns as Record<string, unknown>)
      : {};

  const requestLine = normalizeString(
    summary.request_line,
    normalizeString(intent.connection_goal, "Harness request"),
  );
  const neededNext = canClose ? [] : normalizeList(summary.needed_next, 3);
  const closureQuestions = canClose ? [] : questions.length ? questions : neededNext;

  const draft: EasyHarnessDraft = {
    schema_version: schemaVersion,
    draft_meta: {
      draft_status: closureStatus,
      draft_maturity_level: Number(
        meta.draft_maturity_level ||
          (canClose
            ? 3
            : closureStatus === "needs_key_clarification"
              ? 2
              : closureStatus === "needs_harness_context"
                ? 1
                : 0),
      ),
      last_updated_reason: normalizeString(meta.last_updated_reason, trigger),
      provider,
      model,
    },
    user_intent: {
      intent_type: normalizeString(intent.intent_type, "unknown"),
      connection_goal: normalizeString(intent.connection_goal, ""),
      from_side: normalizeString(intent.from_side, "unknown"),
      to_side: normalizeList(intent.to_side, 8),
      desired_outcome: normalizeString(intent.desired_outcome, ""),
      intent_confidence: normalizeString(
        intent.intent_confidence,
        closureStatus === "needs_harness_context" ? "vague" : "partial",
      ),
    },
    provided_evidence: Array.isArray(value.provided_evidence)
      ? (value.provided_evidence as Array<Record<string, unknown>>)
          .map((item) => ({
            type: normalizeString(item.type, "unknown"),
            filename: normalizeString(item.filename, "") || undefined,
            content_summary:
              normalizeString(item.content_summary, "") || undefined,
            relevance: normalizeString(item.relevance, "unclear"),
            what_it_may_show: normalizeString(item.what_it_may_show, ""),
            used_in_draft:
              typeof item.used_in_draft === "boolean"
                ? item.used_in_draft
                : false,
            needs_review:
              typeof item.needs_review === "boolean" ? item.needs_review : true,
          }))
          .slice(0, 20)
      : [],
    known_requirements: normalizeKnownRequirements(value.known_requirements),
    captured_professional_details: {
      connectors: normalizeArrayObjects(prof.connectors),
      terminals: normalizeArrayObjects(prof.terminals),
      wire_gauge: prof.wire_gauge ? normalizeFieldValue(prof.wire_gauge) : null,
      pinout: normalizeArrayObjects(prof.pinout, 30),
      materials: normalizeArrayObjects(prof.materials),
      shielding: prof.shielding ? normalizeFieldValue(prof.shielding) : null,
      testing_requirements: normalizeArrayObjects(prof.testing_requirements),
    },
    ai_interpretation: {
      short_understanding: normalizeString(ai.short_understanding, requestLine),
      likely_harness_type: normalizeString(ai.likely_harness_type, "unknown"),
      likely_use: normalizeString(ai.likely_use, "unknown"),
      complexity_estimate: normalizeString(ai.complexity_estimate, "unknown"),
      do_not_assume: normalizeList(ai.do_not_assume, 12),
    },
    unknowns: {
      ask_user_now: normalizeUnknownList(unknowns.ask_user_now, 6),
      ask_user_if_likely_known: normalizeUnknownList(
        unknowns.ask_user_if_likely_known,
        6,
      ),
      easy_harness_review: normalizeUnknownList(
        unknowns.easy_harness_review,
        10,
      ),
      later_supplier_or_engineering_confirmation: normalizeUnknownList(
        unknowns.later_supplier_or_engineering_confirmation,
        10,
      ),
      not_applicable: normalizeUnknownList(unknowns.not_applicable, 10),
    },
    risk_flags: normalizeArrayObjects(value.risk_flags, 12).map((item) => ({
      type: normalizeString(item.type, "risk"),
      severity: normalizeString(item.severity, "medium"),
      description: normalizeString(item.description, ""),
      needs_user_question:
        typeof item.needs_user_question === "boolean"
          ? item.needs_user_question
          : false,
      review_owner: normalizeString(item.review_owner, "easy_harness"),
    })),
    user_facing_summary: {
      request_line: requestLine,
      compact_details: normalizeList(summary.compact_details, 6),
      what_we_have: normalizeList(summary.what_we_have, 6),
      needed_next: neededNext,
      next_step: normalizeString(
        summary.next_step,
        canClose
          ? "Easy Harness will review the files and remaining technical details."
          : "Reply with what you know. Unknown items can be reviewed later.",
      ),
    },
    requirement_map: normalizeRequirementMapValue(value.requirement_map),
    draft_closure: {
      can_close_user_draft: canClose,
      closure_status: closureStatus,
      closure_reason: normalizeString(
        closure.closure_reason,
        "Draft state normalized by Easy Harness.",
      ),
      next_action: normalizeString(
        closure.next_action,
        canClose ? "easy_harness_review" : "ask_user",
      ),
      questions_to_ask: closureQuestions.slice(0, 3),
      customer_message_type: messageType,
    },
  };
  const guarded = applyDraftClosureGuards(applyGenericReviewBoundaries(draft));
  return finalizeCustomerQuestions(
    enforceDraftReadiness(guarded),
  );
}

function legacyStatusFor(draft: EasyHarnessDraft) {
  if (
    draft.draft_meta.draft_status === "ready_for_easy_harness_review" ||
    draft.draft_meta.draft_status === "closed_for_easy_harness_review"
  )
    return "accepted";
  if (draft.draft_meta.draft_status === "not_harness_related")
    return "rejected";
  return "needs_info";
}

function legacyReadinessFor(draft: EasyHarnessDraft) {
  const status = legacyStatusFor(draft);
  if (status === "accepted") return "ready_for_admin_review";
  if (status === "rejected") return "not_supported";
  return "needs_clarification";
}

function requestStatusFor(draft: EasyHarnessDraft) {
  if (
    draft.draft_meta.draft_status === "ready_for_easy_harness_review" ||
    draft.draft_meta.draft_status === "closed_for_easy_harness_review"
  )
    return "in_review";
  if (draft.draft_meta.draft_status === "not_harness_related")
    return "not_supported";
  return "needs_info";
}

function checkReasonFor(draft: EasyHarnessDraft) {
  if (draft.draft_closure.can_close_user_draft)
    return "The user-side draft is clear enough for Easy Harness review.";
  if (draft.draft_meta.draft_status === "not_harness_related")
    return "The submission does not contain a clear harness-related connection request.";
  if (draft.draft_meta.draft_status === "needs_harness_context")
    return "The request needs a basic connection goal before a draft can close.";
  return "The request needs a few high-value details before Easy Harness review.";
}

function flattenUnknownsForLegacy(draft: EasyHarnessDraft) {
  const primary = [
    ...draft.unknowns.ask_user_now,
    ...draft.unknowns.ask_user_if_likely_known,
  ]
    .map((item) => item.question || item.field || item.reason)
    .filter(Boolean);
  return primary.length
    ? primary.slice(0, 6)
    : draft.user_facing_summary.needed_next.slice(0, 6);
}

function buildFactoryDraftLegacy(draft: EasyHarnessDraft) {
  const req = draft.known_requirements || {};
  const field = (key: string) =>
    req[key]?.value && req[key]?.value !== "unknown" ? req[key].value : "";
  return {
    project_title: draft.user_facing_summary.request_line || "Harness request",
    connection_goal:
      draft.user_intent.connection_goal ||
      draft.user_facing_summary.request_line ||
      "",
    connection_objects: [
      draft.user_intent.from_side,
      ...draft.user_intent.to_side,
    ].filter((item) => item && item !== "unknown"),
    application_type:
      draft.ai_interpretation.likely_use ||
      field("application_type") ||
      "unknown",
    quantity: field("quantity") || field("qty") || field("piece_count"),
    estimated_length:
      field("estimated_length") || field("harness_length") || field("length") || field("cable_length"),
    environment: field("environment") || field("environmental") || field("use_environment"),
    connector_notes:
      draft.unknowns.easy_harness_review.find((item) =>
        item.field.includes("connector"),
      )?.reason || "",
    wire_notes:
      draft.unknowns.later_supplier_or_engineering_confirmation.find((item) =>
        item.field.includes("wire"),
      )?.reason || "",
    manufacturing_notes: draft.draft_closure.closure_reason,
  };
}

function slugId(value: string, fallback: string) {
  const id = normalizeString(value, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return id || fallback;
}

function requirementMapEndpoint(
  label: string,
  role: string,
  index: number,
  knownFrom = "Easy Harness Draft",
  status = "identified",
): RequirementMapEndpoint {
  return {
    id: slugId(label, `endpoint_${index + 1}`),
    label,
    role,
    known_from: knownFrom,
    status,
    evidence_refs: [],
  };
}

function requirementMapOpenItem(
  item: UnknownItem,
  blocksReview: boolean,
): RequirementMapOpenItem {
  return {
    item: item.question || item.reason || item.field,
    owner: "customer",
    why_it_matters: item.reason || "This affects Draft closure or review confidence.",
    blocks_review: blocksReview,
  };
}

function buildDeterministicRequirementMap(draft: EasyHarnessDraft): RequirementMap {
  const endpoints: RequirementMapEndpoint[] = [];
  const connectorForEnd = (end: string) => {
    const item = draft.captured_professional_details.connectors.find(
      (connector) =>
        normalizeString(connector.end, "").toLowerCase() === end.toLowerCase(),
    );
    return item
      ? normalizeString(
          item.value || item.part_number || item.label || item.type,
          "",
        )
      : "";
  };
  const statedFromSide = normalizeString(draft.user_intent.from_side, "");
  const fromSide =
    statedFromSide && statedFromSide !== "unknown"
      ? statedFromSide
      : fieldText(draft.known_requirements.connector_end_a) ||
        fieldText(draft.known_requirements.end_a_connector) ||
        connectorForEnd("A");
  if (fromSide && fromSide !== "unknown") {
    endpoints.push(requirementMapEndpoint(fromSide, "source", endpoints.length));
  }
  for (const side of draft.user_intent.to_side) {
    const label = normalizeString(side, "");
    if (!label || /\bunknown|other end|target to confirm|not stated\b/i.test(label)) {
      continue;
    }
    endpoints.push(
      requirementMapEndpoint(
        label,
        "target",
        endpoints.length,
        "Easy Harness Draft",
        "identified",
      ),
    );
  }
  if (endpoints.length < 2) {
    const endB =
      fieldText(draft.known_requirements.connector_end_b) ||
      fieldText(draft.known_requirements.end_b_connector) ||
      fieldText(draft.known_requirements.end_b_type) ||
      connectorForEnd("B");
    if (endB) {
      endpoints.push(requirementMapEndpoint(endB, "target", endpoints.length));
    }
  }

  const sections: RequirementMapSection[] = [];
  const length =
    fieldText(draft.known_requirements.harness_length) ||
    fieldText(draft.known_requirements.overall_length) ||
    fieldText(draft.known_requirements.overall_length_mm) ||
    fieldText(draft.known_requirements.length) ||
    fieldText(draft.known_requirements.estimated_length);
  if (length) {
    sections.push({
      id: "length_basis",
      label: `Length basis: ${length}`,
      type: "length_basis",
      length_basis: length,
      route_basis: "Customer-provided requirement",
      status: "provided",
    });
  }
  const environment =
    fieldText(draft.known_requirements.environment) ||
    fieldText(draft.known_requirements.application_type) ||
    fieldText(draft.known_requirements.use_case);
  if (environment) {
    sections.push({
      id: "use_context",
      label: environment,
      type: "application_context",
      length_basis: "",
      route_basis: "Customer-provided context",
      status: "provided",
    });
  }
  const evidenceRefs = draft.provided_evidence.map((item) => {
    const source =
      item.filename ||
      (/\b(conversation|customer)[_\s-]*text\b/i.test(item.type || "")
        ? "Your written instructions"
        : item.content_summary || "Customer-provided material");
    return {
      source,
      supports: item.what_it_may_show || item.content_summary || "Draft evidence",
      boundary: item.needs_review
        ? "Use as draft evidence until Easy Harness confirms the details."
        : "Customer-provided draft evidence.",
    };
  });

  return {
    schema_version: "easy_harness_requirement_map_v0_1",
    connection_goal:
      draft.user_intent.connection_goal ||
      draft.user_facing_summary.request_line ||
      "Customer wiring harness request",
    endpoints,
    harness_sections: sections,
    // Deterministic code may preserve structured endpoints, but it must not
    // invent semantic connections that the model did not support.
    connection_groups: [],
    known_facts: [
      ...draft.user_facing_summary.what_we_have,
      ...draft.user_facing_summary.compact_details,
    ].filter(Boolean).slice(0, 10),
    open_items: [
      ...draft.unknowns.ask_user_now.map((item) =>
        requirementMapOpenItem(item, true)
      ),
      ...draft.unknowns.ask_user_if_likely_known.map((item) =>
        requirementMapOpenItem(item, false)
      ),
    ].slice(0, 8),
    easy_harness_review_items: draft.unknowns.easy_harness_review
      .map((item) => item.reason || item.field)
      .filter(Boolean)
      .slice(0, 8),
    evidence_refs: evidenceRefs.slice(0, 10),
  };
}

function uniqueRequirementMapStrings(...lists: string[][]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of lists.flat()) {
    const value = normalizeString(item, "");
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

function buildRequirementMap(draft: EasyHarnessDraft): RequirementMap {
  const fallback = buildDeterministicRequirementMap(draft);
  const interpreted = draft.requirement_map;
  if (
    draft.draft_meta.draft_status === "needs_harness_context" ||
    !hasConnectionGoalBasis(draft)
  ) {
    return {
      ...fallback,
      endpoints: [],
      connection_groups: [],
    };
  }
  const interpretedEndpoints = supportedRequirementMapEndpoints(draft);
  const hasInterpretedTopology =
    interpretedEndpoints.length >= 2 &&
    interpreted.connection_groups.length > 0;
  if (!hasInterpretedTopology) return fallback;

  const endpointIds = new Set(interpretedEndpoints.map((endpoint) => endpoint.id));
  const interpretedGroups = interpreted.connection_groups.filter(
    (group) =>
      endpointIds.has(group.from) &&
      endpointIds.has(group.to) &&
      group.from !== group.to,
  );
  if (!interpretedGroups.length) return fallback;

  return {
    schema_version: "easy_harness_requirement_map_v0_1",
    connection_goal: interpreted.connection_goal || fallback.connection_goal,
    endpoints: interpretedEndpoints,
    harness_sections: interpreted.harness_sections.length
      ? interpreted.harness_sections
      : fallback.harness_sections,
    connection_groups: interpretedGroups,
    known_facts: uniqueRequirementMapStrings(
      interpreted.known_facts,
      fallback.known_facts,
    ).slice(0, 12),
    // Closure guards and semantic question dedupe own the customer-facing open items.
    open_items: fallback.open_items,
    easy_harness_review_items: uniqueRequirementMapStrings(
      interpreted.easy_harness_review_items,
      fallback.easy_harness_review_items,
    ).slice(0, 10),
    // File evidence and boundaries come from the verified attachment layer.
    evidence_refs: fallback.evidence_refs,
  };
}

function buildCheckResult(
  draft: EasyHarnessDraft,
  extra: Record<string, unknown>,
) {
  const legacyStatus = legacyStatusFor(draft);
  const questions = draft.draft_closure.questions_to_ask.slice(0, 3);
  const missing = flattenUnknownsForLegacy(draft);
  return {
    ...draft,
    ...extra,
    adapter: adapterId,
    status: legacyStatus,
    readiness: legacyReadinessFor(draft),
    intake_stage: draft.draft_meta.draft_status,
    can_prepare_draft: ![
      "not_harness_related",
      "needs_harness_context",
    ].includes(draft.draft_meta.draft_status),
    customer_message_type: draft.draft_closure.customer_message_type,
    requirement_map: buildRequirementMap(draft),
    customer_summary:
      draft.ai_interpretation.short_understanding ||
      draft.user_facing_summary.request_line,
    confirmed_facts: draft.user_facing_summary.what_we_have,
    assumptions: draft.ai_interpretation.do_not_assume.map(
      (item) => `Do not assume: ${item}`,
    ),
    missing_information: missing,
    missing,
    questions_for_user: questions,
    questions,
    attachments_reviewed: draft.provided_evidence
      .map((item) =>
        [item.filename, item.what_it_may_show].filter(Boolean).join(": "),
      )
      .filter(Boolean),
    factory_draft: buildFactoryDraftLegacy(draft),
    admin_notes: draft.unknowns.easy_harness_review.map(
      (item) => item.reason || item.field,
    ),
    risk_flags: draft.risk_flags.map((item) => item.description || item.type),
  };
}

function buildCustomerMessage(draft: EasyHarnessDraft) {
  const line =
    draft.user_facing_summary.request_line || draft.user_intent.connection_goal;
  const details = draft.user_facing_summary.compact_details
    .filter(Boolean)
    .join(" · ");
  const header = [line, details].filter(Boolean).join("\n");
  const messageType = draft.draft_closure.customer_message_type;
  const questions = customerQuestionSet(draft, 3);
  const evidenceFilenames = draft.provided_evidence
    .map((item) => item.filename || "")
    .filter(Boolean);
  const evidenceIntro = evidenceFilenames.length
    ? "I received the uploaded files and will use the supported observations as request evidence."
    : "";

  if (messageType === "not_harness_related") {
    return [
      "This file or message does not provide enough harness-related information yet.",
      "Please upload connector-end photos, device port photos, an old harness sample, or describe what needs to connect.",
    ].join("\n\n");
  }

  if (messageType === "needs_harness_context") {
    if (evidenceIntro) {
      return [
        evidenceIntro,
        "Before Easy Harness can prepare the request basis, please add:",
        ...questions.map((question, index) => `${index + 1}. ${question}`),
        "Approximate answers are fine. If one item is uncertain, say so.",
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    return [
      "I can help, but I need one starting point first:",
      questions[0] || "What should this harness or cable connect, copy, or replace?",
      "You can also upload connector photos, device port photos, an old harness sample, or a simple sketch.",
    ].join("\n\n");
  }

  if (messageType === "ready_for_review") {
    return [
      "Your upload package is organized for Easy Harness review.",
      header || "Harness request",
      "Easy Harness will review the remaining selection, file details, and feasibility from here.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    header || "Harness request",
    "To make the uploaded package easier to review:",
    ...questions
      .slice(0, 3)
      .map((question, index) => `${index + 1}. ${question}`),
    "Approximate answers are fine. If one item is uncertain, say so.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function fieldValueLabel(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") {
    const label = value.trim();
    return ["", "unknown", "not specified", "n/a", "none", "null"].includes(
      label.toLowerCase(),
    )
      ? ""
      : label;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return fieldValueLabel(
      normalizeString(record.value, "") || normalizeString(record.label, ""),
    );
  }
  return String(value);
}

function canonicalKnownDetailKey(key: string) {
  const normalized = key.toLowerCase();
  if (/^(qty|quantity|pieces|piece_count|order_quantity)$/.test(normalized))
    return "quantity";
  if (
    /^(overall_length_mm|overall_length|harness_length|length|estimated_length|approximate_length|full_length|cable_length)$/.test(
      normalized,
    )
  )
    return "overall_length";
  if (/^(end_a_lead_length_mm|end_a_lead_length)$/.test(normalized))
    return "end_a_lead_length";
  if (/^(end_b_lead_length_mm|end_b_lead_length)$/.test(normalized))
    return "end_b_lead_length";
  if (/^(connector_end_a|end_a_connector)$/.test(normalized))
    return "end_a_connector";
  if (/^(connector_end_b|end_b_connector)$/.test(normalized))
    return "end_b_connector";
  return normalized;
}

function knownDetailLabels(draft: EasyHarnessDraft) {
  const details: string[] = [];
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(draft.known_requirements)) {
    const label = fieldValueLabel(value);
    const canonicalKey = canonicalKnownDetailKey(key);
    if (!label || seen.has(canonicalKey)) continue;
    seen.add(canonicalKey);
    details.push(`${canonicalKey.replaceAll("_", " ")}: ${label}`);
    if (details.length >= 8) break;
  }
  return details;
}

function unknownLabel(item: UnknownItem) {
  return item.question || item.field || item.reason || "Review item";
}

function draftReviewItems(draft: EasyHarnessDraft) {
  return [
    ...draft.unknowns.easy_harness_review.map(unknownLabel),
    ...draft.unknowns.later_supplier_or_engineering_confirmation.map(unknownLabel),
  ]
    .filter(Boolean)
    .slice(0, 8);
}

function buildMessageBlocks(draft: EasyHarnessDraft, customerMessage: string, requestRow: RequestRow) {
  const blocks: Array<Record<string, unknown>> = [
    { type: "text", text: customerMessage },
  ];
  if (draft.draft_meta.draft_status !== "not_harness_related") {
    const summaryStatus = draft.draft_closure.can_close_user_draft
      ? "Ready for Easy Harness review"
      : draft.draft_meta.draft_status === "needs_harness_context"
        ? "Connection goal needed"
        : "Draft needs a few details";
    blocks.push({
      type: "draft_summary",
      draftId: `${requestRow.request_number}-D1`,
      title:
        draft.user_facing_summary.request_line ||
        draft.user_intent.connection_goal ||
        requestRow.title ||
        "Harness request",
      status: summaryStatus,
      compactDetails: draft.user_facing_summary.compact_details,
      connectionGoal: draft.user_intent.connection_goal,
      intentType: draft.user_intent.intent_type,
      fromSide: draft.user_intent.from_side,
      toSide: draft.user_intent.to_side,
      requirementMap: buildRequirementMap(draft),
      knownDetails: knownDetailLabels(draft),
      files: draft.provided_evidence
        .map((item) => item.filename)
        .filter(Boolean),
      reviewItems: draftReviewItems(draft),
    });
  }
  return blocks;
}


async function createSignedAttachmentImageUrls(
  supabase: ReturnType<typeof createClient>,
  attachments: Array<AttachmentRow & { storage?: StorageRow }>,
) {
  const enabled = attachmentVisionEnabled();
  const maxImages = envNumber("AI_DRAFT_MAX_VISION_IMAGES", 4, 0, 12);
  const ttlSeconds = envNumber("AI_DRAFT_SIGNED_URL_TTL_SECONDS", 600, 60, 1800);
  const images: DraftVisionImage[] = [];
  const diagnostics: DraftVisionDiagnostics = {
    attachment_vision_enabled: enabled,
    vision_max_images: maxImages,
    image_attachment_count: 0,
    vision_not_image_count: 0,
    vision_missing_storage_count: 0,
    vision_storage_not_ready_count: 0,
    vision_signed_url_failed_count: 0,
    vision_skipped_after_limit_count: 0,
  };

  if (!enabled) return { images, diagnostics } as DraftVisionSelection;

  for (const attachment of attachments) {
    if (!isImageAttachment(attachment)) {
      diagnostics.vision_not_image_count += 1;
      continue;
    }
    diagnostics.image_attachment_count += 1;
    if (images.length >= maxImages) {
      diagnostics.vision_skipped_after_limit_count += 1;
      continue;
    }
    const storage = attachment.storage;
    if (!storage?.bucket || !storage.object_path) {
      diagnostics.vision_missing_storage_count += 1;
      continue;
    }
    if (!["uploaded", "available"].includes(storage.status || "")) {
      diagnostics.vision_storage_not_ready_count += 1;
      continue;
    }

    const { data, error } = await supabase.storage
      .from(storage.bucket)
      .createSignedUrl(storage.object_path, ttlSeconds);

    if (error || !data?.signedUrl) {
      diagnostics.vision_signed_url_failed_count += 1;
      continue;
    }
    images.push({
      filename: attachment.name,
      mime_type:
        attachment.mime_type ||
        storage.content_type ||
        "application/octet-stream",
      signed_url: data.signedUrl,
    });
  }

  return { images, diagnostics };
}

async function buildAttachmentObservations(
  supabase: ReturnType<typeof createClient>,
  attachments: Array<AttachmentRow & { storage?: StorageRow }>,
  visualImages: DraftVisionImage[],
) {
  const visualFilenames = new Set(visualImages.map((image) => image.filename));
  const maxTextBytes = envNumber("AI_DRAFT_TEXT_ATTACHMENT_MAX_BYTES", 200000, 0, 1000000);
  const maxStructuredBytes = envNumber(
    "AI_DRAFT_STRUCTURED_ATTACHMENT_MAX_BYTES",
    2000000,
    0,
    5000000,
  );
  const maxQwenExtractBytes = envNumber(
    "AI_DRAFT_QWEN_FILE_EXTRACT_MAX_BYTES",
    10000000,
    0,
    50000000,
  );
  const maxQwenExtractFiles = envNumber(
    "AI_DRAFT_QWEN_FILE_EXTRACT_MAX_FILES",
    4,
    0,
    12,
  );
  const maxCadMetadataBytes = envNumber(
    "AI_DRAFT_CAD_METADATA_MAX_BYTES",
    10000000,
    0,
    50000000,
  );
  const observations: AttachmentObservation[] = [];
  let qwenExtractedCount = 0;

  for (const attachment of attachments) {
    const storage = attachment.storage;
    const base = {
      filename: attachment.name,
      mime_type:
        attachment.mime_type ||
        storage?.content_type ||
        "application/octet-stream",
    };

    if (visualFilenames.has(attachment.name)) {
      observations.push({
        ...base,
        parser: "qwen_vision_image",
        status: "vision_sent_to_model",
        evidence_kind: "vision_model_input",
        summary:
          "Image was sent to Qwen as a vision input for request understanding.",
        confidence: "model_observation",
      });
      continue;
    }

    if (!storage?.bucket || !storage.object_path) {
      observations.push({
        ...base,
        parser: "storage_unavailable",
        status: "storage_unavailable",
        evidence_kind: "metadata_with_pending_parser",
        summary:
          "Attachment metadata exists, but no storage object path is available for parsing.",
        confidence: "metadata_only",
      });
      continue;
    }

    if (!["uploaded", "available"].includes(storage.status || "")) {
      observations.push({
        ...base,
        parser: "storage_unavailable",
        status: "storage_unavailable",
        evidence_kind: "metadata_with_pending_parser",
        summary: `Attachment storage status is ${storage.status || "unknown"}; parsing did not run.`,
        confidence: "metadata_only",
      });
      continue;
    }

    const sizeBytes = Number(attachment.size_bytes || storage.size_bytes || 0);
    let cachedBlob: Blob | null = null;
    let cachedBytes: Uint8Array | null = null;
    const downloadBlob = async () => {
      if (cachedBlob) return cachedBlob;
      const { data, error } = await supabase.storage
        .from(storage.bucket)
        .download(storage.object_path);
      if (error || !data) return null;
      cachedBlob = data;
      return cachedBlob;
    };
    const downloadBytes = async () => {
      if (cachedBytes) return cachedBytes;
      const blob = await downloadBlob();
      if (!blob) return null;
      cachedBytes = new Uint8Array(await blob.arrayBuffer());
      return cachedBytes;
    };
    const canUseQwenFileExtract =
      qwenFileExtractEnabled() &&
      qwenExtractedCount < maxQwenExtractFiles &&
      sizeBytes <= maxQwenExtractBytes &&
      isQwenFileExtractCandidate(attachment);
    const preferLocalTextParser =
      isPlainTextAttachment(attachment) || isCsvAttachment(attachment);

    if (canUseQwenFileExtract && !preferLocalTextParser) {
      try {
        const bytes = await downloadBytes();
        if (bytes) {
          const observation = await buildQwenFileExtractObservation(
            attachment,
            bytes,
          );
          observations.push(observation);
          qwenExtractedCount += 1;
          continue;
        }
      } catch (error) {
        logCheckingEvent("file_extract_failed", {
          filename: attachment.name,
          mime_type: attachment.mime_type || storage.content_type || "",
          error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown Qwen file-extract error",
        });
      }
    }

    if (
      (isPlainTextAttachment(attachment) || isCsvAttachment(attachment)) &&
      sizeBytes <= maxTextBytes
    ) {
      const data = await downloadBlob();
      if (data) {
        const rawText = await data.text();
        const text = compactText(rawText);
        const rows = isCsvAttachment(attachment)
          ? parseDelimitedRows(rawText)
          : [];
        const table = rows.length
          ? tableSummary(rows, "attachment_csv", attachment.name)
          : null;
        observations.push({
          ...base,
          parser: isCsvAttachment(attachment) ? "csv_excerpt" : "text_excerpt",
          status: "text_extracted",
          evidence_kind: "parsed_text",
          summary: text
            ? rows.length
              ? "CSV/text content was extracted as table evidence for Draft intake."
              : "Text content was extracted for Draft intake."
            : "Text parser ran but no readable text was extracted.",
          text_excerpt: text,
          structured_facts: [
            ...extractTextFacts(text),
            ...extractTableFacts(rows, "attachment_csv"),
          ].slice(0, 80),
          tables: table ? [table] : [],
          confidence: "parsed",
        });
        continue;
      }
    }

    if (isPdfAttachment(attachment) && sizeBytes <= maxStructuredBytes) {
      const bytes = await downloadBytes();
      if (bytes) {
        const text = extractPdfTextProbe(bytes);
        if (text) {
          observations.push({
            ...base,
            parser: "pdf_text_probe",
            status: "text_extracted",
            evidence_kind: "parsed_text",
            summary:
              "Readable PDF text was extracted with a lightweight text probe for Draft intake.",
            text_excerpt: text,
            structured_facts: extractTextFacts(text),
            confidence: "parsed",
          });
          continue;
        }
      }
    }

    if (isSpreadsheetAttachment(attachment) && sizeBytes <= maxStructuredBytes) {
      const bytes = await downloadBytes();
      if (bytes) {
        try {
          const parsed = await extractXlsxTables(bytes);
          if (parsed.tables.length || parsed.text) {
            observations.push({
              ...base,
              parser: "xlsx_table_probe",
              status: "text_extracted",
              evidence_kind: "parsed_text",
              summary:
                "Spreadsheet rows were extracted as table evidence for Draft intake.",
              text_excerpt: parsed.text,
              structured_facts: [
                ...extractTextFacts(parsed.text),
                ...parsed.facts,
              ].slice(0, 100),
              tables: parsed.tables,
              confidence: "parsed",
            });
            continue;
          }
        } catch (_error) {
          // Fall through to parser_needed; the file still remains available for Easy Harness review.
        }
      }
    }

    if (canUseQwenFileExtract && preferLocalTextParser) {
      try {
        const bytes = await downloadBytes();
        if (bytes) {
          const observation = await buildQwenFileExtractObservation(
            attachment,
            bytes,
          );
          observations.push(observation);
          qwenExtractedCount += 1;
          continue;
        }
      } catch (error) {
        logCheckingEvent("file_extract_failed", {
          filename: attachment.name,
          mime_type: attachment.mime_type || storage.content_type || "",
          error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown Qwen file-extract error",
        });
      }
    }

    if (isCadAttachment(attachment) && sizeBytes <= maxCadMetadataBytes) {
      const bytes = await downloadBytes();
      if (bytes) {
        const cad = extractCadMetadata(bytes, attachment);
        if (cad) {
          observations.push({
            ...base,
            parser: "cad_metadata_probe",
            status: "metadata_extracted",
            evidence_kind: "cad_metadata",
            summary: cad.summary,
            text_excerpt: cad.text,
            structured_facts: cad.facts,
            confidence: "parsed",
          });
          continue;
        }
      }
    }

    observations.push({
      ...base,
      parser: "parser_needed",
      status: "parser_needed",
      evidence_kind: "metadata_with_pending_parser",
      summary: `${fileExtractParserNeededLabel(attachment)} is needed before Easy Harness can rely on this file's contents.`,
      confidence: "metadata_only",
    });
  }

  return observations;
}

function summarizeRequestForModel(
  requestRow: RequestRow,
  messages: MessageRow[],
  attachments: Array<AttachmentRow & { storage?: StorageRow }>,
  visualImages: DraftVisionImage[] = [],
  attachmentObservations: AttachmentObservation[] = [],
) {
  const visualFilenames = new Set(visualImages.map((image) => image.filename));
  const observationByFilename = new Map(
    attachmentObservations.map((item) => [item.filename, item]),
  );
  return JSON.stringify(
    {
      request: {
        id: requestRow.request_number,
        title: requestRow.title,
        current_status: requestRow.status,
        customer_summary: requestRow.customer_summary,
        previous_check_result: requestRow.check_result || {},
      },
      conversation: messages.map((message) => ({
        role: roleLabel(message.author_role),
        created_at: message.created_at,
        text: textFromBlocks(message.blocks, message.body),
      })),
      attachment_observation_context: {
        qwen_vision_enabled: attachmentVisionEnabled(),
        qwen_file_extract_enabled: qwenFileExtractEnabled(),
        image_count_sent_to_model: visualImages.length,
        image_files_sent_to_model: visualImages.map((image) => image.filename),
        boundary: visualImages.length
          ? "Selected image attachments are provided to the draft model as image_url inputs. These images may be used only as model-visible visual observations with partial confidence unless the customer text confirms the same detail. Non-image files may be used only when attachment_observations contains parsed text, Qwen file-extract observations, CAD metadata, tables, or structured facts."
          : "No image pixels are provided to the draft model. Files may be used only when attachment_observations contains parsed text, Qwen file-extract observations, CAD metadata, tables, or structured facts.",
      },
      attachment_observations: attachmentObservations,
      attachments: attachments.map((attachment) => ({
        name: attachment.name,
        mime_type: attachment.mime_type,
        size_bytes: attachment.size_bytes,
        purpose: attachment.purpose,
        storage_status: attachment.storage?.status || "metadata_only",
        model_input:
          visualFilenames.has(attachment.name) && attachmentVisionEnabled()
            ? "image_url_sent_to_qwen"
            : ["file_extracted", "text_extracted", "metadata_extracted"].includes(
                observationByFilename.get(attachment.name)?.status || "",
              )
              ? "attachment_observation_sent_to_draft_agent"
            : "metadata_only",
        evidence_boundary:
          visualFilenames.has(attachment.name) && attachmentVisionEnabled()
            ? "This image is visible to the Qwen draft model. Treat visual details as model observations, not confirmed manufacturing facts."
            : ["file_extracted", "text_extracted", "metadata_extracted"].includes(
                observationByFilename.get(attachment.name)?.status || "",
              )
              ? "This file contributed structured attachment_observations for the Draft Agent. Treat extracted details as model/parsed/CAD metadata observations, not confirmed manufacturing facts."
              : "This intake run receives attachment metadata for this file only. It does not receive reliable image pixels, PDF text, spreadsheet rows, CAD geometry, OCR, or visual observations for this file unless structured observations appear explicitly in the request context.",
      })),
    },
    null,
    2,
  );
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("The draft model returned an empty result.");
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

function selectedDraftProvider() {
  const requested = (Deno.env.get("AI_DRAFT_PROVIDER") || "").toLowerCase();
  if (requested === "qwen" || requested === "deepseek") return requested;
  if (Deno.env.get("QWEN_API_KEY")) return "qwen";
  return "deepseek";
}

function draftModelMissingEnv() {
  const baseMissing = requiredEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const provider = selectedDraftProvider();
  if (provider === "qwen")
    return [...baseMissing, ...requiredEnv(["QWEN_API_KEY"])];
  if (provider === "deepseek")
    return [...baseMissing, ...requiredEnv(["DEEPSEEK_API_KEY"])];
  return baseMissing;
}

function draftModelConfig() {
  const provider = selectedDraftProvider();
  if (provider === "qwen") {
    return {
      provider,
      apiKey: Deno.env.get("QWEN_API_KEY") || "",
      baseUrl: (
        Deno.env.get("QWEN_BASE_URL") ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1"
      ).replace(/\/$/, ""),
      model: Deno.env.get("QWEN_MODEL") || "qwen3.6-plus",
      reasoningEffort: Deno.env.get("QWEN_REASONING_EFFORT") || "provider_default",
      maxTokens: Number(Deno.env.get("QWEN_MAX_TOKENS") || "12000"),
    };
  }
  return {
    provider,
    apiKey: Deno.env.get("DEEPSEEK_API_KEY") || "",
    baseUrl: (
      Deno.env.get("DEEPSEEK_BASE_URL") || "https://api.deepseek.com"
    ).replace(/\/$/, ""),
    model: Deno.env.get("DEEPSEEK_MODEL") || "deepseek-v4-pro",
    reasoningEffort: Deno.env.get("DEEPSEEK_REASONING_EFFORT") || "max",
    maxTokens: Number(Deno.env.get("DEEPSEEK_MAX_TOKENS") || "12000"),
  };
}

type DraftModelProviderConfig = ReturnType<typeof draftModelConfig>;

function uploadAssistantProviderOptions(provider: string) {
  return provider === "qwen" ? { enable_thinking: false } : {};
}

function draftModelUserContent(
  provider: string,
  inputText: string,
  visualImages: DraftVisionImage[] = [],
) {
  return provider === "qwen" && visualImages.length
    ? [
        {
          type: "text",
          text: inputText,
        },
        ...visualImages.map((image) => ({
          type: "image_url",
          image_url: { url: image.signed_url },
        })),
      ]
    : inputText;
}

async function callDraftJsonCompletion(
  config: DraftModelProviderConfig,
  system: string,
  userContent: string | Array<Record<string, unknown>>,
  timeoutMs = providerRequestTimeoutMs(),
) {
  const { provider, apiKey, baseUrl, model, reasoningEffort, maxTokens } =
    config;
  const response = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: maxTokens,
        ...(provider === "deepseek"
          ? {
              thinking: {
                type: "enabled",
                reasoning_effort: reasoningEffort === "high" ? "high" : "max",
              },
            }
          : {}),
        ...(provider === "qwen"
          ? {}
          : { response_format: { type: "json_object" } }),
        messages: [
          {
            role: "system",
            content: system,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    },
    timeoutMs,
    `${provider} draft request`,
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `${provider} request failed (${response.status}): ${raw.slice(0, 1200)}`,
    );
  }

  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${provider} returned an empty draft result.`);
  return {
    parsed: JSON.parse(extractJsonObject(content)) as Record<string, unknown>,
    usage: data?.usage || null,
  };
}

async function callDraftTextCompletion(
  config: DraftModelProviderConfig,
  system: string,
  userContent: string | Array<Record<string, unknown>>,
  timeoutMs = providerRequestTimeoutMs(),
  requestLabel = `${config.provider} text request`,
) {
  const { provider, apiKey, baseUrl, model, maxTokens } = config;
  const response = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: maxTokens,
        temperature: 0,
        ...uploadAssistantProviderOptions(provider),
        messages: [
          {
            role: "system",
            content: system,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    },
    timeoutMs,
    requestLabel,
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `${provider} request failed (${response.status}): ${raw.slice(0, 1200)}`,
    );
  }

  const data = JSON.parse(raw);
  const content = normalizePreviewString(data?.choices?.[0]?.message?.content);
  if (!content) throw new Error(`${provider} returned an empty text result.`);
  return {
    text: content,
    usage: data?.usage || null,
  };
}

function draftEvidenceAuditEnabled() {
  return envFlagDefault("AI_DRAFT_ENABLE_EVIDENCE_AUDIT", true);
}

function buildEvidenceAuditPrompt(
  inputText: string,
  candidate: EasyHarnessDraft,
  visualImages: DraftVisionImage[] = [],
) {
  return [
    "Audit and revise the candidate Easy Harness Draft v0.1 against the supplied evidence.",
    "Return one corrected JSON object with the same Easy Harness Draft v0.1 schema shape. Do not return commentary.",
    "This pass protects evidence honesty, Draft closure, and customer trust. Do not make the draft more complete by inventing missing details.",
    "The Draft is meant to be useful for Easy Harness review and supplier/manufacturing follow-up, but it is not a final BOM, quote, cut list, crimp spec, or production package.",
    "Keep an endpoint only when customer text, a model-visible image, or a parsed attachment_observation explicitly supports that distinct object as part of the connection, copy, replacement, or adaptation goal.",
    "A connector name, filename, file type, pin table, application, use case, environment, industry, voltage context, or generic request label is not by itself a second endpoint.",
    "Keep a requirement_map.connection_group only when both endpoints and their relationship are evidence-supported.",
    "Keep route, length, quantity, environment, power/current, connector, pinout, and shield details when supplied. If they are useful but not customer-blocking, keep them in known_requirements, captured_professional_details, or Easy Harness review instead of asking again.",
    "Filename-only and received-only materials may be acknowledged as received evidence, but cannot support claims about their internal contents.",
    "customer-facing questions must contain only true Draft blockers: answers required to represent honestly what connects, copies, replaces, or adapts, or to avoid a materially wrong supplier-review package.",
    "Do not ask the customer again for information already present in the latest customer instruction, known_requirements, provided_evidence, captured_professional_details, or supported requirement_map.",
    "Move quote refinements, connector identification from photos/samples, electrical validation, crimp details, shielding method, wire gauge validation, test method, and final manufacturing decisions to Easy Harness review unless the customer explicitly made them part of the request scope and their absence prevents an honest Draft.",
    "If no evidence-supported topology remains, keep any explicitly supplied standalone facts, empty unsupported topology, set the draft to needs_harness_context, and ask exactly one connection-goal question.",
    "If evidence-supported topology remains and there are no true Draft blockers, set the draft to ready_for_easy_harness_review, clear ask_user_now and questions_to_ask, and keep supplier/manufacturing work under Easy Harness review or later confirmation.",
    "If a short customer reply is needed, ask no more than three questions. Prefer one or two. The questions should be stable across turns and should not repeat already supplied information.",
    "Preserve every supplied file as received evidence. Preserve the latest explicit customer instruction over older or conflicting evidence.",
    visualImages.length
      ? "The same image inputs are visible in this audit pass. Treat visual observations as model observations with partial confidence unless customer text or parsed observations corroborate them."
      : "No image pixels are visible in this audit pass. Do not preserve visual claims unless they are present in text or attachment_observations.",
    "",
    "Original request model input:",
    inputText,
    "",
    "Candidate Draft JSON:",
    JSON.stringify(candidate),
  ].join("\n");
}

async function callDraftModel(
  inputText: string,
  trigger = "manual",
  visualImages: DraftVisionImage[] = [],
) {
  const { provider, apiKey, baseUrl, model, reasoningEffort, maxTokens } =
    draftModelConfig();
  const config = { provider, apiKey, baseUrl, model, reasoningEffort, maxTokens };
  const startedAt = Date.now();
  const jobBudgetMs = draftJobBudgetMs();
  const remainingBudgetMs = () =>
    Math.max(0, jobBudgetMs - (Date.now() - startedAt));

  const jsonShape = JSON.stringify(draftSchema, null, 2);
  const visualEvidenceInstruction = visualImages.length
    ? "Evidence boundary: this intake run includes conversation text, attachment metadata, selected image files as model-visible image_url inputs, and attachment_observations. You may use image observations and parsed attachment observations, but mark them as partial/model/parsed evidence unless corroborated by customer text. Do not claim PDF, Excel, CAD, hidden label, pinout, or document contents unless those details are explicitly present in text or attachment_observations."
    : "Evidence boundary: this intake run receives conversation text, attachment metadata, and any parser-produced attachment_observations. Do not claim to visually identify connector models, pinouts, wire colors, labels, drawings, CAD geometry, or document contents from attachments unless those details are explicitly present in text or attachment_observations.";

  const system = [
    "You are Easy Harness Upload Assistant.",
    "Your job is to help a professional customer upload the right harness materials and turn the supplied package into a concise request basis for Easy Harness review.",
    "You are a small assistant inside the upload flow, not the main product, not a general chatbot, not a sales assistant, and not a traditional factory questionnaire.",
    "The request basis closes at Ready for Easy Harness Review. This means the uploaded materials and customer notes are clear enough for Easy Harness review, quote-path evaluation, and supplier/manufacturing follow-up. It does NOT mean final BOM, supplier RFQ, automatic quote, material confirmation, or production readiness.",
    "Core promise: Upload what you have. We'll build the harness you need. This means accept useful drawings, CAD, pinouts, spreadsheets, PDFs, photos, quote packages, and customer notes, then structure them without fake certainty.",
    "The customer may already be a professional with complete drawings. If the uploaded package is coherent, do not slow them down with unnecessary questions.",
    "First decide what the user already provided, what the user likely knows and must answer now, what Easy Harness can evaluate from files/photos/samples later, what supplier/manufacturing should confirm later, and what is not applicable.",
    "Do not rename the request based on a single keyword. The request line should come from the customer's actual connection goal and confirmed constraints. If a word like battery appears only in a negative constraint such as 'no battery power', do not turn the draft into a battery harness.",
    "Do not use keyword workflows or case-specific scripts. Words like old harness, battery, sensor, pinout, photo, sample, CAN, or connector are evidence only. They are not instructions to enter a fixed questionnaire or fixed reply path.",
    "Use the whole conversation to judge intent, evidence, missing blockers, and next action. A keyword may support the judgment, but it must not determine the workflow by itself.",
    "Capture all explicit details. If the user provides connector model, connector type, terminal, wire gauge, length, quantity, voltage, current, pinout, material, shielding, environment, IP rating, test requirement, BOM, drawing, or compliance detail, preserve it in known_requirements and/or captured_professional_details.",
    "Before writing the customer summary, organize your understanding into requirement_map. This is the semantic connection plan that can support a customer-facing connection summary; it is not a manufacturing drawing and not a free-form image prompt.",
    "In requirement_map.endpoints, represent distinct devices, boards, connectors, bare-wire ends, samples, or other explicitly supported endpoints separately. Do not create placeholder unknown endpoints, and do not collapse several supported target devices into one generic target.",
    "In requirement_map.connection_groups, describe the meaningful harness branches or functional wire groups between those endpoints. Associate signals only when customer text or attachment_observations supports the association; otherwise keep the group partial or incomplete.",
    "In requirement_map.harness_sections, include route or length sections only when supplied or reasonably organized from evidence. Mark uncertain endpoints, groups, routes, and options as unknown or partial instead of inventing precision.",
    "Do not ask for terminal part numbers, exact wire gauge, strip length, crimp details, connector brand, IPC class, FAI, packaging, test fixture, controlled drawing revision, or factory production details unless they truly block the Draft stage.",
    "Ask at most three customer-facing questions, and prefer one or two. Only ask questions that block Draft closure and that the user is likely to know.",
    "It is acceptable not to close a Draft. If the connection goal is not clear, do not invent a Draft; ask the smallest connection-goal question.",
    "Run a strict evidence-sufficiency gate first. Do not prepare or close a draft unless the available evidence supports what should be connected, copied, replaced, or adapted. A connector name, file type, pin table, image, route note, or generic request by itself is evidence, not a connection goal.",
    "Do not turn an application, use case, environment, or industry context into a device endpoint unless customer text or attachment_observations explicitly states that the harness connects to that object.",
    "Do not create source/target endpoints or connection groups from filenames, file extensions, generic labels, or unsupported inference. If the connection goal is not supported, keep the topology empty or explicitly unknown and ask one connection-goal question.",
    visualEvidenceInstruction,
    visualImages.length
      ? "If photos are sent as image inputs, you may reference clear visible observations cautiously. Never turn visual observations into production facts; connector selection, pinout, wire colors, dimensions, and layout still require Easy Harness review unless the customer text confirms them."
      : "If files are attached but attachment_observations says parser_needed or storage_unavailable, treat them as received evidence for Easy Harness review. Do not phrase review items as if this run already inspected those contents.",
    "Use attachment_observations as the structured file-understanding layer. Observations with status text_extracted, file_extracted, metadata_extracted, or vision_sent_to_model may inform known_requirements, provided_evidence, captured_professional_details, and unknowns. Qwen file-extract observations, CSV rows, spreadsheet tables, PDF text probes, CAD metadata, text excerpts, and structured_facts may be used as parsed/model evidence. Observations with parser_needed or storage_unavailable may only support 'files received' and Easy Harness review items, not file-content claims.",
    "General Draft gate: close the Draft when the evidence-supported connection intent and topology are clear enough for Easy Harness to continue review and supplier/manufacturing follow-up. There is no fixed checklist that every request must satisfy.",
    "A missing detail blocks Draft closure when its absence prevents an honest representation of what connects, copies, replaces, or adapts, or would likely produce a materially wrong supplier-review package. Quote refinements, engineering choices, and manufacturing confirmations normally belong in Easy Harness review, not ask_user_now.",
    "ask_user_now must contain only true Draft blockers. Prefer zero or one blocker question; use two or three only when separate answers are genuinely required to establish request scope. Put useful but nonblocking questions in ask_user_if_likely_known or Easy Harness review.",
    "Quantity, length, environment, connector selection, electrical ratings, and other details are not automatically blocking. Ask only when the specific request cannot be represented honestly or safely without that answer and the customer is likely to know it. Otherwise keep the item visible for Easy Harness review.",
    "Each ask_user_now item must use a stable field name, explain why it blocks this Draft, and have one concise customer question. Never ask for a field that is already present in known_requirements, the supported requirement_map, or the latest customer instruction.",
    "When sources conflict, treat the latest explicit customer instruction as the current basis, preserve older material as superseded/reference evidence, and put unresolved contradictions in Easy Harness review.",
    "Include every supplied file as received evidence, but only claim internal content that is present in customer text, model-visible images, or attachment_observations.",
    "If a draft is ready, user_facing_summary.needed_next must be empty. Put Easy Harness-owned work in easy_harness_review, later production details in later_supplier_or_engineering_confirmation, and irrelevant/not-needed items in not_applicable.",
    "Unknowns must be separated into: ask_user_now, ask_user_if_likely_known, easy_harness_review, later_supplier_or_engineering_confirmation, and not_applicable. Never output vague placeholders like unknown_item or Needs later confirmation.",
    "For ready_for_review, customer-facing content should be a compact Easy Harness request basis: request line, key details, files received, remaining Easy Harness review items, and clear next step. Do not claim price, material, supplier, or production readiness.",
    "Do not mention manual review, human review, or manual processing. Say Easy Harness review or Easy Harness will continue from here.",
    "Show understanding through structure, not repeated claims that you understand. Keep customer-facing output concise and in English.",
    "Return only valid JSON. Do not include Markdown, comments, explanation text, or code fences.",
    "The JSON object must follow this schema shape:",
    jsonShape,
  ].join("\n");

  const generated = await callDraftJsonCompletion(
    config,
    system,
    draftModelUserContent(
      provider,
      `Analyze this Easy Harness upload package and return the request-basis JSON only.\n\n${inputText}`,
      visualImages,
    ),
    Math.min(draftFirstPassTimeoutMs(), remainingBudgetMs()),
  );
  const firstDraft = normalizeDraft(generated.parsed, provider, model, trigger);
  const auditEnabled = draftEvidenceAuditEnabled();
  let evidenceAuditCompleted = false;
  let audited = generated;
  if (auditEnabled) {
    const auditTimeoutMs = Math.min(draftAuditPassTimeoutMs(), remainingBudgetMs());
    if (auditTimeoutMs >= 5000) {
      try {
        audited = await callDraftJsonCompletion(
        config,
        "You are Easy Harness Evidence Audit Agent. Remove unsupported claims and nonblocking customer questions, preserve supplied facts, then output only corrected valid JSON.",
        draftModelUserContent(
          provider,
          buildEvidenceAuditPrompt(inputText, firstDraft, visualImages),
          visualImages,
        ),
          auditTimeoutMs,
        );
        evidenceAuditCompleted = true;
      } catch (error) {
        logCheckingEvent("evidence_audit_skipped", {
          provider,
          model,
          reason:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown evidence audit error",
          remaining_budget_ms: remainingBudgetMs(),
        });
      }
    } else {
      logCheckingEvent("evidence_audit_skipped", {
        provider,
        model,
        reason: "not enough remaining Draft budget",
        remaining_budget_ms: remainingBudgetMs(),
      });
    }
  }
  const finalDraft = evidenceAuditCompleted
    ? normalizeDraft(audited.parsed, provider, model, trigger)
    : firstDraft;

  return {
    model,
    provider,
    reasoningEffort,
    usage: auditEnabled
      ? {
          generation: generated.usage,
          evidence_audit: evidenceAuditCompleted ? audited.usage : null,
        }
      : generated.usage,
    passes: evidenceAuditCompleted ? 2 : 1,
    evidenceAuditEnabled: auditEnabled,
    evidenceAuditCompleted,
    draft: finalDraft,
  };
}

function parsedAttachmentObservationCount(observations: AttachmentObservation[]) {
  return observations.filter((item) =>
    [
      "text_extracted",
      "file_extracted",
      "metadata_extracted",
      "vision_sent_to_model",
    ].includes(
      item.status,
    )
  ).length;
}

function qwenFileExtractObservationCount(observations: AttachmentObservation[]) {
  return observations.filter((item) => item.parser === "qwen_file_extract").length;
}

function cadMetadataObservationCount(observations: AttachmentObservation[]) {
  return observations.filter((item) => item.parser === "cad_metadata_probe").length;
}

function parserNeededObservationCount(observations: AttachmentObservation[]) {
  return observations.filter((item) => item.status === "parser_needed").length;
}

const checkingProgressMessageText =
  "Easy Harness is checking the uploaded package and organizing the request basis. This usually takes less than a minute.";

function isCheckingProgressMessage(body = "") {
  return body.trim() === checkingProgressMessageText;
}

function latestMessageCanReceiveAgentReply(
  message?: {
    id?: string;
    author_role?: string;
    body?: string;
  },
  queuedCustomerMessageId = "",
) {
  if (!message) return false;
  if (
    message.author_role === "customer" &&
    (!queuedCustomerMessageId || message.id === queuedCustomerMessageId)
  ) {
    return true;
  }
  return (
    message.author_role === "easy_harness" &&
    isCheckingProgressMessage(message.body || "")
  );
}

function isRecentCheckingQueue(requestRow: RequestRow, maxAgeMs = 6 * 60 * 1000) {
  const updatedAt = new Date(
    requestRow.updated_at || requestRow.created_at,
  ).getTime();
  return Number.isFinite(updatedAt) && Date.now() - updatedAt < maxAgeMs;
}

async function insertCheckingProgressMessage(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
) {
  const { data: latestRows } = await supabase
    .from("request_messages")
    .select("id,author_role,body,created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1);
  const latestMessage = latestRows?.[0];
  if (!latestMessage || latestMessage.author_role !== "customer") return false;

  const { error } = await supabase.from("request_messages").insert({
    request_id: requestId,
    author_id: null,
    author_role: "easy_harness",
    body: checkingProgressMessageText,
    blocks: [{ type: "text", text: checkingProgressMessageText }],
    visibility: "thread",
  });

  if (error) {
    logCheckingEvent("progress_message_failed", {
      request_id: requestId,
      error: error.message,
    });
    return false;
  }
  return true;
}

async function latestThreadMessage(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
) {
  const { data: latestRows } = await supabase
    .from("request_messages")
    .select("id,author_role,body,created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1);
  return latestRows?.[0];
}

function runCheckingJobInBackground(
  job: Promise<unknown>,
  payload: Record<string, unknown>,
): boolean {
  const guardedJob = job.catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unknown background checking error";
    logCheckingEvent("background_unhandled", {
      ...payload,
      error: message.slice(0, 500),
    });
  });
  try {
    if (
      typeof EdgeRuntime !== "undefined" &&
      typeof EdgeRuntime?.waitUntil === "function"
    ) {
      EdgeRuntime.waitUntil(guardedJob);
      logCheckingEvent("background_registered", payload);
      return true;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown waitUntil error";
    logCheckingEvent("background_register_failed", {
      ...payload,
      error: message.slice(0, 500),
    });
  }
  logCheckingEvent("background_wait_until_unavailable", payload);
  void guardedJob;
  return false;
}

async function markCheckingStillQueued(
  supabase: ReturnType<typeof createClient>,
  requestRow: RequestRow,
  trigger: string,
) {
  await supabase
    .from("requests")
    .update({
      status: "needs_info",
      check_status: "needs_info",
      check_result: {
        status: "needs_info",
        adapter: adapterId,
        reason:
          "Easy Harness received the upload package, but the online organizing step did not finish. Please try again in a moment.",
        missing: ["continue request"],
        questions: ["Please send any short update when you are ready to continue."],
        checkedAt: new Date().toISOString(),
        source: {
          request_id: requestRow.id,
          request_number: requestRow.request_number,
          trigger,
          background_wait_until_available: false,
        },
      },
      customer_summary: requestRow.customer_summary || requestRow.title || "",
    })
    .eq("id", requestRow.id);

  await supabase.from("request_messages").insert({
    request_id: requestRow.id,
    author_id: null,
    author_role: "easy_harness",
    body:
      "Easy Harness received the upload package, but the organizing step did not finish. Please send a short update and Easy Harness will continue.",
    blocks: [
      {
        type: "text",
        text:
          "Easy Harness received the upload package, but the organizing step did not finish. Please send a short update and Easy Harness will continue.",
      },
    ],
    visibility: "thread",
  });
}

async function keepRequestPendingAfterModelFailure(
  supabase: ReturnType<typeof createClient>,
  requestRow: RequestRow,
  trigger: string,
  errorMessage: string,
  modelInputMeta: {
    visualImages: DraftVisionImage[];
    attachmentObservations: AttachmentObservation[];
    visionDiagnostics: DraftVisionDiagnostics;
    qwenFileExtractEnabled: boolean;
  },
) {
  const checkedAt = new Date().toISOString();
  const checkResult = {
    status: "pending",
    adapter: adapterId,
    model: draftModelConfig().model,
    provider: selectedDraftProvider(),
    reason:
      "Easy Harness is still organizing the uploaded package and request basis.",
    checkedAt,
    source: {
      request_id: requestRow.id,
      request_number: requestRow.request_number,
      trigger,
      failure: errorMessage.slice(0, 500),
      ...modelInputMeta.visionDiagnostics,
      qwen_file_extract_enabled: modelInputMeta.qwenFileExtractEnabled,
      image_count_sent_to_model: modelInputMeta.visualImages.length,
      image_files_sent_to_model: modelInputMeta.visualImages.map(
        (image) => image.filename,
      ),
      attachment_observation_count:
        modelInputMeta.attachmentObservations.length,
      parsed_attachment_count: parsedAttachmentObservationCount(
        modelInputMeta.attachmentObservations,
      ),
      qwen_file_extract_count: qwenFileExtractObservationCount(
        modelInputMeta.attachmentObservations,
      ),
      cad_metadata_count: cadMetadataObservationCount(
        modelInputMeta.attachmentObservations,
      ),
      parser_needed_count: parserNeededObservationCount(
        modelInputMeta.attachmentObservations,
      ),
    },
    attachment_observations: modelInputMeta.attachmentObservations,
    agent_runtime: {
      primary_agent_completed: false,
      local_draft_builder_used: false,
      supabase_edge_background_queued: true,
    },
  };

  await supabase
    .from("requests")
    .update({
      status: "checking",
      check_status: "pending",
      check_result: checkResult,
      updated_at: checkedAt,
    })
    .eq("id", requestRow.id);
}

function uploadAssistantPreviewTimeoutMs() {
  return envNumber("AI_UPLOAD_ASSISTANT_PREVIEW_TIMEOUT_MS", 45000, 5000, 90000);
}

function uploadAssistantPingTimeoutMs() {
  return envNumber("AI_UPLOAD_ASSISTANT_PING_TIMEOUT_MS", 30000, 5000, 60000);
}

function uploadAssistantPreviewModelConfig() {
  const config = draftModelConfig();
  return {
    ...config,
    maxTokens: envNumber(
      "AI_UPLOAD_ASSISTANT_PREVIEW_MAX_TOKENS",
      800,
      200,
      2000,
    ),
  };
}

function uploadAssistantPingModelConfig() {
  const config = draftModelConfig();
  return {
    ...config,
    maxTokens: envNumber(
      "AI_UPLOAD_ASSISTANT_PING_MAX_TOKENS",
      64,
      16,
      200,
    ),
  };
}

function previewText(value: unknown, maxLength = 8000) {
  const text = JSON.stringify(value || {}, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
}

function normalizePreviewString(value: unknown, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function normalizePreviewList(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => normalizePreviewString(item))
        .filter(Boolean)
        .slice(0, 4)
    : [];
}

function previewHarnesses(payload: CheckingRequest) {
  const preview = payload.preview || {};
  const harnesses = Array.isArray(preview.harnesses)
    ? preview.harnesses
    : [];
  return harnesses.filter(
    (harness): harness is Record<string, unknown> =>
      harness !== null && typeof harness === "object",
  );
}

function previewFiles(payload: CheckingRequest) {
  return previewHarnesses(payload).flatMap((harness) =>
    Array.isArray(harness.files)
      ? harness.files.filter(
          (file): file is Record<string, unknown> =>
            file !== null && typeof file === "object",
        )
      : [],
  );
}

function previewVisibleText(payload: CheckingRequest) {
  return previewFiles(payload)
    .map((file) => normalizePreviewString(file.visibleTextPreview))
    .filter(Boolean)
    .join("\n");
}

function buildUploadAssistantGuidancePolicy(payload: CheckingRequest) {
  const preview = payload.preview || {};
  const counts =
    preview.counts && typeof preview.counts === "object"
      ? (preview.counts as Record<string, unknown>)
      : {};
  const files = previewFiles(payload);
  const visibleText = previewVisibleText(payload);
  const visibleTextLower = visibleText.toLowerCase();
  const engineeringSources = Number(counts.engineering_sources || 0);
  const supportingReferences = Number(counts.supporting_references || 0);
  const hasVisibleText = Boolean(visibleText.trim());
  const hasCadOrDrawing = files.some((file) =>
    /\.(pdf|dwg|dxf|step|stp|igs|iges|stl)$/i.test(
      normalizePreviewString(file.name || file.extension),
    ),
  );
  const hasStructuredTable = files.some((file) =>
    /\.(csv|tsv|xlsx?|xlsm)$/i.test(
      normalizePreviewString(file.name || file.extension),
    ),
  );
  const hasConnectionClues =
    /branch|device|signal|power|wire|controller|connector|interface|switch|pump|fan|probe|connect|route|trunk|gland|连接|分支|接口|设备|线|走线|控制|传感|开关|泵|风扇|探头/.test(
      visibleTextLower,
    );
  const hasDimensionOrEnvironmentClues =
    /\b\d+(\.\d+)?\s*(mm|cm|m)\b|length|approx|environment|wet|splash|label|尺寸|长度|环境|防水|标签/.test(
      visibleTextLower,
    );

  let posture = "needs_context";
  if (engineeringSources > 0 && hasVisibleText && hasConnectionClues) {
    posture = hasDimensionOrEnvironmentClues
      ? "structured_starting_basis"
      : "source_with_missing_context";
  } else if (engineeringSources > 0 || hasStructuredTable || hasCadOrDrawing) {
    posture = "professional_files_received";
  } else if (!files.length) {
    posture = "no_files_yet";
  } else if (supportingReferences > 0) {
    posture = "supporting_references_only";
  }

  return [
    "Stable upload guidance policy:",
    `- posture: ${posture}`,
    "- If posture is structured_starting_basis, say the package is enough to start initial Easy Harness review, then suggest one high-value optional supplement.",
    "- If professional files are present but their contents are not visible, acknowledge receipt and ask the user to identify the main source file or connection goal.",
    "- If only supporting references or vague natural language are present, suggest either uploading a stronger professional package or using the Canvas configurator.",
    "- Encourage professional materials when relevant: CAD/drawings/PDFs/pinouts/spreadsheets/connector photos are helpful, especially connector face, rear wire exit, dimensions, and installation photos.",
    "- Never present CAD, 3D, exact connector model, wire gauge, BOM, cut list, crimp tooling, or factory test details as mandatory before Easy Harness can start review.",
    "- Keep the answer stable: do not flip between 'enough to start review' and 'cannot review' when the visible text contains connection, branch, route, length, or environment clues.",
  ].join("\n");
}

async function buildUploadAssistantPreview(
  payload: CheckingRequest,
  userId: string,
) {
  const config = uploadAssistantPreviewModelConfig();
  const system = [
    "You are Easy Harness AI Upload Chat.",
    "Help a customer who may not be a harness engineer make their upload package clearer before submission.",
    "Use only the provided form state, file names, file categories, visibleTextPreview snippets, quantities, and notes.",
    "When visibleTextPreview is included, treat it as actual user-provided file text. When it is absent, do not pretend to know the file contents.",
    "Do not use keyword workflows, fixture names, or case-specific scripts; reason from the current upload state.",
    "Do not claim you visually inspected, parsed, OCR-read, or understood hidden file contents.",
    "Do not ask for factory-only details such as crimp tooling, BOM, cut list, terminal sourcing, or manufacturing test methods.",
    "Do not require a drawing, 3D model, exact connector model, wire gauge, or full manufacturing detail just to start Easy Harness review.",
    "CSV, TSV, TXT route notes, photos, sketches, PDFs, CAD, and spreadsheets can all be useful starting materials. Explain what would make the upload clearer, not what blocks all review.",
    "Reply in the same language as the customer's latest message when possible.",
    "Return compact JSON only with keys: reply, suggested_note, quick_checks, risk_level, ask_next.",
    "reply: one or two short, helpful customer-facing sentences.",
    "suggested_note: a concise design note the customer can add to the active harness. Summarize the uploaded basis, known connection/route/quantity clues, and one optional supplement if useful. Do not overclaim hidden file contents.",
    "quick_checks: 2 to 4 short strings.",
    "risk_level: ok, needs_source, or needs_context.",
    "ask_next: one short optional follow-up question.",
  ].join("\n");
  const userContent = [
    buildUploadAssistantGuidancePolicy(payload),
    "",
    "Current upload form state:",
    previewText(payload.preview),
    "",
    "Respond for the right-side upload chat only. Be concise.",
  ].join("\n");

  const generated = await callDraftTextCompletion(
    config,
    system,
    userContent,
    uploadAssistantPreviewTimeoutMs(),
    `${config.provider} upload assistant preview`,
  );
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(extractJsonObject(generated.text));
  } catch {
    parsed = {};
  }
  logCheckingEvent("upload_assistant_preview_completed", {
    user_id: userId,
    provider: config.provider,
    model: config.model,
    usage: generated.usage || null,
  });
  return {
    ok: true,
    mode: "upload_assistant_preview",
    provider: config.provider,
    model: config.model,
    reply: normalizePreviewString(
      parsed.reply,
      generated.text,
    ),
    suggestedNote: normalizePreviewString(
      parsed.suggested_note,
      "",
    ),
    quickChecks: normalizePreviewList(parsed.quick_checks),
    riskLevel: normalizePreviewString(parsed.risk_level, "needs_context"),
    askNext: normalizePreviewString(parsed.ask_next),
  };
}

async function buildUploadAssistantPing(userId: string) {
  const config = uploadAssistantPingModelConfig();
  const startedAt = Date.now();
  const generated = await callDraftTextCompletion(
    config,
    "You are an Easy Harness live AI connection check. Reply with exactly: OK",
    "Reply exactly OK.",
    uploadAssistantPingTimeoutMs(),
    `${config.provider} upload assistant ping`,
  );
  logCheckingEvent("upload_assistant_ping_completed", {
    user_id: userId,
    provider: config.provider,
    model: config.model,
    elapsed_ms: Date.now() - startedAt,
    usage: generated.usage || null,
  });
  return {
    ok: true,
    mode: "upload_assistant_ping",
    provider: config.provider,
    model: config.model,
    reply: normalizePreviewString(
      generated.text,
      "I can help make this upload package clearer before you submit it.",
    ),
    suggestedNote: "",
    quickChecks: [],
    riskLevel: "ok",
    askNext: "",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST")
    return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<CheckingRequest>(request);
  const missing = draftModelMissingEnv();
  if (missing.length)
    return integrationNotConfigured("ai_intake_checking", missing);

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token)
    return jsonResponse({ ok: false, code: "not_authenticated" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } =
    await supabase.auth.getUser(token);
  if (userError || !userData.user)
    return jsonResponse({ ok: false, code: "not_authenticated" }, 401);

  if (payload.mode === "upload_assistant_ping") {
    try {
      const ping = await buildUploadAssistantPing(userData.user.id);
      return jsonResponse(ping);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown upload assistant ping error";
      logCheckingEvent("upload_assistant_ping_failed", {
        user_id: userData.user.id,
        error: message.slice(0, 500),
      });
      return jsonResponse(
        {
          ok: false,
          code: "upload_assistant_ping_failed",
          message,
        },
        502,
      );
    }
  }

  if (payload.mode === "upload_assistant_preview") {
    try {
      const preview = await buildUploadAssistantPreview(
        payload,
        userData.user.id,
      );
      return jsonResponse(preview);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown upload assistant error";
      logCheckingEvent("upload_assistant_preview_failed", {
        user_id: userData.user.id,
        error: message.slice(0, 500),
      });
      return jsonResponse(
        {
          ok: false,
          code: "upload_assistant_preview_failed",
          message,
        },
        502,
      );
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,email,display_name")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!payload.requestId) {
    return jsonResponse(
      {
        ok: false,
        code: "invalid_checking_request",
        message: "requestId is required.",
      },
      400,
    );
  }

  const lookupColumn = isUuidLike(payload.requestId) ? "id" : "request_number";
  let { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select(
      "id,request_number,customer_id,customer_label,title,status,customer_summary,check_status,check_result,files_count,created_at,updated_at",
    )
    .eq(lookupColumn, payload.requestId)
    .maybeSingle();

  if (!requestRow && lookupColumn === "id") {
    const fallback = await supabase
      .from("requests")
      .select(
        "id,request_number,customer_id,customer_label,title,status,customer_summary,check_status,check_result,files_count,created_at,updated_at",
      )
      .eq("request_number", payload.requestId)
      .maybeSingle();
    requestRow = fallback.data;
    requestError = fallback.error;
  }

  if (requestError)
    return jsonResponse(
      {
        ok: false,
        code: "request_lookup_failed",
        message: requestError.message,
      },
      500,
    );
  if (!requestRow)
    return jsonResponse({ ok: false, code: "request_not_found" }, 404);

  const role = profile?.role || "customer";
  const hasAccess =
    requestRow.customer_id === userData.user.id ||
    ["staff", "admin"].includes(role);
  if (!hasAccess) return jsonResponse({ ok: false, code: "forbidden" }, 403);

  if (!supportedStatus.has(requestRow.status) && !payload.force) {
    return jsonResponse(
      {
        ok: false,
        code: "request_state_not_checkable",
        requestId: requestRow.id,
        status: requestRow.status,
        message: "This request is already past intake checking.",
      },
      409,
    );
  }

  const { data: messages, error: messagesError } = await supabase
    .from("request_messages")
    .select("id,author_role,body,blocks,created_at")
    .eq("request_id", requestRow.id)
    .order("created_at", { ascending: true });

  if (messagesError)
    return jsonResponse(
      {
        ok: false,
        code: "messages_lookup_failed",
        message: messagesError.message,
      },
      500,
    );

  const latestMessage = messages?.[messages.length - 1];
  const queuedCustomerMessageId =
    latestMessage?.author_role === "customer" ? latestMessage.id : "";
  if (
    !payload.force &&
    latestMessage &&
    latestMessage.author_role !== "customer" &&
    requestRow.check_status !== "pending"
  ) {
    logCheckingEvent("skipped", {
      request_number: requestRow.request_number,
      reason: "no_new_customer_input",
      latest_role: latestMessage.author_role,
      check_status: requestRow.check_status,
    });
    return jsonResponse({
      ok: true,
      skipped: true,
      code: "no_new_customer_input",
      requestId: requestRow.id,
      requestNumber: requestRow.request_number,
      status: requestRow.status,
      checkStatus: requestRow.check_status,
      checkResult: requestRow.check_result,
    });
  }

  if (
    !payload.force &&
    latestMessage?.author_role === "easy_harness" &&
    isCheckingProgressMessage(latestMessage.body || "") &&
    requestRow.status === "checking" &&
    requestRow.check_status === "pending" &&
    isRecentCheckingQueue(requestRow)
  ) {
    return jsonResponse({
      ok: true,
      queued: true,
      async: true,
      code: "checking_already_queued",
      requestId: requestRow.id,
      requestNumber: requestRow.request_number,
      status: "checking",
      checkStatus: "pending",
      message: "",
    });
  }

  const { data: attachments, error: attachmentsError } = await supabase
    .from("attachments")
    .select("id,name,mime_type,size_bytes,storage_object_id,purpose,created_at")
    .eq("request_id", requestRow.id)
    .order("created_at", { ascending: true });

  if (attachmentsError)
    return jsonResponse(
      {
        ok: false,
        code: "attachments_lookup_failed",
        message: attachmentsError.message,
      },
      500,
    );

  const storageIds = [
    ...new Set(
      (attachments || []).map((item) => item.storage_object_id).filter(Boolean),
    ),
  ] as string[];
  const { data: storageRows } = storageIds.length
    ? await supabase
        .from("storage_objects")
        .select("id,bucket,object_path,status,content_type,size_bytes")
        .in("id", storageIds)
    : { data: [] as StorageRow[] };
  const storageById = new Map(
    (storageRows || []).map((item) => [item.id, item]),
  );
  const attachmentsWithStorage = (attachments || []).map((attachment) => ({
    ...attachment,
    storage: attachment.storage_object_id
      ? storageById.get(attachment.storage_object_id)
      : undefined,
  }));
  const trigger = payload.trigger || "manual";
  const queuedAt = new Date().toISOString();
  const { error: queueError } = await supabase
    .from("requests")
    .update({
      status: "checking",
      check_status: "pending",
      updated_at: queuedAt,
    })
    .eq("id", requestRow.id);

  if (queueError)
    return jsonResponse(
      {
        ok: false,
        code: "checking_queue_failed",
        message: queueError.message,
      },
      500,
    );

  await insertCheckingProgressMessage(supabase, requestRow.id);

  await supabase.from("integration_events").insert({
    adapter: adapterId,
    action: "upload_intake_started",
    target_type: "request",
    target_id: requestRow.id,
    detail: "Easy Harness upload assistant started organizing the request basis.",
    payload: {
      requestNumber: requestRow.request_number,
      trigger,
      runtime: "supabase_edge_function",
    },
  });

  const checkingJob = (async () => {
  const modelInputMeta = {
    attachmentVisionEnabled: attachmentVisionEnabled(),
    qwenFileExtractEnabled: qwenFileExtractEnabled(),
    visualImages: [] as DraftVisionImage[],
    attachmentObservations: [] as AttachmentObservation[],
    visionDiagnostics: {
      attachment_vision_enabled: attachmentVisionEnabled(),
      vision_max_images: envNumber("AI_DRAFT_MAX_VISION_IMAGES", 4, 0, 12),
      image_attachment_count: 0,
      vision_not_image_count: 0,
      vision_missing_storage_count: 0,
      vision_storage_not_ready_count: 0,
      vision_signed_url_failed_count: 0,
      vision_skipped_after_limit_count: 0,
    } as DraftVisionDiagnostics,
  };

  try {
    await supabase
      .from("requests")
      .update({ status: "checking", check_status: "pending" })
      .eq("id", requestRow.id);

    const visionSelection = await createSignedAttachmentImageUrls(
      supabase,
      attachmentsWithStorage,
    );
    modelInputMeta.visualImages = visionSelection.images;
    modelInputMeta.visionDiagnostics = visionSelection.diagnostics;
    modelInputMeta.attachmentObservations = await buildAttachmentObservations(
      supabase,
      attachmentsWithStorage,
      modelInputMeta.visualImages,
    );
    logCheckingEvent("started", {
      request_number: requestRow.request_number,
      trigger: payload.trigger || "manual",
      provider: selectedDraftProvider(),
      attachment_count: attachmentsWithStorage.length,
      ...modelInputMeta.visionDiagnostics,
      qwen_file_extract_enabled: modelInputMeta.qwenFileExtractEnabled,
      image_count_sent_to_model: modelInputMeta.visualImages.length,
      attachment_observation_count:
        modelInputMeta.attachmentObservations.length,
      parsed_attachment_count: parsedAttachmentObservationCount(
        modelInputMeta.attachmentObservations,
      ),
      qwen_file_extract_count: qwenFileExtractObservationCount(
        modelInputMeta.attachmentObservations,
      ),
      cad_metadata_count: cadMetadataObservationCount(
        modelInputMeta.attachmentObservations,
      ),
      parser_needed_count: parserNeededObservationCount(
        modelInputMeta.attachmentObservations,
      ),
    });
    const modelInput = summarizeRequestForModel(
      requestRow,
      messages || [],
      attachmentsWithStorage,
      modelInputMeta.visualImages,
      modelInputMeta.attachmentObservations,
    );
    const modelConfigForLog = draftModelConfig();
    logCheckingEvent("draft_model_started", {
      request_number: requestRow.request_number,
      trigger: payload.trigger || "manual",
      provider: modelConfigForLog.provider,
      model: modelConfigForLog.model,
      platform_wall_clock_ms: platformWallClockMs(),
      provider_timeout_ms: providerRequestTimeoutMs(),
      draft_job_budget_ms: draftJobBudgetMs(),
      first_pass_timeout_ms: draftFirstPassTimeoutMs(),
      audit_pass_timeout_ms: draftAuditPassTimeoutMs(),
    });
    const {
      model,
      provider,
      reasoningEffort,
      usage,
      passes,
      evidenceAuditEnabled,
      evidenceAuditCompleted,
      draft,
    } =
      await callDraftModel(
        modelInput,
        payload.trigger || "manual",
        modelInputMeta.visualImages,
      );
    const checkedAt = new Date().toISOString();
    const nextStatus = requestStatusFor(draft);
    const customerMessage = buildCustomerMessage(draft);
    const messageBlocks = buildMessageBlocks(draft, customerMessage, requestRow);
    const checkResult = buildCheckResult(draft, {
      model,
      provider,
      reasoning_effort: reasoningEffort,
      usage,
      reason: checkReasonFor(draft),
      checkedAt,
        trigger: payload.trigger || "manual",
        version: 1,
        source: {
          request_id: requestRow.id,
        request_number: requestRow.request_number,
        draft_model_passes: passes,
        evidence_audit_enabled: evidenceAuditEnabled,
        evidence_audit_completed: evidenceAuditCompleted,
        message_count: messages?.length || 0,
        attachment_count: attachments?.length || 0,
        ...modelInputMeta.visionDiagnostics,
        qwen_file_extract_enabled: modelInputMeta.qwenFileExtractEnabled,
        image_count_sent_to_model: modelInputMeta.visualImages.length,
        image_files_sent_to_model: modelInputMeta.visualImages.map(
          (image) => image.filename,
        ),
        attachment_observation_count:
          modelInputMeta.attachmentObservations.length,
        parsed_attachment_count: parsedAttachmentObservationCount(
          modelInputMeta.attachmentObservations,
        ),
        qwen_file_extract_count: qwenFileExtractObservationCount(
          modelInputMeta.attachmentObservations,
        ),
        cad_metadata_count: cadMetadataObservationCount(
          modelInputMeta.attachmentObservations,
        ),
        parser_needed_count: parserNeededObservationCount(
          modelInputMeta.attachmentObservations,
        ),
      },
      attachment_observations: modelInputMeta.attachmentObservations,
    });

    const latestBeforeSave = await latestThreadMessage(supabase, requestRow.id);
    if (
      !latestMessageCanReceiveAgentReply(
        latestBeforeSave,
        queuedCustomerMessageId,
      )
    ) {
      logCheckingEvent("superseded", {
        request_number: requestRow.request_number,
        reason: "newer_thread_message_before_primary_save",
        latest_role: latestBeforeSave?.author_role || "",
      });
      return jsonResponse({
        ok: true,
        superseded: true,
        requestId: requestRow.id,
        requestNumber: requestRow.request_number,
        status: requestRow.status,
        checkStatus: requestRow.check_status,
      });
    }

    const { error: updateError } = await supabase
      .from("requests")
      .update({
        status: nextStatus,
        check_status: legacyStatusFor(draft),
        check_result: checkResult,
        customer_summary:
          draft.ai_interpretation.short_understanding ||
          draft.user_facing_summary.request_line ||
          requestRow.customer_summary ||
          "",
      })
      .eq("id", requestRow.id);

    if (updateError)
      throw new Error(`Could not update request: ${updateError.message}`);

    logCheckingEvent("completed", {
      request_number: requestRow.request_number,
      status: nextStatus,
      check_status: legacyStatusFor(draft),
      draft_status: draft.draft_meta.draft_status,
      provider,
      model,
      passes,
      evidence_audit_completed: evidenceAuditCompleted,
      ...modelInputMeta.visionDiagnostics,
      qwen_file_extract_enabled: modelInputMeta.qwenFileExtractEnabled,
      image_count_sent_to_model: modelInputMeta.visualImages.length,
      attachment_observation_count:
        modelInputMeta.attachmentObservations.length,
      qwen_file_extract_count: qwenFileExtractObservationCount(
        modelInputMeta.attachmentObservations,
      ),
      cad_metadata_count: cadMetadataObservationCount(
        modelInputMeta.attachmentObservations,
      ),
    });

    const { data: latestRows } = await supabase
      .from("request_messages")
      .select("id,author_role,body,created_at")
      .eq("request_id", requestRow.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestMessageBeforeReply = latestRows?.[0];
    let insertedMessage = true;
    if (
      latestMessageCanReceiveAgentReply(
        latestMessageBeforeReply,
        queuedCustomerMessageId,
      )
    ) {
      const { error: messageInsertError } = await supabase
        .from("request_messages")
        .insert({
          request_id: requestRow.id,
          author_id: null,
          author_role: "easy_harness",
          body: customerMessage,
          blocks: messageBlocks,
          visibility: "thread",
        });

      if (messageInsertError)
        throw new Error(
          `Could not insert Easy Harness message: ${messageInsertError.message}`,
        );
    } else {
      insertedMessage = false;
    }

    await supabase.from("integration_events").insert({
      adapter: adapterId,
      action: `draft_${draft.draft_meta.draft_status}`,
      target_type: "request",
      target_id: requestRow.id,
      detail: checkReasonFor(draft),
      payload: {
        requestNumber: requestRow.request_number,
        trigger: payload.trigger || "manual",
        model,
        provider,
        schemaVersion,
      },
    });

    return jsonResponse({
      ok: true,
      requestId: requestRow.id,
      requestNumber: requestRow.request_number,
      status: nextStatus,
      checkStatus: legacyStatusFor(draft),
      readiness: legacyReadinessFor(draft),
      draftStatus: draft.draft_meta.draft_status,
      checkResult,
      message: insertedMessage ? customerMessage : "",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown draft agent error";
    logCheckingEvent("fallback", {
      request_number: requestRow.request_number,
      error: message.slice(0, 500),
      ...modelInputMeta.visionDiagnostics,
      qwen_file_extract_enabled: modelInputMeta.qwenFileExtractEnabled,
      image_count_sent_to_model: modelInputMeta.visualImages.length,
      attachment_observation_count:
        modelInputMeta.attachmentObservations.length,
    });
    await supabase.from("integration_events").insert({
      adapter: adapterId,
      action: "primary_agent_failed_draft_pending",
      target_type: "request",
      target_id: requestRow.id,
      detail: message,
      payload: {
        requestNumber: requestRow.request_number,
        trigger: payload.trigger || "manual",
      },
    });

    await keepRequestPendingAfterModelFailure(
      supabase,
      requestRow,
      payload.trigger || "manual",
      message,
      modelInputMeta,
    );

    const latestBeforePendingReply = await latestThreadMessage(
      supabase,
      requestRow.id,
    );
    if (
      !latestMessageCanReceiveAgentReply(
        latestBeforePendingReply,
        queuedCustomerMessageId,
      )
    ) {
      logCheckingEvent("superseded", {
        request_number: requestRow.request_number,
        reason: "newer_thread_message_before_pending_notice",
        latest_role: latestBeforePendingReply?.author_role || "",
      });
      return jsonResponse({
        ok: true,
        superseded: true,
        requestId: requestRow.id,
        requestNumber: requestRow.request_number,
        status: requestRow.status,
        checkStatus: requestRow.check_status,
      });
    }

    const pendingMessage =
      "Easy Harness is still organizing your upload package. The request basis will appear here when it is ready.";
    const { error: messageInsertError } = await supabase
      .from("request_messages")
      .insert({
        request_id: requestRow.id,
        author_id: null,
        author_role: "easy_harness",
        body: pendingMessage,
        blocks: [{ type: "text", text: pendingMessage }],
        visibility: "thread",
      });

    if (messageInsertError) {
      await supabase.from("integration_events").insert({
        adapter: adapterId,
        action: "pending_notice_insert_failed",
        target_type: "request",
        target_id: requestRow.id,
        detail: messageInsertError.message,
        payload: {
          requestNumber: requestRow.request_number,
          trigger: payload.trigger || "manual",
        },
      });
    }

    return jsonResponse({
      ok: true,
      requestId: requestRow.id,
      requestNumber: requestRow.request_number,
      status: "checking",
      checkStatus: "pending",
      readiness: "checking",
      draftStatus: "pending",
      message: messageInsertError ? "" : pendingMessage,
    });
  }
  })();

  const fastResponseMs = edgeFastResponseMs();
  if (fastResponseMs > 0) {
    const timedOut = Symbol("edge_fast_response_timed_out");
    const fastResult = await Promise.race([
      checkingJob,
      sleep(fastResponseMs).then(() => timedOut),
    ]);

    if (fastResult !== timedOut) {
      return fastResult as Response;
    }

    logCheckingEvent("fast_response_timeout", {
      request_number: requestRow.request_number,
      trigger,
      fast_response_ms: fastResponseMs,
    });
  }

  const backgroundRegistered = runCheckingJobInBackground(checkingJob, {
    request_number: requestRow.request_number,
    trigger,
    runtime: "supabase_edge_function",
  });

  if (!backgroundRegistered) {
    await markCheckingStillQueued(supabase, requestRow, trigger);
    return jsonResponse({
      ok: true,
      queued: false,
      async: false,
      requestId: requestRow.id,
      requestNumber: requestRow.request_number,
      status: "needs_info",
      checkStatus: "needs_info",
      readiness: "needs_user_reply",
      message:
        "Easy Harness received the upload package, but the organizing step did not finish. Please send a short update and Easy Harness will continue.",
    });
  }

  return jsonResponse({
    ok: true,
    queued: true,
    async: true,
    requestId: requestRow.id,
    requestNumber: requestRow.request_number,
    status: "checking",
    checkStatus: "pending",
    readiness: "checking",
    message: checkingProgressMessageText,
  });
});
