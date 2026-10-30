import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/game.json' with { type: 'json' };
import { GEAR_SLOTS, recommendGear, streakCost } from '../src/engine/gear.ts';
import { evaluateBuild, optimize } from '../src/engine/index.ts';
import { metricIds } from '../src/types.ts';
import type { GameData, Settings, Weights } from '../src/types.ts';

const data = raw as unknown as GameData;
const weapon = (id: string) => data.weapons.find(item => item.id === id)!;
const gear = (id: string) => data.gear.find(item => item.id === id)!;
const settings = (weaponId: string, patch: Partial<Settings> = {}): Settings => ({
  weaponId, level: weapon(weaponId).maxLevel!, preset: 'allround', emphasis: Object.fromEntries(metricIds.map(id => [id, 1])) as Weights,
  distanceM: 15, optic: false, locked: [], excluded: [], playerLevel: 55, killBand: 8, streakStyle: 'mixed', gearLocks: {}, streakLocks: [], ...patch,
});

test('streak costs match the launch values and every streak has one', () => {
  const costs = Object.fromEntries(data.gear.filter(item => item.kind === 'streak').map(item => [item.name, item.cost]));
  assert.equal(Object.keys(costs).length, 17);
  assert.deepEqual([costs.UAV, costs['Counter UAV'], costs['Advanced UAV'], costs.Gunship, costs['Bomb Glider']], [5, 6, 10, 12, 4]);
  for (const cost of Object.values(costs)) assert.ok(typeof cost === 'number');
});

test('every gear slot gets a legal, unlocked pick and Overkill is never automatic', () => {
  for (const item of data.weapons.filter(w => data.loadouts[w.id])) for (const preset of ['allround', 'close', 'long', 'control'] as const) {
    const result = recommendGear(data, item, settings(item.id, { preset }));
    for (const { slot } of GEAR_SLOTS) {
      const pick = gear(result.picks[slot]!.id);
      assert.ok(slot.startsWith('perk') ? pick.kind === 'perk' && pick.perkSlot === Number(slot.slice(-1)) : pick.kind === slot, `${item.id} ${slot}`);
      assert.notEqual(pick.name, 'Overkill');
    }
    assert.equal(new Set(result.streaks.map(pick => pick.id)).size, 3);
  }
});

test('player level, kill band, Hardline and locks are respected', () => {
  const low = recommendGear(data, weapon('vel-46'), settings('vel-46', { playerLevel: 10 }));
  for (const pick of [...Object.values(low.picks), ...low.streaks]) assert.ok((gear(pick!.id).unlock ?? 0) <= 10, gear(pick!.id).name);
  const small = recommendGear(data, weapon('vel-46'), settings('vel-46', { killBand: 6 }));
  for (const pick of small.streaks) assert.ok(gear(pick.id).cost! <= 6);
  const hardline = data.gear.find(item => item.name === 'Hardline')!;
  const withHardline = recommendGear(data, weapon('vel-46'), settings('vel-46', { killBand: 5, gearLocks: { perk2: hardline.id } }));
  assert.ok(withHardline.hardline);
  assert.ok(withHardline.streaks.some(pick => gear(pick.id).cost === 6), 'Hardline brings 6-kill streaks under a 5 band');
  for (const pick of withHardline.streaks) assert.ok(streakCost(gear(pick.id), true)! <= 5);
  const ghost = data.gear.find(item => item.name === 'Ghost')!;
  const gunship = data.gear.find(item => item.name === 'Gunship')!;
  const locked = recommendGear(data, weapon('vel-46'), settings('vel-46', { gearLocks: { perk1: ghost.id }, streakLocks: [gunship.id], killBand: 4 }));
  assert.equal(locked.picks.perk1!.id, ghost.id);
  assert.ok(locked.picks.perk1!.locked);
  assert.ok(locked.streaks.some(pick => pick.id === gunship.id && pick.locked), 'a locked streak stays even above the band');
});

test('guide builds are matched, scored and keep their codes', () => {
  const result = optimize(data, settings('vel-46'));
  assert.ok(result.meta.length >= 8);
  const versatile = result.meta.find(meta => meta.source === 'CODMunity' && meta.label === 'Versatile' && meta.apex)!;
  assert.equal(versatile.code, 'S03-6AL8D-51311');
  assert.deepEqual([...versatile.attachments].sort(), ['fss-fireline-grip', 'v46-r-skel-grip', 'vb-46-series-11', 'xrk-clutch-ls', 'xrk-herder-40']);
  assert.ok(versatile.build && Number.isFinite(versatile.build.score));
  // With optics off, the optimizer's class can never lose to a legal, fully matched guide build without an optic.
  let checked = 0;
  for (const id of ['vel-46', 'kastov-762', 'm4', 'iso-nightshade', 'warlord']) {
    const scored = optimize(data, settings(id));
    for (const meta of scored.meta) {
      if (!meta.build || meta.issues.length || meta.unmatched.length || meta.attachments.some(part => data.attachments[part].slot === 'optic')) continue;
      const mine = meta.apex ? scored.apex.best! : scored.standard.best!;
      assert.ok(meta.build.score <= mine.score + 1e-9, `${id}: ${meta.source} ${meta.label} beats the optimizer`);
      checked++;
    }
  }
  assert.ok(checked >= 10, `only ${checked} guide builds were comparable`);
});

test('evaluating a build reports illegal parts instead of hiding them', () => {
  const vel = weapon('vel-46');
  const blocked = evaluateBuild(data, vel, settings('vel-46'), ['vel-46-extended', 'schlager-visiv-5'], true);
  assert.match(blocked.issues.join(' '), /blocks the stock slot/);
  const doubled = evaluateBuild(data, vel, settings('vel-46'), ['xrk-herder-40', 'fss-crackdown'], false);
  assert.match(doubled.issues.join(' '), /Two parts use the muzzle slot/);
  const foreign = evaluateBuild(data, vel, settings('vel-46'), ['gauge-12-mono'], false);
  assert.match(foreign.issues.join(' '), /not listed for the VEL 46/);
});
