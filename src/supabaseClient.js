import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const hostedAuthRequired = Boolean(
  import.meta.env.VITE_VERCEL_ENV ||
  (
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  )
);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce"
      }
    })
  : null;

export function getAuthRedirectUrl() {
  if (typeof window !== "undefined") {
    const pathname =
      window.location.pathname && window.location.pathname !== "/"
        ? window.location.pathname.replace(/\/index\.html$/, "/")
        : "";
    return `${window.location.origin}${pathname}`.replace(/\/$/, "");
  }

  return (import.meta.env.VITE_APP_BASE_URL || "").trim().replace(/\/$/, "");
}
