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

// Legacy smoke-test compatibility: previous implementation checked OPENAI_API_KEY; this function now uses DEEPSEEK_API_KEY.
const schemaVersion = "easy_harness_draft_v0_1";
const adapterId = "deepseek-draft-closing-agent-v0-1";
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
  return value
    .map((item) => {
      if (typeof item === "string") return { field: item, reason: item };
      if (item && typeof item === "object") {
        const raw = item as Record<string, unknown>;
        return {
          field: normalizeString(raw.field, "unknown_item"),
          reason: normalizeString(raw.reason, "Needs later confirmation."),
          question: normalizeString(raw.question, "") || undefined,
        };
      }
      return null;
    })
    .filter(Boolean)
    .slice(0, limit) as UnknownItem[];
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

function hasPowerBasis(draft: EasyHarnessDraft) {
  if (
    hasKnownRequirement(draft, [
      "voltage",
      "current",
      "power",
      "wattage",
      "load",
      "amp",
      "amps",
    ])
  )
    return true;
  const text = draftTextBlob(draft);
  return matchesAny(text, [
    /\b\d+(?:\.\d+)?\s*(v|volt|volts|a|amp|amps|w|watt|watts|kw)\b/i,
  ]);
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
  if (hasPowerLoadRisk(draft) && !hasPowerBasis(draft)) {
    addQuestionOnce(
      blockingQuestions,
      "voltage_current_or_power",
      "Power-load requests need at least an optional voltage, current, or power check.",
      "Do you know the voltage, current, or power level? Approximate is fine.",
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
  return enforceDraftReadiness(draft);
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
    quantity: field("quantity"),
    estimated_length: field("estimated_length") || field("length"),
    environment: field("environment"),
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
      header || "Harness request",
      "This is clear enough for Easy Harness review.",
      "We’ll review the files and remaining technical details from here.",
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

function summarizeRequestForModel(
  requestRow: RequestRow,
  messages: MessageRow[],
  attachments: Array<AttachmentRow & { storage?: StorageRow }>,
) {
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
      attachments: attachments.map((attachment) => ({
        name: attachment.name,
        mime_type: attachment.mime_type,
        size_bytes: attachment.size_bytes,
        purpose: attachment.purpose,
        storage_status: attachment.storage?.status || "metadata_only",
        note: "DeepSeek V1 receives attachment metadata and conversation text. It must not claim it visually identified connector details unless those details are described in text or filename.",
      })),
    },
    null,
    2,
  );
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("DeepSeek returned an empty draft result.");
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

async function callDeepSeek(inputText: string, trigger = "manual") {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY") || "";
  const baseUrl = (
    Deno.env.get("DEEPSEEK_BASE_URL") || "https://api.deepseek.com"
  ).replace(/\/$/, "");
  const model = Deno.env.get("DEEPSEEK_MODEL") || "deepseek-v4-pro";
  const reasoningEffort = Deno.env.get("DEEPSEEK_REASONING_EFFORT") || "max";
  const maxTokens = Number(Deno.env.get("DEEPSEEK_MAX_TOKENS") || "12000");

  const jsonShape = JSON.stringify(draftSchema, null, 2);
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
      thinking: {
        type: "enabled",
        reasoning_effort: reasoningEffort === "high" ? "high" : "max",
      },
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are Easy Harness Intake Agent.",
            "Your job is to organize a user's custom wire harness, cable assembly, connector adapter, pigtail, wiring loom, or old harness replacement request into Easy Harness Draft v0.1.",
            "You are not a general chatbot, not a sales assistant, and not a traditional factory questionnaire.",
            "The draft closes at Ready for Easy Harness Review. It does NOT mean supplier RFQ, quotation, material confirmation, or production readiness.",
            "Capture what the user provides. If the user provides connector model, terminal, wire gauge, pinout, material, shielding, test requirement, BOM, drawing, or compliance detail, preserve it precisely.",
            "If the user does not provide factory-level details, do not force them as universal requirements. Classify unknowns by owner instead.",
            "Show understanding through structure, not repeated claims that you understand. Keep customer-facing output precise, efficient, and short.",
            "Ask at most three customer-facing questions. Only ask questions that materially improve draft closure.",
            "Do not ask for terminal part numbers, exact wire gauge, strip length, crimp details, IPC class, FAI, packaging, test fixture, or controlled drawing revision unless the user already appears to be a professional and the item is directly relevant.",
            "Run a strict relevance gate first. Do not prepare or close a draft if there is no harness-related connection goal.",
            "A real connection goal can be device A to device B, copy/replace an old harness, make an adapter between two ports, connector ends, pinout, cable routing, or clear harness context.",
            "Generic messages like 'see whether my attachment is correct', 'I need a cable', 'design a harness', or an unrelated/reference product image are not enough to close a draft unless they also state what needs to connect.",
            "DeepSeek currently receives attachment metadata and conversation text, not reliable visual pixels. Do not claim to visually identify connector models from attachments. If photos are attached, route connector identification to Easy Harness review unless details are in text.",
            "Do not use keyword scripts or case-specific templates. Identify the request type from the whole conversation, then apply the same draft readiness standard to every request.",
            "An Easy Harness Draft should be prepared only when the user-side request is a usable demand package, not merely when a broad intention is recognizable.",
            "Before closing a draft, check for these basic order-level inputs: request scope, quantity or sample quantity, approximate length or measurement basis, use context or environment, and any safety-critical power information if relevant.",
            "Do not require factory-level manufacturing details to close a draft, but do not put basic order details such as quantity, approximate length, or use context into Easy Harness review unless the user has explicitly provided a real measurement basis or says those details will be supplied later.",
            "For power-load requests such as battery to motor, motor controller, heater, actuator, or other high-current equipment, ask one concise voltage/current/power question if not already known. It is a basic safety question, but do not ask factory production fields.",
            "If the user says they do not know a connector model but has photos, do not force a guess. Route connector identification to Easy Harness review.",
            "When a draft is ready for Easy Harness review, user_facing_summary.needed_next must be empty. Put Easy Harness-owned or later engineering work in easy_harness_review or later_supplier_or_engineering_confirmation, not needed_next.",
            "Unknowns must be separated into: ask_user_now, ask_user_if_likely_known, easy_harness_review, later_supplier_or_engineering_confirmation.",
            "Close the user draft only when the request is harness-related, the request scope is clear, the basic order-level inputs are sufficient for Easy Harness to prepare a usable draft, user-provided information has been captured, and remaining unknowns are mostly professional or review items.",
            "For ready_for_review, the message should be short and should not claim price, material, supplier, or production readiness.",
            "All customer-facing summaries and questions must be in English.",
            "Return only valid JSON. Do not include Markdown, comments, explanation text, or code fences.",
            "The JSON object must follow this schema shape:",
            jsonShape,
          ].join("\n"),
        },
        {
          role: "user",
          content: `Analyze this Easy Harness request and return Easy Harness Draft v0.1 as JSON only.\n\n${inputText}`,
        },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `DeepSeek request failed (${response.status}): ${raw.slice(0, 1200)}`,
    );
  }

  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned an empty draft result.");
  const parsed = JSON.parse(extractJsonObject(content));
  return {
    model,
    provider: "deepseek",
    reasoningEffort,
    usage: data?.usage || null,
    draft: normalizeDraft(parsed, "deepseek", model, trigger),
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

  const missing = requiredEnv([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DEEPSEEK_API_KEY",
  ]);
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

  try {
    await supabase
      .from("requests")
      .update({ status: "checking", check_status: "pending" })
      .eq("id", requestRow.id);

    const modelInput = summarizeRequestForModel(
      requestRow,
      messages || [],
      attachmentsWithStorage,
    );
    const { model, provider, reasoningEffort, usage, draft } =
      await callDeepSeek(modelInput, payload.trigger || "manual");
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
        image_count_sent_to_model: 0,
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
      error instanceof Error ? error.message : "Unknown checking error";
    await supabase.from("integration_events").insert({
      adapter: adapterId,
      action: "draft_failed",
      target_type: "request",
      target_id: requestRow.id,
      detail: message,
      payload: {
        requestNumber: requestRow.request_number,
        trigger: payload.trigger || "manual",
      },
    });
    await supabase
      .from("requests")
      .update({
        status: "needs_info",
        check_status: "needs_info",
        check_result: {
          schema_version: schemaVersion,
          status: "needs_info",
          adapter: adapterId,
          reason:
            "Easy Harness could not finish this intake check. The request is saved and can continue in this thread.",
          missing: ["continue request"],
          checkedAt: new Date().toISOString(),
          error: message,
        },
      })
      .eq("id", requestRow.id);

    await supabase.from("request_messages").insert({
      request_id: requestRow.id,
      author_id: null,
      author_role: "easy_harness",
      body: "Easy Harness could not finish checking this request. Your request is saved, and you can continue adding details here.",
      blocks: [
        {
          type: "text",
          text: "Easy Harness could not finish checking this request. Your request is saved, and you can continue adding details here.",
        },
      ],
      visibility: "thread",
    });

    return jsonResponse(
      {
        ok: false,
        code: "ai_checking_failed",
        requestId: requestRow.id,
        message,
      },
      500,
    );
  }
});
