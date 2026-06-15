# Auth Email and Google Setup

This file is the handoff for the live sign-in experience. The app already calls
Supabase Auth for email links and Google OAuth. Supabase still needs the email
templates and Google credentials configured in its dashboard.

## Email Templates

Open Supabase Dashboard -> Authentication -> Email. Replace the default
`Confirm signup` email with:

Subject:

```text
Confirm your Easy Harness account
```

HTML:

```html
<div style="margin:0;padding:0;background:#f5f8f7;font-family:Inter,Arial,sans-serif;color:#142522;">
  <div style="max-width:560px;margin:0 auto;padding:32px 18px;">
    <div style="background:#ffffff;border:1px solid #dce8e5;border-radius:12px;padding:30px;">
      <div style="font-weight:800;color:#008f83;font-size:16px;margin-bottom:24px;">Easy Harness</div>
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#142522;">Confirm your Easy Harness account</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#5d6b68;">
        Please confirm this email address to finish creating your account. Your account lets you save harness requests, review quotes, confirm orders, and receive order updates.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#07110f;color:#ffffff;text-decoration:none;font-weight:800;border-radius:8px;padding:13px 18px;">
        Confirm account
      </a>
      <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6f7b78;">
        If the button does not work, copy and paste this link into your browser:<br>
        <a href="{{ .ConfirmationURL }}" style="color:#008f83;word-break:break-all;">{{ .ConfirmationURL }}</a>
      </p>
      <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6f7b78;">
        If you did not request this account, you can safely ignore this email.
      </p>
    </div>
    <p style="text-align:center;margin:16px 0 0;font-size:12px;color:#7d8986;">
      Easy Harness
    </p>
  </div>
</div>
```

Replace the `Magic Link` or sign-in link email with:

Subject:

```text
Your Easy Harness sign-in link
```

HTML:

```html
<div style="margin:0;padding:0;background:#f5f8f7;font-family:Inter,Arial,sans-serif;color:#142522;">
  <div style="max-width:560px;margin:0 auto;padding:32px 18px;">
    <div style="background:#ffffff;border:1px solid #dce8e5;border-radius:12px;padding:30px;">
      <div style="font-weight:800;color:#008f83;font-size:16px;margin-bottom:24px;">Easy Harness</div>
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#142522;">Log in to Easy Harness</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#5d6b68;">
        Use this secure link to open your Easy Harness account and continue with your saved requests, quotes, and orders.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#07110f;color:#ffffff;text-decoration:none;font-weight:800;border-radius:8px;padding:13px 18px;">
        Log in
      </a>
      <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6f7b78;">
        If the button does not work, copy and paste this link into your browser:<br>
        <a href="{{ .ConfirmationURL }}" style="color:#008f83;word-break:break-all;">{{ .ConfirmationURL }}</a>
      </p>
      <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6f7b78;">
        If you did not request this link, you can safely ignore this email.
      </p>
    </div>
    <p style="text-align:center;margin:16px 0 0;font-size:12px;color:#7d8986;">
      Easy Harness
    </p>
  </div>
</div>
```

Before production, configure Supabase custom SMTP with the company email domain
so customers do not receive mail from the default Supabase sender.

## Google Sign-In

The front end now starts Google OAuth through Supabase. To make it work online:

1. Open Google Cloud Console and create an OAuth Client ID for a web application.
2. Add authorized JavaScript origins:
   - `https://easy-harness-prototype.vercel.app`
   - `http://127.0.0.1:5173`
   - `http://localhost:5173`
3. Add the Supabase callback URL from Supabase Dashboard -> Authentication ->
   Sign In / Providers -> Google. For the current staging project it is:
   `https://vobetjnlchuktzcijucy.supabase.co/auth/v1/callback`
4. Copy the Google Client ID and Client Secret into the Supabase Google provider
   settings, enable the provider, and save.
5. Test the Google button from the Vercel deployment.

## Redirect URLs

The front end uses the current browser origin for email and Google redirects.
Keep these URLs in Supabase Dashboard -> Authentication -> URL Configuration:

- `https://easy-harness-prototype.vercel.app/**`
- `http://127.0.0.1:5173/**`
- `http://localhost:5173/**`

If a new production domain is added, add that domain before testing sign-in.
`VITE_APP_BASE_URL` is only a non-browser fallback and should not force local,
preview, and production deployments to the same callback origin.
