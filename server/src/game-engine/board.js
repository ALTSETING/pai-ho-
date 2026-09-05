'use strict';

// Canonical board geometry. The browser mirrors these documented constants so
// cellId -> row/column -> centerX/centerY always resolves to the same lattice.
const BOARD_CENTER = Object.freeze({ x: 500, y: 500 });
const PLAYABLE_RADIUS = 455;
const GRID_STEP = 64;
const HALF_STEP = GRID_STEP / 2;
const RADIUS = 9;

function screenCenter(row, column) {
  return {
    x: BOARD_CENTER.x + (column - row) * HALF_STEP,
    y: BOARD_CENTER.y + (column + row) * HALF_STEP,
  };
}

const cells = [];
for (let row = -RADIUS; row <= RADIUS; row += 1) {
  for (let column = -RADIUS; column <= RADIUS; column += 1) {
    const { x: centerX, y: centerY } = screenCenter(row, column);
    const halfWidth = HALF_STEP;
    const halfHeight = HALF_STEP;
    // A logical cell is playable only when its complete diamond is inside the
    // circular board. This is the sole clipping rule used by both applications.
    const vertices = [[centerX, centerY - halfHeight], [centerX + halfWidth, centerY], [centerX, centerY + halfHeight], [centerX - halfWidth, centerY]];
    if (vertices.some(([x, y]) => Math.hypot(x - BOARD_CENTER.x, y - BOARD_CENTER.y) > PLAYABLE_RADIUS)) continue;
    cells.push({
      id: `${column},${row}`,
      x: column,
      y: row,
      row,
      column,
      centerX,
      centerY,
      polygonPoints: vertices.map(([x, y]) => ({ x, y })),
      center: column === 0 && row === 0,
      spiritPortal: Math.abs(column) <= 1 && Math.abs(row) <= 1,
    });
  }
}
const cellMap = new Map(cells.map((cell) => [cell.id, cell]));
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function adjacentIds(id) {
  const cell = cellMap.get(id);
  if (!cell) return [];
  return DIRECTIONS.map(([dx, dy]) => `${cell.column + dx},${cell.row + dy}`).filter((candidate) => cellMap.has(candidate));
}

function rotateCell180(cell) {
  const source = typeof cell === 'string' ? cellMap.get(cell) : cell;
  if (!source) return null;
  return cellMap.get(`${-source.column},${-source.row}`) || null;
}

module.exports = { BOARD_CENTER, PLAYABLE_RADIUS, GRID_STEP, HALF_STEP, RADIUS, cells, cellMap, screenCenter, adjacentIds, rotateCell180, DIRECTIONS };
