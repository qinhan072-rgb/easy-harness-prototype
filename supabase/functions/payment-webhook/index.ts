import { integrationNotConfigured, jsonResponse, optionsResponse, requiredEnv } from "../_shared/response.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") || "stripe";
  const missing = provider === "paypal"
    ? requiredEnv(["PAYPAL_WEBHOOK_ID", "SUPABASE_SERVICE_ROLE_KEY"])
    : requiredEnv(["STRIPE_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY"]);

  if (missing.length) return integrationNotConfigured(`${provider}_webhook`, missing);

  return jsonResponse({
    ok: false,
    code: "webhook_verification_not_enabled",
    provider,
    nextStep: "Verify provider signature, upsert payment_events, update payments, and move paid orders into production scheduling."
  }, 501);
});
