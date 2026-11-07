import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/game.json' with { type: 'json' };
import { modeView } from '../src/data/mode.ts';
import { roleOf } from '../src/engine/index.ts';
import { DISTANCES, HALF_ROLES, MIXES, NEEDS_OPTIC, bestPairs, hitRate, optionFor, pairScore, soloScore } from '../src/engine/warzone.ts';
import type { GameData } from '../src/types.ts';

const data = modeView(raw as unknown as GameData, 'wz');
const gun = (id: string) => data.weapons.find(weapon => weapon.id === id)!;
const ids = (half: 'long' | 'close', role?: string) => data.weapons.filter(weapon => weapon.base && HALF_ROLES[half].includes(roleOf(weapon)) && (!role || roleOf(weapon) === role)).map(weapon => weapon.id);

test('every Warzone gun with a damage model has a stored build for each of its Warzone playstyles', () => {
  const builds = data.warzone!.builds!;
  for (const [id, byStyle] of Object.entries(builds)) for (const [style, parts] of Object.entries(byStyle)) {
    assert.ok(parts.length > 0 && parts.length <= data.warzone!.rules.attachments, `${id} ${style}: ${parts.length} parts`);
    assert.equal(new Set(parts.map(part => data.attachments[part].slot)).size, parts.length, `${id} ${style}: one part per slot`);
    // Long-range builds keep an optic slot when the gun takes an optic; close-range builds run iron sights.
    const takesOptic = data.loadouts[id].some(entry => data.attachments[entry[0]].slot === 'optic');
    assert.equal(parts.some(part => data.attachments[part].slot === 'optic'), NEEDS_OPTIC.has(style) && takesOptic, `${id} ${style} optic`);
  }
  assert.ok(builds.m4 && builds['vel-46'] && builds['kg-7-vulcan']);
});

test('hit rate falls with distance, and less recoil keeps hitting farther', () => {
  const m4 = gun('m4'), base = m4.base!;
  const near = hitRate(m4, base, 10, 50), far = hitRate(m4, base, 60, 50);
  assert.ok(near > far && far > 0);
  const calm = { ...base, vert_recoil: base.vert_recoil / 2, horiz_recoil: base.horiz_recoil / 2 };
  assert.ok(hitRate(m4, calm, 60, 50) > hitRate(m4, base, 60, 50));
});

test('a pair takes each fight with its faster gun and is never slower than either gun alone', () => {
  const long = optionFor(data, gun('m4'), 'long')!, close = optionFor(data, gun('vel-46'), 'close')!;
  const pair = pairScore(long, close, 'mixed');
  DISTANCES.forEach((_, i) => {
    const a = long.times[i]!, b = close.times[i]!;
    assert.equal(pair.takes[i], a <= b ? 'long' : 'close');
  });
  const alone = (option: typeof long) => option.times.reduce((sum: number, time, i) => sum + time! * MIXES.mixed.weights[i], 0) / MIXES.mixed.weights.reduce((a, b) => a + b, 0);
  assert.ok(pair.score <= alone(long) + 1e-9 && pair.score <= alone(close) + 1e-9);
  // The SMG wins up close and the rifle at range.
  assert.equal(pair.takes[0], 'close');
  assert.equal(pair.takes.at(-1), 'long');
});

test('slot choices are respected and pairs come back fastest first', () => {
  const snipers = bestPairs(data, 'mixed', ids('long', 'sniper'), ids('close', 'smg'), 5);
  assert.ok(snipers.length > 0);
  assert.ok(snipers.every(pair => roleOf(pair.long.weapon) === 'sniper' && roleOf(pair.close.weapon) === 'smg'));
  for (let i = 1; i < snipers.length; i++) assert.ok(snipers[i - 1].score <= snipers[i].score);
  // A sniper's SMG plays sniper support.
  assert.ok(snipers.every(pair => pair.close.style.id === 'wz-smg-support'));
  // One gun pinned: every pair runs it.
  const pinned = bestPairs(data, 'long', ['kg-7-vulcan'], ids('close'), 5);
  assert.ok(pinned.length > 0 && pinned.every(pair => pair.long.weapon.id === 'kg-7-vulcan'));
  // The same gun never fills both slots.
  assert.ok(bestPairs(data, 'mixed', ['m4'], ['m4'], 5).length === 0);
});

test('longer sight lines favour the sniper pair more than close quarters do', () => {
  const sniper = optionFor(data, gun('kg-7-vulcan'), 'long')!, rifle = optionFor(data, gun('m4'), 'long')!;
  const smg = optionFor(data, gun('vel-46'), 'close', 'sniper')!, smg2 = optionFor(data, gun('vel-46'), 'close')!;
  const gap = (mix: 'close' | 'long') => pairScore(sniper, smg, mix).score - pairScore(rifle, smg2, mix).score;
  assert.ok(gap('long') < gap('close'));
  assert.ok(soloScore(sniper, 'long') > 0);
});
