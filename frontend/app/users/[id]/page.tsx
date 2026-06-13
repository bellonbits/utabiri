"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { Card, Shell } from "@/components/shell";

type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  followers: number;
  following: number;
  is_following: boolean;
  joined: string;
};

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const viewer = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    api<Profile>(`/users/${id}/profile`, { token: null })
      .then(setProfile)
      .catch(() => setErr("User not found"));

  useEffect(() => { load(); }, [id]);

  const toggle = async () => {
    if (!viewer) { window.location.href = "/login"; return; }
    if (!profile) return;
    setBusy(true);
    try {
      if (profile.is_following) {
        await api(`/users/${id}/follow`, { method: "DELETE" });
        setProfile({ ...profile, is_following: false, followers: profile.followers - 1 });
      } else {
        await api(`/users/${id}/follow`, { method: "POST" });
        setProfile({ ...profile, is_following: true, followers: profile.followers + 1 });
      }
    } catch {}
    setBusy(false);
  };

  if (err) return <Shell title="Profile"><Card><p className="text-sm text-mut">{err}</p></Card></Shell>;
  if (!profile) return <Shell title="Profile"><Card><p className="text-sm text-mut">Loading…</p></Card></Shell>;

  const isMe = viewer?.id === profile.id;

  return (
    <Shell title="Profile">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size={64} />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-extrabold">{profile.display_name}</h2>
              <p className="mt-0.5 text-xs text-mut">
                Joined {new Date(profile.joined).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
              </p>
              <div className="mt-2 flex gap-4 text-sm">
                <span><span className="font-bold">{profile.followers}</span> <span className="text-mut">followers</span></span>
                <span><span className="font-bold">{profile.following}</span> <span className="text-mut">following</span></span>
              </div>
            </div>
            {!isMe && viewer && (
              <button
                onClick={toggle}
                disabled={busy}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition disabled:opacity-50 ${
                  profile.is_following
                    ? "border border-line text-mut hover:border-down hover:text-down"
                    : "bg-accent text-white hover:bg-accent-2"
                }`}
              >
                {busy ? "…" : profile.is_following ? "Following" : "Follow"}
              </button>
            )}
            {isMe && (
              <a href="/settings" className="shrink-0 rounded-full border border-line px-5 py-2 text-sm font-semibold text-mut hover:text-white">
                Edit profile
              </a>
            )}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
