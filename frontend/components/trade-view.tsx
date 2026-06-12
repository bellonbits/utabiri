"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  api,
  getToken,
  type ApiMarket,
  type BuyResult,
  type SellResult,
} from "@/lib/api";
import {
  BookmarkIcon,
  ChevronDownIcon,
  PulseIcon,
} from "@/components/icons";

export type TradeOutcome = {
  label: string;
  pct: number; // YES probability 0-100
  vol: string;
  color: string;
};

export type TradeMarketDto = {
  id: string;
  question: string;
  image: string;
  category: string;
  volume: string;
  endDate: string;
};

const RANGES = ["1H", "6H", "1D", "1W", "1M", "ALL"];

function fmtKes(n: number): string {
  return `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

export function TradeView({
  market,
  outcomes: staticOutcomes,
  chart,
}: {
  market: TradeMarketDto;
  outcomes: TradeOutcome[];
  chart: ReactNode;
}) {
  const [sel, setSel] = useState(0);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [range, setRange] = useState("ALL");
  // live prices + outcome ids from the backend; falls back to static mocks
  const [live, setLive] = useState<ApiMarket | null>(null);

  const refresh = useCallback(() => {
    api<ApiMarket>(`/markets/${market.id}`, { token: null })
      .then(setLive)
      .catch(() => {});
  }, [market.id]);

  useEffect(refresh, [refresh]);

  const outcomes: TradeOutcome[] = staticOutcomes.map((o, i) => {
    const lo = live?.outcomes[i];
    return lo ? { ...o, pct: Math.round(lo.price_yes * 100) } : o;
  });
  const outcomeIds = staticOutcomes.map((_, i) => live?.outcomes[i]?.id ?? null);
  const marketOpen = live ? live.status === "open" : true;

  const pick = (i: number, s: "yes" | "no") => {
    setSel(i);
    setSide(s);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ---------- main column ---------- */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-mut">
          Markets <span className="text-mut-2">·</span> {market.category}
        </p>
        <div className="mt-1 flex items-start gap-3">
          <Image
            src={market.image}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
          <h1 className="min-w-0 flex-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {market.question}
          </h1>
          <button className="rounded-md p-2 text-mut hover:text-white">
            <BookmarkIcon width={18} height={18} />
          </button>
        </div>

        <div className="mt-5">{chart}</div>

        {/* volume / end date / ranges */}
        <div className="mt-2 flex flex-wrap items-center gap-3 border-b border-line pb-3 text-sm text-mut">
          <span className="flex items-center gap-1.5 font-medium">
            <PulseIcon width={15} height={15} /> {market.volume}
          </span>
          <span className="text-mut-2">|</span>
          <span>Ends {market.endDate}</span>
          <span className="ml-auto flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                  range === r
                    ? "bg-panel-2 text-white"
                    : "text-mut hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </span>
        </div>

        {/* outcome rows */}
        <div className="divide-y divide-line/70">
          {outcomes.map((o, i) => (
            <div key={o.label} className="flex items-center gap-3 py-3.5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white"
                style={{ background: o.color }}
              >
                {o.label.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{o.label}</p>
                <p className="text-xs text-mut">{o.vol}</p>
              </div>
              <span className="w-20 text-center text-2xl font-extrabold tracking-tight">
                {o.pct}%
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => pick(i, "yes")}
                  className={`w-32 rounded-lg py-2.5 text-sm font-bold transition ${
                    sel === i && side === "yes"
                      ? "bg-up text-ink"
                      : "bg-up/15 text-up hover:bg-up/30"
                  }`}
                >
                  Buy Yes {o.pct}¢
                </button>
                <button
                  onClick={() => pick(i, "no")}
                  className={`w-32 rounded-lg py-2.5 text-sm font-bold transition ${
                    sel === i && side === "no"
                      ? "bg-down text-white"
                      : "bg-down/15 text-down hover:bg-down/30"
                  }`}
                >
                  Buy No {100 - o.pct}¢
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- trade panel ---------- */}
      <div>
        <TradePanel
          market={market}
          outcome={outcomes[sel]}
          outcomeId={outcomeIds[sel]}
          marketOpen={marketOpen}
          onTraded={refresh}
          side={side}
          onSide={setSide}
        />
        <p className="mt-3 text-center text-xs text-mut">
          By trading, you agree to the{" "}
          <a href="/terms" className="underline hover:text-white">
            Terms of Use
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function TradePanel({
  market,
  outcome,
  outcomeId,
  marketOpen,
  onTraded,
  side,
  onSide,
}: {
  market: TradeMarketDto;
  outcome: TradeOutcome;
  outcomeId: string | null;
  marketOpen: boolean;
  onTraded: () => void;
  side: "yes" | "no";
  onSide: (s: "yes" | "no") => void;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [mode, setMode] = useState<"market" | "limit">("market");
  const [modeOpen, setModeOpen] = useState(false);
  const [amount, setAmount] = useState(0); // KES, market mode
  const [limitPrice, setLimitPrice] = useState(0); // cents
  const [shares, setShares] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const router = useRouter();

  const executeTrade = async () => {
    if (!outcomeId) {
      setMsg({ ok: false, text: "Market data unavailable — try again shortly" });
      return;
    }
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (tab === "buy") {
        if (amount < 10) throw new Error("Minimum trade is KES 10");
        const r = await api<BuyResult>("/trade/buy", {
          method: "POST",
          body: {
            outcome_id: outcomeId,
            side: side.toUpperCase(),
            amount_cents: Math.round(amount * 100),
          },
        });
        setBalance(r.new_balance_cents);
        setMsg({
          ok: true,
          text: `Bought ${r.shares.toFixed(2)} ${side.toUpperCase()} shares @ ${r.avg_price.toFixed(2)} (fee KES ${(r.fee_cents / 100).toFixed(2)})`,
        });
      } else {
        const qty = shares || amount; // sell uses the shares input
        if (qty <= 0) throw new Error("Enter shares to sell");
        const r = await api<SellResult>("/trade/sell", {
          method: "POST",
          body: {
            outcome_id: outcomeId,
            side: side.toUpperCase(),
            quantity: qty,
          },
        });
        setBalance(r.new_balance_cents);
        setMsg({
          ok: true,
          text: `Sold ${qty} shares for KES ${(r.proceeds_cents / 100).toFixed(2)} (P&L ${(r.realized_pnl_cents / 100).toFixed(2)})`,
        });
      }
      onTraded();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Trade failed" });
    } finally {
      setBusy(false);
    }
  };

  const yesPrice = outcome.pct;
  const noPrice = 100 - outcome.pct;
  const price = side === "yes" ? yesPrice : noPrice;

  const toWin = price > 0 ? (amount / price) * 100 : 0;
  const limitTotal = (shares * limitPrice) / 100;
  const limitToWin = shares; // each share pays KES 1

  return (
    <section className="sticky top-20 rounded-2xl border border-line bg-panel p-5 shadow-xl shadow-black/20">
      {/* header */}
      <div className="flex items-center gap-3">
        <Image
          src={market.image}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{market.question}</p>
          <p className="truncate text-sm">
            <span className="text-mut">{outcome.label}</span>
            <span className="text-mut-2"> · </span>
            <span
              className={
                side === "yes" ? "font-bold text-up" : "font-bold text-down"
              }
            >
              {side === "yes" ? "Yes" : "No"}
            </span>
          </p>
        </div>
      </div>

      {/* tabs + mode */}
      <div className="mt-4 flex items-center border-b border-line">
        {(["buy", "sell"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 pb-2 text-sm font-bold capitalize transition ${
              tab === t
                ? "border-accent-2 text-white"
                : "border-transparent text-mut hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="relative ml-auto pb-1">
          <button
            onClick={() => setModeOpen(!modeOpen)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-mut hover:text-white"
          >
            {mode === "market" ? "Market" : "Limit"}
            <ChevronDownIcon width={14} height={14} />
          </button>
          {modeOpen && (
            <div className="absolute right-0 top-8 z-10 w-28 overflow-hidden rounded-lg border border-line bg-panel-2 shadow-lg">
              {(["market", "limit"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setModeOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm capitalize hover:bg-panel ${
                    mode === m ? "font-bold text-white" : "text-mut"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* side selector */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => onSide("yes")}
          className={`rounded-lg py-3 text-sm font-bold transition ${
            side === "yes"
              ? "bg-up text-ink"
              : "bg-panel-2 text-mut hover:text-white"
          }`}
        >
          Yes {yesPrice}¢
        </button>
        <button
          onClick={() => onSide("no")}
          className={`rounded-lg py-3 text-sm font-bold transition ${
            side === "no"
              ? "bg-down text-white"
              : "bg-panel-2 text-mut hover:text-white"
          }`}
        >
          No {noPrice}¢
        </button>
      </div>

      {mode === "market" ? (
        <>
          {/* amount */}
          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-bold">Amount</span>
            <div className="flex items-baseline gap-1 text-right">
              <span className="text-2xl font-extrabold text-mut-2">KES</span>
              <input
                type="number"
                min={0}
                value={amount || ""}
                placeholder="0"
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-32 bg-transparent text-right text-4xl font-extrabold outline-none placeholder:text-mut-2"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {[10, 50, 100, 500].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(amount + v)}
                className="rounded-full border border-line px-3 py-1 text-xs font-bold text-mut transition hover:text-white"
              >
                +{v}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="font-bold">To win</span>
            <span className="text-xl font-extrabold text-up">
              {fmtKes(toWin)}
            </span>
          </div>
        </>
      ) : (
        <>
          {/* limit price */}
          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-bold">Limit price</span>
            <div className="flex items-center overflow-hidden rounded-lg border border-line">
              <button
                onClick={() => setLimitPrice(Math.max(0, limitPrice - 1))}
                className="px-3 py-2 text-mut hover:text-white"
              >
                −
              </button>
              <span className="w-16 text-center text-sm font-bold">
                {limitPrice.toFixed(1)}¢
              </span>
              <button
                onClick={() => setLimitPrice(Math.min(99, limitPrice + 1))}
                className="px-3 py-2 text-mut hover:text-white"
              >
                +
              </button>
            </div>
          </div>

          {/* shares */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-bold">Shares</span>
            <input
              type="number"
              min={0}
              value={shares || ""}
              placeholder="0"
              onChange={(e) => setShares(Number(e.target.value))}
              className="w-32 rounded-lg border border-line bg-transparent px-3 py-2 text-right text-sm font-bold outline-none focus:border-accent"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {tab === "buy"
              ? [-100, -10, 10, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setShares(Math.max(0, shares + v))}
                    className="rounded-full border border-line px-3 py-1 text-xs font-bold text-mut transition hover:text-white"
                  >
                    {v > 0 ? `+${v}` : v}
                  </button>
                ))
              : ["25%", "50%", "75%", "Max"].map((v) => (
                  <button
                    key={v}
                    className="rounded-full border border-line px-3 py-1 text-xs font-bold text-mut transition hover:text-white"
                  >
                    {v}
                  </button>
                ))}
          </div>

          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="font-bold">Expires</span>
            <button className="flex items-center gap-1 font-semibold text-mut hover:text-white">
              Never <ChevronDownIcon width={14} height={14} />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-bold">Total</span>
            <span className="font-extrabold text-accent-2">
              {fmtKes(limitTotal)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-bold">
              {tab === "buy" ? "To win" : "You'll receive"}
            </span>
            <span className="text-lg font-extrabold text-up">
              {fmtKes(tab === "buy" ? limitToWin : limitTotal)}
            </span>
          </div>
        </>
      )}

      {msg && (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${
            msg.ok ? "bg-up/10 text-up" : "bg-down/10 text-down"
          }`}
        >
          {msg.text}
        </p>
      )}
      {balance !== null && (
        <p className="mt-2 text-right text-xs text-mut">
          Balance:{" "}
          <span className="font-bold text-white">
            {fmtKes(balance / 100)}
          </span>
        </p>
      )}

      <button
        onClick={executeTrade}
        disabled={busy || !marketOpen}
        className="mt-5 w-full rounded-xl bg-accent py-3.5 text-base font-bold text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!marketOpen ? "Market closed" : busy ? "Trading…" : "Trade"}
      </button>
    </section>
  );
}
