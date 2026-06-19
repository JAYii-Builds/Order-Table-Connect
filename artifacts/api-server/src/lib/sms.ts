import { logger } from "./logger";

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY;
const SENDER_NAME = "TABLESERV";

export async function sendSMS(phoneNumber: string, message: string): Promise<void> {
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
