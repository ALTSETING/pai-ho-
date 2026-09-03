'use strict';
const crypto = require('node:crypto');
const { points, pointMap, pathBetween } = require('./board');
const { BASIC, ACCENTS, RED, WHITE, RANGE, HARMONY, CLASH, createReserve } = require('./tiles');
class RuleError extends Error {}
const other = (player) => (player === 'one' ? 'two' : 'one');
const tileAt = (state, point) => state.board.find((tile) => tile.position === point);
const location = (tile) => tile.position && pointMap.get(tile.position);
function canOccupy(tile, point) {
  if (tile.kind !== 'basic') return true;
  if (RED.has(tile.type)) return point.garden !== 'white';
  if (WHITE.has(tile.type)) return point.garden !== 'red';
  return true;
}
function suppressed(tile, board) {
  const at = location(tile);
  return Boolean(at && board.some((candidate) => candidate.type === 'knotweed' && location(candidate) && Math.max(Math.abs(location(candidate).x - at.x), Math.abs(location(candidate).y - at.y)) <= 1));
}
function legalTargets(state, tileId) {
  const tile = [...state.board, ...state.reserves.one, ...state.reserves.two].find((item) => item.id === tileId);
  if (!tile) return [];
  if (!tile.position) return points.filter((point) => point.gate && !tileAt(state, point.id) && canOccupy(tile, point)).map((point) => point.id);
  const from = location(tile);
  return points.filter((to) => {
    const path = pathBetween(from, to);
    if (!path.length || path.length > RANGE[tile.type] || !canOccupy(tile, to)) return false;
    if (path.slice(0, -1).some((point) => tileAt(state, point.id))) return false;
    const occupant = tileAt(state, to.id);
    if (!occupant) return true;
    if (occupant.owner === tile.owner || occupant.type === 'rock' || tile.type === 'rock' || tile.type === 'knotweed') return false;
    if (tile.type === 'boat') return true;
    if (tile.type === 'orchid') return occupant.kind === 'basic' && !suppressed(tile, state.board);
    return Boolean(CLASH[tile.type]?.includes(occupant.type));
  }).map((point) => point.id);
}
function calculateHarmonies(board) {
  const result = [];
  for (let i = 0; i < board.length; i += 1) for (let j = i + 1; j < board.length; j += 1) {
    const a = board[i]; const b = board[j]; const pa = location(a); const pb = location(b);
    if (!pa || !pb || a.owner !== b.owner || !a.blooming || !b.blooming || suppressed(a, board) || suppressed(b, board)) continue;
    if (!HARMONY[a.type]?.includes(b.type) && !HARMONY[b.type]?.includes(a.type)) continue;
    if (pa.x !== pb.x && pa.y !== pb.y) continue;
    const between = pathBetween(pa, pb).slice(0, -1);
    if (board.some((tile) => tile !== a && tile !== b && between.some((point) => point.id === tile.position))) continue;
    result.push({ a: a.id, b: b.id, midline: pa.x * pb.x < 0 || pa.y * pb.y < 0 });
  }
  return result;
}
function formsHarmonyRing(harmonies) {
  const graph = new Map();
  for (const edge of harmonies) {
    graph.set(edge.a, [...(graph.get(edge.a) || []), edge.b]);
    graph.set(edge.b, [...(graph.get(edge.b) || []), edge.a]);
  }
  function cycle(node, parent, visited) {
    visited.add(node);
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) { if (cycle(neighbor, node, visited)) return true; }
      else if (neighbor !== parent) return true;
    }
    return false;
  }
  const visited = new Set();
  return [...graph.keys()].some((node) => !visited.has(node) && cycle(node, null, visited));
}
function createGame(players, id = crypto.randomUUID()) {
  const now = new Date().toISOString();
  return { id, rulesVersion: 'Skud Pai Sho (no expansions)', players: structuredClone(players), board: [], reserves: { one: [], two: [] }, selectedAccents: { one: [], two: [] }, activePlayer: players.one.side === 'host' ? 'one' : 'two', turn: 1, phase: 'setup', harmonies: [], moves: [], result: null, createdAt: now, updatedAt: now, version: 0, rematch: { one: false, two: false }, lastMove: null };
}
function selectAccents(state, player, accents) {
  if (state.phase !== 'setup') throw new RuleError('Вибір акцентів уже завершено');
  if (!Array.isArray(accents) || accents.length !== 2 || new Set(accents).size !== 2 || accents.some((type) => !ACCENTS.includes(type))) throw new RuleError('Оберіть рівно дві різні акцентні плитки');
  const next = structuredClone(state); next.selectedAccents[player] = accents;
  if (next.selectedAccents.one.length && next.selectedAccents.two.length) {
    next.reserves.one = createReserve('one', next.selectedAccents.one);
    next.reserves.two = createReserve('two', next.selectedAccents.two);
    next.phase = 'playing';
  }
  next.version += 1; next.updatedAt = new Date().toISOString(); return next;
}
function hasAnyMove(state, player) { return [...state.board.filter((tile) => tile.owner === player), ...state.reserves[player]].some((tile) => legalTargets(state, tile.id).length); }
function finish(state, result, player, move) {
  const next = structuredClone(state); next.phase = 'finished'; next.result = result; next.updatedAt = new Date().toISOString();
  if (move.kind === 'resign') next.moves.push({ turn: next.turn, player, move, at: next.updatedAt, notation: 'Здача' });
  return next;
}
function applyMove(state, player, move) {
  if (state.moves.some((record) => record.move.commandId === move.commandId)) return state;
  if (state.phase !== 'playing') throw new RuleError('Партія не активна');
  if (player !== state.activePlayer) throw new RuleError('Зараз хід суперника');
  if (move.kind === 'resign') return finish(state, { winner: other(player), reason: 'resignation' }, player, move);
  if (!move.tileId || !move.to) throw new RuleError('Оберіть плитку та ціль');
  const owned = [...state.board, ...state.reserves[player]].find((tile) => tile.id === move.tileId && tile.owner === player);
  if (!owned) throw new RuleError('Ця плитка вам не належить');
  if (!legalTargets(state, owned.id).includes(move.to)) throw new RuleError('Недозволена ціль, Garden або заблокований шлях');
  const next = structuredClone(state); let tile = next.board.find((item) => item.id === owned.id);
  if (!tile) { const index = next.reserves[player].findIndex((item) => item.id === owned.id); tile = next.reserves[player].splice(index, 1)[0]; next.board.push(tile); }
  const destination = next.board.find((item) => item.position === move.to && item.id !== tile.id);
  if (destination) {
    if (tile.type === 'boat' && move.secondaryTo && pointMap.has(move.secondaryTo) && !tileAt(next, move.secondaryTo)) destination.position = move.secondaryTo;
    else next.board = next.board.filter((item) => item.id !== destination.id);
  }
  tile.position = move.to; tile.blooming = tile.kind === 'basic' && !pointMap.get(move.to).gate;
  // Wheel rotates every occupied adjacent point 90° clockwise when all destinations are valid.
  if (tile.type === 'wheel') {
    const center = pointMap.get(move.to); const adjacent = next.board.filter((item) => item.id !== tile.id && location(item) && Math.max(Math.abs(location(item).x - center.x), Math.abs(location(item).y - center.y)) === 1);
    const rotations = adjacent.map((item) => ({ item, to: pointMap.get(`${center.x + (location(item).y - center.y)},${center.y - (location(item).x - center.x)}`) }));
    if (rotations.every((entry) => entry.to && !next.board.some((item) => !adjacent.includes(item) && item.position === entry.to.id))) rotations.forEach((entry) => { entry.item.position = entry.to.id; });
  }
  next.lastMove = move; next.turn += 1; next.activePlayer = other(player); next.harmonies = calculateHarmonies(next.board); next.version += 1; next.updatedAt = new Date().toISOString();
  next.moves.push({ turn: next.turn - 1, player, move, at: next.updatedAt, notation: `${move.kind === 'plant' ? 'Plant' : 'Arrange'} ${tile.type} → ${move.to}` });
  const playerHarmonies = next.harmonies.filter((harmony) => next.board.find((item) => item.id === harmony.a)?.owner === player);
  if (formsHarmonyRing(playerHarmonies)) return finish(next, { winner: player, reason: 'harmony-ring' }, player, move);
  if (!next.reserves.one.some((item) => item.kind === 'basic') && !next.reserves.two.some((item) => item.kind === 'basic')) {
    const score = (owner) => next.harmonies.filter((harmony) => harmony.midline && next.board.find((item) => item.id === harmony.a)?.owner === owner).length;
    const one = score('one'); const two = score('two'); return finish(next, { winner: one === two ? null : one > two ? 'one' : 'two', reason: one === two ? 'draw' : 'last-basic' }, player, move);
  }
  if (!hasAnyMove(next, next.activePlayer)) throw new RuleError('Хід заборонено: суперник не матиме можливих дій');
  return next;
}
module.exports = { RuleError, points, pointMap, pathBetween, BASIC, ACCENTS, RANGE, HARMONY, CLASH, canOccupy, legalTargets, calculateHarmonies, formsHarmonyRing, createGame, selectAccents, applyMove };
