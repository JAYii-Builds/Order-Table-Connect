import { logger } from "./logger";

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY;
const SENDER_NAME = "TABLESERV";

// Feature flag — SMS notifications are disabled per client request.
// The Semaphore integration below is kept intact but inactive.
// Set SMS_ENABLED=true in the environment to re-enable.
const SMS_ENABLED = process.env.SMS_ENABLED === "true";

export async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  if (!SMS_ENABLED) {
    // SMS notifications disabled — no-op.
    return;
  }
  if (!SEMAPHORE_API_KEY) {
    logger.warn("SEMAPHORE_API_KEY not set — skipping SMS");
    return;
  }
  try {
    const res = await fetch("https://api.semaphore.co/api/v4/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: SEMAPHORE_API_KEY,
        number: phoneNumber,
        message,
        sendername: SENDER_NAME,
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Semaphore SMS send failed");
    }
  } catch (err) {
    logger.warn({ err }, "Semaphore SMS error");
  }
}
