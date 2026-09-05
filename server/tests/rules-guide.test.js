'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const engine = require('../src/game-engine');

const html = fs.readFileSync('../frontend/index.html', 'utf8');
const rules = fs.readFileSync('../frontend/rules.js', 'utf8');
const css = fs.readFileSync('../frontend/styles.css', 'utf8');

test('Ukrainian guide contains all seven navigable sections and accessible controls', () => {
  for (const id of ['start', 'move', 'jumps', 'combat', 'avatar', 'lotus', 'win']) {
    assert.match(html, new RegExp(`href="#rule-${id}"`));
    assert.match(html, new RegExp(`id="rule-${id}"`));
  }
  assert.match(html, /aria-label="Закрити правила"/);
  assert.match(html, /figcaption/g);
  assert.match(css, /100dvh/);
  assert.match(css, /@media\(max-width:700px\)/);
});

test('guide diagrams reuse game SVG symbols, cell geometry, and live start positions', () => {
  assert.match(rules, /Board\.symbol\(type\)/);
  assert.match(rules, /Board\.gridLines\(\)/);
  assert.match(rules, /Game\.state\?\.board/);
  assert.match(rules, /tile\.startPosition/);
  for (const [type, position] of engine.TOP_FORMATION) {
    assert.match(rules, new RegExp(`\\['${type}','${position.replace(',', ',')}']`));
  }
});

test('guide matches authoritative movement, combat, Lotus, and portal rules', () => {
  assert.match(html, /Усі фішки, крім Лотоса/);
  assert.match(html, /лише через сусідню <strong>власну<\/strong> фішку/);
  assert.match(html, /Земля—Повітря/);
  assert.match(html, /Вогонь—Вода/);
  assert.match(html, /включно з ворожим Лотосом|навіть ворожий Лотос/);
  assert.match(html, /центральній клітині <code>0,0<\/code>/);
  assert.match(html, /від <code>-1,-1<\/code> до <code>1,1<\/code>/);
  assert.equal(engine.getCombatResult('earth', 'fire'), 'win');
  assert.equal(engine.getCombatResult('earth', 'air'), 'neutral');
  assert.equal(engine.cellMap.get('0,0').spiritPortal, true);
  assert.equal(engine.cellMap.get('1,1').spiritPortal, true);
  assert.equal(engine.cellMap.get('2,1').spiritPortal, false);
});

test('rules open as an overlay without replacing or resetting game state', () => {
  const game = fs.readFileSync('../frontend/game.js', 'utf8');
  assert.match(game, /#rules-open'\)\.onclick = \(\) => Rules\.open\(\)/);
  assert.match(rules, /this\.dialog\.showModal\(\)/);
  assert.doesNotMatch(rules, /Game\.state\s*=/);
  assert.doesNotMatch(rules, /transitionToScreen/);
});
