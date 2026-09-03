'use strict';

const { Server } = require('socket.io');
const auth = require('./auth');
const { moveSchema, accentSchema, rematchSchema } = require('./validation');
const { createGame, selectAccents, applyMove } = require('./game-engine');

function configureSocket(server, corsOptions, lobby, store) {
  const io = new Server(server, { cors: corsOptions });
  const counts = Object.fromEntries(Object.keys(lobby.players).map((id) => [id, 0]));
  const allPlayers = (predicate) => Object.values(lobby.players).every(predicate);

  io.use((socket, next) => {
    const playerId = auth.verify(socket.handshake.auth?.token);
    if (!playerId) return next(new Error('unauthorized'));
    socket.data.player = playerId;
    return next();
  });

  const sync = (socket) => {
    socket.emit('lobby:state', lobby);
    const game = store.current();
    if (game) socket.emit('game:state', game);
  };

  io.on('connection', (socket) => {
    const playerId = socket.data.player;
    counts[playerId] += 1;
    lobby.players[playerId].online = true;
    socket.emit('connection:status', { connected: true });
    io.emit('lobby:state', lobby);
    sync(socket);

    socket.on('lobby:join', () => sync(socket));
    const ready = (value) => {
      lobby.players[playerId].ready = value;
      io.emit('lobby:state', lobby);
      if (allPlayers((player) => player.ready) && !store.current()) {
        const game = store.create(createGame(lobby.players));
        lobby.currentGameId = game.id;
        Object.values(lobby.players).forEach((player) => { player.ready = false; });
        io.emit('game:started', game);
      }
    };
    socket.on('player:ready', () => ready(true));
    socket.on('player:unready', () => ready(false));

    socket.on('game:select_accents', async (raw) => {
      const parsed = accentSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit('game:move_rejected', {
          commandId: raw?.commandId || '',
          reason: 'Оберіть дві різні акцентні плитки',
        });
        return;
      }
      try {
        const next = await store.atomic((game) => {
          if (!game) throw Error('Партію не знайдено');
          return store.save(selectAccents(game, playerId, parsed.data.accents), game.version);
        });
        io.emit('game:state', next);
      } catch (error) {
        socket.emit('game:move_rejected', {
          commandId: parsed.data.commandId,
          reason: error.message,
        });
      }
    });

    const move = async (raw) => {
      const parsed = moveSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit('game:move_rejected', {
          commandId: raw?.commandId || '',
          reason: 'Некоректна або підроблена команда',
        });
        return;
      }
      try {
        const next = await store.atomic((game) => {
          if (!game) throw Error('Активну партію не знайдено');
          const updated = applyMove(game, playerId, parsed.data);
          return updated === game ? game : store.save(updated, game.version);
        });
        io.emit('game:state', next);
        if (next.result) io.emit('game:finished', next.result);
      } catch (error) {
        socket.emit('game:move_rejected', {
          commandId: parsed.data.commandId,
          reason: error.message,
        });
      }
    };
    socket.on('game:move', move);
    socket.on('game:resign', (raw) => move({ ...raw, kind: 'resign' }));

    socket.on('game:rematch', (raw) => {
      const parsed = rematchSchema.safeParse(raw);
      if (!parsed.success) return;
      const game = store.get(parsed.data.gameId);
      if (!game || game.phase !== 'finished') return;
      game.rematch[playerId] = true;
      io.emit('game:state', game);
      if (Object.values(game.rematch).every(Boolean)) {
        const next = store.create(createGame(lobby.players));
        lobby.currentGameId = next.id;
        io.emit('game:started', next);
      }
    });

    socket.on('disconnect', () => {
      counts[playerId] -= 1;
      if (!counts[playerId]) {
        lobby.players[playerId].online = false;
        lobby.players[playerId].ready = false;
      }
      io.emit('lobby:state', lobby);
    });
  });

  return io;
}

module.exports = { configureSocket };
