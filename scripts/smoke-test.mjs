import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const appPath = resolve(root, "src", "App.jsx");
const supabaseClientPath = resolve(root, "src", "supabaseClient.js");
const packagePath = resolve(root, "package.json");
const distIndex = resolve(root, "dist", "index.html");
const schemaPath = resolve(root, "supabase", "migrations", "202605080001_stage_2a_schema.sql");
const rlsPath = resolve(root, "supabase", "migrations", "202605080002_stage_2a_rls.sql");
const hardeningPath = resolve(root, "supabase", "migrations", "202605080003_stage_2a_security_hardening.sql");
const rlsGrantPath = resolve(root, "supabase", "migrations", "202605100001_stage_2a_rls_function_grants.sql");
const checkingRpcPath = resolve(root, "supabase", "migrations", "202605100002_complete_request_check_rpc.sql");
const confirmOrderRpcPath = resolve(root, "supabase", "migrations", "202605100003_confirm_request_order_rpc.sql");
const paymentRpcPath = resolve(root, "supabase", "migrations", "202605100004_order_payment_rpc.sql");
const notificationAuditRpcPath = resolve(root, "supabase", "migrations", "202605100005_notifications_audit_rpc.sql");
const storagePolicyPath = resolve(root, "supabase", "migrations", "202605100006_storage_upload_policies.sql");
const envExamplePath = resolve(root, ".env.example");
const stage2DocPath = resolve(root, "docs", "STAGE_2A_BACKEND_READINESS.md");
const authSetupDocPath = resolve(root, "docs", "AUTH_EMAIL_AND_GOOGLE_SETUP.md");
const paymentFunctionPath = resolve(root, "supabase", "functions", "create-payment-session", "index.ts");
const shippingFunctionPath = resolve(root, "supabase", "functions", "quote-shipping-rates", "index.ts");
const shipmentFunctionPath = resolve(root, "supabase", "functions", "create-shipment", "index.ts");
const storageFunctionPath = resolve(root, "supabase", "functions", "create-storage-upload", "index.ts");
const checkingFunctionPath = resolve(root, "supabase", "functions", "run-checking", "index.ts");

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const app = readFileSync(appPath, "utf8");
const supabaseClient = readIfExists(supabaseClientPath);
const packageJson = readIfExists(packagePath);
const schemaSql = readIfExists(schemaPath);
const rlsSql = readIfExists(rlsPath);
const hardeningSql = readIfExists(hardeningPath);
const rlsGrantSql = readIfExists(rlsGrantPath);
const checkingRpcSql = readIfExists(checkingRpcPath);
const confirmOrderRpcSql = readIfExists(confirmOrderRpcPath);
const paymentRpcSql = readIfExists(paymentRpcPath);
const notificationAuditRpcSql = readIfExists(notificationAuditRpcPath);
const storagePolicySql = readIfExists(storagePolicyPath);
const envExample = readIfExists(envExamplePath);
const stage2Doc = readIfExists(stage2DocPath);
const authSetupDoc = readIfExists(authSetupDocPath);
const paymentFunction = readIfExists(paymentFunctionPath);
const shippingFunction = readIfExists(shippingFunctionPath);
const shipmentFunction = readIfExists(shipmentFunctionPath);
const storageFunction = readIfExists(storageFunctionPath);
const checkingFunction = readIfExists(checkingFunctionPath);

const checks = [
  {
    name: "production build output exists",
    pass: existsSync(distIndex)
  },
  {
    name: "attachment metadata table is present",
    pass: app.includes("easy-harness.attachments")
  },
  {
    name: "auth session ledger is present",
    pass: app.includes("easy-harness.authSession") &&
      app.includes("signInWithEmailAdapter") &&
      app.includes("createCustomerAccountAdapter") &&
      app.includes("clearAuthSessionAdapter")
  },
  {
    name: "supabase auth client is wired for hosted login",
    pass: packageJson.includes("@supabase/supabase-js") &&
      supabaseClient.includes("createClient") &&
      supabaseClient.includes("VITE_SUPABASE_URL") &&
      supabaseClient.includes("VITE_SUPABASE_PUBLISHABLE_KEY") &&
      supabaseClient.includes("hostedAuthRequired") &&
      app.includes("supabase.auth.signInWithOtp") &&
      app.includes("syncSupabaseSession") &&
      app.includes("supabase.auth.signOut") &&
      app.includes("Account access is not available yet")
  },
  {
    name: "supabase request data path is wired",
    pass: app.includes("loadSupabaseRequestData") &&
      app.includes("createSupabaseRequestBundle") &&
      app.includes("supabaseRequestInsertFromLocal") &&
      app.includes("supabaseMessageInsertFromLocal") &&
      app.includes("updateSupabaseRequestFromLocal") &&
      app.includes('supabase.rpc("complete_request_check"') &&
      app.includes("requests (Supabase live)") &&
      app.includes("attachments (Supabase live metadata)")
  },
  {
    name: "supabase staff quote data path is wired",
    pass: app.includes("persistSupabaseStaffRequestUpdate") &&
      app.includes("supabaseQuoteInsertFromLocal") &&
      app.includes("localQuoteFromSupabase") &&
      app.includes(".from(\"quotes\")") &&
      app.includes("active_quote_id")
  },
  {
    name: "supabase order confirmation path is wired",
    pass: app.includes("confirmSupabaseRequestOrder") &&
      app.includes('supabase.rpc("confirm_request_order"') &&
      app.includes("loadSupabaseOrderData") &&
      app.includes("localOrderFromSupabase") &&
      app.includes(".from(\"orders\")")
  },
  {
    name: "supabase payment record path is wired",
    pass: app.includes("persistSupabasePayment") &&
      app.includes('supabase.rpc("record_order_payment"') &&
      app.includes("paymentProviderKey") &&
      app.includes("payment_recorded")
  },
  {
    name: "supabase staff fulfillment path is wired",
    pass: app.includes("persistSupabaseStaffOrderUpdate") &&
      app.includes(".from(\"shipments\")") &&
      app.includes(".from(\"tracking_events\")") &&
      app.includes("staff_order_updated")
  },
  {
    name: "supabase order message notification audit paths are wired",
    pass: app.includes("persistSupabaseOrderMessage") &&
      app.includes(".from(\"order_messages\")") &&
      app.includes('supabase.rpc("record_platform_notification"') &&
      app.includes('supabase.rpc("record_platform_audit"') &&
      app.includes("loadSupabaseNotificationData")
  },
  {
    name: "supabase storage upload path is wired",
    pass: app.includes("persistSupabaseAttachments") &&
      app.includes(".storage") &&
      app.includes(".from(\"request-attachments\")") &&
      app.includes("supabaseStorageObjectInsertFromAttachment") &&
      app.includes("storage_object_id")
  },
  {
    name: "storage object ledger is present",
    pass: app.includes("easy-harness.storageObjects") &&
      app.includes("createStorageUploadAdapter") &&
      app.includes("storage_upload_contract_created")
  },
  {
    name: "request message ledger is present",
    pass: app.includes("easy-harness.requestMessages")
  },
  {
    name: "quote ledger is present",
    pass: app.includes("easy-harness.quotes")
  },
  {
    name: "notification table is present",
    pass: app.includes("easy-harness.notifications")
  },
  {
    name: "notification delivery ledger is present",
    pass: app.includes("easy-harness.notificationDeliveries")
  },
  {
    name: "audit log table is present",
    pass: app.includes("easy-harness.auditLogs")
  },
  {
    name: "service event table is present",
    pass: app.includes("easy-harness.serviceEvents")
  },
  {
    name: "order table is present",
    pass: app.includes("easy-harness.orders")
  },
  {
    name: "payment shipment and order-message ledgers are present",
    pass: app.includes("easy-harness.payments") &&
      app.includes("easy-harness.shipments") &&
      app.includes("easy-harness.orderMessages")
  },
  {
    name: "backend-shaped ledger helpers are present",
    pass: app.includes("requestMessageRecord") &&
      app.includes("paymentLedgerRecord") &&
      app.includes("shipmentLedgerRecord") &&
      app.includes("mergeById")
  },
  {
    name: "local adapters expose future API handoff points",
    pass: app.includes("platformAdapters") &&
      app.includes("apiReplacementMap") &&
      app.includes("managed-identity-session") &&
      app.includes("server-database-and-row-security") &&
      app.includes("hosted-provider-session-and-webhook") &&
      app.includes("carrier-rate-and-tracking-api")
  },
  {
    name: "adapter replacement functions are explicit",
    pass: app.includes("signInWithEmailAdapter") &&
      app.includes("createCustomerAccountAdapter") &&
      app.includes("createStorageUploadAdapter") &&
      app.includes("runCheckingAdapter") &&
      app.includes("createPaymentSessionAdapter") &&
      app.includes("confirmPaymentCallbackAdapter") &&
      app.includes("quoteShippingRatesAdapter") &&
      app.includes("buildShipmentUpdateAdapter") &&
      app.includes("routeNotificationAdapter")
  },
  {
    name: "checking flow supports accepted needs-info and rejected outcomes",
    pass: app.includes("accepted | needs_info | rejected") &&
      app.includes("More details needed") &&
      app.includes("Unable to review")
  },
  {
    name: "quotes are versioned separately from checkout costs",
    pass: app.includes("createQuoteRecord") &&
      app.includes("Harness assembly only") &&
      app.includes("confirmedQuoteId")
  },
  {
    name: "order checkout includes DAP tax boundary",
    pass: app.includes("Import duties / taxes are not collected at checkout")
  },
  {
    name: "checkout exposes provider-specific payment paths",
    pass: app.includes("Pay with card") && app.includes("PayPal") && app.includes("Bank transfer")
  },
  {
    name: "payment uses provider session shape before confirmation",
    pass: app.includes("paymentSession") &&
      app.includes("payment_pending") &&
      app.includes("payment_callback_confirmed")
  },
  {
    name: "payment session writes payment ledger",
    pass: app.includes("writePaymentLedger") &&
      app.includes("payrec_")
  },
  {
    name: "checkout does not use one generic pay-now button",
    pass: !app.includes("Pay now")
  },
  {
    name: "checkout no longer exposes simulated provider success text",
    pass: !app.includes("Simulate provider success")
  },
  {
    name: "order page includes after-sales policy",
    pass: app.includes("After-sales policy")
  },
  {
    name: "order includes lightweight message thread",
    pass: app.includes("OrderMessagePanel") &&
      app.includes("order_message_added")
  },
  {
    name: "admin exposes backend data model view",
    pass: app.includes("Backend-shaped local tables") &&
      app.includes("Data model") &&
      app.includes("futureTable") &&
      app.includes("API replacement map") &&
      app.includes("Database schema blueprint") &&
      app.includes("databaseSchemaBlueprint")
  },
  {
    name: "order checkout does not show production progress steps",
    pass: !app.includes("<OrderProgress status={order.status}")
  },
  {
    name: "request submission requires a file",
    pass: app.includes("Please upload at least one design file before submitting.")
  },
  {
    name: "visitor can enter customer workspace before login",
    pass: !app.includes("return <LoginScreen") &&
      app.includes("Log in") &&
      app.includes("Create account") &&
      app.includes("openAuthModal")
  },
  {
    name: "request submit gates authentication while preserving draft",
    pass: app.includes("Sign in or create an account to submit this request.") &&
      app.includes("submit_request") &&
      app.includes("completeAuthFlow")
  },
  {
    name: "public registration creates customer accounts only",
    pass: app.includes("Create account") &&
      app.includes("customer_account_created") &&
      app.includes('role: "customer"')
  },
  {
    name: "account menu owns sign out",
    pass: app.includes("account-menu") &&
      app.includes("My requests") &&
      app.includes("My orders") &&
      !app.includes("signin-button subtle\" onClick={signOut}>Sign out")
  },
  {
    name: "connected account sign-in paths are reserved",
    pass: app.includes("signInWithGoogle") &&
      app.includes("supabase.auth.signInWithOAuth") &&
      app.includes('provider: "google"') &&
      app.includes("Continue with Google") &&
      app.includes("secure email sign-in link")
  },
  {
    name: "auth email confirmation state is explicit",
    pass: app.includes("Check your email") &&
      app.includes("We sent a secure link") &&
      app.includes("Use another email") &&
      app.includes("MailCheck")
  },
  {
    name: "visitor sidebar hides private history lanes",
    pass: app.includes("showPrivateNav") &&
      app.includes("Recent requests") &&
      app.includes("Log in or create an account to save requests and orders.")
  },
  {
    name: "customer request thread prompts missing intake details",
    pass: app.includes("Details Easy Harness still needs") &&
      app.includes("formatMissingInfoItem") &&
      app.includes("Reply in the thread with what you know")
  },
  {
    name: "checkout is personal-user first",
    pass: app.includes("Add business import details") &&
      app.includes("Only needed if the carrier or customs asks for a company or tax number.") &&
      !app.includes('placeholder="Optional for business import"')
  },
  {
    name: "checkout includes clear payment confirmation rules",
    pass: app.includes("Payment confirmation") &&
      app.includes("What payment confirms") &&
      app.includes("Address changes") &&
      app.includes("Cancellation")
  },
  {
    name: "large files are rejected",
    pass: app.includes("is larger than 25 MB")
  },
  {
    name: "user-facing implementation leaks are absent",
    pass: !/(specialist|prototype|Auth provider|User view|User app)/i.test(app)
  },
  {
    name: "staff order console includes fulfillment controls",
    pass: app.includes("Delivery and shipping") &&
      app.includes("Shipment tracking") &&
      app.includes("Save payment state")
  },
  {
    name: "staff queues are grouped by real work lanes",
    pass: app.includes("Needs customer details") &&
      app.includes("Needs price review") &&
      app.includes("Payment needed") &&
      app.includes("requestNextAction") &&
      app.includes("orderNextAction")
  },
  {
    name: "admin opens on a business dashboard",
    pass: app.includes('useState("dashboard")') &&
      app.includes("Business dashboard") &&
      app.includes("Needs attention")
  },
  {
    name: "admin shows stage 2A backend readiness",
    pass: app.includes("Backend readiness") &&
      app.includes("Supabase Auth") &&
      app.includes("DHL Express API first") &&
      app.includes("integrationReadinessRows")
  },
  {
    name: "stage 2A supabase schema migration exists",
    pass: schemaSql.includes("create table if not exists public.profiles") &&
      schemaSql.includes("create table if not exists public.requests") &&
      schemaSql.includes("create table if not exists public.orders") &&
      schemaSql.includes("create table if not exists public.shipping_rate_quotes") &&
      schemaSql.includes("create table if not exists public.service_countries")
  },
  {
    name: "stage 2A rls migration protects role boundaries",
    pass: rlsSql.includes("enable row level security") &&
      rlsSql.includes("public.is_staff_or_admin") &&
      rlsSql.includes("Only admins can change profile role") &&
      rlsSql.includes("requests_select_owner_or_staff") &&
      rlsSql.includes("audit_logs_admin_select")
  },
  {
    name: "stage 2A security hardening migration exists",
    pass: hardeningSql.includes("alter extension citext set schema extensions") &&
      hardeningSql.includes("set search_path = public") &&
      hardeningSql.includes("revoke execute on function public.is_admin()")
  },
  {
    name: "stage 2A rls helper grants allow authenticated policies",
    pass: rlsGrantSql.includes("grant execute on function public.current_profile_role() to authenticated") &&
      rlsGrantSql.includes("grant execute on function public.is_admin() to authenticated") &&
      rlsGrantSql.includes("grant execute on function public.is_staff_or_admin() to authenticated")
  },
  {
    name: "stage 2A checking rpc persists system messages",
    pass: checkingRpcSql.includes("create or replace function public.complete_request_check") &&
      checkingRpcSql.includes("security definer") &&
      checkingRpcSql.includes("request_messages") &&
      checkingRpcSql.includes("grant execute on function public.complete_request_check")
  },
  {
    name: "stage 2A order confirmation rpc creates checkout orders",
    pass: confirmOrderRpcSql.includes("create or replace function public.confirm_request_order") &&
      confirmOrderRpcSql.includes("returns public.orders") &&
      confirmOrderRpcSql.includes("insert into public.orders") &&
      confirmOrderRpcSql.includes("status = 'confirmed'") &&
      confirmOrderRpcSql.includes("grant execute on function public.confirm_request_order")
  },
  {
    name: "stage 2A payment rpc records checkout payment state",
    pass: paymentRpcSql.includes("create or replace function public.record_order_payment") &&
      paymentRpcSql.includes("returns public.payments") &&
      paymentRpcSql.includes("insert into public.payments") &&
      paymentRpcSql.includes("insert into public.payment_events") &&
      paymentRpcSql.includes("grant execute on function public.record_order_payment")
  },
  {
    name: "stage 2A notification and audit rpcs record platform events",
    pass: notificationAuditRpcSql.includes("create or replace function public.record_platform_notification") &&
      notificationAuditRpcSql.includes("insert into public.notification_deliveries") &&
      notificationAuditRpcSql.includes("create or replace function public.record_platform_audit") &&
      notificationAuditRpcSql.includes("insert into public.audit_logs") &&
      notificationAuditRpcSql.includes("grant execute on function public.record_platform_audit")
  },
  {
    name: "stage 2A storage bucket policies allow private uploads",
    pass: storagePolicySql.includes("insert into storage.buckets") &&
      storagePolicySql.includes("'request-attachments'") &&
      storagePolicySql.includes("on storage.objects for insert") &&
      storagePolicySql.includes("storage_objects_customer_insert_own_path")
  },
  {
    name: "stage 2A edge function contracts exist",
    pass: paymentFunction.includes("STRIPE_SECRET_KEY") &&
      paymentFunction.includes("PAYPAL_CLIENT_ID") &&
      shippingFunction.includes("DHL_ACCOUNT_NUMBER") &&
      shipmentFunction.includes("customs_data_required") &&
      storageFunction.includes("signed_upload_call_not_enabled") &&
      checkingFunction.includes("OPENAI_API_KEY")
  },
  {
    name: "stage 2A env template names offline credentials",
    pass: envExample.includes("VITE_SUPABASE_URL") &&
      envExample.includes("VITE_SUPABASE_PUBLISHABLE_KEY") &&
      envExample.includes("SUPABASE_SERVICE_ROLE_KEY") &&
      envExample.includes("PAYPAL_CLIENT_SECRET") &&
      envExample.includes("DHL_SHIPPER_ACCOUNT") &&
      envExample.includes("WHATSAPP_ACCESS_TOKEN")
  },
  {
    name: "stage 2A readiness doc separates code from offline resources",
    pass: stage2Doc.includes("Offline Resources Still Required") &&
      stage2Doc.includes("PayPal China merchant account") &&
      stage2Doc.includes("DHL Express China account") &&
      stage2Doc.includes("HS code") &&
      stage2Doc.includes("What Should Wait")
  },
  {
    name: "auth setup doc includes email templates and google checklist",
    pass: authSetupDoc.includes("Confirm your Easy Harness account") &&
      authSetupDoc.includes("Your Easy Harness sign-in link") &&
      authSetupDoc.includes("{{ .ConfirmationURL }}") &&
      authSetupDoc.includes("Google OAuth") &&
      authSetupDoc.includes("/auth/v1/callback")
  },
  {
    name: "notifications are channel-ready",
    pass: app.includes("notificationChannels") &&
      app.includes("whatsapp") &&
      app.includes("notification_routed")
  },
  {
    name: "paid order page has a dedicated status view",
    pass: app.includes("Order status") &&
      app.includes("Shipping and tracking") &&
      app.includes("Production") &&
      app.includes("Confirmed order")
  },
  {
    name: "orders list separates payment-needed from active orders",
    pass: app.includes("Payment needed") && app.includes("Active orders") && app.includes("Completed")
  }
];

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failed.length) {
  process.exitCode = 1;
}
