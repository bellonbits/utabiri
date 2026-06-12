"use client";

import { useEffect, useRef } from "react";

/**
 * Official TradingView embed widgets (https://www.tradingview.com/widget/).
 * Each widget injects its own iframe via the embed script; we re-inject on
 * symbol change and clean up on unmount.
 */
function useTVWidget(
  ref: React.RefObject<HTMLDivElement | null>,
  script: string,
  config: Record<string, unknown>,
) {
  const json = JSON.stringify(config);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const s = document.createElement("script");
    s.src = `https://s3.tradingview.com/external-embedding/${script}.js`;
    s.async = true;
    s.innerHTML = json;
    el.appendChild(s);
    return () => {
      el.innerHTML = "";
    };
  }, [ref, script, json]);
}

/** Full advanced chart — used in the Macro Dashboard section. */
export function TVAdvancedChart({
  symbol,
  height = 420,
}: {
  symbol: string;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTVWidget(ref, "embed-widget-advanced-chart", {
    symbol,
    autosize: true,
    interval: "60",
    timezone: "Africa/Nairobi",
    theme: "dark",
    style: "1",
    locale: "en",
    backgroundColor: "rgba(18, 27, 46, 1)",
    gridColor: "rgba(32, 48, 78, 0.4)",
    hide_top_toolbar: false,
    allow_symbol_change: true,
    support_host: "https://www.tradingview.com",
  });
  return (
    <div
      className="overflow-hidden rounded-xl border border-line"
      style={{ height }}
    >
      <div ref={ref} className="tradingview-widget-container h-full" />
    </div>
  );
}
