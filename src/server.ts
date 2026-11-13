import 'dotenv/config';
import express from 'express';
import { webhookHandler } from 'meta-cloud-api/webhook/express';
import { answerFor } from './concierge.js';

const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WEBHOOK_VERIFICATION_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID } = process.env;
const phoneNumberId = Number(WHATSAPP_PHONE_NUMBER_ID);

if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_WEBHOOK_VERIFICATION_TOKEN || !Number.isSafeInteger(phoneNumberId) || phoneNumberId <= 0) {
  throw new Error('Missing WhatsApp configuration. Copy .env.example to .env and set valid Meta credentials.');
}

const WhatsApp = webhookHandler({
  accessToken: WHATSAPP_ACCESS_TOKEN,
  phoneNumberId,
  businessAcctId: WHATSAPP_BUSINESS_ACCOUNT_ID,
  webhookVerificationToken: WHATSAPP_WEBHOOK_VERIFICATION_TOKEN,
});

WhatsApp.processor.onText(async (whatsapp, message) => {
  if (!message.text?.body || !message.from) return;
  await whatsapp.messages.text({
    to: message.from,
    body: answerFor(message.text.body),
    previewUrl: false,
  });
});

WhatsApp.processor.onInteractive(async (whatsapp, message) => {
  const payload = message.interactive?.button_reply?.id
    ?? message.interactive?.list_reply?.id;
  if (!payload || !message.from) return;
  await whatsapp.messages.text({ to: message.from, body: answerFor(payload), previewUrl: false });
});

const app = express();
app.disable('x-powered-by');
app.get('/health', (_req, res) => res.status(200).json({ ok: true, service: 'studioseraai-whatsapp' }));
app.get('/webhook', WhatsApp.GET);
app.post('/webhook', express.json({ limit: '256kb' }), WhatsApp.POST);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log('Studio Seraai WhatsApp webhook listening on port ' + port));
