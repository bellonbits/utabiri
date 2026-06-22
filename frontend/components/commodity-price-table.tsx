"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ApiCommodityPrice } from "@/lib/api";
import { fmtDate, fmtPriceKES } from "@/lib/live";
import { SearchIcon } from "@/components/icons";

export function CommodityPriceTable() {
  const [items, setItems] = useState<ApiCommodityPrice[]>([]);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [commodity, setCommodity] = useState("");
  const [county, setCounty] = useState("");

  useEffect(() => {
    api<{ items: string[] }>("/commodities", { token: null })
      .then((r) => setCommodities(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ per_page: "30" });
    if (commodity) params.set("commodity", commodity);
    if (county) params.set("county", county);
    api<{ items: ApiCommodityPrice[] }>(`/commodities/prices?${params}`, { token: null })
      .then((r) => setItems(r.items))
      .catch(() => {});
  }, [commodity, county]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight">Commodity prices</h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-mut-2">
          Source · KAMIS
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 sm:max-w-xs">
          <SearchIcon className="shrink-0 text-mut-2" width={16} height={16} />
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          >
            <option value="">All commodities</option>
            {commodities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <input
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          placeholder="Filter by county…"
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none placeholder:text-mut-2 sm:max-w-xs"
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
          <p className="text-base font-bold">No price data yet</p>
          <p className="mt-1 text-sm text-mut">KAMIS ingestion runs automatically — check back soon.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold text-mut">
                <th className="px-3 py-2.5">Commodity</th>
                <th className="px-3 py-2.5">Market</th>
                <th className="px-3 py-2.5">County</th>
                <th className="px-3 py-2.5">Wholesale</th>
                <th className="px-3 py-2.5">Retail</th>
                <th className="px-3 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-panel-2">
                  <td className="px-3 py-2.5 font-semibold">
                    <Link href={`/commodities/${encodeURIComponent(r.commodity)}`} className="hover:text-accent-2">
                      {r.commodity}
                    </Link>
                    {r.classification && <span className="text-mut-2"> · {r.classification}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-mut">{r.market}</td>
                  <td className="px-3 py-2.5 text-mut">{r.county}</td>
                  <td className="px-3 py-2.5">{fmtPriceKES(r.wholesale_price, r.unit)}</td>
                  <td className="px-3 py-2.5">{fmtPriceKES(r.retail_price, r.unit)}</td>
                  <td className="px-3 py-2.5 text-mut-2">{fmtDate(r.price_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
