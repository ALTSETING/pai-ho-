'use strict';

const http = require('node:http');
const express = require('express');
const cors = require('cors');
const auth = require('./auth');
const { corsOptions } = require('./cors');
const { createLobby } = require('./lobby');
const { MemoryGameStore } = require('./store');
const { configureSocket } = require('./socket');

function createApplication() {
  const app = express();
  const server = http.createServer(app);
  const lobby = createLobby();
  const store = new MemoryGameStore();

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.post('/auth/login', (req, res) => {
    const session = auth.login(req.body?.username, req.body?.password);
    return session
      ? res.json(session)
      : res.status(401).json({ error: 'Неправильне ім’я або пароль' });
  });
  app.get('/auth/me', auth.middleware, (req, res) => (
    res.json({ id: req.playerId, name: auth.name(req.playerId) })
  ));
  app.post('/auth/logout', auth.middleware, (req, res) => {
    auth.logout(auth.bearer(req.headers.authorization));
    res.json({ ok: true });
  });
  app.get('/lobby', auth.middleware, (_req, res) => res.json(lobby));
  app.get('/games/current', auth.middleware, (_req, res) => res.json(store.current()));
  app.get('/games/:id', auth.middleware, (req, res) => {
    const game = store.get(req.params.id);
    return game ? res.json(game) : res.status(404).json({ error: 'Партію не знайдено' });
  });
  app.get('/games/:id/moves', auth.middleware, (req, res) => {
    const game = store.get(req.params.id);
    return game
      ? res.json(game.moves)
      : res.status(404).json({ error: 'Партію не знайдено' });
  });

  configureSocket(server, corsOptions, lobby, store);
  return { app, server, lobby, store };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createApplication().server.listen(port, '0.0.0.0', () => {
    console.log(`Pai Sho server listening on 0.0.0.0:${port}`);
  });
}

module.exports = { createApplication };
