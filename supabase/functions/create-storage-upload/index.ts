import { integrationNotConfigured, jsonResponse, optionsResponse, readJson, requiredEnv } from "../_shared/response.ts";

type UploadRequest = {
  requestId?: string;
  orderId?: string;
  files?: Array<{
    name: string;
    sizeBytes: number;
    contentType: string;
  }>;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const payload = await readJson<UploadRequest>(request);
  if ((!payload.requestId && !payload.orderId) || !payload.files?.length) {
    return jsonResponse({ ok: false, code: "invalid_storage_upload_request" }, 400);
  }

  const missing = requiredEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  if (missing.length) return integrationNotConfigured("supabase_storage_signed_upload", missing);

  return jsonResponse({
    ok: false,
    code: "signed_upload_call_not_enabled",
    fileCount: payload.files.length,
    nextStep: "Create private storage_objects and attachments, then return signed upload URLs for the client."
  }, 501);
});
