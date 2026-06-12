import Image from "next/image";
import { IMG } from "@/lib/data";
import { ChevronRightIcon } from "@/components/icons";

export function Hero() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {/* Main banner */}
      <a
        href="#"
        className="group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-2xl p-6 lg:col-span-2"
      >
        <Image
          src={IMG.stadium}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#15347c]/95 via-[#1d4ed8]/75 to-[#0ea5e9]/30" />
        <div className="relative">
          <h2 className="text-3xl font-extrabold tracking-tight">
            AFCON 2027 Qualifiers
          </h2>
          <p className="mt-1 max-w-sm text-sm font-medium text-white/85">
            Harambee Stars are here! Trade every qualifier, group and outright.
          </p>
        </div>
        <span className="relative inline-flex w-fit items-center gap-1 rounded-full bg-ink/70 px-4 py-2 text-sm font-bold backdrop-blur transition group-hover:bg-ink">
          Games <ChevronRightIcon width={15} height={15} />
        </span>
      </a>

      {/* Stacked promos */}
      <div className="grid gap-3">
        <a
          href="#"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5"
        >
          <Image
            src={IMG.ruto}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, 100vw"
            className="object-cover object-top transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#5b21b6]/95 via-[#7c3aed]/80 to-[#9333ea]/35" />
          <div className="relative">
            <h3 className="text-lg font-bold leading-tight">
              2027 Election predictions
            </h3>
            <p className="mt-0.5 text-xs font-medium text-white/80">
              What&apos;s in store for &apos;27?
            </p>
          </div>
          <span className="relative mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-ink/60 px-3 py-1.5 text-xs font-bold backdrop-blur transition group-hover:bg-ink">
            Markets <ChevronRightIcon width={13} height={13} />
          </span>
        </a>
        <a
          href="#"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5"
        >
          <Image
            src={IMG.bankColumns}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#9f1239]/95 via-[#be123c]/80 to-[#e11d48]/40" />
          <div className="relative">
            <h3 className="text-lg font-bold leading-tight">
              Budget 2026/27 Tracker
            </h3>
            <p className="mt-0.5 text-xs font-medium text-white/80">
              Track taxes, allocations &amp; more!
            </p>
          </div>
          <span className="relative mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-ink/60 px-3 py-1.5 text-xs font-bold backdrop-blur transition group-hover:bg-ink">
            Dashboard <ChevronRightIcon width={13} height={13} />
          </span>
        </a>
      </div>
    </div>
  );
}
