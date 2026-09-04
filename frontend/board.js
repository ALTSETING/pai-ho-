'use strict';

const DEBUG_BOARD_CELLS = false;
const SVG_NS = 'http://www.w3.org/2000/svg';

window.Board = {
  cells: [], cellById: new Map(), scale: 39, mounted: false,
  init() {
    for (let row = -7; row <= 7; row += 1) {
      for (let column = -7; column <= 7; column += 1) {
        if (column * column + row * row > 50) continue;
        const centerX = 500 + (column - row) * this.scale;
        const centerY = 500 + (column + row) * this.scale / 2;
        const polygonPoints = [
          [centerX, centerY - this.scale / 2],
          [centerX + this.scale, centerY],
          [centerX, centerY + this.scale / 2],
          [centerX - this.scale, centerY],
        ];
        const cell = { id: `${column},${row}`, row, column, centerX, centerY, polygonPoints };
        this.cells.push(cell);
        this.cellById.set(cell.id, cell);
      }
    }
  },
  polygon(cell) { return cell.polygonPoints.map((point) => point.join(',')).join(' '); },
  symbol(type) {
    return {
      fire: '<path class="glyph-fill" d="M0 27C-22 16-22-7-5-29c-1 16 11 16 10 3 20 17 23 39 10 52-2-11-7-19-13-24 2 12-7 17-2 25Z"/><path d="M1 21c-9-8-8-18 1-29 0 9 9 11 7 20"/>',
      air: '<path d="M-26-9c9-21 42-21 48-6 5 14-13 20-23 12M-28 7c11 15 34 17 49 6M-17 21c9 7 22 5 28-2"/><circle cx="17" cy="-12" r="3"/>',
      water: '<path class="glyph-fill" d="M-29 7c12-1 15-15 27-15S10 6 27 3c-5 17-19 28-37 21-7-3-13-9-19-17Z"/><path d="M-27 7c12 0 14-12 26-12S10 7 27 3M-21 16c9 3 16-4 23-8 7 6 14 9 21 7"/>',
      earth: '<path class="glyph-fill" d="M-26 23V-22h52v45Z"/><path d="M-18 14h36v-27H7v8H-7v-8h-11ZM0-5v19M-10 3v11M10 3v11"/>',
      avatar: '<circle class="glyph-fill" r="26"/><path d="M0-26A26 26 0 0 0 0 26 13 13 0 0 1 0 0 13 13 0 0 0 0-26Z"/><circle cy="-13" r="3.5" class="detail"/><circle cy="13" r="3.5" class="detail"/>',
      lotus: '<path class="glyph-fill" d="M0 25C-9 13-12-4 0-28 12-4 9 13 0 25M-1 23C-22 18-29 3-24-13-10-8-2 6-1 23M1 23C22 18 29 3 24-13 10-8 2 6 1 23M-24 17c14 10 34 10 48 0"/><path d="M0 20V-17M-16 13C-9 11-5 7 0-1M16 13C9 11 5 7 0-1"/>',
    }[type];
  },
  mount() {
    if (this.mounted) return;
    const board = document.querySelector('#pai-sho-board');
    const grid = this.cells.map((cell) => `<polygon points="${this.polygon(cell)}"/>`).join('');
    const debug = DEBUG_BOARD_CELLS ? this.cells.map((cell) => `<g class="debug-cell"><circle cx="${cell.centerX}" cy="${cell.centerY}" r="2"/><text x="${cell.centerX}" y="${cell.centerY - 4}">${cell.id}</text></g>`).join('') : '';
    const hits = this.cells.map((cell) => `<polygon class="cell-hit" data-cell-id="${cell.id}" points="${this.polygon(cell)}"/>`).join('');
    board.innerHTML = `<defs>
      <radialGradient id="boardWood" cx="36%" cy="28%"><stop stop-color="#e1b475"/><stop offset=".62" stop-color="#b16d3e"/><stop offset="1" stop-color="#754126"/></radialGradient>
      <linearGradient id="boneRim" x2="0.8" y2="1"><stop stop-color="#fff8e2"/><stop offset=".55" stop-color="#cfba93"/><stop offset="1" stop-color="#806546"/></linearGradient>
      <linearGradient id="obsidianRim" x2="0.8" y2="1"><stop stop-color="#687276"/><stop offset=".5" stop-color="#252c2f"/><stop offset="1" stop-color="#080b0c"/></linearGradient>
      <radialGradient id="pieceFace" cx="35%" cy="25%"><stop stop-color="#fffdf0"/><stop offset=".7" stop-color="#d8cdb6"/><stop offset="1" stop-color="#978a73"/></radialGradient>
      <radialGradient id="pieceEnamel" cx="35%" cy="25%"><stop stop-color="#4c5d52"/><stop offset="1" stop-color="#14221b"/></radialGradient>
      <clipPath id="boardClip"><circle cx="500" cy="500" r="455"></circle></clipPath>
    </defs>
    <g id="board-background"><circle class="board-shadow" cx="500" cy="500" r="480"/><circle class="board-rim" cx="500" cy="500" r="470"/><circle class="board-surface" cx="500" cy="500" r="455"/></g>
    <g id="board-zones" clip-path="url(#boardClip)"><path class="zone-light" d="M180 180H820V820H180Z"/><path class="zone-red" d="M180 180H820L500 500ZM180 820H820L500 500Z"/><circle class="portal" cx="500" cy="500" r="72"/><circle class="portal-core" cx="500" cy="500" r="21"/></g>
    <g id="board-grid" clip-path="url(#boardClip)">${grid}${debug}</g>
    <g id="move-highlights" clip-path="url(#boardClip)"></g>
    <g id="pieces"></g>
    <g id="effects"></g>
    <g id="cell-hit-areas" clip-path="url(#boardClip)">${hits}</g>`;
    board.querySelectorAll('.cell-hit').forEach((node) => { node.addEventListener('click', (event) => { event.stopPropagation(); const id = node.dataset.cellId; if (Game.targets.includes(id)) Game.send(id); else Game.boardCell(id); }); });
    this.mounted = true;
  },
  pieceMarkup(tile) {
    const side = Game.state?.players[tile.owner]?.side === 'host' ? 'light' : 'dark';
    return `<title>${Game.label(tile.type)}</title><circle class="piece-shadow" cy="2.5" r="16"/><circle class="player-frame ${side}" r="16"/><circle class="piece-rim" r="13.7"/><circle class="piece-face" r="11.4"/><circle class="decorative-ring" r="9.7"/><circle class="piece-inlay" r="8.6"/><g class="glyph">${this.symbol(tile.type)}</g><ellipse class="piece-shine" cx="-4" cy="-5" rx="5" ry="2"/>`;
  },
  createPiece(tile) {
    const node = document.createElementNS(SVG_NS, 'g');
    node.classList.add('piece', `type-${tile.type}`);
    node.dataset.pieceId = tile.id;
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', Game.label(tile.type));
    node.innerHTML = this.pieceMarkup(tile);
    node.addEventListener('click', (event) => { event.stopPropagation(); Game.inspectPiece(node.dataset.pieceId); });
    node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); node.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
    return node;
  },
  targetKind(game, selected, position) {
    if (!selected) return 'move';
    const enemy = game.board.some((piece) => piece.owner !== selected.owner && piece.position && this.adjacent(piece.position, position));
    if (selected.type === 'lotus') return enemy ? 'danger' : 'safe';
    return enemy ? 'attack' : 'move';
  },
  adjacent(a, b) { const [ax, ay] = a.split(',').map(Number); const [bx, by] = b.split(',').map(Number); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; },
  draw(game, targets = [], selected = null, animate = true) {
    this.mount();
    const board = document.querySelector('#pai-sho-board');
    const pieceLayer = board.querySelector('#pieces');
    const livePieces = game.board.filter((tile) => tile.position);
    const liveIds = new Set(livePieces.map((tile) => tile.id));
    pieceLayer.querySelectorAll('.piece').forEach((node) => { if (!liveIds.has(node.dataset.pieceId)) node.remove(); });

    for (const tile of livePieces) {
      const cell = this.cellById.get(tile.position);
      if (!cell) continue;
      let node = pieceLayer.querySelector(`[data-piece-id="${CSS.escape(tile.id)}"]`);
      const isNew = !node;
      if (isNew) { node = this.createPiece(tile); pieceLayer.append(node); }
      node.classList.toggle('selected', selected?.id === tile.id);
      node.classList.toggle('marked', tile.lotusState === 'marked');
      node.classList.toggle('no-motion', isNew || !animate);
      node.setAttribute('transform', `translate(${cell.centerX} ${cell.centerY})`);
      if (node.classList.contains('no-motion')) requestAnimationFrame(() => node.classList.remove('no-motion'));
    }

    const highlightLayer = board.querySelector('#move-highlights');
    highlightLayer.replaceChildren(...targets.map((id) => {
      const cell = this.cellById.get(id); const node = document.createElementNS(SVG_NS, 'polygon');
      node.setAttribute('points', this.polygon(cell)); node.classList.add('move-target', this.targetKind(game, selected, id)); return node;
    }));
    board.querySelectorAll('.cell-hit').forEach((node) => node.classList.toggle('target', targets.includes(node.dataset.cellId)));

    const renderedPieceIds = [...pieceLayer.querySelectorAll('.piece')].map((node) => node.dataset.pieceId);
    console.assert(renderedPieceIds.length === new Set(renderedPieceIds).size, 'Duplicate rendered pieceId detected', renderedPieceIds);
    console.assert(renderedPieceIds.length === livePieces.length, 'Rendered piece count differs from authoritative state');
  },
};
Board.init();
