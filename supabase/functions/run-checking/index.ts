import { integrationNotConfigured, jsonResponse, optionsResponse, readJson, requiredEnv } from "../_shared/response.ts";

type CheckingRequest = {
  requestId?: string;
  files?: Array<{ name: string; contentType?: string; sizeBytes?: number }>;
  description?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<CheckingRequest>(request);
  if (!payload.requestId || !payload.files?.length) {
    return jsonResponse({ ok: false, code: "invalid_checking_request" }, 400);
  }

  const missing = requiredEnv(["OPENAI_API_KEY"]);
  if (missing.length) return integrationNotConfigured("ai_intake_checking", missing);

  return jsonResponse({
    ok: false,
    code: "ai_checking_call_not_enabled",
    requestId: payload.requestId,
    nextStep: "Use the approved harness intake prompt, persist validation_results, and append the customer-facing result to the request thread."
  }, 501);
});
