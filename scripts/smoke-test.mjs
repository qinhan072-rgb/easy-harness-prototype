import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const appPath = resolve(root, "src", "App.jsx");
const supabaseClientPath = resolve(root, "src", "supabaseClient.js");
const packagePath = resolve(root, "package.json");
const appIndexPath = resolve(root, "index.html");
const schemaPath = resolve(root, "supabase", "migrations", "202605080001_stage_2a_schema.sql");
const rlsPath = resolve(root, "supabase", "migrations", "202605080002_stage_2a_rls.sql");
const hardeningPath = resolve(root, "supabase", "migrations", "202605080003_stage_2a_security_hardening.sql");
const rlsGrantPath = resolve(root, "supabase", "migrations", "202605100001_stage_2a_rls_function_grants.sql");
const checkingRpcPath = resolve(root, "supabase", "migrations", "202605100002_complete_request_check_rpc.sql");
const confirmOrderRpcPath = resolve(root, "supabase", "migrations", "202605100003_confirm_request_order_rpc.sql");
const paymentRpcPath = resolve(root, "supabase", "migrations", "202605100004_order_payment_rpc.sql");
const marketplacePaymentRpcPath = resolve(root, "supabase", "migrations", "202605140002_marketplace_protected_payment.sql");
const notificationAuditRpcPath = resolve(root, "supabase", "migrations", "202605100005_notifications_audit_rpc.sql");
const storagePolicyPath = resolve(root, "supabase", "migrations", "202605100006_storage_upload_policies.sql");
const attachmentPathRpcPath = resolve(root, "supabase", "migrations", "202605140001_workspace_attachment_storage_paths.sql");
const envExamplePath = resolve(root, ".env.example");
const gitignorePath = resolve(root, ".gitignore");
const stage2DocPath = resolve(root, "docs", "setup", "STAGE_2A_BACKEND_READINESS.md");
const authSetupDocPath = resolve(root, "docs", "setup", "AUTH_EMAIL_AND_GOOGLE_SETUP.md");
const aiAgentPrinciplesPath = resolve(root, "docs", "ai-agent", "AI_AGENT_PRINCIPLES.md");
const visualDraftAgentSpecPath = resolve(root, "docs", "ai-agent", "VISUAL_DRAFT_AGENT_SPEC.md");
const visualDraftAgentEvalPath = resolve(root, "docs", "ai-agent", "evals", "visual_draft_agent_v0_1.json");
const repositoryBoundaryDocPath = resolve(root, "docs", "setup", "REPOSITORY_BOUNDARY.md");
const paymentFunctionPath = resolve(root, "supabase", "functions", "create-payment-session", "index.ts");
const shippingFunctionPath = resolve(root, "supabase", "functions", "quote-shipping-rates", "index.ts");
const shipmentFunctionPath = resolve(root, "supabase", "functions", "create-shipment", "index.ts");
const storageFunctionPath = resolve(root, "supabase", "functions", "create-storage-upload", "index.ts");
const checkingFunctionPath = resolve(root, "supabase", "functions", "run-checking", "index.ts");
const agentDraftLabApiPath = resolve(root, "scripts", "agent-draft-lab-api.mjs");
const agentDraftLabPath = resolve(root, "src", "AgentDraftLab.jsx");
const agentDraftLabEvalPath = resolve(root, "scripts", "agent-draft-lab-eval.mjs");

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const app = readFileSync(appPath, "utf8");
const supabaseClient = readIfExists(supabaseClientPath);
const packageJson = readIfExists(packagePath);
const appIndex = readIfExists(appIndexPath);
const schemaSql = readIfExists(schemaPath);
const rlsSql = readIfExists(rlsPath);
const hardeningSql = readIfExists(hardeningPath);
const rlsGrantSql = readIfExists(rlsGrantPath);
const checkingRpcSql = readIfExists(checkingRpcPath);
const confirmOrderRpcSql = readIfExists(confirmOrderRpcPath);
const paymentRpcSql = readIfExists(paymentRpcPath);
const marketplacePaymentRpcSql = readIfExists(marketplacePaymentRpcPath);
const notificationAuditRpcSql = readIfExists(notificationAuditRpcPath);
const storagePolicySql = readIfExists(storagePolicyPath);
const attachmentPathRpcSql = readIfExists(attachmentPathRpcPath);
const envExample = readIfExists(envExamplePath);
const gitignore = readIfExists(gitignorePath);
const stage2Doc = readIfExists(stage2DocPath);
const authSetupDoc = readIfExists(authSetupDocPath);
const aiAgentPrinciples = readIfExists(aiAgentPrinciplesPath);
const visualDraftAgentSpec = readIfExists(visualDraftAgentSpecPath);
const visualDraftAgentEval = readIfExists(visualDraftAgentEvalPath);
const repositoryBoundaryDoc = readIfExists(repositoryBoundaryDocPath);
const paymentFunction = readIfExists(paymentFunctionPath);
const shippingFunction = readIfExists(shippingFunctionPath);
const shipmentFunction = readIfExists(shipmentFunctionPath);
const storageFunction = readIfExists(storageFunctionPath);
const checkingFunction = readIfExists(checkingFunctionPath);
const agentDraftLabApi = readIfExists(agentDraftLabApiPath);
const agentDraftLab = readIfExists(agentDraftLabPath);
const agentDraftLabEval = readIfExists(agentDraftLabEvalPath);

const checks = [
  {
    name: "production build entrypoint is configured",
    pass: packageJson.includes('"build"') &&
      packageJson.includes("vite build") &&
      appIndex.includes('<div id="root"></div>') &&
      appIndex.includes('/src/main.jsx')
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
      app.includes("rowsWithSignedAttachmentUrls") &&
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
      app.includes("storage_object_id") &&
      app.includes("function uuidValue") &&
      app.includes("id: storageObjectId") &&
      !app.includes(".select(\"id,object_path,status\")")
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
    pass: app.includes("Import duties and taxes are handled on delivery") &&
      app.includes("DAP import-duty and tax boundary")
  },
  {
    name: "checkout exposes provider-specific payment paths",
    pass: app.includes("Pay with card") &&
      app.includes("PayPal") &&
      app.includes("Bank transfer") &&
      app.includes("Marketplace protected payment")
  },
  {
    name: "checkout supports protected marketplace payment handoff",
    pass: app.includes("marketplace_protected") &&
      app.includes("MarketplacePaymentState") &&
      app.includes("Protected marketplace checkout requested") &&
      app.includes("Open protected checkout") &&
      app.includes("marketplace_payment_requested") &&
      app.includes("Your protected marketplace checkout is ready") &&
      app.includes("MarketplaceWaitCard") &&
      app.includes("You can leave this page and return to this order later") &&
      app.includes("CheckoutLockedNotice") &&
      app.includes("Delivery details and shipping are locked while Easy Harness prepares")
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
    pass: app.includes("After-sales support") &&
      app.includes("Custom-made harnesses are covered") &&
      app.includes("Visible delivery or assembly issues should normally be reported within 14 days") &&
      app.includes("Return authorization") &&
      app.includes("After-sales and Support Policy")
  },
  {
    name: "legal and trade policy pages are available",
    pass: app.includes("policyPages") &&
      app.includes("Terms of Service") &&
      app.includes("Privacy Policy") &&
      app.includes("Upload and File Authorization") &&
      app.includes("Quote and Custom Order Terms") &&
      app.includes("Shipping, Duties, and Regions") &&
      app.includes("After-sales and Support Policy")
  },
  {
    name: "customer legal touchpoints are lightweight and linked",
    pass: app.includes("By continuing, you agree to the") &&
      app.includes("By confirming, you accept the") &&
      app.includes("Completing payment means the confirmed quote") &&
      app.includes("Upload terms") &&
      app.includes("Shipping terms")
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
    name: "home screen keeps ai-first intake concise",
    pass: app.includes("Tell us what should connect. Upload any files you already have.") &&
      app.includes("Describe the harness you need...") &&
      !app.includes("Describe the connection, upload photos, old samples, sketches, pinouts, or BOM files.") &&
      !app.includes("Old harness samples")
  },
  {
    name: "draft basis table uses full customer thread and avoids BOM promise",
    pass: app.includes("function getCustomerThreadText") &&
      app.includes("Here is the Easy Harness Draft basis and layout preview.") &&
      app.includes("Draft basis item") &&
      app.includes("Current order basis") &&
      !app.includes("Here is a quick BOM preview") &&
      app.includes("getCustomerThreadText(request || { messages: [] })")
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
    pass: app.includes("What payment will confirm") &&
      app.includes("Production starts after provider or bank-transfer confirmation.") &&
      app.includes("Waiting for payment confirmation") &&
      !app.includes("Before you pay")
  },
  {
    name: "file and folder drag upload is wired",
    pass: app.includes("collectDroppedFileItems") &&
      app.includes("webkitGetAsEntry") &&
      app.includes("dedupeDroppedFileItems") &&
      app.includes("const directFiles = Array.from(dataTransfer?.files || [])") &&
      app.includes("return dedupeDroppedFileItems([...collected, ...directFiles])") &&
      app.includes("drop-active") &&
      app.includes("handleDropUpload")
  },
  {
    name: "conversation attachments can render inline visuals",
    pass: app.includes("AttachmentGallery") &&
      app.includes("attachment-image-preview") &&
      app.includes("attachment-pdf-preview") &&
      app.includes("attachment-table-preview") &&
      app.includes("createSignedUrl") &&
      app.includes("const fileBlocks = uploadDrafts.map") &&
      app.includes("const attachedBlocks = filesToSend.map") &&
      app.includes("attachmentKey(file, index)")
  },
  {
    name: "staff updates support visual evidence blocks",
    pass: app.includes("Visual preview") &&
      app.includes("Table") &&
      app.includes("attachmentBlockFile(file, true)")
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
    name: "marketplace protected payment rpc extends payment provider contract",
    pass: marketplacePaymentRpcSql.includes("'marketplace'") &&
      marketplacePaymentRpcSql.includes("payments_provider_check") &&
      marketplacePaymentRpcSql.includes("marketplacePayment") &&
      marketplacePaymentRpcSql.includes("jsonb_set")
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
    name: "workspace request rpc returns storage preview paths",
    pass: attachmentPathRpcSql.includes("object_path") &&
      attachmentPathRpcSql.includes("storage_object_id") &&
      attachmentPathRpcSql.includes("left join public.storage_objects") &&
      attachmentPathRpcSql.includes("list_workspace_requests")
  },
  {
    name: "stage 2A edge function contracts exist",
    pass: paymentFunction.includes("STRIPE_SECRET_KEY") &&
      paymentFunction.includes("PAYPAL_CLIENT_ID") &&
      shippingFunction.includes("DHL_ACCOUNT_NUMBER") &&
      shipmentFunction.includes("customs_data_required") &&
      storageFunction.includes("signed_upload_call_not_enabled") &&
      checkingFunction.includes("AI_DRAFT_PROVIDER") &&
      checkingFunction.includes("QWEN_API_KEY") &&
      checkingFunction.includes("DEEPSEEK_API_KEY")
  },
  {
    name: "ai draft model adapter supports qwen",
    pass: checkingFunction.includes("draftModelConfig") &&
      checkingFunction.includes("dashscope.aliyuncs.com/compatible-mode/v1") &&
      checkingFunction.includes("callDraftModel") &&
      checkingFunction.includes("qwen3.6-plus") &&
      envExample.includes("AI_DRAFT_PROVIDER=qwen") &&
      envExample.includes("QWEN_API_KEY=") &&
      envExample.includes("QWEN_MODEL=qwen3.6-plus")
  },
  {
    name: "ai draft supports optional qwen attachment vision",
    pass: checkingFunction.includes("AI_DRAFT_ENABLE_ATTACHMENT_VISION") &&
      checkingFunction.includes("createSignedAttachmentImageUrls") &&
      checkingFunction.includes(".createSignedUrl") &&
      checkingFunction.includes("type: \"image_url\"") &&
      checkingFunction.includes("image_url_sent_to_qwen") &&
      checkingFunction.includes("image_count_sent_to_model: modelInputMeta.visualImages.length") &&
      checkingFunction.includes("easy_harness_run_checking_") &&
      checkingFunction.includes("vision_missing_storage_count") &&
      checkingFunction.includes("vision_storage_not_ready_count") &&
      checkingFunction.includes("vision_signed_url_failed_count") &&
      envExample.includes("AI_DRAFT_ENABLE_ATTACHMENT_VISION=false") &&
      envExample.includes("AI_DRAFT_MAX_VISION_IMAGES=4")
  },
  {
    name: "ai draft builds structured attachment observations",
    pass: checkingFunction.includes("type AttachmentObservation") &&
      checkingFunction.includes("buildAttachmentObservations") &&
      checkingFunction.includes("attachment_observations") &&
      checkingFunction.includes("parseDelimitedRows") &&
      checkingFunction.includes("extractPdfTextProbe") &&
      checkingFunction.includes("extractXlsxTables") &&
      checkingFunction.includes("buildQwenFileExtractObservation") &&
      checkingFunction.includes("uploadQwenFileForExtract") &&
      checkingFunction.includes("fileid://") &&
      checkingFunction.includes("qwen_file_extract") &&
      checkingFunction.includes("extractCadMetadata") &&
      checkingFunction.includes("cad_metadata_probe") &&
      checkingFunction.includes("parseStepCad") &&
      checkingFunction.includes("parseDxfCad") &&
      checkingFunction.includes("parseBinaryStlCad") &&
      checkingFunction.includes("structured_facts") &&
      checkingFunction.includes("parser_needed_count") &&
      checkingFunction.includes("qwen_file_extract_count") &&
      checkingFunction.includes("cad_metadata_count") &&
      checkingFunction.includes("AI_DRAFT_TEXT_ATTACHMENT_MAX_BYTES") &&
      checkingFunction.includes("AI_DRAFT_STRUCTURED_ATTACHMENT_MAX_BYTES") &&
      checkingFunction.includes("AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT") &&
      checkingFunction.includes("AI_DRAFT_QWEN_FILE_EXTRACT_MAX_FILES") &&
      checkingFunction.includes("AI_DRAFT_CAD_METADATA_MAX_BYTES") &&
      envExample.includes("AI_DRAFT_TEXT_ATTACHMENT_MAX_BYTES=200000") &&
      envExample.includes("AI_DRAFT_STRUCTURED_ATTACHMENT_MAX_BYTES=2000000") &&
      envExample.includes("AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=false") &&
      envExample.includes("QWEN_FILE_EXTRACT_MODEL=qwen-long") &&
      envExample.includes("AI_DRAFT_CAD_METADATA_MAX_BYTES=10000000")
  },
  {
    name: "ai draft keeps customer questions consistent across message and summary",
    pass: checkingFunction.includes("finalizeCustomerQuestions") &&
      checkingFunction.includes("customerQuestionSet") &&
      checkingFunction.includes("questionField(question)") &&
      checkingFunction.includes("draft_closure: {") &&
      checkingFunction.includes("questions_to_ask: questions") &&
      checkingFunction.includes("user_facing_summary: {") &&
      checkingFunction.includes("needed_next: questions")
  },
  {
    name: "cad-only intake acknowledges received reference files",
    pass: checkingFunction.includes("I received the CAD reference files") &&
      checkingFunction.includes("dimensional/context references") &&
      checkingFunction.includes("Before Easy Harness can prepare the Draft")
  },
  {
    name: "repository boundary ignores generated local artifacts",
    pass: gitignore.includes("node_modules/") &&
      gitignore.includes("dist/") &&
      gitignore.includes("supabase/.temp/") &&
      gitignore.includes("test-fixtures/") &&
      gitignore.includes("handoff_20260515/") &&
      gitignore.includes("audit-snapshots/") &&
      repositoryBoundaryDoc.includes("Do Not Push") &&
      repositoryBoundaryDoc.includes("git rm -r --cached") &&
      repositoryBoundaryDoc.includes("D:\\Harness\\easy-harness-project-materials") &&
      repositoryBoundaryDoc.includes("image_count_sent_to_model") &&
      repositoryBoundaryDoc.includes("cad_metadata_count")
  },
  {
    name: "ai agent does not title requests from one keyword",
    pass: !app.includes('if (value.includes("battery")) return "Battery Pack Adapter Harness"') &&
      app.includes("firstLine") &&
      checkingFunction.includes("Do not rename the request based on a single keyword")
  },
  {
    name: "ai agent softens file-review claims",
    pass: checkingFunction.includes("Do not phrase review items as if this run already inspected those contents") &&
      checkingFunction.includes("not file-content claims") &&
      checkingFunction.includes("Inspect uploaded files during Easy Harness review before relying on connector")
  },
  {
    name: "ai agent forbids keyword workflows",
    pass: aiAgentPrinciples.includes("关键词只能作为证据，不能作为流程开关") &&
      checkingFunction.includes("Do not use keyword workflows or case-specific scripts") &&
      checkingFunction.includes("A keyword may support the judgment, but it must not determine the workflow by itself")
  },
  {
    name: "ai agent preserves attachment evidence boundary",
    pass: (
      aiAgentPrinciples.includes("附件 metadata 不等于视觉/OCR/文档理解") ||
      (
        aiAgentPrinciples.includes("附件 metadata") &&
        aiAgentPrinciples.includes("不能假装已经看懂图片")
      )
    ) &&
      checkingFunction.includes("Evidence boundary: this intake run receives conversation text, attachment metadata, and any parser-produced attachment_observations") &&
      checkingFunction.includes("Do not claim to visually identify connector models") &&
      checkingFunction.includes("unless those details are explicitly present in text or attachment_observations")
  },
  {
    name: "ai agent can refuse unsafe draft closure",
    pass: aiAgentPrinciples.includes("允许不关闭 Draft") &&
      checkingFunction.includes("It is acceptable not to close a Draft") &&
      checkingFunction.includes("do not invent a Draft")
  },
  {
    name: "visual draft spec preserves customer-facing north star",
    pass: visualDraftAgentSpec.includes("Received, understood, and clear") &&
      visualDraftAgentSpec.includes("not an internal engineering report") &&
      visualDraftAgentSpec.includes("not a manufacturing package") &&
      visualDraftAgentSpec.includes("easy_harness_requirement_map_v0_1") &&
      visualDraftAgentSpec.includes("requirement_map") &&
      visualDraftAgentSpec.includes("fact_trace") &&
      visualDraftAgentSpec.includes("evidence_coverage") &&
      visualDraftAgentSpec.includes("question_plan") &&
      visualDraftAgentSpec.includes("draft_readiness")
  },
  {
    name: "visual draft eval cases preserve evidence and question policy",
    pass: visualDraftAgentEval.includes("easy_harness_visual_draft_eval_v0_1") &&
      visualDraftAgentEval.includes("dt06_mixed_attachment_pack") &&
      visualDraftAgentEval.includes("battery_fixture_mixed_material") &&
      visualDraftAgentEval.includes("cad_reference_only_missing_goal") &&
      visualDraftAgentEval.includes("old_sample_copy_with_photos") &&
      visualDraftAgentEval.includes("spreadsheet_pinout_missing_other_end") &&
      visualDraftAgentEval.includes("requirement_map_must_include") &&
      visualDraftAgentEval.includes("must_show_received") &&
      visualDraftAgentEval.includes("must_allow_unknown") &&
      visualDraftAgentEval.includes("must_not_ask")
  },
  {
    name: "agent draft lab builds requirement map before visual draft",
    pass: agentDraftLabApi.includes("normalizeRequirementMap") &&
      agentDraftLabApi.includes("easy_harness_requirement_map_v0_1") &&
      agentDraftLabApi.includes("requirement_map") &&
      agentDraftLabApi.includes("connection_groups") &&
      agentDraftLabApi.includes("The poster must be derived from requirement_map") &&
      agentDraftLabApi.includes("customer_request_basis") &&
      agentDraftLabApi.includes("draft_connection_basis")
  },
  {
    name: "agent draft lab renderer uses requirement map as primary visual source",
    pass: agentDraftLab.includes("boardsFromRequirementMap") &&
      agentDraftLab.includes("wireGroupsFromRequirementMap") &&
      agentDraftLab.includes("routeZonesFromRequirementMap") &&
      agentDraftLab.includes("openItemsFromRequirementMap") &&
      agentDraftLab.includes("evidenceFromRequirementMap") &&
      agentDraftLab.includes("draft.requirementMap")
  },
  {
    name: "agent draft lab eval covers core visual draft cases",
    pass: packageJson.includes('"agent:eval"') &&
      agentDraftLabEval.includes("visual_draft_spec") &&
      agentDraftLabEval.includes("dt06_mixed_attachment_pack") &&
      agentDraftLabEval.includes("spreadsheet_pinout_missing_other_end") &&
      agentDraftLabEval.includes("cad_reference_only_missing_goal")
  },
  {
    name: "formal run-checking carries visual draft closure guards",
    pass: checkingFunction.includes("applyDraftClosureGuards") &&
      checkingFunction.includes("isCadReferenceOnlyDraft") &&
      checkingFunction.includes("isSingleConnectorOrPinoutBasisDraft") &&
      checkingFunction.includes("Connector-A/pinout-only rule") &&
      checkingFunction.includes("CAD-only rule") &&
      checkingFunction.includes("Mixed-files rule") &&
      checkingFunction.includes("What is the other end of the harness, or should Easy Harness treat it as unknown for now?")
  },
  {
    name: "formal run-checking emits requirement map for future visual drafts",
    pass: checkingFunction.includes("easy_harness_requirement_map_v0_1") &&
      checkingFunction.includes("buildRequirementMap") &&
      checkingFunction.includes("requirement_map: buildRequirementMap(draft)") &&
      checkingFunction.includes("Unknown other end") &&
      checkingFunction.includes("evidence_refs")
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
    name: "orders list separates ready-for-payment from active orders",
    pass: app.includes("Ready for payment") && app.includes("Active orders") && app.includes("Completed")
  },
  {
    name: "converted requests are de-emphasized after order creation",
    pass: app.includes("Converted to orders") &&
      app.includes("converted-requests-block") &&
      app.includes("No active requests right now") &&
      app.includes("Order created") &&
      app.includes("requestHasMovedToOrder") &&
      app.includes("activeSidebarRequests")
  }
];

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failed.length) {
  process.exitCode = 1;
}
