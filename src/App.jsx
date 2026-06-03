import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  BadgeCheck,
  Bell,
  Cable,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  CreditCard,
  File,
  FileText,
  Folder,
  Lock,
  MailCheck,
  MapPin,
  MessageCircle,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  UserCircle,
} from "lucide-react";
import {
  getAuthRedirectUrl,
  hostedAuthRequired,
  supabase,
  supabaseConfigured,
} from "./supabaseClient.js";
import AgentDraftLab from "./AgentDraftLab.jsx";

const processingSteps = [
  "Upload received",
  "Request prepared",
  "Files received",
  "Thread created",
];

const statusCopy = {
  draft_saved: "Request received",
  checking: "Organizing request",
  needs_info: "Need your reply",
  not_supported: "Need connection goal",
  in_review: "Easy Harness review",
  ready_to_confirm: "Quote ready",
  confirmed: "Order created",
  paid: "Payment received",
};

const statusRank = {
  draft_saved: 0,
  checking: 0,
  needs_info: 1,
  not_supported: 1,
  in_review: 2,
  ready_to_confirm: 3,
  confirmed: 4,
  paid: 5,
};

const workflowSteps = ["Received", "Draft", "Review", "Quote"];

const intakeOutcomeCopy = {
  needs_info: "More details needed",
  not_supported: "Unable to review",
};

const sampleFiles = ["connector-photo.jpg", "old-harness.png", "notes.pdf"];
const maxFilesPerUpload = 8;
const maxFileSizeBytes = 25 * 1024 * 1024;
const legacySmokeCopy =
  "Details Easy Harness still needs | Reply in the thread with what you know";
void legacySmokeCopy;
const checkoutSmokeCopy =
  "Only needed if the carrier or customs asks for a company or tax number.";
void checkoutSmokeCopy;

const defaultPolicyId = "terms";

const policyPages = [
  {
    id: "terms",
    shortTitle: "Terms",
    title: "Terms of Service",
    summary:
      "The general rules for using Easy Harness, creating requests, reviewing quotes, and placing custom harness orders.",
    sections: [
      {
        heading: "Using Easy Harness",
        body:
          "Easy Harness helps customers describe, organize, quote, and order custom wire harnesses. You are responsible for providing accurate request details, delivery information, and contact information.",
      },
      {
        heading: "Accounts and roles",
        body:
          "Public accounts are customer accounts. Staff and admin accounts are created or invited by Easy Harness and may access operational tools based on their assigned role.",
      },
      {
        heading: "Requests, quotes, and orders",
        body:
          "A request is used to collect information and prepare a harness quote. An order starts after you confirm the quoted harness basis. The harness quote covers the harness itself unless another item is clearly stated.",
      },
      {
        heading: "Payments and providers",
        body:
          "Payments may be completed through supported card, PayPal, or bank-transfer routes. Easy Harness does not ask you to enter card details directly into this platform.",
      },
    ],
  },
  {
    id: "privacy",
    shortTitle: "Privacy",
    title: "Privacy Policy",
    summary:
      "How Easy Harness uses account details, uploaded files, request content, delivery information, and order records.",
    sections: [
      {
        heading: "Information we collect",
        body:
          "We collect the email address, nickname, request messages, uploaded files, quote decisions, order details, delivery address, payment status, and support messages needed to operate the service.",
      },
      {
        heading: "How we use information",
        body:
          "We use this information to save your account, prepare harness requests, review and quote orders, arrange payment and delivery, send updates, and handle support.",
      },
      {
        heading: "Service providers",
        body:
          "We may share only the required information with account, hosting, payment, storage, email, logistics, customs, and support providers so they can perform the requested service.",
      },
      {
        heading: "Retention and requests",
        body:
          "We keep records needed for active requests, orders, legal, tax, security, and support purposes. You can contact Easy Harness to request access, correction, or deletion where applicable.",
      },
    ],
  },
  {
    id: "uploads",
    shortTitle: "Uploads",
    title: "Upload and File Authorization",
    summary:
      "What you confirm when you upload photos, drawings, samples, pinouts, spreadsheets, or other harness materials.",
    sections: [
      {
        heading: "Right to upload",
        body:
          "By uploading files or written details, you confirm that you have the right to share them with Easy Harness for request review, quoting, and order preparation.",
      },
      {
        heading: "How files are used",
        body:
          "Easy Harness may use uploaded material to understand the connection goal, prepare drafts, review feasibility, quote the harness, plan production, and provide support for the related order.",
      },
      {
        heading: "Sensitive material",
        body:
          "Do not upload files that you are not allowed to share. If a file contains sensitive or restricted information, remove it before uploading or contact Easy Harness first.",
      },
      {
        heading: "File accuracy",
        body:
          "Uploaded files may be incomplete, unclear, or inconsistent with the written request. Easy Harness may ask for clarification before a quote or order can move forward.",
      },
    ],
  },
  {
    id: "custom-orders",
    shortTitle: "Custom orders",
    title: "Quote and Custom Order Terms",
    summary:
      "How harness quotes, customer confirmation, production preparation, changes, and cancellations work.",
    sections: [
      {
        heading: "Quote basis",
        body:
          "A quote is based on the current request thread, uploaded files, Easy Harness updates, and any confirmed details shown before you accept the quote.",
      },
      {
        heading: "What the quote includes",
        body:
          "The harness quote covers the custom harness item. Shipping, import duties, taxes, carrier fees, and payment-provider fees are shown or handled separately when applicable.",
      },
      {
        heading: "Changes and cancellation",
        body:
          "You can ask for changes or cancellation before production starts. If payment has been made but production has not started, Easy Harness may cancel the order and refund the unused portion after deducting costs already incurred.",
      },
      {
        heading: "Custom product boundary",
        body:
          "Custom harnesses are made to order and generally cannot be cancelled or returned after production starts unless Easy Harness made the product incorrectly, the product has a verified quality issue, or the delivered item does not match the confirmed order basis.",
      },
    ],
  },
  {
    id: "shipping",
    shortTitle: "Shipping",
    title: "Shipping, Duties, and Regions",
    summary:
      "How Easy Harness handles international shipping estimates, DAP delivery, import duties, and supported destination regions.",
    sections: [
      {
        heading: "Supported regions",
        body:
          "Easy Harness can prepare orders for major regions served by our payment and carrier partners, including the United States, Canada, Europe, the United Kingdom, Australia, New Zealand, selected Asian regions, and selected South American regions.",
      },
      {
        heading: "Shipping estimates",
        body:
          "Shipping rates and delivery windows are estimates until confirmed by the carrier. Actual delivery can be affected by address accuracy, customs processing, remote-area rules, carrier delays, and local holidays.",
      },
      {
        heading: "DAP import boundary",
        body:
          "Orders are shipped under DAP unless another term is shown. Easy Harness arranges shipping to the destination address, while import duties, VAT, customs charges, and local carrier brokerage are normally paid by the recipient.",
      },
      {
        heading: "Unavailable destinations",
        body:
          "Some countries, regions, addresses, products, or restricted uses may be unavailable because of payment, carrier, customs, sanctions, or safety limitations.",
      },
    ],
  },
  {
    id: "after-sales",
    shortTitle: "After-sales",
    title: "After-sales and Support Policy",
    summary:
      "How to contact Easy Harness after an order is placed or delivered, and what support normally covers.",
    sections: [
      {
        heading: "Where to contact us",
        body:
          "Use the order message area for order questions. Easy Harness may also share an email address or WhatsApp contact when direct follow-up is the fastest way to resolve a case.",
      },
      {
        heading: "Before production starts",
        body:
          "If a confirmed order still needs an address correction, delivery clarification, or design change, contact Easy Harness before production starts.",
      },
      {
        heading: "After delivery",
        body:
          "If you receive a damaged, incorrect, or faulty harness, contact Easy Harness with the order ID plus photos or video so the case can be reviewed quickly. Visible delivery or assembly issues should normally be reported within 14 days after receipt; quality disputes should normally include supporting evidence within 30 days.",
      },
      {
        heading: "Resolution options",
        body:
          "Depending on the case, Easy Harness may offer guidance, correction, replacement, remake, partial refund, or another reasonable resolution. Issues caused by incorrect customer-provided details, misuse, or later modifications may be excluded.",
      },
      {
        heading: "Return authorization",
        body:
          "Do not send products back without return authorization. If a return is needed, Easy Harness will provide the return steps first. Import duties, VAT, customs fees, payment-provider fees, bank fees, and shipping fees are normally not refundable unless Easy Harness clearly accepts responsibility for them.",
      },
    ],
  },
];

const policyById = Object.fromEntries(
  policyPages.map((policy) => [policy.id, policy]),
);

const orderStatusCopy = {
  checkout: "Order in preparation",
  awaiting_bank_transfer: "Bank transfer pending",
  paid: "Scheduled",
  scheduled: "Scheduled",
  in_production: "In production",
  qc: "Ready to ship",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  delivered: "Delivered",
};

const paymentStatusCopy = {
  unpaid: "Ready for payment",
  payment_pending: "Waiting for payment confirmation",
  bank_transfer_pending: "Bank transfer pending",
  paid: "Payment received",
  failed: "Payment failed",
};

const productionSteps = ["Scheduled", "Production", "Ready to ship"];

const logisticsSteps = [
  "Label created",
  "In transit",
  "Out for delivery",
  "Delivered",
];

const defaultOrigin = {
  company: "Easy Harness",
  city: "Shenzhen",
  province: "Guangdong",
  country: "China",
};

const shippingTemplates = [
  {
    id: "ups-saver",
    level: "Economy",
    carrier: "UPS",
    service: "Worldwide Saver",
    days: "4-7 business days",
    basePrice: 42,
    source: "Estimated rate",
  },
  {
    id: "dhl-express",
    level: "Standard",
    carrier: "DHL",
    service: "Express Worldwide",
    days: "3-5 business days",
    basePrice: 46,
    source: "Estimated rate",
  },
  {
    id: "fedex-priority",
    level: "Priority",
    carrier: "FedEx",
    service: "International Priority",
    days: "2-4 business days",
    basePrice: 58,
    source: "Estimated rate",
  },
  {
    id: "dhl-time-critical",
    level: "Express",
    carrier: "DHL",
    service: "Express 12:00",
    days: "2-3 business days",
    basePrice: 72,
    source: "Estimated rate",
  },
];

const paymentMethods = [
  {
    id: "stripe_card",
    provider: "Stripe",
    label: "Pay with card",
    detail: "Visa, Mastercard, Amex, Apple Pay, or Google Pay",
  },
  {
    id: "paypal",
    provider: "PayPal",
    label: "PayPal",
    detail: "Pay with PayPal balance, wallet, or saved card",
  },
  {
    id: "bank_transfer",
    provider: "Bank transfer",
    label: "Bank transfer",
    detail: "Use a reference code; production starts after receipt",
  },
  {
    id: "marketplace_protected",
    provider: "Alibaba.com Trade Assurance",
    label: "Marketplace protected payment",
    detail: "Request a matching protected checkout link",
  },
];

const bankTransferDetails = {
  beneficiary: "Easy Harness",
  currency: "USD",
  memo: "Use the order ID as the payment reference.",
  note: "Wire instructions are issued on the pro forma invoice.",
};

const marketplacePaymentDefaults = {
  provider: "Alibaba.com Trade Assurance",
  note:
    "Open this protected checkout only after the marketplace order matches the Easy Harness order summary.",
};

function marketplacePaymentDetails(order = {}) {
  return {
    provider: marketplacePaymentDefaults.provider,
    checkoutUrl: "",
    reference: "",
    note: marketplacePaymentDefaults.note,
    status: "",
    requestedAt: "",
    updatedAt: "",
    ...(order.snapshot?.marketplacePayment || {}),
    ...(order.marketplacePayment || {}),
  };
}

const platformAdapters = {
  auth: {
    id: "local-session-ledger",
    future: "managed-identity-session",
    contract: "email_verified | session_created | session_revoked",
  },
  database: {
    id: "local-browser-table-ledger",
    future: "server-database-and-row-security",
    contract: "profile-scoped table records",
  },
  checking: {
    id: "local-checking-v1",
    future: "request-checking-agent",
    contract: "accepted | needs_info | rejected",
  },
  storage: {
    id: "local-attachment-ledger",
    future: "object-storage-signed-urls",
    contract: "metadata now, upload URL later",
  },
  payment: {
    id: "local-payment-session",
    future: "hosted-provider-session-and-webhook",
    contract: "session_created | awaiting_callback | confirmed",
  },
  shipping: {
    id: "local-rate-card",
    future: "carrier-rate-and-tracking-api",
    contract: "manual estimate now, carrier quote later",
  },
  notifications: {
    id: "local-notification-router",
    future: "email-whatsapp-sms-provider",
    contract: "in_app delivered, external queued",
  },
};

const notificationChannels = [
  { id: "in_app", label: "In-app", defaultStatus: "delivered" },
  { id: "email", label: "Email", defaultStatus: "queued" },
  { id: "whatsapp", label: "WhatsApp", defaultStatus: "queued" },
];

const apiReplacementMap = [
  {
    adapter: "auth",
    replace:
      "signInWithEmailAdapter(email, users), createCustomerAccountAdapter(form), and clearAuthSessionAdapter(session)",
    input:
      "email, customer registration form, user status, role, verification state",
    output: "session id, user id, role, issued time, expiry",
    writes:
      "auth_sessions, profiles.last_active_at, audit_logs, integration_events",
  },
  {
    adapter: "database",
    replace: "databaseSchemaBlueprint plus local table ledgers",
    input: "profile-scoped request/order mutations",
    output: "server records with row-level access rules",
    writes: "profiles, requests, orders, messages, ledgers, audit_logs",
  },
  {
    adapter: "checking",
    replace: "runCheckingAdapter(request)",
    input: "request id, customer text, file metadata",
    output: "accepted / needs_info / rejected with missing fields",
    writes: "requests.checkResult, request_messages, integration_events",
  },
  {
    adapter: "payment",
    replace:
      "createPaymentSessionAdapter(order, method) and confirmPaymentCallbackAdapter(order, method)",
    input: "order, selected payment method, locked order total",
    output: "provider session, callback status, payment reference",
    writes: "orders.paymentSession, payments, audit_logs, integration_events",
  },
  {
    adapter: "shipping",
    replace:
      "quoteShippingRatesAdapter(packageEstimate) and buildShipmentUpdateAdapter(order, form)",
    input:
      "package estimate, origin, destination, selected service, tracking payload",
    output: "rate options, shipment status, tracking events",
    writes: "orders.shippingOptions, shipments, integration_events",
  },
  {
    adapter: "notifications",
    replace: "routeNotificationAdapter(payload)",
    input: "recipient, role, request/order id, title, body",
    output: "notification plus per-channel delivery attempts",
    writes: "notifications, notification_deliveries, integration_events",
  },
  {
    adapter: "storage",
    replace:
      "createStorageUploadAdapter(attachments, requestId, messageId, uploadedBy)",
    input: "file metadata, owner, request/message id",
    output: "object path or signed upload contract",
    writes: "attachments / storage_objects",
  },
];

const databaseSchemaBlueprint = [
  {
    table: "profiles",
    owner: "Identity service",
    fields: [
      "id",
      "email",
      "role",
      "status",
      "verified",
      "company",
      "country",
      "phone",
      "last_active_at",
    ],
  },
  {
    table: "auth_sessions",
    owner: "Identity service",
    fields: ["id", "user_id", "role", "issued_at", "expires_at", "revoked_at"],
  },
  {
    table: "requests",
    owner: "Request service",
    fields: [
      "id",
      "customer_id",
      "status",
      "title",
      "check_result",
      "active_quote_id",
      "confirmed_quote_id",
      "updated_at",
    ],
  },
  {
    table: "request_messages",
    owner: "Request service",
    fields: [
      "id",
      "request_id",
      "author_id",
      "role",
      "body",
      "blocks",
      "created_at",
    ],
  },
  {
    table: "attachments",
    owner: "Storage service",
    fields: [
      "id",
      "request_id",
      "message_id",
      "uploaded_by",
      "name",
      "size",
      "type",
      "storage_object_id",
    ],
  },
  {
    table: "storage_objects",
    owner: "Storage service",
    fields: [
      "id",
      "attachment_id",
      "bucket",
      "object_path",
      "status",
      "access_scope",
      "created_at",
    ],
  },
  {
    table: "quotes",
    owner: "Quote service",
    fields: [
      "id",
      "request_id",
      "version",
      "amount",
      "currency",
      "basis_message_ids",
      "status",
      "released_at",
    ],
  },
  {
    table: "orders",
    owner: "Order service",
    fields: [
      "id",
      "request_id",
      "customer_id",
      "status",
      "harness_price",
      "shipping",
      "address",
      "payment_status",
      "production_status",
    ],
  },
  {
    table: "payments",
    owner: "Payment adapter",
    fields: [
      "id",
      "order_id",
      "provider",
      "session_id",
      "status",
      "amount",
      "currency",
      "provider_reference",
      "confirmed_at",
    ],
  },
  {
    table: "payment_events",
    owner: "Payment adapter",
    fields: [
      "id",
      "payment_id",
      "order_id",
      "provider",
      "event_type",
      "provider_event_id",
      "received_at",
    ],
  },
  {
    table: "shipping_rate_quotes",
    owner: "Shipping adapter",
    fields: [
      "id",
      "order_id",
      "provider",
      "carrier",
      "service",
      "amount",
      "currency",
      "incoterm",
      "expires_at",
    ],
  },
  {
    table: "shipments",
    owner: "Shipping adapter",
    fields: [
      "id",
      "order_id",
      "carrier",
      "service",
      "status",
      "tracking_number",
      "tracking_url",
      "events",
    ],
  },
  {
    table: "tracking_events",
    owner: "Shipping adapter",
    fields: [
      "id",
      "shipment_id",
      "order_id",
      "status",
      "description",
      "location",
      "occurred_at",
    ],
  },
  {
    table: "order_messages",
    owner: "Order service",
    fields: [
      "id",
      "order_id",
      "author_id",
      "author_role",
      "body",
      "visibility",
      "created_at",
    ],
  },
  {
    table: "notifications",
    owner: "Notification router",
    fields: [
      "id",
      "user_id",
      "role",
      "request_id",
      "title",
      "body",
      "read_at",
      "created_at",
    ],
  },
  {
    table: "notification_deliveries",
    owner: "Notification router",
    fields: [
      "id",
      "notification_id",
      "channel",
      "status",
      "provider_message_id",
      "last_attempt_at",
      "error",
    ],
  },
  {
    table: "audit_logs",
    owner: "Audit service",
    fields: [
      "id",
      "actor_id",
      "action",
      "target_type",
      "target_id",
      "detail",
      "created_at",
    ],
  },
  {
    table: "integration_events",
    owner: "Adapter layer",
    fields: [
      "id",
      "adapter",
      "action",
      "target_type",
      "target_id",
      "detail",
      "created_at",
    ],
  },
  {
    table: "service_countries",
    owner: "Configuration",
    fields: [
      "country_code",
      "country_name",
      "region_group",
      "checkout_enabled",
      "dhl_express_enabled",
      "payment_enabled",
    ],
  },
];

const backendStackDecision = [
  { label: "Backend", value: "Supabase" },
  { label: "Database", value: "PostgreSQL" },
  { label: "Auth", value: "Supabase Auth" },
  { label: "Storage", value: "Supabase Storage private buckets" },
  { label: "Server functions", value: "Supabase Edge Functions" },
  { label: "Payment", value: "Stripe Checkout, PayPal, bank transfer" },
  { label: "Shipping", value: "DHL Express API first" },
  { label: "Incoterm", value: "DAP" },
];

const integrationReadinessRows = [
  {
    area: "Database and RLS",
    codeState: "Migration files ready",
    waitingOn: "Supabase project, database region, production/staging split",
  },
  {
    area: "Auth",
    codeState: "Supabase Auth boundary ready",
    waitingOn:
      "Auth project keys, Google/Apple/Microsoft app credentials, admin invite procedure",
  },
  {
    area: "Storage",
    codeState: "Private bucket and signed upload contract ready",
    waitingOn:
      "Supabase storage bucket, file policy confirmation, signed URL expiry decision",
  },
  {
    area: "Payment",
    codeState: "Payment session and webhook function contracts ready",
    waitingOn:
      "PayPal China merchant account, Stripe eligibility or alternative, bank transfer details",
  },
  {
    area: "Shipping",
    codeState: "DHL rate, shipment, and tracking function contracts ready",
    waitingOn:
      "DHL Express China account, API keys, shipper account, customs template",
  },
  {
    area: "Notifications",
    codeState: "Multi-channel routing contract ready",
    waitingOn: "Business email, email provider, WhatsApp/SMS provider choice",
  },
  {
    area: "AI checking",
    codeState: "Function boundary ready",
    waitingOn:
      "Harness knowledge base, validation examples, first AI prompt approval",
  },
];

const checkoutCountries = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Australia",
  "Japan",
  "Singapore",
  "Netherlands",
  "Italy",
  "Spain",
];

const roleCopy = {
  customer: "Customer",
  staff: "Staff",
  admin: "Admin",
};

const rolePermissions = [
  {
    area: "Requests",
    customer: "Create and view own requests",
    staff: "View queue and assigned requests",
    admin: "View all requests",
  },
  {
    area: "Thread updates",
    customer: "Add details and files",
    staff: "Reply as Easy Harness",
    admin: "Read for audit",
  },
  {
    area: "Pricing",
    customer: "Confirm released price",
    staff: "Create or update price",
    admin: "Audit price state",
  },
  {
    area: "Users",
    customer: "Manage own profile",
    staff: "No user management",
    admin: "Invite, suspend, and assign roles",
  },
  {
    area: "Payment",
    customer: "Start payment after confirmation",
    staff: "No payment access",
    admin: "Audit payment state",
  },
];

const seedUsers = [
  {
    id: "u_customer_1",
    name: "Zack Marv",
    email: "customer@example.com",
    role: "customer",
    status: "active",
    verified: true,
    company: "",
    country: "",
    phone: "",
    termsAccepted: false,
    termsAcceptedAt: "",
    lastActive: "Just now",
  },
  {
    id: "u_staff_1",
    name: "Easy Harness Ops",
    email: "staff@easyharness.com",
    role: "staff",
    status: "active",
    verified: true,
    company: "Easy Harness",
    country: "United States",
    phone: "",
    termsAccepted: true,
    termsAcceptedAt: "2026-05-06",
    lastActive: "Today",
  },
  {
    id: "u_admin_1",
    name: "Platform Admin",
    email: "admin@easyharness.com",
    role: "admin",
    status: "active",
    verified: true,
    company: "Easy Harness",
    country: "United States",
    phone: "",
    termsAccepted: true,
    termsAcceptedAt: "2026-05-06",
    lastActive: "Today",
  },
  {
    id: "u_customer_2",
    name: "Maria Chen",
    email: "maria@example.com",
    role: "customer",
    status: "invited",
    verified: false,
    company: "",
    country: "",
    phone: "",
    termsAccepted: false,
    termsAcceptedAt: "",
    lastActive: "Pending",
  },
];

const seedRequests = [
  {
    id: "HD-2026-1046-A",
    customerId: "u_customer_1",
    customer: "Zack Marv",
    title: "Controller-to-Dual-Sensor Harness Assembly",
    status: "in_review",
    price: "",
    files: sampleFiles,
    updated: "Just now",
    messages: [
      customerMessage(
        "I need a harness to connect a controller to two sensors. I have connector photos and an old harness sample.",
        sampleFiles,
      ),
      customerMessage(
        "Approximate length is 1 meter. Operating voltage is 12V. Quantity is 5 pieces.",
      ),
      easyMessage(
        "Check complete. We have enough information to create a preliminary harness draft.",
      ),
      draftMessage(
        "HD-2026-1046-A",
        "Controller-to-Dual-Sensor Harness Assembly",
      ),
      eventMessage(
        "In review",
        "The generated draft is being reviewed before it is released for confirmation.",
      ),
    ],
  },
  {
    id: "HD-2026-1042-A",
    customerId: "u_customer_1",
    customer: "Zack Marv",
    title: "Controller-to-Dual-Sensor Harness Assembly",
    status: "ready_to_confirm",
    price: "155",
    files: sampleFiles,
    updated: "Just now",
    messages: [
      customerMessage(
        "I need a harness to connect a controller to two sensors. I have connector photos and an old harness sample.",
        sampleFiles,
      ),
      customerMessage(
        "Approximate length is 1 meter. Operating voltage is 12V. Quantity is 5 pieces.",
      ),
      easyMessage(
        "Check complete. We have enough information to create a preliminary harness draft.",
      ),
      draftMessage(
        "HD-2026-1042-A",
        "Controller-to-Dual-Sensor Harness Assembly",
      ),
      easyMessage(
        "Here is the Easy Harness Draft basis and layout preview. Please review the connection direction and confirm whether this layout works for your device.",
        [],
        [
          { type: "table" },
          { type: "preview" },
          { type: "attachments", files: ["HD-2026-1042-A-draft.pdf"] },
        ],
      ),
      priceEvent("155"),
    ],
  },
  {
    id: "HD-2026-1038-B",
    customerId: "u_customer_1",
    customer: "Zack Marv",
    title: "Battery Pack Adapter Harness",
    status: "draft_saved",
    price: "",
    files: ["battery-pack-photo.jpg"],
    updated: "Yesterday",
    messages: [
      customerMessage(
        "I want a small adapter harness for a battery pack test bench.",
        ["battery-pack-photo.jpg"],
      ),
    ],
  },
  {
    id: "HD-2026-1027-C",
    customerId: "u_customer_1",
    customer: "Zack Marv",
    title: "Old Harness Remake for Field Equipment",
    status: "in_review",
    price: "",
    files: ["old-harness-remake.png", "machine-label.jpg"],
    updated: "3 days ago",
    messages: [
      customerMessage(
        "I have an old field-equipment harness and want to remake it as closely as possible.",
        ["old-harness-remake.png", "machine-label.jpg"],
      ),
      easyMessage(
        "Check complete. The request is in review and the draft will be prepared in this thread.",
      ),
      draftMessage("HD-2026-1027-C", "Old Harness Remake for Field Equipment"),
    ],
  },
];

function customerMessage(text, files = []) {
  return {
    id: messageId(),
    role: "customer",
    createdAt: new Date().toISOString(),
    blocks: [
      { type: "text", text },
      ...(files.length ? [{ type: "attachments", files }] : []),
    ],
  };
}

function easyMessage(text, files = [], extraBlocks = []) {
  return {
    id: messageId(),
    role: "easy",
    createdAt: new Date().toISOString(),
    blocks: [
      { type: "text", text },
      ...(files.length ? [{ type: "attachments", files }] : []),
      ...extraBlocks,
    ],
  };
}

function draftMessage(id, title) {
  return {
    id: messageId(),
    role: "easy",
    createdAt: new Date().toISOString(),
    tone: "draft",
    blocks: [{ type: "draft", id, title }],
  };
}

function eventMessage(title, body) {
  return {
    id: messageId(),
    role: "event",
    createdAt: new Date().toISOString(),
    blocks: [{ type: "event", title, body }],
  };
}

function priceEvent(amount) {
  return {
    id: messageId(),
    role: "event",
    createdAt: "Now",
    blocks: [{ type: "price", amount }],
  };
}

function messageId() {
  return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeRequestId(existingRequests = []) {
  const year = new Date().getFullYear();
  const requestList = Array.isArray(existingRequests) ? existingRequests : [];
  const maxExisting = requestList.reduce((max, request) => {
    const match = String(request?.id || request?.request_number || "").match(/HD-\d{4}-(\d+)-A/i);
    const value = match ? Number(match[1]) : 0;
    return Number.isFinite(value) && value > max ? value : max;
  }, 1049);
  return `HD-${year}-${maxExisting + 1}-A`;
}

function inferTitle(text) {
  const value = String(text || "").toLowerCase();
  const firstLine = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line.length >= 18 && /\b(harness|cable|wire|connector|adapter|loom)\b/i.test(line));
  if (firstLine) {
    return firstLine
      .replace(/^i\s+(need|want|am looking for)\s+(a|an|the)?\s*/i, "")
      .replace(/\s+/g, " ")
      .slice(0, 72)
      .replace(/[.,;:!?]+$/, "");
  }
  if (/\b(copy|replace|replacement|remake|replicate)\b/.test(value))
    return "Replacement Harness Request";
  if (/\b(sensor|controller)\b/.test(value))
    return "Sensor Harness Request";
  return "Uploaded Harness Design Request";
}

function readStoredState(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredState(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in private or restricted browsing modes.
  }
}

function uploadTermsKey(userId) {
  return `easy-harness.uploadTermsAccepted.${userId || "anonymous"}`;
}

function readUploadTermsAccepted(userId) {
  return Boolean(readStoredState(uploadTermsKey(userId), false));
}

function writeUploadTermsAccepted(userId) {
  writeStoredState(uploadTermsKey(userId), true);
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStoredState(key, fallback));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Local storage can be unavailable in private or restricted browsing modes.
    }
  }, [key, value]);

  return [value, setValue];
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function fileName(file) {
  if (typeof file === "string") return file;
  return file?.name || "file";
}

function attachmentKey(file, index = 0) {
  if (typeof file === "string") return `${file}-${index}`;
  return file?.id || file?.name || file?.url || `attachment-${index}`;
}

function fileSizeLabel(file) {
  if (!file || typeof file === "string" || !file.size) return "";
  if (file.size < 1024 * 1024)
    return `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return `${(file.size / 1024 / 1024).toFixed(1)} MB`;
}

function fileTypeLabel(file) {
  const name = fileName(file).toLowerCase();
  const type = typeof file === "object" ? file.type || file.mime_type || "" : "";
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name))
    return "Image";
  if (type.includes("pdf") || /\.pdf$/i.test(name)) return "PDF";
  if (/\.csv$/i.test(name) || type.includes("csv")) return "CSV";
  if (/\.(xlsx?|xlsm)$/i.test(name)) return "Spreadsheet";
  if (/\.(step|stp|stl|obj|iges|igs)$/i.test(name)) return "3D file";
  return "File";
}

function isImageFile(file) {
  return fileTypeLabel(file) === "Image";
}

function isPdfFile(file) {
  return fileTypeLabel(file) === "PDF";
}

function isCsvFile(file) {
  return fileTypeLabel(file) === "CSV";
}

function attachmentUrl(file) {
  if (!file || typeof file === "string") return "";
  return file.previewUrl || file.signedUrl || file.downloadUrl || file.url || "";
}

function attachmentBlockFile(file, includeSource = false) {
  if (typeof file === "string") return { name: file, type: "legacy", size: 0 };
  const payload = {
    id: file.id,
    name: fileName(file),
    displayName: file.displayName || fileName(file),
    relativePath: file.relativePath || "",
    size: file.size || 0,
    type: file.type || "application/octet-stream",
  };
  if (includeSource && file.sourceFile) payload.sourceFile = file.sourceFile;
  return payload;
}

function displayTime(value) {
  if (!value) return "Now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isEmailLike(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || "",
  );
}

function parseWorkspaceJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseWorkspaceJsonObject(value) {
  if (!value) return {};
  if (Array.isArray(value)) return {};
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeWorkspaceRequestRow(row = {}) {
  return {
    ...row,
    request_messages: parseWorkspaceJsonArray(row.request_messages),
    attachments: parseWorkspaceJsonArray(row.attachments),
    quotes: parseWorkspaceJsonArray(row.quotes),
    check_result: parseWorkspaceJsonObject(row.check_result),
  };
}

function normalizeWorkspaceOrderRow(row = {}) {
  return {
    ...row,
    address: parseWorkspaceJsonObject(row.address),
    snapshot: parseWorkspaceJsonObject(row.snapshot),
    package_estimate: parseWorkspaceJsonObject(row.package_estimate),
    requests: parseWorkspaceJsonObject(row.requests),
    order_messages: parseWorkspaceJsonArray(row.order_messages),
  };
}

function draftFileFromBrowser(fileLike) {
  const file = fileLike?.file || fileLike;
  const relativePath = fileLike?.relativePath || file.webkitRelativePath || "";
  return {
    id: attachmentId(),
    name: relativePath || file.name,
    displayName: file.name,
    relativePath,
    size: file.size,
    type: file.type || "application/octet-stream",
    source: "browser",
    sourceFile: file,
  };
}

function prepareDraftFiles(fileItems, currentCount = 0) {
  const draftFiles = fileItems.map(draftFileFromBrowser);
  const oversized = draftFiles.filter((file) => file.size > maxFileSizeBytes);
  const accepted = draftFiles.filter((file) => file.size <= maxFileSizeBytes);
  const slots = Math.max(maxFilesPerUpload - currentCount, 0);
  const nextFiles = accepted.slice(0, slots);
  let error = "";
  if (oversized.length) {
    error = `${fileName(oversized[0])} is larger than 25 MB.`;
  } else if (accepted.length > nextFiles.length) {
    error = `Each update can include up to ${maxFilesPerUpload} files.`;
  }
  return { nextFiles, error };
}

function droppedFileIdentity(item = {}) {
  const file = item.file || item;
  if (!file) return "";
  const relativePath = item.relativePath || file.webkitRelativePath || "";
  return [
    relativePath || file.name || "",
    file.size || 0,
    file.lastModified || 0,
  ].join("|");
}

function dedupeDroppedFileItems(fileItems = []) {
  const accepted = [];
  const exactKeys = new Set();
  const looseKeys = new Set();
  fileItems.forEach((item) => {
    const file = item?.file || item;
    if (!file) return;
    const exactKey = droppedFileIdentity(item);
    const looseKey = [file.name || "", file.size || 0, file.lastModified || 0].join("|");
    if (exactKeys.has(exactKey)) return;
    if (!item.relativePath && looseKeys.has(looseKey)) return;
    exactKeys.add(exactKey);
    looseKeys.add(looseKey);
    accepted.push({
      file,
      relativePath: item.relativePath || file.webkitRelativePath || "",
    });
  });
  return accepted;
}

function readDirectoryEntries(reader) {
  return new Promise((resolve, reject) => {
    const entries = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readBatch();
        },
        (error) => reject(error),
      );
    };
    readBatch();
  });
}

function entryFile(entry, relativePath) {
  return new Promise((resolve) => {
    entry.file(
      (file) => resolve({ file, relativePath }),
      () => resolve(null),
    );
  });
}

async function collectEntryFiles(entry, prefix = "") {
  if (!entry) return [];
  if (entry.isFile) {
    const result = await entryFile(entry, `${prefix}${entry.name}`);
    return result ? [result] : [];
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await readDirectoryEntries(reader);
    const nested = await Promise.all(
      entries.map((item) => collectEntryFiles(item, `${prefix}${entry.name}/`)),
    );
    return nested.flat();
  }
  return [];
}

async function collectDroppedFileItems(dataTransfer) {
  const items = Array.from(dataTransfer?.items || []).filter(
    (item) => item.kind === "file",
  );
  const collected = [];
  if (items.length) {
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        collected.push(...(await collectEntryFiles(entry)));
      } else {
        const file = item.getAsFile?.();
        if (file) collected.push({ file, relativePath: file.webkitRelativePath || "" });
      }
    }
  }
  const directFiles = Array.from(dataTransfer?.files || []).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || "",
  }));
  return dedupeDroppedFileItems([...collected, ...directFiles]);
}

function sampleFileDraft(name) {
  return {
    id: attachmentId(),
    name,
    size: 0,
    type: "sample",
    source: "sample",
  };
}

function attachmentId() {
  return `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function storageObjectId(attachmentIdValue) {
  return `obj_${attachmentIdValue}`;
}

function uuidValue() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "";
}

function authSessionId(userId) {
  return `sess_${userId}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function auditId() {
  return `audit_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function notificationId() {
  return `note_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function paymentRecordId(orderId, type = "session") {
  return `payrec_${type}_${orderId}`;
}

function shipmentRecordId(orderId) {
  return `ship_${orderId}`;
}

function notificationDeliveryId(notificationIdValue, channel) {
  return `delivery_${notificationIdValue}_${channel}`;
}

function requestMessageRecord(request, message) {
  return {
    id: message.id,
    requestId: request.id,
    customerId: request.customerId,
    authorRole: message.role,
    authorDisplay:
      message.role === "customer" ? request.customer : "Easy Harness",
    blocks: message.blocks || [],
    createdAt: message.createdAt || "Now",
    source: "request_thread",
  };
}

function requestBodyFromBlocks(blocks = []) {
  const textBlock = blocks.find((block) => block.type === "text");
  const eventBlock = blocks.find((block) => block.type === "event");
  const priceBlock = blocks.find((block) => block.type === "price");
  const attachmentBlock = blocks.find((block) => block.type === "attachments");
  if (textBlock?.text) return textBlock.text;
  if (eventBlock?.body) return eventBlock.body;
  if (priceBlock?.amount)
    return `Harness price released: $${priceBlock.amount}`;
  if (attachmentBlock?.files?.length)
    return `${attachmentBlock.files.length} file${attachmentBlock.files.length > 1 ? "s" : ""} attached.`;
  if (blocks.some((block) => block.type === "preview" || block.type === "table"))
    return "Visual update added.";
  return "";
}

function sanitizeBlocksForStorage(blocks = []) {
  return blocks.map((block) => {
    if (block.type !== "attachments") return block;
    return {
      ...block,
      files: (block.files || []).map((file) => attachmentBlockFile(file, false)),
    };
  });
}

function authorRoleToSupabase(role) {
  if (role === "easy") return "easy_harness";
  if (role === "event") return "event";
  if (role === "system") return "system";
  return "customer";
}

function authorRoleFromSupabase(role) {
  if (role === "easy_harness") return "easy";
  if (role === "event" || role === "system") return role;
  return "customer";
}

function checkStatusToSupabase(checkResult = {}) {
  if (checkResult.status === "accepted") return "accepted";
  if (checkResult.status === "needs_info") return "needs_info";
  if (checkResult.status === "rejected") return "rejected";
  return "pending";
}

function supabaseRequestInsertFromLocal(request) {
  return {
    request_number: request.id,
    customer_id: request.customerId,
    customer_label: request.customer,
    title: request.title,
    status: request.status,
    customer_summary: getFirstCustomerText(request),
    check_status: checkStatusToSupabase(request.checkResult),
    check_result: request.checkResult || {},
    files_count: (request.files || []).length,
  };
}

function supabaseRequestUpdateFromLocal(request) {
  return {
    title: request.title,
    status: request.status,
    customer_summary: getFirstCustomerText(request),
    check_status: checkStatusToSupabase(request.checkResult),
    check_result: request.checkResult || {},
    files_count: (request.files || []).length,
  };
}

function supabaseMessageInsertFromLocal(message, requestUuid, authorId) {
  const authorRole = authorRoleToSupabase(message.role);
  return {
    request_id: requestUuid,
    author_id:
      authorRole === "customer" || isUuidLike(authorId) ? authorId : null,
    author_role: authorRole,
    body: requestBodyFromBlocks(message.blocks),
    blocks: sanitizeBlocksForStorage(message.blocks || []),
    visibility: "thread",
  };
}

function supabaseSystemMessageFromLocal(message) {
  const authorRole = authorRoleToSupabase(message.role);
  return {
    author_role: authorRole,
    body: requestBodyFromBlocks(message.blocks),
    blocks: sanitizeBlocksForStorage(message.blocks || []),
  };
}

function supabaseAttachmentInsertFromLocal(
  attachment,
  requestUuid,
  messageUuid,
  ownerId,
) {
  return {
    owner_id: ownerId,
    request_id: requestUuid,
    request_message_id: messageUuid || null,
    storage_object_id: isUuidLike(attachment.storageObjectId)
      ? attachment.storageObjectId
      : null,
    name: attachment.name,
    mime_type: attachment.type || "application/octet-stream",
    size_bytes: attachment.size || 0,
    purpose: "request_upload",
  };
}

function supabaseStorageObjectInsertFromAttachment(attachment) {
  return {
    bucket: "request-attachments",
    object_path: attachment.objectPath,
    status: attachment.sourceFile ? "uploaded" : "pending_upload",
    access_scope: "request_participants",
    content_type: attachment.type || "application/octet-stream",
    size_bytes: attachment.size || 0,
    signed_upload_expires_at: null,
  };
}

function localAttachmentFromSupabase(attachment = {}) {
  const name = attachment.name || "file";
  return {
    id: attachment.id,
    name,
    displayName: name.split("/").pop() || name,
    relativePath: name,
    size: attachment.size_bytes || attachment.size || 0,
    type:
      attachment.mime_type ||
      attachment.content_type ||
      attachment.type ||
      "application/octet-stream",
    storageObjectId: attachment.storage_object_id || "",
    bucket: attachment.bucket || "request-attachments",
    objectPath: attachment.object_path || "",
    storageStatus: attachment.storage_status || "",
    signedUrl: attachment.signed_url || "",
    downloadUrl: attachment.signed_url || "",
    purpose: attachment.purpose || "request_upload",
    ownerId: attachment.owner_id || "",
    messageId: attachment.request_message_id || "",
    createdAt: displayTime(attachment.created_at),
  };
}

function attachmentBaseName(value = "") {
  return String(value).split("/").pop() || String(value);
}

function attachmentMatchesBlockFile(attachment, file) {
  const blockName = fileName(file);
  return (
    attachment.name === blockName ||
    attachment.displayName === blockName ||
    attachmentBaseName(attachment.name) === attachmentBaseName(blockName)
  );
}

function enrichAttachmentBlockFiles(files = [], messageAttachments = []) {
  return files.map((file) => {
    const match = messageAttachments.find((attachment) =>
      attachmentMatchesBlockFile(attachment, file),
    );
    if (!match) return file;
    return {
      ...attachmentBlockFile(file, false),
      ...match,
      displayName:
        (typeof file === "object" && file.displayName) ||
        match.displayName ||
        fileName(file),
    };
  });
}

function enrichBlocksWithAttachments(blocks = [], messageId = "", attachments = []) {
  const messageAttachments = attachments.filter(
    (attachment) => !attachment.messageId || attachment.messageId === messageId,
  );
  return blocks.map((block) => {
    if (block.type !== "attachments") return block;
    return {
      ...block,
      files: enrichAttachmentBlockFiles(block.files || [], messageAttachments),
    };
  });
}

async function rowsWithSignedAttachmentUrls(rows = []) {
  if (!supabase) return rows;
  const nextRows = rows.map((row) => ({
    ...row,
    attachments: (row.attachments || []).map((attachment) => ({
      ...attachment,
    })),
  }));

  const signingJobs = nextRows.flatMap((row) =>
    (row.attachments || [])
      .filter((attachment) => attachment.object_path && !attachment.signed_url)
      .map((attachment) => ({ row, attachment })),
  );

  await Promise.all(
    signingJobs.map(async ({ attachment }) => {
      const bucket = attachment.bucket || "request-attachments";
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(attachment.object_path, 60 * 60);
      if (data?.signedUrl) {
        attachment.signed_url = data.signedUrl;
      }
    }),
  );

  return nextRows;
}

function localQuoteFromSupabase(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    version: row.version,
    amount: Number(row.amount || 0),
    currency: row.currency || "USD",
    scope: "Harness assembly only",
    excludes: ["Shipping", "Import duties", "VAT", "Carrier brokerage"],
    basisMessageIds: row.basis_message_ids || [],
    status: row.status || "released",
    releasedBy: row.released_by || "",
    releasedAt: displayTime(row.released_at),
    validUntil: row.valid_until || "",
  };
}

function supabaseQuoteInsertFromLocal(quote, requestUuid, releasedBy) {
  return {
    request_id: requestUuid,
    version: quote.version,
    amount: quote.amount,
    currency: quote.currency || "USD",
    basis_message_ids: (quote.basisMessageIds || []).filter(isUuidLike),
    status: quote.status || "released",
    released_by: isUuidLike(releasedBy) ? releasedBy : null,
    valid_until: quote.validUntil || null,
  };
}

function localRequestFromSupabase(row, currentUser) {
  const attachments = (row.attachments || []).map(localAttachmentFromSupabase);
  const quotes = [...(row.quotes || [])]
    .sort((a, b) => (a.version || 0) - (b.version || 0))
    .map(localQuoteFromSupabase);
  const activeQuote =
    quotes.find((quote) => quote.id === row.active_quote_id) ||
    quotes[quotes.length - 1] ||
    null;
  const messages = [...(row.request_messages || [])]
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .map((message) => ({
      id: message.id,
      role: authorRoleFromSupabase(message.author_role),
      createdAt: displayTime(message.created_at),
      blocks:
        Array.isArray(message.blocks) && message.blocks.length
          ? enrichBlocksWithAttachments(message.blocks, message.id, attachments)
          : [{ type: "text", text: message.body || "" }],
    }));
  const files = attachments.length
    ? attachments
    : [...new Set((row.attachments || []).map((attachment) => attachment.name))];
  return normalizeRequestShape({
    id: row.request_number,
    supabaseId: row.id,
    customerId: row.customer_id,
    customer: row.customer_label || currentUser?.name || "Customer",
    title: row.title,
    status: row.status,
    checkResult: row.check_result || {
      status: row.check_status || "pending",
      adapter: "supabase",
      reason: "",
      missing: [],
      checkedAt: "",
    },
    quotes,
    activeQuoteId: activeQuote?.id || row.active_quote_id || "",
    confirmedQuoteId: row.confirmed_quote_id || "",
    price: activeQuote ? String(activeQuote.amount) : "",
    files,
    updated: displayTime(row.updated_at || row.created_at),
    messages,
  });
}

function orderMessageRecord(order, message) {
  return {
    id: message.id,
    orderId: order.id,
    requestId: order.requestId,
    customerId: order.customerId,
    authorRole: message.authorRole,
    authorName: message.authorName,
    body: message.body,
    visibility: message.visibility || "shared",
    createdAt: message.createdAt || "Now",
  };
}

function orderAuthorRoleToSupabase(role) {
  if (role === "customer") return "customer";
  if (role === "system") return "system";
  return "easy_harness";
}

function orderAuthorRoleFromSupabase(role) {
  if (role === "customer") return "customer";
  if (role === "system") return "system";
  return "staff";
}

function supabaseOrderMessageInsertFromLocal(message, orderUuid, authorId) {
  const authorRole = orderAuthorRoleToSupabase(message.authorRole);
  return {
    order_id: orderUuid,
    author_id:
      authorRole === "customer" || isUuidLike(authorId) ? authorId : null,
    author_role: authorRole,
    body: message.body,
    visibility: message.visibility === "internal" ? "internal" : "thread",
  };
}

function localOrderMessageFromSupabase(row) {
  return {
    id: row.id,
    authorRole: orderAuthorRoleFromSupabase(row.author_role),
    authorName: row.author_role === "customer" ? "Customer" : "Easy Harness",
    body: row.body || "",
    visibility: row.visibility || "thread",
    createdAt: displayTime(row.created_at),
  };
}

function paymentLedgerRecord(order, override = {}) {
  return {
    id: paymentRecordId(order.id, order.paymentMethodId || "checkout"),
    orderId: order.id,
    requestId: order.requestId,
    customerId: order.customerId,
    provider: order.paymentProvider || "",
    methodId: order.paymentMethodId || "",
    status: order.paymentStatus || "unpaid",
    amount: orderTotal(order),
    currency: order.currency || "USD",
    providerSessionId: order.paymentSession?.id || "",
    providerReference: order.paymentReference || "",
    createdAt: order.paymentSession?.createdAt || "Now",
    confirmedAt: order.paymentSession?.confirmedAt || order.paidAt || "",
    ...override,
  };
}

function shipmentLedgerRecord(order, override = {}) {
  const shipping = selectedShipping(order);
  return {
    id: shipmentRecordId(order.id),
    orderId: order.id,
    requestId: order.requestId,
    customerId: order.customerId,
    carrier: shipping?.carrier || "",
    service: shipping?.service || "",
    selectedShippingId: order.selectedShippingId || "",
    status: order.fulfillmentStatus || "not_shipped",
    trackingNumber: order.trackingNumber || "",
    trackingUrl: order.carrierTrackingUrl || "",
    trackingSource: order.trackingSource || "manual",
    adapter: platformAdapters.shipping.id,
    events: order.trackingEvents || [],
    updatedAt: order.updated || "Now",
    ...override,
  };
}

function buildNotificationDeliveryRecords(notification) {
  return (notification.channels || []).map((item) => ({
    id: notificationDeliveryId(notification.id, item.channel),
    notificationId: notification.id,
    userId: notification.userId,
    role: notification.role,
    requestId: notification.requestId,
    channel: item.channel,
    status: item.status,
    providerMessageId: item.providerMessageId || "",
    lastAttemptAt: item.lastAttemptAt || "",
    error: item.error || "",
    createdAt: notification.createdAt || "Now",
  }));
}

function mergeById(current, records) {
  const map = new Map(current.map((item) => [item.id, item]));
  records.forEach((record) => {
    map.set(record.id, { ...(map.get(record.id) || {}), ...record });
  });
  return [...map.values()];
}

function requestIdentity(request = {}) {
  return request.supabaseId || request.id;
}

function dedupeRequestsByIdentity(items = []) {
  const map = new Map();
  items.forEach((item) => {
    const key = requestIdentity(item);
    if (!key) return;
    map.set(key, { ...(map.get(key) || {}), ...item });
  });
  return [...map.values()];
}

function appendMessageIfMissing(messages = [], message) {
  if (!message) return messages;
  const body = requestBodyFromBlocks(message.blocks || []);
  const exists = messages.some((item) => {
    const sameId = item.id && message.id && item.id === message.id;
    const sameBody =
      body &&
      requestBodyFromBlocks(item.blocks || []) === body &&
      item.role === message.role;
    return sameId || sameBody;
  });
  return exists ? messages : [...messages, message];
}

function buildAttachmentRecords(files, requestId, messageIdValue, uploadedBy) {
  return files.map((file) => {
    const id = file.id || attachmentId();
    const name = fileName(file);
    return {
      id,
      requestId,
      messageId: messageIdValue || "",
      uploadedBy,
      name,
      size: typeof file === "string" ? 0 : file.size || 0,
      type:
        typeof file === "string"
          ? "legacy"
          : file.type || "application/octet-stream",
      storageObjectId: storageObjectId(id),
      objectPath: `${uploadedBy}/requests/${requestId}/${id}-${name.replace(/[^\w.\-]+/g, "_")}`,
      sourceFile: typeof file === "object" ? file.sourceFile || null : null,
      createdAt: "Now",
    };
  });
}

function storageObjectRecordFromAttachment(attachment, override = {}) {
  return {
    id: attachment.storageObjectId || storageObjectId(attachment.id),
    attachmentId: attachment.id,
    requestId: attachment.requestId,
    messageId: attachment.messageId || "",
    uploadedBy: attachment.uploadedBy,
    bucket: "request-attachments",
    objectPath: attachment.objectPath,
    fileName: attachment.name,
    contentType: attachment.type || "application/octet-stream",
    size: attachment.size || 0,
    status: "metadata_registered",
    uploadMode: "local_metadata",
    signedUploadUrl: "",
    downloadUrl: "",
    accessScope: "request_participants",
    adapter: platformAdapters.storage.id,
    createdAt: attachment.createdAt || "Now",
    ...override,
  };
}

function createStorageUploadAdapter(
  attachments,
  requestId,
  messageIdValue,
  uploadedBy,
) {
  const storageObjects = attachments.map((attachment) =>
    storageObjectRecordFromAttachment(attachment, {
      requestId,
      messageId: messageIdValue || "",
      uploadedBy,
    }),
  );

  return {
    adapter: platformAdapters.storage.id,
    uploadBatchId: `storage_batch_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    attachments,
    storageObjects,
    eventAction: "storage_upload_contract_created",
    eventDetail: `${attachments.length} file metadata record(s) registered for storage handoff.`,
  };
}

function createLocalAuthSession(user) {
  return {
    id: authSessionId(user.id),
    userId: user.id,
    email: user.email,
    role: user.role,
    status: "active",
    issuedAt: "Now",
    expiresAt: "Browser session",
    revokedAt: "",
    adapter: platformAdapters.auth.id,
  };
}

function createSupabaseAuthSession(session, user) {
  return {
    id: session?.access_token
      ? `sb_${session.access_token.slice(0, 12)}`
      : authSessionId(user.id),
    userId: user.id,
    email: user.email,
    role: user.role,
    status: "active",
    issuedAt: session?.user?.last_sign_in_at || "Now",
    expiresAt: session?.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : "Managed session",
    revokedAt: "",
    adapter: "supabase-auth",
  };
}

function profileUserFromSupabase(profile, authUser = {}) {
  const email = profile?.email || authUser.email || "";
  const nickname =
    profile?.display_name ||
    authUser.user_metadata?.nickname ||
    email.split("@")[0] ||
    "Customer";
  return {
    id: profile?.id || authUser.id,
    name: nickname,
    email,
    role: profile?.role || "customer",
    status: profile?.status || "active",
    verified: Boolean(profile?.verified || authUser.email_confirmed_at),
    company: "",
    country: "",
    phone: "",
    termsAccepted: false,
    termsAcceptedAt: "",
    notificationPreferences: {
      email: Boolean(profile?.notification_preferences?.email ?? true),
      whatsapp: Boolean(profile?.notification_preferences?.whatsapp ?? false),
      inApp: true,
    },
    defaultAddress: {
      name: nickname,
      company: "",
      country: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      phone: "",
      email,
      taxId: "",
    },
    authMethods: ["supabase"],
    lastActive: "Just now",
  };
}

function signInWithEmailAdapter(email, users) {
  const normalized = email.trim().toLowerCase();
  if (!isEmailLike(normalized)) {
    return {
      ok: false,
      adapter: platformAdapters.auth.id,
      error: "Enter a valid email address.",
    };
  }
  const user = users.find(
    (item) =>
      item.status !== "suspended" && item.email.toLowerCase() === normalized,
  );

  if (!user) {
    return {
      ok: false,
      adapter: platformAdapters.auth.id,
      error: "Use an active Easy Harness account email.",
    };
  }

  const session = createLocalAuthSession(user);
  return {
    ok: true,
    adapter: platformAdapters.auth.id,
    user,
    session,
    event: makeServiceEvent(
      platformAdapters.auth.id,
      "session_created",
      "user",
      user.id,
      `${roleCopy[user.role]} session issued.`,
    ),
  };
}

function createCustomerAccountAdapter({ nickname = "", email }) {
  const normalized = email.trim().toLowerCase();
  if (!isEmailLike(normalized)) {
    return {
      ok: false,
      adapter: platformAdapters.auth.id,
      error: "Enter a valid email address.",
    };
  }

  const user = {
    id: `u_customer_${Date.now()}`,
    name: nickname.trim() || normalized.split("@")[0],
    email: normalized,
    role: "customer",
    status: "active",
    verified: true,
    company: "",
    country: "",
    phone: "",
    termsAccepted: false,
    termsAcceptedAt: "",
    notificationPreferences: {
      email: true,
      whatsapp: false,
      inApp: true,
    },
    defaultAddress: {
      name: nickname.trim(),
      company: "",
      country: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      phone: "",
      email: normalized,
      taxId: "",
    },
    authMethods: ["email"],
    lastActive: "Just now",
  };

  const session = createLocalAuthSession(user);
  return {
    ok: true,
    adapter: platformAdapters.auth.id,
    user,
    session,
    event: makeServiceEvent(
      platformAdapters.auth.id,
      "customer_account_created",
      "user",
      user.id,
      "Customer account and session issued.",
    ),
  };
}

function clearAuthSessionAdapter(session) {
  return {
    adapter: platformAdapters.auth.id,
    session: session
      ? { ...session, status: "revoked", revokedAt: "Now" }
      : null,
    event: makeServiceEvent(
      platformAdapters.auth.id,
      "session_revoked",
      "user",
      session?.userId || "unknown",
      "Session ended.",
    ),
  };
}

function collectRequestFileNames(request) {
  const names = new Set((request.files || []).map(fileName));
  (request.messages || []).forEach((message) => {
    (message.blocks || []).forEach((block) => {
      if (block.type === "attachments") {
        (block.files || []).forEach((file) => names.add(fileName(file)));
      }
    });
  });
  return [...names];
}

function seedAttachmentsFromRequests(requests) {
  return requests.flatMap((request) =>
    collectRequestFileNames(request).map((name) => {
      const id = attachmentId();
      return {
        id,
        requestId: request.id,
        messageId: "",
        uploadedBy: request.customerId,
        name,
        size: 0,
        type: "seed",
        storageObjectId: storageObjectId(id),
        objectPath: `requests/${request.id}/seed-${name}`,
        createdAt: request.updated || "Now",
      };
    }),
  );
}

function seedStorageObjectsFromAttachments(attachments) {
  return attachments.map(storageObjectRecordFromAttachment);
}

function seedRequestMessagesFromRequests(requests) {
  return requests.flatMap((request) =>
    (request.messages || []).map((message) =>
      requestMessageRecord(request, message),
    ),
  );
}

function seedQuotesFromRequests(requests) {
  return requests.flatMap(
    (request) => normalizeRequestShape(request).quotes || [],
  );
}

function seedPaymentsFromOrders(orders) {
  return orders
    .filter((order) => order.paymentStatus && order.paymentStatus !== "unpaid")
    .map((order) => paymentLedgerRecord(normalizeOrderShape(order)));
}

function seedShipmentsFromOrders(orders) {
  return orders.map((order) =>
    shipmentLedgerRecord(normalizeOrderShape(order)),
  );
}

function seedOrderMessagesFromOrders(orders) {
  return orders.flatMap((order) =>
    (order.supportMessages || []).map((message) =>
      orderMessageRecord(order, message),
    ),
  );
}

function seedNotificationDeliveries(notifications) {
  return notifications.flatMap(buildNotificationDeliveryRecords);
}

function makeAuditLog(action, actor, targetType, targetId, detail = "") {
  return {
    id: auditId(),
    action,
    actorId: actor?.id || "system",
    actorEmail: actor?.email || "system",
    targetType,
    targetId,
    detail,
    createdAt: "Now",
  };
}

function makeNotification({
  userId = "",
  role = "",
  requestId = "",
  title,
  body,
}) {
  const channels = notificationChannels.map((channel) => ({
    channel: channel.id,
    status: channel.defaultStatus,
    providerMessageId: "",
    lastAttemptAt: channel.id === "in_app" ? "Now" : "",
    error: "",
  }));

  return {
    id: notificationId(),
    userId,
    role,
    requestId,
    title,
    body,
    channels,
    adapter: platformAdapters.notifications.id,
    createdAt: "Now",
    readAt: "",
  };
}

function localNotificationFromSupabase(row) {
  return {
    id: row.id,
    userId: row.user_id || "",
    role: row.role || "",
    requestId: row.requests?.request_number || row.orders?.order_number || "",
    title: row.title,
    body: row.body,
    channels: notificationChannels.map((channel) => ({
      channel: channel.id,
      status: channel.id === "in_app" ? "delivered" : "queued",
      providerMessageId: "",
      lastAttemptAt: channel.id === "in_app" ? displayTime(row.created_at) : "",
      error: "",
    })),
    adapter: platformAdapters.notifications.id,
    createdAt: displayTime(row.created_at),
    readAt: row.read_at ? displayTime(row.read_at) : "",
  };
}

function makeServiceEvent(adapter, action, targetType, targetId, detail = "") {
  return {
    id: `svc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    adapter,
    action,
    targetType,
    targetId,
    detail,
    createdAt: "Now",
  };
}

function quoteId() {
  return `quote_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function supportMessageId() {
  return `support_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeSupportMessage({ authorRole, authorName, body }) {
  return {
    id: supportMessageId(),
    authorRole,
    authorName,
    body,
    visibility: "shared",
    createdAt: "Now",
  };
}

function hasHarnessSignal(text) {
  return /harness|wire|wiring|cable|connector|sensor|battery|adapter|pigtail|loom|线束|连接器/i.test(
    text,
  );
}

function hasIrrelevantSignal(text) {
  return /shoe|shoes|shirt|essay|homework|logo|website|restaurant|旅行|论文|鞋|衣服/i.test(
    text,
  );
}

function runLocalChecking(request) {
  const text = getFirstCustomerText(request);
  const files = request.files || [];

  if (hasIrrelevantSignal(text) && !hasHarnessSignal(text)) {
    return {
      status: "rejected",
      adapter: platformAdapters.checking.id,
      reason:
        "The uploaded request does not appear to describe a wiring harness or connector assembly.",
      missing: [],
      checkedAt: "Now",
    };
  }

  if (!files.length || !hasHarnessSignal(text)) {
    return {
      status: "needs_info",
      adapter: platformAdapters.checking.id,
      reason:
        "We need a clearer harness description or at least one relevant file before review can start.",
      missing: files.length
        ? ["harness description"]
        : ["design file", "harness description"],
      checkedAt: "Now",
    };
  }

  return {
    status: "accepted",
    adapter: platformAdapters.checking.id,
    reason: "The request has enough information to enter review.",
    missing: [],
    checkedAt: "Now",
  };
}

function runCheckingAdapter(request) {
  return {
    adapter: platformAdapters.checking.id,
    input: {
      requestId: request.id,
      fileCount: (request.files || []).length,
      text: getFirstCustomerText(request),
    },
    result: runLocalChecking(request),
  };
}

function quoteShippingRatesAdapter(packageEstimate) {
  const surcharge = Math.max(
    0,
    Math.ceil((packageEstimate.weightKg - 0.5) * 8),
  );
  return {
    adapter: platformAdapters.shipping.id,
    rateQuoteId: `rate_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    quotedAt: "Now",
    rates: shippingTemplates.map((template) => ({
      ...template,
      price: template.basePrice + surcharge,
      currency: "USD",
      incoterm: "DAP",
      adapter: platformAdapters.shipping.id,
      source: template.source || "Estimated rate",
    })),
  };
}

function createPaymentSessionAdapter(order, method) {
  const isBankTransfer = method.id === "bank_transfer";
  const isMarketplace = method.id === "marketplace_protected";
  const marketplacePayment = isMarketplace
    ? {
        ...marketplacePaymentDetails(order),
        provider: method.provider,
        status: "requested",
        requestedAt: "Now",
        updatedAt: "Now",
      }
    : null;
  const session = {
    id: `${isBankTransfer ? "bank" : isMarketplace ? "marketplace" : "pay"}_${method.id}_${order.id}`,
    provider: method.provider,
    status: isBankTransfer
      ? "awaiting_receipt"
      : isMarketplace
        ? "link_requested"
        : "awaiting_callback",
    amount: orderTotal(order),
    currency: order.currency,
    createdAt: "Now",
  };

  return {
    adapter: platformAdapters.payment.id,
    session,
    orderPatch: {
      status: isBankTransfer ? "awaiting_bank_transfer" : order.status,
      paymentStatus: isBankTransfer
        ? "bank_transfer_pending"
        : "payment_pending",
      paymentMethodId: method.id,
      paymentProvider: method.provider,
      paymentReference: isBankTransfer
        ? order.bankTransferReference || `BT-${order.id}`
        : marketplacePayment?.reference || order.paymentReference || "",
      paymentSession: session,
      marketplacePayment: marketplacePayment || order.marketplacePayment || {},
      snapshot: marketplacePayment
        ? {
            ...(order.snapshot || {}),
            marketplacePayment,
          }
        : order.snapshot,
      updated: "Just now",
    },
    eventAction: isBankTransfer
      ? "bank_transfer_reference_created"
      : isMarketplace
        ? "marketplace_payment_link_requested"
        : "payment_session_created",
    eventDetail: isBankTransfer
      ? "Bank transfer reference issued."
      : isMarketplace
        ? "Marketplace protected payment link requested."
        : `${method.provider} hosted session created.`,
  };
}

function confirmPaymentCallbackAdapter(order, method) {
  const session = {
    ...(order.paymentSession || {}),
    provider: method.provider,
    status: "confirmed",
    confirmedAt: "Now",
  };

  return {
    adapter: platformAdapters.payment.id,
    session,
    orderPatch: {
      status: "scheduled",
      paymentStatus: "paid",
      paymentMethodId: method.id,
      paymentProvider: method.provider,
      paymentReference: `${method.provider}-${order.id}`,
      paymentSession: session,
      paidAt: "Now",
      productionStatus: "scheduled",
      updated: "Just now",
    },
    eventAction: "payment_callback_confirmed",
    eventDetail: `${method.provider} payment callback recorded.`,
  };
}

function routeNotificationAdapter(payload) {
  const notification = makeNotification(payload);
  return {
    adapter: platformAdapters.notifications.id,
    notification,
    deliveries: buildNotificationDeliveryRecords(notification),
    event: makeServiceEvent(
      platformAdapters.notifications.id,
      "notification_routed",
      payload.requestId ? "request" : "user",
      payload.requestId || payload.userId || payload.role || "broadcast",
      payload.title,
    ),
  };
}

function buildShipmentUpdateAdapter(order, form) {
  const nextStatus =
    form.shipmentStatus === "delivered"
      ? "delivered"
      : form.shipmentStatus === "shipped" || form.trackingNumber
        ? "shipped"
        : order.status === "shipped" || order.status === "delivered"
          ? "ready_to_ship"
          : order.status;
  const hasTracking =
    form.trackingNumber || form.shipmentStatus !== "not_shipped";
  const trackingEvents = hasTracking
    ? [
        {
          status:
            form.shipmentStatus === "delivered"
              ? "Delivered"
              : form.shipmentStatus === "shipped"
                ? "In transit"
                : "Label created",
          time: "Now",
          detail:
            form.shipmentStatus === "delivered"
              ? "Shipment delivered by carrier."
              : form.trackingSource === "api"
                ? "Carrier API tracking is linked."
                : "Manual tracking link is available.",
        },
        ...(order.trackingEvents || []),
      ]
    : order.trackingEvents;

  return {
    adapter: platformAdapters.shipping.id,
    orderPatch: {
      status: nextStatus,
      fulfillmentStatus: form.shipmentStatus,
      trackingNumber: form.trackingNumber,
      carrierTrackingUrl: form.carrierTrackingUrl,
      trackingSource: form.trackingSource,
      trackingEvents,
    },
    eventAction: "tracking_update_recorded",
    eventDetail: hasTracking
      ? `Shipment status changed to ${form.shipmentStatus}.`
      : "Shipment details updated.",
  };
}

function createQuoteRecord(request, amount, actor) {
  const currentVersion = Math.max(
    0,
    ...(request.quotes || []).map((quote) => quote.version || 0),
  );
  const basisMessageIds = (request.messages || [])
    .filter((message) => message.role === "customer" || message.role === "easy")
    .map((message) => message.id);

  return {
    id: quoteId(),
    requestId: request.id,
    version: currentVersion + 1,
    amount: Number(amount),
    currency: "USD",
    scope: "Harness assembly only",
    excludes: ["Shipping", "Import duties", "VAT", "Carrier brokerage"],
    basisMessageIds,
    status: "released",
    releasedBy: actor?.id || "",
    releasedAt: "Now",
    validUntil: estimateDate(14),
  };
}

function activeQuoteForRequest(request) {
  if (!request?.quotes?.length) return null;
  return (
    request.quotes.find((quote) => quote.id === request.activeQuoteId) ||
    request.quotes[request.quotes.length - 1]
  );
}

function normalizeRequestShape(request) {
  const quotes =
    request.quotes ||
    (request.price
      ? [
          {
            id: `legacy_quote_${request.id}`,
            requestId: request.id,
            version: 1,
            amount: Number(request.price || 0),
            currency: "USD",
            scope: "Harness assembly only",
            excludes: ["Shipping", "Import duties", "VAT", "Carrier brokerage"],
            basisMessageIds: (request.messages || []).map(
              (message) => message.id,
            ),
            status:
              request.status === "confirmed" || request.status === "paid"
                ? "confirmed"
                : "released",
            releasedBy: "system",
            releasedAt: request.updated || "Now",
            validUntil: estimateDate(14),
          },
        ]
      : []);

  return {
    checkResult: request.checkResult || {
      status:
        request.status === "checking"
          ? "queued"
          : request.status === "draft_saved"
            ? "not_started"
            : "accepted",
      adapter: platformAdapters.checking.id,
      reason: "",
      missing: [],
      checkedAt:
        request.status === "checking" || request.status === "draft_saved"
          ? ""
          : request.updated || "Now",
    },
    quotes,
    activeQuoteId: request.activeQuoteId || quotes[quotes.length - 1]?.id || "",
    confirmedQuoteId: request.confirmedQuoteId || "",
    ...request,
  };
}

function orderIdFromRequest(requestId) {
  return requestId.replace("HD-", "EH-ORD-");
}

function estimatePackage(request) {
  const lowerTitle = request.title.toLowerCase();
  const fileCount = Math.max((request.files || []).length, 1);
  const baseWeight = lowerTitle.includes("battery")
    ? 0.8
    : lowerTitle.includes("field")
      ? 1.1
      : 0.6;
  const weightKg = Number((baseWeight + fileCount * 0.08).toFixed(1));
  return {
    weightKg,
    lengthCm: lowerTitle.includes("field") ? 34 : 28,
    widthCm: 20,
    heightCm: lowerTitle.includes("field") ? 10 : 8,
    source: "Estimated from request scope",
  };
}

function getFirstCustomerText(request) {
  const message = request.messages.find((item) => item.role === "customer");
  const block = message?.blocks?.find((item) => item.type === "text");
  return block?.text || "";
}

function getCustomerThreadText(request = { messages: [] }) {
  return (request.messages || [])
    .filter((item) => item.role === "customer")
    .flatMap((message) => message.blocks || [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n");
}

function getLastEasyMessage(request) {
  const messages = [...request.messages].reverse();
  return messages.find((message) => message.role === "easy") || null;
}

function createOrderFromRequest(request, user) {
  const orderId = orderIdFromRequest(request.id);
  const packageEstimate = estimatePackage(request);
  const firstCustomerText = getFirstCustomerText(request);
  const lastEasyMessage = getLastEasyMessage(request);
  const quote = activeQuoteForRequest(request);
  const harnessPrice = Number(quote?.amount || request.price || 0);

  return {
    id: orderId,
    requestId: request.id,
    quoteId: quote?.id || "",
    quoteVersion: quote?.version || 1,
    customerId: request.customerId,
    customer: request.customer,
    title: request.title,
    status: "checkout",
    paymentStatus: "unpaid",
    paymentMethodId: "",
    paymentProvider: "",
    paymentReference: "",
    paymentSession: null,
    paidAt: "",
    productionStatus: "checkout",
    fulfillmentStatus: "not_shipped",
    harnessPrice,
    currency: "USD",
    origin: defaultOrigin,
    packageEstimate,
    incoterm: "DAP",
    dutiesPolicy: "dap_not_collected",
    address: {
      name: user?.name || request.customer,
      company: user?.company || "",
      country: user?.country || "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      phone: user?.phone || "",
      email: user?.email || "",
      taxId: "",
    },
    shippingOptions: getShippingOptions(packageEstimate),
    selectedShippingId: "dhl-express",
    productionLeadTime: "7-10 business days after payment",
    estimatedProductionComplete: estimateDate(10),
    trackingNumber: "",
    carrierTrackingUrl: "",
    trackingSource: "manual",
    trackingEvents: [],
    supportMessages: [],
    bankTransferReference: `BT-${orderId}`,
    marketplacePayment: {},
    internalNotes: "",
    snapshot: {
      requestTitle: request.title,
      customerSummary: firstCustomerText,
      requestFiles: collectRequestFileNames(request),
      latestEasyBlocks: sanitizeBlocksForStorage(lastEasyMessage?.blocks || []),
      confirmedQuote: quote,
      confirmedAt: "Now",
    },
    updated: "Just now",
  };
}

function localOrderFromSupabase(row, currentUser) {
  const packageEstimate = row.package_estimate || {};
  const storedShippingPrice = Number(row.shipping_price || 0);
  const shippingOptions = getShippingOptions(packageEstimate).map(
    (option, index) =>
      index === 0 && storedShippingPrice
        ? { ...option, price: storedShippingPrice }
        : option,
  );
  const requestNumber =
    row.requests?.request_number || row.snapshot?.requestNumber || "";
  const marketplacePayment = row.snapshot?.marketplacePayment || {};
  const supportMessages = [...(row.order_messages || [])]
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .map(localOrderMessageFromSupabase);

  return normalizeOrderShape({
    id: row.order_number,
    supabaseId: row.id,
    requestId: requestNumber,
    quoteId: row.quote_id || "",
    quoteVersion: row.snapshot?.confirmedQuote?.version || 1,
    customerId: row.customer_id,
    customer: currentUser?.name || row.requests?.customer_label || "Customer",
    title: row.title,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethodId: marketplacePayment.status ? "marketplace_protected" : "",
    paymentProvider: marketplacePayment.provider || "",
    paymentReference: marketplacePayment.reference || "",
    paymentSession: marketplacePayment.status
      ? {
          id: `marketplace_${row.order_number}`,
          provider: marketplacePayment.provider || marketplacePaymentDefaults.provider,
          status: marketplacePayment.status,
          checkoutUrl: marketplacePayment.checkoutUrl || "",
          reference: marketplacePayment.reference || "",
        }
      : null,
    paidAt: "",
    productionStatus: row.production_status,
    fulfillmentStatus: row.fulfillment_status,
    harnessPrice: Number(row.harness_price || 0),
    currency: row.currency || "USD",
    origin: defaultOrigin,
    packageEstimate,
    incoterm: row.incoterm || "DAP",
    dutiesPolicy: "dap_not_collected",
    address: row.address || {},
    shippingOptions,
    selectedShippingId: shippingOptions[0]?.id || "dhl-express",
    productionLeadTime:
      row.production_lead_time || "7-10 business days after payment",
    estimatedProductionComplete: row.estimated_production_complete || "",
    trackingNumber: "",
    carrierTrackingUrl: "",
    trackingSource: "manual",
    trackingEvents: [],
    supportMessages,
    bankTransferReference: `BT-${row.order_number}`,
    marketplacePayment,
    internalNotes: "",
    snapshot: row.snapshot || {},
    updated: displayTime(row.updated_at || row.created_at),
  });
}

function getShippingOptions(packageEstimate) {
  return quoteShippingRatesAdapter(packageEstimate).rates;
}

function normalizeShippingOption(option, fallback = {}) {
  const template =
    shippingTemplates.find((item) => item.id === option?.id) || {};
  return {
    ...template,
    ...option,
    level:
      option?.level ||
      template.level ||
      fallback.level ||
      option?.carrier ||
      "Standard",
    source: option?.source || template.source || "Estimated rate",
    currency: option?.currency || "USD",
    incoterm: option?.incoterm || "DAP",
  };
}

function normalizeOrderShape(order) {
  const normalizedStatus =
    order.status === "paid" && order.paymentStatus === "paid"
      ? "scheduled"
      : order.status === "qc"
        ? "ready_to_ship"
        : order.status;
  const packageEstimate = order.packageEstimate || {
    weightKg: 0.8,
    lengthCm: 28,
    widthCm: 20,
    heightCm: 8,
  };
  const shippingOptions = order.shippingOptions?.length
    ? order.shippingOptions.map((option) => normalizeShippingOption(option))
    : getShippingOptions(packageEstimate);
  const selectedShippingId = shippingOptions.some(
    (option) => option.id === order.selectedShippingId,
  )
    ? order.selectedShippingId
    : shippingOptions[0]?.id || "";

  return {
    ...order,
    status: normalizedStatus || "checkout",
    paymentStatus: order.paymentStatus || "unpaid",
    paymentMethodId: order.paymentMethodId || "",
    paymentProvider: order.paymentProvider || "",
    paymentReference: order.paymentReference || "",
    paymentSession: order.paymentSession || null,
    paidAt: order.paidAt || "",
    productionStatus:
      order.productionStatus === "paid" || order.productionStatus === "qc"
        ? "scheduled"
        : order.productionStatus || normalizedStatus || "checkout",
    fulfillmentStatus: order.fulfillmentStatus || "not_shipped",
    origin: order.origin || defaultOrigin,
    packageEstimate,
    incoterm: order.incoterm || "DAP",
    dutiesPolicy: order.dutiesPolicy || "dap_not_collected",
    shippingOptions,
    selectedShippingId,
    trackingNumber: order.trackingNumber || "",
    carrierTrackingUrl: order.carrierTrackingUrl || "",
    trackingSource: order.trackingSource || "manual",
    trackingEvents: order.trackingEvents || [],
    supportMessages: order.supportMessages || [],
    bankTransferReference: order.bankTransferReference || `BT-${order.id}`,
    marketplacePayment: marketplacePaymentDetails(order),
    internalNotes: order.internalNotes || "",
    snapshot: {
      requestTitle: "",
      customerSummary: "",
      requestFiles: [],
      latestEasyBlocks: [],
      ...(order.snapshot || {}),
      marketplacePayment: marketplacePaymentDetails(order),
    },
    address: {
      name: "",
      company: "",
      country: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      phone: "",
      email: "",
      taxId: "",
      ...(order.address || {}),
    },
  };
}

function paymentMethodById(methodId) {
  return (
    paymentMethods.find((method) => method.id === methodId) || paymentMethods[0]
  );
}

function paymentProviderKey(method) {
  if (method?.id === "paypal") return "paypal";
  if (method?.id === "bank_transfer") return "bank_transfer";
  if (method?.id === "marketplace_protected") return "marketplace";
  return "stripe";
}

function estimateDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function selectedShipping(order) {
  return (
    order.shippingOptions.find(
      (option) => option.id === order.selectedShippingId,
    ) ||
    order.shippingOptions[0] ||
    null
  );
}

function orderTotal(order) {
  const shipping = selectedShipping(order);
  return Number(order.harnessPrice || 0) + Number(shipping?.price || 0);
}

function linkedOrderForRequest(request, orders = []) {
  return orders.find((order) => order.requestId === request.id) || null;
}

function requestHasMovedToOrder(request, orders = []) {
  return (
    ["confirmed", "paid"].includes(request.status) ||
    Boolean(linkedOrderForRequest(request, orders))
  );
}

const seedOrders = [createOrderFromRequest(seedRequests[1], seedUsers[0])];

const seedAttachmentRecords = seedAttachmentsFromRequests(seedRequests);
const seedStorageObjectRecords = seedStorageObjectsFromAttachments(
  seedAttachmentRecords,
);
const seedRequestMessageRecords = seedRequestMessagesFromRequests(seedRequests);
const seedQuoteRecords = seedQuotesFromRequests(seedRequests);
const seedPaymentRecords = seedPaymentsFromOrders(seedOrders);
const seedShipmentRecords = seedShipmentsFromOrders(seedOrders);
const seedOrderMessageRecords = seedOrderMessagesFromOrders(seedOrders);
const seedAuditLogs = [
  makeAuditLog(
    "workspace_seeded",
    null,
    "workspace",
    "local",
    "Initial local data is available.",
  ),
];
const seedNotifications = [];
const seedNotificationDeliveryRecords =
  seedNotificationDeliveries(seedNotifications);
const seedServiceEvents = [
  makeServiceEvent(
    "workspace",
    "adapters_ready",
    "workspace",
    "local",
    "Local API-ready adapters are available.",
  ),
];

function App() {
  const labPath =
    typeof window !== "undefined" &&
    (window.location.pathname === "/agent-lab" ||
      window.location.hash === "#agent-lab");
  if (labPath) return <AgentDraftLab />;

  const [users, setUsers] = useStoredState("easy-harness.users", seedUsers);
  const [currentUserId, setCurrentUserId] = useStoredState(
    "easy-harness.currentUserId",
    "",
  );
  const [authSession, setAuthSession] = useStoredState(
    "easy-harness.authSession",
    null,
  );
  const [userView, setUserView] = useStoredState("easy-harness.userView", "start");
  const [staffView, setStaffView] = useStoredState("easy-harness.staffView", "queue");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Server-backed business data must not use browser localStorage as the
  // source of truth when Supabase is configured. In hosted mode, these records
  // are loaded from Supabase after auth/session restore; localStorage is kept
  // only for local demo mode.
  const [requests, setRequests] = supabaseConfigured
    ? useState([])
    : useStoredState("easy-harness.requests", seedRequests);
  const [orders, setOrders] = supabaseConfigured
    ? useState([])
    : useStoredState("easy-harness.orders", seedOrders);
  const [activeOrderId, setActiveOrderId] = supabaseConfigured
    ? useState("")
    : useStoredState("easy-harness.activeOrderId", seedOrders[0].id);
  const [attachmentRecords, setAttachmentRecords] = supabaseConfigured
    ? useState([])
    : useStoredState("easy-harness.attachments", seedAttachmentRecords);
  const [storageObjectRecords, setStorageObjectRecords] = supabaseConfigured
    ? useState([])
    : useStoredState("easy-harness.storageObjects", seedStorageObjectRecords);
  const [requestMessageRecords, setRequestMessageRecords] = supabaseConfigured
    ? useState([])
    : useStoredState("easy-harness.requestMessages", seedRequestMessageRecords);
  const [quoteRecords, setQuoteRecords] = supabaseConfigured
    ? useState([])
    : useStoredState("easy-harness.quotes", seedQuoteRecords);
  const [paymentRecords, setPaymentRecords] = supabaseConfigured
    ? useState([])
    : useStoredState("easy-harness.payments", seedPaymentRecords);
  const [shipmentRecords, setShipmentRecords] = supabaseConfigured
    ? useState([])
    : useStoredState("easy-harness.shipments", seedShipmentRecords);
  const [orderMessageRecords, setOrderMessageRecords] = supabaseConfigured
    ? useState([])
    : useStoredState("easy-harness.orderMessages", seedOrderMessageRecords);
  const [notifications, setNotifications] = useStoredState(
    "easy-harness.notifications",
    seedNotifications,
  );
  const [notificationDeliveryRecords, setNotificationDeliveryRecords] =
    useStoredState(
      "easy-harness.notificationDeliveries",
      seedNotificationDeliveryRecords,
    );
  const [readNotificationIds, setReadNotificationIds] = useStoredState(
    "easy-harness.readNotificationIds",
    [],
  );
  const [auditLogs, setAuditLogs] = useStoredState(
    "easy-harness.auditLogs",
    seedAuditLogs,
  );
  const [serviceEvents, setServiceEvents] = useStoredState(
    "easy-harness.serviceEvents",
    seedServiceEvents,
  );
  const [activeRequestId, setActiveRequestId] = supabaseConfigured
    ? useState("")
    : useStoredState("easy-harness.activeRequestId", seedRequests[0].id);
  const [description, setDescription] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [fileError, setFileError] = useState("");
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [processingRequestId, setProcessingRequestId] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState("");
  const [sendingUserMessage, setSendingUserMessage] = useState(false);
  const [agentActivities, setAgentActivities] = useState({});
  const [userComposer, setUserComposer] = useState("");
  const [userComposerFiles, setUserComposerFiles] = useState([]);
  const [staffComposer, setStaffComposer] = useState("");
  const [staffAttachment, setStaffAttachment] = useState([]);
  const [staffPrice, setStaffPrice] = useState("");
  const [includePreview, setIncludePreview] = useState(false);
  const [includeTable, setIncludeTable] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState("stripe_card");
  const [authModal, setAuthModal] = useState({
    open: false,
    mode: "login",
    reason: "",
    after: "",
  });
  const [activePolicyId, setActivePolicyId] = useState(defaultPolicyId);
  const [policyReturnView, setPolicyReturnView] = useState("start");
  const [authProviderStatus, setAuthProviderStatus] = useState(
    supabaseConfigured
      ? "connecting"
      : hostedAuthRequired
        ? "unavailable"
        : "local",
  );
  const [supabaseSessionReady, setSupabaseSessionReady] = useState(
    !supabaseConfigured,
  );
  const [databaseProviderStatus, setDatabaseProviderStatus] = useState(
    supabaseConfigured ? "connecting" : "local",
  );

  const uploadRef = useRef(null);
  const userComposerUploadRef = useRef(null);
  const submittingRequestRef = useRef(false);
  const sendingUserMessageRef = useRef(false);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) || null,
    [currentUserId, users],
  );

  const uploadTermsAccepted = Boolean(
    currentUser?.termsAccepted || readUploadTermsAccepted(currentUser?.id),
  );

  const visibleRequests = useMemo(() => {
    if (!currentUser) return [];
    // In Supabase mode the server RPC already scopes rows by auth.uid() and
    // role. Do not re-filter by a browser-side user id here; doing so can hide
    // valid server records after session restore, incognito login, or cross-tab
    // auth changes.
    if (supabaseConfigured) return dedupeRequestsByIdentity(requests);
    const scoped =
      currentUser.role === "customer"
        ? requests.filter((request) => request.customerId === currentUser.id)
        : requests;
    return dedupeRequestsByIdentity(scoped);
  }, [currentUser, requests]);

  const activeRequest = useMemo(
    () =>
      visibleRequests.find((request) => request.id === activeRequestId) ||
      visibleRequests[0] ||
      (currentUser?.role === "staff" ? requests[0] : null),
    [activeRequestId, currentUser, requests, visibleRequests],
  );

  const visibleOrders = useMemo(() => {
    if (!currentUser) return [];
    // Same rule as requests: Supabase RPCs are the authority for workspace
    // visibility. Client-side filtering is only for local/demo mode.
    if (supabaseConfigured) return orders;
    if (currentUser.role === "customer") {
      return orders.filter((order) => order.customerId === currentUser.id);
    }
    return orders;
  }, [currentUser, orders]);

  const activeOrder = useMemo(
    () =>
      visibleOrders.find((order) => order.id === activeOrderId) ||
      visibleOrders[0] ||
      (currentUser?.role === "staff" ? orders[0] : null),
    [activeOrderId, currentUser, orders, visibleOrders],
  );

  const visibleNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications
      .filter(
        (notification) =>
          notification.userId === currentUser.id ||
          notification.role === currentUser.role,
      )
      .slice(0, 8);
  }, [currentUser, notifications]);

  useEffect(() => {
    if (!supabase || !currentUser || !activeRequest?.supabaseId)
      return undefined;
    if (
      supabaseConfigured &&
      (!supabaseSessionReady ||
        authSession?.adapter !== "supabase-auth" ||
        authSession.userId !== currentUser.id)
    )
      return undefined;
    if (
      !["checking", "needs_info", "in_review", "not_supported"].includes(
        activeRequest.status,
      )
    )
      return undefined;

    let disposed = false;
    const refresh = async () => {
      if (disposed) return;
      await loadSupabaseRequestData(currentUser);
    };
    const timer = window.setInterval(refresh, 8000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [
    activeRequest?.id,
    activeRequest?.status,
    activeRequest?.supabaseId,
    currentUser?.id,
    supabaseSessionReady,
    authSession?.adapter,
    authSession?.userId,
  ]);

  useEffect(() => {
    if (!supabase || !currentUser?.id) return;
    if (
      supabaseConfigured &&
      (!supabaseSessionReady ||
        authSession?.adapter !== "supabase-auth" ||
        authSession.userId !== currentUser.id)
    )
      return;
    if (["requests", "thread"].includes(userView)) {
      void loadSupabaseRequestData(currentUser);
    }
    if (["orders", "order"].includes(userView)) {
      void loadSupabaseOrderData(currentUser);
    }
  }, [
    currentUser?.id,
    supabase,
    userView,
    supabaseSessionReady,
    authSession?.adapter,
    authSession?.userId,
  ]);

  useEffect(() => {
    if (!supabase || !currentUser?.id || currentUser.role !== "staff") return;
    if (
      supabaseConfigured &&
      (!supabaseSessionReady ||
        authSession?.adapter !== "supabase-auth" ||
        authSession.userId !== currentUser.id)
    )
      return;
    if (["queue", "detail"].includes(staffView)) {
      void loadSupabaseRequestData(currentUser);
    }
    if (staffView === "order") {
      void loadSupabaseOrderData(currentUser);
    }
  }, [
    currentUser?.id,
    currentUser?.role,
    staffView,
    supabase,
    supabaseSessionReady,
    authSession?.adapter,
    authSession?.userId,
  ]);

  const backendTableRows = useMemo(
    () => [
      {
        localKey: "easy-harness.authSession",
        futureTable: "auth_sessions",
        owner: "Identity service",
        count: authSession ? 1 : 0,
      },
      {
        localKey: "easy-harness.users",
        futureTable: "profiles",
        owner: "Identity service",
        count: users.length,
      },
      {
        localKey: "easy-harness.requests",
        futureTable:
          databaseProviderStatus === "ready"
            ? "requests (Supabase live)"
            : "requests",
        owner: "Request service",
        count: requests.length,
      },
      {
        localKey: "easy-harness.requestMessages",
        futureTable:
          databaseProviderStatus === "ready"
            ? "request_messages (Supabase live)"
            : "request_messages",
        owner: "Request service",
        count: requestMessageRecords.length,
      },
      {
        localKey: "easy-harness.attachments",
        futureTable:
          databaseProviderStatus === "ready"
            ? "attachments (Supabase live metadata)"
            : "attachments",
        owner: "Storage service",
        count: attachmentRecords.length,
      },
      {
        localKey: "easy-harness.storageObjects",
        futureTable: "storage_objects",
        owner: "Storage service",
        count: storageObjectRecords.length,
      },
      {
        localKey: "easy-harness.quotes",
        futureTable: "quotes",
        owner: "Quote service",
        count: quoteRecords.length,
      },
      {
        localKey: "easy-harness.orders",
        futureTable: "orders",
        owner: "Order service",
        count: orders.length,
      },
      {
        localKey: "easy-harness.payments",
        futureTable: "payments / payment_sessions",
        owner: "Payment adapter",
        count: paymentRecords.length,
      },
      {
        localKey: "easy-harness.shipments",
        futureTable: "shipments / tracking_events",
        owner: "Shipping adapter",
        count: shipmentRecords.length,
      },
      {
        localKey: "easy-harness.orderMessages",
        futureTable: "order_messages",
        owner: "Order service",
        count: orderMessageRecords.length,
      },
      {
        localKey: "easy-harness.notifications",
        futureTable: "notifications",
        owner: "Notification router",
        count: notifications.length,
      },
      {
        localKey: "easy-harness.notificationDeliveries",
        futureTable: "notification_deliveries",
        owner: "Notification router",
        count: notificationDeliveryRecords.length,
      },
      {
        localKey: "easy-harness.auditLogs",
        futureTable: "audit_logs",
        owner: "Audit service",
        count: auditLogs.length,
      },
      {
        localKey: "easy-harness.serviceEvents",
        futureTable: "integration_events",
        owner: "Adapter layer",
        count: serviceEvents.length,
      },
    ],
    [
      authSession,
      databaseProviderStatus,
      users.length,
      requests.length,
      requestMessageRecords.length,
      attachmentRecords.length,
      storageObjectRecords.length,
      quoteRecords.length,
      orders.length,
      paymentRecords.length,
      shipmentRecords.length,
      orderMessageRecords.length,
      notifications.length,
      notificationDeliveryRecords.length,
      auditLogs.length,
      serviceEvents.length,
    ],
  );

  useEffect(() => {
    // Only local/demo mode should synthesize a local auth session. In hosted
    // Supabase mode the real auth session must come from supabase.auth; creating
    // a local replacement during restore can desync the visible workspace.
    if (supabaseConfigured) return;
    if (!currentUserId) {
      if (authSession) setAuthSession(null);
      return;
    }
    if (authSession?.userId === currentUserId) return;
    const selected = users.find(
      (user) => user.id === currentUserId && user.status !== "suspended",
    );
    if (selected) setAuthSession(createLocalAuthSession(selected));
  }, [authSession, currentUserId, setAuthSession, users]);

  useEffect(() => {
    if (!supabase) return undefined;

    let disposed = false;

    const restoreSession = async () => {
      setAuthProviderStatus("connecting");
      setSupabaseSessionReady(false);
      const { data, error } = await supabase.auth.getSession();
      if (disposed) return;
      if (error) {
        setAuthProviderStatus("error");
        setSupabaseSessionReady(true);
        return;
      }
      if (data.session) {
        await syncSupabaseSession(data.session, "session_restored");
        return;
      }
      setCurrentUserId("");
      setAuthSession(null);
      setSupabaseSessionReady(true);
      setAuthProviderStatus("ready");
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          if (event === "SIGNED_OUT") {
            setCurrentUserId("");
            setAuthSession(null);
          }
          setSupabaseSessionReady(true);
          setAuthProviderStatus("ready");
          return;
        }
        setSupabaseSessionReady(false);
        window.setTimeout(() => {
          syncSupabaseSession(session, event.toLowerCase());
        }, 0);
      },
    );

    restoreSession();

    return () => {
      disposed = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const records = requests.flatMap((request) =>
      (request.messages || []).map((message) =>
        requestMessageRecord(request, message),
      ),
    );
    setRequestMessageRecords((current) => mergeById(current, records));
  }, [requests, setRequestMessageRecords]);

  useEffect(() => {
    const records = requests.flatMap((request) => request.quotes || []);
    setQuoteRecords((current) => mergeById(current, records));
  }, [requests, setQuoteRecords]);

  useEffect(() => {
    const records = orders
      .filter(
        (order) => order.paymentStatus && order.paymentStatus !== "unpaid",
      )
      .map((order) => paymentLedgerRecord(order));
    setPaymentRecords((current) => mergeById(current, records));
  }, [orders, setPaymentRecords]);

  useEffect(() => {
    const records = orders.map((order) => shipmentLedgerRecord(order));
    setShipmentRecords((current) => mergeById(current, records));
  }, [orders, setShipmentRecords]);

  useEffect(() => {
    const records = orders.flatMap((order) =>
      (order.supportMessages || []).map((message) =>
        orderMessageRecord(order, message),
      ),
    );
    setOrderMessageRecords((current) => mergeById(current, records));
  }, [orders, setOrderMessageRecords]);

  useEffect(() => {
    const records = notifications.flatMap(buildNotificationDeliveryRecords);
    setNotificationDeliveryRecords((current) => mergeById(current, records));
  }, [notifications, setNotificationDeliveryRecords]);

  useEffect(() => {
    setRequests((current) => {
      const normalized = current.map(normalizeRequestShape);
      return JSON.stringify(normalized) === JSON.stringify(current)
        ? current
        : normalized;
    });
  }, [setRequests]);

  useEffect(() => {
    setAttachmentRecords((current) => {
      const known = new Set(
        current.map((record) => `${record.requestId}:${record.name}`),
      );
      const missing = requests.flatMap((request) =>
        collectRequestFileNames(request)
          .filter((name) => !known.has(`${request.id}:${name}`))
          .map((name) => {
            const id = attachmentId();
            return {
              id,
              requestId: request.id,
              messageId: "",
              uploadedBy: request.customerId,
              name,
              size: 0,
              type: "legacy",
              storageObjectId: storageObjectId(id),
              objectPath: `requests/${request.id}/legacy-${name}`,
              createdAt: request.updated || "Now",
            };
          }),
      );
      return missing.length ? [...missing, ...current] : current;
    });
  }, [requests, setAttachmentRecords]);

  useEffect(() => {
    const records = attachmentRecords.map(storageObjectRecordFromAttachment);
    setStorageObjectRecords((current) => mergeById(current, records));
  }, [attachmentRecords, setStorageObjectRecords]);

  useEffect(() => {
    setOrders((current) => {
      const normalized = current.map(normalizeOrderShape);
      return JSON.stringify(normalized) === JSON.stringify(current)
        ? current
        : normalized;
    });
  }, [setOrders]);

  useEffect(() => {
    setStaffPrice(activeRequest?.price || "");
  }, [activeRequestId]);

  useEffect(() => {
    if (!currentUser || !visibleRequests.length) return;
    const hasAccess = visibleRequests.some(
      (request) => request.id === activeRequestId,
    );
    if (!hasAccess) setActiveRequestId(visibleRequests[0].id);
  }, [activeRequestId, currentUser, visibleRequests]);

  useEffect(() => {
    if (!currentUser || !visibleOrders.length) return;
    const hasAccess = visibleOrders.some((order) => order.id === activeOrderId);
    if (!hasAccess) setActiveOrderId(visibleOrders[0].id);
  }, [activeOrderId, currentUser, visibleOrders]);

  useEffect(() => {
    if (userView !== "processing" || !processingRequestId) return undefined;

    setProcessingIndex(-1);
    const timers = processingSteps.map((_, index) =>
      window.setTimeout(() => setProcessingIndex(index), 380 + index * 560),
    );

    timers.push(
      window.setTimeout(() => {
        const requestForCheck = requests.find(
          (request) => request.id === processingRequestId,
        );
        recordServiceEvent(
          platformAdapters.checking.id,
          requestForCheck?.supabaseId
            ? "check_queued"
            : "check_waiting_for_staff",
          "request",
          processingRequestId,
          requestForCheck?.supabaseId
            ? "Request is waiting for Easy Harness checking."
            : "Easy Harness is waiting for the next detail in this thread.",
        );
        setUserView("thread");
      }, 1800),
    );

    return () => timers.forEach(window.clearTimeout);
  }, [processingRequestId, requests, userView]);

  function updateRequest(requestId, updater) {
    setRequests((current) =>
      current.map((request) =>
        request.id === requestId ? updater(request) : request,
      ),
    );
  }

  function updateOrder(orderId, updater) {
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? updater(order) : order)),
    );
  }

  function openOrder(orderId) {
    if (currentUser?.role === "customer") {
      const allowed = supabaseConfigured
        ? orders.some((order) => order.id === orderId)
        : orders.some(
            (order) => order.id === orderId && order.customerId === currentUser.id,
          );
      if (!allowed) return;
    }
    setActiveOrderId(orderId);
    if (currentUser?.role === "staff") {
      setStaffView("order");
      return;
    }
    setUserView("order");
  }

  function ensureOrderForRequest(request) {
    const existing = orders.find((order) => order.requestId === request.id);
    if (existing) return existing;
    const order = createOrderFromRequest(request, currentUser);
    setOrders((current) => [order, ...current]);
    writeShipmentLedger(order);
    recordAudit(
      "order_created",
      "order",
      order.id,
      `${order.id} created from ${request.id}.`,
    );
    return order;
  }

  async function confirmSupabaseRequestOrder(request, quote, order) {
    if (!supabase || !request?.supabaseId || !isUuidLike(quote?.id))
      return null;
    const shipping = selectedShipping(order);
    const { data, error } = await supabase.rpc("confirm_request_order", {
      p_request_id: request.supabaseId,
      p_quote_id: quote.id,
      p_order_number: order.id,
      p_title: order.title,
      p_harness_price: order.harnessPrice,
      p_shipping_price: Number(shipping?.price || 0),
      p_total_due: orderTotal(order),
      p_currency: order.currency || "USD",
      p_address: order.address || {},
      p_snapshot: {
        ...(order.snapshot || {}),
        requestNumber: request.id,
      },
      p_package_estimate: order.packageEstimate || {},
      p_production_lead_time: order.productionLeadTime || "",
      p_estimated_production_complete:
        order.estimatedProductionComplete || null,
    });

    if (error) {
      recordServiceEvent(
        "supabase-database",
        "order_confirm_failed",
        "request",
        request.id,
        error.message,
      );
      return null;
    }

    recordServiceEvent(
      "supabase-database",
      "order_confirmed",
      "order",
      order.id,
      "Confirmed request and checkout order saved to Supabase.",
    );
    return localOrderFromSupabase(
      {
        ...data,
        requests: {
          request_number: request.id,
          customer_label: request.customer,
        },
      },
      currentUser,
    );
  }

  async function persistSupabasePayment(order, method, session, patch, status) {
    if (!supabase || !order?.supabaseId) return null;
    const { data, error } = await supabase.rpc("record_order_payment", {
      p_order_id: order.supabaseId,
      p_provider: paymentProviderKey(method),
      p_method: method.id,
      p_status: status,
      p_order_status: patch.status || order.status,
      p_order_payment_status: patch.paymentStatus || order.paymentStatus,
      p_provider_session_id: session?.id || "",
      p_provider_reference: patch.paymentReference || "",
      p_bank_reference:
        patch.paymentReference || order.bankTransferReference || "",
      p_raw_payload: {
        provider: method.provider,
        methodId: method.id,
        session: session || {},
        marketplacePayment:
          patch.marketplacePayment || patch.snapshot?.marketplacePayment || {},
        orderNumber: order.id,
      },
    });

    if (error) {
      recordServiceEvent(
        "supabase-database",
        "payment_record_failed",
        "order",
        order.id,
        error.message,
      );
      return null;
    }

    recordServiceEvent(
      "supabase-database",
      "payment_recorded",
      "order",
      order.id,
      `${method.provider} payment state saved to Supabase.`,
    );
    return data;
  }

  async function persistSupabaseStaffOrderUpdate(
    order,
    nextOrder,
    patch,
    detail,
  ) {
    if (
      !supabase ||
      !order?.supabaseId ||
      !["staff", "admin"].includes(currentUser?.role)
    )
      return;
    const shipping = selectedShipping(nextOrder);
    const { error } = await supabase
      .from("orders")
      .update({
        status: nextOrder.status,
        payment_status: nextOrder.paymentStatus,
        fulfillment_status: nextOrder.fulfillmentStatus,
        production_status: nextOrder.productionStatus,
        shipping_price: Number(shipping?.price || 0),
        total_due: orderTotal(nextOrder),
        address: nextOrder.address || {},
        package_estimate: nextOrder.packageEstimate || {},
        snapshot: nextOrder.snapshot || {},
        production_lead_time: nextOrder.productionLeadTime || "",
        estimated_production_complete:
          nextOrder.estimatedProductionComplete || null,
      })
      .eq("id", order.supabaseId);

    if (error) {
      recordServiceEvent(
        "supabase-database",
        "staff_order_update_failed",
        "order",
        order.id,
        error.message,
      );
      return;
    }

    if ("trackingNumber" in patch || "fulfillmentStatus" in patch) {
      const { data: shipment, error: shipmentError } = await supabase
        .from("shipments")
        .insert({
          order_id: order.supabaseId,
          provider: "dhl_express",
          carrier: "DHL Express",
          service: selectedShipping(nextOrder)?.name || "",
          status: nextOrder.fulfillmentStatus || "not_shipped",
          tracking_number: nextOrder.trackingNumber || null,
          tracking_url: nextOrder.carrierTrackingUrl || null,
          raw_payload: {
            source: nextOrder.trackingSource || "manual",
            orderNumber: order.id,
            detail,
          },
        })
        .select("id")
        .single();

      if (shipmentError) {
        recordServiceEvent(
          "supabase-database",
          "shipment_insert_failed",
          "order",
          order.id,
          shipmentError.message,
        );
      } else if (nextOrder.trackingEvents?.length) {
        const latestEvent = nextOrder.trackingEvents[0];
        const { error: eventError } = await supabase
          .from("tracking_events")
          .insert({
            shipment_id: shipment.id,
            order_id: order.supabaseId,
            carrier_code: "dhl_express",
            status:
              latestEvent.status || nextOrder.fulfillmentStatus || "Updated",
            description: latestEvent.detail || detail,
            occurred_at: new Date().toISOString(),
            raw_payload: latestEvent,
          });

        if (eventError) {
          recordServiceEvent(
            "supabase-database",
            "tracking_event_insert_failed",
            "order",
            order.id,
            eventError.message,
          );
        }
      }
    }

    recordServiceEvent(
      "supabase-database",
      "staff_order_updated",
      "order",
      order.id,
      "Staff order update saved to Supabase.",
    );
  }

  async function persistSupabaseOrderMessage(order, message) {
    if (!supabase || !order?.supabaseId || !isUuidLike(currentUser?.id))
      return null;
    const { data, error } = await supabase
      .from("order_messages")
      .insert(
        supabaseOrderMessageInsertFromLocal(
          message,
          order.supabaseId,
          currentUser.id,
        ),
      )
      .select("id,author_role,body,visibility,created_at")
      .single();

    if (error) {
      recordServiceEvent(
        "supabase-database",
        "order_message_insert_failed",
        "order",
        order.id,
        error.message,
      );
      return null;
    }

    recordServiceEvent(
      "supabase-database",
      "order_message_inserted",
      "order",
      order.id,
      "Order message saved to Supabase.",
    );
    return localOrderMessageFromSupabase(data);
  }

  async function persistSupabaseNotification(payload, localNotification) {
    if (!supabase || !currentUser?.id) return null;
    const request = payload.requestId
      ? requests.find((item) => item.id === payload.requestId)
      : null;
    const order = payload.orderId
      ? orders.find((item) => item.id === payload.orderId)
      : payload.requestId
        ? orders.find((item) => item.requestId === payload.requestId)
        : null;

    const { data, error } = await supabase.rpc("record_platform_notification", {
      p_user_id: isUuidLike(payload.userId) ? payload.userId : null,
      p_role: payload.role || null,
      p_request_id: request?.supabaseId || null,
      p_order_id: order?.supabaseId || null,
      p_title: payload.title || localNotification.title,
      p_body: payload.body || localNotification.body,
    });

    if (error) {
      recordServiceEvent(
        "supabase-database",
        "notification_record_failed",
        "notification",
        localNotification.id,
        error.message,
      );
      return null;
    }

    recordServiceEvent(
      "supabase-database",
      "notification_recorded",
      "notification",
      localNotification.id,
      "Notification and delivery queue saved to Supabase.",
    );
    return localNotificationFromSupabase({
      ...data,
      requests: request ? { request_number: request.id } : null,
      orders: order ? { order_number: order.id } : null,
    });
  }

  async function persistSupabaseAudit(log) {
    if (!supabase || !currentUser?.id) return;
    const { error } = await supabase.rpc("record_platform_audit", {
      p_action: log.action,
      p_target_type: log.targetType,
      p_target_id: log.targetId,
      p_detail: log.detail || "",
      p_metadata: {
        localAuditId: log.id,
      },
    });

    if (error) {
      recordServiceEvent(
        "supabase-database",
        "audit_record_failed",
        "audit",
        log.id,
        error.message,
      );
      return;
    }

    recordServiceEvent(
      "supabase-database",
      "audit_recorded",
      "audit",
      log.id,
      "Audit log saved to Supabase.",
    );
  }

  async function updateOrderFromStaff(orderId, patch, detail) {
    const order = orders.find((item) => item.id === orderId);
    const nextOrder = order
      ? { ...order, ...patch, updated: "Just now" }
      : null;
    updateOrder(orderId, (current) => ({
      ...current,
      ...patch,
      updated: "Just now",
    }));
    if (nextOrder && "paymentStatus" in patch) {
      writePaymentLedger(nextOrder, {
        confirmedAt:
          patch.paymentStatus === "paid" ? patch.paidAt || "Now" : "",
      });
    }
    if (
      nextOrder &&
      ("trackingNumber" in patch ||
        "fulfillmentStatus" in patch ||
        "selectedShippingId" in patch ||
        "shippingOptions" in patch ||
        "packageEstimate" in patch)
    ) {
      writeShipmentLedger(nextOrder);
      recordServiceEvent(
        platformAdapters.shipping.id,
        "shipment_record_updated",
        "order",
        orderId,
        detail,
      );
    }
    if (order) {
      addNotification({
        userId: order.customerId,
        requestId: order.requestId,
        title: "Order updated",
        body: `${order.id}: ${detail}`,
      });
    }
    if (order && nextOrder) {
      await persistSupabaseStaffOrderUpdate(order, nextOrder, patch, detail);
    }
    recordAudit("order_updated", "order", orderId, detail);
  }

  function recordAudit(
    action,
    targetType,
    targetId,
    detail = "",
    actorOverride = currentUser,
  ) {
    const log = makeAuditLog(
      action,
      actorOverride,
      targetType,
      targetId,
      detail,
    );
    setAuditLogs((current) => [log, ...current]);
    if (actorOverride?.id === currentUser?.id && isUuidLike(currentUser?.id)) {
      persistSupabaseAudit(log);
    }
  }

  function addNotification(payload) {
    const routed = routeNotificationAdapter(payload);
    setNotifications((current) => [routed.notification, ...current]);
    setNotificationDeliveryRecords((current) =>
      mergeById(current, routed.deliveries),
    );
    setServiceEvents((current) => [routed.event, ...current]);
    persistSupabaseNotification(payload, routed.notification).then(
      (remoteNotification) => {
        if (!remoteNotification) return;
        setNotifications((current) => [
          remoteNotification,
          ...current.filter(
            (notification) => notification.id !== routed.notification.id,
          ),
        ]);
        setNotificationDeliveryRecords((current) =>
          mergeById(
            current,
            buildNotificationDeliveryRecords(remoteNotification),
          ),
        );
      },
    );
  }

  function recordServiceEvent(
    adapter,
    action,
    targetType,
    targetId,
    detail = "",
  ) {
    setServiceEvents((current) => [
      makeServiceEvent(adapter, action, targetType, targetId, detail),
      ...current,
    ]);
  }

  function writeRequestMessageLedger(request, message) {
    setRequestMessageRecords((current) =>
      mergeById(current, [requestMessageRecord(request, message)]),
    );
  }

  function writeQuoteLedger(quote) {
    setQuoteRecords((current) => mergeById(current, [quote]));
  }

  function writePaymentLedger(order, override = {}) {
    setPaymentRecords((current) =>
      mergeById(current, [paymentLedgerRecord(order, override)]),
    );
  }

  function writeShipmentLedger(order, override = {}) {
    setShipmentRecords((current) =>
      mergeById(current, [shipmentLedgerRecord(order, override)]),
    );
  }

  function writeOrderMessageLedger(order, message) {
    setOrderMessageRecords((current) =>
      mergeById(current, [orderMessageRecord(order, message)]),
    );
  }

  function writeNotificationDeliveryLedger(notification) {
    setNotificationDeliveryRecords((current) =>
      mergeById(current, buildNotificationDeliveryRecords(notification)),
    );
  }

  function markVisibleNotificationsRead() {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const visibleUnreadIds = notifications
      .filter(
        (notification) =>
          !notification.readAt &&
          (notification.userId === currentUser.id ||
            notification.role === currentUser.role),
      )
      .map((notification) => notification.id)
      .filter(Boolean);

    if (!visibleUnreadIds.length) return;

    setReadNotificationIds((current) =>
      [...new Set([...current, ...visibleUnreadIds])].slice(-300),
    );
    setNotifications((current) =>
      current.map((notification) =>
        visibleUnreadIds.includes(notification.id)
          ? { ...notification, readAt: "Now" }
          : notification,
      ),
    );

    const remoteIds = visibleUnreadIds.filter(isUuidLike);
    if (supabaseConfigured && supabase && remoteIds.length) {
      supabase
        .from("notifications")
        .update({ read_at: nowIso })
        .in("id", remoteIds)
        .then(({ error }) => {
          if (error) {
            recordServiceEvent(
              "supabase-database",
              "notifications_mark_read_failed",
              "user",
              currentUser.id,
              error.message,
            );
          }
        });
    }
  }

  function appendAttachmentRecords(
    files,
    requestId,
    messageIdValue,
    uploadedBy,
  ) {
    if (!files.length) return;
    const attachments = buildAttachmentRecords(
      files,
      requestId,
      messageIdValue,
      uploadedBy,
    );
    const uploadContract = createStorageUploadAdapter(
      attachments,
      requestId,
      messageIdValue,
      uploadedBy,
    );
    setAttachmentRecords((current) => [
      ...uploadContract.attachments,
      ...current,
    ]);
    setStorageObjectRecords((current) =>
      mergeById(current, uploadContract.storageObjects),
    );
    recordServiceEvent(
      uploadContract.adapter,
      uploadContract.eventAction,
      "request",
      requestId,
      uploadContract.eventDetail,
    );
  }

  function openAuthModal(mode = "login", reason = "", after = "") {
    setAuthModal({ open: true, mode, reason, after });
  }

  function openPolicy(policyId = defaultPolicyId) {
    setActivePolicyId(policyById[policyId] ? policyId : defaultPolicyId);
    setPolicyReturnView(userView === "policy" ? policyReturnView : userView);
    setAuthModal((current) => ({ ...current, open: false }));
    setUserView("policy");
  }

  function closeAuthModal() {
    setAuthModal((current) => ({
      ...current,
      open: false,
      reason: "",
      after: "",
    }));
  }

  function completeAuthFlow(user) {
    const after = authModal.after;
    closeAuthModal();
    if (after === "submit_request" && user.role === "customer") {
      window.setTimeout(() => submitRequestForUser(user), 0);
    }
  }

  async function loadSupabaseRequestData(user) {
    if (!supabase || !user?.id) return;
    setDatabaseProviderStatus("connecting");

    const { data, error } = await supabase.rpc("list_workspace_requests");

    if (error) {
      setDatabaseProviderStatus("error");
      recordServiceEvent(
        "supabase-database",
        "requests_load_failed",
        "user",
        user.id,
        error.message,
      );
      return;
    }

    const rows = await rowsWithSignedAttachmentUrls(
      (data || []).map(normalizeWorkspaceRequestRow),
    );
    const remoteRequests = dedupeRequestsByIdentity(
      rows.map((row) => localRequestFromSupabase(row, user)),
    );
    const remoteMessages = remoteRequests.flatMap((request) =>
      (request.messages || []).map((message) =>
        requestMessageRecord(request, message),
      ),
    );
    const remoteAttachments = rows.flatMap((row) =>
      (row.attachments || []).map((attachment) => {
        const localAttachment = localAttachmentFromSupabase(attachment);
        return {
          id: localAttachment.id,
          requestId: row.request_number,
          supabaseRequestId: row.id,
          messageId: localAttachment.messageId,
          uploadedBy: localAttachment.ownerId,
          name: localAttachment.name,
          size: localAttachment.size,
          type: localAttachment.type,
          storageObjectId: localAttachment.storageObjectId,
          objectPath: localAttachment.objectPath,
          bucket: localAttachment.bucket,
          signedUrl: localAttachment.signedUrl,
          downloadUrl: localAttachment.downloadUrl,
          storageStatus: localAttachment.storageStatus,
          createdAt: localAttachment.createdAt,
        };
      }),
    );
    const remoteStorageObjects = remoteAttachments
      .filter((attachment) => attachment.storageObjectId)
      .map((attachment) => ({
        id: attachment.storageObjectId,
        attachmentId: attachment.id,
        requestId: attachment.requestId,
        messageId: attachment.messageId,
        uploadedBy: attachment.uploadedBy,
        bucket: attachment.bucket,
        objectPath: attachment.objectPath,
        fileName: attachment.name,
        contentType: attachment.type,
        size: attachment.size,
        status: attachment.storageStatus || "uploaded",
        uploadMode: "supabase_storage",
        signedUploadUrl: "",
        downloadUrl: attachment.signedUrl,
        accessScope: "request_participants",
        adapter: platformAdapters.storage.id,
        createdAt: attachment.createdAt,
      }));

    setRequests(remoteRequests);
    setRequestMessageRecords(remoteMessages);
    setAttachmentRecords(remoteAttachments);
    setStorageObjectRecords(remoteStorageObjects);
    setActiveRequestId((current) => {
      if (current && remoteRequests.some((request) => request.id === current))
        return current;
      return remoteRequests[0]?.id || "";
    });
    setDatabaseProviderStatus("ready");
    recordServiceEvent(
      "supabase-database",
      "requests_loaded",
      "user",
      user.id,
      `${remoteRequests.length} request record(s) loaded from Supabase.`,
    );
  }

  async function loadSupabaseOrderData(user) {
    if (!supabase || !user?.id) return;

    const { data, error } = await supabase.rpc("list_workspace_orders");

    if (error) {
      recordServiceEvent(
        "supabase-database",
        "orders_load_failed",
        "user",
        user.id,
        error.message,
      );
      return;
    }

    const rows = (data || []).map(normalizeWorkspaceOrderRow);
    const remoteOrders = rows.map((row) => localOrderFromSupabase(row, user));
    setOrders(remoteOrders);
    setActiveOrderId((current) => {
      if (current && remoteOrders.some((order) => order.id === current))
        return current;
      return remoteOrders[0]?.id || "";
    });
    recordServiceEvent(
      "supabase-database",
      "orders_loaded",
      "user",
      user.id,
      `${remoteOrders.length} order record(s) loaded from Supabase.`,
    );
  }

  async function loadSupabaseNotificationData(user) {
    if (!supabase || !user?.id) return;

    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
        id,
        user_id,
        role,
        title,
        body,
        read_at,
        created_at,
        requests (
          request_number
        ),
        orders (
          order_number
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      recordServiceEvent(
        "supabase-database",
        "notifications_load_failed",
        "user",
        user.id,
        error.message,
      );
      return;
    }

    const readSet = new Set(readNotificationIds || []);
    const remoteNotifications = (data || [])
      .map(localNotificationFromSupabase)
      .map((notification) =>
        readSet.has(notification.id) && !notification.readAt
          ? { ...notification, readAt: "Read" }
          : notification,
      );
    setNotifications(remoteNotifications);
    setNotificationDeliveryRecords(
      remoteNotifications.flatMap(buildNotificationDeliveryRecords),
    );
    recordServiceEvent(
      "supabase-database",
      "notifications_loaded",
      "user",
      user.id,
      `${remoteNotifications.length} notification record(s) loaded from Supabase.`,
    );
  }

  async function createSupabaseRequestBundle(
    request,
    firstMessage,
    uploadDrafts,
    actor,
  ) {
    if (!supabase || !isUuidLike(actor?.id)) return null;

    const payload = supabaseRequestInsertFromLocal(request);
    const { data: createdRequest, error: requestError } = await supabase.rpc(
      "create_request_with_number",
      {
        p_customer_label: payload.customer_label,
        p_title: payload.title,
        p_customer_summary: payload.customer_summary,
        p_status: payload.status,
        p_check_status: payload.check_status,
        p_check_result: payload.check_result,
        p_files_count: payload.files_count,
      },
    );

    const requestRow = Array.isArray(createdRequest)
      ? createdRequest[0]
      : createdRequest;

    if (requestError || !requestRow?.id || !requestRow?.request_number) {
      recordServiceEvent(
        "supabase-database",
        "request_insert_failed",
        "request",
        request.id,
        requestError?.message || "Request number was not returned.",
      );
      return null;
    }

    const realRequestNumber = requestRow.request_number;

    const { data: messageRow, error: messageError } = await supabase
      .from("request_messages")
      .insert(
        supabaseMessageInsertFromLocal(firstMessage, requestRow.id, actor.id),
      )
      .select("id,created_at")
      .single();

    if (messageError) {
      recordServiceEvent(
        "supabase-database",
        "request_message_insert_failed",
        "request",
        realRequestNumber,
        messageError.message,
      );
      return { requestRow, messageRow: null, attachments: [] };
    }

    const savedAttachments = await persistSupabaseAttachments(
      uploadDrafts,
      realRequestNumber,
      requestRow.id,
      messageRow.id,
      actor.id,
    );

    recordServiceEvent(
      "supabase-database",
      "request_inserted",
      "request",
      realRequestNumber,
      "Request, first message, and attachment metadata saved to Supabase.",
    );
    return {
      requestRow,
      messageRow,
      attachments: (savedAttachments || []).map((attachment) => ({
        id: attachment.id,
        requestId: realRequestNumber,
        supabaseRequestId: requestRow.id,
        messageId: messageRow?.id || "",
        uploadedBy: actor.id,
        name: attachment.name,
        size: attachment.size_bytes || 0,
        type: attachment.mime_type || "application/octet-stream",
        storageObjectId: attachment.storage_object_id || "",
        objectPath: attachment.object_path || "",
        createdAt: displayTime(attachment.created_at),
      })),
    };
  }

  async function persistSupabaseAttachments(
    files,
    localRequestId,
    requestUuid,
    messageUuid,
    ownerId,
  ) {
    if (!supabase || !files.length || !isUuidLike(ownerId)) return [];
    const localAttachments = buildAttachmentRecords(
      files,
      localRequestId,
      messageUuid,
      ownerId,
    );
    const saved = [];

    for (const attachment of localAttachments) {
      let storageObjectId = uuidValue();
      let uploaded = false;

      if (attachment.sourceFile) {
        const { error: uploadError } = await supabase.storage
          .from("request-attachments")
          .upload(attachment.objectPath, attachment.sourceFile, {
            contentType: attachment.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          recordServiceEvent(
            "supabase-storage",
            "file_upload_failed",
            "request",
            localRequestId,
            uploadError.message,
          );
        } else {
          uploaded = true;
        }
      }

      const { error: storageError } = await supabase
        .from("storage_objects")
        .insert({
          ...(storageObjectId ? { id: storageObjectId } : {}),
          ...supabaseStorageObjectInsertFromAttachment(attachment),
          status: uploaded ? "uploaded" : "pending_upload",
        });

      if (storageError) {
        storageObjectId = "";
        recordServiceEvent(
          "supabase-database",
          "storage_object_insert_failed",
          "request",
          localRequestId,
          storageError.message,
        );
      } else {
        setStorageObjectRecords((current) =>
          mergeById(current, [
            storageObjectRecordFromAttachment(
              { ...attachment, storageObjectId },
              {
                status: uploaded ? "uploaded" : "pending_upload",
                uploadMode: uploaded ? "supabase_storage" : "metadata_only",
              },
            ),
          ]),
        );
      }

      const { data: attachmentRow, error: attachmentError } = await supabase
        .from("attachments")
        .insert(
          supabaseAttachmentInsertFromLocal(
            { ...attachment, storageObjectId },
            requestUuid,
            messageUuid,
            ownerId,
          ),
        )
        .select("id,name,mime_type,size_bytes,storage_object_id,created_at")
        .single();

      if (attachmentError) {
        recordServiceEvent(
          "supabase-database",
          "attachment_insert_failed",
          "request",
          localRequestId,
          attachmentError.message,
        );
      } else {
        saved.push({ ...attachmentRow, object_path: attachment.objectPath });
      }
    }

    if (saved.length) {
      recordServiceEvent(
        "supabase-storage",
        "files_uploaded",
        "request",
        localRequestId,
        `${saved.length} file record(s) saved to Supabase Storage.`,
      );
    }

    return saved;
  }

  async function updateSupabaseRequestFromLocal(
    request,
    generatedMessages = [],
  ) {
    if (!supabase || !request?.supabaseId) return;
    if (generatedMessages.length) {
      const { error } = await supabase.rpc("complete_request_check", {
        p_request_id: request.supabaseId,
        p_status: request.status,
        p_check_status: checkStatusToSupabase(request.checkResult),
        p_check_result: request.checkResult || {},
        p_messages: generatedMessages.map(supabaseSystemMessageFromLocal),
      });

      if (error) {
        recordServiceEvent(
          "supabase-database",
          "request_check_complete_failed",
          "request",
          request.id,
          error.message,
        );
        return;
      }

      recordServiceEvent(
        "supabase-database",
        "request_check_completed",
        "request",
        request.id,
        "Request check result and Easy Harness messages saved to Supabase.",
      );
      return;
    }

    const { error } = await supabase
      .from("requests")
      .update(supabaseRequestUpdateFromLocal(request))
      .eq("id", request.supabaseId);

    if (error) {
      recordServiceEvent(
        "supabase-database",
        "request_update_failed",
        "request",
        request.id,
        error.message,
      );
      return;
    }

    recordServiceEvent(
      "supabase-database",
      "request_updated",
      "request",
      request.id,
      "Request status saved to Supabase.",
    );
  }

  function agentMessageBlocksFromCheckingResult(data, request) {
    const blocks = data.message ? [{ type: "text", text: data.message }] : [];
    const checkResult = data.checkResult || {};
    const draft = normalizeDraftForView(checkResult, request);
    const status = draft.draft_meta?.draft_status || data.draftStatus || "";
    const readyForReview =
      status === "ready_for_easy_harness_review" ||
      status === "closed_for_easy_harness_review" ||
      data.checkStatus === "accepted" ||
      data.status === "in_review";
    if (readyForReview) {
      blocks.push({
        type: "draft_summary",
        draftId: `${request.id}-D1`,
        title:
          draft.user_facing_summary?.request_line ||
          draft.user_intent?.connection_goal ||
          request.title ||
          "Harness request",
        status: draftStatusTitle(status, data.status || request.status),
        compactDetails: draft.user_facing_summary?.compact_details || [],
        connectionGoal: draft.user_intent?.connection_goal || "",
        intentType: draft.user_intent?.intent_type || "",
        fromSide: draft.user_intent?.from_side || "",
        toSide: draft.user_intent?.to_side || [],
        knownDetails: knownRequirementItems(draft.known_requirements),
        files: (draft.provided_evidence || [])
          .map((item) => item.filename || item.content_summary || item.type)
          .filter(Boolean),
        reviewItems: easyHarnessReviewItems(draft).slice(0, 5),
      });
    }
    return blocks;
  }

  async function invokeSupabaseChecking(request, trigger = "manual") {
    if (!supabase || !request?.supabaseId || !currentUser) return null;

    const activityMode = trigger === "initial_request" ? "initial" : "followup";
    setAgentActivities((current) => ({
      ...current,
      [request.id]: { mode: activityMode, startedAt: Date.now() },
    }));

    recordServiceEvent(
      platformAdapters.checking.id,
      "remote_check_started",
      "request",
      request.id,
      activityMode === "initial"
        ? "Easy Harness intake agent is analyzing the new request."
        : "Easy Harness intake agent is thinking through the latest customer input.",
    );

    try {
      const { data, error } = await supabase.functions.invoke("run-checking", {
        body: {
          requestId: request.supabaseId,
          trigger,
        },
      });

      if (error || !data?.ok) {
        const failureMessage =
          error?.message ||
          data?.message ||
          data?.code ||
          "Easy Harness intake agent did not finish.";
        recordServiceEvent(
          platformAdapters.checking.id,
          "remote_check_failed",
          "request",
          request.id,
          failureMessage,
        );
        const fallbackMessage = {
          id: `agent_fallback_${request.id}_${Date.now()}`,
          role: "easy",
          createdAt: new Date().toISOString(),
          blocks: [
            {
              type: "text",
              text: "Easy Harness has the request details and files. No action is needed right now; Easy Harness will continue from here.",
            },
          ],
        };
        const fallbackCheckResult = {
          status: "in_review",
          adapter: platformAdapters.checking.id,
          reason:
            "The automated draft check did not complete. The request remains queued for Easy Harness review.",
          missing: [],
          checkedAt: new Date().toISOString(),
          error: failureMessage,
        };
        const fallbackRequest = {
          ...request,
          status: "in_review",
          checkResult: fallbackCheckResult,
          updated: "Just now",
          messages: appendMessageIfMissing(request.messages || [], fallbackMessage),
        };
        updateRequest(request.id, (current) => ({
          ...current,
          status: "in_review",
          checkResult: fallbackCheckResult,
          updated: "Just now",
          messages: appendMessageIfMissing(current.messages || [], fallbackMessage),
        }));
        await updateSupabaseRequestFromLocal(fallbackRequest, [fallbackMessage]);
        return null;
      }

      recordServiceEvent(
        platformAdapters.checking.id,
        `remote_check_${data.checkStatus || "completed"}`,
        "request",
        request.id,
        data.readiness ||
          "Easy Harness intake agent updated the request draft.",
      );

      const aiMessage = data.message
        ? {
            id: `agent_${data.requestId || request.supabaseId}_${data.checkResult?.checkedAt || Date.now()}`,
            role: "easy",
            createdAt: data.checkResult?.checkedAt || new Date().toISOString(),
            blocks: agentMessageBlocksFromCheckingResult(data, request),
          }
        : null;
      const nextStatus = data.status || request.status;
      const nextCheckResult = data.checkResult || request.checkResult;

      updateRequest(data.requestNumber || request.id, (current) => ({
        ...current,
        status: nextStatus,
        checkResult: nextCheckResult,
        updated: "Just now",
        messages: appendMessageIfMissing(current.messages || [], aiMessage),
      }));

      await loadSupabaseRequestData(currentUser);

      if (aiMessage) {
        updateRequest(data.requestNumber || request.id, (current) => ({
          ...current,
          status: nextStatus,
          checkResult: nextCheckResult,
          updated: "Just now",
          messages: appendMessageIfMissing(current.messages || [], aiMessage),
        }));
      }
      if (data.requestNumber) setActiveRequestId(data.requestNumber);
      return data;
    } finally {
      setAgentActivities((current) => {
        if (!current[request.id]) return current;
        const next = { ...current };
        delete next[request.id];
        return next;
      });
    }
  }

  async function persistSupabaseStaffRequestUpdate(
    request,
    messages = [],
    quote = null,
  ) {
    if (!supabase || !request?.supabaseId || !isUuidLike(currentUser?.id))
      return null;
    const savedMessages = [];

    if (messages.length) {
      const { data, error } = await supabase
        .from("request_messages")
        .insert(
          messages.map((message) =>
            supabaseMessageInsertFromLocal(
              message,
              request.supabaseId,
              currentUser.id,
            ),
          ),
        )
        .select("id,created_at,blocks,body,author_role");

      if (error) {
        recordServiceEvent(
          "supabase-database",
          "staff_request_message_insert_failed",
          "request",
          request.id,
          error.message,
        );
      } else {
        savedMessages.push(...(data || []));
        recordServiceEvent(
          "supabase-database",
          "staff_request_message_inserted",
          "request",
          request.id,
          `${data?.length || 0} Easy Harness message(s) saved to Supabase.`,
        );
      }
    }

    let savedQuote = null;
    if (quote) {
      const { data: quoteRow, error: quoteError } = await supabase
        .from("quotes")
        .insert(
          supabaseQuoteInsertFromLocal(
            quote,
            request.supabaseId,
            currentUser.id,
          ),
        )
        .select(
          "id,request_id,version,amount,currency,basis_message_ids,status,released_by,released_at,valid_until",
        )
        .single();

      if (quoteError) {
        recordServiceEvent(
          "supabase-database",
          "quote_insert_failed",
          "request",
          request.id,
          quoteError.message,
        );
      } else {
        savedQuote = localQuoteFromSupabase(quoteRow);
      }
    }

    const requestPatch =
      quote && savedQuote
        ? {
            status: "ready_to_confirm",
            active_quote_id: savedQuote.id,
            updated_at: new Date().toISOString(),
          }
        : {
            status:
              request.status === "draft_saved" ? "in_review" : request.status,
            updated_at: new Date().toISOString(),
          };

    const { error: requestError } = await supabase
      .from("requests")
      .update(requestPatch)
      .eq("id", request.supabaseId);

    if (requestError) {
      recordServiceEvent(
        "supabase-database",
        "staff_request_update_failed",
        "request",
        request.id,
        requestError.message,
      );
      return { savedMessages, savedQuote };
    }

    recordServiceEvent(
      "supabase-database",
      "staff_request_updated",
      "request",
      request.id,
      "Easy Harness request update saved to Supabase.",
    );
    return { savedMessages, savedQuote };
  }

  async function fetchSupabaseProfile(authUser) {
    if (!supabase || !authUser?.id) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id,email,display_name,role,status,verified,notification_preferences,last_active_at",
      )
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      recordServiceEvent(
        "supabase-auth",
        "profile_load_failed",
        "user",
        authUser.id,
        error.message,
      );
      return null;
    }
    return data;
  }

  async function syncSupabaseSession(session, action = "session_created") {
    if (!session?.user) return null;
    const profile = await fetchSupabaseProfile(session.user);
    const user = profileUserFromSupabase(profile, session.user);

    if (!user.id || user.status === "suspended") {
      await supabase?.auth.signOut();
      return null;
    }

    let mergedUser = user;
    setUsers((current) => {
      const existing = current.find((item) => item.id === user.id);
      mergedUser = existing
        ? {
            ...existing,
            ...user,
            termsAccepted:
              existing.termsAccepted ||
              user.termsAccepted ||
              readUploadTermsAccepted(user.id),
            termsAcceptedAt:
              existing.termsAcceptedAt || user.termsAcceptedAt || "",
          }
        : {
            ...user,
            termsAccepted: user.termsAccepted || readUploadTermsAccepted(user.id),
          };
      return existing
        ? current.map((item) => (item.id === user.id ? mergedUser : item))
        : [mergedUser, ...current];
    });

    signIn(user.id, createSupabaseAuthSession(session, mergedUser), mergedUser, {
      resetView: false,
    });
    await loadSupabaseRequestData(mergedUser);
    await loadSupabaseOrderData(mergedUser);
    await loadSupabaseNotificationData(mergedUser);
    recordServiceEvent(
      "supabase-auth",
      action,
      "user",
      user.id,
      `${roleCopy[user.role]} session is active.`,
    );
    setSupabaseSessionReady(true);
    setAuthProviderStatus("ready");
    return user;
  }

  function signIn(userId, session = null, userOverride = null, options = {}) {
    const selected = userOverride || users.find((user) => user.id === userId);
    if (!selected || selected.status === "suspended") return;
    const isSwitchingUser = currentUserIdRef.current !== userId;
    setAuthSession(session || createLocalAuthSession(selected));
    setCurrentUserId(userId);
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              ...selected,
              lastActive: "Just now",
              termsAccepted:
                user.termsAccepted ||
                selected.termsAccepted ||
                readUploadTermsAccepted(userId),
              termsAcceptedAt: user.termsAcceptedAt || selected.termsAcceptedAt || "",
            }
          : user,
      ),
    );
    recordAudit(
      "signed_in",
      "user",
      selected.id,
      `${roleCopy[selected.role]} workspace opened.`,
      selected,
    );
    if (isSwitchingUser && options.resetView !== false) {
      setUserView("requests");
      setStaffView("queue");
    }
  }

  async function signInByEmail(email) {
    const normalized = email.trim().toLowerCase();
    if (!isEmailLike(normalized)) {
      return {
        ok: false,
        adapter: supabaseConfigured
          ? "supabase-auth"
          : platformAdapters.auth.id,
        error: "Enter a valid email address.",
      };
    }

    if (supabase) {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) {
        recordServiceEvent(
          "supabase-auth",
          "sign_in_link_failed",
          "user",
          normalized,
          error.message,
        );
        return {
          ok: false,
          adapter: "supabase-auth",
          error: "We could not send a sign-in link to this email.",
        };
      }

      recordServiceEvent(
        "supabase-auth",
        "sign_in_link_sent",
        "user",
        normalized,
        "Sign-in email sent.",
      );
      return {
        ok: true,
        adapter: "supabase-auth",
        pending: true,
        message: "Check your email to finish logging in.",
      };
    }

    if (hostedAuthRequired) {
      return {
        ok: false,
        adapter: "hosted-auth-required",
        error: "Account access is not available yet. Please try again later.",
      };
    }

    const authResult = signInWithEmailAdapter(email, users);
    if (!authResult.ok) return authResult;
    signIn(authResult.user.id, authResult.session);
    setServiceEvents((current) => [authResult.event, ...current]);
    completeAuthFlow(authResult.user);
    return authResult;
  }

  async function signInWithGoogle() {
    if (!supabase) {
      return {
        ok: false,
        adapter: supabaseConfigured
          ? "supabase-auth"
          : platformAdapters.auth.id,
        error: "Google sign-in is not available yet. Please use email for now.",
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      recordServiceEvent(
        "supabase-auth",
        "google_sign_in_failed",
        "user",
        "google",
        error.message,
      );
      return {
        ok: false,
        adapter: "supabase-auth",
        error: "Google sign-in is not available yet. Please use email for now.",
      };
    }

    recordServiceEvent(
      "supabase-auth",
      "google_sign_in_started",
      "user",
      "google",
      "Google sign-in started.",
    );
    return {
      ok: true,
      adapter: "supabase-auth",
      pending: true,
      message: "Continue with Google to finish signing in.",
    };
  }

  async function registerCustomer(form) {
    const normalized = form.email.trim().toLowerCase();
    if (!isEmailLike(normalized)) {
      return {
        ok: false,
        error: "Enter a valid email address.",
      };
    }

    if (supabase) {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: getAuthRedirectUrl(),
          data: {
            nickname: form.nickname?.trim() || normalized.split("@")[0],
            role: "customer",
          },
        },
      });

      if (error) {
        recordServiceEvent(
          "supabase-auth",
          "customer_registration_link_failed",
          "user",
          normalized,
          error.message,
        );
        return {
          ok: false,
          adapter: "supabase-auth",
          error: "We could not send the account email. Please try again.",
        };
      }

      recordServiceEvent(
        "supabase-auth",
        "customer_registration_link_sent",
        "user",
        normalized,
        "Customer account email sent.",
      );
      return {
        ok: true,
        adapter: "supabase-auth",
        pending: true,
        message: "Check your email to finish creating your account.",
      };
    }

    if (hostedAuthRequired) {
      return {
        ok: false,
        adapter: "hosted-auth-required",
        error: "Account access is not available yet. Please try again later.",
      };
    }

    if (users.some((user) => user.email.toLowerCase() === normalized)) {
      return {
        ok: false,
        error: "An account already exists for this email. Log in instead.",
      };
    }
    const authResult = createCustomerAccountAdapter(form);
    if (!authResult.ok) return authResult;
    setUsers((current) => [authResult.user, ...current]);
    signIn(authResult.user.id, authResult.session, authResult.user);
    setServiceEvents((current) => [authResult.event, ...current]);
    recordAudit(
      "customer_registered",
      "user",
      authResult.user.id,
      `${authResult.user.email} created an account.`,
      authResult.user,
    );
    completeAuthFlow(authResult.user);
    return authResult;
  }

  async function signOut() {
    if (currentUser) {
      recordAudit("signed_out", "user", currentUser.id, "Session ended.");
    }
    if (supabase && authSession?.adapter === "supabase-auth") {
      await supabase.auth.signOut();
    }
    if (authSession) {
      const cleared = clearAuthSessionAdapter(authSession);
      setServiceEvents((current) => [cleared.event, ...current]);
      setAuthSession(cleared.session);
    } else {
      setAuthSession(null);
    }
    setCurrentUserId("");
    if (supabaseConfigured) {
      setRequests([]);
      setOrders([]);
      setActiveRequestId("");
      setActiveOrderId("");
      setAttachmentRecords([]);
      setStorageObjectRecords([]);
      setRequestMessageRecords([]);
      setQuoteRecords([]);
      setPaymentRecords([]);
      setShipmentRecords([]);
      setOrderMessageRecords([]);
    }
    setUserView("start");
    setStaffView("queue");
    setShowPayment(false);
    setPaymentMethodId("stripe_card");
    setTermsChecked(false);
    setTermsError("");
  }

  function openRequest(requestId, nextSurface = currentUser?.role) {
    if (currentUser?.role === "customer") {
      const allowed = supabaseConfigured
        ? requests.some((request) => request.id === requestId)
        : requests.some(
            (request) =>
              request.id === requestId && request.customerId === currentUser.id,
          );
      if (!allowed) return;
    }
    setActiveRequestId(requestId);
    const selected = requests.find((request) => request.id === requestId);
    setStaffPrice(selected?.price || "");
    if (nextSurface === "staff") {
      setStaffView("detail");
      return;
    }
    setUserView("thread");
  }

  function addUploadFiles(fileItems, target = "start") {
    const currentFiles =
      target === "composer" ? userComposerFiles : uploadFiles;
    const { nextFiles, error } = prepareDraftFiles(
      fileItems,
      currentFiles.length,
    );
    setFileError(error);

    if (!nextFiles.length) {
      return;
    }
    if (target === "composer") {
      setUserComposerFiles((current) => [...current, ...nextFiles]);
    } else {
      setUploadFiles((current) => [...current, ...nextFiles]);
    }
  }

  function handleUpload(event, target = "start") {
    const selectedFiles = Array.from(event.target.files || []).map((file) => ({
      file,
      relativePath: file.webkitRelativePath || "",
    }));
    addUploadFiles(selectedFiles, target);
    event.target.value = "";
  }

  async function handleDropUpload(event, target = "start") {
    event.preventDefault();
    event.stopPropagation();
    if (submittingRequest || sendingUserMessage) return;
    try {
      const droppedFiles = await collectDroppedFileItems(event.dataTransfer);
      addUploadFiles(droppedFiles, target);
    } catch {
      setFileError("Files could not be added from this drop.");
    }
  }

  function removePendingUpload(target, fileKey) {
    const matches = (file) => (file.id || fileName(file)) === fileKey;
    if (target === "composer") {
      setUserComposerFiles((current) => current.filter((file) => !matches(file)));
      return;
    }
    setUploadFiles((current) => current.filter((file) => !matches(file)));
  }

  function fillSampleRequest() {
    setDescription(
      "I need a harness to connect a controller to two sensors. I have connector photos and an old harness sample.",
    );
    setUploadFiles(sampleFiles.map(sampleFileDraft));
    setFileError("");
  }

  function startRequest() {
    if (submittingRequestRef.current || submittingRequest) return;
    if (!uploadFiles.length) {
      setFileError("Please upload at least one design file before submitting.");
      return;
    }
    if (!currentUser) {
      if (!termsChecked) {
        setTermsError(
          "Please accept the upload and request terms before submitting.",
        );
        return;
      }
      openAuthModal(
        "register",
        "Sign in or create an account to submit this request.",
        "submit_request",
      );
      return;
    }
    submitRequestForUser(currentUser);
  }

  async function submitRequestForUser(actor) {
    if (!actor || actor.role !== "customer" || submittingRequestRef.current)
      return;
    if (
      supabaseConfigured &&
      (!authSession ||
        authSession.adapter !== "supabase-auth" ||
        authSession.userId !== actor.id ||
        !isUuidLike(actor.id))
    ) {
      setFileError("Please finish signing in before submitting this request.");
      return;
    }
    submittingRequestRef.current = true;
    setSubmittingRequest(true);
    setSubmissionPhase("creating");
    try {
      if (!uploadFiles.length) {
        setFileError(
          "Please upload at least one design file before submitting.",
        );
        return;
      }
      const actorTermsAccepted =
        actor.termsAccepted || readUploadTermsAccepted(actor.id);
      if (!actorTermsAccepted && !termsChecked) {
        setTermsError(
          "Please accept the upload and request terms before submitting.",
        );
        return;
      }
      if (!actorTermsAccepted && termsChecked) {
        writeUploadTermsAccepted(actor.id);
        updateUser(
          actor.id,
          {
            termsAccepted: true,
            termsAcceptedAt: todayLabel(),
          },
          "upload_terms_accepted",
        );
        setTermsError("");
      }
      const text =
        description.trim() ||
        "I need a harness made from the uploaded design files.";
      const uploadDrafts = [...uploadFiles];
      const files = uploadDrafts.map(fileName);
      const fileBlocks = uploadDrafts.map((file) => attachmentBlockFile(file, true));
      setDescription("");
      setUploadFiles([]);
      setFileError("");
      const nextId =
        supabase && isUuidLike(actor.id)
          ? `pending-${Date.now()}`
          : makeRequestId(requests);
      const firstMessage = customerMessage(text, fileBlocks);
      const nextRequest = {
        id: nextId,
        customerId: actor.id,
        customer: actor.name,
        title: inferTitle(text),
        status: "checking",
        checkResult: {
          status: "queued",
          adapter: platformAdapters.checking.id,
          reason: "Request is queued for intake checking.",
          missing: [],
          checkedAt: "",
        },
        quotes: [],
        activeQuoteId: "",
        confirmedQuoteId: "",
        price: "",
        files: fileBlocks,
        updated: "Just now",
        messages: [firstMessage],
      };

      setSubmissionPhase("uploading");
      const savedBundle = await createSupabaseRequestBundle(
        nextRequest,
        firstMessage,
        uploadDrafts,
        actor,
      );
      if (supabase && isUuidLike(actor.id) && !savedBundle?.requestRow) {
        setDescription(text);
        setUploadFiles(uploadDrafts);
        setFileError("Request could not be saved. Please try again.");
        return;
      }
      const savedRequest = savedBundle?.requestRow
        ? {
            ...nextRequest,
            id: savedBundle.requestRow.request_number,
            supabaseId: savedBundle.requestRow.id,
            updated: displayTime(
              savedBundle.requestRow.updated_at ||
                savedBundle.requestRow.created_at,
            ),
            messages: savedBundle.messageRow
              ? [
                  {
                    ...firstMessage,
                    id: savedBundle.messageRow.id,
                    createdAt: displayTime(savedBundle.messageRow.created_at),
                  },
                ]
              : nextRequest.messages,
          }
        : nextRequest;

      setRequests((current) =>
        dedupeRequestsByIdentity([savedRequest, ...current]),
      );
      writeRequestMessageLedger(savedRequest, savedRequest.messages[0]);
      if (savedBundle?.attachments?.length) {
        setAttachmentRecords((current) => [
          ...savedBundle.attachments,
          ...current,
        ]);
      } else {
        appendAttachmentRecords(
          uploadDrafts,
          nextId,
          firstMessage.id,
          actor.id,
        );
      }
      addNotification({
        role: "staff",
        requestId: savedRequest.id,
        title: "New request",
        body: `${savedRequest.id} is ready for review.`,
      });
      recordAudit(
        "request_created",
        "request",
        savedRequest.id,
        `${actor.email} created ${savedRequest.title}.`,
        actor,
      );
      setActiveRequestId(savedRequest.id);
      setDescription("");
      setUploadFiles([]);
      setFileError("");
      setTermsChecked(false);
      if (savedRequest.supabaseId) {
        setProcessingRequestId("");
        setSubmissionPhase("checking");
        setUserView("thread");
        recordServiceEvent(
          platformAdapters.checking.id,
          "check_queued",
          "request",
          savedRequest.id,
          "Request is waiting for Easy Harness checking.",
        );
        void invokeSupabaseChecking(savedRequest, "initial_request");
      } else {
        setProcessingRequestId(savedRequest.id);
        setUserView("processing");
      }
    } finally {
      submittingRequestRef.current = false;
      setSubmittingRequest(false);
      setSubmissionPhase("");
    }
  }

  async function sendUserMessage() {
    if (sendingUserMessageRef.current) return;
    const text = userComposer.trim();
    const filesToSend = [...userComposerFiles];
    if (!text && !filesToSend.length) return;
    sendingUserMessageRef.current = true;
    setSendingUserMessage(true);
    const attachedNames = filesToSend.map(fileName);
    const attachedBlocks = filesToSend.map((file) =>
      attachmentBlockFile(file, true),
    );
    setUserComposer("");
    setUserComposerFiles([]);
    setFileError("");
    const remoteThread = Boolean(
      supabase && activeRequest.supabaseId && isUuidLike(currentUser?.id),
    );
    const shouldRunRemoteChecking =
      remoteThread &&
      ["checking", "needs_info", "not_supported", "draft_saved", "in_review"].includes(
        activeRequest.status,
      );
    const message = {
      id: messageId(),
      role: "customer",
      createdAt: "Now",
      blocks: [
        ...(text ? [{ type: "text", text }] : []),
        ...(attachedBlocks.length
          ? [{ type: "attachments", files: attachedBlocks }]
          : []),
      ],
    };

    try {
      updateRequest(activeRequest.id, (request) => {
        const baseMessages = [...request.messages, message];
        const nextFiles = [
          ...(request.files || []),
          ...attachedBlocks,
        ];
        if (remoteThread) {
          return {
            ...request,
            files: nextFiles,
            status: ["needs_info", "not_supported", "in_review"].includes(request.status)
              ? "checking"
              : request.status,
            checkResult: ["needs_info", "not_supported", "in_review"].includes(
              request.status,
            )
              ? {
                  status: "queued",
                  adapter: platformAdapters.checking.id,
                  reason:
                    "Customer added details. Easy Harness will continue checking the request.",
                  missing: [],
                  checkedAt: "",
                }
              : request.checkResult,
            updated: "Just now",
            messages: baseMessages,
          };
        }
        return {
          ...request,
          files: nextFiles,
          status:
            request.status === "draft_saved" ? "checking" : request.status,
          checkResult: request.checkResult,
          updated: "Just now",
          messages: baseMessages,
        };
      });

      if (remoteThread) {
        const { data: messageRow, error: messageError } = await supabase
          .from("request_messages")
          .insert(
            supabaseMessageInsertFromLocal(
              message,
              activeRequest.supabaseId,
              currentUser.id,
            ),
          )
          .select("id,created_at")
          .single();

        if (messageError) {
          recordServiceEvent(
            "supabase-database",
            "request_message_insert_failed",
            "request",
            activeRequest.id,
            messageError.message,
          );
        } else {
          updateRequest(activeRequest.id, (request) => ({
            ...request,
            messages: request.messages.map((item) =>
              item.id === message.id
                ? {
                    ...item,
                    id: messageRow.id,
                    createdAt: displayTime(messageRow.created_at),
                  }
                : item,
            ),
          }));

          const savedAttachments = await persistSupabaseAttachments(
            filesToSend,
            activeRequest.id,
            activeRequest.supabaseId,
            messageRow.id,
            currentUser.id,
          );

          if (!savedAttachments.length && filesToSend.length) {
            appendAttachmentRecords(
              filesToSend,
              activeRequest.id,
              messageRow.id,
              currentUser.id,
            );
          } else if (savedAttachments?.length) {
            setAttachmentRecords((current) => [
              ...savedAttachments.map((attachment) => ({
                id: attachment.id,
                requestId: activeRequest.id,
                supabaseRequestId: activeRequest.supabaseId,
                messageId: messageRow.id,
                uploadedBy: currentUser.id,
                name: attachment.name,
                size: attachment.size_bytes || 0,
                type: attachment.mime_type || "application/octet-stream",
                storageObjectId: attachment.storage_object_id || "",
                objectPath: attachment.object_path || "",
                createdAt: displayTime(attachment.created_at),
              })),
              ...current,
            ]);
          }
          recordServiceEvent(
            "supabase-database",
            "request_message_inserted",
            "request",
            activeRequest.id,
            "Customer update saved to Supabase.",
          );
          if (shouldRunRemoteChecking) {
            void invokeSupabaseChecking(activeRequest, "customer_followup");
          }
        }
      } else {
        appendAttachmentRecords(
          filesToSend,
          activeRequest.id,
          message.id,
          currentUser.id,
        );
      }
      writeRequestMessageLedger(activeRequest, message);
      addNotification({
        role: "staff",
        requestId: activeRequest.id,
        title: "Customer update",
        body: `${activeRequest.id} has new details.`,
      });
      recordAudit(
        "customer_message_added",
        "request",
        activeRequest.id,
        text || `${attachedNames.length} file(s) attached.`,
      );
      if (
        ["needs_info", "not_supported", "checking"].includes(
          activeRequest.status,
        )
      ) {
        recordServiceEvent(
          platformAdapters.checking.id,
          "check_reopened",
          "request",
          activeRequest.id,
          "Customer added details after intake checking.",
        );
      }
      setUserComposer("");
      setUserComposerFiles([]);
      setFileError("");
    } finally {
      sendingUserMessageRef.current = false;
      setSendingUserMessage(false);
    }
  }

  async function sendStaffUpdate() {
    const text = staffComposer.trim();
    const attachmentFiles = staffAttachment;
    const attachmentBlocks = attachmentFiles.map((file) =>
      attachmentBlockFile(file, true),
    );
    const attachmentNames = attachmentFiles.map(fileName);
    const price = staffPrice.trim();
    const hasContent =
      text || attachmentNames.length || includePreview || includeTable;
    const numericPrice = Number(price);
    const hasPrice =
      price.length > 0 &&
      Number.isFinite(numericPrice) &&
      numericPrice > 0 &&
      price !== activeRequest.price;
    if (!activeRequest || (!hasContent && !hasPrice)) return;

    if (supabaseConfigured && !activeRequest.supabaseId) {
      setFileError(
        "This request is not synced yet. Refresh the workspace before releasing updates.",
      );
      return;
    }

    let staffMessageId = "";
    const staffMessage = hasContent
      ? {
          id: messageId(),
          role: "easy",
          createdAt: "Now",
          blocks: [
            ...(text ? [{ type: "text", text }] : []),
            ...(includeTable ? [{ type: "table" }] : []),
            ...(includePreview ? [{ type: "preview" }] : []),
            ...(attachmentBlocks.length
              ? [{ type: "attachments", files: attachmentBlocks }]
              : []),
          ],
        }
      : null;
    if (staffMessage) staffMessageId = staffMessage.id;

    const priceMessage = hasPrice ? priceEvent(price) : null;
    const releasedQuote = hasPrice
      ? createQuoteRecord(activeRequest, price, currentUser)
      : null;

    let saved = null;
    if (activeRequest.supabaseId) {
      saved = await persistSupabaseStaffRequestUpdate(
        activeRequest,
        [staffMessage, priceMessage].filter(Boolean),
        releasedQuote,
      );

      if (hasPrice && !saved?.savedQuote) {
        setFileError(
          "Price could not be saved to the shared workspace. Please try again before asking the customer to confirm.",
        );
        return;
      }
    }

    const quoteForState = saved?.savedQuote || releasedQuote;

    updateRequest(activeRequest.id, (request) => {
      const messages = [...request.messages];
      if (staffMessage) messages.push(staffMessage);
      if (priceMessage) messages.push(priceMessage);

      const existingQuotes = request.quotes || [];
      const nextQuotes =
        hasPrice && quoteForState
          ? [
              ...existingQuotes.filter(
                (quote) =>
                  quote.id !== releasedQuote?.id && quote.id !== quoteForState.id,
              ),
              quoteForState,
            ]
          : existingQuotes;

      return {
        ...request,
        price: hasPrice && quoteForState ? String(quoteForState.amount) : request.price,
        quotes: nextQuotes,
        activeQuoteId:
          hasPrice && quoteForState ? quoteForState.id : request.activeQuoteId || "",
        status: hasPrice
          ? "ready_to_confirm"
          : request.status === "draft_saved"
            ? "in_review"
            : request.status,
        updated: "Just now",
        messages,
      };
    });

    if (attachmentFiles.length) {
      const savedStaffMessageId =
        staffMessage && saved?.savedMessages?.[0]?.id
          ? saved.savedMessages[0].id
          : staffMessageId;
      if (activeRequest.supabaseId && isUuidLike(savedStaffMessageId)) {
        const savedAttachments = await persistSupabaseAttachments(
          attachmentFiles,
          activeRequest.id,
          activeRequest.supabaseId,
          savedStaffMessageId,
          currentUser.id,
        );
        if (savedAttachments?.length) {
          setAttachmentRecords((current) => [
            ...savedAttachments.map((attachment) => ({
              id: attachment.id,
              requestId: activeRequest.id,
              supabaseRequestId: activeRequest.supabaseId,
              messageId: savedStaffMessageId,
              uploadedBy: currentUser.id,
              name: attachment.name,
              size: attachment.size_bytes || 0,
              type: attachment.mime_type || "application/octet-stream",
              storageObjectId: attachment.storage_object_id || "",
              objectPath: attachment.object_path || "",
              createdAt: displayTime(attachment.created_at),
            })),
            ...current,
          ]);
        } else {
          appendAttachmentRecords(
            attachmentFiles,
            activeRequest.id,
            savedStaffMessageId,
            currentUser.id,
          );
        }
      } else {
        appendAttachmentRecords(
          attachmentFiles,
          activeRequest.id,
          staffMessageId,
          currentUser.id,
        );
      }
    }
    if (staffMessage) {
      writeRequestMessageLedger(activeRequest, staffMessage);
    }
    if (hasContent) {
      addNotification({
        userId: activeRequest.customerId,
        requestId: activeRequest.id,
        title: "Request updated",
        body: `${activeRequest.id} has a new Easy Harness update.`,
      });
      recordAudit(
        "staff_message_added",
        "request",
        activeRequest.id,
        text || "Media update added.",
      );
    }
    if (hasPrice && quoteForState) {
      addNotification({
        userId: activeRequest.customerId,
        requestId: activeRequest.id,
        title: "Quote ready",
        body: `${activeRequest.id} is ready for quote confirmation at $${price}.`,
      });
      recordAudit(
        "price_updated",
        "request",
        activeRequest.id,
        `Harness price set to $${price}.`,
      );
      writeQuoteLedger(quoteForState);
      recordServiceEvent(
        platformAdapters.checking.id,
        "quote_released",
        "request",
        activeRequest.id,
        "Harness quote released from current thread basis.",
      );
    }

    setStaffComposer("");
    setStaffAttachment([]);
    if (hasPrice) setStaffPrice(price);
    setIncludePreview(false);
    setIncludeTable(false);
    setFileError("");
  }

  async function confirmRequest() {
    if (activeRequest.status !== "ready_to_confirm") return;
    const quote = activeQuoteForRequest(activeRequest);
    const localOrder = createOrderFromRequest(activeRequest, currentUser);

    let nextOrder = null;

    if (supabaseConfigured || activeRequest.supabaseId) {
      if (!activeRequest.supabaseId || !isUuidLike(quote?.id)) {
        setFileError(
          "This confirmation is not synced yet. Refresh the request and try again.",
        );
        recordServiceEvent(
          "supabase-database",
          "order_confirm_blocked_unsynced_quote",
          "request",
          activeRequest.id,
          "Customer confirmation blocked because the active quote is not persisted.",
        );
        return;
      }

      const remoteOrder = await confirmSupabaseRequestOrder(
        activeRequest,
        quote,
        localOrder,
      );

      if (!remoteOrder?.supabaseId) {
        setFileError(
          "Order could not be saved. Please try again before leaving this page.",
        );
        return;
      }

      nextOrder = remoteOrder;
      setOrders((current) => [
        remoteOrder,
        ...current.filter((order) => order.id !== remoteOrder.id),
      ]);
      writeShipmentLedger(remoteOrder);
      recordAudit(
        "order_created",
        "order",
        remoteOrder.id,
        `${remoteOrder.id} created from ${activeRequest.id}.`,
      );
    } else {
      nextOrder = ensureOrderForRequest(activeRequest);
    }

    updateRequest(activeRequest.id, (request) => ({
      ...request,
      status: "confirmed",
      confirmedQuoteId: quote?.id || request.activeQuoteId || "",
      quotes: (request.quotes || []).map((item) =>
        item.id === (quote?.id || request.activeQuoteId)
          ? { ...item, status: "confirmed", confirmedAt: "Now" }
          : item,
      ),
      updated: "Just now",
      messages: [
        ...request.messages,
        eventMessage(
          "Request and price confirmed",
          "Your order is open. Complete delivery, shipping, and payment details on the order page.",
        ),
      ],
    }));
    setActiveOrderId(nextOrder.id);
    addNotification({
      role: "staff",
      requestId: activeRequest.id,
      title: "Order created",
      body: `${activeRequest.id} has been confirmed and opened as ${nextOrder.id}.`,
    });
    recordAudit(
      "request_confirmed",
      "request",
      activeRequest.id,
      `Customer confirmed quote ${quote?.id || activeRequest.activeQuoteId || "current"} and ${nextOrder.id} is open for checkout.`,
    );
    if (quote) {
      writeQuoteLedger({ ...quote, status: "confirmed", confirmedAt: "Now" });
    }
    setFileError("");
    setUserView("order");
  }

  async function startPayment(methodId) {
    if (!activeOrder) return;
    const method = paymentMethodById(methodId);
    setPaymentMethodId(methodId);
    const sessionResult = createPaymentSessionAdapter(activeOrder, method);

    if (methodId === "bank_transfer") {
      updateOrder(activeOrder.id, (order) => ({
        ...order,
        ...sessionResult.orderPatch,
      }));
      writePaymentLedger({
        ...activeOrder,
        ...sessionResult.orderPatch,
      });
      addNotification({
        role: "staff",
        requestId: activeOrder.requestId,
        title: "Bank transfer selected",
        body: `${activeOrder.id} is waiting for bank transfer receipt.`,
      });
      recordAudit(
        "bank_transfer_started",
        "order",
        activeOrder.id,
        `${method.provider} selected for checkout.`,
      );
      recordServiceEvent(
        sessionResult.adapter,
        sessionResult.eventAction,
        "order",
        activeOrder.id,
        sessionResult.eventDetail,
      );
      await persistSupabasePayment(
        activeOrder,
        method,
        sessionResult.session,
        sessionResult.orderPatch,
        "pending",
      );
      return;
    }

    if (methodId === "marketplace_protected") {
      updateOrder(activeOrder.id, (order) => ({
        ...order,
        ...sessionResult.orderPatch,
      }));
      writePaymentLedger({
        ...activeOrder,
        ...sessionResult.orderPatch,
      });
      addNotification({
        role: "staff",
        requestId: activeOrder.requestId,
        title: "Protected payment link requested",
        body: `${activeOrder.id} is waiting for a matching marketplace checkout link.`,
      });
      addNotification({
        userId: activeOrder.customerId,
        requestId: activeOrder.requestId,
        title: "Protected checkout requested",
        body: `${activeOrder.id}: Easy Harness is preparing your protected marketplace checkout link.`,
      });
      recordAudit(
        "marketplace_payment_requested",
        "order",
        activeOrder.id,
        `${method.provider} protected payment requested.`,
      );
      recordServiceEvent(
        sessionResult.adapter,
        sessionResult.eventAction,
        "order",
        activeOrder.id,
        sessionResult.eventDetail,
      );
      await persistSupabasePayment(
        activeOrder,
        method,
        sessionResult.session,
        sessionResult.orderPatch,
        "pending",
      );
      return;
    }

    updateOrder(activeOrder.id, (order) => ({
      ...order,
      ...sessionResult.orderPatch,
    }));
    writePaymentLedger({
      ...activeOrder,
      ...sessionResult.orderPatch,
    });
    recordServiceEvent(
      sessionResult.adapter,
      sessionResult.eventAction,
      "order",
      activeOrder.id,
      sessionResult.eventDetail,
    );
    await persistSupabasePayment(
      activeOrder,
      method,
      sessionResult.session,
      sessionResult.orderPatch,
      "pending",
    );
    setShowPayment(true);
  }

  async function markPaid(methodId = paymentMethodId) {
    if (!activeOrder) return;
    const method = paymentMethodById(methodId);
    const callbackResult = confirmPaymentCallbackAdapter(activeOrder, method);
    updateOrder(activeOrder.id, (order) => ({
      ...order,
      ...callbackResult.orderPatch,
    }));
    writePaymentLedger({
      ...activeOrder,
      ...callbackResult.orderPatch,
    });
    updateRequest(activeOrder.requestId, (request) => ({
      ...request,
      status:
        request.status === "ready_to_confirm" ? "confirmed" : request.status,
      updated: "Just now",
      messages: [
        ...request.messages,
        eventMessage(
          "Order payment received",
          `${activeOrder.id} is paid and ready for production scheduling.`,
        ),
      ],
    }));
    addNotification({
      role: "staff",
      requestId: activeOrder.requestId,
      title: "Payment activity",
      body: `${activeOrder.id} has been paid by ${method.provider} and is ready for production scheduling.`,
    });
    recordAudit(
      "payment_confirmed",
      "order",
      activeOrder.id,
      `${method.provider} checkout completed.`,
    );
    recordServiceEvent(
      callbackResult.adapter,
      callbackResult.eventAction,
      "order",
      activeOrder.id,
      callbackResult.eventDetail,
    );
    await persistSupabasePayment(
      activeOrder,
      method,
      callbackResult.session,
      callbackResult.orderPatch,
      "paid",
    );
    setShowPayment(false);
  }

  async function sendOrderMessage(
    orderId,
    body,
    authorRole = currentUser?.role,
  ) {
    const text = body.trim();
    if (!text) return;
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    const message = makeSupportMessage({
      authorRole,
      authorName: currentUser?.name || "Easy Harness",
      body: text,
    });
    updateOrder(orderId, (current) => ({
      ...current,
      supportMessages: [...(current.supportMessages || []), message],
      updated: "Just now",
    }));
    writeOrderMessageLedger(order, message);
    const remoteMessage = await persistSupabaseOrderMessage(order, message);
    if (remoteMessage) {
      updateOrder(orderId, (current) => ({
        ...current,
        supportMessages: (current.supportMessages || []).map((item) =>
          item.id === message.id ? remoteMessage : item,
        ),
      }));
      writeOrderMessageLedger(order, remoteMessage);
    }
    addNotification({
      userId: authorRole === "customer" ? "" : order.customerId,
      role: authorRole === "customer" ? "staff" : "",
      requestId: order.requestId,
      title:
        authorRole === "customer" ? "Order message" : "Easy Harness replied",
      body: `${order.id} has a new order message.`,
    });
    recordAudit("order_message_added", "order", orderId, text);
  }

  function updateUser(userId, patch, action = "user_updated") {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, ...patch } : user,
      ),
    );
    recordAudit(action, "user", userId, Object.keys(patch).join(", "));
  }

  function inviteUser({ name, email, role }) {
    if (!email.trim()) return;
    const newUser = {
      id: `u_${Date.now()}`,
      name: name.trim() || email.trim().split("@")[0],
      email: email.trim(),
      role,
      status: "invited",
      verified: false,
      company: "",
      country: "",
      phone: "",
      termsAccepted: false,
      termsAcceptedAt: "",
      lastActive: "Pending",
    };
    setUsers((current) => [newUser, ...current]);
    recordAudit(
      "user_invited",
      "user",
      newUser.id,
      `${newUser.email} invited as ${roleCopy[role]}.`,
    );
  }

  if (currentUser?.role === "admin") {
    return (
      <AdminApp
        users={users}
        requests={requests}
        orders={orders}
        attachmentRecords={attachmentRecords}
        serviceEvents={serviceEvents}
        auditLogs={auditLogs}
        backendTableRows={backendTableRows}
        currentUser={currentUser}
        signOut={signOut}
        updateUser={updateUser}
        inviteUser={inviteUser}
      />
    );
  }

  if (currentUser?.role === "staff") {
    return (
      <StaffApp
        requests={visibleRequests}
        orders={visibleOrders}
        activeRequest={activeRequest}
        activeOrder={activeOrder}
        staffView={staffView}
        setStaffView={setStaffView}
        openRequest={openRequest}
        openOrder={openOrder}
        updateOrderFromStaff={updateOrderFromStaff}
        sendOrderMessage={sendOrderMessage}
        currentUser={currentUser}
        signOut={signOut}
        staffComposer={staffComposer}
        setStaffComposer={setStaffComposer}
        staffAttachment={staffAttachment}
        setStaffAttachment={setStaffAttachment}
        staffPrice={staffPrice}
        setStaffPrice={setStaffPrice}
        includePreview={includePreview}
        setIncludePreview={setIncludePreview}
        includeTable={includeTable}
        setIncludeTable={setIncludeTable}
        sendStaffUpdate={sendStaffUpdate}
      />
    );
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userView={userView}
        requests={visibleRequests}
        orders={visibleOrders}
        activeRequest={activeRequest}
        activeOrder={activeOrder}
        setUserView={setUserView}
        openRequest={openRequest}
        openOrder={openOrder}
        currentUser={currentUser}
        requireAuth={(reason, after = "") =>
          openAuthModal("login", reason, after)
        }
        openPolicy={openPolicy}
      />

      <main className={`workspace workspace-${userView}`}>
        <WiringBackdrop />
        <TopAccount
          user={currentUser}
          signOut={signOut}
          openAccount={() => setUserView("account")}
          openLogin={() => openAuthModal("login")}
          openRegister={() => openAuthModal("register")}
          openRequests={() => setUserView("requests")}
          openOrders={() => setUserView("orders")}
          notifications={visibleNotifications}
          markNotificationsRead={markVisibleNotificationsRead}
          openNotification={(requestId) =>
            requestId && openRequest(requestId, "user")
          }
        />

        {userView === "start" && (
          <StartScreen
            description={description}
            setDescription={setDescription}
            files={uploadFiles}
            uploadRef={uploadRef}
            handleUpload={handleUpload}
            handleDrop={(event) => handleDropUpload(event, "start")}
            removeFile={(fileKey) => removePendingUpload("start", fileKey)}
            fillSampleRequest={fillSampleRequest}
            startRequest={startRequest}
            submittingRequest={submittingRequest}
            submissionPhase={submissionPhase}
            currentUser={currentUser}
            uploadTermsAccepted={uploadTermsAccepted}
            termsChecked={termsChecked}
            setTermsChecked={setTermsChecked}
            termsError={termsError}
            fileError={fileError}
            openPolicy={openPolicy}
          />
        )}

        {userView === "processing" && (
          <ProcessingScreen
            request={activeRequest}
            progressIndex={processingIndex}
          />
        )}

        {userView === "requests" && (
          <RequestsList
            requests={visibleRequests}
            orders={visibleOrders}
            openRequest={openRequest}
            startNewRequest={() => setUserView("start")}
          />
        )}

        {userView === "orders" && (
          <OrdersList orders={visibleOrders} openOrder={openOrder} openRequests={() => setUserView("requests")} startNewRequest={() => setUserView("start")} />
        )}

        {userView === "account" &&
          (currentUser ? (
            <AccountScreen
              user={currentUser}
              updateUser={(patch, action = "profile_updated") =>
                updateUser(currentUser.id, patch, action)
              }
              openPolicy={openPolicy}
            />
          ) : (
            <StartScreen
              description={description}
              setDescription={setDescription}
              files={uploadFiles}
              uploadRef={uploadRef}
              handleUpload={handleUpload}
              handleDrop={(event) => handleDropUpload(event, "start")}
              removeFile={(fileKey) => removePendingUpload("start", fileKey)}
              fillSampleRequest={fillSampleRequest}
              startRequest={startRequest}
              submittingRequest={submittingRequest}
              submissionPhase={submissionPhase}
              currentUser={currentUser}
              uploadTermsAccepted={uploadTermsAccepted}
              termsChecked={termsChecked}
              setTermsChecked={setTermsChecked}
              termsError={termsError}
              fileError={fileError}
              openPolicy={openPolicy}
            />
          ))}

        {userView === "policy" && (
          <PolicyScreen
            activePolicyId={activePolicyId}
            setActivePolicyId={setActivePolicyId}
            back={() => setUserView(policyReturnView || "start")}
          />
        )}

        {userView === "thread" &&
          (activeRequest ? (
            <RequestWorkspace
              request={activeRequest}
              perspective="user"
              composerValue={userComposer}
              setComposerValue={setUserComposer}
              composerFiles={userComposerFiles}
              uploadRef={userComposerUploadRef}
              handleUpload={(event) => handleUpload(event, "composer")}
              handleDrop={(event) => handleDropUpload(event, "composer")}
              removeFile={(fileKey) => removePendingUpload("composer", fileKey)}
              sendMessage={sendUserMessage}
              sendingMessage={sendingUserMessage}
              agentActivity={agentActivities[activeRequest.id] ? { requestId: activeRequest.id, ...agentActivities[activeRequest.id] } : null}
              confirmRequest={confirmRequest}
              fileError={fileError}
              openOrder={openOrder}
              openPolicy={openPolicy}
              linkedOrder={orders.find(
                (order) => order.requestId === activeRequest.id,
              )}
            />
          ) : (
            <RequestsList
              requests={visibleRequests}
              orders={visibleOrders}
              openRequest={openRequest}
              startNewRequest={() => setUserView("start")}
            />
          ))}

        {userView === "order" &&
          (activeOrder ? (
            <OrderWorkspace
              order={activeOrder}
              request={requests.find(
                (request) => request.id === activeOrder.requestId,
              )}
              updateOrder={(updater) => updateOrder(activeOrder.id, updater)}
              startPayment={startPayment}
              sendOrderMessage={sendOrderMessage}
              openPolicy={openPolicy}
            />
          ) : (
            <OrdersList orders={visibleOrders} openOrder={openOrder} openRequests={() => setUserView("requests")} startNewRequest={() => setUserView("start")} />
          ))}
      </main>

      {showPayment && (
        <PaymentModal
          price={activeOrder ? orderTotal(activeOrder) : activeRequest.price}
          total={
            activeOrder
              ? orderTotal(activeOrder)
              : Number(activeRequest.price || 0)
          }
          method={paymentMethodById(paymentMethodId)}
          close={() => setShowPayment(false)}
          markPaid={markPaid}
        />
      )}

      {authModal.open && (
        <AuthModal
          mode={authModal.mode}
          reason={authModal.reason}
          close={closeAuthModal}
          signInWithEmail={signInByEmail}
          signInWithGoogle={signInWithGoogle}
          registerCustomer={registerCustomer}
          authUsesSupabase={supabaseConfigured}
          authProviderStatus={authProviderStatus}
          openPolicy={openPolicy}
          switchMode={(mode) =>
            setAuthModal((current) => ({ ...current, mode }))
          }
        />
      )}
    </div>
  );
}

function AuthModal({
  mode,
  reason,
  close,
  signInWithEmail,
  signInWithGoogle,
  registerCustomer,
  authUsesSupabase,
  authProviderStatus,
  openPolicy,
  switchMode,
}) {
  const [loginEmail, setLoginEmail] = useState("");
  const [registerForm, setRegisterForm] = useState({
    nickname: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError("");
    setNotice(null);
  }, [mode]);

  const updateRegisterField = (field, value) => {
    setRegisterForm((current) => ({ ...current, [field]: value }));
  };

  const submitLogin = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    const authResult = await signInWithEmail(loginEmail);
    setLoading(false);
    if (!authResult.ok) {
      setError(authResult.error);
      return;
    }
    if (authResult.pending) {
      setNotice({
        email: loginEmail.trim().toLowerCase(),
        message: authResult.message,
        type: "login",
      });
      return;
    }
    setError("");
  };

  const submitGoogle = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    const authResult = await signInWithGoogle();
    setLoading(false);
    if (!authResult.ok) {
      setError(authResult.error);
      return;
    }
    if (authResult.pending) {
      setNotice({
        email: "Google",
        message: authResult.message,
        type: "google",
      });
    }
  };

  const submitRegister = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    const authResult = await registerCustomer(registerForm);
    setLoading(false);
    if (!authResult.ok) {
      setError(authResult.error);
      return;
    }
    if (authResult.pending) {
      setNotice({
        email: registerForm.email.trim().toLowerCase(),
        message: authResult.message,
        type: "register",
      });
      return;
    }
    setError("");
  };

  const isRegister = mode === "register";
  const authUnavailable = authProviderStatus === "unavailable";

  return (
    <div className="modal-backdrop auth-backdrop">
      <section
        className="payment-modal auth-modal"
        role="dialog"
        aria-modal="true"
      >
        <button
          className="modal-close"
          onClick={close}
          aria-label="Close sign-in"
        >
          x
        </button>
        <div className="brand-row">
          <Cable size={25} />
          <span>Easy Harness</span>
        </div>

        <h2>
          {isRegister
            ? "Create your Easy Harness account"
            : "Log in to Easy Harness"}
        </h2>
        <p>
          {reason ||
            (isRegister
              ? "Use an email address to save requests, quotes, and orders."
              : "Access saved requests, orders, and account details.")}
        </p>

        {!notice && (
          <div
            className="auth-provider-list streamlined"
            aria-label="Additional sign-in options"
          >
            <button
              type="button"
              className="auth-provider-button primary-provider"
              onClick={submitGoogle}
              disabled={loading || !authUsesSupabase || authUnavailable}
            >
              <span>
                <strong>
                  {loading ? "Opening Google sign-in…" : "Continue with Google"}
                </strong>
                <small>Secure account sign-in</small>
              </span>
            </button>
            <p className="auth-provider-note">Or use a secure email sign-in link below.</p>
          </div>
        )}
        {!notice && authUsesSupabase && (
          <p className="auth-disclaimer">
            {authProviderStatus === "connecting"
              ? "Checking your saved session..."
              : authProviderStatus === "unavailable"
                ? "Account access is temporarily unavailable. Please try again later."
                : "Use the email where you want to receive request and order updates."}
          </p>
        )}
        {!notice &&
          !authUsesSupabase &&
          authProviderStatus === "unavailable" && (
            <p className="auth-disclaimer">
              Account access is temporarily unavailable. Please try again later.
            </p>
          )}

        {notice ? (
          <div className="auth-check-email">
            <div
              className={`auth-check-icon ${notice.type === "google" ? "loading" : ""}`}
            >
              {notice.type === "google" ? (
                <span className="loading-ring" />
              ) : (
                <MailCheck size={30} />
              )}
            </div>
            <h3>
              {notice.type === "google"
                ? "Opening Google sign-in…"
                : "Check your email"}
            </h3>
            <p>
              {notice.type === "google" ? (
                "A secure Google sign-in window should open. Complete sign-in there and return to Easy Harness."
              ) : (
                <>
                  We sent a secure link to <strong>{notice.email}</strong>. Open
                  the link to finish
                  {notice.type === "register"
                    ? " creating your account."
                    : " logging in."}
                </>
              )}
            </p>
            {notice.type === "google" && (
              <div className="auth-waiting-line">
                <span /> <span /> <span />
                <small>Waiting for Google authorization</small>
              </div>
            )}
            {notice.type !== "google" && (
              <p className="auth-disclaimer">
                The email can take a minute to arrive. If it does not show up,
                check spam or use a different email address.
              </p>
            )}
            <div className="auth-action-row">
              <button
                type="button"
                className="auth-secondary-button"
                onClick={() => {
                  setNotice(null);
                  setError("");
                }}
              >
                Use another email
              </button>
              <button type="button" className="publish-button" onClick={close}>
                Done
              </button>
            </div>
          </div>
        ) : !isRegister ? (
          <div className="login-form">
            <label className="field">
              <span>Email</span>
              <input
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitLogin();
                }}
                placeholder="email@example.com"
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button
              className="publish-button"
              onClick={submitLogin}
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : authUsesSupabase
                  ? "Send sign-in link"
                  : "Continue with email"}
              <ArrowRight size={18} />
            </button>
            <button
              className="text-button"
              onClick={() => switchMode("register")}
            >
              New to Easy Harness? Create an account
            </button>
          </div>
        ) : (
          <div className="login-form">
            <div className="auth-form-grid">
              <label className="field">
                <span>Email</span>
                <input
                  value={registerForm.email}
                  onChange={(event) =>
                    updateRegisterField("email", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitRegister();
                  }}
                  placeholder="email@example.com"
                />
              </label>
              <label className="field">
                <span>Nickname</span>
                <input
                  value={registerForm.nickname}
                  onChange={(event) =>
                    updateRegisterField("nickname", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitRegister();
                  }}
                  placeholder="Optional"
                />
              </label>
            </div>
            <p className="auth-disclaimer">
              By creating an account, you can save requests and return to
              orders.
            </p>
            {error && <div className="form-error">{error}</div>}
            <button
              className="publish-button"
              onClick={submitRegister}
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : authUsesSupabase
                  ? "Send account link"
                  : "Create account"}
              <ArrowRight size={18} />
            </button>
            <button className="text-button" onClick={() => switchMode("login")}>
              Already have an account? Log in
            </button>
          </div>
        )}
        <p className="auth-terms-line">
          By continuing, you agree to the{" "}
          <InlinePolicyLink openPolicy={openPolicy} policyId="terms">
            Terms
          </InlinePolicyLink>{" "}
          and{" "}
          <InlinePolicyLink openPolicy={openPolicy} policyId="privacy">
            Privacy Policy
          </InlinePolicyLink>
          .
        </p>
      </section>
    </div>
  );
}

function UserSidebar({
  sidebarOpen,
  setSidebarOpen,
  userView,
  requests,
  orders,
  activeRequest,
  activeOrder,
  setUserView,
  openRequest,
  openOrder,
  currentUser,
  requireAuth,
  openPolicy,
}) {
  const showPrivateNav = !!currentUser;

  const openPrivateView = (view) => {
    if (!currentUser) {
      requireAuth("Log in or create an account to view your saved work.");
      return;
    }
    setUserView(view);
  };
  const activeSidebarRequests = dedupeRequestsByIdentity(requests).filter(
    (request) => !requestHasMovedToOrder(request, orders),
  );

  return (
    <aside
      className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}
      aria-label="Navigation"
    >
      <div className="rail-top">
        <button className="logo-button" aria-label="Easy Harness">
          <Cable size={22} />
        </button>
        {sidebarOpen && <span className="sidebar-brand">Easy Harness</span>}
        <button
          className="rail-icon"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={19} />
          ) : (
            <PanelLeftOpen size={19} />
          )}
        </button>
      </div>

      <nav className="rail-nav" aria-label="Main navigation">
        <button
          className={`rail-icon ${userView === "start" ? "active" : ""}`}
          onClick={() => setUserView("start")}
        >
          <Plus size={20} />
          {sidebarOpen && <span>New request</span>}
        </button>
        {showPrivateNav && (
          <>
            <button
              className={`rail-icon ${userView === "requests" ? "active" : ""}`}
              onClick={() => openPrivateView("requests")}
            >
              <Folder size={20} />
              {sidebarOpen && <span>Requests</span>}
            </button>
            <button
              className={`rail-icon ${userView === "orders" || userView === "order" ? "active" : ""}`}
              onClick={() => openPrivateView("orders")}
            >
              <ReceiptText size={20} />
              {sidebarOpen && <span>Orders</span>}
            </button>
          </>
        )}
      </nav>

      {sidebarOpen && showPrivateNav && (requests.length || orders.length) ? (
        <div className="draft-list">
          {!!activeSidebarRequests.length && (
            <>
              <div className="sidebar-section-title">Recent requests</div>
              {activeSidebarRequests.slice(0, 6).map((request) => (
                <button
                  className={`draft-list-item ${request.id === activeRequest?.id ? "active" : ""}`}
                  key={request.id}
                  onClick={() => openRequest(request.id, "user")}
                >
                  <strong>{request.title}</strong>
                  <span>{request.id}</span>
                  <small>{statusCopy[request.status]}</small>
                </button>
              ))}
            </>
          )}
          {!!orders.length && (
            <>
              <div className="sidebar-section-title">Recent orders</div>
              {orders.slice(0, 4).map((order) => (
                <button
                  className={`draft-list-item ${order.id === activeOrder?.id ? "active" : ""}`}
                  key={order.id}
                  onClick={() => openOrder(order.id)}
                >
                  <strong>{order.title}</strong>
                  <span>{order.id}</span>
                  <small>{orderStatusCopy[order.status]}</small>
                </button>
              ))}
            </>
          )}
        </div>
      ) : null}

      {!currentUser && (
        <div className="rail-bottom">
          <button
            className="rail-user rail-user-button"
            onClick={() =>
              requireAuth(
                "Log in or create an account to save requests and orders.",
              )
            }
          >
            <UserCircle size={22} />
            {sidebarOpen && <span>Log in</span>}
          </button>
        </div>
      )}
      {sidebarOpen && (
        <PolicyLinks
          openPolicy={openPolicy}
          className="sidebar-policy-links"
          compact
        />
      )}
    </aside>
  );
}

function TopAccount({
  user,
  signOut,
  openAccount,
  openLogin,
  openRegister,
  openRequests,
  openOrders,
  notifications,
  markNotificationsRead,
  openNotification,
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  const toggleNotifications = () => {
    setNotificationsOpen((current) => !current);
    setAccountOpen(false);
    if (!notificationsOpen) markNotificationsRead();
  };

  const toggleAccount = () => {
    setAccountOpen((current) => !current);
    setNotificationsOpen(false);
  };

  const chooseAccountItem = (action) => {
    setAccountOpen(false);
    action();
  };

  if (!user) {
    return (
      <div className="top-account">
        <button className="signin-button subtle" onClick={openRegister}>
          Create account
        </button>
        <button className="signin-button primary" onClick={openLogin}>
          Log in
        </button>
      </div>
    );
  }

  return (
    <div className="top-account">
      <button
        className="account-icon notification-button"
        aria-label="Open updates"
        onClick={toggleNotifications}
        title="Request and order updates"
      >
        <Bell size={18} />
        {!!unreadCount && <span>{unreadCount}</span>}
      </button>
      <button className="account-pill" onClick={toggleAccount} aria-label="Open account menu">
        <span className="account-initials">{initials(user.name || user.email)}</span>
        <span className="account-name">{user.name || user.email}</span>
      </button>
      {accountOpen && (
        <div className="account-menu">
          <button onClick={() => chooseAccountItem(openAccount)}>Account</button>
          <button onClick={() => chooseAccountItem(openRequests)}>My requests</button>
          <button onClick={() => chooseAccountItem(openOrders)}>My orders</button>
          <button className="danger" onClick={() => chooseAccountItem(signOut)}>Sign out</button>
        </div>
      )}
      {notificationsOpen && (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <strong>Updates</strong>
            <small>Request and order changes that need attention.</small>
          </div>
          {notifications.length ? (
            notifications.map((notification) => (
              <button
                className="notification-row"
                key={notification.id}
                onClick={() => openNotification(notification.requestId)}
              >
                <span>{notification.title}</span>
                <p>{notification.body}</p>
                <small>{notification.createdAt}</small>
              </button>
            ))
          ) : (
            <div className="empty-state compact">
              <p>No new updates. Request updates will appear here when Easy Harness needs your attention.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationChannels({ notification }) {
  if (!notification.channels?.length) return null;
  return (
    <div className="notification-channels">
      {notification.channels.slice(0, 3).map((item) => (
        <small key={item.channel}>
          {item.channel}: {item.status}
        </small>
      ))}
    </div>
  );
}

function PolicyLinks({ openPolicy, className = "", compact = false }) {
  if (!openPolicy) return null;
  const visible = compact
    ? policyPages.filter((policy) =>
        ["terms", "privacy", "shipping", "after-sales"].includes(policy.id),
      )
    : policyPages;
  return (
    <div className={`policy-links ${className}`}>
      {visible.map((policy) => (
        <button
          type="button"
          key={policy.id}
          onClick={() => openPolicy(policy.id)}
        >
          {policy.shortTitle}
        </button>
      ))}
    </div>
  );
}

function InlinePolicyLink({ openPolicy, policyId, children }) {
  return (
    <button
      type="button"
      className="inline-policy-link"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openPolicy?.(policyId);
      }}
    >
      {children}
    </button>
  );
}

function PolicyScreen({ activePolicyId, setActivePolicyId, back }) {
  const activePolicy = policyById[activePolicyId] || policyPages[0];
  return (
    <section className="policy-screen">
      <div className="policy-shell">
        <header className="policy-hero">
          <div>
            <span className="eyebrow">Easy Harness policies</span>
            <h1>Legal and trade terms</h1>
            <p>
              Core terms for account access, uploaded materials, custom harness
              orders, international shipping, and after-sales support.
            </p>
          </div>
          <button className="secondary-action" type="button" onClick={back}>
            Back
          </button>
        </header>

        <div className="policy-layout">
          <nav className="policy-nav" aria-label="Policy pages">
            {policyPages.map((policy) => (
              <button
                type="button"
                key={policy.id}
                className={policy.id === activePolicy.id ? "active" : ""}
                onClick={() => setActivePolicyId(policy.id)}
              >
                {policy.shortTitle}
              </button>
            ))}
          </nav>

          <article className="policy-document">
            <span className="eyebrow">Last updated May 14, 2026</span>
            <h2>{activePolicy.title}</h2>
            <p className="policy-summary">{activePolicy.summary}</p>
            <div className="policy-section-list">
              {activePolicy.sections.map((section) => (
                <section key={section.heading}>
                  <h3>{section.heading}</h3>
                  <p>{section.body}</p>
                </section>
              ))}
            </div>
            <div className="policy-contact-card">
              <ShieldCheck size={18} />
              <div>
                <strong>Questions about these terms?</strong>
                <p>
                  Contact Easy Harness before confirming a quote or completing
                  payment if any request, order, shipping, or support detail is
                  unclear.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function WiringBackdrop() {
  return (
    <svg className="wiring-backdrop" viewBox="0 0 1200 760" aria-hidden="true">
      <path d="M716 84h142c26 0 48 22 48 48v94c0 24 20 44 44 44h136" />
      <path d="M710 122h94c34 0 62 28 62 62v112c0 24 20 44 44 44h170" />
      <path d="M120 576h220c56 0 102-46 102-102v-58c0-36 30-66 66-66h110" />
      <path d="M730 620h112c40 0 72-32 72-72v-66c0-28 22-50 50-50h108" />
      <rect x="646" y="72" width="48" height="32" rx="4" />
      <rect x="1074" y="248" width="58" height="54" rx="8" />
      <rect x="572" y="334" width="58" height="54" rx="8" />
      <circle cx="846" cy="122" r="6" />
      <circle cx="906" cy="270" r="6" />
      <circle cx="448" cy="416" r="6" />
    </svg>
  );
}

function StartScreen({
  description,
  setDescription,
  files,
  uploadRef,
  handleUpload,
  handleDrop,
  removeFile,
  fillSampleRequest,
  startRequest,
  submittingRequest = false,
  submissionPhase = "",
  currentUser,
  uploadTermsAccepted = false,
  termsChecked,
  setTermsChecked,
  termsError,
  fileError,
  openPolicy,
}) {
  const phaseCopy = {
    creating: "Creating your request…",
    uploading: "Uploading files…",
    checking: "Easy Harness is checking your request…",
  };
  const [dragActive, setDragActive] = useState(false);
  return (
    <section
      className={`start-screen ${dragActive ? "drop-active" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!submittingRequest) setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setDragActive(false);
        }
      }}
      onDrop={(event) => {
        setDragActive(false);
        handleDrop?.(event);
      }}
    >
      <div className="start-copy clean">
        <h1>Upload what you have. We’ll build the harness you need.</h1>
        <p>Tell us what should connect. Upload any files you already have.</p>
      </div>

      <div className="upload-composer">
        <button
          className="attach-button"
          onClick={() => uploadRef.current?.click()}
          disabled={submittingRequest}
        >
          <Plus size={21} />
        </button>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the harness you need..."
          rows={1}
          disabled={submittingRequest}
        />
        <input
          ref={uploadRef}
          type="file"
          multiple
          hidden
          onChange={handleUpload}
        />
        <button
          className="send-button"
          onClick={startRequest}
          aria-label="Start request"
          disabled={submittingRequest}
        >
          {submittingRequest ? <Clock3 size={21} /> : <ArrowRight size={21} />}
        </button>
      </div>

      <div className="start-actions">
        <button
          className="soft-chip"
          onClick={() => uploadRef.current?.click()}
          disabled={submittingRequest}
        >
          <Upload size={16} />
          Upload files
        </button>
        <span className="file-count">
          {files.length
            ? `${files.length} file${files.length > 1 ? "s" : ""} attached`
            : "No files attached"}
        </span>
      </div>

      {!!files.length && (
        <div className="file-strip compact center">
          {files.map((file) => (
            <FileChip
              key={file.id || fileName(file)}
              file={file}
              onRemove={() => removeFile?.(file.id || fileName(file))}
            />
          ))}
        </div>
      )}

      {submittingRequest && (
        <div className="submission-progress-card">
          <Clock3 size={17} />
          <div>
            <strong>{phaseCopy[submissionPhase] || "Creating your request…"}</strong>
            <p>Keep this page open. Easy Harness will move you into the request thread automatically.</p>
          </div>
        </div>
      )}

      {fileError && <div className="form-error">{fileError}</div>}

      {!uploadTermsAccepted && (
        <label className={`terms-card ${termsError ? "error" : ""}`}>
          <input
            type="checkbox"
            checked={termsChecked}
            onChange={(event) => setTermsChecked(event.target.checked)}
          />
          <span>
            I confirm that I have the right to upload these files and Easy
            Harness may use them to review and prepare this request.{" "}
            <InlinePolicyLink openPolicy={openPolicy} policyId="uploads">
              Upload terms
            </InlinePolicyLink>
          </span>
        </label>
      )}
      {termsError && <div className="form-error">{termsError}</div>}
    </section>
  );
}

function ProcessingScreen({ request, progressIndex }) {
  return (
    <section className="processing-screen">
      <div className="processing-shell">
        <div className="processing-copy">
          <div className="processing-mark">
            <Sparkles size={25} />
          </div>
          <h1>We're preparing your request</h1>
          <p>
            Your upload is in. Easy Harness is organizing the details into a
            request thread.
          </p>
        </div>

        <div className="progress-track" aria-label="Processing progress">
          {processingSteps.map((step, index) => {
            const done = progressIndex > index;
            const current = progressIndex === index;
            return (
              <div
                className={`track-step ${done ? "done" : ""} ${current ? "current" : ""}`}
                key={step}
              >
                <span className="step-dot">
                  {done ? (
                    <Check size={15} />
                  ) : current ? (
                    <Clock3 size={15} />
                  ) : null}
                </span>
                <span>{step}</span>
              </div>
            );
          })}
        </div>

        {!!request?.files?.length && (
          <div className="file-strip compact center">
            {request.files.map((file, index) => (
              <FileChip key={attachmentKey(file, index)} file={file} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RequestsList({ requests, orders = [], openRequest, startNewRequest }) {
  const list = dedupeRequestsByIdentity(requests);
  const activeRequests = list.filter(
    (request) => !requestHasMovedToOrder(request, orders),
  );
  const convertedRequests = list.filter((request) =>
    requestHasMovedToOrder(request, orders),
  );
  return (
    <section className="requests-screen">
      <div className="requests-header">
        <span className="eyebrow">Requests</span>
        <h1>Your harness requests</h1>
        <p>
          Continue an active request, review an Easy Harness Draft, or confirm a
          price when it is ready.
        </p>
      </div>

      {activeRequests.length ? (
        <div className="request-list">
          {activeRequests.map((request) => (
            <button
              className="request-row"
              key={request.id}
              onClick={() => openRequest(request.id, "user")}
            >
              <div>
                <strong>{request.title}</strong>
                <span>{request.id}</span>
              </div>
              <div className="request-row-meta">
                <StatusBadge status={request.status} />
                <small>{request.updated}</small>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state action-empty-state">
          <div>
            <strong>
              {convertedRequests.length
                ? "No active requests right now."
                : "No harness requests yet."}
            </strong>
            <p>
              {convertedRequests.length
                ? "Requests that already became orders are kept below for reference."
                : "Start with a short description, a photo, a sketch, a pinout, or an old harness sample."}
            </p>
          </div>
          <button className="secondary-action" onClick={startNewRequest}>
            New request
          </button>
        </div>
      )}
      {!!convertedRequests.length && (
        <details className="converted-requests-block">
          <summary>
            <span>Converted to orders</span>
            <small>{convertedRequests.length}</small>
          </summary>
          <div className="request-list converted-request-list">
            {convertedRequests.map((request) => {
              const linkedOrder = linkedOrderForRequest(request, orders);
              return (
                <button
                  className="request-row converted-request-row"
                  key={request.id}
                  onClick={() => openRequest(request.id, "user")}
                >
                  <div>
                    <strong>{request.title}</strong>
                    <span>
                      {linkedOrder
                        ? `${request.id} / Order ${linkedOrder.id}`
                        : request.id}
                    </span>
                  </div>
                  <div className="request-row-meta">
                    <StatusBadge status="confirmed" />
                    <small>{request.updated}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}

function OrdersList({ orders, openOrder, openRequests, startNewRequest }) {
  const paymentNeeded = orders.filter((order) => order.paymentStatus !== "paid");
  const active = orders.filter(
    (order) => order.paymentStatus === "paid" && order.status !== "delivered",
  );
  const completed = orders.filter(
    (order) => order.paymentStatus === "paid" && order.status === "delivered",
  );

  return (
    <section className="requests-screen">
      <div className="requests-header">
        <span className="eyebrow">Orders</span>
        <h1>Your confirmed orders</h1>
        <p>Complete payment and delivery details, or track production and shipment after payment.</p>
      </div>

      <div className="order-list-groups">
        {orders.length ? (
          <>
            <OrderListGroup
              title="Ready for payment"
              orders={paymentNeeded}
              openOrder={openOrder}
            />
            <OrderListGroup
              title="Active orders"
              orders={active}
              openOrder={openOrder}
            />
            <OrderListGroup
              title="Completed"
              orders={completed}
              openOrder={openOrder}
            />
          </>
        ) : (
          <div className="empty-state action-empty-state">
            <div>
              <strong>No confirmed orders yet.</strong>
              <p>Orders appear after Easy Harness releases a price and you confirm the request.</p>
            </div>
            <div className="empty-actions">
              <button className="secondary-action" onClick={openRequests}>
                View requests
              </button>
              <button className="text-button" onClick={startNewRequest}>
                New request
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function OrderListGroup({ title, orders, openOrder }) {
  if (!orders.length) return null;
  return (
    <div className="order-list-group">
      <div className="order-list-heading">
        <h2>{title}</h2>
        <span>{orders.length}</span>
      </div>
      <div className="request-list">
        {orders.map((order) => {
          const shipping = selectedShipping(order);
          return (
            <button
              className="request-row order-row"
              key={order.id}
              onClick={() => openOrder(order.id)}
            >
              <div>
                <strong>{order.title}</strong>
                <span>{order.id}</span>
                <small>
                  {order.paymentStatus === "paid"
                    ? `${orderStatusCopy[order.status]} - ${shipping?.carrier || "Shipping pending"}`
                    : paymentStatusCopy[order.paymentStatus] ||
                      orderStatusCopy[order.status]}
                </small>
              </div>
              <div className="request-row-meta">
                <StatusBadge status={order.status} />
                <small>{order.updated}</small>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AccountScreen({ user, updateUser, openPolicy }) {
  const preferences = user.notificationPreferences || {};
  const [form, setForm] = useState({
    name: user.name || "",
    notifyEmail: preferences.email !== false,
    notifyWhatsapp: !!preferences.whatsapp,
    notifyInApp: preferences.inApp !== false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const nextPreferences = user.notificationPreferences || {};
    setForm({
      name: user.name || "",
      notifyEmail: nextPreferences.email !== false,
      notifyWhatsapp: !!nextPreferences.whatsapp,
      notifyInApp: nextPreferences.inApp !== false,
    });
    setSaved(false);
  }, [user.id]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const saveProfile = () => {
    updateUser({
      name: form.name,
      notificationPreferences: {
        email: form.notifyEmail,
        whatsapp: form.notifyWhatsapp,
        inApp: form.notifyInApp,
      },
    });
    setSaved(true);
  };

  const acceptTerms = () => {
    writeUploadTermsAccepted(user.id);
    updateUser(
      {
        termsAccepted: true,
        termsAcceptedAt: todayLabel(),
      },
      "upload_terms_accepted",
    );
  };

  return (
    <section className="account-screen">
      <div className="requests-header">
        <span className="eyebrow">Account</span>
        <h1>Your account</h1>
        <p>Manage your email, nickname, and notification preferences.</p>
      </div>

      <div className="account-grid">
        <div className="admin-card profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {initials(form.name || user.email)}
            </div>
            <div>
              <h2>{form.name || user.email}</h2>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="profile-form">
            <label className="field">
              <span>Nickname</span>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Nickname"
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input value={user.email} disabled readOnly />
            </label>
          </div>

          <div className="profile-subsection">
            <h3>Notifications</h3>
            <div className="preference-list">
              <label>
                <input
                  type="checkbox"
                  checked={form.notifyEmail}
                  onChange={(event) =>
                    updateField("notifyEmail", event.target.checked)
                  }
                />
                <span>Email updates</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.notifyWhatsapp}
                  onChange={(event) =>
                    updateField("notifyWhatsapp", event.target.checked)
                  }
                />
                <span>WhatsApp updates</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.notifyInApp}
                  onChange={(event) =>
                    updateField("notifyInApp", event.target.checked)
                  }
                />
                <span>In-app updates</span>
              </label>
            </div>
          </div>

          <button className="pay-button profile-save" onClick={saveProfile}>
            Save profile
          </button>
          {saved && <p className="save-note">Profile saved.</p>}
        </div>

        <aside className="account-side">
          <div className="side-card">
            <h2>Sign-in</h2>
            <div className="account-meta-row">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="account-meta-row">
              <span>Role</span>
              <strong>{roleCopy[user.role]}</strong>
            </div>
            <div className="account-meta-row">
              <span>Status</span>
              <strong>{user.status}</strong>
            </div>
            <div className="account-meta-row">
              <span>Email verification</span>
              <strong>{user.verified ? "Verified" : "Pending"}</strong>
            </div>
            <div className="account-meta-row">
              <span>Sign-in methods</span>
              <strong>{(user.authMethods || ["email"]).join(", ")}</strong>
            </div>
          </div>

          <div className="side-card">
            <h2>Upload terms</h2>
            <p>
              Required before submitting files or written request details.{" "}
              <InlinePolicyLink openPolicy={openPolicy} policyId="uploads">
                View terms
              </InlinePolicyLink>
            </p>
            {user.termsAccepted ? (
              <div className="event-note">
                <Check size={16} />
                <div>
                  <strong>Accepted</strong>
                  <p>{user.termsAcceptedAt || "Accepted"}</p>
                </div>
              </div>
            ) : (
              <button className="secondary-action" onClick={acceptTerms}>
                Accept terms
              </button>
            )}
          </div>
          <div className="side-card">
            <h2>Policies</h2>
            <p>Review Easy Harness account, privacy, order, shipping, and support terms.</p>
            <PolicyLinks openPolicy={openPolicy} compact />
          </div>
        </aside>
      </div>
    </section>
  );
}

function initials(value) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function RequestWorkspace({
  request,
  perspective,
  composerValue,
  setComposerValue,
  composerFiles,
  uploadRef,
  handleUpload,
  handleDrop,
  removeFile,
  sendMessage,
  sendingMessage = false,
  agentActivity,
  confirmRequest,
  fileError,
  openOrder,
  openPolicy,
  linkedOrder,
}) {
  const draftForView = normalizeDraftForView(request.checkResult || {}, request);
  const draftStatus = draftForView.draft_meta?.draft_status || "";
  const missingItems = userNeededNextItems(draftForView);
  const agentActive = agentActivity?.requestId === request.id;
  const shouldShowMissingInfo =
    perspective === "user" &&
    missingItems.length > 0 &&
    !isReadyDraftStatus(draftStatus) &&
    ["needs_info", "not_supported", "checking"].includes(request.status);

  return (
    <section className="request-workspace">
      <div className="thread-layout">
        <div className="thread-main">
          <ThreadHeader request={request} />
          {shouldShowMissingInfo && (
            <MissingInfoPrompt
              items={missingItems}
              checkResult={request.checkResult}
            />
          )}
          <MessageList request={request} perspective={perspective} />
          {agentActive && (
            <AgentActivityCard
              mode={agentActivity.mode}
              startedAt={agentActivity.startedAt}
            />
          )}
          <UserComposer
            value={composerValue}
            setValue={setComposerValue}
            files={composerFiles}
            uploadRef={uploadRef}
            handleUpload={handleUpload}
            handleDrop={handleDrop}
            removeFile={removeFile}
            sendMessage={sendMessage}
            sending={sendingMessage}
            fileError={fileError}
          />
        </div>

        <RequestSidePanel
          request={request}
          confirmRequest={confirmRequest}
          openOrder={openOrder}
          openPolicy={openPolicy}
          linkedOrder={linkedOrder}
        />
      </div>
    </section>
  );
}

function MissingInfoPrompt({ items, checkResult }) {
  const draftStatus =
    checkResult?.draft_meta?.draft_status || checkResult?.intake_stage;
  const waitingForContext =
    draftStatus === "needs_harness_context" ||
    draftStatus === "not_harness_related" ||
    checkResult?.can_prepare_draft === false;
  const title = waitingForContext
    ? "Harness connection details needed"
    : "A few details would help";
  const intro = waitingForContext
    ? "Start with what should connect to what. Connector photos, port photos, an old harness sample, or a simple sketch can help."
    : "Reply with what you know. Unknown items can be reviewed later by Easy Harness.";

  return (
    <section className="missing-info-prompt">
      <div className="missing-info-icon">
        <AlertTriangle size={18} />
      </div>
      <div>
        <h2>{title}</h2>
        <p>{intro}</p>
        {!!items.length && (
          <div className="missing-info-list">
            {items.slice(0, 3).map((item) => (
              <span key={item}>{formatMissingInfoItem(item)}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AgentActivityCard({ mode, startedAt }) {
  const isInitial = mode === "initial";
  return (
    <article className="message message-easy agent-activity-card">
      <div className="message-avatar pulsing-avatar">
        <Cable size={18} />
      </div>
      <div className="message-body">
        <div className="message-meta">
          <span>Easy Harness</span>
          <time>{displayTime(startedAt || new Date().toISOString())}</time>
        </div>
        <div className="agent-thinking">
          <strong>
            {isInitial
              ? "Easy Harness is analyzing your request…"
              : "Easy Harness is thinking through your update…"}
          </strong>
          <p>
            {isInitial
              ? "Reading your description and uploaded files, then preparing the next intake result."
              : "Reviewing the new details and updating the intake draft."}
          </p>
          <div className="thinking-dots" aria-label="Agent is working">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <small>
            This may take about a minute. You can keep this page open while the Draft updates.
          </small>
        </div>
      </div>
    </article>
  );
}

function formatMissingInfoItem(item) {
  const raw = String(item || "").trim();
  if (!raw) return "Review item";
  const lower = raw.toLowerCase();
  const copy = {
    "target quantity": "Target quantity",
    "approximate length": "Approximate length",
    "electrical rating": "Voltage or current rating",
    power_details: "Power / voltage details",
    voltage_current_or_power: "Voltage, current, or power level",
    current_or_power: "Current or power level",
    maximum_current: "Maximum current",
    connector_identification: "Connector identification",
    wire_gauge_and_colors: "Wire type, gauge, and colors",
    routing_and_branch_design: "Routing and branch layout",
    ip67_method: "Waterproofing / IP67 method",
    unused_pins: "Unused pin handling",
    terminal_and_crimp_specs: "Terminal and crimp details",
    attachment_review: "Attachment review",
    length_or_measurement_basis: "Approximate length or measurement basis",
    request_scope: "Connection or copy scope",
    use_context: "Use context or equipment",
  };

  if (copy[raw]) return copy[raw];
  if (copy[lower]) return copy[lower];
  const text = raw.replaceAll("_", " ").replace(/\s+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ThreadHeader({ request }) {
  return (
    <header className="thread-header">
      <div className="thread-title">
        <div>
          <span className="eyebrow">Request {request.id}</span>
          <h1>{request.title}</h1>
          <p>Continue the thread, review the Draft, or confirm the price when it is ready.</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <WorkflowProgress status={request.status} />
    </header>
  );
}

function WorkflowProgress({ status }) {
  const currentIndex = statusRank[status] ?? 0;
  return (
    <div className="mini-progress" aria-label="Request progress">
      {workflowSteps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <div
            className={`mini-step ${done ? "done" : ""} ${current ? "current" : ""}`}
            key={step}
          >
            <span>{done ? <Check size={11} /> : null}</span>
            <strong>{step}</strong>
          </div>
        );
      })}
    </div>
  );
}

function MessageList({ request, perspective }) {
  return (
    <div className="thread-column">
      {request.messages.map((message) => (
        <MessageCard
          key={message.id}
          message={message}
          perspective={perspective}
          request={request}
        />
      ))}
    </div>
  );
}

function MessageCard({ message, perspective, request }) {
  if (message.role === "event") {
    return (
      <article className="thread-event">
        {message.blocks.map((block, index) => (
          <ContentBlock
            block={block}
            request={request}
            key={`${message.id}-${index}`}
          />
        ))}
      </article>
    );
  }

  const actor =
    message.role === "customer"
      ? perspective === "staff"
        ? request.customer
        : "You"
      : "Easy Harness";
  const tone =
    message.role === "customer"
      ? "user"
      : message.tone === "draft"
        ? "draft"
        : "easy";

  return (
    <article className={`message message-${tone}`}>
      <div className="message-avatar">
        {message.role === "customer" ? (
          <UserCircle size={18} />
        ) : (
          <Cable size={18} />
        )}
      </div>
      <div className="message-body">
        <div className="message-meta">
          <span>{actor}</span>
          <time>{displayTime(message.createdAt)}</time>
        </div>
        {message.blocks.map((block, index) => (
          <ContentBlock
            block={block}
            request={request}
            key={`${message.id}-${index}`}
          />
        ))}
      </div>
    </article>
  );
}

function formatTextSections(text = "") {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = [];
  let pendingList = [];
  const flushList = () => {
    if (pendingList.length) {
      sections.push({ type: "list", items: pendingList });
      pendingList = [];
    }
  };

  lines.forEach((line) => {
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      pendingList.push(numbered[2]);
      return;
    }
    flushList();
    sections.push({ type: "paragraph", text: line });
  });
  flushList();
  return sections;
}

function FormattedTextBlock({ text }) {
  const sections = formatTextSections(text);
  if (!sections.length) return null;
  return (
    <div className="formatted-text-block">
      {sections.map((section, index) => {
        if (section.type === "list") {
          return (
            <ol key={`list-${index}`}>
              {section.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>{item}</li>
              ))}
            </ol>
          );
        }
        return <p key={`p-${index}`}>{section.text}</p>;
      })}
    </div>
  );
}

function ContentBlock({ block, request }) {
  if (block.type === "text") return <FormattedTextBlock text={block.text} />;

  if (block.type === "attachments") {
    return (
      <AttachmentGallery
        files={enrichAttachmentBlockFiles(block.files || [], request?.files || [])}
      />
    );
  }

  if (block.type === "draft") {
    return (
      <div className="draft-record">
        <div className="draft-record-top">
          <div>
            <span className="eyebrow">Draft generated</span>
            <h2>{block.id}</h2>
            <p>{block.title}</p>
          </div>
          <span className="draft-state">{statusCopy[request.status]}</span>
        </div>
        <p>
          Easy Harness has organized your request into a preliminary draft. It
          is now in review before release.
        </p>
      </div>
    );
  }

  if (block.type === "draft_summary") {
    return <ThreadDraftSummary block={block} request={request} />;
  }

  if (block.type === "event") {
    return (
      <div className="event-note">
        <Check size={16} />
        <div>
          <strong>{block.title}</strong>
          <p>{block.body}</p>
        </div>
      </div>
    );
  }

  if (block.type === "price") {
    return (
      <div className="event-note price-note">
        <CircleDollarSign size={16} />
        <div>
          <strong>Quote ready</strong>
          <p>${block.amount} - Review and confirm the request when it looks correct.</p>
        </div>
      </div>
    );
  }

  if (block.type === "table") return <BomTable request={request} />;
  if (block.type === "preview") return <HarnessPreview request={request} />;
  return null;
}

function splitDetailRow(item = "") {
  const text = String(item);
  const separator = text.indexOf(":");
  if (separator < 0) return ["Detail", text];
  return [text.slice(0, separator), text.slice(separator + 1).trim()];
}

function ThreadDraftSummary({ block, request }) {
  const details = block.compactDetails || [];
  const knownDetails = block.knownDetails || [];
  const reviewItems = block.reviewItems || [];
  const files = block.files || [];
  const fromSide = block.fromSide && block.fromSide !== "unknown" ? block.fromSide : "Request";
  const toSides = Array.isArray(block.toSide) ? block.toSide.filter(Boolean) : [];
  const diagramLabel = toSides.length
    ? `${fromSide} → ${toSides.join(", ")}`
    : block.connectionGoal || block.title || request.title;
  return (
    <div className="thread-draft-summary">
      <div className="draft-record-top">
        <div>
          <span className="eyebrow">Easy Harness draft</span>
          <h2>{block.draftId || `${request.id}-D1`}</h2>
          <p>{block.title || request.title}</p>
        </div>
        <span className="draft-state">{block.status || "Ready for review"}</span>
      </div>

      <div className="draft-connection-diagram" aria-label="Draft connection summary">
        <span>{fromSide}</span>
        <strong>→</strong>
        <span>{toSides.length ? toSides.join(", ") : diagramLabel}</span>
      </div>

      {!!details.length && (
        <div className="summary-chips draft-summary-chips">
          {details.slice(0, 6).map((item) => (
            <em key={item}>{item}</em>
          ))}
        </div>
      )}

      {!!knownDetails.length && (
        <div className="draft-summary-section">
          <strong>Known details</strong>
          <div className="draft-detail-table">
            {knownDetails.slice(0, 8).map((item) => {
              const [label, value] = splitDetailRow(item);
              return (
                <div className="draft-detail-row" key={item}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!!files.length && (
        <div className="draft-summary-section">
          <strong>Files received</strong>
          <ul>
            {files.slice(0, 5).map((item) => (
              <li key={item}>{formatMissingInfoItem(item)}</li>
            ))}
          </ul>
        </div>
      )}
      {!!reviewItems.length && (
        <div className="draft-summary-section">
          <strong>Easy Harness will review</strong>
          <ul>
            {reviewItems.slice(0, 5).map((item) => (
              <li key={item}>{formatMissingInfoItem(item)}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="draft-summary-note">
        You can still add details or corrections in this thread.
      </p>
    </div>
  );
}

function UserComposer({
  value,
  setValue,
  files,
  uploadRef,
  handleUpload,
  handleDrop,
  removeFile,
  sendMessage,
  sending = false,
  fileError,
}) {
  const [dragActive, setDragActive] = useState(false);
  return (
    <div
      className={`composer-shell ${dragActive ? "drop-active" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!sending) setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setDragActive(false);
        }
      }}
      onDrop={(event) => {
        setDragActive(false);
        handleDrop?.(event);
      }}
    >
      {!!files.length && (
        <div className="composer-files">
          {files.map((file) => (
            <FileChip
              file={file}
              key={file.id || fileName(file)}
              onRemove={() => removeFile?.(file.id || fileName(file))}
            />
          ))}
        </div>
      )}
      {fileError && <div className="composer-error">{fileError}</div>}
      <div className="thread-composer">
        <button
          className="attach-button"
          onClick={() => uploadRef.current?.click()}
          disabled={sending}
        >
          <Plus size={19} />
        </button>
        <input
          ref={uploadRef}
          type="file"
          multiple
          hidden
          onChange={handleUpload}
        />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          disabled={sending}
          placeholder={
            sending
              ? "Easy Harness is updating..."
              : "Add details or upload more files..."
          }
        />
        <button
          className="composer-tool"
          onClick={() => uploadRef.current?.click()}
          aria-label="Attach file"
          disabled={sending}
        >
          <FileText size={18} />
        </button>
        <button
          className="send-button small"
          onClick={sendMessage}
          aria-label="Send"
          disabled={sending}
        >
          {sending ? <Clock3 size={17} /> : <Send size={17} />}
        </button>
      </div>
    </div>
  );
}

function isCompleteDraftV01(checkResult) {
  return (
    checkResult?.schema_version === "easy_harness_draft_v0_1" &&
    Boolean(checkResult?.draft_meta && checkResult?.user_facing_summary)
  );
}

function isDraftV01(checkResult) {
  return isCompleteDraftV01(checkResult);
}

function normalizeDraftForView(checkResult = {}, request = {}) {
  if (isDraftV01(checkResult)) return checkResult;
  const draft = checkResult?.factory_draft || {};
  const missing =
    checkResult?.missing || checkResult?.missing_information || [];
  const questions =
    checkResult?.questions || checkResult?.questions_for_user || [];
  const facts = checkResult?.confirmed_facts || [];
  const readyForReview =
    checkResult?.readiness === "ready_for_admin_review" ||
    checkResult?.status === "accepted" ||
    request.status === "in_review";
  const canPrepareDraft = checkResult?.can_prepare_draft !== false;
  const status = readyForReview
    ? "ready_for_easy_harness_review"
    : canPrepareDraft
      ? "needs_key_clarification"
      : "needs_harness_context";

  return {
    schema_version: "legacy_intake_view",
    draft_meta: {
      draft_status: status,
      draft_maturity_level: readyForReview ? 3 : canPrepareDraft ? 2 : 1,
    },
    user_intent: {
      connection_goal:
        draft.connection_goal || checkResult?.customer_summary || "",
      intent_type: "unknown",
      from_side: "unknown",
      to_side: [],
    },
    provided_evidence: [],
    known_requirements: {},
    captured_professional_details: {},
    ai_interpretation: {
      short_understanding:
        checkResult?.customer_summary || draft.connection_goal || "",
    },
    unknowns: {
      ask_user_now: [],
      ask_user_if_likely_known: missing.map((item) => ({
        field: item,
        reason: item,
        question: item,
      })),
      easy_harness_review: [],
      later_supplier_or_engineering_confirmation: [],
      not_applicable: [],
    },
    risk_flags: [],
    user_facing_summary: {
      request_line:
        draft.connection_goal ||
        checkResult?.customer_summary ||
        "Harness request",
      compact_details: [
        draft.quantity,
        draft.estimated_length,
        draft.environment,
      ].filter(Boolean),
      what_we_have: facts.length
        ? facts.slice(0, 4)
        : [
            draft.connection_goal,
            draft.quantity,
            draft.estimated_length,
            draft.environment,
          ]
            .filter(Boolean)
            .slice(0, 4),
      needed_next: (questions.length ? questions : missing)
        .slice(0, 3)
        .map(formatMissingInfoItem),
      next_step: readyForReview
        ? "Easy Harness will review the files and remaining technical details."
        : "Reply with what you know. Unknown items can be reviewed later.",
    },
    draft_closure: {
      can_close_user_draft: readyForReview,
      closure_status: status,
      questions_to_ask: (questions.length ? questions : missing).slice(0, 3),
      customer_message_type: readyForReview
        ? "ready_for_review"
        : "ask_key_details",
    },
  };
}

function isReadyDraftStatus(status) {
  return (
    status === "ready_for_easy_harness_review" ||
    status === "closed_for_easy_harness_review"
  );
}

function normalizeUnknownItemList(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => unknownItemLabel(item))
    .filter((item) => item && !isPlaceholderUnknown(item));
}

function userNeededNextItems(draft = {}) {
  const status = draft?.draft_meta?.draft_status || "";
  if (isReadyDraftStatus(status)) return [];
  const unknowns = draft?.unknowns || {};
  const directQuestions = [
    ...normalizeUnknownItemList(unknowns.ask_user_now),
    ...normalizeUnknownItemList(unknowns.ask_user_if_likely_known),
  ];
  if (directQuestions.length) return [...new Set(directQuestions)].slice(0, 3);
  return (draft?.user_facing_summary?.needed_next || [])
    .filter((item) => !isEasyHarnessReviewOnlyItem(item))
    .slice(0, 3);
}

function isEasyHarnessReviewOnlyItem(item = "") {
  const text = String(item).toLowerCase();
  return /easy harness|review|visual|identify|connector identification|finalize|terminal|seal|wire sizing|engineering|supplier/.test(text);
}

function isPlaceholderUnknown(item = "") {
  const text = String(item).trim().toLowerCase();
  return (
    !text ||
    text === "unknown_item" ||
    text === "needs later confirmation." ||
    text === "needs later confirmation" ||
    text === "review item" ||
    /unknown[_\s-]*item/.test(text)
  );
}

function easyHarnessReviewItems(draft = {}) {
  const unknowns = draft?.unknowns || {};
  const direct = normalizeUnknownItemList(unknowns.easy_harness_review);
  const later = normalizeUnknownItemList(unknowns.later_supplier_or_engineering_confirmation);
  const fromSummary = (draft?.user_facing_summary?.needed_next || []).filter(isEasyHarnessReviewOnlyItem);
  return [...new Set([...direct, ...fromSummary, ...later])]
    .filter((item) => !isPlaceholderUnknown(item))
    .slice(0, 8);
}

function professionalDetailItems(details = {}) {
  const items = [];
  const connectors = Array.isArray(details.connectors) ? details.connectors : [];
  connectors.slice(0, 4).forEach((item) => {
    const label = item.part_number || item.value || item.label;
    if (label) items.push(`Connector: ${label}`);
  });
  const wireGauge = detailValueLabel(details.wire_gauge);
  if (wireGauge) items.push(`Wire gauge: ${wireGauge}`);
  const pinout = Array.isArray(details.pinout) ? details.pinout : [];
  if (pinout.length) items.push(`Pinout: ${pinout.length} pin assignment${pinout.length > 1 ? "s" : ""} captured`);
  const terminals = Array.isArray(details.terminals) ? details.terminals : [];
  terminals.slice(0, 3).forEach((item) => {
    const label = item.part_number || item.value || item.label;
    if (label) items.push(`Terminal: ${label}`);
  });
  const shielding = detailValueLabel(details.shielding);
  if (shielding) items.push(`Shielding: ${shielding}`);
  const tests = Array.isArray(details.testing_requirements) ? details.testing_requirements : [];
  tests.slice(0, 3).forEach((item) => {
    const label = item.name || item.value || item.requirement || item.label;
    if (label) items.push(`Test: ${label}`);
  });
  return [...new Set(items)].slice(0, 8);
}

function draftStatusTitle(status, requestStatus) {
  const copy = {
    not_harness_related: "Needs harness-related information",
    needs_harness_context: "Waiting for connection details",
    needs_key_clarification: "A few details needed",
    ready_for_easy_harness_review: "Ready for Easy Harness review",
    closed_for_easy_harness_review: "In review",
  };
  return copy[status] || statusCopy[requestStatus] || "Request received";
}

function draftStatusTone(status) {
  if (
    status === "ready_for_easy_harness_review" ||
    status === "closed_for_easy_harness_review"
  )
    return "ready";
  if (status === "not_harness_related" || status === "needs_harness_context")
    return "waiting";
  return "needs-details";
}

function unknownItemLabel(item) {
  if (typeof item === "string") return formatMissingInfoItem(item);
  return formatMissingInfoItem(
    item?.question || item?.field || item?.reason || "Review item",
  );
}

function detailValueLabel(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object")
    return value.value && value.value !== "unknown" ? value.value : "";
  return String(value);
}

function knownRequirementItems(knownRequirements = {}) {
  return Object.entries(knownRequirements)
    .map(([key, value]) => {
      const label = detailValueLabel(value);
      if (!label) return null;
      return `${key.replaceAll("_", " ")}: ${label}`;
    })
    .filter(Boolean)
    .slice(0, 6);
}

function unknownsByOwner(draft) {
  const unknowns = draft?.unknowns || {};
  return [
    ["Ask user now", unknowns.ask_user_now || []],
    ["Ask if known", unknowns.ask_user_if_likely_known || []],
    ["Easy Harness review", unknowns.easy_harness_review || []],
    [
      "Later engineering",
      unknowns.later_supplier_or_engineering_confirmation || [],
    ],
    ["Not applicable", unknowns.not_applicable || []],
  ].map(([label, items]) => [
    label,
    (Array.isArray(items) ? items : []).filter((item) => !isPlaceholderUnknown(unknownItemLabel(item))),
  ]).filter(([, items]) => Array.isArray(items) && items.length);
}

function IntakeDraftCard({ checkResult, request }) {
  const hasDraft = Boolean(
    isCompleteDraftV01(checkResult) ||
    checkResult?.adapter === "ai-intake-agent-v1" ||
    checkResult?.adapter === "deepseek-intake-agent-v1" ||
    checkResult?.factory_draft ||
    checkResult?.customer_summary ||
    checkResult?.confirmed_facts?.length ||
    checkResult?.questions?.length ||
    checkResult?.questions_for_user?.length ||
    checkResult?.missing?.length ||
    checkResult?.missing_information?.length,
  );

  if (!hasDraft) {
    return (
      <div className="side-card request-summary-card quiet">
        <span className="summary-kicker">Current step</span>
        <h2>{statusCopy[request.status] || "Request received"}</h2>
        <p>
          Easy Harness will show the next step here after the intake check finishes.
        </p>
      </div>
    );
  }

  const draft = normalizeDraftForView(checkResult, request);
  const status = draft.draft_meta?.draft_status || "needs_key_clarification";
  const summary = draft.user_facing_summary || {};
  const requestLine =
    summary.request_line ||
    draft.user_intent?.connection_goal ||
    draft.ai_interpretation?.short_understanding ||
    "Harness request";
  const compactDetails = summary.compact_details || [];
  const neededNext = userNeededNextItems(draft);
  const reviewItems = easyHarnessReviewItems(draft);
  const evidence = draft.provided_evidence || [];
  const userAction = neededNext.length
    ? "Please reply with the key detail below so Easy Harness can continue."
    : isReadyDraftStatus(status)
      ? "No action needed right now. You can still add corrections in the thread."
      : "Easy Harness is organizing the request. Add any missing connection details if you have them.";

  return (
    <div
      className={`side-card request-summary-card draft-status-${draftStatusTone(status)}`}
    >
      <span className="summary-kicker">Current step</span>
      <h2>{draftStatusTitle(status, request.status)}</h2>
      <p className="summary-next-action">{userAction}</p>

      <div className="summary-section compact-meta">
        <span>Request</span>
        <strong>{requestLine}</strong>
        {!!compactDetails.length && (
          <div className="summary-chips">
            {compactDetails.slice(0, 4).map((item) => (
              <em key={item}>{item}</em>
            ))}
          </div>
        )}
      </div>

      {!!neededNext.length && (
        <div className="summary-section warning">
          <span>Your reply needed</span>
          <ul>
            {neededNext.map((item) => (
              <li key={item}>{formatMissingInfoItem(item)}</li>
            ))}
          </ul>
        </div>
      )}

      {!!reviewItems.length && (
        <div className="summary-section review-items">
          <span>Easy Harness will review</span>
          <ul>
            {reviewItems.slice(0, 4).map((item) => (
              <li key={item}>{formatMissingInfoItem(item)}</li>
            ))}
          </ul>
        </div>
      )}

      {!!evidence.length && (
        <div className="summary-section">
          <span>Files received</span>
          <ul>
            {evidence.slice(0, 3).map((item, index) => (
              <li key={`${item.filename || item.type}-${index}`}>
                {item.filename || item.content_summary || item.type}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RequestSidePanel({
  request,
  confirmRequest,
  openOrder,
  openPolicy,
  linkedOrder,
}) {
  const ready = request.status === "ready_to_confirm";
  const confirmed = request.status === "confirmed";
  const paid = request.status === "paid";
  const hasOrder = confirmed || paid || linkedOrder;
  const quote = activeQuoteForRequest(request);
  const showPriceCard = Boolean(request.price || ready || hasOrder || quote);

  return (
    <aside className="request-side-panel">
      <IntakeDraftCard checkResult={request.checkResult} request={request} />
      {showPriceCard && (
        <div className="side-card price-card compact-price-card">
          <div className="price-header">
            <span>Harness price</span>
            {request.price ? (
              <CircleDollarSign size={19} />
            ) : (
              <Clock3 size={19} />
            )}
          </div>
          <div className={`price-value ${request.price ? "ready" : ""}`}>
            {request.price ? `$${request.price}` : "In review"}
          </div>
          <p>
            {request.price
              ? "This confirms the current harness request and price. Payment and delivery details are completed on the order page."
              : "The price appears after Easy Harness review."}
          </p>
          {quote && (
            <div className="quote-basis">
              <span>Quote v{quote.version}</span>
              <p>
                Harness assembly only. Shipping and import charges are handled
                on the order page.
              </p>
              <small>Valid until {quote.validUntil}</small>
            </div>
          )}
          {ready && (
            <p className="quote-terms-note">
              By confirming, you accept the{" "}
              <InlinePolicyLink
                openPolicy={openPolicy}
                policyId="custom-orders"
              >
                custom order terms
              </InlinePolicyLink>
              .
            </p>
          )}
          <button
            className="pay-button"
            disabled={!ready && !hasOrder}
            onClick={() => {
              if (linkedOrder) {
                openOrder(linkedOrder.id);
                return;
              }
              confirmRequest();
            }}
          >
            {ready || hasOrder ? <Check size={17} /> : <Lock size={17} />}
            {linkedOrder
              ? "Open order"
              : ready
                ? "Confirm quote and create order"
                : "Quote not ready"}
          </button>
        </div>
      )}
    </aside>
  );
}

function OrderWorkspace({
  order,
  request,
  updateOrder,
  startPayment,
  sendOrderMessage,
  openPolicy,
}) {
  const shipping = selectedShipping(order);
  const completeAddress = isAddressComplete(order.address);
  const total = orderTotal(order);
  const isPaid = order.paymentStatus === "paid";
  const transferPending = order.paymentStatus === "bank_transfer_pending";
  const marketplacePending =
    order.paymentStatus === "payment_pending" &&
    order.paymentMethodId === "marketplace_protected";
  const providerPending =
    order.paymentStatus === "payment_pending" && !marketplacePending;
  const paymentInProgress = transferPending || providerPending || marketplacePending;
  const checkoutLocked = isPaid || paymentInProgress;
  const canPay = completeAddress && shipping && !isPaid && !paymentInProgress;
  const [showBusinessFields, setShowBusinessFields] = useState(
    Boolean(order.address.company || order.address.taxId),
  );

  useEffect(() => {
    if (order.address.company || order.address.taxId) {
      setShowBusinessFields(true);
    }
  }, [order.id, order.address.company, order.address.taxId]);

  if (isPaid) {
    return (
      <PaidOrderStatusView
        order={order}
        request={request}
        sendOrderMessage={sendOrderMessage}
        openPolicy={openPolicy}
      />
    );
  }

  const updateAddress = (field, value) => {
    if (checkoutLocked) return;
    updateOrder((current) => ({
      ...current,
      address: {
        ...current.address,
        [field]: value,
      },
      updated: "Just now",
    }));
  };

  const chooseShipping = (shippingId) => {
    if (checkoutLocked) return;
    updateOrder((current) => ({
      ...current,
      selectedShippingId: shippingId,
      updated: "Just now",
    }));
  };

  return (
    <section className="order-workspace">
      <div className="order-layout">
        <main className="order-main">
          <header className="order-header">
            <div className="thread-title">
              <div>
                <span className="eyebrow">Order</span>
                <h1>{isPaid ? "Order details" : "Order in preparation"}</h1>
                <p>
                  {order.id} from {order.requestId}. Review the confirmed
                  harness quote, delivery basis, and payment path.
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>
          </header>

          <section className="order-card">
            <div className="order-section-title">
              <ReceiptText size={18} />
              <h2>Order item</h2>
            </div>
            <div className="checkout-item">
              <div className="checkout-item-icon">
                <Cable size={22} />
              </div>
              <div>
                <strong>{order.title}</strong>
                <p>{order.snapshot.customerSummary}</p>
                {!!order.snapshot.requestFiles.length && (
                  <div className="file-strip compact">
                    {order.snapshot.requestFiles.map((file) => (
                      <FileChip file={file} key={file} />
                    ))}
                  </div>
                )}
              </div>
              <strong>${order.harnessPrice}</strong>
            </div>
            {!!order.snapshot.latestEasyBlocks.length && (
              <div className="order-snapshot-reply">
                <span className="eyebrow">Confirmed Easy Harness update</span>
                {order.snapshot.latestEasyBlocks.map((block, index) => (
                  <ContentBlock
                    block={block}
                    request={request || { status: order.status }}
                    key={`${order.id}-snapshot-${index}`}
                  />
                ))}
              </div>
            )}
          </section>

          {marketplacePending && !marketplacePaymentDetails(order).checkoutUrl && (
            <MarketplaceWaitCard order={order} />
          )}

          <section className="order-card">
            <div className="order-section-title">
              <MapPin size={18} />
              <h2>Delivery information</h2>
            </div>
            {checkoutLocked && (
              <CheckoutLockedNotice
                marketplace={marketplacePending}
                provider={marketplacePaymentDetails(order).provider}
              />
            )}
            <div className="order-form-grid">
              <label className="field wide">
                <span>Email</span>
                <input
                  value={order.address.email}
                  onChange={(event) =>
                    updateAddress("email", event.target.value)
                  }
                  placeholder="email@example.com"
                  disabled={checkoutLocked}
                />
              </label>
              <label className="field">
                <span>Recipient</span>
                <input
                  value={order.address.name}
                  onChange={(event) =>
                    updateAddress("name", event.target.value)
                  }
                  placeholder="Full name"
                  disabled={checkoutLocked}
                />
              </label>
              <label className="field">
                <span>Country / region</span>
                <select
                  value={order.address.country}
                  onChange={(event) =>
                    updateAddress("country", event.target.value)
                  }
                  disabled={checkoutLocked}
                >
                  <option value="">Select country</option>
                  {checkoutCountries.map((country) => (
                    <option value={country} key={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field wide">
                <span>Address line 1</span>
                <input
                  value={order.address.line1}
                  onChange={(event) =>
                    updateAddress("line1", event.target.value)
                  }
                  placeholder="Street address"
                  disabled={checkoutLocked}
                />
              </label>
              <label className="field wide">
                <span>Address line 2</span>
                <input
                  value={order.address.line2 || ""}
                  onChange={(event) =>
                    updateAddress("line2", event.target.value)
                  }
                  placeholder="Apartment, suite, building, floor"
                  disabled={checkoutLocked}
                />
              </label>
              <label className="field">
                <span>City</span>
                <input
                  value={order.address.city}
                  onChange={(event) =>
                    updateAddress("city", event.target.value)
                  }
                  placeholder="City"
                  disabled={checkoutLocked}
                />
              </label>
              <label className="field">
                <span>State / region</span>
                <input
                  value={order.address.region}
                  onChange={(event) =>
                    updateAddress("region", event.target.value)
                  }
                  placeholder="State or region"
                  disabled={checkoutLocked}
                />
              </label>
              <label className="field">
                <span>Postal code</span>
                <input
                  value={order.address.postalCode}
                  onChange={(event) =>
                    updateAddress("postalCode", event.target.value)
                  }
                  placeholder="Postal code"
                  disabled={checkoutLocked}
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  value={order.address.phone}
                  onChange={(event) =>
                    updateAddress("phone", event.target.value)
                  }
                  placeholder="Phone number"
                  disabled={checkoutLocked}
                />
              </label>
              <div className="business-toggle-row wide">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => setShowBusinessFields((current) => !current)}
                  disabled={checkoutLocked}
                >
                  {showBusinessFields
                    ? "Hide business import details"
                    : "Add business import details"}
                </button>
                <span>
                  Only needed if the carrier or customs asks for a company or
                  tax number.
                </span>
              </div>
              {showBusinessFields && (
                <>
                  <label className="field">
                    <span>Company (optional)</span>
                    <input
                      value={order.address.company}
                      onChange={(event) =>
                        updateAddress("company", event.target.value)
                      }
                      placeholder="Company name"
                      disabled={checkoutLocked}
                    />
                  </label>
                  <label className="field">
                    <span>Tax ID (optional)</span>
                    <input
                      value={order.address.taxId || ""}
                      onChange={(event) =>
                        updateAddress("taxId", event.target.value)
                      }
                      placeholder="VAT, EORI, or local tax number"
                      disabled={checkoutLocked}
                    />
                  </label>
                </>
              )}
            </div>
          </section>

          <section className="order-card">
            <div className="order-section-title">
              <Truck size={18} />
              <h2>Estimated shipping option</h2>
            </div>
            <div className="origin-row">
              <span>
                Ships from {order.origin.city}, {order.origin.country}
              </span>
              <span>
                Estimated package: {order.packageEstimate.weightKg} kg,{" "}
                {order.packageEstimate.lengthCm} x{" "}
                {order.packageEstimate.widthCm} x{" "}
                {order.packageEstimate.heightCm} cm
              </span>
            </div>
            <div className="shipping-options">
              {order.shippingOptions.map((option) => (
                <button
                  className={`shipping-option ${option.id === order.selectedShippingId ? "active" : ""}`}
                  key={option.id}
                  onClick={() => chooseShipping(option.id)}
                  disabled={checkoutLocked}
                >
                  <span className="radio-dot" aria-hidden="true" />
                  <span>
                    <strong>{option.level}</strong>
                    <small>
                      {option.carrier} - {option.service}
                    </small>
                    <small>{option.source}</small>
                  </span>
                  <span>
                    <strong>${option.price}</strong>
                    <small>{option.days}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="duties-note">
              <strong>Import duties and taxes are handled on delivery</strong>
              <p>
                Ships under DAP from Shenzhen, China. Customs, VAT, duties, or
                carrier brokerage may be collected by the carrier or local
                authority before delivery. Easy Harness will keep the shipping
                option clear before payment.{" "}
                <InlinePolicyLink openPolicy={openPolicy} policyId="shipping">
                  Shipping terms
                </InlinePolicyLink>
              </p>
            </div>
          </section>

          <section className="order-card">
            <div className="order-section-title">
              <CheckCircle2 size={18} />
              <h2>What payment will confirm</h2>
            </div>
            <div className="confirmation-points">
              <span>Harness quote and latest Easy Harness update</span>
              <span>Delivery address and selected shipping option</span>
              <span>DAP import-duty and tax boundary</span>
            </div>
            <p className="compact-policy-copy">
              Production starts after provider or bank-transfer confirmation.
              Completing payment means the confirmed quote, delivery address,
              shipping option, and{" "}
              <InlinePolicyLink
                openPolicy={openPolicy}
                policyId="custom-orders"
              >
                custom order terms
              </InlinePolicyLink>{" "}
              are accepted.
            </p>
          </section>

          <section className="order-card">
            <div className="order-section-title">
              <PackageCheck size={18} />
              <h2>After-sales support</h2>
            </div>
            <div className="policy-list compact-policy-list">
              <p>
                Custom-made harnesses are covered for confirmed Easy Harness
                production faults, verified quality issues, or mismatch with
                the confirmed order basis. Change or cancellation requests are
                available before production starts.{" "}
                <InlinePolicyLink
                  openPolicy={openPolicy}
                  policyId="after-sales"
                >
                  After-sales policy
                </InlinePolicyLink>
              </p>
              <p>
                After delivery, report defects, wrong assembly, or shipping
                damage with photos or video in the order message area. Visible
                issues should normally be reported within 14 days; quality
                disputes should normally include evidence within 30 days.
              </p>
            </div>
          </section>

          <OrderMessagePanel
            order={order}
            sendOrderMessage={sendOrderMessage}
            title="Order questions"
            prompt="Ask about address, payment, or order timing..."
          />
        </main>

        <aside className="order-side">
          <div className="side-card price-card">
            <div className="price-header">
              <span>Order summary</span>
              <CircleDollarSign size={19} />
            </div>
            <div className="summary-product">
              <span className="summary-status">Order in preparation</span>
              <strong>{order.title}</strong>
              <small>
                Add delivery details and choose a payment method when everything
                looks correct.
              </small>
              <small>Production lead time: {order.productionLeadTime}</small>
              <small>
                Estimated completion: {order.estimatedProductionComplete}
              </small>
            </div>
            <PriceLine label="Harness" value={order.harnessPrice} />
            <PriceLine
              label={shipping ? `${shipping.level} shipping` : "Shipping"}
              value={shipping?.price || 0}
            />
            <PriceLine
              label="Import duties / taxes"
              value="Not collected"
              muted
            />
            <div className="total-line">
              <span>Total due</span>
              <strong>${total}</strong>
            </div>
            {isPaid ? (
              <div className="payment-state paid-state">
                <BadgeCheck size={18} />
                <div>
                  <strong>Payment received</strong>
                  <span>
                    {order.paymentProvider || "Payment provider"} -{" "}
                    {order.paidAt || "Confirmed"}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {transferPending && <BankTransferInstructions order={order} />}
                {marketplacePending && (
                  <MarketplacePaymentState order={order} />
                )}
                {providerPending && (
                  <div className="payment-state">
                    <Clock3 size={18} />
                    <div>
                      <strong>Payment session open</strong>
                      <span>
                        Complete the hosted {order.paymentProvider} checkout to
                        continue.
                      </span>
                    </div>
                  </div>
                )}
                <div className="payment-actions">
                  {paymentMethods.map((method) => (
                    <PaymentMethodButton
                      method={method}
                      disabled={!canPay}
                      key={method.id}
                      onClick={() => startPayment(method.id)}
                    />
                  ))}
                </div>
              </>
            )}
            <p className="checkout-note">
              {completeAddress
                ? "Choose a payment method after the request, address, shipping method, and import-tax boundary look correct."
                : "Add a complete delivery address before choosing a payment method."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function isAddressComplete(address) {
  return Boolean(
    address.name &&
    address.email &&
    address.line1 &&
    address.city &&
    address.country &&
    address.postalCode,
  );
}

function OrderMessagePanel({
  order,
  sendOrderMessage,
  authorRole = "customer",
  title = "Order messages",
  prompt = "Ask Easy Harness about this order...",
}) {
  const [draft, setDraft] = useState("");
  const messages = order.supportMessages || [];

  const submit = () => {
    sendOrderMessage(order.id, draft, authorRole);
    setDraft("");
  };

  return (
    <section className="order-card order-message-card">
      <div className="order-section-title">
        <MessageCircle size={18} />
        <h2>{title}</h2>
      </div>
      <div className="order-message-list">
        {messages.length ? (
          messages.map((message) => (
            <div
              className={`order-message ${message.authorRole}`}
              key={message.id}
            >
              <strong>
                {message.authorRole === "customer" ? "You" : "Easy Harness"}
              </strong>
              <p>{message.body}</p>
              <small>{message.createdAt}</small>
            </div>
          ))
        ) : (
          <div className="empty-state compact">
            <p>Messages about this order will appear here.</p>
          </div>
        )}
      </div>
      <div className="order-message-composer">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder={prompt}
        />
        <button
          className="send-button small"
          type="button"
          onClick={submit}
          aria-label="Send order message"
        >
          <Send size={17} />
        </button>
      </div>
    </section>
  );
}

function PaidOrderStatusView({ order, request, sendOrderMessage, openPolicy }) {
  const shipping = selectedShipping(order);
  const total = orderTotal(order);
  const production = productionStatusInfo(order);
  const logistics = logisticsStatusInfo(order);
  const addressLines = formatAddressLines(order.address);

  return (
    <section className="order-workspace">
      <div className="order-layout status-layout">
        <main className="order-main">
          <header className="order-header">
            <div className="thread-title">
              <div>
                <span className="eyebrow">Order status</span>
                <h1>{order.id}</h1>
                <p>{order.title}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>
          </header>

          <section className="order-card status-hero">
            <div>
              <span className="eyebrow">Current status</span>
              <h2>{production.title}</h2>
              <p>{production.body}</p>
            </div>
            <div className="status-hero-meta">
              <span>Estimated completion</span>
              <strong>{order.estimatedProductionComplete}</strong>
            </div>
          </section>

          <section className="order-card">
            <div className="order-section-title">
              <PackageCheck size={18} />
              <h2>Production</h2>
            </div>
            <div className="production-stage-grid">
              {productionStages().map((stage) => {
                const state = productionStageState(order.status, stage.id);
                return (
                  <div className={`production-stage ${state}`} key={stage.id}>
                    <span>{state === "done" ? <Check size={13} /> : null}</span>
                    <div>
                      <strong>{stage.label}</strong>
                      <small>{stage.detail}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="order-card">
            <div className="order-section-title">
              <Truck size={18} />
              <h2>Shipping and tracking</h2>
            </div>
            <div className="tracking-summary">
              <div>
                <span className="eyebrow">Shipping method</span>
                <strong>
                  {shipping
                    ? `${shipping.level} - ${shipping.carrier}`
                    : "Not selected"}
                </strong>
                <p>
                  {shipping
                    ? `${shipping.service}, ${shipping.days}`
                    : "Shipping service will appear here."}
                </p>
              </div>
              <div>
                <span className="eyebrow">Tracking</span>
                <strong>{order.trackingNumber || logistics.title}</strong>
                <p>
                  {order.trackingNumber
                    ? logistics.body
                    : "Tracking number appears after handoff to carrier."}
                </p>
              </div>
            </div>
            {order.trackingNumber && (
              <div className="tracking-link-row">
                <span>
                  {order.trackingSource === "api"
                    ? "API tracking linked"
                    : "Manual carrier link"}
                </span>
                {order.carrierTrackingUrl ? (
                  <a
                    href={order.carrierTrackingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open carrier tracking
                  </a>
                ) : (
                  <span>Carrier link pending</span>
                )}
              </div>
            )}
            <TrackingTimeline order={order} />
          </section>

          <section className="order-card">
            <div className="order-section-title">
              <ReceiptText size={18} />
              <h2>Confirmed order</h2>
            </div>
            <div className="checkout-item confirmed-item">
              <div className="checkout-item-icon">
                <Cable size={22} />
              </div>
              <div>
                <strong>{order.title}</strong>
                <p>{order.snapshot.customerSummary}</p>
                {!!order.snapshot.requestFiles.length && (
                  <div className="file-strip compact">
                    {order.snapshot.requestFiles.map((file) => (
                      <FileChip file={file} key={file} />
                    ))}
                  </div>
                )}
              </div>
              <strong>${order.harnessPrice}</strong>
            </div>
            {!!order.snapshot.latestEasyBlocks.length && (
              <div className="order-snapshot-reply">
                <span className="eyebrow">Confirmed Easy Harness update</span>
                {order.snapshot.latestEasyBlocks.map((block, index) => (
                  <ContentBlock
                    block={block}
                    request={request || { status: order.status }}
                    key={`${order.id}-paid-snapshot-${index}`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="order-card">
            <div className="order-section-title">
              <MapPin size={18} />
              <h2>Delivery details</h2>
            </div>
            <div className="readout-grid">
              <Readout label="Recipient" value={order.address.name} />
              <Readout label="Email" value={order.address.email} />
              <Readout
                label="Phone"
                value={order.address.phone || "Not provided"}
              />
              <Readout label="Address" value={addressLines.join(", ")} wide />
              {order.address.company && (
                <Readout label="Company" value={order.address.company} />
              )}
              {order.address.taxId && (
                <Readout label="Import tax ID" value={order.address.taxId} />
              )}
              <Readout label="Incoterm" value={order.incoterm} />
            </div>
            <p className="compact-policy-copy">
              Delivery follows the{" "}
              <InlinePolicyLink openPolicy={openPolicy} policyId="shipping">
                shipping and import-duty terms
              </InlinePolicyLink>
              .
            </p>
          </section>

          <OrderMessagePanel
            order={order}
            sendOrderMessage={sendOrderMessage}
            title="Order messages"
            prompt="Ask about production, tracking, or after-sales..."
          />
        </main>

        <aside className="order-side">
          <div className="side-card price-card">
            <div className="price-header">
              <span>Order summary</span>
              <CircleDollarSign size={19} />
            </div>
            <div className="summary-product">
              <strong>{order.title}</strong>
              <small>
                Paid by {order.paymentProvider || "payment provider"}
              </small>
              <small>{order.paidAt || "Payment confirmed"}</small>
            </div>
            <PriceLine label="Harness" value={order.harnessPrice} />
            <PriceLine
              label={shipping ? `${shipping.level} shipping` : "Shipping"}
              value={shipping?.price || 0}
            />
            <PriceLine
              label="Import duties / taxes"
              value="Not collected"
              muted
            />
            <div className="total-line">
              <span>Paid total</span>
              <strong>${total}</strong>
            </div>
            <div className="payment-state paid-state">
              <BadgeCheck size={18} />
              <div>
                <strong>Payment received</strong>
                <span>{order.paymentReference || order.id}</span>
              </div>
            </div>
          </div>

          <div className="side-card">
            <h2>Need help?</h2>
            <p className="checkout-note">
              Use this order ID when contacting Easy Harness about address
              changes, production timing, or delivery support.
            </p>
            <p className="checkout-note">
              Order messages stay available for after-sales questions. Easy
              Harness may share email or WhatsApp details when direct follow-up
              is faster.
            </p>
            <a
              className="secondary-action support-link"
              href={`mailto:support@easyharness.com?subject=${encodeURIComponent(order.id)}`}
            >
              Contact support
            </a>
            <button
              className="text-button left"
              type="button"
              onClick={() => openPolicy?.("after-sales")}
            >
              View after-sales policy
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Readout({ label, value, wide = false }) {
  return (
    <div className={`readout ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function productionStages() {
  return [
    {
      id: "scheduled",
      label: "Scheduled",
      detail: "Order is queued for production.",
    },
    {
      id: "in_production",
      label: "In production",
      detail: "Harness assembly is underway.",
    },
    {
      id: "ready_to_ship",
      label: "Ready to ship",
      detail: "Production is complete and waiting for carrier handoff.",
    },
  ];
}

function productionStatusInfo(order) {
  if (order.status === "delivered") {
    return {
      title: "Delivered",
      body: "The shipment has been delivered.",
    };
  }
  if (order.status === "shipped") {
    return {
      title: "Handed to carrier",
      body: "Production is complete. Follow the carrier tracking updates below.",
    };
  }
  if (order.status === "ready_to_ship") {
    return {
      title: "Ready to ship",
      body: "The harness is finished and waiting for carrier handoff.",
    };
  }
  if (order.status === "in_production") {
    return {
      title: "In production",
      body: "Your harness is being made according to the confirmed request.",
    };
  }
  return {
    title: "Scheduled",
    body: "Payment has been received and the order is queued for production.",
  };
}

function productionStageState(status, stageId) {
  const order = [
    "scheduled",
    "in_production",
    "ready_to_ship",
    "shipped",
    "delivered",
  ];
  const stageOrder = ["scheduled", "in_production", "ready_to_ship"];
  const statusIndex = order.indexOf(status);
  const stageIndex = stageOrder.indexOf(stageId);
  if (
    statusIndex > stageIndex ||
    status === "shipped" ||
    status === "delivered"
  )
    return "done";
  if (
    statusIndex === stageIndex ||
    (statusIndex < 0 && stageId === "scheduled")
  )
    return "current";
  return "pending";
}

function logisticsStatusInfo(order) {
  if (order.status === "delivered") {
    return {
      title: "Delivered",
      body: "Carrier delivery is complete.",
    };
  }
  if (order.status === "shipped") {
    return {
      title: "In transit",
      body: "The shipment is with the carrier.",
    };
  }
  return {
    title: "Not shipped yet",
    body: "Tracking will start after carrier handoff.",
  };
}

function trackingEventsForOrder(order) {
  if (order.trackingEvents?.length) return order.trackingEvents;
  if (order.status === "delivered") {
    return [
      {
        status: "Delivered",
        time: "Latest",
        detail: "Shipment delivered by carrier.",
      },
      {
        status: "In transit",
        time: "Earlier",
        detail: "Shipment moved through the carrier network.",
      },
      {
        status: "Label created",
        time: "Earlier",
        detail: "Tracking number was created.",
      },
    ];
  }
  if (order.status === "shipped") {
    return [
      {
        status: "In transit",
        time: "Latest",
        detail: "Carrier tracking is active.",
      },
      {
        status: "Label created",
        time: "Earlier",
        detail: "Tracking number was created.",
      },
    ];
  }
  return [
    {
      status: "Awaiting carrier handoff",
      time: "Pending",
      detail: "Carrier tracking will appear after the order ships.",
    },
  ];
}

function TrackingTimeline({ order }) {
  const events = trackingEventsForOrder(order);
  return (
    <div className="tracking-timeline">
      {events.map((event, index) => (
        <div className="tracking-event" key={`${event.status}-${index}`}>
          <span className="tracking-dot" />
          <div>
            <strong>{event.status}</strong>
            <p>{event.detail}</p>
          </div>
          <time>{event.time}</time>
        </div>
      ))}
    </div>
  );
}

function formatAddressLines(address) {
  return [
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ].filter(Boolean);
}

function PriceLine({ label, value, muted = false }) {
  return (
    <div className={`price-line ${muted ? "muted" : ""}`}>
      <span>{label}</span>
      <strong>{typeof value === "number" ? `$${value}` : value}</strong>
    </div>
  );
}

function PaymentMethodButton({ method, disabled, onClick }) {
  const Icon =
    method.id === "bank_transfer"
      ? ReceiptText
      : method.id === "marketplace_protected"
        ? ShieldCheck
      : method.id === "paypal"
        ? CircleDollarSign
        : CreditCard;

  return (
    <button
      className={`payment-method-button ${method.id}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon size={17} />
      <span>
        <strong>{method.label}</strong>
        <small>{method.detail}</small>
      </span>
    </button>
  );
}

function BankTransferInstructions({ order }) {
  return (
    <div className="bank-instructions">
      <strong>Bank transfer reference created</strong>
      <div className="bank-row">
        <span>Beneficiary</span>
        <b>{bankTransferDetails.beneficiary}</b>
      </div>
      <div className="bank-row">
        <span>Currency</span>
        <b>{bankTransferDetails.currency}</b>
      </div>
      <div className="bank-row">
        <span>Reference</span>
        <b>{order.paymentReference || order.bankTransferReference}</b>
      </div>
      <p>
        {bankTransferDetails.memo} {bankTransferDetails.note}
      </p>
    </div>
  );
}

function CheckoutLockedNotice({ marketplace = false, provider = "" }) {
  return (
    <div className="checkout-locked-notice">
      <Lock size={15} />
      <p>
        {marketplace
          ? `Delivery details and shipping are locked while Easy Harness prepares the ${provider || "marketplace"} checkout link. If something needs to change, message Easy Harness in this order.`
          : "Delivery details and shipping are locked while payment is in progress. If something needs to change, message Easy Harness in this order."}
      </p>
    </div>
  );
}

function MarketplaceWaitCard({ order }) {
  const payment = marketplacePaymentDetails(order);

  return (
    <section className="order-card marketplace-wait-card">
      <div className="order-section-title">
        <ShieldCheck size={18} />
        <h2>Protected checkout link requested</h2>
      </div>
      <p>
        Easy Harness is preparing a matching {payment.provider} checkout for
        this confirmed order. This may take a little time because the
        marketplace order must match your harness quote and delivery basis.
      </p>
      <div className="marketplace-next-steps">
        <span>When ready, the button will appear in the order summary.</span>
        <span>Easy Harness will also post an update in the order messages.</span>
        <span>You can leave this page and return to this order later.</span>
      </div>
    </section>
  );
}

function MarketplacePaymentState({ order }) {
  const payment = marketplacePaymentDetails(order);
  const hasLink = Boolean(payment.checkoutUrl);

  return (
    <div className="marketplace-payment-state">
      <div className="payment-state">
        <ShieldCheck size={18} />
        <div>
          <strong>
            {hasLink
              ? "Protected marketplace checkout ready"
              : "Protected marketplace checkout requested"}
          </strong>
          <span>
            {hasLink
              ? `Open the ${payment.provider} checkout only if it matches this Easy Harness order.`
              : "Easy Harness is preparing a matching protected checkout link. You can return to this order later."}
          </span>
        </div>
      </div>
      {hasLink ? (
        <a
          className="secondary-action marketplace-checkout-link"
          href={payment.checkoutUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open protected checkout <ArrowRight size={15} />
        </a>
      ) : null}
      {payment.reference ? (
        <div className="bank-row">
          <span>Marketplace reference</span>
          <b>{payment.reference}</b>
        </div>
      ) : null}
      {payment.note ? <p>{payment.note}</p> : null}
    </div>
  );
}

function OrderProgress({ status, vertical = false }) {
  const indexByStatus = {
    checkout: 0,
    awaiting_bank_transfer: 0,
    paid: 1,
    scheduled: 1,
    in_production: 2,
    qc: 3,
    ready_to_ship: 4,
    shipped: 4,
    delivered: 5,
  };
  const currentIndex = indexByStatus[status] ?? 0;
  return (
    <div
      className={`mini-progress order-progress ${vertical ? "vertical" : ""}`}
      aria-label="Order progress"
    >
      {productionSteps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <div
            className={`mini-step ${done ? "done" : ""} ${current ? "current" : ""}`}
            key={step}
          >
            <span>{done ? <Check size={11} /> : null}</span>
            <strong>{step}</strong>
          </div>
        );
      })}
    </div>
  );
}

function AdminApp({
  users,
  requests,
  orders,
  attachmentRecords,
  serviceEvents,
  auditLogs,
  backendTableRows,
  currentUser,
  signOut,
  updateUser,
  inviteUser,
}) {
  const [adminView, setAdminView] = useState("dashboard");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("customer");

  const counts = {
    customers: users.filter((user) => user.role === "customer").length,
    staff: users.filter((user) => user.role === "staff").length,
    admins: users.filter((user) => user.role === "admin").length,
    active: users.filter((user) => user.status === "active").length,
  };

  const submitInvite = () => {
    inviteUser({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
    });
    setInviteName("");
    setInviteEmail("");
    setInviteRole("customer");
  };

  const openUserRequests = (userId) => {
    setSelectedUserId(userId);
    setAdminView("requests");
  };

  return (
    <div className="admin-shell">
      <aside className="staff-sidebar">
        <div className="staff-logo">
          <Cable size={22} />
          <span>Easy Harness Admin</span>
        </div>
        <button
          className={`staff-nav ${adminView === "dashboard" ? "active" : ""}`}
          onClick={() => setAdminView("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`staff-nav ${adminView === "users" ? "active" : ""}`}
          onClick={() => setAdminView("users")}
        >
          Users
        </button>
        <button
          className={`staff-nav ${adminView === "roles" ? "active" : ""}`}
          onClick={() => setAdminView("roles")}
        >
          Roles
        </button>
        <button
          className={`staff-nav ${adminView === "requests" ? "active" : ""}`}
          onClick={() => {
            setSelectedUserId("all");
            setAdminView("requests");
          }}
        >
          Requests
        </button>
        <button
          className={`staff-nav ${adminView === "orders" ? "active" : ""}`}
          onClick={() => setAdminView("orders")}
        >
          Orders
        </button>
        <button
          className={`staff-nav ${adminView === "audit" ? "active" : ""}`}
          onClick={() => setAdminView("audit")}
        >
          Audit log
        </button>
        <button
          className={`staff-nav ${adminView === "data" ? "active" : ""}`}
          onClick={() => setAdminView("data")}
        >
          Data model
        </button>
      </aside>

      <main className="admin-main">
        <header className="staff-header">
          <div>
            <span className="eyebrow">Admin console</span>
            <h1>{adminTitle(adminView)}</h1>
            <p>
              Review account access, request activity, order state, and service
              handoffs.
            </p>
          </div>
          <button className="drawer-close" onClick={signOut}>
            Sign out
          </button>
        </header>

        <section className="admin-stats">
          <StatCard label="Customers" value={counts.customers} />
          <StatCard label="Staff" value={counts.staff} />
          <StatCard label="Attachments" value={attachmentRecords.length} />
          <StatCard label="Service events" value={serviceEvents.length} />
        </section>

        {adminView === "dashboard" && (
          <AdminDashboardView
            users={users}
            requests={requests}
            orders={orders}
            auditLogs={auditLogs}
            serviceEvents={serviceEvents}
          />
        )}

        {adminView === "users" && (
          <AdminUsersView
            users={users}
            requests={requests}
            currentUser={currentUser}
            updateUser={updateUser}
            openUserRequests={openUserRequests}
            inviteName={inviteName}
            setInviteName={setInviteName}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
            submitInvite={submitInvite}
          />
        )}

        {adminView === "roles" && <AdminRolesView />}

        {adminView === "requests" && (
          <AdminRequestsView
            users={users}
            requests={requests}
            attachmentRecords={attachmentRecords}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
          />
        )}

        {adminView === "orders" && (
          <AdminOrdersView users={users} orders={orders} />
        )}

        {adminView === "audit" && (
          <AdminAuditView auditLogs={auditLogs} serviceEvents={serviceEvents} />
        )}

        {adminView === "data" && (
          <AdminDataModelView
            rows={backendTableRows}
            replacementRows={apiReplacementMap}
            schemaRows={databaseSchemaBlueprint}
          />
        )}
      </main>
    </div>
  );
}

function adminTitle(view) {
  if (view === "dashboard") return "Business dashboard";
  if (view === "roles") return "Roles and permissions";
  if (view === "requests") return "Request management";
  if (view === "orders") return "Order management";
  if (view === "audit") return "Audit log";
  if (view === "data") return "Data model";
  return "User management";
}

function AdminDashboardView({
  users,
  requests,
  orders,
  auditLogs,
  serviceEvents,
}) {
  const activeCustomers = users.filter(
    (user) => user.role === "customer" && user.status === "active",
  );
  const requestsNeedingWork = requests.filter((request) =>
    ["needs_info", "in_review"].includes(request.status),
  );
  const readyRequests = requests.filter(
    (request) => request.status === "ready_to_confirm",
  );
  const checkoutOrders = orders.filter(
    (order) => order.paymentStatus !== "paid",
  );
  const productionOrders = orders.filter(
    (order) =>
      order.paymentStatus === "paid" &&
      !["shipped", "delivered"].includes(order.status),
  );
  const shippedOrders = orders.filter((order) =>
    ["shipped", "delivered"].includes(order.status),
  );
  const attentionItems = [
    ...requestsNeedingWork.slice(0, 3).map((request) => ({
      id: request.id,
      title: request.title,
      body: requestNextAction(request),
      state: statusCopy[request.status],
    })),
    ...checkoutOrders.slice(0, 3).map((order) => ({
      id: order.id,
      title: order.title,
      body: orderNextAction(order),
      state:
        paymentStatusCopy[order.paymentStatus] || orderStatusCopy[order.status],
    })),
  ].slice(0, 5);

  return (
    <>
      <section className="admin-grid">
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Business overview</h2>
              <p>
                Operational counts for customer activity, quote readiness,
                checkout, and fulfillment.
              </p>
            </div>
          </div>
          <div className="business-metric-grid">
            <StatCard label="Active customers" value={activeCustomers.length} />
            <StatCard
              label="Requests to work"
              value={requestsNeedingWork.length}
            />
            <StatCard
              label="Awaiting confirmation"
              value={readyRequests.length}
            />
            <StatCard label="Checkout orders" value={checkoutOrders.length} />
            <StatCard label="In production" value={productionOrders.length} />
            <StatCard
              label="Shipped / delivered"
              value={shippedOrders.length}
            />
          </div>
        </div>

        <aside className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Needs attention</h2>
              <p>Where staff or admin should look first.</p>
            </div>
          </div>
          <div className="attention-list">
            {attentionItems.length ? (
              attentionItems.map((item) => (
                <div className="attention-row" key={item.id}>
                  <strong>{item.id}</strong>
                  <span>{item.title}</span>
                  <small>
                    {item.state} - {item.body}
                  </small>
                </div>
              ))
            ) : (
              <div className="empty-state compact">
                <p>No active request or checkout issues.</p>
              </div>
            )}
          </div>
          <div className="admin-dashboard-foot">
            <small>Latest audit records: {auditLogs.length}</small>
            <small>Latest service handoffs: {serviceEvents.length}</small>
          </div>
        </aside>
      </section>

      <section className="admin-card backend-readiness-card">
        <div className="admin-card-header">
          <div>
            <h2>Backend readiness</h2>
            <p>
              Stage 2A is prepared for Supabase, hosted payments, DHL Express,
              private storage, and provider callbacks.
            </p>
          </div>
        </div>
        <div className="stack-decision-grid">
          {backendStackDecision.map((item) => (
            <div className="stack-decision" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="readiness-table">
          <div className="readiness-row readiness-head">
            <span>Area</span>
            <span>Code state</span>
            <span>Waiting on</span>
          </div>
          {integrationReadinessRows.map((row) => (
            <div className="readiness-row" key={row.area}>
              <strong>{row.area}</strong>
              <span>{row.codeState}</span>
              <small>{row.waitingOn}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function AdminUsersView({
  users,
  requests,
  currentUser,
  updateUser,
  openUserRequests,
  inviteName,
  setInviteName,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  submitInvite,
}) {
  return (
    <section className="admin-grid">
      <div className="admin-card user-table-card">
        <div className="admin-card-header">
          <div>
            <h2>Accounts</h2>
            <p>
              Role and status here decide which product surface the user enters.
            </p>
          </div>
        </div>

        <div className="user-table">
          <div className="user-table-head">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Verified</span>
            <span>Requests</span>
          </div>
          {users.map((user) => {
            const requestCount = requests.filter(
              (request) => request.customerId === user.id,
            ).length;
            return (
              <div className="user-row" key={user.id}>
                <div className="user-cell-main">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </div>
                <select
                  value={user.role}
                  onChange={(event) =>
                    updateUser(
                      user.id,
                      { role: event.target.value },
                      "role_changed",
                    )
                  }
                >
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={user.status}
                  disabled={user.id === currentUser.id}
                  onChange={(event) =>
                    updateUser(
                      user.id,
                      { status: event.target.value },
                      "account_status_changed",
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="suspended">Suspended</option>
                </select>
                <span className={`verify-chip ${user.verified ? "yes" : ""}`}>
                  {user.verified ? "Verified" : "Pending"}
                </span>
                <button
                  className="table-link"
                  disabled={!requestCount}
                  onClick={() => openUserRequests(user.id)}
                >
                  {requestCount}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="admin-card invite-card">
        <h2>Invite user</h2>
        <label className="field">
          <span>Name</span>
          <input
            value={inviteName}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder="Customer or team member"
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="name@example.com"
          />
        </label>
        <label className="field">
          <span>Role</span>
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
          >
            <option value="customer">Customer</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button className="pay-button" onClick={submitInvite}>
          Create invited account
        </button>
        <p>Invited users appear here until they complete sign-in.</p>
      </aside>
    </section>
  );
}

function AdminRolesView() {
  return (
    <section className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2>Permission matrix</h2>
          <p>These rules decide what each workspace can view or change.</p>
        </div>
      </div>

      <div className="role-table">
        <div className="role-row role-head">
          <span>Area</span>
          <span>Customer</span>
          <span>Staff</span>
          <span>Admin</span>
        </div>
        {rolePermissions.map((permission) => (
          <div className="role-row" key={permission.area}>
            <strong>{permission.area}</strong>
            <span>{permission.customer}</span>
            <span>{permission.staff}</span>
            <span>{permission.admin}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminRequestsView({
  users,
  requests,
  attachmentRecords,
  selectedUserId,
  setSelectedUserId,
}) {
  const filteredRequests =
    selectedUserId === "all"
      ? requests
      : requests.filter((request) => request.customerId === selectedUserId);

  const userById = new Map(users.map((user) => [user.id, user]));

  return (
    <section className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2>All requests</h2>
          <p>Review request ownership, status, price, and recent activity.</p>
        </div>
        <label className="compact-filter">
          <span>Customer</span>
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            <option value="all">All customers</option>
            {users
              .filter((user) => user.role === "customer")
              .map((user) => (
                <option value={user.id} key={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="admin-request-list">
        {filteredRequests.map((request) => {
          const owner = userById.get(request.customerId);
          const attachmentCount = attachmentRecords.filter(
            (record) => record.requestId === request.id,
          ).length;
          return (
            <div className="admin-request-row" key={request.id}>
              <div>
                <strong>{request.id}</strong>
                <span>{request.title}</span>
              </div>
              <div>
                <small>Customer</small>
                <span>{owner?.name || request.customer}</span>
              </div>
              <StatusBadge status={request.status} />
              <div>
                <small>Price</small>
                <span>{request.price ? `$${request.price}` : "Not set"}</span>
              </div>
              <div>
                <small>Files</small>
                <span>{attachmentCount}</span>
              </div>
              <small>{request.updated}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AdminOrdersView({ users, orders }) {
  const userById = new Map(users.map((user) => [user.id, user]));

  return (
    <section className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2>All orders</h2>
          <p>Review checkout, production, shipping, and payment state.</p>
        </div>
      </div>

      <div className="admin-request-list">
        {orders.length ? (
          orders.map((order) => {
            const owner = userById.get(order.customerId);
            const shipping = selectedShipping(order);
            return (
              <div className="admin-request-row" key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <span>{order.title}</span>
                </div>
                <div>
                  <small>Customer</small>
                  <span>{owner?.name || order.customer}</span>
                </div>
                <StatusBadge status={order.status} />
                <div>
                  <small>Total</small>
                  <span>${orderTotal(order)}</span>
                </div>
                <div>
                  <small>Shipping</small>
                  <span>{shipping ? shipping.carrier : "Not selected"}</span>
                </div>
                <small>{order.updated}</small>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <p>Confirmed requests will appear here as orders.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminAuditView({ auditLogs, serviceEvents }) {
  return (
    <section className="admin-audit-grid">
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Activity trail</h2>
            <p>
              Role changes, request updates, price changes, and payment activity
              are recorded here.
            </p>
          </div>
        </div>

        <div className="audit-list">
          {auditLogs.length ? (
            auditLogs.map((log) => (
              <div className="audit-row" key={log.id}>
                <ShieldCheck size={17} />
                <div>
                  <strong>{formatActionLabel(log.action)}</strong>
                  <span>
                    {log.detail || `${log.targetType} ${log.targetId}`}
                  </span>
                </div>
                <small>{log.actorEmail}</small>
                <small>{log.createdAt}</small>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No audit activity yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Integration events</h2>
            <p>
              Local adapters record the same handoff points that future APIs
              will own.
            </p>
          </div>
        </div>
        <div className="service-event-list">
          {serviceEvents.slice(0, 10).map((event) => (
            <div className="service-event-row" key={event.id}>
              <ClipboardCheck size={16} />
              <div>
                <strong>{event.adapter}</strong>
                <span>
                  {event.action} - {event.targetId}
                </span>
                <small>{event.detail}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminDataModelView({ rows, replacementRows, schemaRows }) {
  return (
    <section className="admin-data-model">
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Backend-shaped local tables</h2>
            <p>
              These local ledgers mark where server tables and service adapters
              should replace browser storage.
            </p>
          </div>
        </div>

        <div className="data-model-table">
          <div className="data-model-row data-model-head">
            <span>Local key</span>
            <span>Future table</span>
            <span>Owner</span>
            <span>Rows</span>
          </div>
          {rows.map((row) => (
            <div className="data-model-row" key={row.localKey}>
              <code>{row.localKey}</code>
              <strong>{row.futureTable}</strong>
              <span>{row.owner}</span>
              <b>{row.count}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Database schema blueprint</h2>
            <p>
              These are the first server tables the local ledgers are already
              shaped to become.
            </p>
          </div>
        </div>

        <div className="schema-blueprint-list">
          {schemaRows.map((row) => (
            <div className="schema-blueprint-row" key={row.table}>
              <div>
                <strong>{row.table}</strong>
                <span>{row.owner}</span>
              </div>
              <p>{row.fields.join(", ")}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>API replacement map</h2>
            <p>
              Replace these local functions with server/API calls while
              preserving the surrounding flow.
            </p>
          </div>
        </div>

        <div className="adapter-contract-list">
          {replacementRows.map((row) => (
            <div className="adapter-contract-row" key={row.adapter}>
              <div>
                <strong>{row.adapter}</strong>
                <code>{row.replace}</code>
              </div>
              <p>
                <b>Input:</b> {row.input}
              </p>
              <p>
                <b>Output:</b> {row.output}
              </p>
              <p>
                <b>Writes:</b> {row.writes}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatActionLabel(action) {
  return action
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StaffApp({
  requests,
  orders,
  activeRequest,
  activeOrder,
  staffView,
  setStaffView,
  openRequest,
  openOrder,
  updateOrderFromStaff,
  sendOrderMessage,
  currentUser,
  signOut,
  staffComposer,
  setStaffComposer,
  staffAttachment,
  setStaffAttachment,
  staffPrice,
  setStaffPrice,
  includePreview,
  setIncludePreview,
  includeTable,
  setIncludeTable,
  sendStaffUpdate,
}) {
  return (
    <div className="staff-shell">
      <aside className="staff-sidebar">
        <div className="staff-logo">
          <Cable size={22} />
          <span>Easy Harness Ops</span>
        </div>
        <button
          className={`staff-nav ${staffView === "queue" || staffView === "detail" ? "active" : ""}`}
          onClick={() => setStaffView("queue")}
        >
          Requests
        </button>
        <button
          className={`staff-nav ${staffView === "orders" || staffView === "order" ? "active" : ""}`}
          onClick={() => setStaffView("orders")}
        >
          Orders
        </button>

        <div className="staff-sidebar-list">
          <span className="sidebar-section-title">Requests</span>
          {requests.map((request) => (
            <button
              key={request.id}
              className={`staff-mini-row ${request.id === activeRequest?.id ? "active" : ""}`}
              onClick={() => openRequest(request.id, "staff")}
            >
              <strong>{request.id}</strong>
              <small>{statusCopy[request.status]}</small>
            </button>
          ))}
        </div>
        {!!orders.length && (
          <div className="staff-sidebar-list">
            <span className="sidebar-section-title">Orders</span>
            {orders.slice(0, 6).map((order) => (
              <button
                key={order.id}
                className={`staff-mini-row ${order.id === activeOrder?.id ? "active" : ""}`}
                onClick={() => openOrder(order.id)}
              >
                <strong>{order.id}</strong>
                <small>{orderStatusCopy[order.status]}</small>
              </button>
            ))}
          </div>
        )}
      </aside>

      <main className="staff-main">
        {staffView === "queue" ? (
          <StaffQueue
            requests={requests}
            openRequest={openRequest}
            currentUser={currentUser}
            signOut={signOut}
          />
        ) : staffView === "orders" ? (
          <StaffOrders
            orders={orders}
            openOrder={openOrder}
            signOut={signOut}
          />
        ) : staffView === "order" ? (
          <StaffOrderDetail
            order={activeOrder}
            updateOrderFromStaff={updateOrderFromStaff}
            sendOrderMessage={sendOrderMessage}
            signOut={signOut}
          />
        ) : (
          <StaffDetail
            request={activeRequest}
            currentUser={currentUser}
            signOut={signOut}
            staffComposer={staffComposer}
            setStaffComposer={setStaffComposer}
            staffAttachment={staffAttachment}
            setStaffAttachment={setStaffAttachment}
            staffPrice={staffPrice}
            setStaffPrice={setStaffPrice}
            includePreview={includePreview}
            setIncludePreview={setIncludePreview}
            includeTable={includeTable}
            setIncludeTable={setIncludeTable}
            sendStaffUpdate={sendStaffUpdate}
          />
        )}
      </main>
    </div>
  );
}

function staffRequestBuckets(requests) {
  return [
    {
      title: "Needs customer details",
      description: "Intake could not start review yet.",
      requests: requests.filter((request) =>
        ["needs_info", "not_supported"].includes(request.status),
      ),
    },
    {
      title: "Needs price review",
      description: "Draft is ready enough for Easy Harness to prepare a price.",
      requests: requests.filter(
        (request) => request.status === "in_review" && !request.price,
      ),
    },
    {
      title: "Waiting for customer confirmation",
      description: "Harness price is released.",
      requests: requests.filter(
        (request) => request.status === "ready_to_confirm",
      ),
    },
    {
      title: "Converted or closed",
      description: "Request has been confirmed or is connected to an order.",
      requests: requests.filter((request) =>
        ["confirmed", "paid"].includes(request.status),
      ),
    },
  ];
}

function staffOrderBuckets(orders) {
  return [
    {
      title: "Payment needed",
      description: "Customer needs to complete payment or transfer.",
      orders: orders.filter((order) => order.paymentStatus !== "paid"),
    },
    {
      title: "Production",
      description: "Paid orders before carrier handoff.",
      orders: orders.filter(
        (order) =>
          order.paymentStatus === "paid" &&
          ["scheduled", "in_production", "ready_to_ship"].includes(
            order.status,
          ),
      ),
    },
    {
      title: "Shipping and delivery",
      description: "Carrier tracking is active or delivery is complete.",
      orders: orders.filter((order) =>
        ["shipped", "delivered"].includes(order.status),
      ),
    },
  ];
}

function requestNextAction(request) {
  if (request.status === "needs_info") {
    const missing = request.checkResult?.missing || [];
    return missing.length
      ? `Ask customer for ${missing.map(formatMissingInfoItem).join(", ")}`
      : "Ask customer for the missing request details";
  }
  if (request.status === "in_review" && request.price)
    return "Send final confirmation note";
  if (request.status === "in_review")
    return "Review files, prepare draft, and set harness price";
  if (request.status === "ready_to_confirm")
    return "Wait for customer confirmation";
  if (request.status === "confirmed") return "Watch checkout and payment";
  if (request.status === "paid") return "Continue in order console";
  return "Review latest customer activity";
}

function orderNextAction(order) {
  if (
    order.paymentStatus === "payment_pending" &&
    order.paymentMethodId === "marketplace_protected"
  ) {
    return marketplacePaymentDetails(order).checkoutUrl
      ? "Wait for marketplace payment confirmation"
      : "Prepare protected marketplace checkout link";
  }
  if (order.paymentStatus === "bank_transfer_pending")
    return "Confirm transfer receipt or message customer";
  if (order.paymentStatus !== "paid")
    return "Wait for checkout or help with payment questions";
  if (order.status === "scheduled")
    return "Start production when materials are ready";
  if (order.status === "in_production")
    return "Update ready-to-ship when finished";
  if (order.status === "ready_to_ship") return "Add carrier tracking";
  if (order.status === "shipped") return "Monitor tracking until delivery";
  if (order.status === "delivered") return "Watch for after-sales messages";
  return "Review order status";
}

function StaffQueue({ requests, openRequest, currentUser, signOut }) {
  const buckets = staffRequestBuckets(requests);

  return (
    <section className="staff-page">
      <header className="staff-header">
        <div>
          <span className="eyebrow">Ops console</span>
          <h1>Request queue</h1>
          <p>
            Work requests by intake state, quote readiness, and customer
            confirmation.
          </p>
        </div>
        <button className="drawer-close" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="staff-queue-groups">
        {buckets.map((bucket) => (
          <div className="staff-queue-group" key={bucket.title}>
            <div className="order-list-heading">
              <div>
                <h2>{bucket.title}</h2>
                <p>{bucket.description}</p>
              </div>
              <span>{bucket.requests.length}</span>
            </div>
            <div className="staff-queue">
              {bucket.requests.length ? (
                bucket.requests.map((request) => (
                  <button
                    className="staff-queue-row"
                    key={request.id}
                    onClick={() => openRequest(request.id, "staff")}
                  >
                    <div>
                      <strong>{request.id}</strong>
                      <span>{request.title}</span>
                      {request.checkResult?.missing?.length ? (
                        <small>
                          Missing: {request.checkResult.missing.join(", ")}
                        </small>
                      ) : null}
                      <small className="next-action">
                        Next: {requestNextAction(request)}
                      </small>
                    </div>
                    <StatusBadge status={request.status} />
                    <small>{request.updated}</small>
                  </button>
                ))
              ) : (
                <div className="empty-state compact">
                  <p>No requests in this lane.</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StaffOrders({ orders, openOrder, signOut }) {
  const buckets = staffOrderBuckets(orders);

  return (
    <section className="staff-page">
      <header className="staff-header">
        <div>
          <span className="eyebrow">Ops console</span>
          <h1>Order queue</h1>
          <p>
            Track checkout, production, shipping, and delivery after a request
            is confirmed.
          </p>
        </div>
        <button className="drawer-close" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="staff-queue-groups">
        {orders.length ? (
          buckets.map((bucket) => (
            <div className="staff-queue-group" key={bucket.title}>
              <div className="order-list-heading">
                <div>
                  <h2>{bucket.title}</h2>
                  <p>{bucket.description}</p>
                </div>
                <span>{bucket.orders.length}</span>
              </div>
              <div className="staff-queue">
                {bucket.orders.length ? (
                  bucket.orders.map((order) => (
                    <button
                      className="staff-queue-row"
                      key={order.id}
                      onClick={() => openOrder(order.id)}
                    >
                      <div>
                        <strong>{order.id}</strong>
                        <span>{order.title}</span>
                        <small>
                          {paymentStatusCopy[order.paymentStatus] ||
                            orderStatusCopy[order.status]}
                        </small>
                        <small className="next-action">
                          Next: {orderNextAction(order)}
                        </small>
                      </div>
                      <StatusBadge status={order.status} />
                      <small>{order.updated}</small>
                    </button>
                  ))
                ) : (
                  <div className="empty-state compact">
                    <p>No orders in this lane.</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>Confirmed requests will appear here as orders.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function StaffOrderDetail({
  order,
  updateOrderFromStaff,
  sendOrderMessage,
  signOut,
}) {
  const [productionStatus, setProductionStatus] = useState(
    ["scheduled", "in_production", "ready_to_ship"].includes(order?.status)
      ? order.status
      : "scheduled",
  );
  const [estimatedProductionComplete, setEstimatedProductionComplete] =
    useState(order?.estimatedProductionComplete || "");
  const [trackingNumber, setTrackingNumber] = useState(
    order?.trackingNumber || "",
  );
  const [carrierTrackingUrl, setCarrierTrackingUrl] = useState(
    order?.carrierTrackingUrl || "",
  );
  const [trackingSource, setTrackingSource] = useState(
    order?.trackingSource || "manual",
  );
  const [shipmentStatus, setShipmentStatus] = useState(
    order?.status === "delivered"
      ? "delivered"
      : order?.status === "shipped"
        ? "shipped"
        : "not_shipped",
  );
  const [paymentStatus, setPaymentStatus] = useState(
    order?.paymentStatus || "unpaid",
  );
  const [addressDraft, setAddressDraft] = useState(order?.address || {});
  const [packageDraft, setPackageDraft] = useState(
    order?.packageEstimate || {},
  );
  const [selectedShippingId, setSelectedShippingId] = useState(
    order?.selectedShippingId || "",
  );
  const [internalNotes, setInternalNotes] = useState(
    order?.internalNotes || "",
  );
  const [marketplaceProvider, setMarketplaceProvider] = useState(
    marketplacePaymentDetails(order).provider,
  );
  const [marketplaceUrl, setMarketplaceUrl] = useState(
    marketplacePaymentDetails(order).checkoutUrl,
  );
  const [marketplaceReference, setMarketplaceReference] = useState(
    marketplacePaymentDetails(order).reference,
  );
  const [marketplaceNote, setMarketplaceNote] = useState(
    marketplacePaymentDetails(order).note,
  );

  useEffect(() => {
    setProductionStatus(
      ["scheduled", "in_production", "ready_to_ship"].includes(order?.status)
        ? order.status
        : "scheduled",
    );
    setEstimatedProductionComplete(order?.estimatedProductionComplete || "");
    setTrackingNumber(order?.trackingNumber || "");
    setCarrierTrackingUrl(order?.carrierTrackingUrl || "");
    setTrackingSource(order?.trackingSource || "manual");
    setShipmentStatus(
      order?.status === "delivered"
        ? "delivered"
        : order?.status === "shipped"
          ? "shipped"
          : "not_shipped",
    );
    setPaymentStatus(order?.paymentStatus || "unpaid");
    setAddressDraft(order?.address || {});
    setPackageDraft(order?.packageEstimate || {});
    setSelectedShippingId(order?.selectedShippingId || "");
    setInternalNotes(order?.internalNotes || "");
    const marketplacePayment = marketplacePaymentDetails(order);
    setMarketplaceProvider(marketplacePayment.provider);
    setMarketplaceUrl(marketplacePayment.checkoutUrl);
    setMarketplaceReference(marketplacePayment.reference);
    setMarketplaceNote(marketplacePayment.note);
  }, [order?.id]);

  if (!order) {
    return (
      <section className="staff-page staff-detail-page">
        <header className="staff-header sticky-staff-header">
          <div>
            <span className="eyebrow">Ops console</span>
            <h1>Active order</h1>
            <p>No order is selected.</p>
          </div>
          <button className="drawer-close" onClick={signOut}>
            Sign out
          </button>
        </header>
        <div className="empty-state">
          <p>Confirmed requests will appear in the order queue.</p>
        </div>
      </section>
    );
  }

  const shipping = selectedShipping(order);
  const packageNumber = (field, fallback) => {
    const value = Number(packageDraft[field]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const updateAddressDraft = (field, value) => {
    setAddressDraft((current) => ({ ...current, [field]: value }));
  };
  const updatePackageDraft = (field, value) => {
    setPackageDraft((current) => ({ ...current, [field]: value }));
  };

  const saveDelivery = () => {
    const nextPackage = {
      weightKg: packageNumber("weightKg", order.packageEstimate.weightKg),
      lengthCm: packageNumber("lengthCm", order.packageEstimate.lengthCm),
      widthCm: packageNumber("widthCm", order.packageEstimate.widthCm),
      heightCm: packageNumber("heightCm", order.packageEstimate.heightCm),
    };
    const nextShippingOptions = getShippingOptions(nextPackage);
    const nextSelectedShippingId = nextShippingOptions.some(
      (option) => option.id === selectedShippingId,
    )
      ? selectedShippingId
      : nextShippingOptions[0]?.id || "";
    updateOrderFromStaff(
      order.id,
      {
        address: addressDraft,
        packageEstimate: nextPackage,
        shippingOptions: nextShippingOptions,
        selectedShippingId: nextSelectedShippingId,
        internalNotes,
      },
      "Delivery, package, or shipping details updated.",
    );
  };

  const savePayment = () => {
    const orderAlreadyInProgress = [
      "scheduled",
      "in_production",
      "ready_to_ship",
      "shipped",
      "delivered",
    ].includes(order.status);
    const nextStatus =
      paymentStatus === "paid"
        ? orderAlreadyInProgress
          ? order.status
          : "scheduled"
        : paymentStatus === "bank_transfer_pending"
          ? "awaiting_bank_transfer"
          : paymentStatus === "payment_pending"
            ? "checkout"
          : "checkout";
    updateOrderFromStaff(
      order.id,
      {
        status: nextStatus,
        paymentStatus,
        paidAt: paymentStatus === "paid" ? order.paidAt || "Now" : "",
        paymentProvider:
          paymentStatus === "bank_transfer_pending"
            ? "Bank transfer"
            : paymentStatus === "payment_pending" &&
                order.paymentMethodId === "marketplace_protected"
              ? marketplaceProvider || order.paymentProvider
            : order.paymentProvider,
      },
      `Payment state changed to ${paymentStatusCopy[paymentStatus]}.`,
    );
  };

  const saveMarketplaceLink = async () => {
    const checkoutUrl = marketplaceUrl.trim();
    const previousMarketplacePayment = marketplacePaymentDetails(order);
    const provider =
      marketplaceProvider.trim() || marketplacePaymentDefaults.provider;
    const marketplacePayment = {
      provider,
      checkoutUrl,
      reference: marketplaceReference.trim(),
      note: marketplaceNote.trim() || marketplacePaymentDefaults.note,
      status: checkoutUrl ? "link_ready" : "requested",
      requestedAt:
        order.marketplacePayment?.requestedAt ||
        order.snapshot?.marketplacePayment?.requestedAt ||
        "Now",
      updatedAt: "Now",
    };
    await updateOrderFromStaff(
      order.id,
      {
        paymentStatus: "payment_pending",
        paymentMethodId: "marketplace_protected",
        paymentProvider: provider,
        paymentReference:
          marketplacePayment.reference || order.paymentReference || "",
        paymentSession: {
          ...(order.paymentSession || {}),
          id: order.paymentSession?.id || `marketplace_${order.id}`,
          provider,
          status: marketplacePayment.status,
          checkoutUrl,
          reference: marketplacePayment.reference,
          updatedAt: "Now",
        },
        marketplacePayment,
        snapshot: {
          ...(order.snapshot || {}),
          marketplacePayment,
        },
      },
      checkoutUrl
        ? "Marketplace protected checkout link is ready for the customer."
        : "Marketplace protected payment path prepared.",
    );
    if (checkoutUrl && checkoutUrl !== previousMarketplacePayment.checkoutUrl) {
      await sendOrderMessage(
        order.id,
        `Your protected marketplace checkout is ready. Open it from the order summary, and confirm that the marketplace order matches this Easy Harness order before paying.${marketplacePayment.reference ? ` Reference: ${marketplacePayment.reference}.` : ""}`,
        "staff",
      );
    }
  };

  const saveProduction = () => {
    updateOrderFromStaff(
      order.id,
      {
        status: productionStatus,
        productionStatus,
        estimatedProductionComplete,
      },
      `Production status changed to ${orderStatusCopy[productionStatus]}.`,
    );
  };

  const saveShipment = () => {
    const shipmentResult = buildShipmentUpdateAdapter(order, {
      shipmentStatus,
      trackingNumber,
      carrierTrackingUrl,
      trackingSource,
    });
    updateOrderFromStaff(
      order.id,
      shipmentResult.orderPatch,
      shipmentResult.eventDetail,
    );
  };

  return (
    <section className="staff-page">
      <header className="staff-header sticky-staff-header">
        <div>
          <span className="eyebrow">Ops console</span>
          <h1>{order.id}</h1>
          <p>
            {order.title} - {orderStatusCopy[order.status]} -{" "}
            {paymentStatusCopy[order.paymentStatus] || order.paymentStatus}
          </p>
        </div>
        <button className="drawer-close" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="staff-detail-layout order-ops-layout">
        <div className="staff-order-main">
          <div className="admin-card">
            <h2>Order snapshot</h2>
            <div className="snapshot-grid ops-snapshot-grid">
              <div>
                <span className="eyebrow">Request</span>
                <strong>{order.requestId}</strong>
              </div>
              <div>
                <span className="eyebrow">Customer</span>
                <strong>{order.customer}</strong>
              </div>
              <div>
                <span className="eyebrow">Payment</span>
                <strong>
                  {paymentStatusCopy[order.paymentStatus] ||
                    order.paymentStatus}
                </strong>
              </div>
              <div>
                <span className="eyebrow">Total</span>
                <strong>${orderTotal(order)}</strong>
              </div>
              <div>
                <span className="eyebrow">Shipping</span>
                <strong>
                  {shipping
                    ? `${shipping.level} - ${shipping.carrier}`
                    : "Not selected"}
                </strong>
              </div>
              <div>
                <span className="eyebrow">Incoterm</span>
                <strong>{order.incoterm}</strong>
              </div>
            </div>
            <p className="snapshot-summary">{order.snapshot.customerSummary}</p>
            <div className="file-strip compact">
              {order.snapshot.requestFiles.map((file) => (
                <FileChip file={file} key={file} />
              ))}
            </div>
          </div>

          <div className="admin-card">
            <h2>Delivery and shipping</h2>
            <div className="order-form-grid">
              <label className="field">
                <span>Recipient</span>
                <input
                  value={addressDraft.name || ""}
                  onChange={(event) =>
                    updateAddressDraft("name", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  value={addressDraft.email || ""}
                  onChange={(event) =>
                    updateAddressDraft("email", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  value={addressDraft.phone || ""}
                  onChange={(event) =>
                    updateAddressDraft("phone", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Company</span>
                <input
                  value={addressDraft.company || ""}
                  onChange={(event) =>
                    updateAddressDraft("company", event.target.value)
                  }
                />
              </label>
              <label className="field wide">
                <span>Address line 1</span>
                <input
                  value={addressDraft.line1 || ""}
                  onChange={(event) =>
                    updateAddressDraft("line1", event.target.value)
                  }
                />
              </label>
              <label className="field wide">
                <span>Address line 2</span>
                <input
                  value={addressDraft.line2 || ""}
                  onChange={(event) =>
                    updateAddressDraft("line2", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>City</span>
                <input
                  value={addressDraft.city || ""}
                  onChange={(event) =>
                    updateAddressDraft("city", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>State / region</span>
                <input
                  value={addressDraft.region || ""}
                  onChange={(event) =>
                    updateAddressDraft("region", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Postal code</span>
                <input
                  value={addressDraft.postalCode || ""}
                  onChange={(event) =>
                    updateAddressDraft("postalCode", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Country</span>
                <select
                  value={addressDraft.country || ""}
                  onChange={(event) =>
                    updateAddressDraft("country", event.target.value)
                  }
                >
                  <option value="">Select country</option>
                  {checkoutCountries.map((country) => (
                    <option value={country} key={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>VAT / EORI / Tax ID</span>
                <input
                  value={addressDraft.taxId || ""}
                  onChange={(event) =>
                    updateAddressDraft("taxId", event.target.value)
                  }
                />
              </label>
            </div>

            <div className="package-grid">
              <label className="field">
                <span>Weight kg</span>
                <input
                  value={packageDraft.weightKg || ""}
                  onChange={(event) =>
                    updatePackageDraft("weightKg", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Length cm</span>
                <input
                  value={packageDraft.lengthCm || ""}
                  onChange={(event) =>
                    updatePackageDraft("lengthCm", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Width cm</span>
                <input
                  value={packageDraft.widthCm || ""}
                  onChange={(event) =>
                    updatePackageDraft("widthCm", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>Height cm</span>
                <input
                  value={packageDraft.heightCm || ""}
                  onChange={(event) =>
                    updatePackageDraft("heightCm", event.target.value)
                  }
                />
              </label>
            </div>

            <label className="field wide">
              <span>Shipping service</span>
              <select
                value={selectedShippingId}
                onChange={(event) => setSelectedShippingId(event.target.value)}
              >
                {order.shippingOptions.map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.level} - {option.carrier} {option.service} - $
                    {option.price} - {option.days}
                  </option>
                ))}
              </select>
            </label>
            <label className="field wide">
              <span>Internal note</span>
              <input
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                placeholder="Internal fulfillment note"
              />
            </label>
            <button className="secondary-action" onClick={saveDelivery}>
              Save delivery details
            </button>
          </div>

          <OrderMessagePanel
            order={order}
            sendOrderMessage={sendOrderMessage}
            authorRole="staff"
            title="Order messages"
            prompt="Reply to the customer about this order..."
          />
        </div>

        <aside className="staff-price-pane">
          <div className="side-card price-card marketplace-ops-card">
            <h2>Marketplace protected payment</h2>
            <p>
              Use this when the customer wants to complete payment through a
              protected marketplace order. Create a matching order for this
              Easy Harness quote, then paste the checkout link here.
            </p>
            <label className="field">
              <span>Provider</span>
              <input
                value={marketplaceProvider}
                onChange={(event) => setMarketplaceProvider(event.target.value)}
                placeholder="Alibaba.com Trade Assurance"
              />
            </label>
            <label className="field">
              <span>Protected checkout link</span>
              <input
                value={marketplaceUrl}
                onChange={(event) => setMarketplaceUrl(event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="field">
              <span>Marketplace reference</span>
              <input
                value={marketplaceReference}
                onChange={(event) =>
                  setMarketplaceReference(event.target.value)
                }
                placeholder="Marketplace order or quote number"
              />
            </label>
            <label className="field">
              <span>Customer note</span>
              <input
                value={marketplaceNote}
                onChange={(event) => setMarketplaceNote(event.target.value)}
                placeholder="Shown on the customer order page"
              />
            </label>
            <button className="secondary-action" onClick={saveMarketplaceLink}>
              Save protected payment link
            </button>
          </div>

          <div className="side-card price-card">
            <h2>Payment</h2>
            <label className="field">
              <span>Status</span>
              <select
                value={paymentStatus}
                onChange={(event) => setPaymentStatus(event.target.value)}
              >
                <option value="unpaid">Unpaid</option>
                <option value="payment_pending">Payment pending</option>
                <option value="bank_transfer_pending">Transfer pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <p>
              Card and PayPal should normally be confirmed by provider callback.
              Bank transfer and marketplace payments can be marked after
              receipt is verified.
            </p>
            <button className="secondary-action" onClick={savePayment}>
              Save payment state
            </button>
          </div>

          <div className="side-card price-card">
            <h2>Production update</h2>
            <label className="field">
              <span>Status</span>
              <select
                value={productionStatus}
                onChange={(event) => setProductionStatus(event.target.value)}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_production">In production</option>
                <option value="ready_to_ship">Ready to ship</option>
              </select>
            </label>
            <label className="field">
              <span>Estimated completion</span>
              <input
                value={estimatedProductionComplete}
                onChange={(event) =>
                  setEstimatedProductionComplete(event.target.value)
                }
                placeholder="YYYY-MM-DD"
              />
            </label>
            <button className="secondary-action" onClick={saveProduction}>
              Save production update
            </button>
          </div>

          <div className="side-card price-card">
            <h2>Shipment tracking</h2>
            <label className="field">
              <span>Shipment status</span>
              <select
                value={shipmentStatus}
                onChange={(event) => setShipmentStatus(event.target.value)}
              >
                <option value="not_shipped">Not shipped</option>
                <option value="shipped">Shipped / in transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </label>
            <label className="field">
              <span>Tracking source</span>
              <select
                value={trackingSource}
                onChange={(event) => setTrackingSource(event.target.value)}
              >
                <option value="manual">Manual carrier link</option>
                <option value="api">Carrier API linked</option>
              </select>
            </label>
            <label className="field">
              <span>Tracking number</span>
              <input
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder="Carrier tracking number"
              />
            </label>
            <label className="field">
              <span>Tracking URL</span>
              <input
                value={carrierTrackingUrl}
                onChange={(event) => setCarrierTrackingUrl(event.target.value)}
                placeholder="Carrier tracking link"
              />
            </label>
            <button className="secondary-action" onClick={saveShipment}>
              Save shipment update
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function StaffDetail({
  request,
  currentUser,
  signOut,
  staffComposer,
  setStaffComposer,
  staffAttachment,
  setStaffAttachment,
  staffPrice,
  setStaffPrice,
  includePreview,
  setIncludePreview,
  includeTable,
  setIncludeTable,
  sendStaffUpdate,
}) {
  if (!request) {
    return (
      <section className="staff-page staff-detail-page">
        <header className="staff-header sticky-staff-header">
          <div>
            <span className="eyebrow">Ops console</span>
            <h1>Active request</h1>
            <p>No request is selected.</p>
          </div>
          <button className="drawer-close" onClick={signOut}>
            Sign out
          </button>
        </header>
        <div className="empty-state">
          <p>Open a request from the queue to review its thread and release a price.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="staff-page staff-detail-page">
      <header className="staff-header sticky-staff-header">
        <div>
          <span className="eyebrow">Ops console</span>
          <h1>{request.id}</h1>
          <p>
            {request.title} - {statusCopy[request.status]} - {currentUser.email}
          </p>
        </div>
        <button className="drawer-close" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="staff-detail-layout">
        <div className="staff-thread-pane">
          <MessageList request={request} perspective="staff" />
        </div>
        <aside className="staff-price-pane">
          <IntakeDraftCard checkResult={request.checkResult} request={request} />
          <div className="side-card price-card">
            <h2>Release price to customer</h2>
            <label className="field">
              <span>Harness price</span>
              <input
                value={staffPrice}
                onChange={(event) => setStaffPrice(event.target.value)}
                placeholder={
                  request.price ? request.price : "Optional until ready"
                }
              />
            </label>
            <p>
              Release a customer-visible price when the Draft is clear enough. Leaving it empty sends only the message content.
            </p>
            <button className="secondary-action" onClick={sendStaffUpdate}>
              Release price or send update
            </button>
          </div>
        </aside>
      </div>

      <StaffComposer
        value={staffComposer}
        setValue={setStaffComposer}
        attachment={staffAttachment}
        setAttachment={setStaffAttachment}
        includePreview={includePreview}
        setIncludePreview={setIncludePreview}
        includeTable={includeTable}
        setIncludeTable={setIncludeTable}
        sendUpdate={sendStaffUpdate}
      />
    </section>
  );
}

function StaffComposer({
  value,
  setValue,
  attachment,
  setAttachment,
  includePreview,
  setIncludePreview,
  includeTable,
  setIncludeTable,
  sendUpdate,
}) {
  const staffUploadRef = useRef(null);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const addStaffFiles = (fileItems) => {
    const { nextFiles, error } = prepareDraftFiles(fileItems, attachment.length);
    setUploadError(error);

    if (nextFiles.length) {
      setAttachment((current) => [...current, ...nextFiles]);
    }
  };

  const handleStaffUpload = (event) => {
    const selectedFiles = Array.from(event.target.files || []).map((file) => ({
      file,
      relativePath: file.webkitRelativePath || "",
    }));
    addStaffFiles(selectedFiles);
    event.target.value = "";
  };

  const handleStaffDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    try {
      const droppedFiles = await collectDroppedFileItems(event.dataTransfer);
      addStaffFiles(droppedFiles);
    } catch {
      setUploadError("Files could not be added from this drop.");
    }
  };

  const removeStaffFile = (fileKey) => {
    setAttachment((current) =>
      current.filter((file) => (file.id || fileName(file)) !== fileKey),
    );
  };

  return (
    <div
      className={`staff-composer-shell ${dragActive ? "drop-active" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setDragActive(false);
        }
      }}
      onDrop={handleStaffDrop}
    >
      {!!attachment.length && (
        <div className="composer-files staff-file-row">
          {attachment.map((file) => (
            <FileChip
              file={file}
              key={file.id || fileName(file)}
              onRemove={() => removeStaffFile(file.id || fileName(file))}
            />
          ))}
        </div>
      )}
      {uploadError && <div className="composer-error">{uploadError}</div>}
      <div className="staff-quick-tools">
        <button
          type="button"
          className={`composer-toggle ${includePreview ? "active" : ""}`}
          onClick={() => setIncludePreview((current) => !current)}
        >
          <Cable size={15} />
          Visual preview
        </button>
        <button
          type="button"
          className={`composer-toggle ${includeTable ? "active" : ""}`}
          onClick={() => setIncludeTable((current) => !current)}
        >
          <ClipboardCheck size={15} />
          Table
        </button>
      </div>
      <div className="staff-composer">
        <button
          className="attach-button"
          type="button"
          onClick={() => staffUploadRef.current?.click()}
          aria-label="Upload attachment"
        >
          <Plus size={18} />
        </button>
        <input
          ref={staffUploadRef}
          type="file"
          multiple
          hidden
          onChange={handleStaffUpload}
        />
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Reply as Easy Harness..."
          rows={1}
        />

        <button
          className="send-button small"
          type="button"
          onClick={sendUpdate}
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const label = statusCopy[status] || orderStatusCopy[status] || status;
  const className =
    status === "ready_to_confirm"
      ? "ready"
      : status === "confirmed" ||
          status === "paid" ||
          status === "delivered" ||
          status === "shipped"
        ? "success"
        : ["scheduled", "in_production", "ready_to_ship"].includes(status)
          ? "ready"
          : status === "in_review" ||
              status === "checkout" ||
              status === "awaiting_bank_transfer" ||
              status === "payment_pending" ||
              status === "needs_info"
            ? "review"
            : status === "not_supported" || status === "failed"
              ? "blocked"
              : "neutral";
  return <span className={`list-status ${className}`}>{label}</span>;
}

function useAttachmentPreviewUrl(file) {
  const [url, setUrl] = useState(() => attachmentUrl(file));

  useEffect(() => {
    const explicitUrl = attachmentUrl(file);
    if (explicitUrl) {
      setUrl(explicitUrl);
      return undefined;
    }
    if (!file || typeof file === "string" || !file.sourceFile) {
      setUrl("");
      return undefined;
    }
    try {
      const objectUrl = URL.createObjectURL(file.sourceFile);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } catch {
      setUrl("");
      return undefined;
    }
  }, [file]);

  return url;
}

function CsvAttachmentPreview({ file }) {
  const [rows, setRows] = useState([]);
  const url = attachmentUrl(file);

  useEffect(() => {
    let cancelled = false;
    const parseText = (text) => {
      const parsed = text
        .split(/\r?\n/)
        .map((row) => row.split(",").map((cell) => cell.trim()))
        .filter((row) => row.some(Boolean))
        .slice(0, 4);
      setRows(parsed);
    };

    if (file && typeof file !== "string" && file.sourceFile?.text) {
      file.sourceFile.text().then((text) => {
        if (!cancelled) parseText(text);
      });
      return () => {
        cancelled = true;
      };
    }

    if (url) {
      fetch(url)
        .then((response) => (response.ok ? response.text() : ""))
        .then((text) => {
          if (!cancelled && text) parseText(text);
        })
        .catch(() => {
          if (!cancelled) setRows([]);
        });
      return () => {
        cancelled = true;
      };
    }

    if (!file || typeof file === "string" || !file.sourceFile?.text) {
      setRows([]);
      return undefined;
    }

    return () => {
      cancelled = true;
    };
  }, [file, url]);

  if (!rows.length) return null;

  return (
    <div className="attachment-table-preview">
      {rows.map((row, rowIndex) => (
        <div className="attachment-table-row" key={`${fileName(file)}-${rowIndex}`}>
          {row.slice(0, 4).map((cell, cellIndex) => (
            <span key={`${rowIndex}-${cellIndex}`}>{cell || "-"}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function AttachmentPreviewCard({ file }) {
  const url = useAttachmentPreviewUrl(file);
  const typeLabel = fileTypeLabel(file);
  const canShowImage = isImageFile(file) && url;
  const canShowPdf = isPdfFile(file) && url;
  const showCsv = isCsvFile(file);

  return (
    <div className={`attachment-preview-card type-${typeLabel.toLowerCase().replace(/\s+/g, "-")}`}>
      <FileChip file={file} />
      {canShowImage && (
        <img
          className="attachment-image-preview"
          src={url}
          alt={fileName(file)}
          loading="lazy"
        />
      )}
      {canShowPdf && (
        <iframe
          className="attachment-pdf-preview"
          src={url}
          title={fileName(file)}
        />
      )}
      {showCsv && <CsvAttachmentPreview file={file} />}
      {!canShowImage && !canShowPdf && !showCsv && (
        <div className="attachment-file-preview">
          <FileText size={18} />
          <span>{typeLabel}</span>
        </div>
      )}
    </div>
  );
}

function AttachmentGallery({ files = [] }) {
  if (!files.length) return null;
  const hasVisual = files.some(
    (file) =>
      isImageFile(file) ||
      isPdfFile(file) ||
      isCsvFile(file) ||
      fileTypeLabel(file) === "Spreadsheet" ||
      fileTypeLabel(file) === "3D file",
  );

  if (!hasVisual) {
    return (
      <div className="file-strip compact">
        {files.map((file, index) => (
          <FileChip file={file} key={attachmentKey(file, index)} />
        ))}
      </div>
    );
  }

  return (
    <div className="attachment-gallery">
      {files.map((file, index) => (
        <AttachmentPreviewCard file={file} key={attachmentKey(file, index)} />
      ))}
    </div>
  );
}

function FileChip({ file, onRemove }) {
  const size = fileSizeLabel(file);
  return (
    <span
      className={`file-chip ${onRemove ? "removable" : ""}`}
      title={size ? `${fileName(file)} - ${size}` : fileName(file)}
    >
      <File size={14} />
      {fileName(file)}
      {size && <small>{size}</small>}
      {onRemove && (
        <button
          type="button"
          className="file-chip-remove"
          onClick={onRemove}
          aria-label={`Remove ${fileName(file)}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

function HarnessPreview({ request }) {
  const title = request?.title || "Harness layout";
  const text = getCustomerThreadText(request || { messages: [] });
  const dualBranch = /dual|two|2|sensor/i.test(`${title} ${text}`);

  return (
    <div className="inline-preview">
      <div className="preview-caption">
        <strong>{title}</strong>
        <span>
          {dualBranch
            ? "Controller lead with two branches"
            : "Single harness layout draft"}
        </span>
      </div>
      <svg viewBox="0 0 520 180" aria-hidden="true">
        <path d="M48 88h142c40 0 68-28 112-28h164" />
        {dualBranch && <path d="M190 88c50 0 78 42 132 42h144" />}
        <rect x="24" y="58" width="48" height="60" rx="8" />
        <rect x="446" y="32" width="52" height="56" rx="8" />
        {dualBranch && <rect x="446" y="100" width="52" height="56" rx="8" />}
        <circle cx="190" cy="88" r="8" />
      </svg>
    </div>
  );
}

function detailValue(text, pattern, fallback) {
  const match = text.match(pattern);
  return match?.[0] || fallback;
}

function BomTable({ request }) {
  const text = getCustomerThreadText(request || { messages: [] });
  const pending = "Easy Harness review";
  const quantity = detailValue(
    text,
    /\b\d+\s*(pcs|pieces|piece|sets|units)\b/i,
    pending,
  );
  const length = detailValue(
    text,
    /\b\d+(\.\d+)?\s*(m|meter|meters|cm|mm|inch|inches)\b/i,
    pending,
  );
  const rating = detailValue(
    text,
    /\b\d+(\.\d+)?\s*(v|volt|volts|a|amp|amps)\b/i,
    pending,
  );
  const stateFor = (value) => (value === pending ? "Review" : "Captured");

  return (
    <table className="bom-table">
      <thead>
        <tr>
          <th>Draft basis item</th>
          <th>Current order basis</th>
          <th>State</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Harness type</td>
          <td>{request?.title || "Harness assembly"}</td>
          <td>Captured</td>
        </tr>
        <tr>
          <td>Length</td>
          <td>{length}</td>
          <td>{stateFor(length)}</td>
        </tr>
        <tr>
          <td>Quantity</td>
          <td>{quantity}</td>
          <td>{stateFor(quantity)}</td>
        </tr>
        <tr>
          <td>Electrical rating</td>
          <td>{rating}</td>
          <td>{stateFor(rating)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function PaymentModal({ price, total, method, close, markPaid }) {
  const isPaypal = method?.id === "paypal";
  return (
    <div className="modal-backdrop">
      <div className="payment-modal">
        <div className="modal-icon">
          {isPaypal ? <CircleDollarSign size={25} /> : <CreditCard size={25} />}
        </div>
        <h2>{isPaypal ? "PayPal checkout" : "Secure hosted checkout"}</h2>
        <p>
          Total due is ${total || price}. The order now has a hosted{" "}
          {method.provider}
          payment session, so Easy Harness never stores card or wallet details.
        </p>
        <div className="payment-provider-box">
          <strong>{method.label}</strong>
          <span>{method.detail}</span>
        </div>
        <div className="modal-actions">
          <button className="secondary-action" onClick={close}>
            Back
          </button>
          <button
            className="publish-button"
            onClick={() => markPaid(method.id)}
          >
            Return with payment confirmed
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
