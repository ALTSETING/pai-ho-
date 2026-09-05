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

test('initial setup contains 14 pieces per player and 28 unique occupied cells', () => {
  const g = game();
  assert.equal(g.board.length, 28);
  assert.equal(new Set(g.board.map((tile) => tile.id)).size, 28);
  assert.equal(new Set(g.board.map((tile) => tile.position)).size, 28);
  for (const owner of ['one', 'two']) {
    const owned = g.board.filter((tile) => tile.owner === owner);
    assert.equal(owned.length, 14);
    for (const type of E.ELEMENTS) assert.equal(owned.filter((tile) => tile.type === type).length, 3);
    for (const type of ['avatar', 'lotus']) assert.equal(owned.filter((tile) => tile.type === type).length, 1);
  }
});
test('formation uses cell centers and an exact 180 degree rotation', () => {
  const g = game();
  assert.deepEqual(E.INITIAL_POSITIONS.host, E.TOP_FORMATION.map(([type, position]) => ({ type, position })));
  for (const host of g.board.filter((tile) => tile.owner === 'one')) {
    const rotated = E.rotateCell180(host.position);
    const guest = g.board.find((tile) => tile.owner === 'two' && tile.type === host.type && tile.position === rotated.id);
    assert.ok(guest, `missing rotated peer for ${host.id}`);
    const cell = E.cellMap.get(host.position);
    assert.ok(cell && cell.polygonPoints.length === 4);
    assert.equal(host.cellId, cell.id);
    assert.equal(host.row, cell.row);
    assert.equal(host.column, cell.column);
    assert.equal(cell.centerX, cell.polygonPoints[0].x);
    assert.notEqual(cell.centerY, cell.polygonPoints[0].y);
  }
  assert.equal(piece(g, 'one', 'avatar').position, '-4,-4');
  assert.equal(piece(g, 'one', 'lotus').position, '-6,-6');
  assert.equal(piece(g, 'two', 'avatar').position, '4,4');
  assert.equal(piece(g, 'two', 'lotus').position, '6,6');
});
test('initial visual geometry is separated, centered in cells, and clear of the portal', () => {
  const g = game();
  const expectedCenters = [[500, 116], [468, 148], [532, 148], [436, 180], [564, 180], [404, 212], [596, 212], [308, 244], [372, 244], [500, 244], [628, 244], [692, 244], [404, 276], [596, 276]];
  const occupied = g.board.map((tile) => E.cellMap.get(tile.position));
  const host = g.board.filter((tile) => tile.owner === 'one').map((tile) => E.cellMap.get(tile.position));
  const guest = g.board.filter((tile) => tile.owner === 'two').map((tile) => E.cellMap.get(tile.position));
  assert.deepEqual(host.map((cell) => [cell.centerX, cell.centerY]), expectedCenters);
  assert.deepEqual(guest.map((cell) => [cell.centerX, cell.centerY]), expectedCenters.map(([x, y]) => [1000 - x, 1000 - y]));
  assert.ok(Math.max(...host.map((cell) => cell.centerY)) <= 350);
  assert.ok(Math.min(...guest.map((cell) => cell.centerY)) >= 650);
  assert.ok(!g.board.some((tile) => tile.position === '0,0'));
  for (let i = 0; i < occupied.length; i += 1) {
    const cell = occupied[i];
    assert.ok(cell.centerX >= 100 && cell.centerX <= 900 && cell.centerY >= 70 && cell.centerY <= 930);
    for (let j = i + 1; j < occupied.length; j += 1) {
      assert.ok(Math.hypot(cell.centerX - occupied[j].centerX, cell.centerY - occupied[j].centerY) >= 45);
    }
  }
});
test('ordinary adjacent movement works and alternates turn', () => { const g = sparse([['one', 'water', '0,-2']]); const n = E.applyMove(g, 'one', command('one-water-1', '1,-2')); assert.equal(piece(n, 'one', 'water').position, '1,-2'); assert.equal(n.activePlayer, 'two'); });
test('every piece type can step to all eight free neighbours in the board center', () => {
  const expected = ['1,0', '-1,0', '0,1', '0,-1', '1,1', '1,-1', '-1,1', '-1,-1'];
  for (const type of [...E.ELEMENTS, 'avatar', 'lotus']) {
    const g = sparse([['one', type, '0,0']]);
    assert.deepEqual(new Set(E.legalTargets(g, `one-${type}-1`)), new Set(expected), type);
  }
});
test('ordinary steps exclude occupied and off-board cells', () => {
  const center = sparse([['one', 'water', '0,0'], ['one', 'earth', '1,1'], ['two', 'fire', '-1,-1']]);
  assert.deepEqual(new Set(E.legalTargets(center, 'one-water-1')), new Set(['1,0', '-1,0', '0,1', '0,-1', '1,-1', '-1,1', '2,2']));
  const edge = sparse([['one', 'water', '0,-9']]);
  assert.deepEqual(new Set(E.legalTargets(edge, 'one-water-1')), new Set(E.stepIds('0,-9')));
  assert.ok(E.stepIds('0,-9').length < 8);
});
test('both players receive and can use all eight step directions in canonical coordinates', () => {
  for (const owner of ['one', 'two']) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const g = sparse([[owner, 'water', '0,0']], owner);
    const target = `${dx},${dy}`;
    assert.ok(g.board.find((tile) => tile.id === `${owner}-water-1`));
    assert.ok(E.legalTargets(g, `${owner}-water-1`).includes(target));
    assert.equal(piece(E.applyMove(g, owner, command(`${owner}-water-1`, target)), owner, 'water').position, target);
  }
});
test('illegal distant, occupied, off-board and foreign movement is rejected', () => { const g = sparse([['one', 'water', '0,0'], ['one', 'earth', '1,0'], ['two', 'fire', '2,0']]); for (const move of [command('one-water-1', '0,2'), command('one-water-1', '1,0'), command('one-water-1', '5,0'), command('two-fire-1', '2,1')]) assert.throws(() => E.applyMove(g, 'one', move), E.RuleError); });
test('out-of-turn movement is rejected', () => assert.throws(() => E.applyMove(game(), 'two', command('two-water-1', '1,3')), E.RuleError));
test('friendly jumps and chains work, enemy jumps and Lotus jumps do not', () => { const g = sparse([['one', 'water', '-2,0'], ['one', 'earth', '-1,0'], ['one', 'fire', '1,0'], ['one', 'lotus', '0,2'], ['two', 'air', '0,1']]); assert.ok(E.legalTargets(g, 'one-water-1').includes('2,0')); assert.ok(!E.legalTargets(g, 'one-lotus-1').includes('0,0')); });

test('jumps work in all eight logical directions for both players', () => {
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const owner of ['one', 'two']) for (const [dx, dy] of directions) {
    const g = sparse([[owner, 'water', '0,0'], [owner, 'earth', `${dx},${dy}`]], owner);
    const target = `${2 * dx},${2 * dy}`;
    assert.ok(E.legalTargets(g, `${owner}-water-1`).includes(target), `${owner}: ${dx},${dy}`);
    const moved = E.applyMove(g, owner, command(`${owner}-water-1`, target));
    assert.equal(piece(moved, owner, 'water').position, target);
    assert.deepEqual(moved.lastMove.route, ['0,0', target]);
  }
});

test('a jump chain may change direction and is recorded as one move', () => {
  const g = sparse([['one', 'water', '0,0'], ['one', 'earth', '1,0'], ['one', 'fire', '2,1']]);
  assert.ok(E.legalTargets(g, 'one-water-1').includes('2,2'));
  const moved = E.applyMove(g, 'one', command('one-water-1', '2,2'));
  assert.deepEqual(moved.lastMove.route, ['0,0', '2,0', '2,2']);
  assert.equal(moved.moves.length, 1);
  assert.equal(moved.turn, 2);
});

test('jumps cannot land on occupied or off-board cells', () => {
  const occupied = sparse([['one', 'water', '0,0'], ['one', 'earth', '1,1'], ['one', 'fire', '2,2']]);
  assert.ok(!E.legalTargets(occupied, 'one-water-1').includes('2,2'));
  assert.throws(() => E.applyMove(occupied, 'one', command('one-water-1', '2,2')), E.RuleError);
  const edge = sparse([['one', 'water', '0,-8'], ['one', 'earth', '0,-9']]);
  assert.ok(!E.legalTargets(edge, 'one-water-1').includes('0,-10'));
  assert.throws(() => E.applyMove(edge, 'one', command('one-water-1', '0,-10')), E.RuleError);
});

test('jump routes never revisit a cell or return to their vacated origin', () => {
  const g = sparse([['one', 'water', '0,0'], ['one', 'earth', '1,0'], ['one', 'fire', '2,1'], ['one', 'air', '1,2']]);
  const moved = E.applyMove(g, 'one', command('one-water-1', '0,2'));
  assert.deepEqual(moved.lastMove.route, ['0,0', '2,0', '2,2', '0,2']);
  assert.equal(new Set(moved.lastMove.route).size, moved.lastMove.route.length);
  assert.ok(!E.legalTargets(g, 'one-water-1').filter((target) => target === '0,0').length);
});

test('both client perspectives receive the same chained-jump endpoint and route', () => {
  for (const owner of ['one', 'two']) {
    const g = sparse([[owner, 'water', '0,0'], [owner, 'earth', '1,0'], [owner, 'fire', '2,1']], owner);
    const state = E.applyMove(g, owner, command(`${owner}-water-1`, '2,2'));
    const clients = [structuredClone(state), structuredClone(state)];
    assert.equal(piece(clients[0], owner, 'water').position, '2,2');
    assert.deepEqual(clients[0].lastMove.route, ['0,0', '2,0', '2,2']);
    assert.deepEqual(clients[0], clients[1]);
  }
});

for (const [attacker, defender] of [['earth', 'fire'], ['fire', 'air'], ['air', 'water'], ['water', 'earth']]) test(`${attacker} defeats ${defender}`, () => { assert.equal(E.getCombatResult(attacker, defender), 'win'); const g = sparse([['one', attacker, '0,0'], ['two', defender, '2,0']]); const n = E.applyMove(g, 'one', command(`one-${attacker}-1`, '1,0')); assert.equal(piece(n, 'two', defender).position, null); });
test('losing attacker is removed', () => { const g = sparse([['one', 'fire', '0,0'], ['two', 'earth', '2,0']]); const n = E.applyMove(g, 'one', command('one-fire-1', '1,0')); assert.equal(piece(n, 'one', 'fire').position, null); });
test('neutral Earth/Air and Fire/Water pairs remain', () => { for (const [a, b] of [['earth', 'air'], ['fire', 'water']]) { assert.equal(E.getCombatResult(a, b), 'neutral'); const n = E.applyMove(sparse([['one', a, '0,0'], ['two', b, '2,0']]), 'one', command(`one-${a}-1`, '1,0')); assert.ok(piece(n, 'one', a).position); assert.ok(piece(n, 'two', b).position); } });
test('Avatar attacks and removes an ordinary enemy', () => { const n = E.applyMove(sparse([['one', 'avatar', '0,0'], ['two', 'water', '2,0']]), 'one', command('one-avatar-1', '1,0')); assert.equal(piece(n, 'two', 'water').position, null); });
test('ordinary piece attacks Avatar and Avatar returns to its start', () => { const g = sparse([['one', 'water', '0,0'], ['two', 'avatar', '2,0']]); piece(g, 'two', 'avatar').startPosition = '0,4'; const n = E.applyMove(g, 'one', command('one-water-1', '1,0')); assert.equal(piece(n, 'two', 'avatar').position, '0,4'); });
test('Avatar waits when its return cell is blocked and returns after it clears', () => { const g = sparse([['one', 'water', '0,0'], ['two', 'avatar', '2,0'], ['two', 'earth', '0,4']]); piece(g, 'two', 'avatar').startPosition = '0,4'; let n = E.applyMove(g, 'one', command('one-water-1', '1,0')); assert.equal(piece(n, 'two', 'avatar').waiting, true); n = E.applyMove(n, 'two', command('two-earth-1', '1,4')); assert.equal(piece(n, 'two', 'avatar').position, '0,4'); assert.equal(piece(n, 'two', 'avatar').waiting, false); });
test('Lotus beside an enemy Avatar becomes marked and must move', () => { let g = sparse([['one', 'avatar', '0,0'], ['two', 'lotus', '2,0'], ['two', 'water', '2,2']]); g = E.applyMove(g, 'one', command('one-avatar-1', '1,0')); assert.equal(piece(g, 'two', 'lotus').lotusState, 'marked'); assert.throws(() => E.applyMove(g, 'two', command('two-water-1', '1,2')), /Лотос позначений/); });
test('marked Lotus can escape and becomes safe', () => { let g = sparse([['one', 'avatar', '1,0'], ['two', 'lotus', '2,0']], 'two'); piece(g, 'two', 'lotus').lotusState = 'marked'; g = E.applyMove(g, 'two', command('two-lotus-1', '2,1')); assert.equal(piece(g, 'two', 'lotus').lotusState, 'safe'); });
test('trapped marked Lotus dies and awards victory', () => { const g = sparse([['one', 'avatar', '1,0'], ['one', 'water', '1,1'], ['one', 'earth', '1,-1'], ['one', 'fire', '-1,1'], ['one', 'air', '-1,-1'], ['two', 'lotus', '0,0'], ['two', 'water', '-1,0'], ['two', 'earth', '0,1'], ['two', 'fire', '0,-1']], 'two'); piece(g, 'two', 'lotus').lotusState = 'marked'; const n = E.applyMove(g, 'two', command('two-lotus-1', '-1,0')); assert.equal(piece(n, 'two', 'lotus').lotusState, 'dead'); assert.deepEqual(n.result, { winnerId: 'one', reason: 'lotus_dead' }); });
test('diagonal movement does not expand combat adjacency', () => { const n = E.applyMove(sparse([['one', 'water', '-1,-1'], ['two', 'earth', '1,1']]), 'one', command('one-water-1', '0,0')); assert.equal(piece(n, 'two', 'earth').position, '1,1'); });
test('safe Lotus reaching empty center wins immediately', () => { const n = E.applyMove(sparse([['one', 'lotus', '0,-1']]), 'one', command('one-lotus-1', '0,0')); assert.deepEqual(n.result, { winnerId: 'one', reason: 'lotus_reached_center' }); });
test('enemy in Spirit Portal blocks win until sector is cleared', () => { let g = sparse([['one', 'lotus', '0,-1'], ['two', 'water', '1,1']]); g = E.applyMove(g, 'one', command('one-lotus-1', '0,0')); assert.equal(g.result, null); g = E.applyMove(g, 'two', command('two-water-1', '2,1')); assert.deepEqual(g.result, { winnerId: 'one', reason: 'lotus_reached_center' }); });
test('resignation has the required server result', () => { const n = E.applyMove(game(), 'one', { commandId: crypto.randomUUID(), kind: 'resign' }); assert.deepEqual(n.result, { winnerId: 'two', reason: 'resignation' }); });
test('two clients receive the same serializable authoritative state', () => { const g = game(); const tile = g.board.find((candidate) => (g.legalMoves[candidate.id] || []).length); const saved = E.applyMove(g, 'one', command(tile.id, g.legalMoves[tile.id][0])); const clientA = structuredClone(saved); const clientB = structuredClone(saved); assert.deepEqual(clientA, clientB); assert.deepEqual(clientA.legalMoves, clientB.legalMoves); });

test('duplicate command is idempotent and records a jump route', () => {
  const g = sparse([['one', 'water', '-2,0'], ['one', 'earth', '-1,0'], ['one', 'fire', '1,0']]);
  const move = command('one-water-1', '2,0');
  const moved = E.applyMove(g, 'one', move);
  assert.deepEqual(moved.lastMove.route, ['-2,0', '0,0', '2,0']);
  assert.equal(E.applyMove(moved, 'one', move), moved);
  assert.equal(moved.moves.length, 1);
});
