# Studio Seraai — WhatsApp Art Concierge

Standalone Next.js application with a browser simulator, Meta webhook, and Supabase conversation storage. This does **not** require Meta credentials to build or preview.

## Run

`npm install && npm test && npm run build && npm run dev`

Open `/` for the simulated five-option concierge. `/api/health` shows configuration status. `/api/webhook` is dormant until Meta Business App Coexistence onboarding is completed.

## Existing Supabase project

Private RLS-protected tables: `seraai_whatsapp_conversations`, `seraai_whatsapp_messages`, `seraai_whatsapp_requests`. Only the server-side service key may access them. Artwork search reads existing `seraai_records` JSONB artwork data; search is limited to the first 1000 records and availability must be confirmed.

## Meta onboarding (later)

**Do not unregister the existing WhatsApp Business mobile app or migrate the number without supported coexistence onboarding.** After Meta setup, add `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFICATION_TOKEN`, `WHATSAPP_APP_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` in Vercel Environment Variables, never Git. Callback: `https://YOUR_DOMAIN/api/webhook`.

## Security and remaining launch tasks

Webhook POST requires valid Meta `X-Hub-Signature-256`. Tables are RLS-protected and inaccessible to anon/authenticated roles. Messages are deduplicated by provider ID; concurrency-safe queues/retries, staff inbox/notification, data retention, privacy policy, opt-out, and operational monitoring still require hardening before launch. Human handoff flags requests for staff and suppresses further automatic responses, but **does not itself notify a human**. The simulator is local browser-only and stores no data.
