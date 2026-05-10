# Easy Harness UX Polish V1

This patch improves the customer-facing platform experience without changing the Agent backend or database schema.

## Changed files

- `src/App.jsx`
- `src/styles.css`

## Main changes

1. Simplified the home hero copy.
2. Removed the repeated center logo from the home hero.
3. Improved Google / Microsoft / Apple sign-in button layout with platform-style account options.
4. Improved Google sign-in waiting state with a clearer "Opening Google sign-in" loading view.
5. Reworked the right-side request panel into a compact customer-facing status summary.
6. Hidden the harness price card unless a quote/price/confirmation state exists.
7. Removed the duplicate right-side workflow progress card.
8. Kept the full intake details behind a "View full intake draft" expandable section.

## Validation

Ran successfully:

```bash
npm run build
npm run test
```

## Deploy notes

Only frontend files changed. Push to GitHub and let Vercel redeploy.
No Supabase Edge Function deployment is required for this patch.
