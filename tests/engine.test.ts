import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/game.json' with { type: 'json' };
import { ATTACHMENT_LIMIT, PLAYSTYLES, STABILITY, TIE_MS, applyMods, evaluateBuild, killAt, metrics, missedShotMs, optimize, optimizeClass, playstyleById, playstyleFor, playstylesFor, roleOf, score, slugAmmo, ttkAt, weightsFor } from '../src/engine/index.ts';
import { consensusFor } from '../src/engine/consensus.ts';
import { metricIds } from '../src/types.ts';
import type { BuildResult, GameData, Settings, Weights } from '../src/types.ts';

const data = raw as unknown as GameData;
const weapon = (id: string) => data.weapons.find(item => item.id === id)!;
const neutral = () => Object.fromEntries(metricIds.map(id => [id, 1])) as Weights;
const settings = (weaponId: string, patch: Partial<Settings> = {}): Settings => ({
  weaponId, level: weapon(weaponId).maxLevel!, preset: playstylesFor(weapon(weaponId))[0].id, emphasis: neutral(), distanceM: 15, apex: false, optic: false, locked: [], excluded: [],
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
  assert.equal(supported, 30);
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
  const cases: [string, string, boolean][] = [['vel-46', 'smg-mid', false], ['vel-46', 'smg-rush', true], ['kastov-762', 'ar-long', false], ['m4', 'ar-control', true],
    ['rezi-12', 'shotgun-hip', false], ['warlord', 'shotgun-slug', false], ['iso-nightshade', 'smg-rush', true], ['mosin-nagant', 'bolt-quickscope', false], ['kg-7-vulcan', 'sniper-hardscope', false], ['sang-9mm', 'pistol-sidearm', false]];
  for (const [id, preset, apex] of cases) {
    const s = settings(id, { preset, distanceM: playstyleById(preset)!.distanceM });
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
  for (const [id, preset, apex] of [['vel-46', 'smg-mid', false], ['kastov-762', 'ar-long', false], ['iso-nightshade', 'smg-rush', true], ['mosin-nagant', 'bolt-quickscope', false]] as const) {
    const base = settings(id, { preset, distanceM: playstyleById(preset)!.distanceM });
    const pool: BuildResult[] = [];
    optimizeClass(data, weapon(id), base, apex, { collect: pool });
    for (let i = 0; i < 8; i++) {
      const emphasis = Object.fromEntries(metricIds.map(m => [m, Math.exp((random() * 2 - 1) * Math.log(STABILITY.weightSpread))])) as Weights;
      const nudged = { ...base, emphasis, distanceM: Math.max(2, Math.round(base.distanceM * (1 + (random() * 2 - 1) * STABILITY.distanceSpread))) };
      const truth = optimizeClass(data, weapon(id), nudged, apex, { keep: 1 }).best!;
      const style = playstyleFor(weapon(id), preset);
      const weights = weightsFor(nudged, style), shot = missedShotMs(weapon(id));
      const fromPool = Math.max(...pool.map(build => score(metrics(weapon(id), build.stats, nudged.distanceM, style).values, weights, shot)));
      assert.ok(truth.score - fromPool < TIE_MS, `${id}: pool missed the winner by ${truth.score - fromPool} ms`);
      if (Math.abs(truth.score - fromPool) < 1e-9) agree++;
      total++;
    }
  }
  assert.ok(agree / total >= .9, `pool found the exact winner in ${agree}/${total}`);
});

test('every supported gun has playstyles for its class, and ids are unique', () => {
  assert.equal(new Set(PLAYSTYLES.map(style => style.id)).size, PLAYSTYLES.length);
  for (const item of data.weapons.filter(w => data.loadouts[w.id])) {
    const styles = playstylesFor(item);
    assert.ok(styles.length >= 2, `${item.id} has ${styles.length} playstyles`);
    for (const style of styles) assert.equal(style.role, roleOf(item));
    // A playstyle from another class falls back to this class's first one.
    assert.equal(playstyleFor(item, 'no-such-style').id, styles[0].id);
  }
  assert.equal(roleOf(weapon('mosin-nagant')), 'bolt');
  assert.equal(roleOf(weapon('mar-9')), 'dmr');
  assert.equal(roleOf(weapon('kg-7-vulcan')), 'sniper');
});

test('the kill model counts one-shot zones, misses and rechamber time', () => {
  const mosin = weapon('mosin-nagant'), aim = playstyleById('bolt-quickscope')!.aim!;
  // 102 to the chest and stomach inside 37 m, 93 to the limbs: a limb hit needs a second shot.
  const close = killAt(mosin, 10, 1, aim)!;
  const limbs = ['upperarm', 'lowerarm', 'upperleg', 'lowerleg'].reduce((sum, region) => sum + aim.regions[region], 0);
  assert.ok(Math.abs(close.oneShot - (1 - limbs)) < 1e-9);
  assert.ok(Math.abs(close.hits - (1 + limbs)) < 1e-9);
  // Past 56 m only headshots kill in one. At 120 m the whole fight window, 60 to 180 m, is past it.
  assert.ok(Math.abs(killAt(mosin, 120, 1, aim)!.oneShot - aim.regions.head) < 1e-9);
  // A faster bolt saves time on every follow-up shot. The Mosin's 1767 ms rechamber is slower than its 44 rpm fire rate,
  // so the rechamber sets the pace, and the light bolt cuts it 11%.
  const style = playstyleById('bolt-quickscope')!;
  assert.equal(mosin.base!.rechamber, 1767);
  const fast = metrics(mosin, applyMods(mosin.base!, [mods('mosin-nagant', 'tv-light-7-bolt')]), 15, style);
  const interval = 1767, faster = 1767 * .89;
  assert.ok(Math.abs(fast.values.fireRate - (close.hits / (1 - aim.miss) - 1) * (interval - faster)) < 1, `${fast.values.fireRate}`);
  // The heavy bolt is slower but steadier.
  const heavy = metrics(mosin, applyMods(mosin.base!, [mods('mosin-nagant', 'mn-bch3-heavy-bolt')]), 15, style);
  assert.ok(heavy.values.fireRate < 0 && heavy.values.steady === 50);
  // A range barrel that pushes the one-shot band past the fight window shows up as kill time.
  const ranged = metrics(mosin, { ...mosin.base!, range: mosin.base!.range * 1.2 }, 40, style);
  assert.ok(ranged.values.ttk > 100, `${ranged.values.ttk}`);
});

test('snipers keep their scope, hip-fire shotguns skip optics, and slug playstyles lock the slug', () => {
  for (const id of ['kg-7-vulcan', 'astaroth-57', 'signal-50']) for (const style of playstylesFor(weapon(id))) {
    const best = optimize(data, settings(id, { preset: style.id, optic: true })).standard.best!;
    assert.ok(!best.attachments.some(part => slot(part) === 'optic'), `${id} ${style.id} spent a slot on an optic`);
  }
  const hip = optimize(data, settings('rezi-12', { preset: 'shotgun-hip', optic: true })).standard.best!;
  assert.ok(!hip.attachments.some(part => slot(part) === 'optic'));
  for (const id of ['rezi-12', 'warlord']) {
    const slug = slugAmmo(data, weapon(id))![0];
    assert.ok(optimize(data, settings(id, { preset: 'shotgun-slug' })).standard.best!.attachments.includes(slug), `${id} slug build has no slug`);
    assert.ok(!optimize(data, settings(id, { preset: 'shotgun-hip' })).standard.best!.attachments.includes(slug));
    const early = optimize(data, settings(id, { preset: 'shotgun-slug', level: 5 })).standard;
    assert.equal(early.available, false);
    assert.match(early.reason!, /is not unlocked yet. It unlocks at level 10 here/);
    assert.match(evaluateBuild(data, weapon(id), settings(id, { preset: 'shotgun-slug' }), [], false).issues.join(), /assumes slugs/);
  }
});

test('the stored site-build reading matches the engine', () => {
  // game.json is generated by npm run data. If playstyle weights change without a rebuild, this fails.
  for (const id of ['mosin-nagant', 'warlord', 'vel-46']) {
    const fresh = consensusFor(data, weapon(id))!;
    const stored = data.consensus[id];
    assert.equal(stored.style, fresh.style, id);
    for (const [style, fit] of Object.entries(fresh.fit)) assert.ok(Math.abs(stored.fit[style].capture - fit.capture) < 1e-9, `${id} ${style}`);
  }
});

test('bullet velocity only counts past hitscan range', () => {
  const mosin = weapon('mosin-nagant'), style = playstyleById('bolt-hardscope')!;
  const fast = applyMods(mosin.base!, [mods('mosin-nagant', '7-62x54mmr-high-velocity')]);
  // The whole 5 to 15 m window is inside the 35 m hitscan range.
  assert.equal(metrics(mosin, fast, 10, style).values.velocity, 0);
  assert.ok(metrics(mosin, fast, 40, style).values.velocity > 0);
  // Every automatic SMG fight at 10 m is inside its hitscan range too.
  const vel = weapon('vel-46');
  assert.ok(vel.base!.hitscan_range >= 15);
  assert.equal(metrics(vel, { ...vel.base!, bv: vel.base!.bv * 1.3 }, 10, playstyleById('smg-mid')!).values.velocity, 0);
});
