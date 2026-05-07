import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const appPath = resolve(root, "src", "App.jsx");
const distIndex = resolve(root, "dist", "index.html");

const app = readFileSync(appPath, "utf8");

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
      app.includes("clearAuthSessionAdapter")
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
      app.includes("Ready for quote work") &&
      app.includes("Checkout and payment")
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
    name: "orders list separates checkout from active orders",
    pass: app.includes("To pay") && app.includes("Active orders") && app.includes("Completed")
  }
];

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failed.length) {
  process.exitCode = 1;
}
