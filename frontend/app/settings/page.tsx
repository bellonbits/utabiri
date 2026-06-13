"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, API_URL, getToken } from "@/lib/api";
import { clearSession, setSession, useSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { btnCls, Card, Field, inputCls, Notice, Shell } from "@/components/shell";

export default function SettingsPage() {
  const user = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) {
    return (
      <Shell title="Settings">
        <Card>
          <p className="text-sm text-mut">
            Please{" "}
            <a href="/login" className="font-semibold text-accent-2 hover:underline">log in</a>{" "}
            to manage your settings.
          </p>
        </Card>
      </Shell>
    );
  }

  const saveDisplayName = async () => {
    if (!displayName.trim()) return;
    setMsg(null);
    try {
      const r = await api<{ display_name: string }>("/users/me", {
        method: "PATCH",
        body: { display_name: displayName.trim() },
      });
      setSession(localStorage.getItem("utabiri_token")!, { ...user, display_name: r.display_name });
      setMsg({ ok: true, text: "Display name updated" });
      setDisplayName("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    }
  };

  const pickAvatar = () => fileRef.current?.click();

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const token = getToken();
      const res = await fetch(`${API_URL}/users/me/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? "Upload failed");
      const newUrl: string = data.avatar_url;
      setAvatarSrc(`${API_URL}${newUrl}`);
      setSession(localStorage.getItem("utabiri_token")!, { ...user, avatar_url: newUrl });
      setMsg({ ok: true, text: "Profile picture updated" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Shell title="Settings">
      <div className="flex flex-col gap-4">
        {/* Profile picture */}
        <Card>
          <h2 className="mb-4 text-base font-bold">Profile picture</h2>
          <div className="flex items-center gap-4">
            <Avatar
              name={user.display_name}
              avatarUrl={avatarSrc ?? user.avatar_url}
              size={72}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={pickAvatar}
                disabled={uploading}
                className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-panel-2 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Change photo"}
              </button>
              <p className="text-xs text-mut-2">JPG, PNG or WebP · max 5 MB</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar(f);
              e.target.value = "";
            }}
          />
        </Card>

        {/* Display name */}
        <Card>
          <h2 className="mb-3 text-base font-bold">Account</h2>
          <dl className="divide-y divide-line/60 text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-mut">Current name</dt>
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
          <div className="mt-4 grid gap-2 sm:max-w-sm">
            <Field label="New display name">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user.display_name}
                maxLength={50}
                className={inputCls}
              />
            </Field>
            <button onClick={saveDisplayName} disabled={!displayName.trim()} className={btnCls}>
              Save name
            </button>
          </div>
        </Card>

        {msg && <Notice ok={msg.ok} text={msg.text} />}

        {/* Notifications */}
        <Card>
          <h2 className="mb-3 text-base font-bold">Notifications</h2>
          {["Trade confirmations", "Market resolutions", "Deposit receipts"].map((label) => (
            <label
              key={label}
              className="flex items-center justify-between border-b border-line/60 py-2.5 text-sm last:border-0"
            >
              <span>{label}</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#2f6fed]" />
            </label>
          ))}
          <p className="mt-3 text-xs text-mut-2">
            Email delivery activates once a Resend API key is configured.
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-bold">Session</h2>
          <button
            onClick={() => { clearSession(); router.push("/"); }}
            className="rounded-xl bg-down/15 px-5 py-2.5 text-sm font-bold text-down transition hover:bg-down/30"
          >
            Log out
          </button>
        </Card>
      </div>
    </Shell>
  );
}
