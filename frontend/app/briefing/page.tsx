import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { HealthScoreGauge } from "@/components/health-score-gauge";
import type { ApiBriefing } from "@/lib/api";
import { fmtDate, serverApiUrl } from "@/lib/live";

export const dynamic = "force-dynamic";

const RATING_CLS: Record<string, string> = {
  winner: "bg-up/15 text-up",
  loser: "bg-down/15 text-down",
  neutral: "bg-panel-2 text-mut",
};

const RISK_CLS: Record<string, string> = {
  low: "text-up",
  medium: "text-gold",
  high: "text-down",
};

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-mut">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function BriefingPage() {
  const res = await fetch(`${serverApiUrl()}/briefing/latest`, { cache: "no-store" }).catch(() => null);

  if (!res || !res.ok) {
    return (
      <div className="min-h-dvh">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-extrabold">No briefing yet</h1>
          <p className="mt-2 text-sm text-mut">
            The daily Economic Briefing hasn&apos;t been generated yet — check back soon, or an admin can trigger it from the admin dashboard.
          </p>
        </main>
        <Footer />
        <BottomNav />
      </div>
    );
  }

  const b: ApiBriefing = await res.json();

  return (
    <div className="min-h-dvh">
      <Navbar />
      <main className="mx-auto max-w-screen-lg px-4 pb-24 pt-6 md:pb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-mut-2">
          Daily Economic Briefing · {fmtDate(b.created_at)}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Kenya Economic Health Score</h1>

        <div className="mt-4 rounded-2xl border border-line bg-panel p-6">
          <HealthScoreGauge score={b.health_score} trend={b.score_trend} previousScore={b.previous_score} />
          <p className="mt-4 text-sm leading-relaxed text-mut">{b.executive_summary}</p>
          {b.key_drivers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {b.key_drivers.map((d) => (
                <span key={d} className="rounded-full border border-line bg-panel-2 px-3 py-1 text-xs font-bold text-mut">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        <Section title="Kenya vs. peers" subtitle="AI-generated comparative estimate, not a live data feed">
          <div className="overflow-x-auto rounded-xl border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-mut">
                  <th className="px-3 py-2.5">Country</th>
                  <th className="px-3 py-2.5">GDP growth</th>
                  <th className="px-3 py-2.5">Inflation</th>
                  <th className="px-3 py-2.5">Interest rate</th>
                  <th className="px-3 py-2.5">Debt/GDP</th>
                  <th className="px-3 py-2.5">Currency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {b.country_comparison.map((c) => (
                  <tr key={c.country} className="hover:bg-panel-2">
                    <td className="px-3 py-2.5 font-semibold">{c.country}</td>
                    <td className="px-3 py-2.5">{c.gdp_growth}</td>
                    <td className="px-3 py-2.5">{c.inflation}</td>
                    <td className="px-3 py-2.5">{c.interest_rate}</td>
                    <td className="px-3 py-2.5">{c.debt_to_gdp}</td>
                    <td className="px-3 py-2.5 text-mut">{c.currency_strength}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-panel p-4">
              <h3 className="text-sm font-bold text-up">Kenya&apos;s strengths</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-mut">
                {b.kenya_strengths.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4">
              <h3 className="text-sm font-bold text-down">Kenya&apos;s weaknesses</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-mut">
                {b.kenya_weaknesses.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Sector impact">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {b.sector_impacts.map((s) => (
              <div key={s.sector} className="rounded-xl border border-line bg-panel p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold">{s.sector}</h4>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${RATING_CLS[s.rating]}`}>
                    {s.rating}
                  </span>
                </div>
                <p className="mt-1 text-xs text-mut">{s.outlook}</p>
                <p className={`mt-1.5 text-xs font-bold ${RISK_CLS[s.risk_level]}`}>{s.risk_level} risk</p>
                <p className="mt-1 text-xs text-mut-2">{s.strategy}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Personal finance impact">
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["Low income", b.personal_finance.low_income],
              ["Middle income", b.personal_finance.middle_income],
              ["High income", b.personal_finance.high_income],
            ] as const).map(([label, impact]) => impact && (
              <div key={label} className="rounded-xl border border-line bg-panel p-4">
                <h4 className="text-sm font-bold">{label}</h4>
                <dl className="mt-2 space-y-1.5 text-xs">
                  <div><dt className="inline text-mut">Cost of living: </dt><dd className="inline">{impact.cost_of_living}</dd></div>
                  <div><dt className="inline text-mut">Tax burden: </dt><dd className="inline">{impact.tax_burden}</dd></div>
                  <div className="pt-1 font-semibold text-accent-2">{impact.recommendation}</div>
                </dl>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Investment ideas">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["Short term", b.investment_ideas.short_term],
              ["Medium term", b.investment_ideas.medium_term],
              ["Long term", b.investment_ideas.long_term],
              ["Risks to avoid", b.investment_ideas.risks],
            ] as const).map(([label, items]) => (
              <div key={label} className="rounded-xl border border-line bg-panel p-4">
                <h4 className="text-sm font-bold">{label}</h4>
                <ul className="mt-2 space-y-1.5 text-xs text-mut">
                  {(items ?? []).map((it) => <li key={it}>• {it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Economic framework perspectives">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-panel p-4">
              <h4 className="text-sm font-bold text-accent-2">Austrian economics view</h4>
              <p className="mt-2 text-sm leading-relaxed text-mut">{b.austrian_view}</p>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4">
              <h4 className="text-sm font-bold text-accent-2">New classical view</h4>
              <p className="mt-2 text-sm leading-relaxed text-mut">{b.classical_view}</p>
            </div>
          </div>
        </Section>

        <Section title="Recommendations">
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["Government", b.government_recommendations],
              ["Business", b.business_recommendations],
              ["Household", b.household_recommendations],
            ] as const).map(([label, items]) => (
              <div key={label} className="rounded-xl border border-line bg-panel p-4">
                <h4 className="text-sm font-bold">{label}</h4>
                <ul className="mt-2 space-y-1.5 text-xs text-mut">
                  {items.map((it) => <li key={it}>• {it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <p className="mt-8 text-xs text-mut-2">
          This briefing is generated by AI from recent headlines, commodity prices and macro indicators.
          It is informational only and not financial or investment advice.
        </p>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
