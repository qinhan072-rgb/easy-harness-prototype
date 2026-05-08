import { integrationNotConfigured, jsonResponse, optionsResponse, readJson, requiredEnv } from "../_shared/response.ts";

type NotificationRequest = {
  userId?: string;
  role?: "customer" | "staff" | "admin";
  title?: string;
  body?: string;
  channels?: Array<"in_app" | "email" | "whatsapp" | "sms">;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<NotificationRequest>(request);
  if ((!payload.userId && !payload.role) || !payload.title || !payload.body) {
    return jsonResponse({ ok: false, code: "invalid_notification_request" }, 400);
  }

  const requested = payload.channels || ["in_app"];
  const missing = [
    ...(requested.includes("email") ? requiredEnv(["EMAIL_FROM", "EMAIL_PROVIDER_API_KEY"]) : []),
    ...(requested.includes("whatsapp") ? requiredEnv(["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"]) : [])
  ];

  if (missing.length) return integrationNotConfigured("external_notifications", missing);

  return jsonResponse({
    ok: false,
    code: "notification_provider_call_not_enabled",
    channels: requested,
    nextStep: "Persist notifications, create delivery attempts, and route email/WhatsApp/SMS through the selected provider."
  }, 501);
});
