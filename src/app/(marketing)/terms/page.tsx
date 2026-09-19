import type { Metadata } from "next";
import Link from "next/link";
import { ADDRESS, COMPANY, CONTACT, LegalPage } from "@/components/marketing/legal-page";
import { PRO_PRICES } from "@/lib/billing/catalog";

export const metadata: Metadata = { title: "Terms of Service" };

// DRAFT: review with a lawyer and fill in the placeholders before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms govern your use of Flipbook, a service operated by {COMPANY}, {ADDRESS} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By
        creating an account you agree to them.
      </p>

      <h2>Your account</h2>
      <p>
        You need an account to create flipbooks. Keep your password safe and tell us at {CONTACT} if you think someone else has
        access. You are responsible for what happens under your account.
      </p>

      <h2>Your content</h2>
      <p>
        You keep all rights to the PDFs, images and text you upload. You give us the permission we need to store, process and show
        them to the readers you share them with, and nothing more. Don&apos;t upload anything you don&apos;t have the right to
        publish, or anything illegal, harmful, or that infringes someone else&apos;s rights. We may remove content that breaks these
        rules and suspend accounts that repeatedly do.
      </p>

      <h2>Plans and payment</h2>
      <p>
        The Free plan costs nothing and has the limits shown on our <Link href="/#pricing">pricing page</Link>. Pro costs US$
        {PRO_PRICES.MONTH.amount} a month or US${PRO_PRICES.YEAR.amount} a year, plus any applicable taxes, and renews
        automatically until you cancel.
      </p>
      <p>
        Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders.
        Paddle provides all customer service inquiries and handles returns.
      </p>
      <p>
        You can cancel at any time from the billing page. Pro stays active until the end of the period you paid for; your account
        then moves to the Free plan. Nothing you made is deleted, but features and limits of the Free plan apply. See the{" "}
        <Link href="/refunds">refund policy</Link>.
      </p>

      <h2>Fair use</h2>
      <p>
        Plans include limits on flipbooks, pages, storage and monthly views. Views are never blocked, but if an account consistently
        goes far beyond its plan we may ask you to upgrade.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We work to keep Flipbook available but can&apos;t promise it will never be interrupted. We may change or discontinue features;
        if we change prices, we&apos;ll tell subscribers at least 30 days before their next renewal.
      </p>

      <h2>Liability</h2>
      <p>
        Flipbook is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for indirect or consequential losses,
        and our total liability is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>Ending your account</h2>
      <p>You can delete your flipbooks at any time. To close your account entirely, write to {CONTACT}.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: {CONTACT}.</p>
    </LegalPage>
  );
}
