# Easy Harness Draft v0.1 Reliability + UX Fix Patch

Replace these files in the project:

- `src/App.jsx`
- `src/styles.css`
- `supabase/functions/run-checking/index.ts`

Scope included:

1. Per-request independent AI checking. New requests and follow-up messages no longer depend on a single global thinking lock.
2. Same-request duplicate guards remain in place for request submission and message sending.
3. Supabase session restore no longer resets the user back to the Requests page on tab/window focus.
4. Request save failures no longer silently create local ghost requests when Supabase is configured.
5. AI checking failure now shows a user-visible fallback instead of disappearing silently.
6. Pending uploads can be removed before request submission or before sending a follow-up message.
7. Upload permission confirmation is remembered per user locally after acceptance.
8. Start screen shows a clearer submission progress card while creating/uploading/checking.
9. Ready-for-review results can render a structured Easy Harness draft card in the thread.
10. Right-side Request Summary separates user-needed details from Easy Harness review items.
11. Professional details captured are visible in full request details.
12. Agent prompt is adjusted generally for old-harness copy, power-load risk, connector-photo uncertainty, and ready-for-review summary ownership.

Not included:

- No quotation automation.
- No material confirmation.
- No supplier RFQ output.
- No connector/terminal library.
- No complex questionnaire.
- No production-ready factory form.
- No database schema migration.

Validation run:

- `npm run build` passed.
- `npm test -- --run` passed.
