'use strict';

// Rule illustrations deliberately reuse Board.symbol() and the authoritative
// cell geometry. This keeps the guide visually and spatially aligned with play.
window.Rules = {
  dialog: null,
  defs() {
    return `<defs><marker id="rule-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z"/></marker><marker id="rule-arrow-soft" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z"/></marker><radialGradient id="rule-wood"><stop stop-color="#dfb477"/><stop offset="1" stop-color="#83502e"/></radialGradient></defs>`;
  },
  diamond(x, y, state = '', size = 42, label = '') {
    return `<g class="rule-cell ${state}"><polygon points="${x},${y-size} ${x+size},${y} ${x},${y+size} ${x-size},${y}"/>${label ? `<text x="${x}" y="${y+5}">${label}</text>` : ''}</g>`;
  },
  piece(type, x, y, side = 'one', scale = 1, marked = false) {
    return `<g transform="translate(${x} ${y}) scale(${scale})" class="rule-piece type-${type} side-${side} ${marked ? 'marked' : ''}"><circle class="rule-piece-frame" r="24"/><circle class="rule-piece-core" r="20"/><circle class="rule-piece-inlay" r="16"/><g class="glyph">${Board.symbol(type)}</g>${marked ? '<circle class="rule-mark" r="29"/>' : ''}</g>`;
  },
  arrow(x1, y1, x2, y2, dashed = false, label = '') {
    return `<g class="rule-route ${dashed ? 'dashed' : ''}"><path d="M${x1} ${y1}L${x2} ${y2}" marker-end="url(#rule-arrow)"/>${label ? `<text x="${(x1+x2)/2}" y="${(y1+y2)/2-9}">${label}</text>` : ''}</g>`;
  },
  grid(cx, cy, radius = 1, gap = 62, states = {}) {
    let out = '';
    for (let row = -radius; row <= radius; row += 1) for (let col = -radius; col <= radius; col += 1) {
      const x = cx + (col-row)*gap/2; const y = cy + (col+row)*gap/2;
      out += this.diamond(x, y, states[`${col},${row}`] || '', gap/2);
    }
    return out;
  },
  setup() {
    Board.init();
    const liveStarts = Game.state?.board?.filter((tile) => tile.startPosition).map((tile) => ({ type: tile.type, owner: tile.owner, position: tile.startPosition }));
    const fallback = [
      ['lotus','-6,-6'],['air','-6,-5'],['earth','-5,-6'],['water','-6,-4'],['fire','-4,-6'],['earth','-6,-3'],['air','-3,-6'],['water','-7,-1'],['fire','-6,-2'],['avatar','-4,-4'],['water','-2,-6'],['fire','-1,-7'],['air','-5,-2'],['earth','-2,-5'],
    ].flatMap(([type, position]) => [{ type, owner: 'guide-one', position }, { type, owner: 'guide-two', position: position.split(',').map(Number).map((n) => -n).join(',') }]);
    const pieces = liveStarts?.length === 28 ? liveStarts : fallback;
    const firstOwner = pieces[0]?.owner;
    const svg = document.querySelector('#rules-setup');
    svg.innerHTML = `${this.defs()}<circle class="rule-board-rim" cx="500" cy="500" r="465"/><circle class="rule-board" cx="500" cy="500" r="455"/><g class="rule-portal"><rect x="404" y="404" width="192" height="192"/><circle cx="500" cy="500" r="28"/></g><g class="rule-mini-grid">${Board.gridLines()}</g>${pieces.map((tile) => { const cell = Board.cell(tile.position); return cell ? this.piece(tile.type, cell.centerX, cell.centerY, tile.owner === firstOwner ? 'one' : 'two', .72) : ''; }).join('')}`;
  },
  draw() {
    const put = (id, body) => { document.querySelector(id).innerHTML = this.defs() + body; };
    const neighbourStates = Object.fromEntries([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].map(([x,y]) => [`${x},${y}`, 'target']));
    put('#rules-step', this.grid(210,140,1,72,neighbourStates) + this.piece('water',210,140) + Object.entries(neighbourStates).map(([id]) => { const [c,r]=id.split(',').map(Number); return `<circle class="rule-target-dot" cx="${210+(c-r)*36}" cy="${140+(c+r)*36}" r="5"/>`; }).join(''));

    let jump = this.grid(210,125,2,48);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    jump += this.piece('water',210,125,'one',.72);
    for (const [c,r] of dirs) { const mx=210+(c-r)*24, my=125+(c+r)*24, lx=210+(c-r)*48, ly=125+(c+r)*48; jump += `<circle class="rule-jump-friend" cx="${mx}" cy="${my}" r="7"/><circle class="rule-landing" cx="${lx}" cy="${ly}" r="6"/>${this.arrow(mx+(lx-mx)*.25,my+(ly-my)*.25,lx,ly)}`; }
    put('#rules-jump', jump);

    put('#rules-chain', this.grid(180,125,2,56) + this.piece('water',124,69,'one',.78) + this.piece('earth',180,125,'one',.65) + this.piece('fire',236,181,'one',.65) + this.arrow(135,80,225,170,false,'1') + this.arrow(233,170,315,88,false,'2') + this.diamond(320,69,'target',28,'✓'));

    const combatPoints = { earth:[310,58], fire:[505,195], air:[310,332], water:[115,195] };
    let combat = '';
    for (const [type,[x,y]] of Object.entries(combatPoints)) combat += this.piece(type,x,y,'one',1.15) + `<text class="rule-label" x="${x}" y="${y+54}">${Game.label(type)}</text>`;
    for (const [a,b] of [['earth','fire'],['fire','air'],['air','water'],['water','earth']]) { const [x1,y1]=combatPoints[a], [x2,y2]=combatPoints[b]; combat += this.arrow(x1+(x2-x1)*.2,y1+(y2-y1)*.2,x1+(x2-x1)*.78,y1+(y2-y1)*.78,false,'перемагає'); }
    put('#rules-combat', combat + '<text class="rule-center-label" x="310" y="190">КОЛО</text><text class="rule-center-label" x="310" y="213">СТИХІЙ</text>');

    put('#rules-avatar-attacks', this.grid(210,115,1,70) + this.piece('avatar',105,115) + this.arrow(139,115,190,115) + this.piece('water',245,80,'two',.8) + this.piece('fire',245,150,'two',.8) + '<path class="rule-cross" d="M225 55l40 50m0-50-40 50M225 125l40 50m0-50-40 50"/>');
    put('#rules-avatar-defends', this.grid(210,115,1,70) + this.piece('earth',105,115) + this.arrow(139,115,190,115) + this.piece('avatar',245,115,'two') + this.diamond(350,115,'start',35,'СТАРТ') + this.arrow(275,115,315,115,true));

    const lotusStates = { '-1,-1':'danger','0,-1':'danger','1,-1':'danger','-1,0':'danger','1,0':'danger','-1,1':'danger','0,1':'safe','1,1':'danger' };
    let lotus = this.grid(250,155,1,82,lotusStates) + this.piece('lotus',250,155,'one',1,true) + this.piece('fire',168,73,'two',.8) + this.piece('air',332,73,'two',.8);
    for (const [id,state] of Object.entries(lotusStates)) { const [c,r]=id.split(',').map(Number), x=250+(c-r)*41, y=155+(c+r)*41; lotus += `<text class="rule-status ${state}" x="${x}" y="${y+7}">${state === 'safe' ? '✓' : '×'}</text>`; }
    lotus += this.arrow(250,185,209,236,false,'відхід'); put('#rules-lotus', lotus);

    let portal = this.grid(250,165,2,68);
    portal += '<path class="rule-sector" d="M250 63L352 165 250 267 148 165Z"/><text class="rule-coordinate" x="250" y="157">0,0</text>' + this.piece('lotus',250,165,'one',1.05) + '<text class="rule-bracket" x="250" y="315">SPIRIT PORTAL · 9 КЛІТИН</text>';
    put('#rules-portal', portal);
  },
  open() {
    this.setup();
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.querySelector('.rules-content').scrollTop = 0;
    this.dialog.querySelector('.rules-close').focus();
  },
  init() {
    this.dialog = document.querySelector('#rules');
    this.draw();
    this.dialog.querySelector('.rules-close').onclick = () => this.dialog.close();
    this.dialog.addEventListener('click', (event) => { if (event.target === this.dialog) this.dialog.close(); });
  },
};

document.addEventListener('DOMContentLoaded', () => Rules.init());
