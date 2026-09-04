'use strict';

const TILE_TYPES = ['water', 'earth', 'fire', 'air', 'avatar', 'lotus'];
const ELEMENTS = ['water', 'earth', 'fire', 'air'];
const TILE_COUNTS = Object.freeze({ water: 3, earth: 3, fire: 3, air: 3, avatar: 1, lotus: 1 });
const DEFEATS = Object.freeze({ earth: 'fire', fire: 'air', air: 'water', water: 'earth' });

function getCombatResult(attackerType, defenderType) {
  if (!ELEMENTS.includes(attackerType) || !ELEMENTS.includes(defenderType)) return 'neutral';
  if (DEFEATS[attackerType] === defenderType) return 'win';
  if (DEFEATS[defenderType] === attackerType) return 'lose';
  return 'neutral';
}

module.exports = { TILE_TYPES, ELEMENTS, TILE_COUNTS, getCombatResult };
