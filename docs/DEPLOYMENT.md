# Deployment

Проєкт розгортається як два незалежні сервіси. Жодні Environment Variables не потрібні.

## Render — backend

Створіть Blueprint із кореневого `render.yaml` або Node Web Service з такими параметрами:

* **Name:** `pai-sho-server-altseting`
* **Root Directory:** `server`
* **Runtime:** `Node`
* **Build Command:** `npm ci`
* **Start Command:** `npm start`
* **Health Check Path:** `/health`

Після deployment backend має бути доступний за адресою
`https://pai-sho-server-altseting.onrender.com`. Якщо Render повідомить, що ім’я вже зайняте,
одночасно змініть `name` у `render.yaml` та обидві адреси у `frontend/config.js`.

Сервер використовує наданий Render порт або `3000` локально та слухає `0.0.0.0`.
Перевірка `https://pai-sho-server-altseting.onrender.com/health` повинна повертати HTTP 200
і `{"status":"ok"}`.

## Vercel — статичний frontend

Створіть окремий Vercel Project з такими параметрами:

* **Root Directory:** `frontend`
* **Framework Preset:** `Other`
* **Install Command:** порожньо
* **Build Command:** порожньо
* **Output Directory:** `.`

У frontend немає `package.json`, npm/pnpm або build step. Production URL backend уже записаний
у `frontend/config.js`; змінні середовища у Vercel також не потрібні.

## Вхід

Сторінка входу приймає один із двох приватних акаунтів, визначених лише в
`server/src/config.js`. Після успішного входу backend повертає випадковий bearer token,
який живе в пам’яті до logout або перезапуску сервера. Паролі не потрапляють у відповіді API,
стан lobby, WebSocket-повідомлення чи frontend-код.

## CORS

REST і Socket.IO приймають запити без Origin (health checks і серверні клієнти), з localhost
та з HTTPS-доменів `*.vercel.app`. Cookies і cross-origin credentials вимкнені; авторизація
працює через bearer token.
