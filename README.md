# Skud Pai Sho — приватна онлайн-гра для двох

Проєкт складається з незалежного статичного frontend (`frontend/`) і авторитетного Node.js backend (`server/`). Немає Next.js, React, TypeScript, pnpm, workspace або frontend build step.

## Локальний запуск

```bash
cd server
cp .env.example .env
npm ci
npm run hash-password -- 'password'
npm start
# інший термінал
cd frontend
python3 -m http.server 8080
```

У `frontend/config.js` для локальної розробки тимчасово задайте `http://localhost:4000`. Відкрийте `http://localhost:8080` у двох незалежних профілях браузера та увійдіть різними акаунтами. Після Ready обох відкриється вибір двох Accent Tiles, а після вибору — синхронна партія.

> **Важливо:** активна партія зберігається в пам’яті одного Render instance. Restart/deploy/sleep із restart скидає її. `MemoryGameStore` відокремлений від правил і transport, тому його можна пізніше замінити PostgreSQL repository без зміни game engine.

## Безпека

Паролі ніколи не передаються frontend, крім login-запиту, і не зберігаються у коді. Login повертає короткоживучий JWT; REST використовує `Authorization: Bearer TOKEN`, Socket.IO — `auth.token`. Сервер перевіряє власника, чергу, координати, шлях, Garden, `commandId` і серіалізує конкурентні команди.

Дивіться [правила](docs/RULES.md) та [deployment](docs/DEPLOYMENT.md).
