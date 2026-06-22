import { ChevronRightIcon, StarIcon } from "@/components/icons";
import { NseLive } from "@/components/live-markets";
import { NewsPanel } from "@/components/news-feed";
import { TopContributors } from "@/components/top-contributors";

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-panel p-4 ${className}`}
    >
      {children}
    </section>
  );
}

export function Sidebar() {
  return (
    <aside className="flex flex-col gap-3">
      <Panel>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <StarIcon width={18} height={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold">Stay informed</h4>
            <p className="text-xs text-mut">
              Follow commodities or indicators for tailored insights
            </p>
          </div>
          <a
            href="/settings"
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:brightness-90"
          >
            Set up <ChevronRightIcon width={12} height={12} />
          </a>
        </div>
      </Panel>

      <NewsPanel />

      <Panel className="p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <h4 className="text-sm font-bold">NSE Live</h4>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-mut-2">
            Nairobi Securities Exchange
          </span>
        </div>
        <NseLive />
      </Panel>

      <TopContributors />
    </aside>
  );
}
