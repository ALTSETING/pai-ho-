'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const E = require('../src/game-engine');

const players = { one: { id: 'one', name: 'Tea', side: 'host' }, two: { id: 'two', name: 'Stone', side: 'guest' } };
const command = (tileId, to) => ({ commandId: crypto.randomUUID(), kind: 'move', tileId, to });
const game = () => E.createGame(players);
const piece = (g, owner, type) => g.board.find((tile) => tile.owner === owner && tile.type === type);
function sparse(entries, active = 'one') {
  const g = game(); g.activePlayer = active;
  for (const tile of g.board) tile.position = null;
  for (const [owner, type, position] of entries) { const tile = piece(g, owner, type); tile.position = position; tile.waiting = false; if (type === 'lotus') tile.lotusState = 'safe'; }
  return g;
}

test('initial setup contains all six pieces for both players', () => { const g = game(); for (const owner of ['one', 'two']) assert.deepEqual(g.board.filter((t) => t.owner === owner).map((t) => t.type), E.TILE_TYPES); });
test('initial sides are mirrored and Avatar/Lotus remember starts', () => { const g = game(); for (const type of E.TILE_TYPES) { const a = piece(g, 'one', type); const b = piece(g, 'two', type); const [ax, ay] = a.position.split(',').map(Number); assert.equal(b.position, `${-ax},${-ay}`); assert.equal(a.startPosition, a.position); } });
test('ordinary adjacent movement works and alternates turn', () => { const g = sparse([['one', 'water', '0,-2']]); const n = E.applyMove(g, 'one', command('one-water', '1,-2')); assert.equal(piece(n, 'one', 'water').position, '1,-2'); assert.equal(n.activePlayer, 'two'); });
test('illegal distant, occupied, off-board and foreign movement is rejected', () => { const g = sparse([['one', 'water', '0,0'], ['one', 'earth', '1,0'], ['two', 'fire', '2,0']]); for (const move of [command('one-water', '0,2'), command('one-water', '1,0'), command('one-water', '5,0'), command('two-fire', '2,1')]) assert.throws(() => E.applyMove(g, 'one', move), E.RuleError); });
test('out-of-turn movement is rejected', () => assert.throws(() => E.applyMove(game(), 'two', command('two-water', '1,3')), E.RuleError));
test('friendly jumps and chains work, enemy jumps and Lotus jumps do not', () => { const g = sparse([['one', 'water', '-2,0'], ['one', 'earth', '-1,0'], ['one', 'fire', '1,0'], ['one', 'lotus', '0,2'], ['two', 'air', '0,1']]); assert.ok(E.legalTargets(g, 'one-water').includes('2,0')); assert.ok(!E.legalTargets(g, 'one-lotus').includes('0,0')); });

for (const [attacker, defender] of [['earth', 'fire'], ['fire', 'air'], ['air', 'water'], ['water', 'earth']]) test(`${attacker} defeats ${defender}`, () => { assert.equal(E.getCombatResult(attacker, defender), 'win'); const g = sparse([['one', attacker, '0,0'], ['two', defender, '2,0']]); const n = E.applyMove(g, 'one', command(`one-${attacker}`, '1,0')); assert.equal(piece(n, 'two', defender).position, null); });
test('losing attacker is removed', () => { const g = sparse([['one', 'fire', '0,0'], ['two', 'earth', '2,0']]); const n = E.applyMove(g, 'one', command('one-fire', '1,0')); assert.equal(piece(n, 'one', 'fire').position, null); });
test('neutral Earth/Air and Fire/Water pairs remain', () => { for (const [a, b] of [['earth', 'air'], ['fire', 'water']]) { assert.equal(E.getCombatResult(a, b), 'neutral'); const n = E.applyMove(sparse([['one', a, '0,0'], ['two', b, '2,0']]), 'one', command(`one-${a}`, '1,0')); assert.ok(piece(n, 'one', a).position); assert.ok(piece(n, 'two', b).position); } });
test('Avatar attacks and removes an ordinary enemy', () => { const n = E.applyMove(sparse([['one', 'avatar', '0,0'], ['two', 'water', '2,0']]), 'one', command('one-avatar', '1,0')); assert.equal(piece(n, 'two', 'water').position, null); });
test('ordinary piece attacks Avatar and Avatar returns to its start', () => { const g = sparse([['one', 'water', '0,0'], ['two', 'avatar', '2,0']]); piece(g, 'two', 'avatar').startPosition = '0,4'; const n = E.applyMove(g, 'one', command('one-water', '1,0')); assert.equal(piece(n, 'two', 'avatar').position, '0,4'); });
test('Avatar waits when its return cell is blocked and returns after it clears', () => { const g = sparse([['one', 'water', '0,0'], ['two', 'avatar', '2,0'], ['two', 'earth', '0,4']]); piece(g, 'two', 'avatar').startPosition = '0,4'; let n = E.applyMove(g, 'one', command('one-water', '1,0')); assert.equal(piece(n, 'two', 'avatar').waiting, true); n = E.applyMove(n, 'two', command('two-earth', '1,4')); assert.equal(piece(n, 'two', 'avatar').position, '0,4'); assert.equal(piece(n, 'two', 'avatar').waiting, false); });
test('Lotus beside an enemy Avatar becomes marked and must move', () => { let g = sparse([['one', 'avatar', '0,0'], ['two', 'lotus', '2,0'], ['two', 'water', '2,2']]); g = E.applyMove(g, 'one', command('one-avatar', '1,0')); assert.equal(piece(g, 'two', 'lotus').lotusState, 'marked'); assert.throws(() => E.applyMove(g, 'two', command('two-water', '1,2')), /Лотос позначений/); });
test('marked Lotus can escape and becomes safe', () => { let g = sparse([['one', 'avatar', '1,0'], ['two', 'lotus', '2,0']], 'two'); piece(g, 'two', 'lotus').lotusState = 'marked'; g = E.applyMove(g, 'two', command('two-lotus', '2,1')); assert.equal(piece(g, 'two', 'lotus').lotusState, 'safe'); });
test('trapped marked Lotus dies and awards victory', () => { const g = sparse([['one', 'avatar', '1,0'], ['two', 'lotus', '0,0'], ['two', 'water', '-1,0'], ['two', 'earth', '0,1'], ['two', 'fire', '0,-1']], 'two'); piece(g, 'two', 'lotus').lotusState = 'marked'; const n = E.applyMove(g, 'two', command('two-lotus', '-1,0')); assert.equal(piece(n, 'two', 'lotus').lotusState, 'dead'); assert.deepEqual(n.result, { winnerId: 'one', reason: 'lotus_dead' }); });
test('safe Lotus reaching empty center wins immediately', () => { const n = E.applyMove(sparse([['one', 'lotus', '0,-1']]), 'one', command('one-lotus', '0,0')); assert.deepEqual(n.result, { winnerId: 'one', reason: 'lotus_reached_center' }); });
test('enemy in Spirit Portal blocks win until sector is cleared', () => { let g = sparse([['one', 'lotus', '0,-1'], ['two', 'water', '1,1']]); g = E.applyMove(g, 'one', command('one-lotus', '0,0')); assert.equal(g.result, null); g = E.applyMove(g, 'two', command('two-water', '2,1')); assert.deepEqual(g.result, { winnerId: 'one', reason: 'lotus_reached_center' }); });
test('resignation has the required server result', () => { const n = E.applyMove(game(), 'one', { commandId: crypto.randomUUID(), kind: 'resign' }); assert.deepEqual(n.result, { winnerId: 'two', reason: 'resignation' }); });
test('two clients receive the same serializable authoritative state', () => { const saved = E.applyMove(game(), 'one', command('one-lotus', '1,-3')); const clientA = structuredClone(saved); const clientB = structuredClone(saved); assert.deepEqual(clientA, clientB); assert.deepEqual(clientA.legalMoves, clientB.legalMoves); });
