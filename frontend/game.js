'use strict';
const LABELS = { water: 'Вода', earth: 'Земля', fire: 'Вогонь', air: 'Повітря', avatar: 'Аватар', lotus: 'Лотос' };
const REASONS = { lotus_dead: 'Лотос суперника загинув', lotus_reached_center: 'Лотос дістався Spirit Portal', resignation: 'Суперник здався' };
const COMBAT = { earth: { wins: 'Вогонь', loses: 'Вода', neutral: 'Повітря' }, fire: { wins: 'Повітря', loses: 'Земля', neutral: 'Вода' }, air: { wins: 'Вода', loses: 'Вогонь', neutral: 'Земля' }, water: { wins: 'Землю', loses: 'Повітря', neutral: 'Вогонь' } };

window.Game = {
  me: null, state: null, selected: null, targets: [], pending: false, sound: true, audioReady: false,
  label(type) { return LABELS[type] || type; },
  async start() { PaiAuth.bind(); Lobby.bind(); this.me = await PaiAuth.restore(); if (this.me) await this.online(); else UI.show('login'); },
  async online() {
    UI.show('lobby'); const socket = await PaiSocket.connect();
    socket.on('connect', () => { UI.connection(true); socket.emit('lobby:join'); });
    socket.on('disconnect', () => UI.connection(false));
    socket.on('connect_error', (error) => UI.error(error.message));
    socket.on('lobby:state', (state) => Lobby.render(state));
    socket.on('game:started', (state) => this.render(state));
    socket.on('game:state', (state) => { this.pending = false; this.render(state); });
    socket.on('game:move_rejected', (error) => { this.pending = false; UI.error(error.reason); this.render(this.state); });
  },
  render(state) {
    const previous = this.state; this.state = state; UI.error(''); UI.show('game');
    if (this.selected) this.selected = state.board.find((tile) => tile.id === this.selected.id && tile.position) || null;
    this.targets = this.selected ? state.legalMoves[this.selected.id] || [] : [];
    const marked = state.board.find((tile) => tile.owner === this.me.id && tile.type === 'lotus' && tile.lotusState === 'marked');
    document.querySelector('#lotus-warning').hidden = !marked;
    const mine = state.activePlayer === this.me.id;
    const turn = document.querySelector('#turn'); turn.textContent = state.phase === 'finished' ? 'ПАРТІЮ ЗАВЕРШЕНО' : mine ? 'ВАШ ХІД' : 'ХІД СУПЕРНИКА'; turn.classList.toggle('mine', mine);
    document.querySelector('#selection-help').textContent = this.pending ? 'Очікуємо підтвердження сервера…' : this.selected ? `${LABELS[this.selected.type]} · оберіть підсвічену клітину` : 'Оберіть свою фішку на дошці';
    document.querySelector('#moves').innerHTML = state.moves.slice(-10).reverse().map((move) => `<li><b>${move.turn}.</b> ${UI.escape(move.notation)}</li>`).join('') || '<li>Ще немає ходів</li>';
    const captured = Object.entries(state.captured).flatMap(([owner, types]) => types.map((type) => `${owner === this.me.id ? 'Ви' : 'Суперник'}: ${LABELS[type]}`));
    document.querySelector('#captured').innerHTML = captured.map((text) => `<li>${UI.escape(text)}</li>`).join('') || '<li>Немає</li>';
    this.renderElements(); this.renderPlayers(); Board.draw(state, this.targets, this.selected, Boolean(previous) && state.version === previous.version + 1);
    if (previous?.version !== state.version) { document.querySelector('#board').classList.add('state-changed'); if (previous && state.lastMove?.player === this.me.id) this.playTone(state.captured[this.me.id].length > previous.captured[this.me.id].length); }
    if (state.result) { document.querySelector('#result-title').textContent = state.result.winnerId === this.me.id ? 'Ви перемогли' : 'Переміг суперник'; document.querySelector('#result-reason').textContent = REASONS[state.result.reason] || state.result.reason; document.querySelector('#result').hidden = false; }
  },
  renderElements() {
    const order = ['earth', 'fire', 'air', 'water'];
    document.querySelector('#element-wheel').innerHTML = order.map((type, index) => `<div class="wheel-item type-${type} ${this.selected?.type === type ? 'active' : ''}" style="--i:${index}" title="${LABELS[type]}"><svg viewBox="-40 -40 80 80"><g>${Board.symbol(type)}</g></svg></div>`).join('') + '<span class="wheel-arrows">↻</span>';
    const info = COMBAT[this.selected?.type];
    document.querySelector('#combat-info').innerHTML = info ? `<b>${LABELS[this.selected.type]}</b><span>Перемагає: ${info.wins}</span><span>Програє: ${info.loses}</span><span>Нейтральна до: ${info.neutral}</span>` : 'Оберіть стихію, щоб побачити її силу';
  },
  renderPlayers() {
    document.querySelector('#player-info').innerHTML = Object.values(this.state.players).map((player) => {
      const own = player.id === this.me.id; const lotus = this.state.board.find((t) => t.owner === player.id && t.type === 'lotus'); const avatar = this.state.board.find((t) => t.owner === player.id && t.type === 'avatar');
      const captures = this.state.captured[player.id]?.length || 0;
      return `<article class="player-card ${this.state.activePlayer === player.id ? 'active' : ''}"><div class="player-emblem">${own ? '☯' : '◇'}</div><div><b>${UI.escape(player.name)} ${own ? '<small>ВИ</small>' : ''}</b><span>${player.side === 'host' ? 'Світла сторона' : 'Графітова сторона'} · <i class="${player.online ? 'online' : 'offline'}">${player.online ? 'онлайн' : 'офлайн'}</i></span><span>Захоплено: ${captures} · Аватар: ${avatar?.waiting ? 'повертається' : avatar?.position ? 'на дошці' : 'поза грою'}</span><span>Лотос: ${lotus?.lotusState === 'marked' ? '⚠ позначений' : lotus?.lotusState === 'dead' ? 'знищений' : 'безпечний'}</span></div></article>`;
    }).join('');
  },
  inspectPiece(id) {
    if (this.pending) return; const tile = this.state.board.find((piece) => piece.id === id); if (!tile) return;
    if (tile.owner !== this.me.id) { const relation = COMBAT[tile.type]; UI.error(relation ? `${LABELS[tile.type]}. Її перемагає: ${relation.loses}.` : `${LABELS[tile.type]} суперника`); return; }
    if (this.state.phase !== 'playing' || this.state.activePlayer !== this.me.id) return;
    if (this.selected?.id === tile.id) { this.selected = null; this.targets = []; } else { this.selected = tile; this.targets = this.state.legalMoves[tile.id] || []; }
    this.render(this.state);
  },
  boardCell() { if (this.selected && !this.pending) { UI.error('Ця клітина недоступна для вибраної фішки'); this.selected = null; this.targets = []; this.render(this.state); } },
  send(to) {
    if (this.pending || !this.selected || !(this.state.legalMoves[this.selected.id] || []).includes(to)) return;
    this.pending = true; document.querySelector('#selection-help').textContent = 'Очікуємо підтвердження сервера…';
    PaiSocket.emit('game:move', { commandId: crypto.randomUUID(), kind: 'move', tileId: this.selected.id, to });
    this.selected = null; this.targets = [];
  },
  playTone(capture=false) {
    if (!this.sound || !this.audioReady) return;
    const context = this.audioContext ||= new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(capture ? 260 : 440, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(capture ? 110 : 330, context.currentTime + .16); gain.gain.setValueAtTime(.035, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .2); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .21);
  },
  async logout() {
    const dialog = document.querySelector('#logout-confirm');
    document.querySelector('#logout-message').textContent = this.state?.phase === 'playing' ? 'Вийти з акаунта? Партія залишиться активною, і ви зможете повернутися після повторного входу.' : 'Вийти з акаунта і повернутися на екран входу?';
    dialog.showModal(); const confirmed = await new Promise(resolve => { dialog.querySelector('[value="cancel"]').onclick=()=>{dialog.close();resolve(false)};dialog.querySelector('[value="confirm"]').onclick=()=>{dialog.close();resolve(true)}; });
    if (!confirmed) return;
    try { await PaiApi.logout(); } catch { /* Local logout must still succeed offline. */ }
    PaiSocket.disconnect(); this.me=null;this.state=null;this.selected=null;this.targets=[];this.pending=false;Lobby.state=null;document.querySelector('#result').hidden=true;await transitionToScreen('login');document.querySelector('#login-form').reset();
  }
};
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#resign').onclick = () => confirm('Справді здатися?') && PaiSocket.emit('game:resign', { commandId: crypto.randomUUID() });
  document.querySelector('#rematch').onclick = () => PaiSocket.emit('game:rematch', { gameId: Game.state.id });
  document.querySelector('#rules-open').onclick = () => document.querySelector('#rules').showModal();
  document.querySelectorAll('.logout').forEach(button => button.onclick = () => Game.logout());
  document.querySelector('#sound-toggle').onclick = (event) => { Game.audioReady=true;Game.sound=!Game.sound;event.currentTarget.textContent=Game.sound?'♪':'♩';event.currentTarget.setAttribute('aria-label',Game.sound?'Вимкнути звук':'Увімкнути звук'); };
  document.addEventListener('pointerdown',()=>{Game.audioReady=true},{once:true});
  document.querySelector('.board-wrap').addEventListener('click', (event) => { if (event.target.closest('[data-piece],.move-target')) return; if (Game.selected) { Game.selected = null; Game.targets = []; Game.render(Game.state); } });
  Game.start();
});
