'use strict';

window.Board = {
  cells: [], DEBUG_BOARD: false,
  BOARD_CENTER: { x: 500, y: 500 },
  PLAYABLE_RADIUS: 455, GRID_STEP: 64, GRID_EXTENSION: 700, RADIUS: 9,
  init() {
    if (this.cells.length) return;
    for (let row = -this.RADIUS; row <= this.RADIUS; row += 1) for (let column = -this.RADIUS; column <= this.RADIUS; column += 1) {
      const centerX = this.BOARD_CENTER.x + (column - row) * this.GRID_STEP / 2;
      const centerY = this.BOARD_CENTER.y + (column + row) * this.GRID_STEP / 2;
      const halfWidth = this.GRID_STEP / 2; const halfHeight = this.GRID_STEP / 2;
      const polygonPoints = [[centerX, centerY - halfHeight], [centerX + halfWidth, centerY], [centerX, centerY + halfHeight], [centerX - halfWidth, centerY]];
      if (polygonPoints.some(([x, y]) => Math.hypot(x - this.BOARD_CENTER.x, y - this.BOARD_CENTER.y) > this.PLAYABLE_RADIUS)) continue;
      this.cells.push({ id: `${column},${row}`, row, column, centerX, centerY, polygonPoints, portal: Math.abs(column) <= 1 && Math.abs(row) <= 1 });
    }
  },
  cell(id) { return this.cells.find((cell) => cell.id === id); },
  point(cell, rotated = this.rotated) { return rotated ? { x: 1000 - cell.centerX, y: 1000 - cell.centerY } : { x: cell.centerX, y: cell.centerY }; },
  polygon(cell, rotated = this.rotated) { return cell.polygonPoints.map(([x, y]) => rotated ? `${1000 - x},${1000 - y}` : `${x},${y}`).join(' '); },
  perspective(game) { return game?.players?.[Game.me?.id]?.side === 'host'; },
  gridLines() {
    const start = -this.GRID_EXTENSION;
    const end = 1000 + this.GRID_EXTENSION;
    const positive = [];
    const negative = [];
    // Half-step offsets put the full central diamond around (500, 500), rather
    // than placing a four-cell intersection at the centre of the portal.
    for (let offset = this.GRID_STEP / 2; offset <= 2000; offset += this.GRID_STEP) {
      positive.push(`<line class="board-grid-line" x1="${start}" y1="${start + offset}" x2="${end}" y2="${end + offset}"/>`);
    }
    for (let offset = -this.GRID_STEP / 2; offset >= -2000; offset -= this.GRID_STEP) {
      positive.push(`<line class="board-grid-line" x1="${start}" y1="${start + offset}" x2="${end}" y2="${end + offset}"/>`);
    }
    for (let offset = 1000 + this.GRID_STEP / 2; offset <= 3000; offset += this.GRID_STEP) {
      negative.push(`<line class="board-grid-line" x1="${start}" y1="${-start + offset}" x2="${end}" y2="${-end + offset}"/>`);
    }
    for (let offset = 1000 - this.GRID_STEP / 2; offset >= -1000; offset -= this.GRID_STEP) {
      negative.push(`<line class="board-grid-line" x1="${start}" y1="${-start + offset}" x2="${end}" y2="${-end + offset}"/>`);
    }
    return `<g id="diagonal-lines-positive">${positive.join('')}</g><g id="diagonal-lines-negative">${negative.join('')}</g>`;
  },
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
  tile(tile, selected = false, interactive = true) {
    const side = Game.state?.players[tile.owner]?.side === 'host' ? 'one' : 'two';
    const interaction = interactive ? ` data-piece="${tile.id}" tabindex="0" role="button" aria-label="${Game.label(tile.type)}"` : ' aria-hidden="true"';
    return `<g class="svg-tile type-${tile.type} side-${side} ${selected ? 'selected' : ''} ${tile.lotusState === 'marked' ? 'marked' : ''}"${interaction}><title>${Game.label(tile.type)}</title><circle class="selection-ring" r="24"/><circle class="piece-shadow" cy="3" r="20"/><circle class="player-frame" r="20"/><circle class="piece-rim" r="18"/><circle class="piece-ceramic" r="15.5"/><circle class="decorative-ring" r="13.5"/><circle class="piece-inlay" r="11.5"/><g class="glyph">${this.symbol(tile.type)}</g><ellipse class="shine" cx="-5" cy="-7" rx="7" ry="3"/>${this.DEBUG_BOARD ? '<circle class="piece-bound" r="20"/>' : ''}</g>`;
  },
  destructionKey(game, event) { return `${game.id}:${game.lastMove?.moveId || game.version}:${event.pieceId}`; },
  animateDestructions(game, previous) {
    const events = game.lastMove?.destructionEvents || [];
    if (!previous || game.version !== previous.version + 1 || !events.length) return Promise.resolve();
    this.playedDestructions ||= new Set();
    const layer = this.createStructure().querySelector('#effects');
    const movingId = game.lastMove.tileId; const route = game.lastMove.route || [];
    const moveDuration = route.length > 2 ? 300 * (route.length - 1) : movingId ? 400 : 0;
    const active = events.filter((event) => {
      const key = this.destructionKey(game, event);
      if (this.playedDestructions.has(key) || !event.position || !this.cell(event.position)) return false;
      this.playedDestructions.add(key); return true;
    });
    if (!active.length) return Promise.resolve();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 180 : 720;
    for (const event of active) {
      const point = this.point(this.cell(event.position));
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      node.classList.add('destruction-effect', `type-${event.type}`); node.dataset.effectKey = this.destructionKey(game, event);
      node.style.setProperty('--death-delay', `${moveDuration}ms`); node.style.transform = `translate(${point.x}px, ${point.y}px)`;
      node.innerHTML = `<g class="death-piece">${this.tile(event, false, false)}<circle class="death-flash" r="21"/><g class="death-cracks"><path d="M-4-16-1-6-8 1-3 6-7 15M12-11 4-5 7 2 1 9 4 16M-15-7-7-3-12 5"/></g></g><g class="death-shards"><path style="--sx:-9px;--sy:-8px;--sr:-24deg" d="M-16-13-3-17-7-4-17-2Z"/><path style="--sx:10px;--sy:-8px;--sr:28deg" d="M-2-17 14-12 15-2 5-5Z"/><path style="--sx:-11px;--sy:9px;--sr:22deg" d="M-17 0-6 3-1 16-13 12Z"/><path style="--sx:11px;--sy:10px;--sr:-25deg" d="M6-3 17 0 13 13 1 17Z"/></g><circle class="element-trace" r="18"/>`;
      layer.append(node);
      if (event.pieceId === movingId && route.length > 1 && node.animate) {
        node.animate(route.map((id, index) => { const p = this.point(this.cell(id)); return { transform: `translate(${p.x}px, ${p.y}px)`, offset: index / (route.length - 1) }; }), { duration: moveDuration, easing: 'ease-in-out', fill: 'forwards' });
      }
      setTimeout(() => node.remove(), moveDuration + duration + 60);
    }
    return new Promise((resolve) => setTimeout(resolve, moveDuration + duration));
  },
  targetKind(game, selected, position) {
    if (!selected) return 'move';
    if (selected.type === 'lotus') return game.board.some((p) => p.owner !== selected.owner && p.position && this.adjacent(p.position, position)) ? 'danger' : 'safe';
    return game.board.some((p) => p.owner !== selected.owner && p.position && this.adjacent(p.position, position)) ? 'attack' : 'move';
  },
  adjacent(a, b) {
    const [ax, ay] = a.split(',').map(Number); const [bx, by] = b.split(',').map(Number);
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by)) === 1;
  },
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
    const grid = this.gridLines();
    const debug = this.DEBUG_BOARD ? this.cells.map((cell) => `<g class="cell-debug"><circle cx="${cell.centerX}" cy="${cell.centerY}" r="2.5"/><text x="${cell.centerX}" y="${cell.centerY - 8}">${cell.id}</text></g>`).join('') : '';
    const hitAreas = this.cells.map((cell) => `<polygon class="cell-hit-area" data-point="${cell.id}" points="${this.polygon(cell)}"/>`).join('');
    board.innerHTML = `${this.defs()}<g id="board-background"><circle class="outer-shadow" cx="500" cy="500" r="480"/><circle class="outer-rim" cx="500" cy="500" r="468"/><circle class="inner-rim" cx="500" cy="500" r="458"/><circle class="wood" cx="500" cy="500" r="455"/></g><g id="board-zones" clip-path="url(#boardClip)"><rect class="light-zone" x="45" y="45" width="910" height="910"/><path class="wood-start" d="M120 70H880L805 205H195ZM120 930H880L805 795H195Z"/><path class="red-zone" d="M185 205H815L635 405H365ZM365 595H635L815 795H185Z"/><path class="red-hourglass" d="M365 405H635L550 500 635 595H365L450 500Z"/><circle class="portal" cx="500" cy="500" r="68"/><circle class="portal-core" cx="500" cy="500" r="23"/></g><g id="board-grid" clip-path="url(#boardClip)">${grid}</g><g id="cell-centres-debug" clip-path="url(#boardClip)">${debug}</g><g id="cell-hit-areas" clip-path="url(#boardClip)">${hitAreas}</g><g id="move-highlights" clip-path="url(#boardClip)"></g><g id="pieces"></g><g id="effects"></g>`;
    board.querySelectorAll('.cell-hit-area').forEach((node) => { node.onclick = (event) => { event.stopPropagation(); const targets = Board.currentTargets || []; if (targets.includes(node.dataset.point)) Game.send(node.dataset.point); else Game.boardCell(node.dataset.point); }; });
    return board;
  },
  draw(game, targets = [], selected = null, animate = true) {
    const board = this.createStructure(); this.currentTargets = targets; this.rotated = this.perspective(game);
    board.querySelectorAll('.cell-hit-area').forEach((node) => node.setAttribute('points', this.polygon(this.cell(node.dataset.point))));
    const highlights = targets.map((id) => { const cell = this.cell(id); return `<polygon class="move-target ${this.targetKind(game, selected, id)}" data-point="${id}" points="${this.polygon(cell)}"/>`; }).join('');
    board.querySelector('#move-highlights').innerHTML = highlights;
    board.querySelectorAll('.cell-hit-area').forEach((node) => node.classList.toggle('target', targets.includes(node.dataset.point)));
    const layer = board.querySelector('#pieces'); const visible = game.board.filter((tile) => tile.position); const authoritativeIds = new Set(visible.map((tile) => tile.id));
    if (game.version === 0 && visible.length === 28) this.assertInitialState(game);
    layer.querySelectorAll('.piece').forEach((node) => { if (!authoritativeIds.has(node.dataset.pieceId)) node.remove(); });
    visible.forEach((tile) => {
      const cell = this.cell(tile.position); if (!cell) return;
      let node = [...layer.children].find((candidate) => candidate.dataset.pieceId === tile.id); const isNew = !node;
      if (isNew) { node = document.createElementNS('http://www.w3.org/2000/svg', 'g'); node.classList.add('piece'); node.dataset.pieceId = tile.id; node.innerHTML = this.tile(tile, selected?.id === tile.id); layer.append(node); }
      const inner = node.querySelector('.svg-tile'); inner.classList.toggle('selected', selected?.id === tile.id); inner.classList.toggle('marked', tile.lotusState === 'marked');
      const point = this.point(cell); const previousPoint = node.dataset.x ? { x: Number(node.dataset.x), y: Number(node.dataset.y) } : null;
      node.style.transitionDuration = animate && !isNew ? '400ms' : '0ms';
      const route = animate && game.lastMove?.tileId === tile.id && game.version !== Number(node.dataset.animatedVersion) ? game.lastMove.route : null;
      if (route?.length > 2 && node.animate) {
        node.style.transitionDuration = '0ms';
        node.animate(route.map((id, index) => { const p = this.point(this.cell(id)); return { transform: `translate(${p.x}px, ${p.y}px)`, offset: index / (route.length - 1) }; }), { duration: 300 * (route.length - 1), easing: 'ease-in-out' });
        node.dataset.animatedVersion = game.version;
      } else if (previousPoint && previousPoint.x === point.x && previousPoint.y === point.y) node.style.transitionDuration = '0ms';
      node.style.transform = `translate(${point.x}px, ${point.y}px)`; node.dataset.x = point.x; node.dataset.y = point.y;
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
      console.assert(distance >= 45, 'Initial pieces must remain in distinct neighbouring cells', pieces[i].tile.id, pieces[j].tile.id);
    }
    const bySide = (side) => pieces.filter(({ tile }) => game.players[tile.owner]?.side === side).map(({ cell }) => cell.centerY);
    console.assert(Math.max(...bySide('host')) <= 350 && Math.min(...bySide('guest')) >= 650, 'Formations must leave the center clear');
  },
};
Board.init();
