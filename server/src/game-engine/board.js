'use strict';

// The rules operate on cells, never on intersections. Coordinates are logical
// column/row values; the normalized geometry is also shared with tests/clients.
const RADIUS = 7;
const CELL_HALF_WIDTH = 1;
const CELL_HALF_HEIGHT = 0.5;
const cells = [];
for (let row = -RADIUS; row <= RADIUS; row += 1) {
  for (let column = -RADIUS; column <= RADIUS; column += 1) {
    if (column * column + row * row > 50) continue;
    const centerX = column - row;
    const centerY = (column + row) / 2;
    cells.push({
      id: `${column},${row}`,
      x: column,
      y: row,
      row,
      column,
      centerX,
      centerY,
      polygonPoints: [
        { x: centerX, y: centerY - CELL_HALF_HEIGHT },
        { x: centerX + CELL_HALF_WIDTH, y: centerY },
        { x: centerX, y: centerY + CELL_HALF_HEIGHT },
        { x: centerX - CELL_HALF_WIDTH, y: centerY },
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
  return cellMap.get(`${-source.column},${-source.row}`) || null;
}

module.exports = { RADIUS, cells, cellMap, adjacentIds, rotateCell180, DIRECTIONS };
