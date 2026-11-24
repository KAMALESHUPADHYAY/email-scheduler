import { WebClient } from '@slack/web-api';
import { redis } from './redis';
import { logger } from './logger';

export async function sendSlackRateLimitAlert(params: {
  senderId: string;
  senderEmail: string;
  hourKey: string;
  hourlyLimit: number;
  slackToken?: string | null;
  slackChannel?: string | null;
}): Promise<boolean> {
  const { senderId, senderEmail, hourKey, hourlyLimit, slackToken, slackChannel } = params;

  if (!slackToken) {
    // If no token, skip silently — never crash
    logger.debug({ senderId }, 'No Slack token associated with user; skipping alert.');
    return false;
  }

  // Key to ensure alert is sent ONCE per sender per hour
  const alertDedupeKey = `slack_alert:${senderId}:${hourKey}`;

  try {
    // SETNX with 2 hours (7200 seconds) TTL
    const isNew = await redis.set(alertDedupeKey, 'sent', 'EX', 7200, 'NX');
    if (!isNew) {
      logger.info(
        { senderId, hourKey },
        'Slack alert already sent for this sender within the current hour.'
      );
      return false;
    }

    const client = new WebClient(slackToken);
    const targetChannel = slackChannel || '#general';

    await client.chat.postMessage({
      channel: targetChannel,
      text: `⚠️ *Email Rate Limit Alert* for sender \`${senderEmail}\`!\nHourly limit of *${hourlyLimit} emails* reached for hour *${hourKey}*.\nPending jobs are automatically rescheduled to the start of the next hour.`,
    });

    logger.info({ senderId, channel: targetChannel }, 'Sent Slack rate-limit alert successfully.');
    return true;
  } catch (error) {
    logger.error({ error, senderId }, 'Failed to send Slack alert (non-blocking)');
    return false;
  }
}
