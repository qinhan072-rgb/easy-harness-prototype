# Upload With AI Assistance Test Cases

Last updated: 2026-06-30

These cases validate the fused request flow:

```text
Canvas configurator
Upload with AI assistance
```

The AI chat is a sidecar inside upload. It helps the user describe the current
package; it is not a separate entry path and it must not block submission.

## User Story 1: Old Harness Photos Only

User: maintenance buyer with photos of an old harness, not a harness engineer.

Steps:

1. Open `Upload with AI assistance`.
2. Upload old harness overview photo and connector photos.
3. Click `Check my photos` in AI Upload Chat.

Expected:

- AI says photos are useful but should include connector front pin face, rear
  wire exit, labels, wire colors, and a size reference.
- AI suggested note can be added to `Design notes`.
- The upload still requires one engineering source file before final submit,
  unless Easy Harness decides to relax that gate later.

## User Story 2: CAD File Only

User: mechanical designer with a STEP/DXF file but no pinout.

Steps:

1. Upload STEP or DXF.
2. Click `Explain CAD limits`.

Expected:

- AI explains CAD is useful for mechanical fit/routing.
- AI does not say CAD contains the electrical connection.
- AI asks for connection goal, endpoints, pinout, or another electrical source
  if available.

## User Story 3: Pinout Spreadsheet

User: automation technician with CSV/XLSX pinout.

Steps:

1. Upload CSV/XLSX.
2. Click `Check pinout table`.

Expected:

- AI suggests pin number, signal/function, wire color, gauge, destination,
  length, and quantity as useful columns.
- AI does not ask for crimp tooling, final terminal sourcing, BOM, or factory
  test process.

## User Story 4: Many Files, Unclear Main Source

User: purchasing person uploads ZIP, PDF, photos, and spreadsheet.

Steps:

1. Upload multiple mixed files.
2. Ask: `Which file should I explain?`

Expected:

- AI asks the user to identify the main source file and reference files.
- AI suggested note is short and customer-editable.
- User can add that note to the active harness and continue.

## User Story 5: Qwen / Supabase Live Preview

Preconditions:

- User is signed in through Supabase Auth.
- Supabase Edge Function `run-checking` is deployed.
- Supabase secrets include `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL`, and
  `AI_UPLOAD_ASSISTANT_PREVIEW_TIMEOUT_MS` if a custom timeout is wanted.

Steps:

1. Open `Upload with AI assistance`.
2. Upload at least one file or enter a harness note.
3. Type `Help me explain this package` in AI Upload Chat.
4. Send.

Expected:

- Frontend invokes `run-checking` with `mode: "upload_assistant_preview"`.
- Edge Function authenticates the user, calls Qwen, and returns compact JSON:
  `reply`, `suggestedNote`, `quickChecks`, `riskLevel`, `askNext`.
- The suggested note appears in the AI note box.
- Clicking `Add to design notes` writes it into the active harness notes.
- If Qwen or Supabase fails, the upload flow stays usable and shows a local
  fallback message.

## Evidence Boundary

Before final submission, AI Upload Chat sees only form state and file metadata.
It must not claim it has inspected image contents, OCR text, CAD geometry, or
spreadsheet rows. Real attachment observations happen after submission through
`run-checking` request-basis organization.
