import { notFound } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import type { ApiBillDetail } from "@/lib/api";
import { serverApiUrl } from "@/lib/live";

export const dynamic = "force-dynamic";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await fetch(`${serverApiUrl()}/bills/${id}`, { cache: "no-store" }).catch(() => null);
  if (!res || res.status === 404) notFound();
  if (!res.ok) throw new Error(`bill fetch failed: ${res.status}`);
  const bill: ApiBillDetail = await res.json();

  return (
    <div className="min-h-dvh">
      <Navbar />
      <main className="mx-auto max-w-screen-lg px-4 pb-24 pt-6 md:pb-10">
        <h1 className="text-2xl font-extrabold tracking-tight">{bill.title}</h1>
        <p className="mt-1 break-all text-xs text-mut-2">{bill.source_url}</p>

        {bill.status === "processing" && (
          <div className="mt-6 rounded-xl border border-line bg-panel p-6 text-center">
            <p className="text-sm font-bold">Analysis in progress…</p>
            <p className="mt-1 text-sm text-mut">This page will show results once the AI finishes reading the Bill. Refresh in a minute.</p>
          </div>
        )}

        {bill.status === "failed" && (
          <div className="mt-6 rounded-xl border border-down/40 bg-down/10 p-6">
            <p className="text-sm font-bold text-down">Analysis failed</p>
            <p className="mt-1 text-sm text-mut">{bill.error}</p>
          </div>
        )}

        {bill.status === "done" && (
          <>
            <div className="mt-6 rounded-xl border border-line bg-panel p-5">
              <h2 className="text-base font-bold">Overall summary</h2>
              <p className="mt-2 text-sm leading-relaxed text-mut">{bill.overall_summary}</p>
            </div>

            <h2 className="mt-8 text-lg font-bold">Clause-by-clause breakdown</h2>
            <div className="mt-3 flex flex-col gap-3">
              {bill.clauses.map((c) => (
                <details key={c.clause_number} className="rounded-xl border border-line bg-panel p-4">
                  <summary className="cursor-pointer text-sm font-bold">
                    Clause {c.clause_number}{c.heading ? ` — ${c.heading}` : ""}
                  </summary>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <p className="sm:col-span-2"><span className="font-semibold text-mut">Plain English: </span>{c.plain_english}</p>
                    <p><span className="font-semibold text-mut">Who benefits: </span>{c.who_benefits}</p>
                    <p><span className="font-semibold text-mut">Who loses: </span>{c.who_loses}</p>
                    <p><span className="font-semibold text-mut">Tax impact: </span>{c.tax_impact}</p>
                    <p><span className="font-semibold text-mut">Inflation impact: </span>{c.inflation_impact}</p>
                    <p><span className="font-semibold text-mut">Employment impact: </span>{c.employment_impact}</p>
                    <p><span className="font-semibold text-mut">Investment impact: </span>{c.investment_impact}</p>
                    <p><span className="font-semibold text-mut">Revenue impact: </span>{c.revenue_impact}</p>
                    <p><span className="font-semibold text-mut">Long-term consequences: </span>{c.long_term_consequences}</p>
                    <p><span className="font-semibold text-down">Hidden taxes/burdens: </span>{c.hidden_taxes_or_burdens}</p>
                    <p><span className="font-semibold text-up">Loopholes/opportunities: </span>{c.loopholes_or_opportunities}</p>
                  </div>
                </details>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
