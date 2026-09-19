import type { Metadata } from "next";
import { CONTACT, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Refund Policy" };

// DRAFT: review with a lawyer and fill in the placeholders before launch.
export default function RefundsPage() {
  return (
    <LegalPage title="Refund Policy">
      <p>
        If Pro isn&apos;t right for you, ask for a refund within 14 days of your first payment and you&apos;ll get your money back in
        full, no questions asked. The same applies within 14 days of an annual renewal.
      </p>
      <p>
        After 14 days, payments aren&apos;t refunded, but you can cancel at any time so you aren&apos;t charged again. Pro stays active
        until the end of the period you paid for.
      </p>
      <h2>How to ask</h2>
      <p>
        Our payments are handled by Paddle, our reseller and Merchant of Record. Reply to your Paddle receipt, use{" "}
        <a href="https://paddle.net">paddle.net</a> to find your order, or write to us at {CONTACT} and we&apos;ll arrange it.
      </p>
    </LegalPage>
  );
}
