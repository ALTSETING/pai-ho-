'use strict';
const RADIUS = 8;
const points = [];
// The Pai Sho board has 17 horizontal and vertical lines. Only intersections
// inside the circular board are playable; the four cardinal edge points are Gates.
for (let x = -RADIUS; x <= RADIUS; x += 1) {
  for (let y = -RADIUS; y <= RADIUS; y += 1) {
    if (x * x + y * y > 72) continue;
    const gate = (x === 0 && Math.abs(y) === 8) || (y === 0 && Math.abs(x) === 8);
    let garden = 'neutral';
    if (gate) garden = 'gate';
    else if (x !== 0 && y !== 0) garden = x * y > 0 ? 'red' : 'white';
    points.push({ id: `${x},${y}`, x, y, gate, garden, midline: x === 0 || y === 0 });
  }
}
const pointMap = new Map(points.map((point) => [point.id, point]));
function pathBetween(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return [];
  const length = Math.max(Math.abs(dx), Math.abs(dy));
  if (!length) return [];
  return Array.from({ length }, (_, index) => pointMap.get(`${from.x + (dx / length) * (index + 1)},${from.y + (dy / length) * (index + 1)}`)).filter(Boolean);
}
module.exports = { points, pointMap, pathBetween };
