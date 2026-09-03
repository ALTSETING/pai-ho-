# Deployment

## Render (server + PostgreSQL)

1. Створіть PostgreSQL та Web Service з кореня репозиторію або через `render.yaml`.
2. Задайте `DATABASE_URL`, два username/hash, `JWT_SECRET` (мінімум 32 символи) та точний HTTPS `FRONTEND_URL` без `/` у кінці.
3. Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @pai-sho/shared build && pnpm --filter @pai-sho/server build`.
4. Start: `pnpm --filter @pai-sho/server start`. Health check: `/health`.

## Vercel

Імпортуйте той самий репозиторій, Root Directory — `apps/web`. Додайте `NEXT_PUBLIC_API_URL` та `NEXT_PUBLIC_SOCKET_URL` з HTTPS URL Render. Після першого deploy скопіюйте точний Vercel/custom-domain URL у Render `FRONTEND_URL` і redeploy server.

Для власного домену: Vercel Project → Settings → Domains → Add; створіть запропонований A/CNAME у DNS. Після випуску TLS оновіть `FRONTEND_URL`.

Cookies у production мають `HttpOnly; Secure; SameSite=None`, CORS приймає лише `FRONTEND_URL`. Render має підтримувати WebSocket (увімкнено за замовчуванням).
