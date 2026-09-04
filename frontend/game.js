'use strict';
const LABELS = { water: 'Вода', earth: 'Земля', fire: 'Вогонь', air: 'Повітря', avatar: 'Аватар', lotus: 'Лотос' };
const REASONS = { lotus_dead: 'Лотос суперника загинув', lotus_reached_center: 'Лотос дістався Spirit Portal', resignation: 'Суперник здався' };
window.Game = {
  me: null, state: null, selected: null, targets: [],
  async start() { PaiAuth.bind(); Lobby.bind(); this.me = await PaiAuth.restore(); if (this.me) await this.online(); else UI.show('login'); },
  async online() { UI.show('lobby'); const socket = await PaiSocket.connect(); socket.on('connect', () => { UI.connection(true); socket.emit('lobby:join'); }); socket.on('disconnect', () => UI.connection(false)); socket.on('connect_error', (error) => UI.error(error.message)); socket.on('lobby:state', (state) => Lobby.render(state)); socket.on('game:started', (state) => this.render(state)); socket.on('game:state', (state) => this.render(state)); socket.on('game:move_rejected', (error) => UI.error(error.reason)); socket.on('game:finished', () => {}); },
  render(state) {
    this.state = state; UI.error(''); UI.show('game');
    const marked = state.board.find((tile) => tile.owner === this.me.id && tile.type === 'lotus' && tile.lotusState === 'marked');
    document.querySelector('#lotus-warning').hidden = !marked;
    document.querySelector('#turn').textContent = state.phase === 'finished' ? 'Партію завершено' : state.activePlayer === this.me.id ? 'Ваш хід' : 'Хід суперника';
    const mine = state.board.filter((tile) => tile.owner === this.me.id && tile.position);
    document.querySelector('#pieces').innerHTML = mine.map((tile) => `<button class="tile-button ${this.selected?.id === tile.id ? 'selected' : ''} ${tile.lotusState === 'marked' ? 'marked' : ''}" data-id="${tile.id}" title="${LABELS[tile.type]}"><svg viewBox="-25 -25 50 50">${Board.tile(tile)}</svg><span>${LABELS[tile.type]}</span></button>`).join('');
    document.querySelectorAll('.tile-button').forEach((button) => { button.onclick = () => this.choose(mine.find((tile) => tile.id === button.dataset.id)); });
    document.querySelector('#moves').innerHTML = state.moves.slice(-12).reverse().map((move) => `<li><b>${move.turn}.</b> ${UI.escape(move.notation)}</li>`).join('') || '<li>Ще немає ходів</li>';
    const captured = Object.entries(state.captured).flatMap(([owner, types]) => types.map((type) => `${owner === this.me.id ? 'Ви' : 'Суперник'}: ${LABELS[type]}`));
    document.querySelector('#captured').innerHTML = captured.map((text) => `<li>${UI.escape(text)}</li>`).join('') || '<li>Немає</li>';
    Board.draw(state, this.targets);
    if (state.result) { document.querySelector('#result-title').textContent = state.result.winnerId === this.me.id ? 'Ви перемогли' : 'Переміг суперник'; document.querySelector('#result-reason').textContent = REASONS[state.result.reason] || state.result.reason; document.querySelector('#result').hidden = false; }
  },
  choose(tile) { if (this.state.phase !== 'playing' || this.state.activePlayer !== this.me.id) return; this.selected = tile; this.targets = this.state.legalMoves[tile.id] || []; this.render(this.state); },
  send(to) { if (!this.selected || !(this.state.legalMoves[this.selected.id] || []).includes(to)) return; PaiSocket.emit('game:move', { commandId: crypto.randomUUID(), kind: 'move', tileId: this.selected.id, to }); this.selected = null; this.targets = []; },
};
document.addEventListener('DOMContentLoaded', () => { document.querySelector('#resign').onclick = () => confirm('Справді здатися?') && PaiSocket.emit('game:resign', { commandId: crypto.randomUUID() }); document.querySelector('#rematch').onclick = () => PaiSocket.emit('game:rematch', { gameId: Game.state.id }); document.querySelector('#rules-open').onclick = () => document.querySelector('#rules').showModal(); Game.start(); });
