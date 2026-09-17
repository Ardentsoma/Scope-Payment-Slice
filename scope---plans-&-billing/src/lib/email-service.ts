import { SentEmail, PlanId } from '../types';

const EMAILS_STORAGE_KEY = 'scope_sent_emails_v1';

export class EmailService {
  private static sentEmails: SentEmail[] = [];
  private static subscribers: Array<(emails: SentEmail[]) => void> = [];

  public static initialize(): SentEmail[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(EMAILS_STORAGE_KEY);
      if (stored) {
        this.sentEmails = JSON.parse(stored);
        return this.sentEmails;
      }
    } catch (e) {}

    // Initial welcome email
    const initial: SentEmail = {
      id: 'msg_welcome_' + Date.now(),
      to: 'nmesomanancy2020@gmail.com',
      from: 'Scope Billing <billing@scope.studio>',
      subject: 'Welcome to Scope — Streamline your client workflows',
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      smtpTransport: {
        host: 'smtp.scope.studio',
        port: 587,
        secure: false,
        auth: { user: 'smtp_api_scope_user' },
        messageId: `<init-welcome-${Date.now()}@scope.studio>`,
      },
      text: 'Welcome to Scope! You are currently on the Free tier with up to 3 client projects and 5 AI brief conversions a month.',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #18181b;">
          <div style="background-color: #D9241B; padding: 18px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Scope</h1>
          </div>
          <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-top: none; padding: 32px 24px; border-radius: 0 0 12px 12px;">
            <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Welcome to Scope, Nancy! 👋</h2>
            <p style="color: #52525b; line-height: 1.6;">You're ready to create client scopes and turn project briefs into executable deliverables with AI.</p>
            <div style="background-color: #ffffff; border: 1px solid #e4e4e7; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <strong style="color: #18181b;">Your Current Plan: Free (₦0/Month)</strong>
              <ul style="color: #71717a; margin: 8px 0 0 16px; padding: 0; font-size: 14px;">
                <li>Up to 3 client projects</li>
                <li>5 AI brief conversions a month</li>
                <li>Core project tracking</li>
              </ul>
            </div>
            <p style="color: #71717a; font-size: 13px;">Need unlimited projects? You can upgrade anytime in your account billing page.</p>
          </div>
        </div>
      `,
    };

    this.sentEmails = [initial];
    this.save();
    return this.sentEmails;
  }

  public static getSentEmails(): SentEmail[] {
    if (this.sentEmails.length === 0) {
      return this.initialize();
    }
    return this.sentEmails;
  }

  public static subscribe(callback: (emails: SentEmail[]) => void): () => void {
    this.subscribers.push(callback);
    callback(this.getSentEmails());
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private static notify() {
    this.subscribers.forEach((cb) => cb(this.sentEmails));
  }

  private static save() {
    try {
      localStorage.setItem(EMAILS_STORAGE_KEY, JSON.stringify(this.sentEmails));
    } catch (e) {}
    this.notify();
  }

  /**
   * Dispatches subscription confirmation email via Nodemailer SMTP pattern
   */
  public static sendSubscriptionConfirmation(params: {
    toEmail: string;
    userName: string;
    planId: PlanId;
    amount: number;
    currency: string;
  }): SentEmail {
    const isYearly = params.planId === 'pro_yearly';
    const planName = isYearly ? 'Scope Pro Yearly' : 'Scope Pro Monthly';
    const formattedAmount = '₦' + params.amount.toLocaleString();
    const periodText = isYearly ? 'Billed annually (Save 33%)' : 'Billed monthly';
    const messageId = `<sub-${Date.now()}@smtp.scope.studio>`;

    const email: SentEmail = {
      id: 'email_' + Date.now(),
      to: params.toEmail,
      from: 'Scope Billing & Subscriptions <billing@scope.studio>',
      subject: `Receipt & Confirmation: You are now on ${planName}! 🎉`,
      sentAt: new Date().toISOString(),
      smtpTransport: {
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: { user: 'postmaster@mail.scope.studio' },
        messageId,
      },
      text: `Hello ${params.userName}, thank you for subscribing to ${planName} for ${formattedAmount}. Unlimited client projects and AI conversions are now unlocked on your account.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color: #D9241B; padding: 24px 32px; text-align: left;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Scope</span>
              <span style="background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">SMTP Verified</span>
            </div>
            <p style="color: #fee2e2; margin: 8px 0 0 0; font-size: 14px;">Subscription Confirmation & Official Receipt</p>
          </div>

          <div style="padding: 32px;">
            <h2 style="margin: 0 0 8px 0; color: #09090b; font-size: 22px; font-weight: 700;">Payment Successful</h2>
            <p style="color: #52525b; margin: 0 0 24px 0; font-size: 15px; line-height: 1.5;">
              Hi ${params.userName}, your subscription to <strong>${planName}</strong> is now active.
            </p>

            <div style="background-color: #faf7f2; border: 1px solid #f0eae1; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e5dfd5; padding-bottom: 12px; margin-bottom: 12px;">
                <span style="color: #71717a; font-size: 14px;">Plan Tier</span>
                <span style="font-weight: 700; color: #18181b; font-size: 14px;">${planName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e5dfd5; padding-bottom: 12px; margin-bottom: 12px;">
                <span style="color: #71717a; font-size: 14px;">Billing Frequency</span>
                <span style="font-weight: 600; color: #18181b; font-size: 14px;">${periodText}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span style="color: #71717a; font-size: 14px;">Total Paid</span>
                <span style="font-size: 24px; font-weight: 800; color: #D9241B;">${formattedAmount}</span>
              </div>
            </div>

            <h3 style="font-size: 16px; font-weight: 700; color: #18181b; margin: 0 0 12px 0;">Unlocked Capabilities</h3>
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 6px 0; color: #18181b; font-size: 14px;">✓ <strong>Unlimited client projects</strong> without quota restrictions</p>
              <p style="margin: 0 0 6px 0; color: #18181b; font-size: 14px;">✓ <strong>Unlimited AI brief conversions</strong> for fast project scoping</p>
              <p style="margin: 0; color: #18181b; font-size: 14px;">✓ <strong>Priority technical support</strong> directly with our core engineering team</p>
            </div>

            <div style="border-top: 1px solid #e4e4e7; padding-top: 20px; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">Nodemailer SMTP Transaction ID: <code style="background: #f4f4f5; padding: 2px 6px; border-radius: 4px;">${messageId}</code></p>
              <p style="margin: 0;">Scope Technologies Inc. • Questions? Reply to billing@scope.studio</p>
            </div>
          </div>
        </div>
      `,
    };

    this.sentEmails.unshift(email);
    this.save();
    return email;
  }
}
