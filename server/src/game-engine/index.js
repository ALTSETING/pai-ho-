'use strict';
const crypto = require('node:crypto');
const { cells, cellMap, adjacentIds, stepIds, rotateCell180, JUMP_DIRECTIONS } = require('./board');
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

function jumpRoutes(state, tile) {
  const routes = new Map();
  if (tile.type === 'lotus') return routes;
  // The moving piece is absent while the complete chain is evaluated. In
  // particular, its origin cannot accidentally be used as a piece to jump over.
  const jumpTileAt = (position) => state.board.find((piece) => piece.id !== tile.id && piece.position === position);
  const visit = (cell, route, visited) => {
    for (const [dx, dy] of JUMP_DIRECTIONS) {
      const middleId = `${cell.column + dx},${cell.row + dy}`;
      const landingId = `${cell.column + 2 * dx},${cell.row + 2 * dy}`;
      const middle = jumpTileAt(middleId); const landing = cellMap.get(landingId);
      if (!landing || jumpTileAt(landingId) || !middle || middle.owner !== tile.owner || visited.has(landingId)) continue;
      const nextRoute = [...route, landingId];
      if (!routes.has(landingId)) routes.set(landingId, nextRoute);
      visit(landing, nextRoute, new Set([...visited, landingId]));
    }
  };
  visit(cellMap.get(tile.position), [tile.position], new Set([tile.position]));
  return routes;
}

function jumpTargets(state, tile) { return [...jumpRoutes(state, tile).keys()]; }
function jumpRoute(state, tile, target) { return jumpRoutes(state, tile).get(target) || null; }

function legalTargets(state, tileId) {
  const tile = state.board.find((candidate) => candidate.id === tileId);
  if (!tile || !tile.position || tile.lotusState === 'dead' || tile.waiting) return [];
  let targets = [...stepIds(tile.position).filter((id) => !tileAt(state, id)), ...jumpTargets(state, tile)];
  if (tile.type === 'lotus' && tile.lotusState === 'marked') targets = targets.filter((id) => !adjacentIds(id).some((near) => { const piece = tileAt(state, near); return piece && piece.owner !== tile.owner; }));
  return [...new Set(targets)];
}
function legalMovesForActivePlayer(state) {
  return Object.fromEntries(state.board.filter((tile) => tile.owner === state.activePlayer && tile.position).map((tile) => [tile.id, legalTargets(state, tile.id)]));
}

function finish(next, winnerId, reason) { next.phase = 'finished'; next.result = { winnerId, reason }; return next; }
function capture(next, tile, captor) {
  const position = tile.position;
  next._destructionEvents ||= [];
  next._destructionEvents.push({ pieceId: tile.id, owner: tile.owner, type: tile.type, position });
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
function markThreatenedLotuses(next, movedTile) {
  for (const lotus of next.board.filter((piece) => piece.type === 'lotus' && piece.position && piece.lotusState !== 'dead')) {
    const threatened = enemyAdjacent(next, lotus).length > 0;
    if (threatened) lotus.lotusState = 'marked';
    else if (lotus.id === movedTile?.id) lotus.lotusState = 'safe';
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
  if (markedLotus && !legalTargets(next, markedLotus.id).length) {
    capture(next, markedLotus, other(next, player));
    next.lastMove = { moveId: move.commandId || `turn-${next.turn}`, tileId: null, type: null, from: null, to: null, route: [], player, destructionEvents: next._destructionEvents };
    delete next._destructionEvents; next.version += 1; next.updatedAt = new Date().toISOString();
    return finish(next, other(next, player), 'lotus_dead');
  }
  if (markedLotus && move.tileId !== markedLotus.id) throw new RuleError('Ваш Лотос позначений. Пересуньте його зараз, інакше ви програєте.');
  const tile = next.board.find((candidate) => candidate.id === move.tileId);
  if (!tile || tile.owner !== player) throw new RuleError('Ця фішка вам не належить');
  if (!move.to || !legalTargets(next, tile.id).includes(move.to)) throw new RuleError('Недозволений хід');
  const from = tile.position; const route = jumpRoute(next, tile, move.to) || [from, move.to]; tile.position = move.to; tile.cellId = move.to;
  ({ row: tile.row, column: tile.column } = cellMap.get(move.to));

  if (tile.type === 'avatar') {
    for (const enemy of enemyAdjacent(next, tile)) {
      if (ELEMENTS.includes(enemy.type) || enemy.type === 'avatar') capture(next, enemy, player);
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
  }
  restoreWaitingAvatars(next);
  // Threats are evaluated only after combat and Avatar restoration, so pieces
  // removed by combat cannot mark a Lotus and restored pieces can mark one.
  markThreatenedLotuses(next, tile);

  next.lastMove = { moveId: move.commandId || `turn-${next.turn}`, tileId: tile.id, type: tile.type, from, to: move.to, route, player, destructionEvents: next._destructionEvents || [] };
  delete next._destructionEvents;
  next.moves.push({ turn: next.turn, player, move, at: new Date().toISOString(), notation: `${tile.type} ${from} → ${move.to}` });
  next.turn += 1; next.activePlayer = other(next, player); next.version += 1; next.updatedAt = new Date().toISOString();
  const deadLotus = next.board.find((piece) => piece.type === 'lotus' && piece.lotusState === 'dead');
  if (deadLotus) return finish(next, other(next, deadLotus.owner), 'lotus_dead');
  const winner = portalWinner(next); if (winner) return finish(next, winner, 'lotus_reached_center');
  const nextMarked = next.board.find((piece) => piece.owner === next.activePlayer && piece.type === 'lotus' && piece.lotusState === 'marked');
  if (nextMarked && !legalTargets(next, nextMarked.id).length) {
    capture(next, nextMarked, player); next.lastMove.destructionEvents.push(...next._destructionEvents);
    delete next._destructionEvents; return finish(next, player, 'lotus_dead');
  }
  delete next._destructionEvents;
  next.legalMoves = legalMovesForActivePlayer(next); return next;
}

module.exports = { RuleError, cells, cellMap, adjacentIds, stepIds, rotateCell180, TILE_TYPES, TILE_COUNTS, ELEMENTS, TOP_FORMATION, INITIAL_POSITIONS, getCombatResult, legalTargets, createGame, applyMove };
