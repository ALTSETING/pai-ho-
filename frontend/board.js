'use strict';

window.Board = {
  cells: [],
  init() {
    for (let y = -4; y <= 4; y += 1) for (let x = -4; x <= 4; x += 1) {
      if (x * x + y * y <= 20) this.cells.push({ id: `${x},${y}`, x, y, portal: Math.abs(x) <= 1 && Math.abs(y) <= 1 });
    }
  },
  point(cell) { return { x: 500 + cell.x * 88, y: 500 - cell.y * 88 }; },
  symbol(type) {
    return {
      fire: '<path d="M0 18C-20 8-19-12 0-31c-3 16 14 16 8 33 11-7 13-20 7-32 25 20 24 47 3 59C-5 42-7 26 0 18Z"/>',
      air: '<path d="M-29-8C-19-29 17-29 24-11 30 5 9 10-1 1M-27 7c8 18 34 22 49 7M-15 20c8 8 22 7 29 1"/>',
      water: '<path d="M-31 3c12 0 14-14 27-14S10 3 24 3M-27 16c10 0 13-11 24-11s14 11 27 11M-16-18c7-12 14-12 21 0"/>',
      earth: '<path d="M-27 24V-23h54v47ZM-17 13h34v-25H5v8h-10v-8h-12Zm17 0V2M-10 13V5M10 13V5"/>',
      avatar: '<circle r="25"/><path d="M0-25A25 25 0 0 0 0 25 12.5 12.5 0 0 1 0 0 12.5 12.5 0 0 0 0-25Z"/><circle cy="-12.5" r="4" class="detail"/><circle cy="12.5" r="4" class="detail"/>',
      lotus: '<path d="M0 24C-9 11-10-5 0-27 10-5 9 11 0 24M0 22C-21 16-29 2-24-13-9-8-2 5 0 22M0 22C21 16 29 2 24-13 9-8 2 5 0 22M-23 18c14 8 32 8 46 0"/>',
    }[type];
  },
  tile(tile, selected = false) {
    const side = tile.owner === Game.me?.id ? 'one' : 'two';
    return `<g class="svg-tile type-${tile.type} side-${side} ${selected ? 'selected' : ''} ${tile.lotusState === 'marked' ? 'marked' : ''}" data-piece="${tile.id}" tabindex="0" role="button" aria-label="${Game.label(tile.type)}"><circle class="piece-shadow" cy="4" r="36"/><circle class="piece-rim" r="36"/><circle class="piece-ceramic" r="29"/><circle class="piece-inlay" r="23"/><path class="shine" d="M-19-19A27 27 0 0 1 15-25"/><g class="glyph">${this.symbol(tile.type)}</g></g>`;
  },
  targetKind(game, selected, position) {
    if (!selected) return 'move';
    if (selected.type === 'lotus') {
      const dangerous = game.board.some((p) => p.owner !== selected.owner && p.type === 'avatar' && p.position && this.adjacent(p.position, position));
      return dangerous ? 'danger' : 'safe';
    }
    const enemy = game.board.find((p) => p.owner !== selected.owner && p.position && this.adjacent(p.position, position));
    return enemy ? 'attack' : 'move';
  },
  adjacent(a, b) { const [ax, ay] = a.split(',').map(Number); const [bx, by] = b.split(',').map(Number); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; },
  defs() {
    return `<defs>
      <radialGradient id="wood" cx="38%" cy="30%"><stop stop-color="#ddb078"/><stop offset=".65" stop-color="#aa673d"/><stop offset="1" stop-color="#754026"/></radialGradient>
      <linearGradient id="ceramic" x2="0" y2="1"><stop stop-color="#fffdf1"/><stop offset=".52" stop-color="#e5dbc4"/><stop offset="1" stop-color="#aaa18f"/></linearGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".035 .32" numOctaves="2" seed="7" result="n"/><feBlend in="SourceGraphic" in2="n" mode="soft-light"/></filter>
      <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <clipPath id="boardClip"><circle cx="500" cy="500" r="421"/></clipPath>
    </defs>`;
  },
  draw(game, targets = [], selected = null) {
    const pieces = new Map(game.board.filter((tile) => tile.position).map((tile) => [tile.position, tile]));
    const diagonal = [];
    for (let i = -9; i <= 9; i += 1) {
      diagonal.push(`<path d="M${80 + i * 88} 80L920 ${920 - i * 88}"/><path d="M${80 + i * 88} 920L920 ${80 + i * 88}"/>`);
    }
    const highlights = targets.map((id) => { const p = this.point(this.cells.find((c) => c.id === id)); const kind = this.targetKind(game, selected, id); return `<g class="move-target ${kind}" data-point="${id}" transform="translate(${p.x} ${p.y})"><circle class="target-touch" r="42"/><circle class="target-mark" r="${kind === 'move' ? 10 : 26}"/></g>`; }).join('');
    const hitAreas = this.cells.map((cell) => { const p = this.point(cell); const interactive = !pieces.has(cell.id) && !targets.includes(cell.id); return `<circle class="hit-area ${interactive ? 'interactive' : ''}" data-point="${cell.id}" cx="${p.x}" cy="${p.y}" r="39"/>`; }).join('');
    const tiles = game.board.filter((tile) => tile.position).map((tile) => { const p = this.point(this.cells.find((c) => c.id === tile.position)); return `<g class="piece-position ${game.lastMove?.tileId === tile.id ? 'just-moved' : ''}" transform="translate(${p.x} ${p.y})">${this.tile(tile, selected?.id === tile.id)}</g>`; }).join('');
    const route = selected && targets.length ? targets.map((id) => { const from = this.point(this.cells.find((c) => c.id === selected.position)); const to = this.point(this.cells.find((c) => c.id === id)); return `<path d="M${from.x} ${from.y}L${to.x} ${to.y}"/>`; }).join('') : '';
    document.querySelector('#board').innerHTML = `${this.defs()}<g id="board-background"><circle class="outer-shadow" cx="500" cy="500" r="474"/><circle class="outer-rim" cx="500" cy="500" r="466"/><circle class="inner-rim" cx="500" cy="500" r="432"/><circle class="wood" cx="500" cy="500" r="421"/></g><g id="board-zones" clip-path="url(#boardClip)"><path class="light-zone" d="M236 236H764V764H236Z"/><path class="red-zone" d="M236 236H764L500 500ZM236 764H764L500 500Z"/><path class="red-corner" d="M80 236H236V80ZM764 80V236H920ZM80 764H236V920ZM764 920V764H920Z"/><circle class="portal" cx="500" cy="500" r="92"/><circle class="portal-core" cx="500" cy="500" r="22"/></g><g id="board-grid" clip-path="url(#boardClip)">${diagonal.join('')}<path class="axis" d="M104 500H896M500 104V896"/></g><g id="route-lines">${route}</g><g id="move-highlights">${highlights}</g><g id="pieces">${tiles}</g><g id="effects"></g><g id="hit-areas">${hitAreas}</g>`;
    document.querySelectorAll('#board [data-piece]').forEach((node) => { node.onclick = (event) => { event.stopPropagation(); Game.inspectPiece(node.dataset.piece); }; node.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') node.onclick(e); }; });
    document.querySelectorAll('#board .move-target').forEach((node) => { node.onclick = (event) => { event.stopPropagation(); Game.send(node.dataset.point); }; });
    document.querySelectorAll('#board .hit-area.interactive').forEach((node) => { node.onclick = (event) => { event.stopPropagation(); Game.boardCell(node.dataset.point); }; });
  },
};
Board.init();
