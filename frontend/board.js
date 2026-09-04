'use strict';

window.Board = {
  cells: [], scale: 39, DEBUG_BOARD_CELLS: false,
  init() {
    for (let row = -7; row <= 7; row += 1) for (let column = -7; column <= 7; column += 1) {
      if (column * column + row * row > 50) continue;
      const centerX = 500 + (column - row) * this.scale;
      const centerY = 500 + (column + row) * this.scale / 2;
      this.cells.push({ id: `${column},${row}`, row, column, centerX, centerY, polygonPoints: [[centerX, centerY - this.scale / 2], [centerX + this.scale, centerY], [centerX, centerY + this.scale / 2], [centerX - this.scale, centerY]], portal: Math.abs(column) <= 1 && Math.abs(row) <= 1 });
    }
  },
  cell(id) { return this.cells.find((cell) => cell.id === id); },
  point(cell) { return { x: cell.centerX, y: cell.centerY }; },
  polygon(cell) { return cell.polygonPoints.map((point) => point.join(',')).join(' '); },
  symbol(type) {
    return {
      fire: '<path class="glyph-back" d="M0 28C-25 15-23-8-5-31c-2 18 11 17 10 4 21 17 26 42 10 55-2-12-7-20-13-25 2 12-8 17-2 25Z"/><path d="M1 22c-10-8-9-18 1-30 0 9 10 11 7 21"/>',
      air: '<path d="M-27-9c9-22 43-22 49-6 5 14-13 21-24 12M-29 7c11 15 35 18 50 6M-18 21c9 7 23 5 29-2"/><circle cx="17" cy="-12" r="3"/>',
      water: '<path class="glyph-back" d="M-30 8c11-2 15-16 28-16 12 0 15 14 29 11-5 18-20 29-38 21-7-3-13-9-19-16Z"/><path d="M-28 8c12 0 14-13 27-13S10 8 27 3M-22 17c10 3 17-4 24-9 7 7 14 10 22 7"/>',
      earth: '<path class="glyph-back" d="M-27 24V-23h54v47Z"/><path d="M-19 15h38v-29H7v9H-7v-9h-12ZM0-5v20M-11 3v12M11 3v12"/>',
      avatar: '<circle class="glyph-back" r="27"/><path d="M0-27A27 27 0 0 0 0 27 13.5 13.5 0 0 1 0 0 13.5 13.5 0 0 0 0-27Z"/><circle cy="-13.5" r="4" class="detail"/><circle cy="13.5" r="4" class="detail"/>',
      lotus: '<path class="glyph-back" d="M0 26C-9 14-13-4 0-29 13-4 9 14 0 26M-1 24C-23 19-31 3-25-14-10-9-2 6-1 24M1 24C23 19 31 3 25-14 10-9 2 6 1 24M-25 18c15 10 35 10 50 0"/><path d="M0 21V-18M-17 14C-10 12-5 7 0-1M17 14C10 12 5 7 0-1"/>',
    }[type];
  },
  tile(tile, selected = false) {
    const side = Game.state?.players[tile.owner]?.side === 'host' ? 'one' : 'two';
    return `<g class="svg-tile type-${tile.type} side-${side} ${selected ? 'selected' : ''} ${tile.lotusState === 'marked' ? 'marked' : ''}" data-piece="${tile.id}" tabindex="0" role="button" aria-label="${Game.label(tile.type)}"><title>${Game.label(tile.type)}</title><circle class="piece-shadow" cy="5" r="31"/><circle class="player-frame" r="32"/><circle class="piece-rim" r="29"/><circle class="piece-ceramic" r="24"/><circle class="decorative-ring" r="21"/><circle class="piece-inlay" r="18"/><g class="glyph">${this.symbol(tile.type)}</g><ellipse class="shine" cx="-7" cy="-10" rx="11" ry="5"/></g>`;
  },
  targetKind(game, selected, position) {
    if (!selected) return 'move';
    if (selected.type === 'lotus') return game.board.some((p) => p.owner !== selected.owner && p.type === 'avatar' && p.position && this.adjacent(p.position, position)) ? 'danger' : 'safe';
    return game.board.some((p) => p.owner !== selected.owner && p.position && this.adjacent(p.position, position)) ? 'attack' : 'move';
  },
  adjacent(a, b) { const [ax, ay] = a.split(',').map(Number); const [bx, by] = b.split(',').map(Number); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; },
  defs() { return `<defs>
    <radialGradient id="wood" cx="35%" cy="28%"><stop stop-color="#e5bc82"/><stop offset=".55" stop-color="#b87444"/><stop offset="1" stop-color="#6d371f"/></radialGradient>
    <linearGradient id="bone" x2=".8" y2="1"><stop stop-color="#fff9e8"/><stop offset=".45" stop-color="#d7c49e"/><stop offset="1" stop-color="#8d704d"/></linearGradient>
    <linearGradient id="obsidian" x2=".8" y2="1"><stop stop-color="#718083"/><stop offset=".4" stop-color="#273033"/><stop offset="1" stop-color="#090c0e"/></linearGradient>
    <radialGradient id="ceramic" cx="35%" cy="25%"><stop stop-color="#fffdf0"/><stop offset=".6" stop-color="#d8cdb5"/><stop offset="1" stop-color="#877c69"/></radialGradient>
    <radialGradient id="enamel" cx="38%" cy="28%"><stop stop-color="#526157"/><stop offset=".65" stop-color="#26352d"/><stop offset="1" stop-color="#101a16"/></radialGradient>
    <filter id="pieceShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-opacity=".5"/></filter>
    <clipPath id="boardClip"><circle cx="500" cy="500" r="455"/></clipPath>
  </defs>`; },
  createStructure() {
    const board = document.querySelector('#pai-sho-board');
    if (board.querySelector('#board-background')) return board;
    const grid = this.cells.map((cell) => `<polygon points="${this.polygon(cell)}"/>`).join('');
    const debug = this.DEBUG_BOARD_CELLS ? this.cells.map((cell) => `<g class="cell-debug"><circle cx="${cell.centerX}" cy="${cell.centerY}" r="4"/><text x="${cell.centerX}" y="${cell.centerY - 8}">${cell.row}/${cell.column}\n${cell.id}</text></g>`).join('') : '';
    const hitAreas = this.cells.map((cell) => `<polygon class="cell-hit" data-point="${cell.id}" points="${this.polygon(cell)}"/>`).join('');
    board.innerHTML = `${this.defs()}<g id="board-background"><circle class="outer-shadow" cx="500" cy="500" r="480"/><circle class="outer-rim" cx="500" cy="500" r="468"/><circle class="inner-rim" cx="500" cy="500" r="458"/><circle class="wood" cx="500" cy="500" r="455"/></g><g id="board-zones" clip-path="url(#boardClip)"><rect class="light-zone" x="45" y="45" width="910" height="910"/><path class="red-zone" d="M45 45H955L500 500ZM45 955H955L500 500Z"/><circle class="portal" cx="500" cy="500" r="75"/><circle class="portal-core" cx="500" cy="500" r="23"/></g><g id="board-grid" class="cell-grid" clip-path="url(#boardClip)">${grid}${debug}</g><g id="move-highlights" clip-path="url(#boardClip)"></g><g id="pieces"></g><g id="effects"></g><g id="cell-hit-areas" clip-path="url(#boardClip)">${hitAreas}</g>`;
    board.querySelectorAll('.cell-hit').forEach((node) => { node.onclick = (event) => { event.stopPropagation(); const targets = Board.currentTargets || []; if (targets.includes(node.dataset.point)) Game.send(node.dataset.point); else Game.boardCell(node.dataset.point); }; });
    return board;
  },
  draw(game, targets = [], selected = null, animate = true) {
    const board = this.createStructure(); this.currentTargets = targets;
    const highlights = targets.map((id) => { const cell = this.cell(id); return `<polygon class="move-target ${this.targetKind(game, selected, id)}" data-point="${id}" points="${this.polygon(cell)}"/>`; }).join('');
    board.querySelector('#move-highlights').innerHTML = highlights;
    board.querySelectorAll('.cell-hit').forEach((node) => node.classList.toggle('target', targets.includes(node.dataset.point)));
    const layer = board.querySelector('#pieces'); const visible = game.board.filter((tile) => tile.position); const authoritativeIds = new Set(visible.map((tile) => tile.id));
    layer.querySelectorAll('.piece').forEach((node) => { if (!authoritativeIds.has(node.dataset.pieceId)) node.remove(); });
    visible.forEach((tile) => {
      const cell = this.cell(tile.position); if (!cell) return;
      let node = [...layer.children].find((candidate) => candidate.dataset.pieceId === tile.id); const isNew = !node;
      if (isNew) { node = document.createElementNS('http://www.w3.org/2000/svg', 'g'); node.classList.add('piece'); node.dataset.pieceId = tile.id; node.innerHTML = this.tile(tile, selected?.id === tile.id); layer.append(node); }
      const inner = node.querySelector('.svg-tile'); inner.classList.toggle('selected', selected?.id === tile.id); inner.classList.toggle('marked', tile.lotusState === 'marked');
      node.style.transitionDuration = animate && !isNew ? '420ms' : '0ms'; node.setAttribute('transform', `translate(${cell.centerX} ${cell.centerY})`); node.style.transform = `translate(${cell.centerX}px, ${cell.centerY}px)`;
    });
    const renderedPieceIds = [...layer.querySelectorAll('.piece')].map((node) => node.dataset.pieceId);
    console.assert(renderedPieceIds.length === new Set(renderedPieceIds).size, 'Duplicate pieceId in board DOM', renderedPieceIds);
    board.querySelectorAll('[data-piece]').forEach((node) => { node.onclick = (event) => { event.stopPropagation(); Game.inspectPiece(node.dataset.piece); }; node.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') node.onclick(event); }; });
  },
};
Board.init();
