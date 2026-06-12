"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ApiMarket } from "@/lib/api";
import { fmtKES, useSession } from "@/lib/session";
import { btnCls, Card, Field, inputCls, Notice, Shell } from "@/components/shell";

type Stats = {
  total_users: number;
  total_trades: number;
  trading_volume_cents: number;
  revenue_cents: number;
  deposits_cents: number;
  open_markets: number;
};

type WithdrawalDto = {
  id: string;
  user_id: string;
  amount_cents: number;
  fee_cents: number;
  phone: string;
  status: string;
  created_at: string;
};

type Suggestion = {
  question: string;
  category: string;
  outcomes: { label: string; initial_price: number }[];
  rationale: string;
  resolution_criteria: string;
  end_date: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function AdminPage() {
  const user = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalDto[]>([]);
  const [markets, setMarkets] = useState<ApiMarket[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // create-market form
  const [mId, setMId] = useState("");
  const [mQuestion, setMQuestion] = useState("");
  const [mCategory, setMCategory] = useState("Politics");
  const [mEnd, setMEnd] = useState("");
  const [mOutcomes, setMOutcomes] = useState("Yes:0.5");

  // resolve form
  const [rMarket, setRMarket] = useState("");
  const [rOutcome, setROutcome] = useState("");
  const [rEvidence, setREvidence] = useState("");

  // AI suggestions
  const [aiBusy, setAiBusy] = useState(false);
  const [trends, setTrends] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const refresh = useCallback(() => {
    api<Stats>("/admin/stats").then(setStats).catch(() => {});
    api<{ items: WithdrawalDto[] }>("/admin/withdrawals")
      .then((r) => setWithdrawals(r.items))
      .catch(() => {});
    api<{ items: ApiMarket[] }>("/markets", { token: null })
      .then((r) => setMarkets(r.items))
      .catch(() => {});
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

  const createMarket = () =>
    run(async () => {
      // API requires ^[a-z0-9-]+$ — slugify whatever was typed
      const id = mId
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const outcomes = mOutcomes
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const i = l.lastIndexOf(":");
          const label = i === -1 ? l : l.slice(0, i);
          const n = i === -1 ? 0.5 : Number(l.slice(i + 1));
          // accept "60" as 60% alongside "0.6"
          const price = !Number.isFinite(n) || n <= 0 ? 0.5 : n > 1 ? n / 100 : n;
          return { label: label.trim(), initial_price: Math.min(price, 0.99) };
        });
      await api("/admin/markets", {
        method: "POST",
        body: {
          id,
          question: mQuestion,
          category: mCategory,
          kind: outcomes.length > 1 ? "multi" : "binary",
          end_date: new Date(mEnd).toISOString(),
          outcomes,
        },
      });
      return `Market "${id}" created`;
    });

  const resolve = () =>
    run(async () => {
      const r = await api<{ winners_count: number; payout_total_cents: number }>(
        "/admin/resolve-market",
        {
          method: "POST",
          body: {
            market_id: rMarket,
            winning_outcome_id: rOutcome || null,
            evidence: rEvidence,
          },
        },
      );
      return `Resolved — ${r.winners_count} winners paid ${fmtKES(r.payout_total_cents)}`;
    });

  const actWithdrawal = (id: string, approve: boolean) =>
    run(async () => {
      await api("/admin/withdrawals/action", {
        method: "POST",
        body: { withdrawal_id: id, approve },
      });
      return `Withdrawal ${approve ? "approved" : "rejected"}`;
    });

  const generateSuggestions = async () => {
    setAiBusy(true);
    setMsg(null);
    try {
      const news = await fetch("/api/news").then((r) => r.json());
      const headlines = (news.items ?? [])
        .slice(0, 25)
        .map((n: { title: string; source: string; category: string }) => ({
          title: n.title,
          source: n.source,
          category: n.category,
        }));
      if (headlines.length === 0) throw new Error("No headlines available");
      const r = await api<{ trends: string[]; suggestions: Suggestion[] }>(
        "/admin/suggest-markets",
        { method: "POST", body: { headlines } },
      );
      setTrends(r.trends);
      setSuggestions(r.suggestions);
      setMsg({ ok: true, text: `AI proposed ${r.suggestions.length} markets from today's news` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "AI failed" });
    } finally {
      setAiBusy(false);
    }
  };

  const useSuggestion = (s: Suggestion) => {
    setMId(slugify(s.question));
    setMQuestion(s.question);
    setMCategory(s.category);
    setMEnd(s.end_date);
    setMOutcomes(
      s.outcomes.map((o) => `${o.label}:${o.initial_price}`).join("\n"),
    );
    setMsg({ ok: true, text: "Suggestion loaded into the create-market form — review and submit" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selMarket = markets.find((m) => m.id === rMarket);

  return (
    <Shell title="Admin Dashboard" subtitle="Markets, withdrawals and platform analytics" wide>
      <div className="flex flex-col gap-4">
        {/* stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {stats &&
            (
              [
                ["Users", String(stats.total_users)],
                ["Trades", String(stats.total_trades)],
                ["Volume", fmtKES(stats.trading_volume_cents)],
                ["Revenue", fmtKES(stats.revenue_cents)],
                ["Deposits", fmtKES(stats.deposits_cents)],
                ["Open markets", String(stats.open_markets)],
              ] as const
            ).map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-xs font-semibold text-mut">{label}</p>
                <p className="mt-1 truncate text-lg font-extrabold">{value}</p>
              </Card>
            ))}
        </div>

        {msg && <Notice ok={msg.ok} text={msg.text} />}

        {/* AI market suggestions */}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">AI Market Suggestions</h2>
              <p className="text-xs text-mut">
                Groq reads today&apos;s headlines from the news aggregator and
                drafts resolvable markets — you review before publishing.
              </p>
            </div>
            <button
              onClick={generateSuggestions}
              disabled={aiBusy}
              className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-white transition hover:bg-accent-2 disabled:opacity-50"
            >
              {aiBusy ? "Reading the news…" : "Generate from latest news"}
            </button>
          </div>

          {trends.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {trends.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold text-accent-2"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {suggestions.map((s) => (
                <li
                  key={s.question}
                  className="flex flex-col rounded-xl border border-line bg-panel-2 p-4"
                >
                  <p className="text-sm font-bold leading-snug">{s.question}</p>
                  <p className="mt-1.5 text-xs text-mut">{s.rationale}</p>
                  <p className="mt-1 text-xs text-mut-2">
                    Resolves via: {s.resolution_criteria}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-panel px-2 py-0.5 font-bold text-mut">
                      {s.category}
                    </span>
                    <span className="text-mut-2">ends {s.end_date}</span>
                    {s.outcomes.map((o) => (
                      <span key={o.label} className="font-bold text-up">
                        {o.label} {(o.initial_price * 100).toFixed(0)}%
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => useSuggestion(s)}
                    className="mt-3 rounded-lg border border-accent/50 py-2 text-sm font-bold text-accent-2 transition hover:bg-accent hover:text-white"
                  >
                    Use this market
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* create market */}
          <Card>
            <h2 className="mb-4 text-base font-bold">Create market</h2>
            <div className="flex flex-col gap-3">
              <Field label="Slug (a-z, 0-9, dashes)">
                <input value={mId} onChange={(e) => setMId(e.target.value)} className={inputCls} placeholder="ruto-2027" />
              </Field>
              <Field label="Question">
                <input value={mQuestion} onChange={(e) => setMQuestion(e.target.value)} className={inputCls} placeholder="Will…?" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select value={mCategory} onChange={(e) => setMCategory(e.target.value)} className={inputCls}>
                    {["Politics", "Sports", "Elections", "Finance", "Business", "Technology", "Entertainment", "Crypto", "Economy", "Kenya"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="End date">
                  <input type="date" value={mEnd} onChange={(e) => setMEnd(e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Outcomes — one per line as label:probability">
                <textarea
                  rows={3}
                  value={mOutcomes}
                  onChange={(e) => setMOutcomes(e.target.value)}
                  className={inputCls}
                  placeholder={"Yes:0.5"}
                />
              </Field>
              <button onClick={createMarket} className={btnCls}>
                Create market
              </button>
            </div>
          </Card>

          {/* resolve market */}
          <Card>
            <h2 className="mb-4 text-base font-bold">Resolve market</h2>
            <div className="flex flex-col gap-3">
              <Field label="Market">
                <select
                  value={rMarket}
                  onChange={(e) => {
                    setRMarket(e.target.value);
                    setROutcome("");
                  }}
                  className={inputCls}
                >
                  <option value="">Select open market…</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.question}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Winning outcome (resolves YES)">
                <select value={rOutcome} onChange={(e) => setROutcome(e.target.value)} className={inputCls}>
                  <option value="">None — all outcomes resolve NO</option>
                  {selMarket?.outcomes.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Evidence / source links">
                <input value={rEvidence} onChange={(e) => setREvidence(e.target.value)} className={inputCls} placeholder="Paste source URLs…" />
              </Field>
              <p className="rounded-lg bg-panel-2 px-3 py-2 text-xs leading-relaxed text-mut">
                Resolution policy: cite <span className="font-bold text-white">two trusted outlets</span>{" "}
                (Nation, The Standard, KNA, Business Daily, The Star) <span className="font-bold text-white">or one
                official source</span> (CBK, KNBS, IEBC, NSE, FIFA, CAF). Single
                unofficial sources are not sufficient.
              </p>
              <button onClick={resolve} disabled={!rMarket || rEvidence.length < 5} className={btnCls}>
                Resolve & pay out
              </button>
            </div>
          </Card>
        </div>

        {/* withdrawals queue */}
        <Card>
          <h2 className="mb-3 text-base font-bold">Withdrawals</h2>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-mut">No withdrawal requests.</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {fmtKES(w.amount_cents)}{" "}
                      <span className="font-normal text-mut">→ {w.phone}</span>
                    </p>
                    <p className="text-xs text-mut-2">
                      fee {fmtKES(w.fee_cents)} · {new Date(w.created_at).toLocaleString()}
                    </p>
                  </div>
                  {w.status === "pending" ? (
                    <span className="flex gap-2">
                      <button
                        onClick={() => actWithdrawal(w.id, true)}
                        className="rounded-lg bg-up/15 px-4 py-1.5 text-xs font-bold text-up hover:bg-up/30"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => actWithdrawal(w.id, false)}
                        className="rounded-lg bg-down/15 px-4 py-1.5 text-xs font-bold text-down hover:bg-down/30"
                      >
                        Reject
                      </button>
                    </span>
                  ) : (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        w.status === "completed"
                          ? "bg-up/15 text-up"
                          : "bg-down/15 text-down"
                      }`}
                    >
                      {w.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
