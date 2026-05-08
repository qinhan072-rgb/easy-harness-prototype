import { integrationNotConfigured, jsonResponse, optionsResponse, readJson, requiredEnv } from "../_shared/response.ts";

type TrackingRequest = {
  shipmentId?: string;
  trackingNumber?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<TrackingRequest>(request);
  if (!payload.shipmentId && !payload.trackingNumber) {
    return jsonResponse({ ok: false, code: "tracking_reference_required" }, 400);
  }

  const missing = requiredEnv(["DHL_API_KEY", "DHL_API_SECRET"]);
  if (missing.length) return integrationNotConfigured("dhl_express_tracking", missing);

  return jsonResponse({
    ok: false,
    code: "dhl_tracking_call_not_enabled",
    shipmentId: payload.shipmentId,
    trackingNumber: payload.trackingNumber,
    nextStep: "Call DHL tracking API, upsert tracking_events, and update shipment/order fulfillment status."
  }, 501);
});
