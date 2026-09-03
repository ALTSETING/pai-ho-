# Deployment

## Vercel (тільки статичний frontend)

* **Root Directory:** `frontend`
* **Framework Preset:** `Other`
* **Build Command:** порожньо
* **Install Command:** порожньо
* **Output Directory:** `.`

Перед deploy замініть обидва placeholder URL у `frontend/config.js` на HTTPS URL Render service. `frontend/vercel.json` не містить rewrite, що міг би перехопити статичні JS/CSS/SVG.

## Render (тільки backend)

* **Root Directory:** `server`
* **Runtime:** `Node`
* **Build Command:** `npm ci`
* **Start Command:** `npm start`
* **Health Check Path:** `/health`

Environment variables: `PLAYER_ONE_USERNAME`, `PLAYER_ONE_PASSWORD_HASH`, `PLAYER_TWO_USERNAME`, `PLAYER_TWO_PASSWORD_HASH`, `JWT_SECRET` (довгий випадковий секрет), `FRONTEND_URL` (точний production origin Vercel без кінцевого `/`) та `PORT` (Render зазвичай задає автоматично). Хеші створіть локально командою `cd server && npm run hash-password -- 'секретний пароль'`.

Health URL: `https://<render-service>.onrender.com/health`; відповідь — HTTP 200 `{"status":"ok"}`.
