import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";
import {
  integrationNotConfigured,
  jsonResponse,
  optionsResponse,
  readJson,
  requiredEnv,
} from "../_shared/response.ts";

type CheckingRequest = {
  requestId?: string;
  trigger?: "initial_request" | "customer_followup" | "manual" | string;
  force?: boolean;
};

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

function envNumber(name: string, fallback: number, min: number, max: number) {
  const value = Number(Deno.env.get(name) || "");
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function attachmentVisionEnabled() {
  return (
    selectedDraftProvider() === "qwen" &&
    (envFlag("AI_DRAFT_ENABLE_ATTACHMENT_VISION") ||
      envFlag("QWEN_ENABLE_VISION"))
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

function softenEvidenceBoundaryText(value = "") {
  return value
    .replace(
      /\bvisual identification and confirmation of connector housing and terminal models from photos\b/gi,
      "Inspect uploaded photos during Easy Harness review before confirming connector housing or terminal details",
    )
    .replace(
      /\bvisual identification\b/gi,
      "photo review during Easy Harness review",
    )
    .replace(
      /\bpinout verification and mapping validation against the uploaded CSV\b/gi,
      "Review the uploaded pinout file during Easy Harness review before relying on pinout mapping",
    )
    .replace(
      /\bagainst the uploaded CSV\b/gi,
      "during Easy Harness review",
    )
    .replace(/\bfrom photos\b/gi, "during Easy Harness review")
    .replace(/\boptimized for\b/gi, "selected for");
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

function draftTextBlob(draft: EasyHarnessDraft) {
  const knownText = Object.entries(draft.known_requirements)
    .map(([key, value]) => `${key}: ${fieldText(value)}`)
    .filter((line) => !line.endsWith(": "))
    .join(" | ");
  const evidenceText = draft.provided_evidence
    .map((item) =>
      [item.filename, item.content_summary, item.what_it_may_show]
        .filter(Boolean)
        .join(" "),
    )
    .join(" | ");
  return [
    draft.user_intent.intent_type,
    draft.user_intent.connection_goal,
    draft.user_intent.desired_outcome,
    draft.user_facing_summary.request_line,
    draft.user_facing_summary.compact_details.join(" "),
    draft.user_facing_summary.what_we_have.join(" "),
    draft.ai_interpretation.short_understanding,
    draft.ai_interpretation.likely_harness_type,
    draft.ai_interpretation.likely_use,
    knownText,
    evidenceText,
  ]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase();
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasQuantityBasis(draft: EasyHarnessDraft) {
  if (
    hasKnownRequirement(draft, [
      "quantity",
      "qty",
      "pieces",
      "piece_count",
      "order_quantity",
    ])
  )
    return true;
  const text = draftTextBlob(draft);
  return matchesAny(text, [
    /\b\d+\s*(pcs?|pieces?|units?|sets?|pairs?|samples?)\b/i,
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(pcs?|pieces?|units?|sets?|pairs?|samples?)\b/i,
    /\bprototype\s*(sample|piece|unit)?\b/i,
    /\bsample\s*(piece|unit|order)?\b/i,
  ]);
}

function hasLengthOrScaleBasis(draft: EasyHarnessDraft) {
  if (
    hasKnownRequirement(draft, [
      "length",
      "estimated_length",
      "approximate_length",
      "full_length",
      "cable_length",
      "harness_length",
      "scale",
      "dimensions",
    ])
  )
    return true;
  const text = draftTextBlob(draft);
  if (
    matchesAny(text, [
      /\b\d+(?:\.\d+)?\s*(mm|cm|m|meter|meters|in|inch|inches|ft|feet)\b/i,
    ])
  )
    return true;
  return matchesAny(text, [
    /\b(full|complete)\s+(physical\s+)?(sample|old harness|harness sample)\s+(can be measured|for measurement|available to measure)\b/i,
    /\b(old harness|sample)\s+(will be sent|can be sent|available for measurement)\b/i,
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
  const text = draftTextBlob(draft);
  return matchesAny(text, [
    /\b(outdoor|indoor|vehicle|automotive|agricultural|field|machine|equipment|robot|prototype|controller|sensor|motor|battery|power|signal|data|can\b|rs485|waterproof|moisture|vibration|high temperature|low temperature)\b/i,
  ]);
}

function hasRequestScope(draft: EasyHarnessDraft) {
  const text = draftTextBlob(draft);
  const hasIntent = Boolean(
    normalizeString(draft.user_intent.connection_goal, "") ||
      normalizeString(draft.user_intent.desired_outcome, "") ||
      normalizeString(draft.user_facing_summary.request_line, ""),
  );
  const knownType = normalizeString(
    draft.user_intent.intent_type,
    "unknown",
  ).toLowerCase();
  return (
    hasIntent ||
    (knownType && knownType !== "unknown") ||
    matchesAny(text, [
      /\bconnect\b.+\b(to|with)\b/i,
      /\b(copy|replace|remake|replicate)\b.+\b(harness|cable|loom)\b/i,
      /\b(adapter|pigtail|extension cable|wiring loom|wire harness|cable assembly)\b/i,
    ])
  );
}

function hasPowerLoadRisk(draft: EasyHarnessDraft) {
  const text = draftTextBlob(draft);
  return matchesAny(text, [
    /\b(battery|motor|heater|actuator|pump|inverter|driver|motor controller|power load|high current)\b/i,
  ]);
}

function hasVoltageBasis(draft: EasyHarnessDraft) {
  if (hasKnownRequirement(draft, ["voltage", "volts", "v_rating"])) return true;
  const text = draftTextBlob(draft);
  return matchesAny(text, [/\b\d+(?:\.\d+)?\s*(v|volt|volts)\b/i]);
}

function hasCurrentOrPowerBasis(draft: EasyHarnessDraft) {
  if (
    hasKnownRequirement(draft, [
      "current",
      "max_current",
      "maximum_current",
      "power",
      "wattage",
      "load",
      "amp",
      "amps",
      "a_rating",
    ])
  )
    return true;
  const text = draftTextBlob(draft);
  return matchesAny(text, [
    /\b\d+(?:\.\d+)?\s*(a|amp|amps|w|watt|watts|kw)\b/i,
    /\b(low|small|signal[-\s]?level|logic[-\s]?level)\s+(current|power)\b/i,
  ]);
}

function hasPowerBasis(draft: EasyHarnessDraft) {
  return hasVoltageBasis(draft) || hasCurrentOrPowerBasis(draft);
}

function hasExplicitPowerConductor(draft: EasyHarnessDraft) {
  const text = draftTextBlob(draft);
  return matchesAny(text, [
    /\b(pin\s*\d+\s*[=:]\s*\d+(?:\.\d+)?\s*v)\b/i,
    /\b(12v|24v|48v|5v)\b.+\b(gnd|ground)\b/i,
    /\b(power|supply|vcc|vin|battery\s*positive|positive supply)\b/i,
  ]);
}

function needsCurrentOrPowerBeforeDraft(draft: EasyHarnessDraft) {
  if (hasExplicitSignalOnlyNoPower(draft)) return false;
  return (hasPowerLoadRisk(draft) || hasExplicitPowerConductor(draft)) && !hasCurrentOrPowerBasis(draft);
}

function addQuestionOnce(
  target: UnknownItem[],
  field: string,
  reason: string,
  question: string,
) {
  if (target.some((item) => item.field === field || item.question === question))
    return;
  target.push({ field, reason, question });
}

function addUnknownOnce(target: UnknownItem[], field: string, reason: string, question?: string) {
  if (!field || !reason) return;
  if (target.some((item) => item.field === field || item.reason === reason)) return;
  target.push({ field, reason, question });
}

function setKnownRequirementIfMissing(
  draft: EasyHarnessDraft,
  key: string,
  value: string,
  source = "derived_from_conversation",
  confidence: FieldValue["confidence"] = "partial",
) {
  if (!value) return;
  if (isKnownFieldValue(draft.known_requirements[key])) return;
  draft.known_requirements[key] = { value, source, confidence };
}

function connectionTextForExtraction(draft: EasyHarnessDraft) {
  return [
    draft.user_intent.connection_goal,
    draft.user_intent.desired_outcome,
    draft.user_intent.from_side,
    draft.user_intent.to_side.join(" "),
    draft.user_facing_summary.request_line,
    draft.user_facing_summary.compact_details.join(" "),
    draft.user_facing_summary.what_we_have.join(" "),
    draft.ai_interpretation.short_understanding,
    Object.entries(draft.known_requirements)
      .map(([key, value]) => `${key}: ${fieldText(value)}`)
      .join(" "),
  ]
    .filter(Boolean)
    .join(" | ");
}

function firstMatchText(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function deriveMissingKnownRequirements(draft: EasyHarnessDraft) {
  const text = connectionTextForExtraction(draft);
  const lower = text.toLowerCase();

  const quantity = firstMatchText(text, [
    /\b(?:quantity|qty|need|needs|make|order|for)\s*[:=]?\s*(\d{1,6})\s*(pcs?|pieces?|units?|sets?|pairs?|samples?)\b/i,
    /\b(\d{1,6})\s*(pcs?|pieces?|units?|sets?|pairs?|samples?)\b/i,
  ]);
  if (quantity) setKnownRequirementIfMissing(draft, "quantity", `${quantity[1]} ${quantity[2]}`);

  const length = firstMatchText(text, [
    /\b(?:length|full length|total length|about|approx\.?|approximately|around)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|meter|meters|in|inch|inches|ft|feet)\b/i,
  ]);
  if (length) setKnownRequirementIfMissing(draft, "harness_length", `${length[1]} ${length[2]}`);

  const voltage = firstMatchText(text, [/\b(\d+(?:\.\d+)?)\s*(v|volt|volts)\b/i]);
  if (voltage) setKnownRequirementIfMissing(draft, "voltage", `${voltage[1]} ${voltage[2]}`);

  const current = firstMatchText(text, [/\b(\d+(?:\.\d+)?)\s*(a|amp|amps)\b/i]);
  if (current) setKnownRequirementIfMissing(draft, "current", `${current[1]} ${current[2]}`);

  const power = firstMatchText(text, [/\b(\d+(?:\.\d+)?)\s*(w|watt|watts|kw)\b/i]);
  if (power) setKnownRequirementIfMissing(draft, "power", `${power[1]} ${power[2]}`);

  if (/\b(signal[-\s]?only|no\s+power|does\s+not\s+carry\s+power|not\s+carry\s+power|without\s+power)\b/i.test(text)) {
    setKnownRequirementIfMissing(draft, "power", "none (signal only)", "derived_from_conversation", "confirmed");
    addUnknownOnce(
      draft.unknowns.not_applicable,
      "voltage_current_for_load",
      "Not needed at intake because the customer specified signal only / no power.",
    );
  }

  if (/\b(can[-\s]?h|can[-\s]?l|can bus|can\s+signal)\b/i.test(text)) {
    setKnownRequirementIfMissing(draft, "signal_type", "CAN bus", "derived_from_conversation", "partial");
    if (!draft.ai_interpretation.likely_use || draft.ai_interpretation.likely_use === "unknown") {
      draft.ai_interpretation.likely_use = "signal";
    }
  }

  const envParts: string[] = [];
  if (/\boutdoor\b/i.test(text)) envParts.push("outdoor");
  if (/\bindoor\b/i.test(text)) envParts.push("indoor");
  if (/\bfield\s+equipment\b/i.test(text)) envParts.push("field equipment");
  if (/\bIP\s*6[56789]\b/i.test(text)) {
    const ip = text.match(/\bIP\s*6[56789]\b/i)?.[0]?.replace(/\s+/g, "") || "IP-rated";
    envParts.push(ip);
  }
  if (envParts.length) {
    setKnownRequirementIfMissing(draft, "environment", [...new Set(envParts)].join(", "));
  } else if (isKnownFieldValue(draft.known_requirements.environmental)) {
    setKnownRequirementIfMissing(draft, "environment", fieldText(draft.known_requirements.environmental));
  }

  const pinAssignments: Array<Record<string, unknown>> = [];
  const pinPattern = /\bpin\s*(\d{1,3})\s*(?:[:=\-]|\s+)\s*([A-Za-z0-9+/_\- ]{1,40})(?=\s*(?:,|;|\||$|\.))/gi;
  let match: RegExpExecArray | null;
  while ((match = pinPattern.exec(text)) && pinAssignments.length < 30) {
    const signal = match[2].trim().replace(/\s+/g, " ");
    if (signal) pinAssignments.push({ pin: match[1], signal, source: "derived_from_conversation" });
  }
  if (pinAssignments.length && !draft.captured_professional_details.pinout.length) {
    draft.captured_professional_details.pinout = pinAssignments;
  }

  if (isKnownFieldValue(draft.known_requirements.connector_end_a)) {
    const value = fieldText(draft.known_requirements.connector_end_a);
    if (!draft.captured_professional_details.connectors.some((item) => item.end === "A" || item.value === value)) {
      draft.captured_professional_details.connectors.push({ end: "A", value, source: "known_requirements" });
    }
  }
  if (isKnownFieldValue(draft.known_requirements.connector_end_b)) {
    const value = fieldText(draft.known_requirements.connector_end_b);
    if (!draft.captured_professional_details.connectors.some((item) => item.end === "B" || item.value === value)) {
      draft.captured_professional_details.connectors.push({ end: "B", value, source: "known_requirements" });
    }
  }

  if (draft.draft_closure.can_close_user_draft) {
    if (/\bconnector\b/i.test(lower)) {
      addUnknownOnce(
        draft.unknowns.easy_harness_review,
        "connector_part_selection",
        "Select or verify connector brand/part numbers from the stated connector type, files, photos, or sample.",
      );
    }
    if (/\bip\s*6[56789]|waterproof|outdoor\b/i.test(lower)) {
      addUnknownOnce(
        draft.unknowns.easy_harness_review,
        "environmental_sealing_review",
        "Review waterproofing/sealing approach against the stated outdoor/IP preference.",
      );
    }
    if (/\bshield|drain|can[-\s]?h|can[-\s]?l|can bus\b/i.test(lower)) {
      addUnknownOnce(
        draft.unknowns.easy_harness_review,
        "signal_and_shielding_review",
        "Review CAN signal cable, shielding, drain connection, and continuity expectations.",
      );
    }
    if (draft.provided_evidence.length) {
      addUnknownOnce(
        draft.unknowns.easy_harness_review,
        "attachment_review",
        "Inspect uploaded files during Easy Harness review before relying on connector, pinout, layout, or other file details.",
      );
    }
  }

  return draft;
}

function softenEasyHarnessReviewLanguage(draft: EasyHarnessDraft): EasyHarnessDraft {
  const softenItem = (item: UnknownItem) => ({
    ...item,
    reason: softenEvidenceBoundaryText(item.reason || ""),
    question: item.question
      ? softenEvidenceBoundaryText(item.question)
      : item.question,
  });

  return {
    ...draft,
    unknowns: {
      ...draft.unknowns,
      easy_harness_review: draft.unknowns.easy_harness_review.map(softenItem),
      later_supplier_or_engineering_confirmation:
        draft.unknowns.later_supplier_or_engineering_confirmation.map(
          softenItem,
        ),
    },
  };
}

function hasExplicitSignalOnlyNoPower(draft: EasyHarnessDraft) {
  const text = draftTextBlob(draft);
  return /\b(signal[-\s]?only|no\s+power|does\s+not\s+carry\s+power|not\s+carry\s+power|without\s+power)\b/i.test(text);
}

function enforceDraftReadiness(draft: EasyHarnessDraft): EasyHarnessDraft {
  const claimedReady =
    draft.draft_closure.can_close_user_draft ||
    draft.draft_meta.draft_status === "ready_for_easy_harness_review" ||
    draft.draft_meta.draft_status === "closed_for_easy_harness_review";
  if (!claimedReady) return draft;

  const blockingQuestions: UnknownItem[] = [];
  if (!hasRequestScope(draft)) {
    addQuestionOnce(
      blockingQuestions,
      "request_scope",
      "The request scope is not clear enough to form a usable draft.",
      "What should this harness or cable connect, copy, or replace?",
    );
  }
  if (!hasQuantityBasis(draft)) {
    addQuestionOnce(
      blockingQuestions,
      "quantity",
      "Quantity is a basic order detail needed before preparing a usable draft.",
      "How many harnesses do you need?",
    );
  }
  if (!hasLengthOrScaleBasis(draft)) {
    addQuestionOnce(
      blockingQuestions,
      "length_or_measurement_basis",
      "Approximate length or a clear measurement basis is needed before preparing a usable draft.",
      "What is the approximate full length, or do you have a full sample that can be measured?",
    );
  }
  if (!hasUseOrEnvironmentBasis(draft)) {
    addQuestionOnce(
      blockingQuestions,
      "use_context",
      "Basic use context helps Easy Harness prepare a draft that can be reviewed properly.",
      "Where will this harness be used, or what equipment is it for?",
    );
  }
  if (needsCurrentOrPowerBeforeDraft(draft)) {
    const hasVoltage = hasVoltageBasis(draft);
    addQuestionOnce(
      blockingQuestions,
      hasVoltage ? "current_or_power" : "voltage_current_or_power",
      hasVoltage
        ? "A power-carrying harness needs expected current or power before the user-side draft can be treated as ready."
        : "A power-carrying harness needs voltage and expected current or power before the user-side draft can be treated as ready.",
      hasVoltage
        ? "What maximum current or power is expected on the power line? Approximate is fine."
        : "What voltage and maximum current or power will this harness carry? Approximate is fine.",
    );
  }

  if (!blockingQuestions.length) return draft;

  const selected = blockingQuestions.slice(0, 3);
  const existingAskNow = draft.unknowns.ask_user_now || [];
  const askNow = [...selected];
  for (const item of existingAskNow) {
    if (askNow.length >= 6) break;
    if (
      !askNow.some(
        (existing) => existing.field === item.field || existing.question === item.question,
      )
    ) {
      askNow.push(item);
    }
  }

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
      needed_next: selected.map((item) => item.question || item.field),
      next_step: "Add these basics so Easy Harness can prepare the draft.",
    },
    draft_closure: {
      ...draft.draft_closure,
      can_close_user_draft: false,
      closure_status: "needs_key_clarification",
      closure_reason:
        "The request intent is understood, but basic order details are still needed before an Easy Harness Draft can be prepared.",
      next_action: "ask_user",
      questions_to_ask: selected.map((item) => item.question || item.field),
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
  return enforceDraftReadiness(
    softenEasyHarnessReviewLanguage(deriveMissingKnownRequirements(draft)),
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

  if (messageType === "not_harness_related") {
    return [
      "This file or message does not provide enough harness-related information yet.",
      "Please upload connector-end photos, device port photos, an old harness sample, or describe what needs to connect.",
    ].join("\n\n");
  }

  if (messageType === "needs_harness_context") {
    return [
      "I can help, but I need one starting point first:",
      "What should this harness or cable connect to what?",
      "You can also upload connector photos, device port photos, an old harness sample, or a simple sketch.",
    ].join("\n\n");
  }

  if (messageType === "ready_for_review") {
    return [
      "Easy Harness Draft is ready.",
      header || "Harness request",
      "Easy Harness will review the remaining selection, file details, and feasibility from here.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const questions = draft.draft_closure.questions_to_ask.length
    ? draft.draft_closure.questions_to_ask
    : draft.user_facing_summary.needed_next;
  return [
    header || "Harness request",
    "To move this forward:",
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
  if (typeof value === "string") return value === "unknown" ? "" : value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeString(record.value, "") || normalizeString(record.label, "");
  }
  return String(value);
}

function knownDetailLabels(draft: EasyHarnessDraft) {
  return Object.entries(draft.known_requirements)
    .map(([key, value]) => {
      const label = fieldValueLabel(value);
      return label ? `${key.replaceAll("_", " ")}: ${label}` : "";
    })
    .filter(Boolean)
    .slice(0, 8);
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
  if (draft.draft_closure.can_close_user_draft) {
    blocks.push({
      type: "draft_summary",
      draftId: `${requestRow.request_number}-D1`,
      title:
        draft.user_facing_summary.request_line ||
        draft.user_intent.connection_goal ||
        requestRow.title ||
        "Harness request",
      status: "Ready for Easy Harness review",
      compactDetails: draft.user_facing_summary.compact_details,
      connectionGoal: draft.user_intent.connection_goal,
      intentType: draft.user_intent.intent_type,
      fromSide: draft.user_intent.from_side,
      toSide: draft.user_intent.to_side,
      knownDetails: knownDetailLabels(draft),
      files: draft.provided_evidence
        .map((item) => item.filename || item.content_summary || item.type)
        .filter(Boolean),
      reviewItems: draftReviewItems(draft),
    });
  }
  return blocks;
}


function cleanExtractedText(value = "") {
  return value
    .replace(/^\s*(should be|is|are|to be|an?|the)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.;,]+$/g, "")
    .trim();
}

function firstCapture(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanExtractedText(match[1]);
  }
  return "";
}

function valueField(value: string, source = "local_draft_builder", confidence: FieldValue["confidence"] = "partial") {
  return { value, source, confidence };
}

function customerConversationText(requestRow: RequestRow, messages: MessageRow[]) {
  const customerMessages = messages
    .filter((message) => message.author_role === "customer")
    .map((message) => textFromBlocks(message.blocks, message.body))
    .filter(Boolean)
    .join("\n\n");
  return [requestRow.title, requestRow.customer_summary, customerMessages]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function hasMeasurementReference(
  text: string,
  attachments: Array<AttachmentRow & { storage?: StorageRow }>,
) {
  const hasTextReference = matchesAny(text, [
    /\b(old|existing|original|reference|sample)\s+(harness|cable|loom|assembly)\b/i,
    /\b(harness|cable|loom|assembly)\s+(sample|reference)\b/i,
    /\b(can be measured|available to measure|same length|copy the length)\b/i,
  ]);
  const hasFileReference = attachments.some((attachment) =>
    /\b(old|existing|sample|reference|harness|cable|loom|photo|image|picture)\b/i.test(
      attachment.name || "",
    ),
  );
  return hasTextReference || hasFileReference;
}

function hasActionableConnectionGoal(
  text: string,
  endA: string,
  endB: string,
  attachments: Array<AttachmentRow & { storage?: StorageRow }>,
) {
  if (endA && endB) return true;
  const directConnection = matchesAny(text, [
    /\b(connect|wire|link|join|adapt|convert)\b[\s\S]{0,120}\b(to|with|between)\b/i,
    /\bfrom\b[\s\S]{1,120}\bto\b/i,
    /\bbetween\b[\s\S]{1,120}\band\b/i,
  ]);
  const copyOrReplaceReference =
    matchesAny(text, [
      /\b(copy|replicate|remake|replace|duplicate|recreate)\b[\s\S]{0,80}\b(harness|cable|loom|assembly|sample)\b/i,
      /\b(harness|cable|loom|assembly|sample)\b[\s\S]{0,80}\b(copy|replicate|remake|replace|duplicate|recreate)\b/i,
    ]) && (attachments.length > 0 || hasMeasurementReference(text, attachments));
  const adapterReference = matchesAny(text, [
    /\b(adapter|pigtail|extension|conversion cable|adapter cable)\b[\s\S]{0,120}\b(to|for|between|from)\b/i,
  ]);
  return directConnection || copyOrReplaceReference || adapterReference;
}

function hasBasicUseContext(text: string) {
  return matchesAny(text, [
    /\b(for|used in|use in|application|equipment|machine|vehicle|robot|field equipment|agricultural|industrial|outdoor|indoor)\b/i,
    /\b(power|supply|signal|data|can\b|rs485|sensor|controller|motor|battery|actuator|pump)\b/i,
    /\b(waterproof|moisture|vibration|high temperature|low temperature|IP\s*6[56789])\b/i,
  ]);
}

function extractPinoutDetails(text: string) {
  const assignments: Array<Record<string, unknown>> = [];
  const pattern = /\bpin\s*(\d{1,3})\s*(?:[:=\-]|\s+)\s*([A-Za-z0-9+/_\- ]{1,40})(?=\s*(?:,|;|\||$|\.))/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) && assignments.length < 30) {
    const signal = cleanExtractedText(match[2]);
    if (signal) assignments.push({ pin: match[1], signal, source: "local_draft_builder" });
  }
  return assignments;
}

function buildLocalDraftFromRequest(
  requestRow: RequestRow,
  messages: MessageRow[],
  attachments: Array<AttachmentRow & { storage?: StorageRow }>,
  trigger = "manual",
  primaryAgentIssue = "",
) {
  const text = customerConversationText(requestRow, messages);
  const lower = text.toLowerCase();
  const quantity = firstCapture(text, [
    /\b(?:quantity|qty|need|needs|make|order|for)\s*[:=]?\s*(\d{1,6}\s*(?:pcs?|pieces?|units?|sets?|pairs?|samples?))\b/i,
    /\b(\d{1,6}\s*(?:pcs?|pieces?|units?|sets?|pairs?|samples?))\b/i,
  ]);
  const length = firstCapture(text, [
    /\b(?:length|full length|total length|about|approx\.?|approximately|around)?\s*[:=]?\s*(\d+(?:\.\d+)?\s*(?:mm|cm|m|meter|meters|in|inch|inches|ft|feet))\b/i,
  ]);
  const endA = firstCapture(text, [
    /\bend\s*a\b[^\n.]*?(?:should be|is|:|=)\s*(?:an?\s+)?([^\n.]+)/i,
    /\bfrom\s+(?:side|end)?\s*[:=]?\s*([^\n.]+?)\s+to\s+/i,
  ]);
  const endB = firstCapture(text, [
    /\bend\s*b\b[^\n.]*?(?:should be|is|:|=)\s*(?:an?\s+)?([^\n.]+)/i,
    /\bto\s+(?:side|end)?\s*[:=]?\s*([^\n.]+)/i,
  ]);
  const signalOnly = /\b(signal[-\s]?only|no\s+power|does\s+not\s+carry\s+power|not\s+carry\s+power|without\s+power|data[-\s]?only)\b/i.test(text);
  const isCan = /\b(can[-\s]?h|can[-\s]?l|can\s*bus|can\s+signal)\b/i.test(text);
  const oldHarnessCopy = /\b(copy|replicate|remake|replace)\b.+\b(old\s+)?(harness|cable|loom|sample)\b/i.test(text);
  const hasConnectionContext = hasActionableConnectionGoal(text, endA, endB, attachments);

  const envParts: string[] = [];
  if (/\boutdoor\b/i.test(text)) envParts.push("outdoor");
  if (/\bindoor\b/i.test(text)) envParts.push("indoor");
  if (/\bfield\s+equipment\b/i.test(text)) envParts.push("field equipment");
  if (/\bvehicle|automotive|agricultural|machine|equipment|robot|prototype\b/i.test(text)) {
    const use = firstCapture(text, [/\b(for|used in|use in)\s+([^\n.]{3,60})/i]);
    if (use) envParts.push(use);
  }
  const ipRating = firstCapture(text, [/\b(IP\s*6[56789])\b/i]);
  if (ipRating) envParts.push(ipRating.replace(/\s+/g, ""));
  const environment = [...new Set(envParts)].join(", ");

  const voltage = firstCapture(text, [/\b(\d+(?:\.\d+)?\s*(?:v|volt|volts))\b/i]);
  const current = firstCapture(text, [/\b(\d+(?:\.\d+)?\s*(?:a|amp|amps))\b/i]);
  const power = firstCapture(text, [/\b(\d+(?:\.\d+)?\s*(?:w|watt|watts|kw))\b/i]);
  const hasPowerLoad = /\b(battery|motor|heater|actuator|pump|inverter|driver|motor controller|power line|power load|high current)\b/i.test(text);
  const pinout = extractPinoutDetails(text);
  const measurementBasis = length || (hasMeasurementReference(text, attachments) ? "reference sample or file available" : "");
  const hasUseContext = Boolean(environment || signalOnly || isCan || hasBasicUseContext(text));

  const questions: string[] = [];
  if (!hasConnectionContext) {
    questions.push("What should this harness or cable connect, copy, or replace?");
  } else if (hasPowerLoad && !signalOnly && !current && !power) {
    questions.push(
      voltage
        ? "What maximum current or power is expected on the power line? Approximate is fine."
        : "What voltage and maximum current or power will this harness carry? Approximate is fine.",
    );
  } else {
    if (!quantity) questions.push("How many harnesses do you need?");
    if (!measurementBasis) questions.push("What is the approximate full length, or is there a full sample that can be measured?");
    if (!hasUseContext && questions.length < 3) questions.push("Where will this harness be used, or what equipment is it for?");
  }

  const canClose = hasConnectionContext && questions.length === 0;
  const closureStatus: DraftStatus = canClose
    ? "ready_for_easy_harness_review"
    : !hasConnectionContext
      ? "needs_harness_context"
      : "needs_key_clarification";

  const knownRequirements: Record<string, FieldValue> = {};
  if (quantity) knownRequirements.quantity = valueField(quantity, "local_draft_builder", "confirmed");
  if (length) knownRequirements.harness_length = valueField(length, "local_draft_builder", "confirmed");
  if (endA) knownRequirements.connector_end_a = valueField(endA, "local_draft_builder", "partial");
  if (endB) knownRequirements.connector_end_b = valueField(endB, "local_draft_builder", "partial");
  if (environment) knownRequirements.environment = valueField(environment, "local_draft_builder", "partial");
  if (voltage) knownRequirements.voltage = valueField(voltage, "local_draft_builder", "partial");
  if (current) knownRequirements.current = valueField(current, "local_draft_builder", "partial");
  if (power) knownRequirements.power = valueField(power, "local_draft_builder", "partial");
  if (signalOnly) knownRequirements.power = valueField("none (signal only)", "local_draft_builder", "confirmed");
  if (isCan) knownRequirements.signal_type = valueField("CAN bus", "local_draft_builder", "partial");
  if (ipRating) knownRequirements.ip_rating = valueField(ipRating.replace(/\s+/g, ""), "local_draft_builder", "partial");

  const compactDetails = [
    measurementBasis,
    quantity,
    signalOnly ? "signal only, no power" : "",
    isCan ? "CAN signal" : "",
    environment,
    ipRating ? `${ipRating.replace(/\s+/g, "")} preferred` : "",
  ].filter(Boolean).slice(0, 6);
  const whatWeHave = [
    endA ? `End A: ${endA}` : "",
    endB ? `End B: ${endB}` : "",
    measurementBasis ? `Length/reference: ${measurementBasis}` : "",
    quantity ? `Quantity: ${quantity}` : "",
    signalOnly ? "Signal only / no power" : "",
    pinout.length ? "Pinout details provided" : "",
  ].filter(Boolean).slice(0, 6);
  const connectionGoal = endA && endB
    ? `Connect ${endA} to ${endB}.`
    : oldHarnessCopy
      ? "Copy or replace an existing harness based on the provided sample/photos."
      : hasConnectionContext
        ? cleanExtractedText(text.split("\n").find((line) => /\b(harness|cable|connect|adapter|copy|replace)\b/i.test(line)) || requestRow.customer_summary || requestRow.title)
        : "";
  const requestLine = [length, isCan ? "CAN signal harness" : "harness request", quantity].filter(Boolean).join(", ") || requestRow.title || "Harness request";

  const easyHarnessReview: UnknownItem[] = [];
  if (canClose) {
    if (/\bconnector|m\d+\b/i.test(text) || endA || endB) {
      easyHarnessReview.push({
        field: "connector_selection_or_verification",
        reason: "Verify connector type, orientation, and suitable part selection from the request details and files.",
      });
    }
    if (isCan || /\bshield|drain\b/i.test(text)) {
      easyHarnessReview.push({
        field: "signal_and_shielding_review",
        reason: "Review CAN signal cable, shielding, drain connection, and continuity expectations.",
      });
    }
    if (environment || /\bwaterproof|IP\s*6[56789]\b/i.test(text)) {
      easyHarnessReview.push({
        field: "environmental_sealing_review",
        reason: "Review waterproofing and sealing approach against the stated environment/IP preference.",
      });
    }
    if (attachments.length) {
      easyHarnessReview.push({
        field: "attachment_review",
        reason: "Review uploaded files for connector orientation, layout, pinout, and sample details.",
      });
    }
  }

  const notApplicable: UnknownItem[] = signalOnly
    ? [
        {
          field: "voltage_current_for_load",
          reason: "Not needed at intake because the customer specified signal only / no power.",
        },
      ]
    : [];

  const rawDraft = {
    schema_version: schemaVersion,
    draft_meta: {
      draft_status: closureStatus,
      draft_maturity_level: canClose ? 0.75 : hasConnectionContext ? 0.45 : 0.2,
      last_updated_reason: primaryAgentIssue
        ? "Primary agent run did not complete; Easy Harness generated a safe draft path from the submitted text and attachment metadata."
        : trigger,
    },
    user_intent: {
      intent_type: oldHarnessCopy ? "copy_old_harness" : hasConnectionContext ? "new_custom_harness" : "unknown",
      connection_goal: connectionGoal,
      from_side: endA || "unknown",
      to_side: endB ? [endB] : [],
      desired_outcome: requestLine,
      intent_confidence: hasConnectionContext ? "partial" : "vague",
    },
    provided_evidence: attachments.map((attachment) => ({
      type: attachment.mime_type || "attachment",
      filename: attachment.name,
      content_summary: `${attachment.name} uploaded by the customer`,
      relevance: hasConnectionContext ? "likely_relevant" : "unclear",
      what_it_may_show: "Reference material for Easy Harness review",
      used_in_draft: false,
      needs_review: true,
    })),
    known_requirements: knownRequirements,
    captured_professional_details: {
      connectors: [
        endA ? { end: "A", value: endA, source: "local_draft_builder" } : null,
        endB ? { end: "B", value: endB, source: "local_draft_builder" } : null,
      ].filter(Boolean),
      terminals: [],
      wire_gauge: null,
      pinout,
      materials: [],
      shielding: /\bshield|drain\b/i.test(text)
        ? valueField("shield/drain mentioned", "local_draft_builder", "partial")
        : null,
      testing_requirements: [],
    },
    ai_interpretation: {
      short_understanding: requestLine,
      likely_harness_type: isCan ? "CAN signal harness" : oldHarnessCopy ? "old harness copy" : "custom harness",
      likely_use: signalOnly || isCan ? "signal" : hasPowerLoad ? "power" : "unknown",
      complexity_estimate: "simple_to_moderate",
      do_not_assume: [
        "Attachment metadata is not visual or document evidence.",
        "A keyword is only a clue, not a workflow trigger.",
      ],
    },
    unknowns: {
      ask_user_now: questions.map((question) => ({ field: "draft_blocking_detail", reason: question, question })),
      ask_user_if_likely_known: [],
      easy_harness_review: easyHarnessReview,
      later_supplier_or_engineering_confirmation: canClose
        ? [
            {
              field: "production_details",
              reason: "Production-level material, crimp, and test details can be confirmed after Easy Harness review.",
            },
          ]
        : [],
      not_applicable: notApplicable,
    },
    risk_flags: [],
    user_facing_summary: {
      request_line: requestLine,
      compact_details: compactDetails,
      what_we_have: whatWeHave,
      needed_next: questions.slice(0, 3),
      next_step: canClose
        ? "Easy Harness will review connector selection, files, and remaining technical details."
        : "Reply with the missing detail so Easy Harness can prepare the Draft.",
    },
    draft_closure: {
      can_close_user_draft: canClose,
      closure_status: closureStatus,
      closure_reason: canClose
        ? "The submitted request has enough user-side information to prepare an Easy Harness Draft."
        : hasConnectionContext
          ? "The request is real but one or two draft-blocking basics are still needed."
          : "A harness/cable connection goal is needed before a Draft can be prepared.",
      next_action: canClose ? "easy_harness_review" : "ask_user",
      questions_to_ask: questions.slice(0, 3),
      customer_message_type: canClose
        ? "ready_for_review"
        : hasConnectionContext
          ? "ask_key_details"
          : "needs_harness_context",
    },
  };

  return normalizeDraft(rawDraft, "easy_harness", "local-draft-builder", trigger);
}

async function createSignedAttachmentImageUrls(
  supabase: ReturnType<typeof createClient>,
  attachments: Array<AttachmentRow & { storage?: StorageRow }>,
) {
  if (!attachmentVisionEnabled()) return [] as DraftVisionImage[];

  const maxImages = envNumber("AI_DRAFT_MAX_VISION_IMAGES", 4, 0, 12);
  const ttlSeconds = envNumber("AI_DRAFT_SIGNED_URL_TTL_SECONDS", 600, 60, 1800);
  const images: DraftVisionImage[] = [];

  for (const attachment of attachments) {
    if (images.length >= maxImages) break;
    if (!isImageAttachment(attachment)) continue;
    const storage = attachment.storage;
    if (!storage?.bucket || !storage.object_path) continue;
    if (!["uploaded", "available"].includes(storage.status || "")) continue;

    const { data, error } = await supabase.storage
      .from(storage.bucket)
      .createSignedUrl(storage.object_path, ttlSeconds);

    if (error || !data?.signedUrl) continue;
    images.push({
      filename: attachment.name,
      mime_type:
        attachment.mime_type ||
        storage.content_type ||
        "application/octet-stream",
      signed_url: data.signedUrl,
    });
  }

  return images;
}

function summarizeRequestForModel(
  requestRow: RequestRow,
  messages: MessageRow[],
  attachments: Array<AttachmentRow & { storage?: StorageRow }>,
  visualImages: DraftVisionImage[] = [],
) {
  const visualFilenames = new Set(visualImages.map((image) => image.filename));
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
        image_count_sent_to_model: visualImages.length,
        image_files_sent_to_model: visualImages.map((image) => image.filename),
        boundary: visualImages.length
          ? "Selected image attachments are provided to the draft model as image_url inputs. These images may be used only as model-visible visual observations with partial confidence unless the customer text confirms the same detail. Non-image files remain metadata-only until OCR/PDF/CSV/Excel/CAD parsing produces structured observations."
          : "No attachment pixels or document text are provided to the draft model. Attachments are metadata-only in this run.",
      },
      attachments: attachments.map((attachment) => ({
        name: attachment.name,
        mime_type: attachment.mime_type,
        size_bytes: attachment.size_bytes,
        purpose: attachment.purpose,
        storage_status: attachment.storage?.status || "metadata_only",
        model_input:
          visualFilenames.has(attachment.name) && attachmentVisionEnabled()
            ? "image_url_sent_to_qwen"
            : "metadata_only",
        evidence_boundary:
          visualFilenames.has(attachment.name) && attachmentVisionEnabled()
            ? "This image is visible to the Qwen draft model. Treat visual details as model observations, not confirmed manufacturing facts."
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

async function callDraftModel(
  inputText: string,
  trigger = "manual",
  visualImages: DraftVisionImage[] = [],
) {
  const { provider, apiKey, baseUrl, model, reasoningEffort, maxTokens } =
    draftModelConfig();

  const jsonShape = JSON.stringify(draftSchema, null, 2);
  const visualEvidenceInstruction = visualImages.length
    ? "Evidence boundary: this intake run includes conversation text, attachment metadata, and selected image files as model-visible image_url inputs. You may use visible image observations, but mark them as model observations with partial confidence unless corroborated by customer text. Do not claim PDF, Excel, CSV, CAD, hidden label, pinout, or document contents unless those details are explicitly present in text or structured observations."
    : "Evidence boundary: this intake run receives attachment metadata and conversation text, not reliable image pixels, OCR, PDF text, spreadsheet rows, CAD geometry, or visual observations. Do not claim to visually identify connector models, pinouts, wire colors, labels, drawings, or document contents from attachments unless those details are explicitly present in the text or provided observations.";
  const userContent =
    provider === "qwen" && visualImages.length
      ? [
          {
            type: "text",
            text: `Analyze this Easy Harness request and return Easy Harness Draft v0.1 as JSON only.\n\n${inputText}`,
          },
          ...visualImages.map((image) => ({
            type: "image_url",
            image_url: { url: image.signed_url },
          })),
        ]
      : `Analyze this Easy Harness request and return Easy Harness Draft v0.1 as JSON only.\n\n${inputText}`;

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
      ...(provider === "deepseek"
        ? {
            thinking: {
              type: "enabled",
              reasoning_effort: reasoningEffort === "high" ? "high" : "max",
            },
          }
        : {}),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are Easy Harness Intake Agent.",
            "Your job is to translate a user's own words, files, photos, sketches, old samples, pinouts, or partial notes into Easy Harness Draft v0.1.",
            "You are not a general chatbot, not a sales assistant, and not a traditional factory questionnaire.",
            "The draft closes at Ready for Easy Harness Review. This means a user-side and platform-side requirement object is clear enough for Easy Harness review, quote-path evaluation, and supplier/manufacturing follow-up. It does NOT mean final BOM, supplier RFQ, automatic quote, material confirmation, or production readiness.",
            "Core promise: Upload what you have. We'll build the harness you need. This means accept user-native expression and structure it. It does not mean fake certainty.",
            "The user should feel that Easy Harness organized their real need, not that they were forced to fill a factory questionnaire.",
            "First decide what the user already provided, what the user likely knows and must answer now, what Easy Harness can evaluate from files/photos/samples later, what supplier/manufacturing should confirm later, and what is not applicable.",
            "Do not rename the request based on a single keyword. The request line should come from the customer's actual connection goal and confirmed constraints. If a word like battery appears only in a negative constraint such as 'no battery power', do not turn the draft into a battery harness.",
            "Do not use keyword workflows or case-specific scripts. Words like old harness, battery, sensor, pinout, photo, sample, CAN, or connector are evidence only. They are not instructions to enter a fixed questionnaire or fixed reply path.",
            "Use the whole conversation to judge intent, evidence, missing blockers, and next action. A keyword may support the judgment, but it must not determine the workflow by itself.",
            "Capture all explicit details. If the user provides connector model, connector type, terminal, wire gauge, length, quantity, voltage, current, pinout, material, shielding, environment, IP rating, test requirement, BOM, drawing, or compliance detail, preserve it in known_requirements and/or captured_professional_details.",
            "Do not ask for terminal part numbers, exact wire gauge, strip length, crimp details, connector brand, IPC class, FAI, packaging, test fixture, controlled drawing revision, or factory production details unless they truly block the Draft stage.",
            "Ask at most three customer-facing questions, and prefer one or two. Only ask questions that block Draft closure and that the user is likely to know.",
            "It is acceptable not to close a Draft. If the connection goal is not clear, do not invent a Draft; ask the smallest connection-goal question.",
            "Run a strict relevance gate first. Do not prepare or close a draft if there is no harness/cable connection goal. A real connection goal can be device A to device B, copy/replace an old harness, make an adapter between ports, named connector ends, a pinout, cable routing, or another clear harness context.",
            "Messages like 'Is this file ok?', 'I need a cable', or an unrelated/reference image are not enough to close a draft unless they also state what needs to connect, copy, or replace.",
            visualEvidenceInstruction,
            visualImages.length
              ? "If photos are sent as image inputs, you may reference clear visible observations cautiously. Never turn visual observations into production facts; connector selection, pinout, wire colors, dimensions, and layout still require Easy Harness review unless the customer text confirms them."
              : "If photos/samples/files are attached, treat them as received evidence for Easy Harness review. Do not phrase review items as if this run already inspected the image, CSV, PDF, CAD, spreadsheet, or document contents. Say Easy Harness will inspect/review the uploaded files before relying on connector, pinout, layout, or other file-derived details.",
            "General Draft gate: close the draft when connection goal, endpoints or samples/photos, use/function, quantity or approximate quantity, length or measurement basis, environment/use context, and critical safety info are sufficient. Remaining professional unknowns should move to Easy Harness review or supplier/manufacturing confirmation.",
            "Do not close the draft when there is no harness/cable connection goal, the user only asks whether an unrelated file is ok, Easy Harness cannot tell what should be built, or a power-carrying harness lacks basic voltage/current/power and no safe approximation is possible.",
            "For power-carrying requests, voltage and expected current or power are functional/safety basics. Ask one concise question only when the whole request indicates a real power-carrying load and the customer is likely to know an approximate answer. Do not ask because a single word appeared.",
            "If the user clearly says signal only, no power, data only, or no load current, voltage/current is not applicable and must not be asked as a blocking question. Put this in unknowns.not_applicable if useful.",
            "If the user wants to copy an old harness and provides photos/sample plus quantity and approximate or measurable length, connector part numbers, terminal choices, wire construction, and visual pinout verification usually belong to Easy Harness review, not ask_user_now.",
            "If a draft is ready, user_facing_summary.needed_next must be empty. Put Easy Harness-owned work in easy_harness_review, later production details in later_supplier_or_engineering_confirmation, and irrelevant/not-needed items in not_applicable.",
            "Unknowns must be separated into: ask_user_now, ask_user_if_likely_known, easy_harness_review, later_supplier_or_engineering_confirmation, and not_applicable. Never output vague placeholders like unknown_item or Needs later confirmation.",
            "For ready_for_review, customer-facing content should be a compact Easy Harness Draft summary: request line, key details, files received, remaining Easy Harness review items, and clear next step. Do not claim price, material, supplier, or production readiness.",
            "Do not mention manual review, human review, or manual processing. Say Easy Harness review or Easy Harness will continue from here.",
            "Show understanding through structure, not repeated claims that you understand. Keep customer-facing output concise and in English.",
            "Return only valid JSON. Do not include Markdown, comments, explanation text, or code fences.",
            "The JSON object must follow this schema shape:",
            jsonShape,
          ].join("\n"),
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `${provider} request failed (${response.status}): ${raw.slice(0, 1200)}`,
    );
  }

  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${provider} returned an empty draft result.`);
  const parsed = JSON.parse(extractJsonObject(content));
  return {
    model,
    provider,
    reasoningEffort,
    usage: data?.usage || null,
    draft: normalizeDraft(parsed, provider, model, trigger),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST")
    return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<CheckingRequest>(request);
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,email,display_name")
    .eq("id", userData.user.id)
    .maybeSingle();

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
  if (
    !payload.force &&
    latestMessage &&
    latestMessage.author_role !== "customer" &&
    requestRow.check_status !== "pending"
  ) {
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
  const modelInputMeta = {
    attachmentVisionEnabled: attachmentVisionEnabled(),
    visualImages: [] as DraftVisionImage[],
  };

  try {
    await supabase
      .from("requests")
      .update({ status: "checking", check_status: "pending" })
      .eq("id", requestRow.id);

    modelInputMeta.visualImages = await createSignedAttachmentImageUrls(
      supabase,
      attachmentsWithStorage,
    );
    const modelInput = summarizeRequestForModel(
      requestRow,
      messages || [],
      attachmentsWithStorage,
      modelInputMeta.visualImages,
    );
    const { model, provider, reasoningEffort, usage, draft } =
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
        message_count: messages?.length || 0,
        attachment_count: attachments?.length || 0,
        attachment_vision_enabled: modelInputMeta.attachmentVisionEnabled,
        image_count_sent_to_model: modelInputMeta.visualImages.length,
        image_files_sent_to_model: modelInputMeta.visualImages.map(
          (image) => image.filename,
        ),
      },
    });

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

    const { data: latestRows } = await supabase
      .from("request_messages")
      .select("id,author_role,created_at")
      .eq("request_id", requestRow.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestRole = latestRows?.[0]?.author_role || "";
    let insertedMessage = true;
    if (latestRole === "customer") {
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
    await supabase.from("integration_events").insert({
      adapter: adapterId,
      action: "primary_agent_failed_local_draft_used",
      target_type: "request",
      target_id: requestRow.id,
      detail: message,
      payload: {
        requestNumber: requestRow.request_number,
        trigger: payload.trigger || "manual",
      },
    });

    const checkedAt = new Date().toISOString();
    const draft = buildLocalDraftFromRequest(
      requestRow,
      messages || [],
      attachmentsWithStorage,
      payload.trigger || "manual",
      message,
    );
    const nextStatus = requestStatusFor(draft);
    const customerMessage = buildCustomerMessage(draft);
    const messageBlocks = buildMessageBlocks(draft, customerMessage, requestRow);
    const checkResult = buildCheckResult(draft, {
      model: "local-draft-builder",
      provider: "easy_harness",
      reasoning_effort: "fallback",
      usage: null,
      reason: checkReasonFor(draft),
      checkedAt,
      trigger: payload.trigger || "manual",
      version: 2,
      source: {
        request_id: requestRow.id,
        request_number: requestRow.request_number,
        message_count: messages?.length || 0,
        attachment_count: attachments?.length || 0,
        attachment_vision_enabled: modelInputMeta.attachmentVisionEnabled,
        image_count_sent_to_model: modelInputMeta.visualImages.length,
        image_files_sent_to_model: modelInputMeta.visualImages.map(
          (image) => image.filename,
        ),
      },
      agent_runtime: {
        primary_agent_completed: false,
        local_draft_builder_used: true,
      },
    });

    const { data: latestRows } = await supabase
      .from("request_messages")
      .select("id,author_role,created_at")
      .eq("request_id", requestRow.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestRole = latestRows?.[0]?.author_role || "";
    let insertedMessage = false;
    if (latestRole === "customer") {
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

      insertedMessage = !messageInsertError;
      if (messageInsertError) {
        await supabase.from("integration_events").insert({
          adapter: adapterId,
          action: "local_draft_message_insert_failed",
          target_type: "request",
          target_id: requestRow.id,
          detail: messageInsertError.message,
          payload: {
            requestNumber: requestRow.request_number,
            trigger: payload.trigger || "manual",
          },
        });
      }
    }

    await supabase
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
  }
});
