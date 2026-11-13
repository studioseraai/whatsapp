import 'dotenv/config';
import express from 'express';
import { expressWebhookHandler } from 'meta-cloud-api';
import { answerFor } from './concierge.js';

const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WEBHOOK_VERIFICATION_TOKEN, WHATSAPP_APP_SECRET } = process.env;
const phoneNumberId = Number(WHATSAPP_PHONE_NUMBER_ID);
if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_WEBHOOK_VERIFICATION_TOKEN || !WHATSAPP_APP_SECRET || !Number.isSafeInteger(phoneNumberId) || phoneNumberId <= 0) {
  throw new Error('Missing/invalid WhatsApp configuration; configure the values documented in .env.example.');
}

const WhatsApp = expressWebhookHandler({
  accessToken: WHATSAPP_ACCESS_TOKEN,
  phoneNumberId,
  webhookVerificationToken: WHATSAPP_WEBHOOK_VERIFICATION_TOKEN,
  appSecret: WHATSAPP_APP_SECRET,
  verifyWebhookSignature: true,
});

WhatsApp.processor.onText(async (wa, processed) => {
  const { message } = processed;
  if (!message?.from || !message.text?.body) return;
  await wa.messages.text({ to: message.from, body: answerFor(message.text.body) });
});

const app = express();
app.disable('x-powered-by');
// WhatsApp webhook signatures require the original request body.
app.use(express.json({
  limit: '256kb',
  verify: (req, _res, buf) => { (req as express.Request & { rawBody?: string }).rawBody = buf.toString(); },
}));
app.get('/health', (_req, res) => res.status(200).json({ ok: true, service: 'studioseraai-whatsapp' }));
app.get('/webhook', WhatsApp.GET);
app.post('/webhook', WhatsApp.POST);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log('Studio Seraai WhatsApp webhook listening on port ' + port));
