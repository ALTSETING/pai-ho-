'use strict';
const crypto = require('node:crypto');
const { cells, cellMap, adjacentIds, stepIds, rotateCell180, COMBAT_DIRECTIONS } = require('./board');
const { TILE_TYPES, ELEMENTS, TILE_COUNTS, getCombatResult } = require('./tiles');

class RuleError extends Error {}
const TOP_FORMATION = Object.freeze([
  ['lotus', '-6,-6'],
  ['air', '-6,-5'], ['earth', '-5,-6'],
  ['water', '-6,-4'], ['fire', '-4,-6'],
  ['earth', '-6,-3'], ['air', '-3,-6'],
  ['water', '-7,-1'], ['fire', '-6,-2'], ['avatar', '-4,-4'], ['water', '-2,-6'], ['fire', '-1,-7'],
  ['air', '-5,-2'], ['earth', '-2,-5'],
]);
const INITIAL_POSITIONS = Object.freeze({
  host: TOP_FORMATION.map(([type, position]) => Object.freeze({ type, position })),
  guest: TOP_FORMATION.map(([type, position]) => Object.freeze({ type, position: rotateCell180(position).id })),
});
const playerIds = (state) => Object.keys(state.players);
const other = (state, player) => playerIds(state).find((id) => id !== player);
const tileAt = (state, position) => state.board.find((tile) => tile.position === position);
const enemyAdjacent = (state, tile, type) => adjacentIds(tile.position).map((id) => tileAt(state, id)).filter((candidate) => candidate && candidate.owner !== tile.owner && (!type || candidate.type === type));

function createPieces(owner, side) {
  const counters = {};
  return INITIAL_POSITIONS[side].map(({ type, position }) => {
    counters[type] = (counters[type] || 0) + 1;
    const cell = cellMap.get(position);
    return { id: `${owner}-${type}-${counters[type]}`, owner, type, position, cellId: position, row: cell.row, column: cell.column, startPosition: position, lotusState: type === 'lotus' ? 'safe' : undefined, waiting: false };
  });
}

function createGame(players, id = crypto.randomUUID()) {
  const ids = Object.keys(players);
  if (ids.length !== 2) throw new RuleError('Для партії потрібні рівно два гравці');
  const board = ids.flatMap((playerId, index) => createPieces(playerId, players[playerId].side === 'host' || (!players[playerId].side && index === 0) ? 'host' : 'guest'));
  const now = new Date().toISOString();
  const state = { id, rulesVersion: 'Modern Pai Sho', players: structuredClone(players), board, activePlayer: ids.find((playerId) => players[playerId].side === 'host') || ids[0], turn: 1, phase: 'playing', moves: [], captured: Object.fromEntries(ids.map((playerId) => [playerId, []])), legalMoves: {}, result: null, createdAt: now, updatedAt: now, version: 0, rematch: Object.fromEntries(ids.map((playerId) => [playerId, false])), lastMove: null };
  state.legalMoves = legalMovesForActivePlayer(state); return state;
}

function jumpTargets(state, tile) {
  if (tile.type === 'lotus') return [];
  const from = cellMap.get(tile.position); const found = new Set(); const visited = new Set([tile.position]);
  function visit(cell) {
    for (const [dx, dy] of COMBAT_DIRECTIONS) {
      const middleId = `${cell.x + dx},${cell.y + dy}`; const landingId = `${cell.x + 2 * dx},${cell.y + 2 * dy}`;
      const middle = tileAt(state, middleId);
      if (!cellMap.has(landingId) || tileAt(state, landingId) || !middle || middle.owner !== tile.owner || visited.has(landingId)) continue;
      found.add(landingId); visited.add(landingId); visit(cellMap.get(landingId));
    }
  }
  visit(from); return [...found];
}

function jumpRoute(state, tile, target) {
  const visited = new Set([tile.position]);
  const search = (cell, route) => {
    if (cell.id === target) return route;
    for (const [dx, dy] of COMBAT_DIRECTIONS) {
      const middleId = `${cell.x + dx},${cell.y + dy}`; const landingId = `${cell.x + 2 * dx},${cell.y + 2 * dy}`;
      const middle = tileAt(state, middleId); const landing = cellMap.get(landingId);
      if (!landing || tileAt(state, landingId) || !middle || middle.owner !== tile.owner || visited.has(landingId)) continue;
      visited.add(landingId);
      const found = search(landing, [...route, landingId]);
      if (found) return found;
    }
    return null;
  };
  return search(cellMap.get(tile.position), [tile.position]);
}

function legalTargets(state, tileId) {
  const tile = state.board.find((candidate) => candidate.id === tileId);
  if (!tile || !tile.position || tile.lotusState === 'dead' || tile.waiting) return [];
  let targets = [...stepIds(tile.position).filter((id) => !tileAt(state, id)), ...jumpTargets(state, tile)];
  if (tile.type === 'lotus' && tile.lotusState === 'marked') targets = targets.filter((id) => !adjacentIds(id).some((near) => { const piece = tileAt(state, near); return piece && piece.owner !== tile.owner && piece.type === 'avatar'; }));
  return [...new Set(targets)];
}
function legalMovesForActivePlayer(state) {
  return Object.fromEntries(state.board.filter((tile) => tile.owner === state.activePlayer && tile.position).map((tile) => [tile.id, legalTargets(state, tile.id)]));
}

function finish(next, winnerId, reason) { next.phase = 'finished'; next.result = { winnerId, reason }; return next; }
function capture(next, tile, captor) {
  tile.position = null; tile.cellId = null; tile.row = null; tile.column = null; tile.waiting = false;
  if (tile.type === 'lotus') tile.lotusState = 'dead';
  next.captured[captor].push(tile.type);
}
function restoreWaitingAvatars(next) {
  for (const avatar of next.board.filter((tile) => tile.type === 'avatar' && tile.waiting)) if (!tileAt(next, avatar.startPosition)) {
    const cell = cellMap.get(avatar.startPosition);
    avatar.position = avatar.startPosition; avatar.cellId = avatar.startPosition; avatar.row = cell.row; avatar.column = cell.column; avatar.waiting = false;
  }
}
function portalWinner(next) {
  for (const lotus of next.board.filter((tile) => tile.type === 'lotus' && tile.position === '0,0' && tile.lotusState === 'safe')) {
    const enemyInSector = next.board.some((tile) => tile.owner !== lotus.owner && tile.position && cellMap.get(tile.position)?.spiritPortal);
    if (!enemyInSector) return lotus.owner;
  }
  return null;
}

function applyMove(state, player, move) {
  if (move.commandId && state.moves.some((record) => record.move.commandId === move.commandId)) return state;
  if (state.phase !== 'playing') throw new RuleError('Партія не активна');
  if (player !== state.activePlayer) throw new RuleError('Зараз хід суперника');
  const next = structuredClone(state);
  if (move.kind === 'resign') {
    next.moves.push({ turn: next.turn, player, move, notation: 'Здача', at: new Date().toISOString() });
    next.version += 1; next.updatedAt = new Date().toISOString(); return finish(next, other(next, player), 'resignation');
  }
  const markedLotus = next.board.find((tile) => tile.owner === player && tile.type === 'lotus' && tile.lotusState === 'marked');
  if (markedLotus && !legalTargets(next, markedLotus.id).length) { capture(next, markedLotus, other(next, player)); return finish(next, other(next, player), 'lotus_dead'); }
  if (markedLotus && move.tileId !== markedLotus.id) throw new RuleError('Ваш Лотос позначений. Пересуньте його зараз, інакше ви програєте.');
  const tile = next.board.find((candidate) => candidate.id === move.tileId);
  if (!tile || tile.owner !== player) throw new RuleError('Ця фішка вам не належить');
  if (!move.to || !legalTargets(next, tile.id).includes(move.to)) throw new RuleError('Недозволений хід');
  const from = tile.position; const route = jumpRoute(next, tile, move.to) || [from, move.to]; tile.position = move.to; tile.cellId = move.to;
  ({ row: tile.row, column: tile.column } = cellMap.get(move.to));

  if (tile.type === 'avatar') {
    for (const enemy of enemyAdjacent(next, tile)) {
      if (ELEMENTS.includes(enemy.type)) capture(next, enemy, player);
      else if (enemy.type === 'lotus' && enemy.lotusState !== 'dead') enemy.lotusState = 'marked';
    }
  } else if (ELEMENTS.includes(tile.type)) {
    for (const enemy of enemyAdjacent(next, tile)) {
      if (!tile.position) break;
      if (enemy.type === 'avatar') { enemy.position = null; enemy.cellId = null; enemy.row = null; enemy.column = null; enemy.waiting = true; }
      else if (ELEMENTS.includes(enemy.type)) {
        const result = getCombatResult(tile.type, enemy.type);
        if (result === 'win') capture(next, enemy, player);
        if (result === 'lose') capture(next, tile, enemy.owner);
      }
    }
  } else if (tile.type === 'lotus') {
    tile.lotusState = enemyAdjacent(next, tile, 'avatar').length ? 'marked' : 'safe';
  }
  restoreWaitingAvatars(next);
  // An Avatar restored beside a Lotus is dangerous too.
  for (const lotus of next.board.filter((piece) => piece.type === 'lotus' && piece.position && piece.lotusState !== 'dead')) if (enemyAdjacent(next, lotus, 'avatar').length) lotus.lotusState = 'marked';

  next.lastMove = { tileId: tile.id, type: tile.type, from, to: move.to, route, player };
  next.moves.push({ turn: next.turn, player, move, at: new Date().toISOString(), notation: `${tile.type} ${from} → ${move.to}` });
  next.turn += 1; next.activePlayer = other(next, player); next.version += 1; next.updatedAt = new Date().toISOString();
  const deadLotus = next.board.find((piece) => piece.type === 'lotus' && piece.lotusState === 'dead');
  if (deadLotus) return finish(next, other(next, deadLotus.owner), 'lotus_dead');
  const winner = portalWinner(next); if (winner) return finish(next, winner, 'lotus_reached_center');
  const nextMarked = next.board.find((piece) => piece.owner === next.activePlayer && piece.type === 'lotus' && piece.lotusState === 'marked');
  if (nextMarked && !legalTargets(next, nextMarked.id).length) { capture(next, nextMarked, player); return finish(next, player, 'lotus_dead'); }
  next.legalMoves = legalMovesForActivePlayer(next); return next;
}

module.exports = { RuleError, cells, cellMap, adjacentIds, stepIds, rotateCell180, TILE_TYPES, TILE_COUNTS, ELEMENTS, TOP_FORMATION, INITIAL_POSITIONS, getCombatResult, legalTargets, createGame, applyMove };
