# Skud Pai Sho Online

Production-oriented private two-player game: authoritative TypeScript engine/server, PostgreSQL persistence, Socket.IO realtime lobby/game, and responsive Ukrainian Next.js client. Artwork is original CSS/SVG-like typography and contains no licensed Avatar assets.

## Monorepo

* `apps/web` — Next.js client for Vercel.
* `apps/server` — Fastify + Socket.IO server for Render.
* `packages/shared` — strict contracts, Zod commands, board geometry, pure engine.
* `docs` — pinned rules interpretation and deployment runbook.

## Local start

Requires Node 22+, pnpm 10+, PostgreSQL. Copy `.env.example` to `.env`, create the database, generate hashes with `pnpm hash-password -- 'password'`, then export/load the variables before starting:

```sh
corepack enable
pnpm install
set -a; source .env; set +a
pnpm dev
```

Web: `http://localhost:3000`; server: `http://localhost:4000`. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` before deploy.

## Security and game flow

Only configured accounts can log in. Passwords are bcrypt hashes, login is rate-limited, JWT is held in an HttpOnly cookie, and one active in-process session per account is allowed. The authenticated socket—not client data—selects the player. Commands contain only intent plus UUID `commandId`; state is loaded, validated by the server, and persisted using optimistic locking plus a database idempotency table.

Open an incognito and a normal browser, log in as different accounts, click **Готовий** in both, play alternating server-confirmed moves, refresh either window to verify recovery, resign, then request a rematch in both windows.

## Environment

Server: `PLAYER_ONE_USERNAME`, `PLAYER_ONE_PASSWORD_HASH`, `PLAYER_TWO_USERNAME`, `PLAYER_TWO_PASSWORD_HASH`, `JWT_SECRET`, `FRONTEND_URL`, `DATABASE_URL`, `PORT`, `NODE_ENV`. Web: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`. Never expose password hashes or JWT secret to Next.js.

See [deployment](docs/DEPLOYMENT.md) and [rules](docs/RULES.md).

## Known limitations

The core Plant/Arrange, gardens, ranges, path blocking, Harmony/Clash capture, ring, final scoring, draw, resign, turn and ownership enforcement work. The multi-step effects of Accent tiles, Orchid, and Harmony Bonus require a future rules-engine extension; see the explicit version note in `docs/RULES.md`. Session exclusivity is process-local (game state itself is durable); multi-instance deployment should move sessions to PostgreSQL/Redis.
