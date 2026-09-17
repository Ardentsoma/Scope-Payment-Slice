import nodemailer, {
  type Transporter,
  type TransportOptions,
} from "nodemailer";
import { koboToNaira } from "@/lib/billing/plans";

/**
 * SMTP email delivery via nodemailer.
 *
 * Transport modes:
 * - When SMTP_HOST + SMTP_USER + SMTP_PASS are all set: real delivery through
 *   the provider (e.g. Gmail SMTP on 465 using an App Password).
 * - Otherwise everything prints to the server console with an "[email:dev]"
 *   prefix so auth flows stay testable locally. The very first code the
 *   developer needs to retrieve must never be lost, so this fallback exists
 *   even with no mail account configured.
 *
 * Failure handling: sends never throw to callers. The transport is probed once
 * (verify) at first use and every send is wrapped, so an SMTP outage or a
 * misconfiguration logs "[email:error]" instead of 500ing signup / resend /
 * reset-request. The verification code is already stored server-side, and the
 * resend endpoint gives the user another path to get the email.
 */
let transporterPromise: Promise<Transporter> | null = null;

/** Gmail, Mailtrap, Brevo, SES etc. need all three; blanks keep dev mode on. */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      (process.env.SMTP_PASS ?? "") !== ""
  );
}

function smtpErrorSummary(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const port = Number(process.env.SMTP_PORT ?? 587);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        // Port 465 = implicit TLS (SMTPS); 587/25 use STARTTLS via nodemailer.
        secure: port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
        tls: {
          rejectUnauthorized:
            process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
        },
        // Optional persistent pool (default off) — handy for bulk resends.
        pool: process.env.SMTP_POOL === "true",
        maxConnections: 5,
        maxMessages: 100,
      } as TransportOptions);

      // Probe once on first use: a clear "connection/auth failed" line here is
      // far easier to diagnose than a stack trace from the first real send.
      try {
        await transporter.verify();
        console.log(`[email] SMTP connected (${process.env.SMTP_HOST}:${port})`);
      } catch (error) {
        console.error(
          `[email:error] SMTP verify failed for ${process.env.SMTP_HOST}:${port}: ${smtpErrorSummary(error)}`
        );
      }

      return transporter;
    })();
  }
  return transporterPromise;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${html}`);
    return;
  }

  try {
    const transporter = await getTransporter();
    const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER!;
    await transporter.sendMail({ from, to, subject, html });
    console.log(`[email] sent to=${to} subject="${subject}"`);
  } catch (error) {
    // Soft-fail: log loudly, never 500 the calling route.
    console.error(
      `[email:error] failed to send "${subject}" to ${to}: ${smtpErrorSummary(error)}`
    );
  }
}

export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<void> {
  await sendEmail(
    to,
    "Your SCOPE verification code",
    `<p>Your SCOPE verification code is:</p>
     <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
     <p>It expires in 10 minutes. If you didn't create a SCOPE account, you can ignore this email.</p>`
  );
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  await sendEmail(
    to,
    "Reset your SCOPE password",
    `<p>We received a request to reset your password.</p>
     <p><a href="${resetUrl}">Choose a new password</a></p>
     <p>This link expires in 1 hour. If you didn't request it, you can ignore it.</p>`
  );
}

/**
 * Subscription confirmation receipt dispatched after a successful checkout.
 * Amount is stored/transferred in whole kobo. Soft-fails through the same
 * nodemailer helper as the auth emails.
 */
export async function sendSubscriptionReceiptEmail(params: {
  to: string;
  userName: string;
  planId: "free" | "pro_yearly" | "pro_monthly";
  amountKobo: number;
  currency: string;
}): Promise<void> {
  const { to, userName, planId, amountKobo, currency } = params;
  const isYearly = planId === "pro_yearly";
  const planName = isYearly
    ? "Scope Pro Yearly"
    : planId === "pro_monthly"
      ? "Scope Pro Monthly"
      : "Scope Free Plan";
  const symbol = currency === "NGN" ? "₦" : currency;
  const formattedAmount =
    symbol +
    koboToNaira(amountKobo).toLocaleString("en-US");
  const periodText = isYearly
    ? "Billed annually (Save 33%)"
    : "Billed monthly";

  await sendEmail(
    to,
    `Receipt & Confirmation: You are now on ${planName}! 🎉`,
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
      <div style="background:#D9241B;padding:24px 32px">
        <span style="color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px">Scope</span>
        <span style="float:right;background:rgba(255,255,255,0.2);color:#fff;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600">SMTP Verified</span>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 8px;color:#09090b;font-size:22px">Payment Successful</h2>
        <p style="color:#52525b;margin:0 0 24px;font-size:15px;line-height:1.5">Hi ${userName}, your subscription to <strong>${planName}</strong> is now active.</p>
        <div style="background:#faf7f2;border:1px solid #f0eae1;border-radius:12px;padding:20px;margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e5dfd5;padding-bottom:12px;margin-bottom:12px"><span style="color:#71717a;font-size:14px">Plan Tier</span><span style="font-weight:700;color:#18181b;font-size:14px">${planName}</span></div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e5dfd5;padding-bottom:12px;margin-bottom:12px"><span style="color:#71717a;font-size:14px">Billing Frequency</span><span style="font-weight:600;color:#18181b;font-size:14px">${periodText}</span></div>
          <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="color:#71717a;font-size:14px">Total Paid</span><span style="font-size:24px;font-weight:800;color:#D9241B">${formattedAmount}</span></div>
        </div>
        <div style="border-top:1px solid #e4e4e7;padding-top:20px;font-size:12px;color:#a1a1aa;line-height:1.5">
          <p style="margin:0">Scope Technologies Inc. • Questions? Reply to billing@scope.studio</p>
        </div>
      </div>
    </div>`
  );
}