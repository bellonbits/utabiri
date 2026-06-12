import Image from "next/image";
import Link from "next/link";
import type { Market } from "@/lib/data";
import { ChanceGauge } from "@/components/gauge";
import {
  BookmarkIcon,
  GiftIcon,
  PulseIcon,
  StarIcon,
} from "@/components/icons";

function CardHeader({ market }: { market: Market }) {
  return (
    <div className="flex items-start gap-3">
      <Image
        src={market.image}
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-lg object-cover"
      />
      <h3 className="min-w-0 flex-1 text-[15px] font-bold leading-snug">
        {market.question}
      </h3>
      {market.kind === "binary" && <ChanceGauge pct={market.yes ?? 50} />}
    </div>
  );
}

function CardFooter({ market }: { market: Market }) {
  return (
    <div className="mt-auto flex items-center gap-2 pt-3 text-mut-2">
      {market.isNew && (
        <span className="flex items-center gap-1 text-[11px] font-extrabold text-gold">
          <StarIcon width={10} height={10} strokeWidth={3} /> NEW
        </span>
      )}
      {market.status && (
        <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-down">
          <span className="h-1.5 w-1.5 rounded-full bg-down" />
          {market.status}
        </span>
      )}
      <span className="text-xs font-medium">
        {market.volume}
        {market.category && <span className="text-mut-2"> · {market.category}</span>}
      </span>
      <span className="ml-auto flex items-center gap-2.5">
        <button className="hover:text-white">
          <GiftIcon width={15} height={15} />
        </button>
        <button className="hover:text-gold">
          <BookmarkIcon width={15} height={15} />
        </button>
      </span>
    </div>
  );
}

/** Binary: corner chance gauge + two big Yes/No buttons. */
function BinaryBody() {
  return (
    <div className="my-3.5 grid grid-cols-2 gap-2">
      <button className="rounded-lg bg-up/15 py-2.5 text-sm font-bold text-up transition hover:bg-up/30">
        Yes
      </button>
      <button className="rounded-lg bg-down/15 py-2.5 text-sm font-bold text-down transition hover:bg-down/30">
        No
      </button>
    </div>
  );
}

/** Multi: outcome rows with % and small Yes/No pills. */
function MultiBody({ market }: { market: Market }) {
  return (
    <div className="my-2 flex flex-col">
      {market.outcomes?.map((o) => (
        <div key={o.label} className="flex items-center gap-2 py-1.5">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
            {o.label}
          </span>
          <span className="text-[15px] font-extrabold">{o.yes}%</span>
          <button className="w-12 rounded-md bg-up/15 py-1 text-xs font-bold text-up transition hover:bg-up/30">
            Yes
          </button>
          <button className="w-12 rounded-md bg-down/15 py-1 text-xs font-bold text-down transition hover:bg-down/30">
            No
          </button>
        </div>
      ))}
    </div>
  );
}

/** Matchup: team rows with % + two tinted pick buttons. */
function MatchupBody({ market }: { market: Market }) {
  const [a, b] = market.teams!;
  return (
    <div className="my-2 flex flex-col gap-1">
      {[a, b].map((t) => (
        <div key={t.abbr} className="flex items-center gap-2.5 py-1">
          <span
            className={`flex h-7 w-9 items-center justify-center rounded-md ${t.color} text-[10px] font-extrabold text-white`}
          >
            {t.abbr}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {t.name}
          </span>
          <span className="text-[15px] font-extrabold">{t.pct}%</span>
        </div>
      ))}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          className={`truncate rounded-lg px-2 py-2.5 text-sm font-bold transition ${a.tint}`}
        >
          {a.name}
        </button>
        <button
          className={`truncate rounded-lg px-2 py-2.5 text-sm font-bold transition ${b.tint}`}
        >
          {b.name}
        </button>
      </div>
    </div>
  );
}

export function MarketCard({ market }: { market: Market }) {
  return (
    <article className="relative flex flex-col rounded-xl border border-line bg-panel p-4 transition hover:border-accent/50 hover:bg-panel-2">
      {/* whole card navigates; interactive children sit above via z-10 */}
      <Link
        href={`/markets/${market.id}`}
        aria-label={market.question}
        className="absolute inset-0 z-0 rounded-xl"
      />
      <CardHeader market={market} />
      <div className="relative z-10 flex flex-1 flex-col">
        {market.kind === "binary" && <BinaryBody />}
        {market.kind === "multi" && <MultiBody market={market} />}
        {market.kind === "matchup" && <MatchupBody market={market} />}
        <CardFooter market={market} />
      </div>
    </article>
  );
}
