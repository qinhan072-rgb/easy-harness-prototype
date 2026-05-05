import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Cable,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Upload,
  UserCircle
} from "lucide-react";

const processingSteps = [
  "Upload received",
  "Request prepared",
  "Files checked",
  "Thread created"
];

const statusCopy = {
  draft_saved: "Draft saved",
  checking: "Checking",
  in_review: "In review",
  ready_to_confirm: "Ready to confirm",
  confirmed: "Confirmed",
  paid: "Paid"
};

const statusRank = {
  draft_saved: 0,
  checking: 0,
  in_review: 2,
  ready_to_confirm: 3,
  confirmed: 4,
  paid: 5
};

const workflowSteps = ["Check", "Draft", "Review", "Confirm", "Pay"];

const sampleFiles = ["connector-photo.jpg", "old-harness.png", "notes.pdf"];

const seedRequests = [
  {
    id: "HD-2026-1046-A",
    customer: "Zack Marv",
    title: "Controller-to-Dual-Sensor Harness Assembly",
    status: "in_review",
    price: "",
    files: sampleFiles,
    updated: "Just now",
    messages: [
      customerMessage("I need a harness to connect a controller to two sensors. I have connector photos and an old harness sample.", sampleFiles),
      customerMessage("Approximate length is 1 meter. Operating voltage is 12V. Quantity is 5 pieces."),
      easyMessage("Check complete. We have enough information to create a preliminary harness draft."),
      draftMessage("HD-2026-1046-A", "Controller-to-Dual-Sensor Harness Assembly"),
      eventMessage("In review", "The generated draft is being reviewed before it is released for confirmation.")
    ]
  },
  {
    id: "HD-2026-1042-A",
    customer: "Zack Marv",
    title: "Controller-to-Dual-Sensor Harness Assembly",
    status: "ready_to_confirm",
    price: "155",
    files: sampleFiles,
    updated: "Just now",
    messages: [
      customerMessage("I need a harness to connect a controller to two sensors. I have connector photos and an old harness sample.", sampleFiles),
      customerMessage("Approximate length is 1 meter. Operating voltage is 12V. Quantity is 5 pieces."),
      easyMessage("Check complete. We have enough information to create a preliminary harness draft."),
      draftMessage("HD-2026-1042-A", "Controller-to-Dual-Sensor Harness Assembly"),
      easyMessage("Here is a quick BOM preview and harness layout draft. Please review the connection direction and confirm whether this layout works for your device.", [], [
        { type: "table" },
        { type: "preview" },
        { type: "attachments", files: ["HD-2026-1042-A-draft.pdf"] }
      ]),
      priceEvent("155")
    ]
  },
  {
    id: "HD-2026-1038-B",
    customer: "Zack Marv",
    title: "Battery Pack Adapter Harness",
    status: "draft_saved",
    price: "",
    files: ["battery-pack-photo.jpg"],
    updated: "Yesterday",
    messages: [
      customerMessage("I want a small adapter harness for a battery pack test bench.", ["battery-pack-photo.jpg"])
    ]
  },
  {
    id: "HD-2026-1027-C",
    customer: "Zack Marv",
    title: "Old Harness Remake for Field Equipment",
    status: "in_review",
    price: "",
    files: ["old-harness-remake.png", "machine-label.jpg"],
    updated: "3 days ago",
    messages: [
      customerMessage("I have an old field-equipment harness and want to remake it as closely as possible.", ["old-harness-remake.png", "machine-label.jpg"]),
      easyMessage("Check complete. The request is in review and the draft will be prepared in this thread."),
      draftMessage("HD-2026-1027-C", "Old Harness Remake for Field Equipment")
    ]
  }
];

function customerMessage(text, files = []) {
  return {
    id: messageId(),
    role: "customer",
    createdAt: "Now",
    blocks: [
      { type: "text", text },
      ...(files.length ? [{ type: "attachments", files }] : [])
    ]
  };
}

function easyMessage(text, files = [], extraBlocks = []) {
  return {
    id: messageId(),
    role: "easy",
    createdAt: "Now",
    blocks: [
      { type: "text", text },
      ...(files.length ? [{ type: "attachments", files }] : []),
      ...extraBlocks
    ]
  };
}

function draftMessage(id, title) {
  return {
    id: messageId(),
    role: "easy",
    createdAt: "Now",
    tone: "draft",
    blocks: [{ type: "draft", id, title }]
  };
}

function eventMessage(title, body) {
  return {
    id: messageId(),
    role: "event",
    createdAt: "Now",
    blocks: [{ type: "event", title, body }]
  };
}

function priceEvent(amount) {
  return {
    id: messageId(),
    role: "event",
    createdAt: "Now",
    blocks: [{ type: "price", amount }]
  };
}

function messageId() {
  return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeRequestId(count) {
  return `HD-2026-${1050 + count}-A`;
}

function inferTitle(text) {
  const value = text.toLowerCase();
  if (value.includes("battery")) return "Battery Pack Adapter Harness";
  if (value.includes("old") || value.includes("remake")) return "Old Harness Remake for Field Equipment";
  if (value.includes("sensor")) return "Controller-to-Dual-Sensor Harness Assembly";
  return "Uploaded Harness Design Request";
}

function App() {
  const [surface, setSurface] = useState(() =>
    window.location.hash === "#staff" ? "staff" : "user"
  );
  const [userView, setUserView] = useState("start");
  const [staffView, setStaffView] = useState("queue");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [requests, setRequests] = useState(seedRequests);
  const [activeRequestId, setActiveRequestId] = useState(seedRequests[0].id);
  const [description, setDescription] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [processingRequestId, setProcessingRequestId] = useState("");
  const [userComposer, setUserComposer] = useState("");
  const [userComposerFiles, setUserComposerFiles] = useState([]);
  const [staffComposer, setStaffComposer] = useState("");
  const [staffAttachment, setStaffAttachment] = useState("");
  const [staffPrice, setStaffPrice] = useState("");
  const [includePreview, setIncludePreview] = useState(false);
  const [includeTable, setIncludeTable] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const uploadRef = useRef(null);
  const userComposerUploadRef = useRef(null);

  const activeRequest = useMemo(
    () => requests.find((request) => request.id === activeRequestId) || requests[0],
    [activeRequestId, requests]
  );

  useEffect(() => {
    setStaffPrice(activeRequest?.price || "");
  }, [activeRequestId]);

  useEffect(() => {
    const onHashChange = () => {
      setSurface(window.location.hash === "#staff" ? "staff" : "user");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (userView !== "processing" || !processingRequestId) return undefined;

    setProcessingIndex(-1);
    const timers = processingSteps.map((_, index) =>
      window.setTimeout(() => setProcessingIndex(index), 380 + index * 560)
    );

    timers.push(
      window.setTimeout(() => {
        updateRequest(processingRequestId, (request) => ({
          ...request,
          status: "in_review",
          updated: "Just now",
          messages: [
            ...request.messages,
            easyMessage("Check complete. We have enough information to create a preliminary harness draft."),
            draftMessage(request.id, request.title),
            eventMessage("In review", "The generated draft is being reviewed before it is released for confirmation.")
          ]
        }));
        setUserView("thread");
      }, 3000)
    );

    return () => timers.forEach(window.clearTimeout);
  }, [processingRequestId, userView]);

  function updateRequest(requestId, updater) {
    setRequests((current) =>
      current.map((request) => (request.id === requestId ? updater(request) : request))
    );
  }

  function openRequest(requestId, nextSurface = surface) {
    setActiveRequestId(requestId);
    const selected = requests.find((request) => request.id === requestId);
    setStaffPrice(selected?.price || "");
    if (nextSurface === "staff") {
      setStaffView("detail");
      return;
    }
    setUserView("thread");
  }

  function handleUpload(event, target = "start") {
    const nextFiles = Array.from(event.target.files || []).map((file) => file.name);
    if (!nextFiles.length) return;
    if (target === "composer") {
      setUserComposerFiles((current) => [...current, ...nextFiles]);
    } else {
      setUploadFiles((current) => [...current, ...nextFiles]);
    }
    event.target.value = "";
  }

  function fillSampleRequest() {
    setDescription(
      "I need a harness to connect a controller to two sensors. I have connector photos and an old harness sample."
    );
    setUploadFiles(sampleFiles);
  }

  function startRequest() {
    const text =
      description.trim() ||
      "I need a harness made from the uploaded design files.";
    const files = uploadFiles;
    const nextId = makeRequestId(requests.length);
    const nextRequest = {
      id: nextId,
      customer: "Zack Marv",
      title: inferTitle(text),
      status: "checking",
      price: "",
      files,
      updated: "Just now",
      messages: [customerMessage(text, files)]
    };

    setRequests((current) => [nextRequest, ...current]);
    setActiveRequestId(nextId);
    setProcessingRequestId(nextId);
    setDescription("");
    setUploadFiles([]);
    setUserView("processing");
  }

  function sendUserMessage() {
    const text = userComposer.trim();
    if (!text && !userComposerFiles.length) return;

    updateRequest(activeRequest.id, (request) => ({
      ...request,
      status:
        request.status === "draft_saved" || request.status === "checking"
          ? "in_review"
          : request.status,
      updated: "Just now",
      messages: [
        ...request.messages,
        {
          id: messageId(),
          role: "customer",
          createdAt: "Now",
          blocks: [
            ...(text ? [{ type: "text", text }] : []),
            ...(userComposerFiles.length
              ? [{ type: "attachments", files: userComposerFiles }]
              : [])
          ]
        }
      ]
    }));

    setUserComposer("");
    setUserComposerFiles([]);
  }

  function sendStaffUpdate() {
    const text = staffComposer.trim();
    const attachment = staffAttachment.trim();
    const price = staffPrice.trim();
    const hasContent = text || attachment || includePreview || includeTable;
    const hasPrice = price.length > 0 && price !== activeRequest.price;
    if (!hasContent && !hasPrice) return;

    updateRequest(activeRequest.id, (request) => {
      const messages = [...request.messages];

      if (hasContent) {
        messages.push({
          id: messageId(),
          role: "easy",
          createdAt: "Now",
          blocks: [
            ...(text ? [{ type: "text", text }] : []),
            ...(includeTable ? [{ type: "table" }] : []),
            ...(includePreview ? [{ type: "preview" }] : []),
            ...(attachment ? [{ type: "attachments", files: [attachment] }] : [])
          ]
        });
      }

      if (hasPrice) {
        messages.push(priceEvent(price));
      }

      return {
        ...request,
        price: hasPrice ? price : request.price,
        status: hasPrice ? "ready_to_confirm" : request.status === "draft_saved" ? "in_review" : request.status,
        updated: "Just now",
        messages
      };
    });

    setStaffComposer("");
    setStaffAttachment("");
    if (hasPrice) setStaffPrice(price);
    setIncludePreview(false);
    setIncludeTable(false);
  }

  function confirmRequest() {
    if (activeRequest.status !== "ready_to_confirm") return;
    updateRequest(activeRequest.id, (request) => ({
      ...request,
      status: "confirmed",
      updated: "Just now",
      messages: [
        ...request.messages,
        eventMessage("Confirmed", "You confirmed the current draft and price.")
      ]
    }));
  }

  function markPaid() {
    updateRequest(activeRequest.id, (request) => ({
      ...request,
      status: "paid",
      updated: "Just now",
      messages: [
        ...request.messages,
        eventMessage("Payment started", "Checkout is represented as a placeholder in this prototype.")
      ]
    }));
    setShowPayment(false);
  }

  if (surface === "staff") {
    return (
      <StaffApp
        requests={requests}
        activeRequest={activeRequest}
        staffView={staffView}
        setStaffView={setStaffView}
        openRequest={openRequest}
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
        requests={requests}
        activeRequest={activeRequest}
        setUserView={setUserView}
        openRequest={openRequest}
      />

      <main className={`workspace workspace-${userView}`}>
        <WiringBackdrop />
        <TopAccount />

        {userView === "start" && (
          <StartScreen
            description={description}
            setDescription={setDescription}
            files={uploadFiles}
            uploadRef={uploadRef}
            handleUpload={handleUpload}
            fillSampleRequest={fillSampleRequest}
            startRequest={startRequest}
          />
        )}

        {userView === "processing" && (
          <ProcessingScreen
            request={activeRequest}
            progressIndex={processingIndex}
          />
        )}

        {userView === "requests" && (
          <RequestsList requests={requests} openRequest={openRequest} />
        )}

        {userView === "thread" && activeRequest && (
          <RequestWorkspace
            request={activeRequest}
            perspective="user"
            composerValue={userComposer}
            setComposerValue={setUserComposer}
            composerFiles={userComposerFiles}
            uploadRef={userComposerUploadRef}
            handleUpload={(event) => handleUpload(event, "composer")}
            sendMessage={sendUserMessage}
            confirmRequest={confirmRequest}
            showPayment={() => setShowPayment(true)}
          />
        )}
      </main>

      {showPayment && (
        <PaymentModal
          price={activeRequest.price}
          close={() => setShowPayment(false)}
          markPaid={markPaid}
        />
      )}
    </div>
  );
}

function UserSidebar({
  sidebarOpen,
  setSidebarOpen,
  userView,
  requests,
  activeRequest,
  setUserView,
  openRequest
}) {
  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`} aria-label="Navigation">
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
          {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
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
        <button
          className={`rail-icon ${userView === "requests" ? "active" : ""}`}
          onClick={() => setUserView("requests")}
        >
          <Folder size={20} />
          {sidebarOpen && <span>Requests</span>}
        </button>
        <button className="rail-icon" onClick={() => (window.location.hash = "#staff")}>
          <Settings size={20} />
          {sidebarOpen && <span>Ops console</span>}
        </button>
      </nav>

      {sidebarOpen && (
        <div className="draft-list">
          <div className="sidebar-section-title">Recent requests</div>
          {requests.slice(0, 6).map((request) => (
            <button
              className={`draft-list-item ${request.id === activeRequest?.id ? "active" : ""}`}
              key={request.id}
              onClick={() => openRequest(request.id, "user")}
            >
              <strong>{request.id}</strong>
              <span>{request.title}</span>
              <small>{statusCopy[request.status]}</small>
            </button>
          ))}
        </div>
      )}

      <div className="rail-bottom">
        <button className="rail-icon">
          <UserCircle size={22} />
          {sidebarOpen && <span>Zack Marv</span>}
        </button>
      </div>
    </aside>
  );
}

function TopAccount() {
  return (
    <div className="top-account">
      <button className="account-icon" aria-label="Account">
        <UserCircle size={20} />
      </button>
      <button className="signin-button">Zack Marv</button>
    </div>
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
  fillSampleRequest,
  startRequest
}) {
  return (
    <section className="start-screen">
      <div className="brand-row">
        <Cable size={24} />
        <span>Easy Harness</span>
      </div>

      <div className="start-copy">
        <h1>Upload your design. Easy Harness takes it from there.</h1>
        <p>
          Add photos, sketches, PDFs, or an old harness sample. Tell us the
          connection you need in plain language.
        </p>
      </div>

      <div className="upload-composer">
        <button className="attach-button" onClick={() => uploadRef.current?.click()}>
          <Plus size={21} />
        </button>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Tell us what you need to connect..."
          rows={1}
        />
        <input ref={uploadRef} type="file" multiple hidden onChange={handleUpload} />
        <button className="send-button" onClick={startRequest} aria-label="Start request">
          <ArrowRight size={21} />
        </button>
      </div>

      <div className="start-actions">
        <button className="soft-chip" onClick={() => uploadRef.current?.click()}>
          <Upload size={16} />
          Upload files
        </button>
        <button className="soft-chip" onClick={fillSampleRequest}>
          <Sparkles size={16} />
          Use sample request
        </button>
        <span className="file-count">
          {files.length ? `${files.length} file${files.length > 1 ? "s" : ""} attached` : "No files attached"}
        </span>
      </div>

      {!!files.length && (
        <div className="file-strip compact center">
          {files.map((file) => (
            <FileChip key={file} file={file} />
          ))}
        </div>
      )}
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
          <p>Your upload is in. Easy Harness is organizing the details into a request thread.</p>
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
                  {done ? <Check size={15} /> : current ? <Clock3 size={15} /> : null}
                </span>
                <span>{step}</span>
              </div>
            );
          })}
        </div>

        {!!request?.files?.length && (
          <div className="file-strip compact center">
            {request.files.map((file) => (
              <FileChip key={file} file={file} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RequestsList({ requests, openRequest }) {
  return (
    <section className="requests-screen">
      <div className="requests-header">
        <span className="eyebrow">Requests</span>
        <h1>Your harness requests</h1>
        <p>Open a request, continue the thread, or confirm a released price.</p>
      </div>

      <div className="request-list">
        {requests.map((request) => (
          <button
            className="request-row"
            key={request.id}
            onClick={() => openRequest(request.id, "user")}
          >
            <div>
              <strong>{request.id}</strong>
              <span>{request.title}</span>
            </div>
            <div className="request-row-meta">
              <StatusBadge status={request.status} />
              <small>{request.updated}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
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
  sendMessage,
  confirmRequest,
  showPayment
}) {
  return (
    <section className="request-workspace">
      <div className="thread-layout">
        <div className="thread-main">
          <ThreadHeader request={request} />
          <MessageList request={request} perspective={perspective} />
          <UserComposer
            value={composerValue}
            setValue={setComposerValue}
            files={composerFiles}
            uploadRef={uploadRef}
            handleUpload={handleUpload}
            sendMessage={sendMessage}
          />
        </div>

        <RequestSidePanel
          request={request}
          confirmRequest={confirmRequest}
          showPayment={showPayment}
        />
      </div>
    </section>
  );
}

function ThreadHeader({ request }) {
  return (
    <header className="thread-header">
      <div className="thread-title">
        <div>
          <span className="eyebrow">Request</span>
          <h1>{request.id}</h1>
          <p>{request.title}</p>
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
          <ContentBlock block={block} request={request} key={`${message.id}-${index}`} />
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
  const tone = message.role === "customer" ? "user" : message.tone === "draft" ? "draft" : "easy";

  return (
    <article className={`message message-${tone}`}>
      <div className="message-avatar">
        {message.role === "customer" ? <UserCircle size={18} /> : <Cable size={18} />}
      </div>
      <div className="message-body">
        <div className="message-meta">
          <span>{actor}</span>
          <time>{message.createdAt}</time>
        </div>
        {message.blocks.map((block, index) => (
          <ContentBlock block={block} request={request} key={`${message.id}-${index}`} />
        ))}
      </div>
    </article>
  );
}

function ContentBlock({ block, request }) {
  if (block.type === "text") return <p>{block.text}</p>;

  if (block.type === "attachments") {
    return (
      <div className="file-strip compact">
        {block.files.map((file) => (
          <FileChip file={file} key={file} />
        ))}
      </div>
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
          Easy Harness has organized your request into a preliminary draft. It is
          now in review before release.
        </p>
      </div>
    );
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
          <strong>Price updated</strong>
          <p>${block.amount} · Ready to confirm</p>
        </div>
      </div>
    );
  }

  if (block.type === "table") return <BomTable />;
  if (block.type === "preview") return <HarnessPreview />;
  return null;
}

function UserComposer({
  value,
  setValue,
  files,
  uploadRef,
  handleUpload,
  sendMessage
}) {
  return (
    <div className="composer-shell">
      {!!files.length && (
        <div className="composer-files">
          {files.map((file) => (
            <FileChip file={file} key={file} />
          ))}
        </div>
      )}
      <div className="thread-composer">
        <button className="attach-button" onClick={() => uploadRef.current?.click()}>
          <Plus size={19} />
        </button>
        <input ref={uploadRef} type="file" multiple hidden onChange={handleUpload} />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") sendMessage();
          }}
          placeholder="Add details or upload more files..."
        />
        <button className="composer-tool" onClick={() => uploadRef.current?.click()} aria-label="Attach file">
          <FileText size={18} />
        </button>
        <button className="send-button small" onClick={sendMessage} aria-label="Send">
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

function RequestSidePanel({ request, confirmRequest, showPayment }) {
  const ready = request.status === "ready_to_confirm";
  const confirmed = request.status === "confirmed";
  const paid = request.status === "paid";
  const canPay = confirmed || paid;

  return (
    <aside className="request-side-panel">
      <div className="side-card price-card">
        <div className="price-header">
          <span>Harness price</span>
          {request.price ? <CircleDollarSign size={19} /> : <Clock3 size={19} />}
        </div>
        <div className={`price-value ${request.price ? "ready" : ""}`}>
          {request.price ? `$${request.price}` : "In review"}
        </div>
        <p>
          {request.price
            ? "Review the latest thread update, then confirm when the draft works for your device."
            : "The price appears here when the request is ready for confirmation."}
        </p>
        <button
          className="pay-button"
          disabled={!ready}
          onClick={confirmRequest}
        >
          {ready ? <Check size={17} /> : <Lock size={17} />}
          {ready ? "Confirm draft" : confirmed || paid ? "Confirmed" : "Confirm locked"}
        </button>
        <button
          className="secondary-action"
          disabled={!canPay || paid}
          onClick={showPayment}
        >
          {paid ? "Paid" : "Continue to payment"}
        </button>
      </div>
      <div className="side-card">
        <WorkflowProgress status={request.status} />
      </div>
    </aside>
  );
}

function StaffApp({
  requests,
  activeRequest,
  staffView,
  setStaffView,
  openRequest,
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
  sendStaffUpdate
}) {
  return (
    <div className="staff-shell">
      <aside className="staff-sidebar">
        <div className="staff-logo">
          <Cable size={22} />
          <span>Easy Harness Ops</span>
        </div>
        <button
          className={`staff-nav ${staffView === "queue" ? "active" : ""}`}
          onClick={() => setStaffView("queue")}
        >
          Queue
        </button>
        <button
          className={`staff-nav ${staffView === "detail" ? "active" : ""}`}
          onClick={() => setStaffView("detail")}
        >
          Active request
        </button>
        <button className="staff-nav" onClick={() => (window.location.hash = "")}>
          User app
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
      </aside>

      <main className="staff-main">
        {staffView === "queue" ? (
          <StaffQueue requests={requests} openRequest={openRequest} />
        ) : (
          <StaffDetail
            request={activeRequest}
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

function StaffQueue({ requests, openRequest }) {
  return (
    <section className="staff-page">
      <header className="staff-header">
        <div>
          <span className="eyebrow">Ops console</span>
          <h1>Request queue</h1>
          <p>Every row opens the same request thread that the customer sees.</p>
        </div>
        <button className="drawer-close" onClick={() => (window.location.hash = "")}>
          User view
        </button>
      </header>

      <div className="staff-queue">
        {requests.map((request) => (
          <button
            className="staff-queue-row"
            key={request.id}
            onClick={() => openRequest(request.id, "staff")}
          >
            <div>
              <strong>{request.id}</strong>
              <span>{request.title}</span>
            </div>
            <StatusBadge status={request.status} />
            <small>{request.updated}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function StaffDetail({
  request,
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
  sendStaffUpdate
}) {
  return (
    <section className="staff-page staff-detail-page">
      <header className="staff-header sticky-staff-header">
        <div>
          <span className="eyebrow">Ops console</span>
          <h1>{request.id}</h1>
          <p>{request.title} · {statusCopy[request.status]}</p>
        </div>
        <button className="drawer-close" onClick={() => (window.location.hash = "")}>
          User view
        </button>
      </header>

      <div className="staff-detail-layout">
        <div className="staff-thread-pane">
          <MessageList request={request} perspective="staff" />
        </div>
        <aside className="staff-price-pane">
          <div className="side-card price-card">
            <h2>Confirmation</h2>
            <label className="field">
              <span>Harness price</span>
              <input
                value={staffPrice}
                onChange={(event) => setStaffPrice(event.target.value)}
                placeholder={request.price ? request.price : "Optional until ready"}
              />
            </label>
            <p>
              Updating the price creates a small thread record for both sides.
              Leaving it empty sends only the message content.
            </p>
            <button className="secondary-action" onClick={sendStaffUpdate}>
              Record price update
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
  sendUpdate
}) {
  return (
    <div className="staff-composer-shell">
      <div className="staff-composer">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Reply as Easy Harness..."
          rows={1}
        />
        <input
          value={attachment}
          onChange={(event) => setAttachment(event.target.value)}
          placeholder="Attachment file name"
        />
        <button
          className={`composer-toggle ${includeTable ? "active" : ""}`}
          onClick={() => setIncludeTable((current) => !current)}
          type="button"
        >
          <FileSpreadsheet size={16} />
          Table
        </button>
        <button
          className={`composer-toggle ${includePreview ? "active" : ""}`}
          onClick={() => setIncludePreview((current) => !current)}
          type="button"
        >
          <ImageIcon size={16} />
          Preview
        </button>
        <button className="send-button small" type="button" onClick={sendUpdate}>
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const label = statusCopy[status] || status;
  const className =
    status === "ready_to_confirm"
      ? "ready"
      : status === "confirmed" || status === "paid"
        ? "success"
        : status === "in_review"
          ? "review"
          : "neutral";
  return <span className={`list-status ${className}`}>{label}</span>;
}

function FileChip({ file }) {
  return (
    <span className="file-chip">
      <File size={14} />
      {file}
    </span>
  );
}

function HarnessPreview() {
  return (
    <div className="inline-preview">
      <svg viewBox="0 0 520 180" aria-hidden="true">
        <path d="M48 88h142c40 0 68-28 112-28h164" />
        <path d="M190 88c50 0 78 42 132 42h144" />
        <rect x="24" y="58" width="48" height="60" rx="8" />
        <rect x="446" y="32" width="52" height="56" rx="8" />
        <rect x="446" y="100" width="52" height="56" rx="8" />
        <circle cx="190" cy="88" r="8" />
      </svg>
    </div>
  );
}

function BomTable() {
  return (
    <table className="bom-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Draft detail</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Harness type</td>
          <td>Controller to dual sensor lead</td>
          <td>Ready</td>
        </tr>
        <tr>
          <td>Length</td>
          <td>Approx. 1 m</td>
          <td>Ready</td>
        </tr>
        <tr>
          <td>Quantity</td>
          <td>5 pcs</td>
          <td>Ready</td>
        </tr>
      </tbody>
    </table>
  );
}

function PaymentModal({ price, close, markPaid }) {
  return (
    <div className="modal-backdrop">
      <div className="payment-modal">
        <div className="modal-icon">
          <CreditCard size={25} />
        </div>
        <h2>Payment placeholder</h2>
        <p>
          Harness price is ${price}. Shipping, tax, and merchant checkout are outside
          this prototype, but the request state can move to paid.
        </p>
        <div className="modal-actions">
          <button className="secondary-action" onClick={close}>Back</button>
          <button className="publish-button" onClick={markPaid}>Mark as paid</button>
        </div>
      </div>
    </div>
  );
}

export default App;
