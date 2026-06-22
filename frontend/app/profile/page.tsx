"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { Card, Shell } from "@/components/shell";

type Profile = { followers: number; following: number };

export default function ProfilePage() {
  const user = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    api<Profile>(`/users/${user.id}/profile`, { token: null }).then(setProfile).catch(() => {});
    api<{ items: string[] }>("/users/me/interests").then((r) => setInterests(r.items)).catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <Shell title="Profile">
        <Card>
          <p className="text-sm text-mut">
            Please{" "}
            <a href="/login" className="font-semibold text-accent-2 hover:underline">log in</a>{" "}
            to view your profile.
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell title="Profile">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={user.display_name} avatarUrl={user.avatar_url} size={64} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold">{user.display_name}</h2>
              <p className="text-sm text-mut">{user.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-3 text-sm">
                {profile && (
                  <>
                    <Link href={`/users/${user.id}`} className="hover:text-accent-2">
                      <span className="font-bold">{profile.followers}</span>{" "}
                      <span className="text-mut text-xs">followers</span>
                    </Link>
                    <Link href={`/users/${user.id}`} className="hover:text-accent-2">
                      <span className="font-bold">{profile.following}</span>{" "}
                      <span className="text-mut text-xs">following</span>
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                {user.is_verified && (
                  <span className="rounded bg-up/15 px-2 py-0.5 text-xs font-bold text-up">Verified</span>
                )}
                {user.is_admin && (
                  <span className="rounded bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">Admin</span>
                )}
              </div>
            </div>
            <Link href="/settings" className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-mut hover:text-white">
              Edit
            </Link>
          </div>
        </Card>

        <Card>
          <h3 className="mb-2 text-base font-bold">My interests</h3>
          {interests.length === 0 ? (
            <p className="text-sm text-mut">
              No interests yet —{" "}
              <Link href="/settings" className="font-semibold text-accent-2 hover:underline">add some</Link>{" "}
              to get a personalized insight feed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {interests.map((tag) => (
                <span key={tag} className="rounded-full border border-line bg-panel-2 px-3 py-1 text-sm font-semibold capitalize">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-2 text-base font-bold">Quick links</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            {[["Insights", "/insights"], ["Commodities", "/commodities"], ["Macro", "/macro"], ["Leaderboard", "/leaderboard"], ["Settings", "/settings"]].map(
              ([label, href]) => (
                <a key={href} href={href} className="rounded-full border border-line px-4 py-1.5 font-semibold text-mut transition hover:text-white">
                  {label}
                </a>
              )
            )}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
