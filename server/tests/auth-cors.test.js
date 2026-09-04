'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../src/auth');
const { PLAYERS } = require('../src/config');
const { createLobby } = require('../src/lobby');
const { isAllowedOrigin } = require('../src/cors');

test('both fixed accounts can log in without exposing credentials', () => {
  const denis = auth.login(PLAYERS[0].username, PLAYERS[0].password);
  const friend = auth.login(PLAYERS[1].username, PLAYERS[1].password);

  assert.deepEqual(denis.player, { id: PLAYERS[0].id, name: PLAYERS[0].displayName });
  assert.deepEqual(friend.player, { id: PLAYERS[1].id, name: PLAYERS[1].displayName });
  assert.equal(auth.verify(denis.token), 'player-one');
  assert.equal(auth.verify(friend.token), 'player-two');
  assert.equal(JSON.stringify([denis, friend]).includes(PLAYERS[0].password), false);
  assert.equal(JSON.stringify([denis, friend]).includes(PLAYERS[1].password), false);
});

test('wrong credentials do not create a session', () => {
  assert.equal(auth.login(PLAYERS[0].username, 'wrong'), null);
  assert.equal(auth.login('unknown', PLAYERS[0].password), null);
});

test('logout invalidates the in-memory bearer token', () => {
  const session = auth.login(PLAYERS[0].username, PLAYERS[0].password);
  auth.logout(session.token);
  assert.equal(auth.verify(session.token), null);
});

test('public lobby state contains display names but no passwords or usernames', () => {
  const serialized = JSON.stringify(createLobby());
  assert.equal(serialized.includes(PLAYERS[0].password), false);
  assert.equal(serialized.includes(PLAYERS[1].password), false);
  assert.equal(serialized.includes('username'), false);
  assert.ok(PLAYERS.every((player) => serialized.includes(player.displayName)));
});

test('CORS accepts Vercel, localhost and requests without an Origin only', () => {
  for (const origin of [
    undefined,
    'https://pai-sho.vercel.app',
    'https://pai-sho-git-main-team.vercel.app',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
  ]) assert.equal(isAllowedOrigin(origin), true, origin);

  for (const origin of [
    'https://vercel.app.evil.example',
    'https://vercel.app',
    'https://example.com',
    'ftp://localhost',
    'not a URL',
  ]) assert.equal(isAllowedOrigin(origin), false, origin);
});
