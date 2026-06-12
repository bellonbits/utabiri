import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export function Shell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <main
        className={`mx-auto px-4 pb-24 pt-6 md:pb-10 ${
          wide ? "max-w-screen-2xl" : "max-w-3xl"
        }`}
      >
        {title && (
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-mut">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-panel p-5 ${className}`}>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-mut">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-sm outline-none transition focus:border-accent placeholder:text-mut-2";

export const btnCls =
  "w-full rounded-xl bg-accent py-3 text-sm font-bold text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50";

export function Notice({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p
      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
        ok ? "bg-up/10 text-up" : "bg-down/10 text-down"
      }`}
    >
      {text}
    </p>
  );
}
