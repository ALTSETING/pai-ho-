'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontend = (name) => fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', name), 'utf8');

test('board renderer contains one clipped layer stack and no unsafe SVG effects', () => {
  const board = frontend('board.js');
  const html = frontend('index.html');
  const styles = frontend('styles.css');
  for (const unsafe of ['feTurbulence', 'feDisplacementMap', 'feBlend', 'mix-blend-mode', 'backdrop-filter']) {
    assert.equal(`${board}\n${styles}`.includes(unsafe), false, `${unsafe} must not be used`);
  }
  assert.equal((html.match(/id="pai-sho-board"/g) || []).length, 1);
  assert.match(board, /<circle cx="500" cy="500" r="455"><\/circle>/);
  for (const layer of ['board-background', 'board-zones', 'board-grid', 'move-highlights', 'pieces', 'effects', 'cell-hit-areas']) {
    assert.equal((board.match(new RegExp(`id="${layer}"`, 'g')) || []).length, 1);
  }
});

test('piece reconciliation is keyed and guards against duplicate DOM nodes', () => {
  const board = frontend('board.js');
  assert.match(board, /data-piece-id/);
  assert.match(board, /if \(!liveIds\.has\(node\.dataset\.pieceId\)\) node\.remove\(\)/);
  assert.match(board, /renderedPieceIds\.length === new Set\(renderedPieceIds\)\.size/);
  assert.match(frontend('styles.css'), /transition:transform 420ms cubic-bezier\(\.22,1,\.36,1\)/);
});
