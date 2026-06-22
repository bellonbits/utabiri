"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, API_URL, getToken } from "@/lib/api";
import { clearSession, setSession, useSession } from "@/lib/session";
import { categories } from "@/lib/categories";
import { Avatar } from "@/components/avatar";
import { btnCls, Card, Field, inputCls, Notice, Shell } from "@/components/shell";

const SUGGESTED_TAGS = ["maize", "forex", "dairy", "tea", "coffee", "fuel", "nse"];

export default function SettingsPage() {
  const user = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!user) return;
    api<{ items: string[] }>("/users/me/interests").then((r) => setInterests(r.items)).catch(() => {});
  }, [user]);

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

  const addInterest = async (tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (!clean || interests.includes(clean)) return;
    try {
      await api("/users/me/interests", { method: "POST", body: { tag: clean } });
      setInterests((prev) => [...prev, clean]);
      setNewTag("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to add interest" });
    }
  };

  const removeInterest = async (tag: string) => {
    try {
      await api(`/users/me/interests/${encodeURIComponent(tag)}`, { method: "DELETE" });
      setInterests((prev) => prev.filter((t) => t !== tag));
    } catch {}
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
              <dd className="font-semibold">{user.is_admin ? "Admin" : "Member"}</dd>
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

        {/* Interests */}
        <Card>
          <h2 className="mb-1 text-base font-bold">My interests</h2>
          <p className="mb-3 text-xs text-mut">
            Follow commodities, indicators or categories to personalize your insight feed.
          </p>
          {interests.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {interests.map((tag) => (
                <button
                  key={tag}
                  onClick={() => removeInterest(tag)}
                  className="group flex items-center gap-1.5 rounded-full border border-line bg-panel-2 px-3 py-1 text-sm font-semibold capitalize transition hover:border-down"
                >
                  {tag}
                  <span className="text-mut-2 group-hover:text-down">×</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addInterest(newTag); }}
              placeholder="e.g. maize, forex, dairy…"
              className={inputCls}
            />
            <button onClick={() => addInterest(newTag)} disabled={!newTag.trim()} className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              Add
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...categories.map((c) => c.slug), ...SUGGESTED_TAGS]
              .filter((t) => !interests.includes(t.toLowerCase()))
              .map((t) => (
                <button
                  key={t}
                  onClick={() => addInterest(t)}
                  className="rounded-full border border-dashed border-line px-3 py-1 text-xs font-semibold text-mut hover:border-accent hover:text-accent-2"
                >
                  + {t}
                </button>
              ))}
          </div>
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
