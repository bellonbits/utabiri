"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, API_URL } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";

type Comment = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  text: string;
  created_at: string;
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function MarketComments({ marketId }: { marketId: string }) {
  const user = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ items: Comment[] }>(`/markets/${marketId}/comments`, { token: null })
      .then((r) => setComments(r.items))
      .catch(() => {});
  }, [marketId]);

  // Initial load + live poll every 5 s
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const c = await api<Comment>(`/markets/${marketId}/comments`, {
        method: "POST",
        body: { text: text.trim() },
      });
      setComments((prev) => [c, ...prev]);
      setText("");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/comments/${id}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  };

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-bold">Comments</h2>
        <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs font-semibold text-mut">
          {comments.length}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs text-up">
          <span className="h-1.5 w-1.5 rounded-full bg-up animate-pulse" />
          Live
        </span>
      </div>

      {/* Post comment */}
      {user ? (
        <form onSubmit={submit} className="mb-4 flex gap-2">
          <Avatar name={user.display_name} avatarUrl={user.avatar_url} size={32} />
          <div className="flex flex-1 gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment…"
              maxLength={500}
              className="flex-1 rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none transition focus:border-accent placeholder:text-mut-2"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-2 disabled:opacity-40"
            >
              {busy ? "…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-4 text-sm text-mut">
          <a href="/login" className="font-semibold text-accent-2 hover:underline">Log in</a>{" "}
          to comment.
        </p>
      )}

      {err && <p className="mb-2 text-xs text-down">{err}</p>}

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-mut-2">No comments yet — be the first.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.display_name} avatarUrl={c.avatar_url} size={32} className="mt-0.5" />
              <div className="min-w-0 flex-1 rounded-xl bg-panel px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold">{c.display_name}</span>
                  <span className="text-[10px] text-mut-2">{timeAgo(c.created_at)}</span>
                  {(user?.id === c.user_id || user?.is_admin) && (
                    <button
                      onClick={() => remove(c.id)}
                      className="ml-auto text-[10px] text-mut-2 hover:text-down"
                    >
                      delete
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-sm leading-relaxed">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div ref={bottomRef} />
    </section>
  );
}
