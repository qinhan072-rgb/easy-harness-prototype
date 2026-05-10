# Easy Harness UX Polish V2 + Agent Guardrail

Replace these files:

- `src/App.jsx`
- `src/styles.css`
- `supabase/functions/run-checking/index.ts`

What changed:

- Home hero is sharper: `Upload what you have. We’ll build the harness you need.`
- Removed the explanatory gray subtitle under the hero.
- Removed the rough Google/Microsoft/Apple fake icon marks from the auth modal.
- Google is now the only prominent connected sign-in button; Microsoft/Apple are shown as coming soon text.
- Request summary wording is less draft-heavy for the user.
- Agent replies are stricter when the user does not provide a real harness/connection goal.
- Agent replies ask at most 3 questions per turn.
- Agent avoids saying a draft is prepared when the submission only contains vague text or unrelated/reference attachments.

After replacing local files:

```bash
npm run build
npm run test
git add src/App.jsx src/styles.css supabase/functions/run-checking/index.ts
git commit -m "Polish hero auth and agent guardrails"
git push
```

Because `run-checking/index.ts` changed, also update Supabase:

Supabase → Edge Functions → run-checking → Code → replace `index.ts` → Deploy updates.
