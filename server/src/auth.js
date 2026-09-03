'use strict';

const crypto = require('node:crypto');
const { PLAYERS } = require('./config');

const sessions = new Map();

function publicPlayer(player) {
  return { id: player.id, name: player.displayName };
}

function login(username, password) {
  const player = PLAYERS.find(
    (candidate) => candidate.username === username && candidate.password === password,
  );
  if (!player) return null;

  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, player.id);
  return { token, player: publicPlayer(player) };
}

function verify(token) {
  return sessions.get(token) || null;
}

function bearer(header = '') {
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function logout(token) {
  sessions.delete(token);
}

function name(id) {
  return PLAYERS.find((player) => player.id === id)?.displayName;
}

function middleware(req, res, next) {
  const id = verify(bearer(req.headers.authorization));
  if (!id) return res.status(401).json({ error: 'Необхідна авторизація' });
  req.playerId = id;
  return next();
}

module.exports = { login, verify, bearer, logout, name, middleware };
