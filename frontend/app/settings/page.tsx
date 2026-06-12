"use client";

import { useRouter } from "next/navigation";
import { clearSession, useSession } from "@/lib/session";
import { Card, Shell } from "@/components/shell";

export default function SettingsPage() {
  const user = useSession();
  const router = useRouter();

  if (!user) {
    return (
      <Shell title="Settings">
        <Card>
          <p className="text-sm text-mut">
            Please{" "}
            <a href="/login" className="font-semibold text-accent-2 hover:underline">
              log in
            </a>{" "}
            to manage your settings.
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell title="Settings">
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="mb-3 text-base font-bold">Account</h2>
          <dl className="divide-y divide-line/60 text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-mut">Display name</dt>
              <dd className="font-semibold">{user.display_name}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-mut">Email</dt>
              <dd className="font-semibold">{user.email}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-mut">Role</dt>
              <dd className="font-semibold">{user.is_admin ? "Admin" : "Trader"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-mut-2">
            Profile editing and password change land with the next backend
            iteration.
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-bold">Notifications</h2>
          {["Trade confirmations", "Market resolutions", "Deposit receipts"].map(
            (label) => (
              <label
                key={label}
                className="flex items-center justify-between border-b border-line/60 py-2.5 text-sm last:border-0"
              >
                <span>{label}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#2f6fed]" />
              </label>
            ),
          )}
          <p className="mt-3 text-xs text-mut-2">
            Email delivery activates once a Resend API key is configured.
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-bold">Session</h2>
          <button
            onClick={() => {
              clearSession();
              router.push("/");
            }}
            className="rounded-xl bg-down/15 px-5 py-2.5 text-sm font-bold text-down transition hover:bg-down/30"
          >
            Log out
          </button>
        </Card>
      </div>
    </Shell>
  );
}
