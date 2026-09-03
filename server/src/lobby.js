'use strict';

const { PLAYERS } = require('./config');

function createLobby() {
  const players = Object.fromEntries(PLAYERS.map((player, index) => [
    player.id,
    {
      id: player.id,
      name: player.displayName,
      side: index === 0 ? 'host' : 'guest',
      online: false,
      ready: false,
    },
  ]));
  return { players, currentGameId: null };
}

module.exports = { createLobby };
