# Qwen AI Provider Setup

Easy Harness runs the Draft Agent in the Supabase Edge Function
`run-checking`. The browser frontend must not store or expose the Qwen API key.

## Supabase Secrets

In Supabase Dashboard, open:

```text
Project Settings -> Edge Functions -> Secrets
```

Add:

```text
AI_DRAFT_PROVIDER=qwen
QWEN_API_KEY=<your Qwen/DashScope API key>
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MAX_TOKENS=12000
```

`QWEN_MODEL` can be changed later without changing frontend code. Keep the
Draft Agent contract stable even when testing another model.

Use the base URL that matches the Qwen API key region:

```text
China / Beijing: https://dashscope.aliyuncs.com/compatible-mode/v1
Singapore:       https://dashscope-intl.aliyuncs.com/compatible-mode/v1
US / Virginia:   https://dashscope-us.aliyuncs.com/compatible-mode/v1
```

## Deploy

After changing `supabase/functions/run-checking/index.ts`, deploy the Edge
Function:

```bash
supabase functions deploy run-checking
```

GitHub/Vercel redeploys update the frontend only. They do not deploy Supabase
Edge Function code.

## Fallback

DeepSeek can stay configured as a backup:

```text
DEEPSEEK_API_KEY=<optional fallback key>
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

If `AI_DRAFT_PROVIDER` is set to `qwen`, Qwen is used. If it is not set, the
function prefers Qwen when `QWEN_API_KEY` exists, otherwise it falls back to
DeepSeek.
