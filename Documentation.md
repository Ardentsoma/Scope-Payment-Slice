# Documentation
## About it
This is a payment/subscription system built on top of **Flutterwave** (a Nigerian payment processor), running in "test mode" (fake money, real logic). Users can pick between three plans: free, ₦5,000/month, or ₦50,000/year. The code handles subscribing, switching plans, cancelling, and making sure access is only granted when money has *actually* been confirmed to move. It deliberately skips things like a marketing page or actual product features; the point of the exercise is the billing mechanics, not a polished product.

## How You'd Run It (Section 2)
This is standard setup: install packages, set up a Postgres database, fill in a `.env` file with secret keys from Flutterwave's dashboard, run database migrations, and start the server. One quirk: because Flutterwave needs to send "webhooks" (notifications) to a real internet address, and your local computer doesn't have one, the developer uses **ngrok** to create a temporary public URL that tunnels back to `localhost`.

## The Actual Flow (Section 3), the Heart of It
Think of it as a relay race with checkpoints:

1. **Plans page**: shows the 3 plans, marks which one you're on.
2. **Checkout**: click "Subscribe," the server creates its own tracking ID (`tx_ref`) before talking to Flutterwave, logs "I intend to charge this," then asks Flutterwave for a payment link.
3. **Paying**: you're sent to Flutterwave's own hosted page to enter card details. The app's own servers never see your card number.
4. **The return**: Flutterwave sends you back with URL parameters saying "status=successful." **Critically, the app does not trust this.** Anyone could type that URL manually and claim success. The app ignores those parameters and instead asks its own database, "did I actually confirm this payment?"
5. **Verification**: this is the real check. Either Flutterwave calls a "webhook" (a server-to-server notification), and the app double-checks by calling Flutterwave's API directly to confirm the transaction really succeeded, or if that notification never arrives (e.g., tunnel down), a background job checks pending payments periodically as a backup. Only after this independent confirmation does the app grant access.
6. **Billing page**: shows your current plan, renewal date, cancel button.
7. **Upgrade (monthly to yearly)**: you're shown a preview of exactly what you'd pay (accounting for unused time on your current plan) before confirming.
8. **Downgrade (yearly to monthly)**: no charge happens now; it's scheduled to take effect only when your paid period ends.
9. **Cancel**: you keep access until the period you already paid for ends; nothing is refunded or cut off early.
10. **Renewal**: a daily job automatically charges people whose subscription is due, using a saved "token" (not their actual card number).

## The Database Design (Section 4)
Four tables, each protecting against a specific mistake:
- **plans**: the 3 plans, priced in kobo (the smallest Nigerian currency unit, like cents).
- **subscriptions**: a snapshot of what plan you're on right now.
- **payment_events**: an unchangeable log of every single thing that happened (intent, then verified, then fulfilled). This is treated as the actual "source of truth."
- **checkout_sessions**: tracks each payment attempt to prevent double-charging.

The doc lists several database rules ("constraints") that make certain bugs *impossible* rather than just "checked for," for example, a rule that guarantees the same payment notification can never be processed twice, even if it arrives 5 times.

## The Key Concepts Explained (Section 5)
This section is basically "why I made these decisions":

- **Money as whole numbers, never decimals.** Computers are bad at exact decimal math (0.1 + 0.2 famously doesn't equal exactly 0.3 in code). So the app stores every amount as a whole number of kobo (like storing cents instead of dollars) to avoid rounding errors. It only converts to a decimal string briefly when talking to Flutterwave, because Flutterwave specifically wants naira, not kobo (unlike most other payment providers).

- **Three separate steps: initiation, verification, fulfilment.** Instead of one big "process payment" step, the app deliberately splits it into: "user says they want to pay," "we confirmed with Flutterwave they actually paid," and "we updated their account." Splitting these up means if something fails halfway, you can see exactly where, instead of it just silently breaking.

- **Idempotency (fancy word for "doing something twice has the same effect as once").** Payment systems constantly get duplicate signals, like a user double-clicking, or Flutterwave resending the same notification. Without protection, that could accidentally give someone 2 years of access for 1 year's payment. The fix is a database rule that flat-out rejects a duplicate before it can cause harm.

- **Webhook signature verification.** Since anyone can send a fake "payment succeeded!" message to the app's public webhook URL, the app checks a cryptographic signature to prove the message really came from Flutterwave. Flutterwave has an older, weaker version of this security ("verif-hash") that's basically a static password rather than a real signature. Because of that weakness, the app treats all webhooks as just a hint, and always separately double-checks with Flutterwave's own API before trusting anything.

- **Proration**: when you upgrade mid-cycle, you shouldn't pay for something twice. The math: figure out how many days you have left unused times the daily rate equals your credit, then subtract that credit from the new plan's price. There's a full worked example with real numbers in the doc.

- **Cancellation**: cancelling doesn't cut you off immediately; you paid for a period, so you keep it. It just stops future renewal.

- **Never storing card numbers.** By letting Flutterwave's own page handle card entry, the app's servers legally/technically never touch card numbers, which massively reduces its security compliance burden (a concept called "PCI scope").

- **Rate limiting**: capping how often someone can hit the checkout endpoint, mainly to prevent "card testing" fraud (someone rapidly trying lots of stolen card numbers to see which ones work).

## What Went Wrong While Building It (Section 6)
Three real bugs, told honestly:
1. **Login loop bug**: one part of the code trusted a cookie alone to decide "is this person logged in," while another part also checked the database. When they disagreed, the browser bounced back and forth between pages forever. Fixed by making both checks agree.
2. **AI coding agent kept redesigning the UI**: because the design rules weren't written down anywhere the AI assistant could see, it kept inventing its own layout. Fixed by writing the locked design rules into a file the AI always reads.
3. **A route returned 404**: turned out Next.js (the web framework) silently ignores any API folder starting with an underscore. Renaming the folder fixed it.

## What's Intentionally Missing (Section 7)
No refunds, no tax handling, no support for multiple currencies, all flagged honestly as future work, not oversights. It also notes what would break under real-world scale (e.g., the daily renewal job isn't built to recover if it crashes halfway through).

## The Final Lesson (Section 8)
Initially, the subscriptions table was treated as the source of truth and treated the event log as just a side record. This let the two quietly disagree with each other. In hindsight, the log should have been the only thing trusted from day one, with everything else calculated from it.

---

## Picture Evidence
### Before a subscription screenshots
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 14 36" src="https://github.com/user-attachments/assets/07cd6754-f7f4-48ea-a769-504b56c6ffc9" />
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 14 50" src="https://github.com/user-attachments/assets/7f50e415-2cf4-48a5-9cbd-07929a7b06e4" />

### After a subscription screenshots
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 27 04" src="https://github.com/user-attachments/assets/070f041b-4e2f-4c9c-afaf-a70a13faa4cd" />
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 27 04" src="https://github.com/user-attachments/assets/7a7937ff-87bb-4131-b5d0-d8ed4d21ed42" />

### Payment Log Screenshots
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 31 57" src="https://github.com/user-attachments/assets/3dca8f03-cc29-443a-8eb2-8bc190d1f451" />
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 32 03" src="https://github.com/user-attachments/assets/9cdc324b-e9aa-4026-9144-730e849489c5" />

### Proration Screenshots
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 29 21" src="https://github.com/user-attachments/assets/008f0078-8aad-45fc-a82c-8dbdfe90b2fa" />
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 29 34" src="https://github.com/user-attachments/assets/73a071fe-10c9-4da9-9044-b47aed51c27c" />
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 29 42" src="https://github.com/user-attachments/assets/0bf44e7c-af3e-44fc-a350-920667e4b42d" />

### Cancellation Screenshots
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 08 04 25" src="https://github.com/user-attachments/assets/98cb7020-f766-42f6-92ef-524f8b86b539" />
<img width="1440" height="900" alt="Screenshot 2026-09-17 at 07 31 49" src="https://github.com/user-attachments/assets/f8d5fa3e-2ce4-4766-99c4-971a1785f071" />









