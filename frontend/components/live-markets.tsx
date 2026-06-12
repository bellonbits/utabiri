"use client";

import { useEffect, useState } from "react";

/**
 * Live Kenyan market data:
 *  - NSE equities via our /api/nse route (server-side scrape, 5 min cache)
 *  - USD/KES reference rate: open.er-api.com (no key required)
 */
type NseQuote = {
  symbol: string;
  name: string;
  volume: number;
  price: number;
  changePct: number;
};

const NSE_WATCH = ["SCOM", "KCB", "EABL", "KPLC", "KUKZ", "UMME"];

function useNseData() {
  const [nse, setNse] = useState<NseQuote[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/nse")
        .then((r) => r.json())
        .then(
          (d: { quotes?: NseQuote[] }) =>
            alive &&
            d.quotes &&
            setNse(
              NSE_WATCH.map((s) =>
                d.quotes!.find((q) => q.symbol === s),
              ).filter((q): q is NseQuote => Boolean(q)),
            ),
        )
        .catch(() => {});
    load();
    const t = setInterval(load, 300_000); // source updates ~5 min
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return nse;
}

function useUsdKes() {
  const [usdKes, setUsdKes] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((d) => alive && setUsdKes(d?.rates?.KES ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return usdKes;
}

/** Sidebar panel: live NSE Kenya quotes via /api/nse. */
export function NseLive() {
  const nse = useNseData();

  if (!nse) {
    return (
      <div className="flex flex-col gap-2">
        {NSE_WATCH.map((s) => (
          <div
            key={s}
            className="h-16 animate-pulse rounded-lg border border-line/60 bg-panel-2"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {nse.map((q) => {
        const up = q.changePct >= 0;
        return (
          <div
            key={q.symbol}
            className="rounded-lg border border-line/60 bg-panel-2 p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-extrabold">{q.symbol}</p>
                <p className="truncate text-[11px] text-mut">{q.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">
                  {q.price.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p
                  className={`text-[11px] font-bold ${up ? "text-up" : "text-down"}`}
                >
                  {up ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%
                </p>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-mut-2">
              Vol {q.volume.toLocaleString("en-KE")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Scrolling ticker under the category tabs — live NSE + USD/KES. */
export function LiveTicker() {
  const nse = useNseData();
  const usdKes = useUsdKes();
  if (!nse) return <div className="h-10 border-b border-line bg-ink" />;

  const entries = [
    ...nse.map((q) => ({
      label: q.symbol,
      value: q.price.toLocaleString("en-KE", { minimumFractionDigits: 2 }),
      changePct: q.changePct as number | null,
    })),
    ...(usdKes
      ? [{ label: "USD/KES", value: usdKes.toFixed(2), changePct: null }]
      : []),
  ];
  const loop = [...entries, ...entries];

  return (
    <div className="overflow-hidden border-b border-line bg-ink py-2">
      <div className="ticker-track flex w-max items-center gap-8 px-4">
        {loop.map((e, i) => (
          <span
            key={`${e.label}-${i}`}
            className="flex shrink-0 items-center gap-2 text-sm"
          >
            <span className="font-extrabold">{e.label}</span>
            <span className="text-mut">{e.value}</span>
            {e.changePct !== null && (
              <span
                className={`text-xs font-bold ${
                  e.changePct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {e.changePct >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(e.changePct).toFixed(2)}%
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
