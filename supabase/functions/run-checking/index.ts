import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";
import { integrationNotConfigured, jsonResponse, optionsResponse, readJson, requiredEnv } from "../_shared/response.ts";

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

type IntakeResult = {
  status: "accepted" | "needs_info" | "rejected";
  readiness: "ready_for_admin_review" | "needs_clarification" | "not_supported";
  customer_summary: string;
  confirmed_facts: string[];
  assumptions: string[];
  missing_information: string[];
  questions_for_user: string[];
  attachments_reviewed: string[];
  factory_draft: {
    project_title: string;
    connection_goal: string;
    connection_objects: string[];
    application_type: "power" | "signal" | "data" | "mixed" | "unknown";
    quantity: string;
    estimated_length: string;
    environment: string;
    connector_notes: string;
    wire_notes: string;
    manufacturing_notes: string;
  };
  admin_notes: string[];
  risk_flags: string[];
};

// Legacy note: OPENAI_API_KEY is no longer used by this function; DEEPSEEK_API_KEY is required.
const adapterId = "deepseek-intake-agent-v1";
const supportedStatus = new Set(["draft_saved", "checking", "needs_info", "not_supported", "in_review"]);
const imageTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const isUuidLike = (value = "") => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const intakeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "readiness",
    "customer_summary",
    "confirmed_facts",
    "assumptions",
    "missing_information",
    "questions_for_user",
    "attachments_reviewed",
    "factory_draft",
    "admin_notes",
    "risk_flags"
  ],
  properties: {
    status: { type: "string", enum: ["accepted", "needs_info", "rejected"] },
    readiness: { type: "string", enum: ["ready_for_admin_review", "needs_clarification", "not_supported"] },
    customer_summary: { type: "string" },
    confirmed_facts: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    missing_information: { type: "array", items: { type: "string" } },
    questions_for_user: { type: "array", items: { type: "string" }, maxItems: 5 },
    attachments_reviewed: { type: "array", items: { type: "string" } },
    factory_draft: {
      type: "object",
      additionalProperties: false,
      required: [
        "project_title",
        "connection_goal",
        "connection_objects",
        "application_type",
        "quantity",
        "estimated_length",
        "environment",
        "connector_notes",
        "wire_notes",
        "manufacturing_notes"
      ],
      properties: {
        project_title: { type: "string" },
        connection_goal: { type: "string" },
        connection_objects: { type: "array", items: { type: "string" } },
        application_type: { type: "string", enum: ["power", "signal", "data", "mixed", "unknown"] },
        quantity: { type: "string" },
        estimated_length: { type: "string" },
        environment: { type: "string" },
        connector_notes: { type: "string" },
        wire_notes: { type: "string" },
        manufacturing_notes: { type: "string" }
      }
    },
    admin_notes: { type: "array", items: { type: "string" } },
    risk_flags: { type: "array", items: { type: "string" } }
  }
} as const;

function textFromBlocks(blocks: MessageRow["blocks"], fallback = "") {
  if (!Array.isArray(blocks)) return fallback;
  return blocks
    .map((block) => {
      if (block.type === "text" && typeof block.text === "string") return block.text;
      if (block.type === "event" && typeof block.body === "string") return `${block.title || "Event"}: ${block.body}`;
      if (block.type === "attachments" && Array.isArray(block.files)) return `Attachments: ${block.files.join(", ")}`;
      if (block.type === "price" && block.amount) return `Harness price released: ${block.amount}`;
      return "";
    })
    .filter(Boolean)
    .join("\n") || fallback;
}

function roleLabel(role: string) {
  if (role === "customer") return "Customer";
  if (role === "easy_harness") return "Easy Harness";
  if (role === "event") return "System event";
  return "System";
}

function normalizeList(value: unknown, fallback: string[] = []) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).slice(0, 12) : fallback;
}

function normalizeIntakeResult(value: Partial<IntakeResult> | Record<string, unknown>): IntakeResult {
  const status = value.status === "accepted" || value.status === "rejected" ? value.status : "needs_info";
  const readiness =
    value.readiness === "ready_for_admin_review" || value.readiness === "not_supported"
      ? value.readiness
      : status === "accepted"
        ? "ready_for_admin_review"
        : status === "rejected"
          ? "not_supported"
          : "needs_clarification";
  const draft = typeof value.factory_draft === "object" && value.factory_draft ? value.factory_draft as Record<string, unknown> : {};

  return {
    status,
    readiness,
    customer_summary: typeof value.customer_summary === "string" && value.customer_summary.trim()
      ? value.customer_summary.trim()
      : "The customer submitted a harness request that needs Easy Harness review.",
    confirmed_facts: normalizeList(value.confirmed_facts),
    assumptions: normalizeList(value.assumptions),
    missing_information: normalizeList(value.missing_information),
    questions_for_user: normalizeList(value.questions_for_user).slice(0, 5),
    attachments_reviewed: normalizeList(value.attachments_reviewed),
    factory_draft: {
      project_title: typeof draft.project_title === "string" ? draft.project_title : "Harness request",
      connection_goal: typeof draft.connection_goal === "string" ? draft.connection_goal : "",
      connection_objects: normalizeList(draft.connection_objects),
      application_type: ["power", "signal", "data", "mixed", "unknown"].includes(String(draft.application_type))
        ? draft.application_type as IntakeResult["factory_draft"]["application_type"]
        : "unknown",
      quantity: typeof draft.quantity === "string" ? draft.quantity : "",
      estimated_length: typeof draft.estimated_length === "string" ? draft.estimated_length : "",
      environment: typeof draft.environment === "string" ? draft.environment : "",
      connector_notes: typeof draft.connector_notes === "string" ? draft.connector_notes : "",
      wire_notes: typeof draft.wire_notes === "string" ? draft.wire_notes : "",
      manufacturing_notes: typeof draft.manufacturing_notes === "string" ? draft.manufacturing_notes : ""
    },
    admin_notes: normalizeList(value.admin_notes),
    risk_flags: normalizeList(value.risk_flags)
  };
}

function buildCustomerMessage(result: IntakeResult) {
  if (result.status === "rejected") {
    return "Thanks for the details. This submission does not yet look like a custom wire harness or connector assembly request. Please start a new request or reply with the devices you need to connect, photos of the connector ends, approximate length, and target quantity.";
  }

  if (result.status === "accepted") {
    return [
      "Thanks. Easy Harness has prepared a first harness draft and there is enough information for review to continue.",
      "The team will review the draft, uploaded files, and manufacturing details before releasing the next update."
    ].join("\n\n");
  }

  const questions = result.questions_for_user.length
    ? result.questions_for_user
    : result.missing_information.slice(0, 5).map((item) => `Please confirm: ${item}`);

  return [
    "Thanks. Easy Harness has prepared a first harness draft, but a few details are still needed before review can continue.",
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    "Reply with whatever you know. If one item is uncertain, say so and Easy Harness will keep narrowing it down."
  ].join("\n\n");
}

function requestStatusFor(result: IntakeResult) {
  if (result.status === "accepted") return "in_review";
  if (result.status === "rejected") return "not_supported";
  return "needs_info";
}

function checkReasonFor(result: IntakeResult) {
  if (result.status === "accepted") return "The request has enough information to enter Easy Harness review.";
  if (result.status === "rejected") return "The submission does not appear to be a wiring harness or connector assembly request.";
  return "The request needs a few more customer details before Easy Harness review can continue.";
}

function summarizeRequestForModel(requestRow: RequestRow, messages: MessageRow[], attachments: Array<AttachmentRow & { storage?: StorageRow }>) {
  return JSON.stringify({
    request: {
      id: requestRow.request_number,
      title: requestRow.title,
      current_status: requestRow.status,
      customer_summary: requestRow.customer_summary,
      previous_check_result: requestRow.check_result || {}
    },
    conversation: messages.map((message) => ({
      role: roleLabel(message.author_role),
      created_at: message.created_at,
      text: textFromBlocks(message.blocks, message.body)
    })),
    attachments: attachments.map((attachment) => ({
      name: attachment.name,
      mime_type: attachment.mime_type,
      size_bytes: attachment.size_bytes,
      purpose: attachment.purpose,
      storage_status: attachment.storage?.status || "metadata_only",
      note: imageTypes.has(attachment.mime_type) ? "Image file is attached and available to Easy Harness staff. DeepSeek V1 uses the filename, MIME type, storage status, and user text; connector visual details should be confirmed by user or staff if not described in text." : "Non-image file is attached and available to Easy Harness staff; use metadata and user text only unless its contents appear in the conversation."
    }))
  }, null, 2);
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("DeepSeek returned an empty intake result.");
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

async function callDeepSeek(inputText: string) {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY") || "";
  const baseUrl = (Deno.env.get("DEEPSEEK_BASE_URL") || "https://api.deepseek.com").replace(/\/$/, "");
  const model = Deno.env.get("DEEPSEEK_MODEL") || "deepseek-v4-pro";
  const reasoningEffort = Deno.env.get("DEEPSEEK_REASONING_EFFORT") || "max";
  const maxTokens = Number(Deno.env.get("DEEPSEEK_MAX_TOKENS") || "12000");

  const jsonShape = JSON.stringify(intakeSchema, null, 2);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: maxTokens,
      thinking: {
        type: "enabled",
        reasoning_effort: reasoningEffort === "high" ? "high" : "max"
      },
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are Easy Harness Intake Agent.",
            "Your job is to convert a non-professional customer description plus uploaded material into a structured wire harness order draft.",
            "Easy Harness serves makers, developers, prototype users, and small-batch customers who may not know harness engineering language.",
            "Do not invent connector models, pinouts, wire gauges, certifications, current ratings, or waterproof levels when evidence is missing.",
            "Separate confirmed facts, assumptions, missing information, customer questions, and manufacturing notes.",
            "Ask at most five user-friendly questions. Prioritize: devices to connect, power/signal/data use, voltage/current, length, quantity, environment, connector photos or model references.",
            "If the request is not about a wire harness, cable, connector assembly, adapter, pigtail, or loom, mark it rejected.",
            "If enough information exists for a human Easy Harness reviewer to continue, mark it accepted even if final quotation, exact materials, or factory confirmation still require staff work.",
            "Return only valid JSON. Do not include Markdown, comments, explanation text, or code fences.",
            "The JSON object must follow this schema shape:",
            jsonShape
          ].join("\n")
        },
        {
          role: "user",
          content: `Analyze this Easy Harness request and return the structured intake result as JSON only.\n\n${inputText}`
        }
      ]
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`DeepSeek request failed (${response.status}): ${raw.slice(0, 1200)}`);
  }

  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned an empty intake result.");
  const parsed = JSON.parse(extractJsonObject(content));
  return {
    model,
    provider: "deepseek",
    reasoningEffort,
    usage: data?.usage || null,
    result: normalizeIntakeResult(parsed)
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<CheckingRequest>(request);
  if (!payload.requestId) {
    return jsonResponse({ ok: false, code: "invalid_checking_request", message: "requestId is required." }, 400);
  }

  const missing = requiredEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEEPSEEK_API_KEY"]);
  if (missing.length) return integrationNotConfigured("ai_intake_checking", missing);

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonResponse({ ok: false, code: "not_authenticated" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return jsonResponse({ ok: false, code: "not_authenticated" }, 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,email,display_name")
    .eq("id", userData.user.id)
    .maybeSingle();

  const lookupColumn = isUuidLike(payload.requestId) ? "id" : "request_number";
  let { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("id,request_number,customer_id,customer_label,title,status,customer_summary,check_status,check_result,files_count,created_at,updated_at")
    .eq(lookupColumn, payload.requestId)
    .maybeSingle();

  if (!requestRow && lookupColumn === "id") {
    const fallback = await supabase
      .from("requests")
      .select("id,request_number,customer_id,customer_label,title,status,customer_summary,check_status,check_result,files_count,created_at,updated_at")
      .eq("request_number", payload.requestId)
      .maybeSingle();
    requestRow = fallback.data;
    requestError = fallback.error;
  }

  if (requestError) return jsonResponse({ ok: false, code: "request_lookup_failed", message: requestError.message }, 500);
  if (!requestRow) return jsonResponse({ ok: false, code: "request_not_found" }, 404);

  const role = profile?.role || "customer";
  const hasAccess = requestRow.customer_id === userData.user.id || ["staff", "admin"].includes(role);
  if (!hasAccess) return jsonResponse({ ok: false, code: "forbidden" }, 403);

  if (!supportedStatus.has(requestRow.status) && !payload.force) {
    return jsonResponse({
      ok: false,
      code: "request_state_not_checkable",
      requestId: requestRow.id,
      status: requestRow.status,
      message: "This request is already past intake checking."
    }, 409);
  }

  const { data: messages, error: messagesError } = await supabase
    .from("request_messages")
    .select("id,author_role,body,blocks,created_at")
    .eq("request_id", requestRow.id)
    .order("created_at", { ascending: true })
    ;

  if (messagesError) return jsonResponse({ ok: false, code: "messages_lookup_failed", message: messagesError.message }, 500);

  const latestMessage = messages?.[messages.length - 1];
  if (!payload.force && latestMessage && latestMessage.author_role !== "customer" && requestRow.check_status !== "pending") {
    return jsonResponse({
      ok: true,
      skipped: true,
      code: "no_new_customer_input",
      requestId: requestRow.id,
      requestNumber: requestRow.request_number,
      status: requestRow.status,
      checkStatus: requestRow.check_status,
      checkResult: requestRow.check_result
    });
  }

  const { data: attachments, error: attachmentsError } = await supabase
    .from("attachments")
    .select("id,name,mime_type,size_bytes,storage_object_id,purpose,created_at")
    .eq("request_id", requestRow.id)
    .order("created_at", { ascending: true })
    ;

  if (attachmentsError) return jsonResponse({ ok: false, code: "attachments_lookup_failed", message: attachmentsError.message }, 500);

  const storageIds = [...new Set((attachments || []).map((item) => item.storage_object_id).filter(Boolean))] as string[];
  const { data: storageRows } = storageIds.length
    ? await supabase
        .from("storage_objects")
        .select("id,bucket,object_path,status,content_type,size_bytes")
        .in("id", storageIds)

    : { data: [] as StorageRow[] };
  const storageById = new Map((storageRows || []).map((item) => [item.id, item]));
  const attachmentsWithStorage = (attachments || []).map((attachment) => ({
    ...attachment,
    storage: attachment.storage_object_id ? storageById.get(attachment.storage_object_id) : undefined
  }));

  try {
    await supabase
      .from("requests")
      .update({ status: "checking", check_status: "pending" })
      .eq("id", requestRow.id);

    const modelInput = summarizeRequestForModel(requestRow, messages || [], attachmentsWithStorage);
    const { model, provider, reasoningEffort, usage, result } = await callDeepSeek(modelInput);
    const checkedAt = new Date().toISOString();
    const nextStatus = requestStatusFor(result);
    const customerMessage = buildCustomerMessage(result);
    const checkResult = {
      ...result,
      status: result.status,
      adapter: adapterId,
      model,
      provider,
      reasoning_effort: reasoningEffort,
      usage,
      reason: checkReasonFor(result),
      missing: result.missing_information,
      questions: result.questions_for_user,
      checkedAt,
      version: 1,
      trigger: payload.trigger || "manual",
      source: {
        request_id: requestRow.id,
        request_number: requestRow.request_number,
        message_count: messages?.length || 0,
        attachment_count: attachments?.length || 0,
        image_count_sent_to_model: 0
      }
    };

    const { error: updateError } = await supabase
      .from("requests")
      .update({
        status: nextStatus,
        check_status: result.status,
        check_result: checkResult,
        customer_summary: result.customer_summary || requestRow.customer_summary || ""
      })
      .eq("id", requestRow.id);

    if (updateError) throw new Error(`Could not update request: ${updateError.message}`);

    const { error: messageInsertError } = await supabase
      .from("request_messages")
      .insert({
        request_id: requestRow.id,
        author_id: null,
        author_role: "easy_harness",
        body: customerMessage,
        blocks: [{ type: "text", text: customerMessage }],
        visibility: "thread"
      });

    if (messageInsertError) throw new Error(`Could not insert Easy Harness message: ${messageInsertError.message}`);

    await supabase.from("integration_events").insert({
      adapter: adapterId,
      action: `check_${result.status}`,
      target_type: "request",
      target_id: requestRow.id,
      detail: checkReasonFor(result),
      payload: { requestNumber: requestRow.request_number, trigger: payload.trigger || "manual", model, provider }
    });

    return jsonResponse({
      ok: true,
      requestId: requestRow.id,
      requestNumber: requestRow.request_number,
      status: nextStatus,
      checkStatus: result.status,
      readiness: result.readiness,
      checkResult,
      message: customerMessage
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown checking error";
    await supabase.from("integration_events").insert({
      adapter: adapterId,
      action: "check_failed",
      target_type: "request",
      target_id: requestRow.id,
      detail: message,
      payload: { requestNumber: requestRow.request_number, trigger: payload.trigger || "manual" }
    });
    await supabase
      .from("requests")
      .update({
        status: "needs_info",
        check_status: "needs_info",
        check_result: {
          status: "needs_info",
          adapter: adapterId,
          reason: "Easy Harness could not finish automatic intake checking. Staff can review the request manually.",
          missing: ["manual review"],
          checkedAt: new Date().toISOString(),
          error: message
        }
      })
      .eq("id", requestRow.id);

    return jsonResponse({ ok: false, code: "ai_checking_failed", requestId: requestRow.id, message }, 500);
  }
});
