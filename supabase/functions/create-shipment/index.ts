import { integrationNotConfigured, jsonResponse, optionsResponse, readJson, requiredEnv } from "../_shared/response.ts";

type ShipmentRequest = {
  orderId?: string;
  selectedRateId?: string;
  customs?: {
    hsCode?: string;
    productName?: string;
    declaredValue?: number;
    originCountry?: string;
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<ShipmentRequest>(request);
  if (!payload.orderId || !payload.selectedRateId) {
    return jsonResponse({ ok: false, code: "invalid_shipment_request" }, 400);
  }

  if (!payload.customs?.hsCode || !payload.customs?.productName || !payload.customs?.declaredValue) {
    return jsonResponse({
      ok: false,
      code: "customs_data_required",
      missing: ["hsCode", "productName", "declaredValue"],
      nextStep: "Complete the shipment customs template before creating a DHL label."
    }, 400);
  }

  const missing = requiredEnv(["DHL_API_KEY", "DHL_API_SECRET", "DHL_ACCOUNT_NUMBER", "DHL_SHIPPER_ACCOUNT"]);
  if (missing.length) return integrationNotConfigured("dhl_express_shipment", missing);

  return jsonResponse({
    ok: false,
    code: "dhl_shipment_call_not_enabled",
    orderId: payload.orderId,
    nextStep: "Call DHL create-shipment API, persist shipments, label URL, invoice URL, and initial tracking event."
  }, 501);
});
