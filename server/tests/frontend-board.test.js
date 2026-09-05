'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadBoard(side) {
  const context = { Game: { me: { id: 'me' } }, console };
  context.window = context;
  vm.runInNewContext(fs.readFileSync('../frontend/board.js', 'utf8'), context);
  context.Game.state = { players: { me: { side } } };
  return context.window.Board;
}

test('frontend and server expose exactly the same canonical cells and centers', () => {
  const Board = loadBoard('guest');
  const server = require('../src/game-engine/board');
  assert.equal(new Set(Board.cells.map(({ id }) => id)).size, Board.cells.length);
  assert.equal(Board.cells.map(({ id }) => id).sort().join('|'), server.cells.map(({ id }) => id).sort().join('|'));
  for (const cell of server.cells) {
    const browserCell = Board.cell(cell.id);
    assert.equal(`${browserCell.centerX},${browserCell.centerY}`, `${cell.centerX},${cell.centerY}`);
  }
});

test('host view rotates points and hit polygons while preserving canonical cell IDs', () => {
  const Board = loadBoard('host');
  Board.rotated = Board.perspective({ players: { me: { side: 'host' } } });
  const cell = Board.cell('-7,-1'); const rotated = Board.cell('7,1');
  assert.equal(`${Board.point(cell).x},${Board.point(cell).y}`, `${rotated.centerX},${rotated.centerY}`);
  assert.equal(Board.polygon(cell), cell.polygonPoints.map(([x, y]) => `${1000 - x},${1000 - y}`).join(' '));
  assert.equal(cell.id, '-7,-1');
});

test('all eight canonical step directions remain usable in both perspectives', () => {
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const side of ['guest', 'host']) {
    const Board = loadBoard(side);
    Board.rotated = Board.perspective({ players: { me: { side } } });
    const center = Board.point(Board.cell('0,0'));
    const vectors = directions.map(([column, row]) => {
      const point = Board.point(Board.cell(`${column},${row}`));
      return `${Math.sign(point.x - center.x)},${Math.sign(point.y - center.y)}`;
    });
    assert.equal(new Set(vectors).size, 8, `${side} perspective must display eight distinct directions`);
  }
});

test('interactive SVG layers put hit areas below pieces and use one CSS transform', () => {
  const source = fs.readFileSync('../frontend/board.js', 'utf8');
  assert.ok(source.indexOf('id="cell-hit-areas"') < source.indexOf('id="pieces"'));
  assert.doesNotMatch(source, /setAttribute\(['"]transform['"]/);
  assert.match(source, /Game\.inspectPiece/);
  assert.match(source, /Game\.send/);
});
