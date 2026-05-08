import { integrationNotConfigured, jsonResponse, optionsResponse, readJson, requiredEnv } from "../_shared/response.ts";

type PaymentRequest = {
  orderId?: string;
  provider?: "stripe" | "paypal" | "bank_transfer";
  amount?: number;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<PaymentRequest>(request);
  const provider = payload.provider || "stripe";

  if (!payload.orderId || !payload.amount || !payload.currency) {
    return jsonResponse({ ok: false, code: "invalid_payment_request" }, 400);
  }

  if (provider === "bank_transfer") {
    return jsonResponse({
      ok: true,
      provider,
      orderId: payload.orderId,
      status: "bank_transfer_pending",
      bankReference: `BT-${payload.orderId}`,
      nextStep: "Show bank transfer instructions and wait for staff receipt confirmation."
    });
  }

  const missing = provider === "paypal"
    ? requiredEnv(["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "APP_BASE_URL"])
    : requiredEnv(["STRIPE_SECRET_KEY", "APP_BASE_URL"]);

  if (missing.length) return integrationNotConfigured(provider, missing);

  return jsonResponse({
    ok: false,
    code: "provider_call_not_enabled",
    provider,
    orderId: payload.orderId,
    nextStep: "Provider credentials are present. Implement the live Checkout/PayPal order call in this function."
  }, 501);
});
