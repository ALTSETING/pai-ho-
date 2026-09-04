'use strict';

(function expose(root) {
  function canSelectPiece(state, playerId, piece, pending = false) {
    if (!state || state.phase !== 'playing' || !playerId || pending || !piece?.position) return false;
    if (state.activePlayer !== playerId || piece.owner !== playerId) return false;
    const markedLotus = state.board.find((tile) => tile.owner === playerId && tile.type === 'lotus' && tile.lotusState === 'marked');
    return !markedLotus || markedLotus.id === piece.id;
  }

  function shortestRoute(routes, destination) {
    return routes.filter((route) => route.path.at(-1) === destination)
      .sort((a, b) => a.path.length - b.path.length || a.path.join().localeCompare(b.path.join()))[0] || null;
  }

  const api = { canSelectPiece, shortestRoute };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MoveRules = api;
}(typeof window === 'undefined' ? globalThis : window));
