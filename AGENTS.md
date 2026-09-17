# SCOPE — Project Memory & Locked-In Decisions

These decisions are LOCKED. Do not change, redesign, "improve", or stylize any of
the following without an explicit instruction from the user. When in doubt,
ask before touching design.

## Design source of truth
- The authoritative "initial design" is the prototype in
  `scope---plans-&-billing/` (PricingCards.tsx, CheckoutModal.tsx,
  ScopeDashboard.tsx, Navbar.tsx). Also referenced in
  `/Users/mac/Desktop/D&D Task Pictures/`.
- Reuse the app's exact tokens: warm-100 = `#FFFBF0`, neutral-300 = `#5B6070`,
  red-500/brand red = `#D9241B`, red-50 = `#FCE8E8`, font-sans = Work Sans,
  font-display = Dela Gothic One.

## Billing page (was "billing modal") — LOCKED
- Billing is its OWN PAGE at `/billing` (NOT an overlay on the dashboard).
  Server page `src/app/billing/page.tsx` renders client component
  `src/components/billing/billing-page.tsx`. Add `/billing` to proxy
  PROTECTED_ROUTES (done).
- Layout: warm `#FFFEFA` (warm-50) page background; NO card box/outline —
  nothing is wrapped in a stroked card, all content sits directly on the
  page background (sections separated by spacing only).
- Top bar: "Billing & Subscription" / "Manage your plan" heading + a
  "Back to dashboard" button (ArrowLeft icon + label) that links to
  `/dashboard`. There is NO X / cancel icon.
- PRO accounts see: plan name + price, status badge (ACTIVE / CANCELLING),
  renewal/cancel date, a "Cancel subscription" control (confirm keeps Pro
  until period end; "Turn on auto-renewal" when cancelling), then the plans
  grid below.
- FREE accounts see only the plans grid (no plan-info strip).
- PAYMENT MODEL (charged at checkout, switch at period end):
  - FREE -> Pro = full price charged, Pro ACTIVATES IMMEDIATELY (no wait).
  - Pro Monthly -> Pro Yearly (paid upgrade): PRORATED amount charged today
    (full yearly price minus credit for the unused remaining days of the current
    monthly cycle) and Pro Yearly ACTIVATES IMMEDIATELY. The proration math is
    written to a `Proration` table (one row per tx_ref) with the actual numbers
    and a human-readable formula, e.g. "Pro Yearly ₦99,000 − (₦400/day × 30 days)
    = ₦87,000". Proration data lives ONLY in the `Proration` table — it is NOT
    duplicated into any PaymentEvent `details` JSON.
  - Pro Yearly -> Pro Monthly (paid downgrade): full price of the target plan is
    charged via `/api/billing/subscribe` checkout; the switch is then scheduled
    via `pendingPlanTier` and only applies at the END of the current period
    (PRO strip shows "Paid — switching to {plan} at renewal on {date}", NO
    Revert link since the user already paid).
  - Pro -> FREE = no charge (₦0), still scheduled at period end via
    `/api/billing/plan-change` (the ONLY plan-change this API allows).
    "Switching to Free at renewal on {date}" + Revert link (clears pending).
  - `/api/billing/plan-change` rejects any PAID target plan (400) — paid
    changes must go through checkout. `schedulePlanChange` also refuses to
    overwrite a pending PAID change with a no-charge schedule.
- Post-cancel survey + thank-you popup live on this page (see below).
- Cancellation survey: AFTER a cancel succeeds, a form appears on the billing
  page asking why the user cancelled (reason radios from the
  `cancellation-survey` lib + optional comment + "Submit feedback"/"Skip");
  submitting shows a centered "Thank you!" popup (check icon + Done button).

## Plans grid (PricingCards) — LOCKED
- Headline "Choose The Plan Right For You" + "Use a plan that fits your workflow".
- 3 cream cards (`#FFFBF0`) in a responsive 3-column grid; prices
  ₦0 /Month, ₦12,000 /Month, ₦99,000 /Year (monthly = "/Month", yearly =
  "/Year").
- Pro Yearly has the red "Recommended" banner.
- Current plan is marked with the red "Current plan" pill badge + a WARM
  button (`#ECE7E0`, border `#D5D0C7`, text `#5B6070`).
- BUTTON RULES (same for all three cards, independent of which plan is active):
  - Current plan: warm button ("Current plan"), NOT clickable, card NOT
    highlighted (no red stroke, default cursor).
  - Non-current paid cards: normal OUTLINE "Get started" buttons, clickable,
    open the FULL-PRICE checkout via `/api/billing/subscribe`; the card gets
    a RED STROKE highlight (`border-[1.5px] #D9241B`) when clicked/selected.
    The switch applies at the END of the current period (a small "Applies at
    renewal" note shows under the button for these paid switches).
  - Free card when the user is PRO: OUTLINE "Switch at renewal" button ->
    schedules the no-charge downgrade via `/api/billing/plan-change`; button
    shows "Scheduled" (warm, disabled) after scheduling.
  - Button TEXT: the CURRENT plan's button always reads "Current plan";
    non-current: Free = "Switch at renewal" (Pro -> Free only), Pro Monthly &
    Pro Yearly = "Get started" (both directions). Paid buttons swap to
    "Starting…" while submitting, the free downgrade to "Scheduling…".
- Free card gets the same red-stroke selection highlight as the Pro cards.
- Pro Yearly is auto-selected when the billing page opens, but it is never
  highlighted when it is the current plan.
- The "Save …%" discount badge on the Pro Yearly card is hidden when Pro
  Yearly IS the current plan, and always shown when it is not.

## Dashboard
- Page background is warm `#FFFEFA` (warm-50).
- Use the prototype top banner: warm `#FAF7F2` rounded card with
  "Scope Workspace" label + badge (PRO ACTIVE red / FREE PLAN gray),
  "Hello, {firstName}", "Current Tier: <plan> (₦<price>/Month for monthly plans,
  ₦<price>/Year for Pro Yearly) • Linked to <email>", and the black
  "Upgrade to Pro"/"Change Plan" button (amber Sparkles icon) that links to
  the billing page (`/billing`).
- Payment redirects land on the plain dashboard (`/dashboard?payment=success`
  or `/dashboard?payment=failed`); they do NOT open the billing page.

## Avatar dropdown / header
- There is NO avatar dropdown / user menu in the header.
- Header nav has exactly two links: **Dashboard** (/dashboard) and **Billing** (/billing). There is NO "Plans" link.

## Engineering invariants
- MONEY RULE: store whole kobo everywhere; convert kobo -> naira only when
  building a Flutterwave request, and naira -> kobo only when reading
  Flutterwave responses. Never store decimals or naira.
- Payment activation NEVER trusts the browser redirect status: always
  re-verify server-side (`/api/billing/verify`) before unlocking Pro.
- Checkout redirectUrl = `<origin>/api/billing/verify`. GET verify confirms
  the charge then redirects to the plain dashboard with a payment banner.
- Never capture card data server-side; use Flutterwave hosted checkout.
- FULL PRICE: every paid plan change (free -> Pro, Pro Yearly -> Pro Monthly
  downgrade) charges the target plan's `priceKobo` in full via checkout — there is
  NO proration EXCEPT for Pro Monthly -> Pro Yearly upgrades, which charge a
  prorated amount and activate immediately. `confirmPayment` handles immediate
  activation (FREE->Pro, monthly->yearly upgrades) or schedules the switch via
  `pendingPlanTier` (downgrades) at period end. All amounts in whole kobo.
- `createCheckoutIntent` also fails any older PENDING invoice for the user
  (only one checkout in flight at a time; abandoned checkouts are marked
  FAILED on the next attempt), and writes a `Proration` row when the checkout
  is a Pro Monthly -> Pro Yearly upgrade (recording the actual kobo math +
  formula).
- Period-rollover in `getBillingStatus` sets `amount` to the target plan's
  price (0 for FREE) when a scheduled change/cancel takes effect — never
  leaves a stale kobo amount.
- After `prisma generate` / `prisma db push`, RESTART the dev server: the
  running process keeps a stale in-memory Prisma client and will throw
  "Cannot read properties of undefined (reading 'create')" on new models
  (this bit us on `prisma.proration` when the model was first added).
- Schema changes: use `prisma db push`, NOT `prisma migrate dev`. The earliest
  migrations cannot replay from scratch (shadow DB fails on
  `20260915_add_flutterwave_payments`), so migrate keeps a local file history.

## Working-memory rules for sessions
- Dev server runs via `sudo -u mac npm run dev`; ask before restarting it.
- After builds: `sudo chown -R mac:staff .next src prisma`.
- Test user: nmesomanancy2020@gmail.com ("Ardent Soma", id
  cmu3o4drb0000paf5vqvj5euy). Keep it pristine after testing (delete minted
  sessions).
- Flutterwave test card: 4811 1101 1111 1114, CVV 550, exp 01/35, PIN 3310,
  OTP 12345.
- DO NOT change any of the locked design decisions above unless the user
  explicitly instructs it.