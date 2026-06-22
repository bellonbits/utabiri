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
      "Activity data: comments you post, users you follow, and the interest tags you set for personalized insights.",
      "Technical data: IP address, device and browser information, and security logs used to protect your account.",
    ],
  },
  {
    heading: "3. Why we process it",
    body: [
      "To operate your account, personalize the insights and recommendations you see, verify your email, detect fraud and abuse, meet legal obligations, and send service notifications.",
    ],
  },
  {
    heading: "4. Sharing",
    body: [
      "We share data only with our email delivery provider (to send service messages) and regulators or law enforcement where the law requires. We do not sell your personal data.",
    ],
  },
  {
    heading: "5. Retention",
    body: [
      "Account and activity records are kept for as long as your account is active and thereafter for the period required by Kenyan law. Security logs are kept for up to 12 months.",
    ],
  },
  {
    heading: "6. Security",
    body: [
      "Passwords are hashed with a modern memory-hard algorithm and traffic is encrypted in transit. No system is perfectly secure — protect your password and report any suspicious activity immediately.",
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
