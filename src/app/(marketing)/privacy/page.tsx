import type { Metadata } from "next";
import { COMPANY, CONTACT, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

// DRAFT: review with a lawyer and fill in the placeholders before launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {COMPANY} runs Flipbook. This policy explains what we collect, why, and what you can do about it. Contact us at {CONTACT}.
      </p>

      <h2>If you have an account</h2>
      <ul>
        <li>Your name, email address and password (stored as a hash), or your Google profile if you sign in with Google.</li>
        <li>The files and text you upload, stored privately and shown only to the readers you share them with.</li>
        <li>Your plan and subscription status. Payments are handled by Paddle, our reseller; we never see your card details.</li>
      </ul>
      <p>We use this to run the service, send account emails (verification, password resets, processing updates) and bill Pro.</p>

      <h2>If you read a flipbook</h2>
      <p>
        We count views so authors can see how their flipbooks perform. For each visit we record the pages viewed and for how long,
        the kind of device (mobile, tablet or desktop) and, when our hosting provider supplies it, the country. We don&apos;t use
        cookies for this and don&apos;t store your IP address: to count unique readers we keep a one-way hash of your IP address and
        browser, combined with a secret that changes daily, so it can&apos;t be traced back to you or linked across days.
      </p>

      <h2>Who we share data with</h2>
      <ul>
        <li>Paddle, to process payments and taxes.</li>
        <li>Our hosting, database, file storage and email providers, only to run the service.</li>
        <li>Authorities, if the law requires it.</li>
      </ul>
      <p>We don&apos;t sell personal data or use it for advertising.</p>

      <h2>How long we keep it</h2>
      <p>
        Account data stays while your account exists. Deleting a flipbook deletes its files and analytics. When you close your
        account, we delete your data within 30 days, except what we must keep for tax records.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for a copy of your data, correct it, or have it deleted, by writing to {CONTACT}. You can also complain to your
        local data protection authority.
      </p>
    </LegalPage>
  );
}
