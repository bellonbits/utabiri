"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { setSession, type SessionUser } from "@/lib/session";
import { EyeIcon, MailIcon } from "@/components/icons";
import { Notice } from "@/components/shell";

const inputWrap =
  "flex items-center gap-2 rounded-full border border-line bg-panel-2 px-4 py-3 transition focus-within:border-accent";
const inputCls =
  "w-full bg-transparent text-sm outline-none placeholder:text-mut-2";

/** Split-screen auth: form card left, fluid gradient art right. */
export function AuthScreen({ initialTab }: { initialTab: "signin" | "signup" }) {
  return (
    <div className="flex min-h-dvh items-stretch gap-4 bg-ink p-4">
      {/* left: form card */}
      <div className="flex w-full flex-col justify-center rounded-3xl border border-line bg-panel px-6 py-10 sm:px-12 lg:w-[46%]">
        <AuthForms initialTab={initialTab} />
      </div>

      {/* right: decorative fluid panel */}
      <div className="relative hidden flex-1 overflow-hidden rounded-3xl bg-[#040b1e] lg:block">
        <div className="absolute -left-24 top-8 h-[30rem] w-[30rem] rounded-full bg-accent/50 blur-3xl" />
        <div className="absolute -right-16 top-1/3 h-[34rem] w-[34rem] rounded-full bg-[#4f8bff]/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-[#7c3aed]/35 blur-3xl" />
        <div className="absolute left-10 top-10 flex items-center gap-2 text-white">
          <Image src="/logo-mark-light.png" alt="" width={30} height={38} className="h-9 w-auto" />
          <span className="text-lg font-extrabold lowercase tracking-tight">utabiri</span>
        </div>
        <div className="absolute inset-x-10 bottom-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/70 backdrop-blur">
          © 2026 Utabiri. Kenya&apos;s economic forecast platform.
          See our{" "}
          <Link href="/terms" className="underline hover:text-white">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-white">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

function AuthForms({ initialTab }: { initialTab: "signin" | "signup" }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const login = async () => {
    const r = await api<{ access_token: string; user: SessionUser }>(
      "/auth/login",
      { method: "POST", body: { email, password }, token: null },
    );
    setSession(r.access_token, r.user);
    router.push("/");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (step === "verify") {
        await api("/auth/verify-email", {
          method: "POST",
          body: { email, code },
          token: null,
        });
        await login();
      } else if (tab === "signin") {
        await login();
      } else {
        const r = await api<{ dev_verification_code?: string }>(
          "/auth/register",
          {
            method: "POST",
            body: { email, password, display_name: name },
            token: null,
          },
        );
        setDevCode(r.dev_verification_code ?? null);
        setStep("verify");
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex items-center gap-2">
        <Image src="/logo-mark-light.png" alt="Utabiri" width={34} height={43} className="h-10 w-auto" />
        <span className="text-xl font-extrabold lowercase tracking-tight">utabiri</span>
      </div>

      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">
        {tab === "signin" ? "Welcome Back!" : "Join Utabiri"}
      </h1>
      <p className="mt-1 text-sm text-mut">
        {tab === "signin"
          ? "We are happy to see you again"
          : "Get AI-powered insights on Kenya's economy."}
      </p>

      {/* tab toggle */}
      <div className="mt-6 flex rounded-full border border-line bg-panel-2 p-1">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Sign Up"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setStep("form");
              setMsg(null);
            }}
            className={`flex-1 rounded-full py-2.5 text-sm font-bold transition ${
              tab === key ? "bg-accent text-white" : "text-mut hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {step === "verify" ? (
          <>
            <p className="text-sm text-mut">
              Enter the 6-digit code sent to{" "}
              <span className="font-semibold text-white">{email}</span>
            </p>
            {devCode && (
              <Notice ok text={`Dev mode — your code is ${devCode}`} />
            )}
            <div className={inputWrap}>
              <input
                required
                minLength={6}
                maxLength={6}
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${inputCls} text-center text-lg font-bold tracking-[0.5em]`}
                placeholder="000000"
              />
            </div>
          </>
        ) : (
          <>
            {tab === "signup" && (
              <div className={inputWrap}>
                <input
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Enter your full name"
                />
              </div>
            )}
            <div className={inputWrap}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="Enter your email"
              />
              <MailIcon width={16} height={16} className="shrink-0 text-mut-2" />
            </div>
            <div className={inputWrap}>
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="shrink-0 text-mut-2 hover:text-white"
                aria-label="Toggle password visibility"
              >
                <EyeIcon width={16} height={16} />
              </button>
            </div>
            {tab === "signin" && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-mut">
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#2f6fed]" />
                  Remember me
                </label>
                <Link href="#" className="font-semibold text-accent-2 hover:underline">
                  Forgot Password?
                </Link>
              </div>
            )}
          </>
        )}

        {msg && <Notice ok={msg.ok} text={msg.text} />}

        <button
          disabled={busy}
          className="mt-2 w-full rounded-full bg-accent py-3.5 text-sm font-bold text-white transition hover:bg-accent-2 disabled:opacity-50"
        >
          {busy
            ? "Working…"
            : step === "verify"
              ? "Verify & Continue"
              : tab === "signin"
                ? "Login"
                : "Create Account"}
        </button>
      </form>
    </div>
  );
}
