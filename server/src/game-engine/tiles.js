'use strict';
const BASIC = ['rose', 'chrysanthemum', 'rhododendron', 'jasmine', 'lily', 'whiteJade'];
const ACCENTS = ['rock', 'wheel', 'knotweed', 'boat'];
const SPECIAL = ['whiteLotus', 'orchid'];
const RED = new Set(['rose', 'chrysanthemum', 'rhododendron']);
const WHITE = new Set(['jasmine', 'lily', 'whiteJade']);
const RANGE = { rose: 3, chrysanthemum: 3, rhododendron: 4, jasmine: 3, lily: 3, whiteJade: 4, knotweed: 2, rock: 1, wheel: 1, boat: 1, whiteLotus: 2, orchid: 6 };
const HARMONY = { rose: ['whiteJade'], chrysanthemum: ['jasmine'], rhododendron: ['lily'], jasmine: ['chrysanthemum'], lily: ['rhododendron'], whiteJade: ['rose'], whiteLotus: BASIC };
const CLASH = { rose: ['jasmine'], chrysanthemum: ['lily'], rhododendron: ['whiteJade'], jasmine: ['rose'], lily: ['chrysanthemum'], whiteJade: ['rhododendron'], orchid: BASIC };
function createReserve(owner, selectedAccents = ACCENTS) {
  const result = [];
  for (const type of BASIC) for (let copy = 0; copy < 3; copy += 1) result.push({ id: `${owner}-${type}-${copy}`, type, kind: 'basic', owner, position: null, blooming: false });
  for (const type of [...selectedAccents, ...SPECIAL]) result.push({ id: `${owner}-${type}`, type, kind: SPECIAL.includes(type) ? 'special' : 'accent', owner, position: null, blooming: false });
  return result;
}
module.exports = { BASIC, ACCENTS, SPECIAL, RED, WHITE, RANGE, HARMONY, CLASH, createReserve };
