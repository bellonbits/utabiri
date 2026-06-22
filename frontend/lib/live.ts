import { IMG } from "@/lib/data";

/** Base URL for calling the API from server components / route handlers.
 *  The browser uses NEXT_PUBLIC_API_URL (possibly a relative /backend
 *  rewrite), but server code needs an absolute origin. */
export function serverApiUrl(): string {
  const pub = process.env.NEXT_PUBLIC_API_URL ?? "";
  return (
    process.env.BACKEND_ORIGIN ??
    (pub.startsWith("http") ? pub : "http://localhost:8000")
  );
}

export function fmtPriceKES(value: number | null, unit?: string | null): string {
  if (value === null) return "—";
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 2 })}${unit ? `/${unit}` : ""}`;
}

export function fmtEndDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}

const CATEGORY_IMG: Record<string, string> = {
  Agriculture: IMG.maize,
  Macro: IMG.bankColumns,
  Forex: IMG.forex,
  Markets: IMG.stockChart,
  Trade: IMG.nairobi,
  Energy: IMG.rain,
};

export function categoryImage(category: string): string {
  return CATEGORY_IMG[category] || IMG.nairobi;
}
