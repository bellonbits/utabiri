import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import type { ApiBillSummary } from "@/lib/api";
import { serverApiUrl } from "@/lib/live";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = {
  done: "bg-up/15 text-up",
  processing: "bg-gold/15 text-gold",
  failed: "bg-down/15 text-down",
};

export default async function BillsPage() {
  const res = await fetch(`${serverApiUrl()}/bills`, { cache: "no-store" }).catch(() => null);
  const items: ApiBillSummary[] = res && res.ok ? (await res.json()).items : [];

  return (
    <div className="min-h-dvh">
      <Navbar />
      <main className="mx-auto max-w-screen-lg px-4 pb-24 pt-6 md:pb-10">
        <h1 className="text-2xl font-extrabold tracking-tight">Bill Analysis</h1>
        <p className="mt-1 text-sm text-mut">
          AI clause-by-clause breakdowns of Finance Bills and other legislation affecting Kenya&apos;s economy.
        </p>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
            <p className="text-base font-bold">No bills analyzed yet</p>
            <p className="mt-1 text-sm text-mut">An admin can trigger an analysis from the admin dashboard.</p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-line/60 rounded-xl border border-line bg-panel">
            {items.map((b) => (
              <li key={b.id}>
                <Link href={`/bills/${b.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-panel-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{b.title}</p>
                    <p className="text-xs text-mut-2">{new Date(b.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${STATUS_CLS[b.status]}`}>
                    {b.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
