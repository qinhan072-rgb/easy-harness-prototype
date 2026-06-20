import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Mail,
  Phone,
  Plus,
  Trash2,
  Upload,
  User,
} from "lucide-react";

const engineeringExtensions = [
  ".pdf",
  ".dwg",
  ".dxf",
  ".step",
  ".stp",
  ".igs",
  ".iges",
  ".stl",
  ".xlsx",
  ".xls",
  ".xlsm",
  ".csv",
  ".tsv",
  ".zip",
  ".7z",
  ".rar",
];

const supportingExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".heic",
  ".doc",
  ".docx",
  ".txt",
];

const acceptedUploadExtensions = [
  ...engineeringExtensions,
  ...supportingExtensions,
];

const maxUploadFileSizeBytes = 25 * 1024 * 1024;

const steps = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Design package" },
  { id: 3, label: "Timeline" },
  { id: 4, label: "Review" },
];

const leadTimeOptions = [
  {
    id: "rush",
    title: "Rush review",
    subtitle: "Fastest engineering response",
    detail: "1-2 business days",
    note: "May include expedite fees",
  },
  {
    id: "standard",
    title: "Standard review",
    subtitle: "Recommended for most uploads",
    detail: "2-4 business days",
    note: "Base review path",
  },
  {
    id: "flexible",
    title: "Flexible review",
    subtitle: "Best when timing is open",
    detail: "5-10 business days",
    note: "Lowest pressure path",
  },
];

const substitutionOptions = [
  "Exact parts only",
  "Equivalent parts allowed after approval",
  "Easy Harness may recommend alternatives",
];

const toleranceOptions = [
  "Follow drawing",
  "Standard harness tolerance",
  "Easy Harness to review",
];

function uploadId(prefix = "upload") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function extensionFromName(name = "") {
  const normalized = String(name || "").toLowerCase();
  const index = normalized.lastIndexOf(".");
  return index >= 0 ? normalized.slice(index) : "";
}

function categoryForExtension(extension) {
  if (engineeringExtensions.includes(extension)) return "engineering_source";
  if (supportingExtensions.includes(extension)) return "supporting_reference";
  return "unsupported";
}

function formatFileSize(size = 0) {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultHarness(index = 0) {
  return {
    id: uploadId("harness"),
    name: index ? `Harness ${index + 1}` : "Harness 1",
    files: [],
    quantities: [10, 50, 100],
    substitution: substitutionOptions[1],
    tolerance: toleranceOptions[0],
    notes: "",
  };
}

function fileDraftFromBrowserFile(file, harness) {
  const extension = extensionFromName(file.name);
  return {
    id: uploadId("file"),
    name: file.name,
    displayName: file.name,
    size: file.size || 0,
    type: file.type || "application/octet-stream",
    source: "upload_design",
    sourceFile: file,
    extension,
    category: categoryForExtension(extension),
    harnessId: harness.id,
    harnessName: harness.name,
  };
}

function cleanFileMetadata(file = {}) {
  return {
    id: file.id,
    name: file.name,
    displayName: file.displayName || file.name,
    size: file.size || 0,
    type: file.type || "application/octet-stream",
    extension: file.extension || extensionFromName(file.name),
    category: file.category || categoryForExtension(extensionFromName(file.name)),
    harnessId: file.harnessId || "",
    harnessName: file.harnessName || "",
  };
}

function isEmailLike(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function sanitizeQuantity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.round(number));
}

export default function UploadDesignRequest({
  activeMode = "upload",
  onSwitchMode,
  onSubmitUploadDesign,
  submitting = false,
  currentUser,
}) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [contact, setContact] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: "",
    company: "",
    projectName: "New uploaded harness design",
  });
  const [harnesses, setHarnesses] = useState([defaultHarness(0)]);
  const [activeHarnessId, setActiveHarnessId] = useState("");
  const [fileTargetHarnessId, setFileTargetHarnessId] = useState("");
  const [leadTimeId, setLeadTimeId] = useState("standard");
  const [reviewChecked, setReviewChecked] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dragHarnessId, setDragHarnessId] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!activeHarnessId && harnesses[0]) setActiveHarnessId(harnesses[0].id);
  }, [activeHarnessId, harnesses]);

  useEffect(() => {
    setContact((current) => ({
      ...current,
      name: current.name || currentUser?.name || "",
      email: current.email || currentUser?.email || "",
    }));
  }, [currentUser?.email, currentUser?.name]);

  const activeHarness =
    harnesses.find((harness) => harness.id === activeHarnessId) || harnesses[0];

  const allFiles = useMemo(
    () => harnesses.flatMap((harness) => harness.files || []),
    [harnesses],
  );

  const engineeringFileCount = allFiles.filter(
    (file) => file.category === "engineering_source",
  ).length;

  const supportingFileCount = allFiles.filter(
    (file) => file.category === "supporting_reference",
  ).length;

  const totalQuantityCount = harnesses.reduce(
    (sum, harness) => sum + (harness.quantities || []).length,
    0,
  );

  const leadTime =
    leadTimeOptions.find((option) => option.id === leadTimeId) ||
    leadTimeOptions[1];

  function updateContact(field, value) {
    setContact((current) => ({ ...current, [field]: value }));
  }

  function updateHarness(id, patch) {
    setHarnesses((current) =>
      current.map((harness) =>
        harness.id === id
          ? {
              ...harness,
              ...(typeof patch === "function" ? patch(harness) : patch),
            }
          : harness,
      ),
    );
  }

  function addHarness() {
    const next = defaultHarness(harnesses.length);
    setHarnesses((current) => [...current, next]);
    setActiveHarnessId(next.id);
  }

  function removeHarness(id) {
    if (harnesses.length <= 1) return;
    setHarnesses((current) => current.filter((harness) => harness.id !== id));
    if (activeHarnessId === id) {
      const next = harnesses.find((harness) => harness.id !== id);
      setActiveHarnessId(next?.id || "");
    }
  }

  function addFilesToHarness(id, files) {
    const target = harnesses.find((harness) => harness.id === id);
    if (!target) return;
    const drafts = Array.from(files || []).map((file) =>
      fileDraftFromBrowserFile(file, target),
    );
    const oversized = drafts.find((file) => file.size > maxUploadFileSizeBytes);
    const unsupported = drafts.find((file) => file.category === "unsupported");
    if (oversized) {
      setFormError(`${oversized.name} is larger than 25 MB.`);
      return;
    }
    if (unsupported) {
      setFormError(
        `${unsupported.name} is not accepted here. Use CAD, drawing, spreadsheet, CSV/TSV, PDF, or an archive; use the AI Agent for rough references.`,
      );
      return;
    }
    setFormError("");
    updateHarness(id, (harness) => ({
      files: [...(harness.files || []), ...drafts],
    }));
  }

  function removeFile(harnessId, fileId) {
    updateHarness(harnessId, (harness) => ({
      files: (harness.files || []).filter((file) => file.id !== fileId),
    }));
  }

  function browseFiles(harnessId) {
    setFileTargetHarnessId(harnessId);
    fileInputRef.current?.click();
  }

  function addQuantity(harnessId) {
    updateHarness(harnessId, (harness) => ({
      quantities: [...(harness.quantities || []), 250],
    }));
  }

  function updateQuantity(harnessId, index, value) {
    updateHarness(harnessId, (harness) => ({
      quantities: (harness.quantities || []).map((quantity, quantityIndex) =>
        quantityIndex === index ? sanitizeQuantity(value) : quantity,
      ),
    }));
  }

  function removeQuantity(harnessId, index) {
    updateHarness(harnessId, (harness) => {
      const next = (harness.quantities || []).filter(
        (_, quantityIndex) => quantityIndex !== index,
      );
      return { quantities: next.length ? next : [1] };
    });
  }

  function validateStep(targetStep = step) {
    if (targetStep >= 1) {
      if (!contact.name.trim()) return "Enter the contact name for this quote.";
      if (!isEmailLike(contact.email))
        return "Enter a valid email for quote communication.";
      if (!contact.projectName.trim()) return "Enter a project name.";
    }
    if (targetStep >= 2) {
      const missingName = harnesses.find((harness) => !harness.name.trim());
      if (missingName) return "Name each harness in the upload package.";
      if (!allFiles.length) return "Attach at least one design file.";
      if (!engineeringFileCount) {
        return "Upload design requires at least one engineering source file such as PDF, CAD, STEP, spreadsheet, CSV, TSV, or ZIP. Use the AI Agent for rough ideas, photos, or hand sketches.";
      }
    }
    if (targetStep >= 4) {
      if (!reviewChecked) return "Review the package checklist before submitting.";
      if (!termsAccepted) return "Accept the quote request terms before submitting.";
    }
    return "";
  }

  function goNext() {
    const error = validateStep(step);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError("");
    setStep((current) => Math.min(current + 1, 4));
  }

  function goPrevious() {
    setFormError("");
    setStep((current) => Math.max(current - 1, 1));
  }

  async function submitPackage() {
    const error = validateStep(4);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError("");
    const cleanHarnesses = harnesses.map((harness) => ({
      id: harness.id,
      name: harness.name.trim(),
      quantities: (harness.quantities || []).map(sanitizeQuantity),
      substitution: harness.substitution,
      tolerance: harness.tolerance,
      notes: harness.notes.trim(),
      files: (harness.files || []).map(cleanFileMetadata),
    }));
    const payload = {
      schemaVersion: "easy-harness.upload-design.v1",
      source: "upload_design",
      title: contact.projectName.trim(),
      contact: {
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        company: contact.company.trim(),
      },
      harnesses: cleanHarnesses,
      files: allFiles.map(cleanFileMetadata),
      fileDrafts: allFiles,
      leadTime,
      qualityGate: {
        engineeringFileCount,
        supportingFileCount,
        acceptedExtensions: engineeringExtensions,
        supportingExtensions,
      },
      checklist: {
        reviewedPreparedDesign: reviewChecked,
        acceptedTerms: termsAccepted,
      },
      reviewItems: [
        "Manufacturability and connector availability",
        "File completeness and drawing tolerance",
        "Final price, lead time, and shipping path",
      ],
      submittedAt: new Date().toISOString(),
    };
    try {
      await onSubmitUploadDesign?.(payload);
    } catch (error) {
      setFormError(
        error?.message || "This design package could not be submitted.",
      );
    }
  }

  return (
    <div className="upload-design-shell">
      <header className="upload-design-header">
        <div>
          <span className="eyebrow">New request</span>
          <h1>Upload prepared harness design</h1>
          <p>
            Send finished drawings, CAD, spreadsheets, or quote packages for
            Easy Harness engineering review.
          </p>
        </div>
        <div className="request-entry-switch compact" aria-label="Request entry mode">
          <button
            className={activeMode === "agent" ? "active" : ""}
            onClick={() => onSwitchMode?.("agent")}
            type="button"
          >
            Chat with Easy Harness AI Agent
          </button>
          <button
            className={activeMode === "canvas" ? "active" : ""}
            onClick={() => onSwitchMode?.("canvas")}
            type="button"
          >
            Canvas configurator
          </button>
          <button
            className={activeMode === "upload" ? "active" : ""}
            onClick={() => onSwitchMode?.("upload")}
            type="button"
          >
            Upload design
          </button>
        </div>
      </header>

      <main className="upload-design-main">
        <Stepper step={step} />

        <section className="upload-card">
          <div className="upload-card-header">
            <div>
              <h2>{steps[step - 1].label}</h2>
              <p>{stepCopy(step)}</p>
            </div>
            <span>Step {step} of 4</span>
          </div>

          {step === 1 && (
            <ContactStep contact={contact} updateContact={updateContact} />
          )}

          {step === 2 && (
            <DesignPackageStep
              harnesses={harnesses}
              activeHarness={activeHarness}
              activeHarnessId={activeHarnessId}
              setActiveHarnessId={setActiveHarnessId}
              addHarness={addHarness}
              removeHarness={removeHarness}
              updateHarness={updateHarness}
              browseFiles={browseFiles}
              removeFile={removeFile}
              addQuantity={addQuantity}
              updateQuantity={updateQuantity}
              removeQuantity={removeQuantity}
              addFilesToHarness={addFilesToHarness}
              dragHarnessId={dragHarnessId}
              setDragHarnessId={setDragHarnessId}
              engineeringFileCount={engineeringFileCount}
              supportingFileCount={supportingFileCount}
            />
          )}

          {step === 3 && (
            <TimelineStep
              leadTimeId={leadTimeId}
              setLeadTimeId={setLeadTimeId}
              leadTime={leadTime}
            />
          )}

          {step === 4 && (
            <ReviewStep
              contact={contact}
              harnesses={harnesses}
              leadTime={leadTime}
              engineeringFileCount={engineeringFileCount}
              supportingFileCount={supportingFileCount}
              totalQuantityCount={totalQuantityCount}
              reviewChecked={reviewChecked}
              setReviewChecked={setReviewChecked}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
            />
          )}

          {formError && (
            <div className="upload-form-error">
              <AlertTriangle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="upload-actions">
            <button
              className="secondary-action upload-nav-button"
              onClick={goPrevious}
              disabled={step === 1 || submitting}
              type="button"
            >
              <ChevronLeft size={17} />
              Previous
            </button>
            {step < 4 ? (
              <button className="primary-action upload-nav-button" onClick={goNext} type="button">
                Continue
                <ChevronRight size={17} />
              </button>
            ) : (
              <button
                className="primary-action upload-nav-button"
                onClick={submitPackage}
                disabled={submitting}
                type="button"
              >
                {submitting ? <Clock3 size={17} /> : <Upload size={17} />}
                {submitting ? "Submitting" : "Submit for quote review"}
              </button>
            )}
          </div>
        </section>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        accept={acceptedUploadExtensions.join(",")}
        onChange={(event) => {
          addFilesToHarness(fileTargetHarnessId || activeHarness?.id, event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function stepCopy(step) {
  if (step === 1)
    return "Confirm the contact for this specific upload, even if the account belongs to a teammate.";
  if (step === 2)
    return "Attach engineering-ready files and quantity breaks for each harness.";
  if (step === 3) return "Choose the review speed you want us to price against.";
  return "Check the package before Easy Harness engineering starts quote review.";
}

function Stepper({ step }) {
  return (
    <div className="upload-stepper" aria-label="Upload design steps">
      {steps.map((item) => {
        const complete = item.id < step;
        const active = item.id === step;
        return (
          <div
            key={item.id}
            className={`upload-step ${complete ? "complete" : ""} ${active ? "active" : ""}`}
          >
            <span>{complete ? <Check size={14} /> : item.id}</span>
            <strong>{item.label}</strong>
          </div>
        );
      })}
    </div>
  );
}

function ContactStep({ contact, updateContact }) {
  return (
    <div className="upload-grid two-columns">
      <UploadField label="Contact name" required icon={<User size={17} />}>
        <input
          value={contact.name}
          onChange={(event) => updateContact("name", event.target.value)}
          placeholder="Name for this quote"
        />
      </UploadField>
      <UploadField label="Email" required icon={<Mail size={17} />}>
        <input
          value={contact.email}
          onChange={(event) => updateContact("email", event.target.value)}
          placeholder="quote-contact@example.com"
        />
      </UploadField>
      <UploadField label="Phone" icon={<Phone size={17} />}>
        <input
          value={contact.phone}
          onChange={(event) => updateContact("phone", event.target.value)}
          placeholder="Optional"
        />
      </UploadField>
      <UploadField label="Company" icon={<Building2 size={17} />}>
        <input
          value={contact.company}
          onChange={(event) => updateContact("company", event.target.value)}
          placeholder="Optional"
        />
      </UploadField>
      <UploadField label="Project name" required className="full">
        <input
          value={contact.projectName}
          onChange={(event) => updateContact("projectName", event.target.value)}
          placeholder="Control panel harness revision A"
        />
        <small>
          This name appears in Requests and quote communication for this upload.
        </small>
      </UploadField>
    </div>
  );
}

function UploadField({ label, required = false, icon, children, className = "" }) {
  return (
    <label className={`upload-field ${className}`}>
      <span>
        {label}
        {required ? <em>*</em> : null}
      </span>
      <div className="upload-input-shell">
        {icon}
        {children}
      </div>
    </label>
  );
}

function DesignPackageStep({
  harnesses,
  activeHarness,
  activeHarnessId,
  setActiveHarnessId,
  addHarness,
  removeHarness,
  updateHarness,
  browseFiles,
  removeFile,
  addQuantity,
  updateQuantity,
  removeQuantity,
  addFilesToHarness,
  dragHarnessId,
  setDragHarnessId,
  engineeringFileCount,
  supportingFileCount,
}) {
  return (
    <div className="upload-package">
      <div className="upload-quality-gate">
        <AlertTriangle size={17} />
        <div>
          <strong>Engineering source required</strong>
          <p>
            Upload design is for prepared quote packages. Include at least one
            drawing, CAD, STEP, spreadsheet, CSV/TSV, PDF, or archive. Photos
            and notes can be attached only as supporting references.
          </p>
        </div>
      </div>

      <div className="upload-spec-layout">
        <aside className="upload-harness-list">
          <div className="upload-harness-list-top">
            <strong>Harnesses</strong>
            <small>Click one to edit</small>
          </div>
          {harnesses.map((harness) => (
            <button
              key={harness.id}
              className={`upload-harness-tab ${harness.id === activeHarnessId ? "active" : ""}`}
              onClick={() => setActiveHarnessId(harness.id)}
              type="button"
            >
              <FileText size={16} />
              <span>
                <strong>{harness.name || "Unnamed harness"}</strong>
                <small>
                  {(harness.files || []).length} files,{" "}
                  {(harness.quantities || []).length} quantities
                </small>
              </span>
            </button>
          ))}
          <button className="upload-add-harness" onClick={addHarness} type="button">
            <Plus size={16} />
            Add another harness
          </button>
        </aside>

        {activeHarness && (
          <div className="upload-harness-panel">
            <div className="upload-harness-title-row">
              <UploadField label="Harness name" required>
                <input
                  value={activeHarness.name}
                  onChange={(event) =>
                    updateHarness(activeHarness.id, { name: event.target.value })
                  }
                  placeholder="Power supply harness"
                />
              </UploadField>
              <button
                className="icon-text-button danger"
                onClick={() => removeHarness(activeHarness.id)}
                disabled={harnesses.length <= 1}
                type="button"
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>

            <button
              className={`upload-dropzone ${dragHarnessId === activeHarness.id ? "dragging" : ""}`}
              onClick={() => browseFiles(activeHarness.id)}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragHarnessId(activeHarness.id);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setDragHarnessId("");
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragHarnessId("");
                addFilesToHarness(activeHarness.id, event.dataTransfer.files);
              }}
              type="button"
            >
              <Upload size={30} />
              <strong>Drag files here or click to browse</strong>
              <span>
                PDF, CAD, STEP, spreadsheets, CSV/TSV, ZIP, plus supporting
                images or notes.
              </span>
            </button>

            {!!activeHarness.files?.length && (
              <div className="upload-file-list">
                {activeHarness.files.map((file) => (
                  <div className="upload-file-row" key={file.id}>
                    <FileText size={16} />
                    <div>
                      <strong>{file.displayName || file.name}</strong>
                      <small>
                        {file.category === "engineering_source"
                          ? "Engineering source"
                          : "Supporting reference"}{" "}
                        - {formatFileSize(file.size)}
                      </small>
                    </div>
                    <button
                      onClick={() => removeFile(activeHarness.id, file.id)}
                      type="button"
                      aria-label={`Remove ${file.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="upload-count-strip">
              <span>{engineeringFileCount} engineering source file</span>
              <span>{supportingFileCount} supporting reference file</span>
            </div>

            <div className="upload-quantity-section">
              <div className="upload-section-title">
                <strong>Quote quantities</strong>
                <small>Ask for one or more price breaks.</small>
              </div>
              <div className="upload-quantity-grid">
                {(activeHarness.quantities || []).map((quantity, index) => (
                  <label className="upload-quantity-card" key={`${activeHarness.id}-${index}`}>
                    <span>Quantity {String.fromCharCode(65 + index)}</span>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(event) =>
                        updateQuantity(activeHarness.id, index, event.target.value)
                      }
                    />
                    <button
                      onClick={() => removeQuantity(activeHarness.id, index)}
                      type="button"
                      aria-label="Remove quantity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </label>
                ))}
              </div>
              <button
                className="dashed-button"
                onClick={() => addQuantity(activeHarness.id)}
                type="button"
              >
                <Plus size={15} />
                Add another quantity
              </button>
            </div>

            <div className="upload-grid two-columns tight">
              <UploadField label="Component substitution">
                <select
                  value={activeHarness.substitution}
                  onChange={(event) =>
                    updateHarness(activeHarness.id, {
                      substitution: event.target.value,
                    })
                  }
                >
                  {substitutionOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </UploadField>
              <UploadField label="Tolerancing">
                <select
                  value={activeHarness.tolerance}
                  onChange={(event) =>
                    updateHarness(activeHarness.id, { tolerance: event.target.value })
                  }
                >
                  {toleranceOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </UploadField>
              <UploadField label="Design notes" className="full">
                <textarea
                  value={activeHarness.notes}
                  onChange={(event) =>
                    updateHarness(activeHarness.id, { notes: event.target.value })
                  }
                  placeholder="Special materials, labels, shielding, packaging, testing, or assembly notes..."
                  rows={4}
                />
              </UploadField>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineStep({ leadTimeId, setLeadTimeId, leadTime }) {
  return (
    <div className="upload-timeline">
      <div className="upload-lead-grid">
        {leadTimeOptions.map((option) => (
          <button
            key={option.id}
            className={`upload-lead-card ${leadTimeId === option.id ? "active" : ""}`}
            onClick={() => setLeadTimeId(option.id)}
            type="button"
          >
            <Clock3 size={19} />
            <span>
              <strong>{option.title}</strong>
              <small>{option.subtitle}</small>
              <em>{option.detail}</em>
            </span>
            {leadTimeId === option.id ? <Check size={15} /> : null}
          </button>
        ))}
      </div>
      <div className="upload-timeline-summary">
        <span>Estimated review timeline</span>
        <strong>{leadTime.detail}</strong>
        <p>
          Production lead time, shipping options, and final price are released
          after Easy Harness reviews the uploaded design package.
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  contact,
  harnesses,
  leadTime,
  engineeringFileCount,
  supportingFileCount,
  totalQuantityCount,
  reviewChecked,
  setReviewChecked,
  termsAccepted,
  setTermsAccepted,
}) {
  return (
    <div className="upload-review">
      <div className="upload-review-summary">
        <span>Quote request summary</span>
        <h3>{contact.projectName}</h3>
        <p>
          {contact.name} - {contact.email}
          {contact.company ? ` - ${contact.company}` : ""}
        </p>
      </div>
      <div className="upload-review-card">
        <strong>Harness specifications ({harnesses.length})</strong>
        {harnesses.map((harness) => (
          <div className="upload-review-harness" key={harness.id}>
            <div>
              <strong>{harness.name}</strong>
              <small>
                {(harness.files || []).length} file(s),{" "}
                {(harness.quantities || []).length} quantity break(s)
              </small>
            </div>
            <span>{(harness.quantities || []).join(", ")} units</span>
          </div>
        ))}
      </div>
      <div className="upload-review-card compact">
        <strong>Review path</strong>
        <p>
          {leadTime.title}: {leadTime.detail}. Final production lead time and
          shipping are provided with the quote.
        </p>
      </div>
      <div className="upload-review-card compact">
        <strong>File gate</strong>
        <p>
          {engineeringFileCount} engineering source file(s),{" "}
          {supportingFileCount} supporting reference file(s),{" "}
          {totalQuantityCount} quantity request(s).
        </p>
      </div>
      <div className="upload-checklist">
        <AlertTriangle size={17} />
        <div>
          <strong>Before submitting</strong>
          <label>
            <input
              type="checkbox"
              checked={reviewChecked}
              onChange={(event) => setReviewChecked(event.target.checked)}
            />
            I have reviewed the uploaded files, quantities, tolerances, and
            notes for this quote request.
          </label>
          <label>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
            />
            I understand Easy Harness will review manufacturability, connector
            availability, final price, lead time, and shipping before order
            release.
          </label>
        </div>
      </div>
      <div className="upload-next-card">
        <strong>What happens next?</strong>
        <ol>
          <li>Easy Harness receives the prepared design package.</li>
          <li>Engineering reviews files, quantities, tolerances, and part risks.</li>
          <li>A quote is released in the request thread.</li>
          <li>You confirm the quote before it becomes an order.</li>
        </ol>
      </div>
    </div>
  );
}
