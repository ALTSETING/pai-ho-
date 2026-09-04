'use strict';
const crypto = require('node:crypto');
const { cells, cellMap, adjacentIds, rotateCell180, DIRECTIONS } = require('./board');
const { TILE_TYPES, ELEMENTS, TILE_COUNTS, getCombatResult } = require('./tiles');

class RuleError extends Error {}
const TOP_FORMATION = Object.freeze([
  ['lotus', '0,-8'],
  ['air', '-1,-7'], ['earth', '0,-7'],
  ['water', '-1,-6'], ['fire', '1,-6'],
  ['earth', '-1,-5'], ['air', '0,-5'],
  ['water', '-2,-4'], ['fire', '-1,-4'], ['avatar', '0,-4'], ['water', '1,-4'], ['fire', '2,-4'],
  ['air', '-1,-3'], ['earth', '0,-3'],
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
    return { id: `${owner}-${type}-${counters[type]}`, owner, type, position, cellId: position, row: cell.row, column: cell.column, startPosition: position, lotusState: type === 'lotus' ? 'safe' : undefined, waiting: false, avatarRespawnPending: false };
  });
}

function createGame(players, id = crypto.randomUUID()) {
  const ids = Object.keys(players);
  if (ids.length !== 2) throw new RuleError('Для партії потрібні рівно два гравці');
  const board = ids.flatMap((playerId, index) => createPieces(playerId, players[playerId].side === 'host' || (!players[playerId].side && index === 0) ? 'host' : 'guest'));
  const now = new Date().toISOString();
  const state = { id, rulesVersion: 'Modern Pai Sho', players: structuredClone(players), board, activePlayer: ids.find((playerId) => players[playerId].side === 'host') || ids[0], turn: 1, phase: 'playing', moves: [], captured: Object.fromEntries(ids.map((playerId) => [playerId, []])), legalMoves: {}, legalMoveRoutes: {}, result: null, createdAt: now, updatedAt: now, version: 0, rematch: Object.fromEntries(ids.map((playerId) => [playerId, false])), lastMove: null };
  state.legalMoves = legalMovesForActivePlayer(state); state.legalMoveRoutes = legalMoveRoutesForActivePlayer(state); return state;
}

function getAdjacentCells(cellId) { return adjacentIds(cellId); }
function getLegalMoveRoutes(state, tileId) {
  const tile = state.board.find((candidate) => candidate.id === tileId);
  if (!tile || !tile.position || tile.lotusState === 'dead' || tile.waiting) return [];
  const occupied = new Map(state.board.filter((piece) => piece.position && piece.id !== tile.id).map((piece) => [piece.position, piece]));
  const routes = [];
  const safeEnd = (id) => tile.type !== 'lotus' || tile.lotusState !== 'marked' || !adjacentIds(id).some((near) => {
    const piece = occupied.get(near); return piece && piece.owner !== tile.owner && piece.type === 'avatar';
  });
  const add = (path, kind) => { if (safeEnd(path.at(-1))) routes.push({ path: [...path], kind }); };
  const stepsFrom = (from, visited, path, kind = 'step') => {
    for (const id of adjacentIds(from)) if (!occupied.has(id) && !visited.has(id)) add([...path, id], kind);
  };
  const jumpsFrom = (from, visited, path, allowFinalStep) => {
    const cell = cellMap.get(from);
    for (const [dx, dy] of DIRECTIONS) {
      const middleId = `${cell.column + dx},${cell.row + dy}`;
      const landingId = `${cell.column + 2 * dx},${cell.row + 2 * dy}`;
      const middle = occupied.get(middleId);
      if (!cellMap.has(landingId) || occupied.has(landingId) || visited.has(landingId) || !middle || middle.owner !== tile.owner) continue;
      const nextPath = [...path, landingId]; const nextVisited = new Set(visited).add(landingId);
      add(nextPath, 'jump'); jumpsFrom(landingId, nextVisited, nextPath, allowFinalStep);
      if (allowFinalStep) stepsFrom(landingId, nextVisited, nextPath, 'jump-step');
    }
  };
  const visited = new Set([tile.position]);
  stepsFrom(tile.position, visited, []);
  if (tile.type !== 'lotus') {
    jumpsFrom(tile.position, visited, [], true);
    for (const step of adjacentIds(tile.position)) if (!occupied.has(step)) jumpsFrom(step, new Set([tile.position, step]), [step], false);
  }
  return [...new Map(routes.map((route) => [route.path.join('|'), route])).values()]
    .sort((a, b) => a.path.length - b.path.length || a.path.join().localeCompare(b.path.join()));
}
function legalTargets(state, tileId) {
  return [...new Set(getLegalMoveRoutes(state, tileId).map((route) => route.path.at(-1)))];
}
function validateMoveRoute(state, playerId, pieceId, path) {
  const tile = state.board.find((candidate) => candidate.id === pieceId);
  if (!tile || tile.owner !== playerId) throw new RuleError('Ця фішка вам не належить');
  if (!Array.isArray(path) || !path.length || path.some((id) => !cellMap.has(id))) throw new RuleError('Недозволений маршрут');
  const route = getLegalMoveRoutes(state, pieceId).find((candidate) => candidate.path.length === path.length && candidate.path.every((id, index) => id === path[index]));
  if (!route) throw new RuleError('Недозволений маршрут');
  return route;
}
function legalMovesForActivePlayer(state) {
  return Object.fromEntries(state.board.filter((tile) => tile.owner === state.activePlayer && tile.position).map((tile) => [tile.id, legalTargets(state, tile.id)]));
}
function legalMoveRoutesForActivePlayer(state) {
  return Object.fromEntries(state.board.filter((tile) => tile.owner === state.activePlayer && tile.position).map((tile) => [tile.id, getLegalMoveRoutes(state, tile.id)]));
}

function finish(next, winnerId, reason) { next.phase = 'finished'; next.result = { winnerId, reason }; return next; }
function capture(next, tile, captor) {
  tile.position = null; tile.cellId = null; tile.row = null; tile.column = null; tile.waiting = false;
  tile.avatarRespawnPending = false;
  if (tile.type === 'lotus') tile.lotusState = 'dead';
  next.captured[captor].push(tile.type);
}
function restoreWaitingAvatars(next) {
  for (const avatar of next.board.filter((tile) => tile.type === 'avatar' && tile.waiting)) if (!tileAt(next, avatar.startPosition)) {
    const cell = cellMap.get(avatar.startPosition);
    avatar.position = avatar.startPosition; avatar.cellId = avatar.startPosition; avatar.row = cell.row; avatar.column = cell.column; avatar.waiting = false; avatar.avatarRespawnPending = false;
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
  if (move.gameId && move.gameId !== state.id) throw new RuleError('Активну партію не знайдено');
  if (move.expectedTurnNumber !== undefined && move.expectedTurnNumber !== state.turn) throw new RuleError('Стан гри вже змінився');
  if (player !== state.activePlayer) throw new RuleError('Зараз не ваш хід');
  const next = structuredClone(state);
  if (move.kind === 'resign') {
    next.moves.push({ turn: next.turn, player, move, notation: 'Здача', at: new Date().toISOString() });
    next.version += 1; next.updatedAt = new Date().toISOString(); return finish(next, other(next, player), 'resignation');
  }
  const markedLotus = next.board.find((tile) => tile.owner === player && tile.type === 'lotus' && tile.lotusState === 'marked');
  if (markedLotus && !legalTargets(next, markedLotus.id).length) { capture(next, markedLotus, other(next, player)); return finish(next, other(next, player), 'lotus_dead'); }
  const pieceId = move.pieceId || move.tileId;
  if (markedLotus && pieceId !== markedLotus.id) throw new RuleError('Лотос повинен бути переміщений');
  const tile = next.board.find((candidate) => candidate.id === pieceId);
  if (!tile || tile.owner !== player) throw new RuleError('Ця фішка вам не належить');
  const path = move.path || (move.to ? [move.to] : []);
  validateMoveRoute(next, player, tile.id, path);
  const destination = path.at(-1);
  const from = tile.position; tile.position = destination; tile.cellId = destination;
  ({ row: tile.row, column: tile.column } = cellMap.get(destination));

  if (tile.type === 'avatar') {
    for (const enemy of enemyAdjacent(next, tile)) {
      if (ELEMENTS.includes(enemy.type)) capture(next, enemy, player);
      else if (enemy.type === 'lotus' && enemy.lotusState !== 'dead') enemy.lotusState = 'marked';
    }
  } else if (ELEMENTS.includes(tile.type)) {
    for (const enemy of enemyAdjacent(next, tile)) {
      if (!tile.position) break;
      if (enemy.type === 'avatar') { enemy.position = null; enemy.cellId = null; enemy.row = null; enemy.column = null; enemy.waiting = true; enemy.avatarRespawnPending = true; }
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

  next.lastMove = { pieceId: tile.id, tileId: tile.id, type: tile.type, from, to: destination, path, player };
  next.moves.push({ turn: next.turn, player, move, at: new Date().toISOString(), notation: `${tile.type} ${[from, ...path].join(' → ')}` });
  next.turn += 1; next.activePlayer = other(next, player); next.version += 1; next.updatedAt = new Date().toISOString();
  const deadLotus = next.board.find((piece) => piece.type === 'lotus' && piece.lotusState === 'dead');
  if (deadLotus) return finish(next, other(next, deadLotus.owner), 'lotus_dead');
  const winner = portalWinner(next); if (winner) return finish(next, winner, 'lotus_reached_center');
  const nextMarked = next.board.find((piece) => piece.owner === next.activePlayer && piece.type === 'lotus' && piece.lotusState === 'marked');
  if (nextMarked && !legalTargets(next, nextMarked.id).length) { capture(next, nextMarked, player); return finish(next, player, 'lotus_dead'); }
  next.legalMoves = legalMovesForActivePlayer(next); next.legalMoveRoutes = legalMoveRoutesForActivePlayer(next); return next;
}

module.exports = { RuleError, cells, cellMap, adjacentIds, getAdjacentCells, rotateCell180, TILE_TYPES, TILE_COUNTS, ELEMENTS, TOP_FORMATION, INITIAL_POSITIONS, getCombatResult, legalTargets, getLegalMoveRoutes, validateMoveRoute, createGame, applyMove };
