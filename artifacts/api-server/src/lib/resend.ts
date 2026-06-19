import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const FROM = "TableServe <onboarding@resend.dev>";

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) return;
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch {}
}

export async function sendWelcomeEmail(to: string, fullName: string): Promise<void> {
  await send(
    to,
    "Welcome to TableServe!",
    `<h2>Welcome, ${fullName}!</h2>
     <p>Your account has been created. You can now log in and start placing orders or making reservations.</p>`,
  );
}

export async function sendReservationConfirmedEmail(
  to: string,
  name: string,
  date: string,
  time: string,
  partySize: number,
): Promise<void> {
  await send(
    to,
    "Your table reservation is confirmed — TableServe",
    `<h2>Reservation Confirmed</h2>
     <p>Hi ${name},</p>
     <p>Your table for <strong>${partySize} guest${partySize !== 1 ? "s" : ""}</strong> on <strong>${date} at ${time}</strong> has been confirmed.</p>
     <p>We look forward to seeing you!</p>`,
  );
}

export async function sendOrderConfirmedEmail(
  to: string,
  name: string,
  orderId: string,
  total: number,
): Promise<void> {
  await send(
    to,
    "Your order is confirmed — TableServe",
    `<h2>Order Confirmed</h2>
     <p>Hi ${name},</p>
     <p>Your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> totaling <strong>₱${total.toFixed(2)}</strong> has been confirmed and is being prepared.</p>`,
  );
}

export async function sendRefundApprovedEmail(
  to: string,
  name: string,
  amount: number,
): Promise<void> {
  await send(
    to,
    "Your refund has been approved — TableServe",
    `<h2>Refund Approved</h2>
     <p>Hi ${name},</p>
     <p>Your refund of <strong>₱${amount.toFixed(2)}</strong> has been approved and marked as completed.</p>`,
  );
}

export async function sendRefundRejectedEmail(
  to: string,
  name: string,
  amount: number,
): Promise<void> {
  await send(
    to,
    "Your refund request was not approved — TableServe",
    `<h2>Refund Not Approved</h2>
     <p>Hi ${name},</p>
     <p>Unfortunately your refund request of <strong>₱${amount.toFixed(2)}</strong> could not be approved at this time. Please contact us for more details.</p>`,
  );
}
