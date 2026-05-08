import { integrationNotConfigured, jsonResponse, optionsResponse, readJson, requiredEnv } from "../_shared/response.ts";

type RateRequest = {
  orderId?: string;
  origin?: Record<string, unknown>;
  destination?: Record<string, unknown>;
  packageEstimate?: Record<string, unknown>;
  incoterm?: "DAP";
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<RateRequest>(request);
  if (!payload.orderId || !payload.destination || !payload.packageEstimate) {
    return jsonResponse({ ok: false, code: "invalid_shipping_rate_request" }, 400);
  }

  const missing = requiredEnv(["DHL_API_KEY", "DHL_API_SECRET", "DHL_ACCOUNT_NUMBER"]);
  if (missing.length) return integrationNotConfigured("dhl_express_rates", missing);

  return jsonResponse({
    ok: false,
    code: "dhl_rate_call_not_enabled",
    orderId: payload.orderId,
    incoterm: payload.incoterm || "DAP",
    nextStep: "Use DHL Express rating API, persist shipping_rate_quotes, and return available services for checkout."
  }, 501);
});
