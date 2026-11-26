"use client";

import { useBetslip } from "@/lib/betslip-store";
import { FileTextIcon } from "@/components/icons";

export function MobileBetslipTrigger() {
  const { count, potentialPayout, toggleDrawer } = useBetslip();

  if (count === 0) return null;

  return (
    <div className="fixed bottom-14 inset-x-0 z-40 p-2 md:hidden">
      <button
        onClick={() => toggleDrawer(true)}
        className="w-full rounded-lg bg-accent text-white px-4 py-3 flex items-center justify-between shadow-lg active:scale-98 transition font-black text-sm"
      >
        <div className="flex items-center gap-2">
          <FileTextIcon width={18} height={18} />
          <span>Betslip</span>
          <span className="rounded-full bg-white text-accent px-2 py-0.2 text-xs font-black">
            {count}
          </span>
        </div>
        <div className="text-right text-xs">
          <span className="text-white/80 block text-[10px] uppercase font-bold">Potential Win</span>
          <span className="font-black">{potentialPayout.toLocaleString()} Coins</span>
        </div>
      </button>
    </div>
  );
}
