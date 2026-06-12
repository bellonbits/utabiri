# 4. Next.js 16 Frontend Structure

Next.js 16 (App Router), TypeScript, Tailwind, shadcn/ui, TanStack Query.

```
frontend/
├── next.config.ts
├── middleware.ts                    # route protection (see below)
├── app/
│   ├── layout.tsx                   # root layout, QueryProvider, Toaster
│   ├── page.tsx                     # landing → trending markets (SSR)
│   │
│   ├── (auth)/                      # public, centered card layout
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify-email/page.tsx    # consumes ?token=
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (dashboard)/                 # authed shell: nav, balance chip
│   │   ├── layout.tsx
│   │   ├── markets/
│   │   │   ├── page.tsx             # list + category filter (SSR + RQ hydrate)
│   │   │   └── [slug]/page.tsx      # detail: chart, trade panel
│   │   ├── wallet/
│   │   │   ├── page.tsx             # balance, deposit form, tx history
│   │   │   └── deposit/[txId]/page.tsx  # post-payment status polling
│   │   ├── portfolio/page.tsx       # positions, P&L, accuracy
│   │   ├── leaderboard/page.tsx
│   │   └── admin/                   # gated by is_admin claim
│   │       ├── page.tsx             # markets needing resolution
│   │       ├── markets/new/page.tsx
│   │       └── markets/[id]/resolve/page.tsx
│   │
│   └── api/auth/                    # Next route handlers — token cookie bridge
│       ├── login/route.ts           # proxies to FastAPI, sets httpOnly cookies
│       ├── refresh/route.ts
│       └── logout/route.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts                # fetch wrapper: base URL, auth header,
│   │   │                            #   401 → refresh-once-and-retry
│   │   ├── types.ts                 # mirrors FastAPI Pydantic schemas
│   │   └── endpoints/               # typed functions per module
│   │       ├── auth.ts  markets.ts  trading.ts  wallet.ts  leaderboard.ts
│   ├── hooks/
│   │   ├── use-markets.ts           # useQuery(['markets', filters])
│   │   ├── use-market.ts            # + 10s refetchInterval for live price
│   │   ├── use-wallet.ts
│   │   ├── use-positions.ts
│   │   ├── use-trade.ts             # useMutation + optimistic invalidation
│   │   └── use-deposit-status.ts    # poll tx until completed/failed
│   ├── money.ts                     # cents ↔ "KES 1,250.00"
│   └── utils.ts
│
├── components/
│   ├── ui/                          # shadcn primitives (button, card, …)
│   ├── markets/
│   │   ├── market-card.tsx          # question, prices, volume, ends-in
│   │   ├── price-chart.tsx          # YES price over time
│   │   ├── trade-panel.tsx          # YES/NO toggle, amount, quote preview
│   │   └── category-tabs.tsx
│   ├── wallet/
│   │   ├── deposit-dialog.tsx       # amount → redirect to Lipana checkout
│   │   └── transaction-list.tsx
│   ├── portfolio/position-card.tsx
│   └── shared/ (balance-chip, empty-state, countdown, confirm-dialog)
└── public/
```

## Auth model: httpOnly cookie bridge

JWTs never touch `localStorage`. The Next.js route handlers under `app/api/auth/`
are a thin proxy that exchange credentials with FastAPI and store both tokens in
**httpOnly, Secure, SameSite=Lax cookies**. The `client.ts` fetch wrapper runs
on the server (RSC) and client; on 401 it calls `/api/auth/refresh` once, then
retries.

```ts
// middleware.ts
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("utabiri_refresh");
  const { pathname } = req.nextUrl;

  const isAuthPage = ["/login", "/register", "/forgot-password"]
    .some(p => pathname.startsWith(p));
  const isProtected = ["/markets", "/wallet", "/portfolio", "/admin"]
    .some(p => pathname.startsWith(p));

  if (isProtected && !hasSession)
    return NextResponse.redirect(new URL(`/login?next=${pathname}`, req.url));
  if (isAuthPage && hasSession)
    return NextResponse.redirect(new URL("/markets", req.url));
  return NextResponse.next();
}
```

(Middleware only checks cookie presence for redirect UX; real authorization is
always the backend validating the JWT. Admin pages additionally render
server-side after a `/users/me` check.)

## Data fetching strategy

- **Market list & detail**: fetched server-side in the RSC for fast first paint
  on slow connections, then hydrated into TanStack Query
  (`HydrationBoundary`) so the client keeps it fresh.
- **Live prices**: `refetchInterval: 10_000` on market detail. No websockets in
  MVP — polling is fine at this scale and survives flaky mobile networks.
- **Trades**: `useMutation` → on success invalidate `['market', id]`,
  `['wallet']`, `['positions']`. Trade panel shows a server-computed quote
  (`POST /trade/quote`) before confirming, so users see slippage up front.
- **Deposit status**: after redirecting back from Lipana checkout, the
  `deposit/[txId]` page polls `GET /wallet/transactions/{id}` every 3s until
  `completed` (webhook landed) or shows "still processing" guidance after 2 min.

## Mobile-first constraints (Kenya)

- Pages must be useful at 360px width; trade panel is a bottom sheet on mobile.
- SSR + minimal client JS on landing/market pages; charts lazy-loaded.
- All amounts in KES with M-Pesa-familiar formatting; deposit presets
  (50 / 100 / 250 / 500 / 1000 KES).
- Poll-based realtime (no websocket reconnect storms on 3G).
- next/image + system fonts; target < 150KB JS on the market list route.
