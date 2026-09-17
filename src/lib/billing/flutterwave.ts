import "server-only";

const BASE = "https://api.flutterwave.com/v3";

function requireSecretKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) {
    throw new Error("FLUTTERWAVE_SECRET_KEY is not configured.");
  }
  return key;
}

export interface FlutterwavePaymentParams {
  txRef: string;
  /** Amount in WHOLE NAIRA — convert from kobo before calling Flutterwave. */
  amountNaira: number;
  currency: string;
  email: string;
  name: string;
  redirectUrl: string;
  meta?: Record<string, string>;
}

/**
 * Creates a Flutterwave "Standard" payment and returns the hosted checkout
 * link. Card details never pass through this server — the customer is
 * redirected to Flutterwave's PCI-compliant payment page.
 */
export async function createFlutterwavePayment(
  params: FlutterwavePaymentParams
): Promise<{ link: string }> {
  const secretKey = requireSecretKey();

  const res = await fetch(`${BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: params.amountNaira,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: { email: params.email, name: params.name },
      customizations: {
        title: "Scope Pro Subscription",
        description: `Scope ${params.currency} ${params.amountNaira} plan`,
        // Using the brand red so the payment page matches the app.
        logo: "https://res.cloudinary.com/scope/image/upload/v1/brand/scope-mark.png",
      },
      meta: params.meta,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!json || json.status !== "success" || !json.data?.link) {
    throw new Error(
      json?.message ? `Flutterwave: ${json.message}` : "Flutterwave payment creation failed."
    );
  }

  return { link: json.data.link as string };
}

export interface FlutterwaveVerification {
  isSuccessful: boolean;
  transactionId: string | null;
  /** Amount Flutterwave reports as charged, in naira (convert to kobo). */
  amountNaira: number | null;
  /** Currency Flutterwave confirms the charge happened in (e.g. "NGN"). */
  currency: string | null;
  /** Human readable payment method, e.g. "Visa •••• 1234". */
  paymentMethod: string | null;
}

function formatPaymentMethod(transaction: {
  card?: { brand?: string; last4?: string } | null;
  payment_type?: string | null;
}): string | null {
  if (transaction.card?.brand || transaction.card?.last4) {
    const brand = transaction.card.brand ?? "Card";
    const last4 = transaction.card.last4 ?? "****";
    return `${brand} •••• ${last4}`;
  }
  if (transaction.payment_type) {
    return transaction.payment_type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Flutterwave";
}

/**
 * Verifies a transaction server-side by its tx_ref. Never trust the status
 * passed back on the redirect URL — always re-verify against the API.
 */
export async function verifyFlutterwaveTransaction(
  txRef: string
): Promise<FlutterwaveVerification> {
  const secretKey = requireSecretKey();

  const res = await fetch(
    `${BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}` },
    }
  );

  const json = await res.json().catch(() => null);
  if (!json || json.status !== "success" || !json.data) {
    return { isSuccessful: false, transactionId: null, amountNaira: null, currency: null, paymentMethod: null };
  }

  const transaction = json.data as {
    id?: number | string;
    status?: string;
    amount?: number;
    currency?: string;
    card?: { brand?: string; last4?: string } | null;
    payment_type?: string | null;
  };

  return {
    isSuccessful: transaction.status === "successful" && (transaction.amount ?? 0) > 0,
    transactionId: transaction.id != null ? String(transaction.id) : null,
    amountNaira: typeof transaction.amount === "number" ? transaction.amount : null,
    currency: transaction.currency ?? null,
    paymentMethod: formatPaymentMethod(transaction),
  };
}