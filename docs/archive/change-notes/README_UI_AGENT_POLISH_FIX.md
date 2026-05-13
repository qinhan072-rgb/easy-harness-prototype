# Easy Harness UI / Agent Display Polish Fix

Replace these files in the project:

- `src/App.jsx`
- `src/styles.css`

Then run:

```bash
npm install
npm run build
npm run test
git add src/App.jsx src/styles.css
git commit -m "Polish agent thread UI and request progress"
git push
```

This patch:

- Adds minute-level timestamps for request/thread messages.
- Removes the Start page "Use sample request" button.
- Removes the Pay stage from request progress bars.
- Formats Easy Harness agent replies with paragraphs and numbered lists instead of one flat paragraph.
- Adds polling for live Supabase requests so slower DeepSeek responses appear after the backend finishes.
- Keeps submit/send lock protection to reduce duplicate submissions.
