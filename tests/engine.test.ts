import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/game.json' with { type: 'json' };
import { ATTACHMENT_LIMIT, PRESETS, STABILITY, TIE_MS, applyMods, metrics, missedShotMs, optimize, optimizeClass, score, ttkAt, weightsFor } from '../src/engine/index.ts';
import { metricIds } from '../src/types.ts';
import type { BuildResult, GameData, PresetId, Settings, Weights } from '../src/types.ts';

const data = raw as unknown as GameData;
const weapon = (id: string) => data.weapons.find(item => item.id === id)!;
const neutral = () => Object.fromEntries(metricIds.map(id => [id, 1])) as Weights;
const settings = (weaponId: string, patch: Partial<Settings> = {}): Settings => ({
  weaponId, level: weapon(weaponId).maxLevel!, preset: 'allround', emphasis: neutral(), distanceM: 15, optic: false, locked: [], excluded: [],
  playerLevel: 55, killBand: 8, streakStyle: 'mixed', gearLocks: {}, streakLocks: [], ...patch,
});
const mods = (weaponId: string, id: string) => data.loadouts[weaponId].find(entry => entry[0] === id)![2];
const slot = (id: string) => data.attachments[id].slot;

test('attachment values match what CODMunity lists on the VEL 46 and Kastov 762 pages', () => {
  // Read by hand from codmunity.gg/weapon/mw4/vel-46 and /kastov-762 on Oct 30.
  assert.deepEqual([mods('vel-46', 'vb-46-series-11').range, mods('vel-46', 'vb-46-series-11').ads, mods('vel-46', 'vb-46-series-11').stf], [1.28, 1.13, 1.14]);
  assert.deepEqual([mods('vel-46', 'fss-crackdown').range, mods('vel-46', 'fss-crackdown').ads, mods('vel-46', 'fss-crackdown').vert_recoil], [1.18, 1.13, .94]);
  assert.deepEqual([mods('vel-46', 'schlager-visiv-5').ads, mods('vel-46', 'schlager-visiv-5').stf], [.92, .83]);
  assert.equal(mods('vel-46', '30-round-mag').mag_size, .75);
  assert.deepEqual([mods('kastov-762', 'gauge-12-mono').range, mods('kastov-762', 'gauge-12-mono').ads], [1.17, 1.11]);
  assert.equal(mods('kastov-762', 'ft-hyperport-408').horiz_recoil, .75);
  const snap = weapon('vel-46').apex!;
  assert.deepEqual([snap.level, snap.blocks, snap.mods!.stf, snap.mods!.vert_recoil], [60, ['stock'], .49, 1.3]);
  assert.equal(data.loadouts['vel-46'].find(entry => entry[0] === 'xrk-tango-380-barrel')![1], 25);
});

test('every loadout entry points at a known attachment and every Apex can unlock', () => {
  let supported = 0;
  for (const item of data.weapons) {
    const list = data.loadouts[item.id];
    if (!list) continue;
    supported++;
    for (const [id, level] of list) {
      assert.ok(data.attachments[id], `${item.id}: ${id}`);
      assert.ok(level <= item.maxLevel!, `${item.id}: ${id} unlocks at ${level} above max ${item.maxLevel}`);
    }
    if (item.apex) assert.ok((item.apex.level ?? 0) <= item.maxLevel!, `${item.id} Apex above max level`);
  }
  assert.equal(supported, 28);
});

test('stacked changes multiply', () => {
  const stats = applyMods(weapon('vel-46').base!, [mods('vel-46', 'fss-crackdown'), mods('vel-46', 'vb-46-series-11')]);
  assert.equal(stats.range, 100 * 1.18 * 1.28);
  assert.ok(Math.abs(stats.ads - 230 * 1.13 * 1.13) < 1e-9);
});

test('time to kill follows the damage bands and stretches with range', () => {
  const vel = weapon('vel-46');
  assert.equal(Math.round(ttkAt(vel, 5)!), 252);
  assert.equal(Math.round(ttkAt(vel, 12)!), 315);
  assert.equal(Math.round(ttkAt(vel, 20)!), 378);
  assert.equal(Math.round(ttkAt(vel, 12, 1.28)!), 252);
  assert.equal(ttkAt(weapon('warlord'), 5), null);
});

test('pruning never changes the winner: matches a full brute-force search', () => {
  const cases: [string, PresetId, boolean][] = [['vel-46', 'allround', false], ['vel-46', 'close', true], ['kastov-762', 'long', false], ['m4', 'control', true], ['rezi-12', 'allround', false], ['iso-nightshade', 'close', true]];
  for (const [id, preset, apex] of cases) {
    const s = settings(id, { preset, distanceM: PRESETS[preset].distanceM });
    const fast = optimizeClass(data, weapon(id), s, apex);
    const full = optimizeClass(data, weapon(id), s, apex, { prune: false, keep: 1 });
    assert.ok(full.evaluated > fast.evaluated, `${id} pruning should cut the search`);
    assert.ok(Math.abs(fast.best!.score - full.best!.score) < 1e-9, `${id} ${preset} ${apex}: ${fast.best!.score} vs ${full.best!.score}`);
  }
});

test('builds are legal: one per slot, at most five, Apex blocked slots stay empty', () => {
  for (const item of data.weapons.filter(w => data.loadouts[w.id])) {
    const result = optimize(data, settings(item.id));
    for (const build of [result.standard.best, result.apex.best]) {
      if (!build) continue;
      const slots = build.attachments.map(slot);
      assert.ok(build.attachments.length <= ATTACHMENT_LIMIT, item.id);
      assert.equal(new Set(slots).size, slots.length, `${item.id} repeats a slot`);
      assert.ok(!slots.includes('optic'), `${item.id} used an optic with optics off`);
      if (build.apex) for (const blocked of item.apex!.blocks) assert.ok(!slots.includes(blocked), `${item.id} used blocked ${blocked}`);
    }
  }
});

test('weapon level gates attachments and the Apex', () => {
  const low = optimize(data, settings('vel-46', { level: 25 }));
  for (const id of low.standard.best!.attachments) assert.ok(data.loadouts['vel-46'].find(entry => entry[0] === id)![1] <= 25);
  assert.equal(low.apex.available, false);
  assert.match(low.apex.reason!, /unlocks at weapon level 60/);
});

test('locks, exclusions and the optic switch are respected', () => {
  const locked = optimize(data, settings('vel-46', { locked: ['fss-crackdown'], excluded: ['schlager-visiv-5'] }));
  assert.ok(locked.standard.best!.attachments.includes('fss-crackdown'));
  assert.ok(!locked.standard.best!.attachments.includes('schlager-visiv-5'));
  const blocked = optimize(data, settings('vel-46', { locked: ['vel-46-extended'] }));
  assert.equal(blocked.apex.available, false);
  assert.match(blocked.apex.reason!, /blocks the stock slot/);
  const optic = optimize(data, settings('vel-46', { optic: true }));
  assert.equal(optic.standard.best!.attachments.filter(id => slot(id) === 'optic').length, 1);
});

test('the search is deterministic and does not change its inputs', () => {
  const s = settings('kastov-762');
  const before = JSON.stringify(s);
  const a = optimize(data, s), b = optimize(data, s);
  assert.deepEqual(a.standard.best!.attachments, b.standard.best!.attachments);
  assert.equal(JSON.stringify(s), before);
});

test('stability is deterministic, bounded and describes the best build', () => {
  const a = optimize(data, settings('vel-46')).standard, b = optimize(data, settings('vel-46')).standard;
  assert.deepEqual(a.stability, b.stability);
  const s = a.stability!;
  assert.equal(s.samples, STABILITY.samples);
  for (const value of [s.nearBest, s.wins, ...s.parts.map(p => p.share), ...s.contenders.map(p => p.share)]) assert.ok(value >= 0 && value <= 1);
  assert.ok(s.nearBest >= s.wins, 'an exact win is always within the tie margin');
  assert.deepEqual(s.parts.map(p => p.id), a.best!.attachments);
  for (const item of s.contenders) assert.ok(!a.best!.attachments.includes(item.id) && item.share >= .25);
});

test('rescoring the top builds matches a full search under nudged settings', () => {
  let seed = 11;
  const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  let agree = 0, total = 0;
  for (const [id, preset, apex] of [['vel-46', 'allround', false], ['kastov-762', 'long', false], ['iso-nightshade', 'close', true]] as const) {
    const base = settings(id, { preset, distanceM: PRESETS[preset].distanceM });
    const pool: BuildResult[] = [];
    optimizeClass(data, weapon(id), base, apex, { collect: pool });
    for (let i = 0; i < 8; i++) {
      const emphasis = Object.fromEntries(metricIds.map(m => [m, Math.exp((random() * 2 - 1) * Math.log(STABILITY.weightSpread))])) as Weights;
      const nudged = { ...base, emphasis, distanceM: Math.max(2, Math.round(base.distanceM * (1 + (random() * 2 - 1) * STABILITY.distanceSpread))) };
      const truth = optimizeClass(data, weapon(id), nudged, apex, { keep: 1 }).best!;
      const weights = weightsFor(nudged), shot = missedShotMs(weapon(id));
      const fromPool = Math.max(...pool.map(build => score(metrics(weapon(id), build.stats, nudged.distanceM).values, weights, shot)));
      assert.ok(truth.score - fromPool < TIE_MS, `${id}: pool missed the winner by ${truth.score - fromPool} ms`);
      if (Math.abs(truth.score - fromPool) < 1e-9) agree++;
      total++;
    }
  }
  assert.ok(agree / total >= .9, `pool found the exact winner in ${agree}/${total}`);
});
