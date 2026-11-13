# Studio Seraai — WhatsApp Art Concierge

WhatsApp Cloud API integration for Studio Seraai. This repository is separate from the public website and SERAAI OS.

## Base

Adapted from the webhook architecture demonstrated in [froggy1014/meta-cloud-api](https://github.com/froggy1014/meta-cloud-api/tree/main/examples/express-simple) (MIT license). This is a lightweight, standalone Node.js/TypeScript bot; it does not include Meta onboarding or automatically enable Business App Coexistence.

## Getting started

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and configure the actual credentials **locally or in your hosting provider**. Never commit `.env` or access tokens.
4. Run `npm run dev`.
5. Configure Meta's verified HTTPS webhook URL as `https://YOUR_HOST/webhook` and subscribe to WhatsApp messages after a supported coexistence onboarding.
6. Test the five menu routes with a Meta test number before production.

Run `npm run build` to compile and `npm start` to start the compiled service. Health endpoint: `GET /health`.

## Concierge menu

1. Explore Artworks
2. Meet Our Artists
3. Book a Private Viewing
4. Exhibitions & Events
5. Speak to Our Team

Current implementation provides safe message routing and menu placeholders. Live artwork lookup, persistent handoff, Supabase writes and approved outbound templates will be added in subsequent stages.

## Operational notes

- Use Meta-approved Business App Coexistence onboarding to keep the existing business number on the mobile app. Do not unregister or migrate the number through a normal API-only flow.
- Meta Cloud API access and approved templates are required for business-initiated conversations outside permitted windows.
- The bot should be hosted as a persistent HTTPS service; the example is not deployed yet.
- Rotate keys if credentials are accidentally shared.

## License

MIT — see `LICENSE`. Based on the upstream MIT-licensed example and adapted for Studio Seraai.
