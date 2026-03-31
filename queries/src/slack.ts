const SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";
const DEFAULT_ORDER_ALERTS_CHANNEL = "#order-alerts";

export interface SlackMessageOptions {
  channel?: string;
  text: string;
}

function getSlackBotToken(): string {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured.");
  }

  return token;
}

export function getOrderAlertsChannel(): string {
  return process.env.SLACK_ORDER_ALERTS_CHANNEL ?? DEFAULT_ORDER_ALERTS_CHANNEL;
}

export async function sendSlackMessage(
  options: SlackMessageOptions
): Promise<void> {
  const response = await fetch(SLACK_POST_MESSAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSlackBotToken()}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: options.channel ?? getOrderAlertsChannel(),
      text: options.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    ok?: boolean;
    error?: string;
  };

  if (!payload.ok) {
    throw new Error(
      `Slack API returned an error: ${payload.error ?? "unknown_error"}.`
    );
  }
}
