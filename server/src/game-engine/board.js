'use strict';

// Canonical board geometry. The browser mirrors these documented constants so
// cellId -> row/column -> centerX/centerY always resolves to the same lattice.
const BOARD_CENTER = Object.freeze({ x: 500, y: 500 });
const PLAYABLE_BOUNDS = Object.freeze({ minX: 100, maxX: 900, minY: 70, maxY: 930 });
const CELL_WIDTH = 68;
const CELL_HEIGHT = 50;
const ROW_STEP_Y = 50;
const COLUMN_STEP_X = 68;
const RADIUS = 8;

function screenCenter(row, column) {
  return {
    x: BOARD_CENTER.x + column * COLUMN_STEP_X + (Math.abs(row) % 2 ? CELL_WIDTH / 2 : 0),
    // The extra 15 units at either end makes the lattice use the circular board
    // while retaining an exact centre cell at 500,500.
    y: BOARD_CENTER.y + row * ROW_STEP_Y + (row < 0 ? -15 : row > 0 ? 15 : 0),
  };
}

const cells = [];
for (let row = -RADIUS; row <= RADIUS; row += 1) {
  for (let column = -6; column <= 6; column += 1) {
    const { x: centerX, y: centerY } = screenCenter(row, column);
    const halfWidth = CELL_WIDTH / 2;
    const halfHeight = CELL_HEIGHT / 2;
    if (centerX - halfWidth < PLAYABLE_BOUNDS.minX || centerX + halfWidth > PLAYABLE_BOUNDS.maxX) continue;
    cells.push({
      id: `${column},${row}`,
      x: column,
      y: row,
      row,
      column,
      centerX,
      centerY,
      polygonPoints: [
        { x: centerX, y: centerY - halfHeight },
        { x: centerX + halfWidth, y: centerY },
        { x: centerX, y: centerY + halfHeight },
        { x: centerX - halfWidth, y: centerY },
      ],
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
  const column = Math.abs(source.row) % 2 ? -source.column - 1 : -source.column;
  return cellMap.get(`${column},${-source.row}`) || null;
}

module.exports = { BOARD_CENTER, PLAYABLE_BOUNDS, CELL_WIDTH, CELL_HEIGHT, ROW_STEP_Y, COLUMN_STEP_X, RADIUS, cells, cellMap, screenCenter, adjacentIds, rotateCell180, DIRECTIONS };
