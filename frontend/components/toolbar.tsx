import { filterChips } from "@/lib/data";
import {
  ChevronDownIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  PlayIcon,
  SearchIcon,
  SparkIcon,
} from "@/components/icons";

export function Toolbar() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button className="rounded-lg border border-line bg-panel p-2.5 text-mut hover:text-white">
          <FilterIcon width={16} height={16} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
          <SearchIcon className="shrink-0 text-mut-2" width={16} height={16} />
          <input
            placeholder="Search markets"
            className="w-full bg-transparent text-sm outline-none placeholder:text-mut-2"
          />
        </div>
        <button className="hidden items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium text-white sm:flex">
          <SparkIcon width={14} height={14} className="text-accent-2" />
          Newest
          <ChevronDownIcon width={14} height={14} className="text-mut" />
        </button>
        <div className="hidden overflow-hidden rounded-lg border border-line sm:flex">
          <button className="bg-accent p-2.5 text-white">
            <GridIcon width={16} height={16} />
          </button>
          <button className="bg-panel p-2.5 text-mut hover:text-white">
            <ListIcon width={16} height={16} />
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium text-white">
          <PlayIcon className="text-accent-2" /> Animations
          <span className="relative inline-flex h-4.5 w-8 items-center rounded-full bg-accent">
            <span className="absolute right-0.5 h-3.5 w-3.5 rounded-full bg-white" />
          </span>
        </label>
        {filterChips.map((c, i) => (
          <button
            key={c}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              i === 0
                ? "bg-white text-ink"
                : "border border-line bg-panel text-mut hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
