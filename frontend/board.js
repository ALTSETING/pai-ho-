'use strict';

window.Board = {
  cells: [], DEBUG_BOARD: false,
  BOARD_CENTER: { x: 500, y: 500 },
  PLAYABLE_BOUNDS: { minX: 100, maxX: 900, minY: 70, maxY: 930 },
  CELL_WIDTH: 68, CELL_HEIGHT: 50, ROW_STEP_Y: 50, COLUMN_STEP_X: 68,
  init() {
    for (let row = -8; row <= 8; row += 1) for (let column = -6; column <= 6; column += 1) {
      const centerX = 500 + column * this.COLUMN_STEP_X + (Math.abs(row) % 2 ? this.CELL_WIDTH / 2 : 0);
      const centerY = 500 + row * this.ROW_STEP_Y + (row < 0 ? -15 : row > 0 ? 15 : 0);
      const halfWidth = this.CELL_WIDTH / 2; const halfHeight = this.CELL_HEIGHT / 2;
      if (centerX - halfWidth < this.PLAYABLE_BOUNDS.minX || centerX + halfWidth > this.PLAYABLE_BOUNDS.maxX) continue;
      this.cells.push({ id: `${column},${row}`, row, column, centerX, centerY, polygonPoints: [[centerX, centerY - halfHeight], [centerX + halfWidth, centerY], [centerX, centerY + halfHeight], [centerX - halfWidth, centerY]], portal: Math.abs(column) <= 1 && Math.abs(row) <= 1 });
    }
  },
  cell(id) { return this.cells.find((cell) => cell.id === id); },
  point(cell) { return { x: cell.centerX, y: cell.centerY }; },
  polygon(cell) { return cell.polygonPoints.map((point) => point.join(',')).join(' '); },
  pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j];
      if ((yi > point.y) !== (yj > point.y) && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  },
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
    return `<g class="svg-tile type-${tile.type} side-${side} ${selected ? 'selected' : ''} ${tile.lotusState === 'marked' ? 'marked' : ''}" data-piece="${tile.id}" tabindex="0" role="button" aria-label="${Game.label(tile.type)}"><title>${Game.label(tile.type)}</title><circle class="selection-ring" r="24"/><circle class="piece-shadow" cy="3" r="20"/><circle class="player-frame" r="20"/><circle class="piece-rim" r="18"/><circle class="piece-ceramic" r="15.5"/><circle class="decorative-ring" r="13.5"/><circle class="piece-inlay" r="11.5"/><g class="glyph">${this.symbol(tile.type)}</g><ellipse class="shine" cx="-5" cy="-7" rx="7" ry="3"/>${this.DEBUG_BOARD ? '<circle class="piece-bound" r="20"/>' : ''}</g>`;
  },
  targetKind(game, selected, position) {
    if (!selected) return 'move';
    if (selected.type === 'lotus') return game.board.some((p) => p.owner !== selected.owner && p.type === 'avatar' && p.position && this.adjacent(p.position, position)) ? 'danger' : 'safe';
    return game.board.some((p) => p.owner !== selected.owner && p.position && this.adjacent(p.position, position)) ? 'attack' : 'move';
  },
  adjacent(a, b) { const [ax, ay] = a.split(',').map(Number); const [bx, by] = b.split(',').map(Number); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; },
  defs() { return `<defs>
    <radialGradient id="wood" cx="35%" cy="28%"><stop stop-color="#e5bc82"/><stop offset=".55" stop-color="#b87444"/><stop offset="1" stop-color="#6d371f"/></radialGradient>
    <pattern id="woodGrain" width="82" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(-7)"><path d="M-15 9C8-5 34 22 96 4M-8 28C30 12 49 39 98 20" fill="none" stroke="#532819" stroke-width="3" opacity=".22"/><path d="M5 15c18-7 33-5 48 3" fill="none" stroke="#f2bd79" stroke-width="2" opacity=".16"/></pattern>
    <pattern id="ivoryGrain" width="70" height="48" patternUnits="userSpaceOnUse"><path d="M0 12C25 2 44 23 70 10M4 41C24 29 49 48 72 34" fill="none" stroke="#9b6b44" stroke-width="2" opacity=".12"/></pattern>
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
    const debug = this.DEBUG_BOARD ? this.cells.map((cell) => `<g class="cell-debug"><circle cx="${cell.centerX}" cy="${cell.centerY}" r="2.5"/><text x="${cell.centerX}" y="${cell.centerY - 8}">${cell.id}</text></g>`).join('') : '';
    const hitAreas = this.cells.map((cell) => `<polygon class="cell-hit" data-point="${cell.id}" points="${this.polygon(cell)}"/>`).join('');
    board.innerHTML = `${this.defs()}<g id="board-background"><circle class="outer-shadow" cx="500" cy="500" r="480"/><circle class="outer-rim" cx="500" cy="500" r="468"/><circle class="inner-rim" cx="500" cy="500" r="458"/><circle class="wood" cx="500" cy="500" r="455"/></g><g id="board-zones" clip-path="url(#boardClip)"><circle class="wood-field" cx="500" cy="500" r="455"/><circle class="wood-grain" cx="500" cy="500" r="455"/><path class="corner-red" d="M250 126 104 220H250ZM750 126 896 220H750ZM250 874 104 780H250ZM750 874 896 780H750Z"/><rect class="light-zone" x="250" y="220" width="500" height="560"/><rect class="ivory-grain" x="250" y="220" width="500" height="560"/><path class="red-hourglass" d="M250 220H750L500 500 750 780H250L500 500Z"/><path class="zone-border" d="M250 126V874M750 126V874M104 220H896M104 780H896"/><circle class="portal-emblem" cx="500" cy="500" r="27"/><path class="portal-petals" d="M500 475c9 9 11 17 0 25-11-8-9-16 0-25Zm25 25c-9 9-17 11-25 0 8-11 16-9 25 0Zm-25 25c-9-9-11-17 0-25 11 8 9 16 0 25Zm-25-25c9-9 17-11 25 0-8 11-16 9-25 0Z"/></g><g id="board-grid" class="cell-grid" clip-path="url(#boardClip)">${grid}${debug}</g><g id="move-highlights" clip-path="url(#boardClip)"></g><g id="pieces"></g><g id="effects"></g><g id="cell-hit-areas" clip-path="url(#boardClip)">${hitAreas}</g>`;
    board.querySelectorAll('.cell-hit').forEach((node) => { node.onclick = (event) => { event.stopPropagation(); const targets = Board.currentTargets || []; if (targets.includes(node.dataset.point)) Game.send(node.dataset.point); else Game.boardCell(node.dataset.point); }; });
    return board;
  },
  draw(game, targets = [], selected = null, animate = true) {
    const board = this.createStructure(); this.currentTargets = targets;
    const highlights = targets.map((id) => { const cell = this.cell(id); return `<polygon class="move-target ${this.targetKind(game, selected, id)}" data-point="${id}" points="${this.polygon(cell)}"/>`; }).join('');
    board.querySelector('#move-highlights').innerHTML = highlights;
    board.querySelectorAll('.cell-hit').forEach((node) => node.classList.toggle('target', targets.includes(node.dataset.point)));
    const layer = board.querySelector('#pieces'); const visible = game.board.filter((tile) => tile.position); const authoritativeIds = new Set(visible.map((tile) => tile.id));
    if (game.version === 0 && visible.length === 28) this.assertInitialState(game);
    layer.querySelectorAll('.piece').forEach((node) => { if (!authoritativeIds.has(node.dataset.pieceId)) node.remove(); });
    visible.forEach((tile) => {
      const cell = this.cell(tile.position); if (!cell) return;
      let node = [...layer.children].find((candidate) => candidate.dataset.pieceId === tile.id); const isNew = !node;
      if (isNew) { node = document.createElementNS('http://www.w3.org/2000/svg', 'g'); node.classList.add('piece'); node.dataset.pieceId = tile.id; node.innerHTML = this.tile(tile, selected?.id === tile.id); layer.append(node); }
      const inner = node.querySelector('.svg-tile'); inner.classList.toggle('selected', selected?.id === tile.id); inner.classList.toggle('marked', tile.lotusState === 'marked');
      node.style.transitionDuration = animate && !isNew ? '440ms' : '0ms'; node.setAttribute('transform', `translate(${cell.centerX} ${cell.centerY})`); node.style.transform = `translate(${cell.centerX}px, ${cell.centerY}px)`;
    });
    const renderedPieceIds = [...layer.querySelectorAll('.piece')].map((node) => node.dataset.pieceId);
    console.assert(renderedPieceIds.length === new Set(renderedPieceIds).size, 'Duplicate pieceId in board DOM', renderedPieceIds);
    board.querySelectorAll('[data-piece]').forEach((node) => { node.onclick = (event) => { event.stopPropagation(); Game.inspectPiece(node.dataset.piece); }; node.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') node.onclick(event); }; });
  },
  assertInitialState(game) {
    const pieces = game.board.map((tile) => ({ tile, cell: this.cell(tile.cellId || tile.position) }));
    console.assert(new Set(game.board.map(({ id }) => id)).size === 28, 'Initial piece IDs must be unique');
    console.assert(new Set(pieces.map(({ cell }) => cell?.id)).size === 28, 'Initial cells must be unique');
    pieces.forEach(({ tile, cell }) => {
      console.assert(cell && tile.position === cell.id, 'Piece must resolve through its cellId', tile.id);
      console.assert(cell && this.pointInPolygon({ x: cell.centerX, y: cell.centerY }, cell.polygonPoints), 'Piece center must be inside its cell', tile.id);
      console.assert(cell && cell.centerX >= 120 && cell.centerX <= 880 && cell.centerY >= 85 && cell.centerY <= 915, 'Piece must remain on board', tile.id);
    });
    for (let i = 0; i < pieces.length; i += 1) for (let j = i + 1; j < pieces.length; j += 1) {
      const a = pieces[i].cell; const b = pieces[j].cell; const distance = Math.hypot(a.centerX - b.centerX, a.centerY - b.centerY);
      console.assert(distance >= 47, 'Initial pieces must have a 7-unit edge gap', pieces[i].tile.id, pieces[j].tile.id);
    }
    const bySide = (side) => pieces.filter(({ tile }) => game.players[tile.owner]?.side === side).map(({ cell }) => cell.centerY);
    console.assert(Math.max(...bySide('host')) <= 350 && Math.min(...bySide('guest')) >= 650, 'Formations must leave the center clear');
  },
};
Board.init();
