import 'dotenv/config';
import express from 'express';
import { middleware, validateSignature } from '@line/bot-sdk';
import { handleReply } from './webhook/handleReply.js';
import { run as runDailyLesson } from './jobs/dailyLesson.js';
import { run as runDailyQuiz } from './jobs/dailyQuiz.js';
import { run as runWeeklyReview } from './jobs/weeklyReview.js';

const app = express();
const PORT = process.env.PORT || 3000;

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Cron secret validator middleware
function verifyCronSecret(req, res, next) {
  const { secret } = req.query;
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Cron endpoints
app.get('/cron/daily-lesson', verifyCronSecret, async (req, res) => {
  console.log('[Cron] daily-lesson triggered');
  await runDailyLesson();
  res.json({ ok: true });
});

app.get('/cron/daily-quiz', verifyCronSecret, async (req, res) => {
  console.log('[Cron] daily-quiz triggered');
  await runDailyQuiz();
  res.json({ ok: true });
});

app.get('/cron/weekly-review', verifyCronSecret, async (req, res) => {
  console.log('[Cron] weekly-review triggered');
  await runWeeklyReview();
  res.json({ ok: true });
});

// LINE Webhook
app.post('/webhook', express.raw({ type: '*/*' }), (req, res) => {
  const signature = req.headers['x-line-signature'];
  const body = req.body;

  if (!validateSignature(body, lineConfig.channelSecret, signature)) {
    console.warn('[Webhook] Invalid signature');
    return res.status(403).send('Forbidden');
  }

  let parsed;
  try {
    parsed = JSON.parse(body.toString());
  } catch (e) {
    console.error('[Webhook] Failed to parse body:', e);
    return res.status(400).send('Bad Request');
  }

  const events = parsed.events || [];
  console.log(`[Webhook] Received ${events.length} event(s)`);

  // Process events asynchronously, respond 200 immediately
  res.status(200).send('OK');

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      handleReply(event).catch((err) => {
        console.error('[Webhook] handleReply error:', err);
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`[Server] English Bot listening on port ${PORT}`);
});
