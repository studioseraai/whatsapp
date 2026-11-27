# Studio Seraai — WhatsApp Art Concierge

Private operational backend and browser-only concierge simulator for Studio Seraai, Karachi.
- **Live backend:** Next.js on Vercel
- **Operations:** WhatsApp Management inside SERAAI OS (authenticated owner only)
- **Storage:** Existing Studio Seraai Supabase project
- **Real WhatsApp messages:** Not enabled until authorized Meta Cloud API / WhatsApp Business App Coexistence onboarding.

**Do not delete the existing WhatsApp Business mobile app, unregister or migrate its number through the non-coexistence flow.** No Meta connections or messages are performed during Phase 1.

## Test and deployment

The Vercel production build runs the automated Node/tsx test suite before compiling:

```sh
npm install
npm test
npm run build
npm run dev
```

The home page is a local-only demo. It doesn't create actual viewing requests, save contacts, or send WhatsApp messages.

## API

- `GET /api/health`: validates that the database can be accessed (no secrets are returned).
- `GET /api/webhook`: challenge verification after Meta onboarding.
- `POST /api/webhook`: accepts only Meta HMAC-SHA256 verified messages.
- `GET /api/maintenance`: restricted to Vercel Cron using a server-only `CRON_SECRET`, executes retention routine.

### Durable message processing

Inbound messages and their response drafts are staged atomically by the `seraai_whatsapp_stage_inbound` Postgres RPC.
Every incoming provider message ID is unique. Each reply has a unique reference back to that inbound ID and must be atomically claimed before sending. This prevents concurrent webhook deliveries from sending multiple copies of an unclaimed reply.

- `pending`: reply recorded, not yet sent.
- `sending`: request started. If confirmation is lost, a staff member must reconcile the outcome. An ambiguous attempt is **never automatically retried**.
- `sent`: Meta accepted the outbound message and its ID was recorded.
- `retry`: Meta explicitly rejected with HTTP 429; callback returns a retryable HTTP error and a subsequent verified webhook delivery can claim the same draft again, up to three attempts.
- `needs_review` / `failed`: human follow-up needed. Errors and stale sends are visible in SERAAI OS.

Human handoff suppresses further bot replies until the user requests MENU/START or an owner resumes the bot in OS. STOP, UNSUBSCRIBE and OPT OUT persist the opted-out state. START explicitly opts back in. The OS cannot send live replies until Meta activation.

### Public artwork safeguard

Art lookup uses `seraai_records` and the published `seraai_publications` allowlist. It excludes archived and sold-out artworks and never promises availability.

## Privacy, access, retention

Supabase WhatsApp conversations, messages and requests have RLS enabled and no anonymous/authenticated access. RPC functions only grant execution to the server role. The service secret remains only in production environment variables.

Every day, Vercel Cron calls the authenticated `/api/maintenance` route at **03:00 UTC**. The stored procedure removes:
- Inbound messages and safely sent outbound messages older than **180 days**.
- **Resolved** customer requests older than **365 days**.

Pending customer requests, delivery cases requiring review, and opt-out records are preserved for operational follow-up. Owner-controlled erasure and the gallery's formal privacy notice must be handled in accordance with applicable policy and law. Do not claim the README is the public privacy notice.

OS automatically refreshes requests every 30 seconds while open; its desktop notifications require explicit browser permission. It does **not** provide background mobile push notifications.

## Remaining activation prerequisites

Official Meta Business access, supported App Coexistence eligibility, API credentials and callback verification, template/message-window rules and **real-device end-to-end testing** remain outside non-Meta Phase 1.

Never commit `CRON_SECRET`, `SUPABASE_SECRET_KEY`, Meta access tokens, owner passwords, or phone data.
