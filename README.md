# Modern Pai Sho — приватна онлайн-гра для двох

Проєкт складається з незалежного статичного frontend (`frontend/`) і авторитетного Node.js
backend (`server/`). Немає Next.js, React, TypeScript, pnpm, workspace або frontend build step.

## Локальний запуск

Backend:

```bash
cd server
npm ci
npm test
npm start
```

Frontend в іншому терміналі:

```bash
cd frontend
python3 -m http.server 8080
```

Production frontend одразу звертається до
`https://pai-sho-server-altseting.onrender.com`. Для локальної ручної перевірки можна
тимчасово замінити обидві адреси у `frontend/config.js` на `http://localhost:3000`, не
комітячи цю зміну. Відкрийте `http://localhost:8080` у двох незалежних профілях браузера,
увійдіть різними акаунтами та натисніть «Готовий» — дзеркальна розстановка створиться автоматично.

Акаунти приватної гри зберігаються лише в `server/src/config.js`. Backend видає випадкові
bearer tokens і зберігає сесії в пам’яті. Паролі не надсилаються у frontend state, lobby,
health response або WebSocket events.

> Активні сесії та партія зберігаються в пам’яті одного Render instance. Restart, deploy або
> sleep із restart скидає їх. `MemoryGameStore` відокремлений від правил і transport, тому
> його можна пізніше замінити PostgreSQL repository без зміни game engine.

Дивіться [правила](docs/RULES.md) та [deployment](docs/DEPLOYMENT.md).
