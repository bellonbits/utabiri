import type { Metadata } from "next";
import { Card, Shell } from "@/components/shell";

export const metadata: Metadata = { title: "Privacy Policy — Utabiri" };

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "1. Scope",
    body: [
      "This policy explains how Utabiri collects, uses, stores and shares your personal data when you use our website and services. We process personal data in accordance with the Kenya Data Protection Act, 2019.",
    ],
  },
  {
    heading: "2. Data we collect",
    body: [
      "Account data: full name, email address and password (stored only as a salted hash).",
      "Payment data: the M-Pesa phone number you provide for deposits and withdrawals, transaction amounts and payment references from our payment provider. We never see or store your M-Pesa PIN.",
      "Trading data: your positions, trades, wallet balance and market activity.",
      "Technical data: IP address, device and browser information, and security logs used to protect your account.",
    ],
  },
  {
    heading: "3. Why we process it",
    body: [
      "To operate your account and wallet, execute trades, resolve markets and pay out winnings; to verify your email; to detect fraud, market manipulation and abuse; to meet legal obligations including anti-money-laundering and tax requirements; and to send service notifications such as deposit receipts and resolution alerts.",
    ],
  },
  {
    heading: "4. Sharing",
    body: [
      "We share data only with: our payment provider (to process M-Pesa transactions), our email delivery provider (to send service messages), and regulators or law enforcement where the law requires. We do not sell your personal data.",
    ],
  },
  {
    heading: "5. Retention",
    body: [
      "Account and transaction records are kept for as long as your account is active and thereafter for the period required by Kenyan financial-record and tax laws. Security logs are kept for up to 12 months.",
    ],
  },
  {
    heading: "6. Security",
    body: [
      "Passwords are hashed with a modern memory-hard algorithm; traffic is encrypted in transit; payment webhooks are signature-verified; and sensitive actions are audit-logged. No system is perfectly secure — protect your password and report any suspicious activity immediately.",
    ],
  },
  {
    heading: "7. Your rights",
    body: [
      "Under the Data Protection Act you may request access to, correction of, or deletion of your personal data; object to certain processing; and lodge a complaint with the Office of the Data Protection Commissioner. To exercise any right, email privacy@utabiri.co.ke — we respond within the statutory timelines.",
    ],
  },
  {
    heading: "8. Cookies",
    body: [
      "We use strictly necessary cookies and local storage to keep you logged in and remember preferences. We do not use third-party advertising cookies.",
    ],
  },
  {
    heading: "9. Changes",
    body: [
      "We may update this policy as the service evolves; material changes will be announced in the app before they take effect.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <Shell title="Privacy Policy" subtitle="Last updated: June 2026">
      <Card className="space-y-6">
        <p className="rounded-lg bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">
          Draft for review — register with the ODPC and have counsel confirm
          this policy before real-money launch.
        </p>
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-base font-bold">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-mut">
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className="text-sm text-mut">
          Data questions:{" "}
          <a href="mailto:privacy@utabiri.co.ke" className="font-semibold text-accent-2 hover:underline">
            privacy@utabiri.co.ke
          </a>
          . See also our{" "}
          <a href="/terms" className="font-semibold text-accent-2 hover:underline">
            Terms of Use
          </a>
          .
        </p>
      </Card>
    </Shell>
  );
}
