import Image from "next/image";
import Link from "next/link";
import { categories } from "@/lib/categories";

const platform = [
  { label: "Daily Briefing", href: "/briefing" },
  { label: "Insights", href: "/insights" },
  { label: "Commodities", href: "/commodities" },
  { label: "Macro", href: "/macro" },
  { label: "Bill Analysis", href: "/bills" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Profile", href: "/profile" },
];

const support = [
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Contact us", href: "mailto:support@utabiri.co.ke" },
  { label: "Help Center", href: "#" },
];

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line bg-ink pb-28 md:pb-10">
      <div className="mx-auto max-w-screen-2xl px-4 pt-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr_1fr_1fr]">
          {/* brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 text-white">
              <Image
                src="/logo-mark-light.png"
                alt="Utabiri"
                width={34}
                height={43}
                className="h-10 w-auto"
              />
              <span className="text-xl font-extrabold lowercase tracking-tight">
                utabiri
              </span>
            </Link>
            <p className="mt-3 text-sm font-semibold text-mut">
              Kenya&apos;s Economic Forecast Platform
            </p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-mut-2">
              Commodity prices, macro indicators, and AI-generated commentary
              and forecasts to help you understand Kenya&apos;s economy.
            </p>
          </div>

          {/* categories */}
          <div>
            <h3 className="text-sm font-bold text-mut">
              Insights by category
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/insights?category=${encodeURIComponent(c.slug)}`}
                    className="group block"
                  >
                    <span className="text-sm font-semibold text-white/90 group-hover:text-accent-2">
                      {c.label}
                    </span>
                    <span className="block text-xs text-mut-2">
                      Commentary &amp; forecasts
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* platform */}
          <div>
            <h3 className="text-sm font-bold text-mut">Platform</h3>
            <ul className="mt-4 space-y-3">
              {platform.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm font-medium text-white/85 hover:text-accent-2"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* support */}
          <div>
            <h3 className="text-sm font-bold text-mut">Support &amp; Legal</h3>
            <ul className="mt-4 space-y-3">
              {support.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm font-medium text-white/85 hover:text-accent-2"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* bottom strip */}
        <div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line pt-5 text-xs text-mut">
          <span>© 2026 Utabiri</span>
          <span className="text-mut-2">·</span>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <span className="text-mut-2">·</span>
          <Link href="/terms" className="hover:text-white">
            Terms of Use
          </Link>
          <span className="text-mut-2">·</span>
          <a href="mailto:support@utabiri.co.ke" className="hover:text-white">
            support@utabiri.co.ke
          </a>
        </div>
        <p className="mt-4 max-w-4xl text-xs leading-relaxed text-mut-2">
          Utabiri provides AI-generated commentary, forecasts and
          recommendations for informational purposes only — this is not
          financial or agronomic advice. Commodity price data is sourced from
          the Kenya Ministry of Agriculture&apos;s KAMIS bulletin. Headlines
          displayed on this site link to and remain the property of their
          respective publishers.
        </p>
      </div>
    </footer>
  );
}
