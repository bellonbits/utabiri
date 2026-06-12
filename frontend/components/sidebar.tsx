import {
  gradientFor,
  recentActivity,
  topVolume,
  trendingTopics,
} from "@/lib/data";
import {
  ChevronRightIcon,
  StarIcon,
  TrendUpIcon,
} from "@/components/icons";
import { NseLive } from "@/components/live-markets";
import { NewsPanel } from "@/components/news-feed";

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

function InitialsAvatar({ name, size = "h-7 w-7" }: { name: string; size?: string }) {
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(
        name,
      )} text-[11px] font-bold uppercase text-white`}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function Sidebar() {
  return (
    <aside className="flex flex-col gap-3">
      <Panel>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent-2">
            <TrendUpIcon width={18} height={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold">Portfolio</h4>
            <p className="text-xs text-mut">
              Deposit with M-Pesa to start trading
            </p>
          </div>
          <a
            href="#"
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:brightness-90"
          >
            Deposit <ChevronRightIcon width={12} height={12} />
          </a>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <StarIcon width={18} height={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold">Watchlist</h4>
            <p className="text-xs text-mut">
              Star any market to add it to your watchlist
            </p>
          </div>
          <a
            href="#"
            className="flex shrink-0 items-center gap-0.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-white transition hover:bg-panel-2"
          >
            Trending <ChevronRightIcon width={12} height={12} />
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

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold">Trending Topics</h4>
          <a href="#" className="text-xs font-semibold text-mut hover:text-white">
            See all
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.map((t) => (
            <button
              key={t}
              className="rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-xs font-medium text-white/85 transition hover:border-accent/60"
            >
              {t}
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold">Recent Activity</h4>
          <a href="#" className="text-xs font-semibold text-mut hover:text-white">
            See all
          </a>
        </div>
        <ul className="flex flex-col divide-y divide-line/60">
          {recentActivity.map((a, i) => (
            <li key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <InitialsAvatar name={a.user} />
              <div className="min-w-0 text-xs leading-snug">
                <p className="truncate text-mut">{a.market}</p>
                <p className="mt-0.5">
                  <span className="font-semibold text-white">{a.user}</span>{" "}
                  <span className="text-mut">{a.action}</span>{" "}
                  <span
                    className={
                      a.side === "Yes"
                        ? "font-bold text-up"
                        : "font-bold text-down"
                    }
                  >
                    {a.side}
                  </span>{" "}
                  <span className="text-mut">at {a.price}</span>{" "}
                  <span className="text-mut-2">{a.amount}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold">Top Volume This Week</h4>
          <a href="#" className="text-xs font-semibold text-mut hover:text-white">
            Show all
          </a>
        </div>
        <ol className="grid grid-cols-2 gap-3">
          {topVolume.map((u, i) => (
            <li key={u.name} className="flex items-center gap-2">
              <span className="text-xs font-bold text-mut-2">{i + 1}</span>
              <InitialsAvatar name={u.name} />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{u.name}</p>
                <p className="truncate text-[11px] text-mut">{u.amount}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </aside>
  );
}
