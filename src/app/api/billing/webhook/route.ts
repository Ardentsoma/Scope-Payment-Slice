import { NextRequest, NextResponse } from "next/server";
import { verifyFlutterwaveTransaction } from "@/lib/billing/flutterwave";
import { confirmPayment } from "@/lib/billing/service";

/**
 * Flutterwave charge webhook (charge.completed).
 *
 * 1. The `verif-hash` header must match the secret configured in the
 *    Flutterwave dashboard — otherwise the whole message is ignored.
 * 2. Duplicate deliveries of the same tx_ref are detected before any action.
 * 3. The charge is re-verified with Flutterwave's API and amount/currency
 *    checked before anything is unlocked.
 *
 * We always respond 200 to Flutterwave (even for ignored/failed events) so it
 * stops retrying; retries of an already-processed event are harmless no-ops.
 */
export async function POST(request: NextRequest) {
  const expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  const providedHash = request.headers.get("verif-hash");

  // Never trust an unsigned webhook. Ignore it completely if it doesn't match.
  if (!expectedHash || !providedHash || providedHash !== expectedHash) {
    return NextResponse.json(
      { ok: false, error: "Invalid webhook signature." },
      { status: 401 }
    );
  }

  const payload = await request.json().catch(() => null);
  const txRef: string | undefined =
    typeof payload?.tx_ref === "string"
      ? payload.tx_ref
      : typeof payload?.data?.tx_ref === "string"
        ? payload.data.tx_ref
        : undefined;

  if (!txRef) {
    return NextResponse.json({ ok: false, error: "Missing tx_ref." }, { status: 400 });
  }

  // Re-verify with Flutterwave before trusting the payload at all.
  let verification;
  try {
    verification = await verifyFlutterwaveTransaction(txRef);
  } catch {
    // Network/API problem on our side: acknowledge so Flutterwave retries
    // later, and record nothing yet (the payment may still be pending).
    return NextResponse.json({ ok: true, activated: false, retry: true }, { status: 200 });
  }

  // Idempotency + activation happen inside confirmPayment (which checks the
  // invoice + ledger for this exact tx_ref before doing anything).
  const result = await confirmPayment(txRef, "webhook", {
    isSuccessful: verification.isSuccessful,
    transactionId: verification.transactionId,
    amountNaira: verification.amountNaira,
    currency: verification.currency,
    paymentMethod: verification.paymentMethod,
  }).catch(() => null);

  if (!result) {
    return NextResponse.json({ ok: true, activated: false }, { status: 200 });
  }

  switch (result.outcome) {
    case "confirmed":
      return NextResponse.json({ ok: true, activated: true });
    case "already_processed":
      // Exact duplicate delivery (or already handled by verify): do nothing.
      return NextResponse.json({ ok: true, activated: false, duplicate: true });
    case "failed":
      return NextResponse.json({ ok: true, activated: false, failed: true });
    case "not_found":
      return NextResponse.json({ ok: true, activated: false, unknown: true });
  }
}