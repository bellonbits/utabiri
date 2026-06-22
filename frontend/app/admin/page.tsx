"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { categories } from "@/lib/categories";
import { btnCls, Card, Field, inputCls, Notice, Shell } from "@/components/shell";

type Stats = {
  total_users: number;
  total_insights: number;
  commodity_rows: number;
  last_ingest_at: string | null;
};

type BillSummary = { id: string; title: string; status: string; created_at: string };

type AdminInsight = {
  id: string;
  kind: string;
  title: string;
  category: string;
  created_at: string;
};

const KINDS = [
  { value: "commentary", label: "Commentary" },
  { value: "forecast", label: "Forecast" },
  { value: "recommendation", label: "Recommendation" },
] as const;

export default function AdminPage() {
  const user = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<AdminInsight[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // KAMIS
  const [ingestBusy, setIngestBusy] = useState(false);

  // daily briefing
  const [briefingBusy, setBriefingBusy] = useState(false);

  // bill analysis
  const [billTitle, setBillTitle] = useState("");
  const [billUrl, setBillUrl] = useState("");
  const [billBusy, setBillBusy] = useState(false);
  const [bills, setBills] = useState<BillSummary[]>([]);

  // AI generator
  const [genKind, setGenKind] = useState<(typeof KINDS)[number]["value"]>("commentary");
  const [genCategory, setGenCategory] = useState("Agriculture");
  const [genCommodity, setGenCommodity] = useState("");
  const [genIndicator, setGenIndicator] = useState("");
  const [genInterests, setGenInterests] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [generated, setGenerated] = useState<{ id: string; title: string; kind: string }[]>([]);

  // macro indicator manual entry
  const [indName, setIndName] = useState("");
  const [indValue, setIndValue] = useState("");
  const [indUnit, setIndUnit] = useState("%");
  const [indPeriod, setIndPeriod] = useState("");
  const [indSource, setIndSource] = useState("KNBS");

  const refresh = useCallback(() => {
    api<Stats>("/admin/stats").then(setStats).catch(() => {});
    api<{ items: AdminInsight[] }>("/admin/insights").then((r) => setInsights(r.items)).catch(() => {});
    api<{ items: BillSummary[] }>("/bills", { token: null }).then((r) => setBills(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.is_admin) refresh();
  }, [user, refresh]);

  if (!user?.is_admin) {
    return (
      <Shell title="Admin">
        <Card>
          <p className="text-sm text-mut">
            Admin access required —{" "}
            <a href="/login" className="font-semibold text-accent-2 hover:underline">
              log in
            </a>{" "}
            as admin@utabiri.co.ke.
          </p>
        </Card>
      </Shell>
    );
  }

  const run = async (fn: () => Promise<string>) => {
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    }
  };

  const ingestNow = async () => {
    setIngestBusy(true);
    await run(async () => {
      // kamis.kilimo.go.ke blocks this backend's VPS IP at the network level,
      // so ingestion runs via a Vercel-hosted scraper instead (see
      // frontend/app/api/kamis-sync) — this just triggers that on demand.
      const r = await api<{ rows_inserted: number; commodities_matched: number }>(
        "/admin/kamis/trigger-vercel-sync",
        { method: "POST" },
      );
      return `Synced ${r.rows_inserted} new price rows across ${r.commodities_matched} commodities`;
    });
    setIngestBusy(false);
  };

  const generate = async () => {
    setGenBusy(true);
    setGenerated([]);
    await run(async () => {
      const body: Record<string, unknown> = { kind: genKind, category: genCategory };
      if (genKind === "forecast") {
        if (genCommodity) body.commodity = genCommodity;
        if (genIndicator) body.indicator = genIndicator;
      }
      if (genKind === "recommendation") {
        body.interest_tags = genInterests.split(",").map((t) => t.trim()).filter(Boolean);
      }
      const r = await api<{ created: number; items: { id: string; title: string; kind: string }[] }>(
        "/admin/insights/generate",
        { method: "POST", body },
      );
      setGenerated(r.items);
      return `Generated ${r.created} ${genKind} insight(s)`;
    });
    setGenBusy(false);
  };

  const generateBriefing = async () => {
    setBriefingBusy(true);
    await run(async () => {
      const r = await api<{ date: string; health_score: number }>("/admin/briefing/generate", { method: "POST" });
      return `Briefing for ${r.date} generated — health score ${r.health_score}`;
    });
    setBriefingBusy(false);
  };

  const analyzeBill = async () => {
    setBillBusy(true);
    await run(async () => {
      await api("/admin/bills/analyze", {
        method: "POST",
        body: { title: billTitle, source_url: billUrl },
      });
      setBillTitle("");
      setBillUrl("");
      return "Bill analysis started — this runs in the background and may take a few minutes";
    });
    setBillBusy(false);
  };

  const addIndicator = () =>
    run(async () => {
      await api("/macro/indicators", {
        method: "POST",
        body: {
          name: indName,
          value: Number(indValue),
          unit: indUnit,
          period: indPeriod,
          source: indSource,
        },
      });
      setIndName("");
      setIndValue("");
      setIndPeriod("");
      return `Indicator "${indName}" recorded`;
    });

  const deleteInsight = (id: string) =>
    run(async () => {
      await api(`/admin/insights/${id}`, { method: "DELETE" });
      return "Insight deleted";
    });

  return (
    <Shell title="Admin Dashboard" subtitle="KAMIS ingestion, macro data and AI-generated insights" wide>
      <div className="flex flex-col gap-4">
        {/* stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats &&
            (
              [
                ["Users", String(stats.total_users)],
                ["Insights", String(stats.total_insights)],
                ["Commodity rows", String(stats.commodity_rows)],
                ["Last ingest", stats.last_ingest_at ? new Date(stats.last_ingest_at).toLocaleString() : "never"],
              ] as const
            ).map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-xs font-semibold text-mut">{label}</p>
                <p className="mt-1 truncate text-lg font-extrabold">{value}</p>
              </Card>
            ))}
        </div>

        {msg && <Notice ok={msg.ok} text={msg.text} />}

        {/* KAMIS ingestion */}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">KAMIS price ingestion</h2>
              <p className="text-xs text-mut">
                kamis.kilimo.go.ke blocks this server&apos;s IP, so a Vercel Cron Job scrapes it instead (runs automatically every 6h, capped to once/day on the Hobby plan). Trigger a sync on demand any time.
              </p>
            </div>
            <button onClick={ingestNow} disabled={ingestBusy} className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-white transition hover:bg-accent-2 disabled:opacity-50">
              {ingestBusy ? "Syncing… (~20s)" : "Sync now"}
            </button>
          </div>
        </Card>

        {/* Daily economic briefing */}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">Daily Economic Briefing</h2>
              <p className="text-xs text-mut">
                Health score, country comparison, sector impact, personal finance, investment ideas and economic-framework commentary. Runs automatically every 24h.
              </p>
            </div>
            <Link href="/briefing" className="rounded-full border border-line px-5 py-2 text-sm font-bold text-mut hover:text-white">
              View latest
            </Link>
            <button onClick={generateBriefing} disabled={briefingBusy} className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-white transition hover:bg-accent-2 disabled:opacity-50">
              {briefingBusy ? "Generating… (~30s)" : "Generate now"}
            </button>
          </div>
        </Card>

        {/* Finance Bill analysis */}
        <Card>
          <h2 className="text-base font-bold">Finance Bill Analysis</h2>
          <p className="text-xs text-mut">
            Fetches a Bill PDF, splits it into clauses, and runs each through AI for a plain-English, tax and economic-impact breakdown. Runs in the background — re-run only when a new Bill version is published.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Field label="Title">
              <input value={billTitle} onChange={(e) => setBillTitle(e.target.value)} className={inputCls} placeholder="Finance Bill 2026" />
            </Field>
            <Field label="Source PDF URL">
              <input value={billUrl} onChange={(e) => setBillUrl(e.target.value)} className={inputCls} placeholder="https://www.parliament.go.ke/..." />
            </Field>
          </div>
          <button onClick={analyzeBill} disabled={billBusy || !billTitle || !billUrl} className={`${btnCls} mt-3 w-auto px-6`}>
            {billBusy ? "Starting…" : "Analyze Bill"}
          </button>

          {bills.length > 0 && (
            <ul className="mt-4 divide-y divide-line/60">
              {bills.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <Link href={`/bills/${b.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-accent-2">
                    {b.title}
                  </Link>
                  <span className="text-xs font-bold uppercase text-mut">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* AI insight generator */}
        <Card>
          <h2 className="text-base font-bold">AI Insight Generator</h2>
          <p className="text-xs text-mut">
            Groq reads commodity prices, macro indicators and today&apos;s headlines to draft commentary, forecasts and recommendations.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Field label="Kind">
              <select value={genKind} onChange={(e) => setGenKind(e.target.value as typeof genKind)} className={inputCls}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select value={genCategory} onChange={(e) => setGenCategory(e.target.value)} className={inputCls}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.label}</option>
                ))}
              </select>
            </Field>
            {genKind === "forecast" && (
              <>
                <Field label="Commodity (optional)">
                  <input value={genCommodity} onChange={(e) => setGenCommodity(e.target.value)} className={inputCls} placeholder="Dry Maize" />
                </Field>
                <Field label="Indicator (optional)">
                  <input value={genIndicator} onChange={(e) => setGenIndicator(e.target.value)} className={inputCls} placeholder="Inflation Rate" />
                </Field>
              </>
            )}
            {genKind === "recommendation" && (
              <Field label="Interest tags (comma-separated)">
                <input value={genInterests} onChange={(e) => setGenInterests(e.target.value)} className={inputCls} placeholder="maize, forex" />
              </Field>
            )}
          </div>
          <button onClick={generate} disabled={genBusy} className={`${btnCls} mt-3 w-auto px-6`}>
            {genBusy ? "Generating…" : "Generate"}
          </button>

          {generated.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {generated.map((g) => (
                <li key={g.id} className="rounded-lg bg-panel-2 px-3 py-2 text-sm">
                  <span className="font-bold">{g.title}</span>{" "}
                  <span className="text-xs text-mut">({g.kind})</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* macro indicator manual entry */}
          <Card>
            <h2 className="mb-4 text-base font-bold">Record macro indicator</h2>
            <div className="flex flex-col gap-3">
              <Field label="Name">
                <input value={indName} onChange={(e) => setIndName(e.target.value)} className={inputCls} placeholder="Inflation Rate" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Value">
                  <input value={indValue} onChange={(e) => setIndValue(e.target.value)} type="number" step="any" className={inputCls} />
                </Field>
                <Field label="Unit">
                  <input value={indUnit} onChange={(e) => setIndUnit(e.target.value)} className={inputCls} placeholder="%" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Period">
                  <input value={indPeriod} onChange={(e) => setIndPeriod(e.target.value)} className={inputCls} placeholder="2026-05" />
                </Field>
                <Field label="Source">
                  <input value={indSource} onChange={(e) => setIndSource(e.target.value)} className={inputCls} placeholder="KNBS" />
                </Field>
              </div>
              <button onClick={addIndicator} disabled={!indName || !indValue || !indPeriod} className={btnCls}>
                Save indicator
              </button>
            </div>
          </Card>

          {/* recent insights */}
          <Card>
            <h2 className="mb-3 text-base font-bold">Recent insights</h2>
            {insights.length === 0 ? (
              <p className="text-sm text-mut">No insights generated yet.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {insights.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.title}</p>
                      <p className="text-xs text-mut-2">{i.kind} · {i.category}</p>
                    </div>
                    <button onClick={() => deleteInsight(i.id)} className="shrink-0 text-xs font-bold text-down hover:underline">
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
