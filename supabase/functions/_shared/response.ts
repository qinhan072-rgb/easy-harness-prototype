export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, paypal-transmission-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

export function optionsResponse(): Response {
  return new Response("ok", { headers: corsHeaders });
}

export function requiredEnv(names: string[]): string[] {
  return names.filter((name) => !Deno.env.get(name));
}

export function integrationNotConfigured(service: string, missing: string[]): Response {
  return jsonResponse({
    ok: false,
    code: "integration_not_configured",
    service,
    missing,
    nextStep: "Add the provider account credentials as Supabase function secrets, then replace test mode with live provider calls."
  }, 503);
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    return {} as T;
  }
}
