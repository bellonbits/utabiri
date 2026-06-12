import type { Metadata } from "next";
import { Card, Shell } from "@/components/shell";

export const metadata: Metadata = { title: "Terms of Use — Utabiri" };

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "1. Who we are",
    body: [
      "Utabiri is a prediction market platform that lets registered users in Kenya buy and sell YES/NO positions on the outcome of future events, funded via M-Pesa. By creating an account or using the platform you agree to these Terms.",
    ],
  },
  {
    heading: "2. Eligibility",
    body: [
      "You must be at least 18 years old and legally resident in Kenya to use Utabiri. You may hold only one account, registered in your own name, and you are responsible for keeping your login credentials secure.",
    ],
  },
  {
    heading: "3. Your wallet and payments",
    body: [
      "Deposits are made through Lipa na M-Pesa and are credited only after payment confirmation from our payment provider. Withdrawals are paid to the M-Pesa number you provide, are subject to a minimum amount and a disclosed fee, and may require review before approval.",
      "Wallet balances are not bank deposits and do not earn interest. We may suspend deposits or withdrawals where we suspect fraud, money laundering or abuse.",
    ],
  },
  {
    heading: "4. Trading",
    body: [
      "Prices on Utabiri are set by an automated market maker and move with demand. When you buy a position you pay the quoted amount plus the disclosed trading fee; quoted prices can change between quote and execution.",
      "All trades are final once executed. Trading involves risk: the value of a position can fall to zero. Never trade with money you cannot afford to lose.",
    ],
  },
  {
    heading: "5. Market resolution",
    body: [
      "Each market states its resolution criteria and sources. Outcomes are determined by our resolution team based on those criteria. Winning positions pay KES 1 per share; losing positions pay nothing. If an event becomes impossible to resolve fairly, we may void the market and refund stakes at cost.",
      "Resolution decisions are made in good faith and, save for manifest error, are final.",
    ],
  },
  {
    heading: "6. Fees",
    body: [
      "We charge a trading fee on each buy and sell, and may charge a withdrawal fee. Current fees are shown before you confirm any transaction. We may change fees prospectively with notice in the app.",
    ],
  },
  {
    heading: "7. Prohibited conduct",
    body: [
      "You may not: use the platform if you have inside knowledge of, or influence over, a market's outcome; operate multiple or shared accounts; use bots or exploits; launder money; or attempt to manipulate prices or resolutions. We may freeze accounts, reverse abusive trades and report unlawful activity to authorities.",
    ],
  },
  {
    heading: "8. Responsible trading",
    body: [
      "Prediction trading can be addictive. We provide self-exclusion and deposit-limit tools on request — contact support to activate them. If gambling is causing you harm, consider seeking help before continuing.",
    ],
  },
  {
    heading: "9. Service availability and liability",
    body: [
      "The platform is provided on an \"as is\" basis. We work to keep it available and accurate but do not guarantee uninterrupted service or error-free prices. To the maximum extent permitted by Kenyan law, our liability to you is limited to the balance of your wallet at the time of the event giving rise to the claim.",
    ],
  },
  {
    heading: "10. Account closure",
    body: [
      "You may close your account at any time after withdrawing your balance. We may suspend or close accounts that breach these Terms, with any legitimate balance returned after review.",
    ],
  },
  {
    heading: "11. Changes and governing law",
    body: [
      "We may update these Terms; material changes will be announced in the app and apply prospectively. These Terms are governed by the laws of Kenya and disputes are subject to the jurisdiction of Kenyan courts.",
    ],
  },
];

export default function TermsPage() {
  return (
    <Shell title="Terms of Use" subtitle="Last updated: June 2026">
      <Card className="space-y-6">
        <p className="rounded-lg bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">
          Draft for review — these terms must be reviewed by Kenyan counsel
          (including BCLB licensing and KRA tax obligations) before real-money
          launch.
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
          Questions? Contact{" "}
          <a href="mailto:support@utabiri.co.ke" className="font-semibold text-accent-2 hover:underline">
            support@utabiri.co.ke
          </a>
          . See also our{" "}
          <a href="/privacy" className="font-semibold text-accent-2 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </Card>
    </Shell>
  );
}
