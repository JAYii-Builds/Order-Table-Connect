import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendWelcomeEmail(to: string, fullName: string): Promise<void> {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: "Restaurant App <onboarding@resend.dev>",
      to,
      subject: "Welcome to our restaurant!",
      html: `
        <h1>Welcome, ${fullName}!</h1>
        <p>Your account has been created successfully.</p>
        <p>You can now log in and start placing orders or making reservations.</p>
      `,
    });
  } catch {
  }
}
