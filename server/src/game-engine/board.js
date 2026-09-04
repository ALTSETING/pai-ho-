'use strict';

// Modern Pai Sho is played in cells.  This compact circular grid deliberately
// exposes the board geometry to every rule instead of letting clients invent it.
const RADIUS = 4;
const cells = [];
for (let y = -RADIUS; y <= RADIUS; y += 1) {
  for (let x = -RADIUS; x <= RADIUS; x += 1) {
    if (x * x + y * y <= 20) cells.push({ id: `${x},${y}`, x, y, center: x === 0 && y === 0, spiritPortal: Math.abs(x) <= 1 && Math.abs(y) <= 1 });
  }
}
const cellMap = new Map(cells.map((cell) => [cell.id, cell]));
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function adjacentIds(id) {
  const cell = cellMap.get(id);
  if (!cell) return [];
  return DIRECTIONS.map(([dx, dy]) => `${cell.x + dx},${cell.y + dy}`).filter((candidate) => cellMap.has(candidate));
}

module.exports = { RADIUS, cells, cellMap, adjacentIds, DIRECTIONS };
