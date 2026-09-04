'use strict';
window.Board = {
  cells: [],
  init() { for (let y = -4; y <= 4; y += 1) for (let x = -4; x <= 4; x += 1) if (x * x + y * y <= 20) this.cells.push({ id: `${x},${y}`, x, y, portal: Math.abs(x) <= 1 && Math.abs(y) <= 1 }); },
  symbol(type) {
    const symbols = {
      water: '<path d="M0-10C-8 0-9 5 0 11C9 5 8 0 0-10Z M-5 4Q0 8 5 4"/>',
      earth: '<path d="M-10 7L0-10L10 7Z M-6 7L0-2L6 7"/>',
      fire: '<path d="M0-11C8-4 10 3 3 10C5 2 0 1 0-4C-2 1-7 4-3 10C-11 5-7-5 0-11Z"/>',
      air: '<path d="M-10-5Q-2-11 5-5Q9-1 3 1H-7 M-9 5H5Q10 5 8 0"/>',
      avatar: '<circle r="10"/><path d="M0-10A10 10 0 0 0 0 10A5 5 0 0 1 0 0A5 5 0 0 0 0-10Z"/>',
      lotus: '<path d="M0 10C-3 4-3-2 0-10C3-2 3 4 0 10M0 8C-8 3-10-2-8-7C-2-4 0 2 0 8M0 8C8 3 10-2 8-7C2-4 0 2 0 8Z"/>',
    }; return symbols[type];
  },
  tile(tile) { const side = tile.owner.endsWith('two') ? 'two' : 'one'; return `<g class="svg-tile side-${side} ${tile.lotusState === 'marked' ? 'marked' : ''}"><circle r="22"/><g class="glyph">${this.symbol(tile.type)}</g></g>`; },
  draw(game, targets = []) {
    const pieces = new Map(game.board.filter((tile) => tile.position).map((tile) => [tile.position, tile]));
    const cells = this.cells.map((cell) => { const x = 260 + cell.x * 49; const y = 260 - cell.y * 49; const tile = pieces.get(cell.id); return `<g class="cell ${cell.portal ? 'portal' : ''} ${targets.includes(cell.id) ? 'target' : ''} ${game.lastMove?.to === cell.id ? 'last' : ''}" data-point="${cell.id}" transform="translate(${x} ${y})"><rect x="-23" y="-23" width="46" height="46" rx="7"/>${tile ? this.tile(tile) : ''}</g>`; }).join('');
    document.querySelector('#board').innerHTML = `<defs><radialGradient id="wood"><stop stop-color="#edcf91"/><stop offset="1" stop-color="#b8783f"/></radialGradient></defs><circle class="wood" cx="260" cy="260" r="244"/><circle class="rim" cx="260" cy="260" r="239"/><rect class="portal-sector" x="186" y="186" width="148" height="148" rx="24"/><text class="portal-label" x="260" y="177">SPIRIT PORTAL</text>${cells}`;
    document.querySelectorAll('#board .target').forEach((node) => node.addEventListener('click', () => Game.send(node.dataset.point)));
  },
};
Board.init();
