import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/game.json' with { type: 'json' };
import { apexState, availableOptions, markKey, optimizeClass, playstylesFor, sharedPart, unlockRoutes, unlockState } from '../src/engine/index.ts';
import { metricIds } from '../src/types.ts';
import type { Armory, GameData, Settings, Weights } from '../src/types.ts';

const data = raw as unknown as GameData;
const weapon = (id: string) => data.weapons.find(item => item.id === id)!;
const neutral = () => Object.fromEntries(metricIds.map(id => [id, 1])) as Weights;
const armory = (patch: Partial<Armory> = {}): Armory => ({ levels: {}, prestiged: [], have: [], missing: [], ...patch });
const settings = (weaponId: string, patch: Partial<Settings> = {}): Settings => ({
  weaponId, level: weapon(weaponId).maxLevel!, preset: playstylesFor(weapon(weaponId))[0].id, emphasis: neutral(), distanceM: 15, apex: false, optic: false, locked: [], excluded: [],
  playerLevel: 55, killBand: 8, streakStyle: 'mixed', gearLocks: {}, streakLocks: [], ...patch,
});
const state = (weaponId: string, id: string, patch: Partial<Settings>) => unlockState(data, weaponId, id, settings(weaponId, patch));

test('a shared part unlocked on another gun counts, at that gun\'s own unlock level', () => {
  // 5.56 NATO Overpressured unlocks at level 59 on the Han 86 and level 3 on the M4.
  assert.equal(state('han-86', '5-56-nato-overpressured', { level: 10 }).unlocked, false);
  assert.equal(state('han-86', '5-56-nato-overpressured', { level: 10, armory: armory({ levels: { m4: 2 } }) }).unlocked, false);
  assert.deepEqual(state('han-86', '5-56-nato-overpressured', { level: 10, armory: armory({ levels: { m4: 3 } }) }), { unlocked: true, via: 'shared', weaponId: 'm4', level: 3 });
  // The search uses it too.
  const pool = availableOptions(data, weapon('han-86'), settings('han-86', { level: 10, armory: armory({ levels: { m4: 3 } }) }));
  assert.ok(pool.some(option => option.id === '5-56-nato-overpressured'));
});

test('magazines and No Stock stay gun-specific, and level-less entries never share', () => {
  assert.equal(sharedPart(data, '60-round-drum'), false);
  assert.equal(sharedPart(data, 'no-stock'), false);
  assert.equal(state('m4', '60-round-drum', { level: 5, armory: armory({ levels: { 'han-86': 72 } }) }).unlocked, false);
  assert.equal(state('m4', 'no-stock', { level: 5, armory: armory({ levels: { 'type-73': 72 } }) }).unlocked, false);
  // The MAR-9 lists the FSS Fireline Grip with no level, so it cannot unlock it for other guns.
  assert.equal(state('han-86', 'fss-fireline-grip', { level: 5, armory: armory({ levels: { 'mar-9': 0 } }) }).unlocked, false);
});

test('Weapon Prestige relocks the prestiged gun, keeps its Apex, and still shares its earlier unlocks', () => {
  const prestiged = armory({ levels: { m4: 3, 'han-86': 1 }, prestiged: ['han-86'] });
  // On the prestiged Han 86 only its own parts up to its current level count, even shared ones unlocked elsewhere.
  assert.equal(state('han-86', '5-56-nato-overpressured', { level: 1, armory: prestiged }).unlocked, false);
  assert.equal(apexState(weapon('han-86'), { level: 1, armory: prestiged }).available, true);
  assert.equal(apexState(weapon('han-86'), { level: 1 }).available, false);
  // The Han 86 reached its max before prestige, so its shared parts still count on the M4.
  assert.equal(state('m4', 'fss-fireline-grip', { level: 1, armory: prestiged }).unlocked, true);
});

test('hand marks win over levels, on every gun for shared parts and on one gun for the rest', () => {
  assert.equal(markKey(data, 'm4', 'fss-fireline-grip'), 'fss-fireline-grip');
  assert.equal(markKey(data, 'm4', '60-round-drum'), 'm4:60-round-drum');
  const marks = armory({ have: ['5-56-nato-overpressured', 'm4:60-round-drum'], missing: ['fss-fireline-grip'] });
  assert.equal(state('han-86', '5-56-nato-overpressured', { level: 1, armory: marks }).unlocked, true);
  assert.equal(state('m4', '60-round-drum', { level: 1, armory: marks }).unlocked, true);
  assert.equal(state('han-86', '60-round-drum', { level: 1, armory: marks }).unlocked, false);
  for (const gun of ['m4', 'kastov-762', 'vel-46']) assert.equal(state(gun, 'fss-fireline-grip', { armory: marks }).via, 'marked');
});

test('without an armory, only this gun\'s level counts, as before', () => {
  for (const item of data.weapons.filter(gun => data.loadouts[gun.id]?.length)) for (const level of [1, 20, 45]) {
    const old = data.loadouts[item.id].filter(([, unlock]) => unlock <= level).map(([id]) => id);
    assert.deepEqual(availableOptions(data, item, settings(item.id, { level })).map(option => option.id), old, `${item.id} at ${level}`);
  }
});

test('marking a part as not unlocked rebuilds without it, and the ceiling shows what it was worth', () => {
  const full = optimizeClass(data, weapon('kastov-762'), settings('kastov-762'), false);
  assert.equal(full.ceiling, null, 'nothing is missing at max level');
  const top = full.best!.contributions[0].id;
  const without = optimizeClass(data, weapon('kastov-762'), settings('kastov-762', { armory: armory({ missing: [markKey(data, 'kastov-762', top)] }) }), false);
  assert.ok(!without.best!.attachments.includes(top));
  assert.ok(without.best!.score <= full.best!.score);
  assert.deepEqual(without.ceiling!.attachments, full.best!.attachments);
  assert.equal(Math.round(without.ceiling!.score), Math.round(full.best!.score));
});

test('slug playstyles can use slugs unlocked on the other shotgun', () => {
  const slugs = (patch: Partial<Settings>) => optimizeClass(data, weapon('warlord'), settings('warlord', { preset: 'shotgun-slug', level: 5, ...patch }), false);
  assert.equal(slugs({}).available, false);
  assert.match(slugs({}).reason!, /level 10 here, or level 10 on the Rezi 12/);
  const unlocked = slugs({ armory: armory({ levels: { 'rezi-12': 10 } }) });
  assert.ok(unlocked.best!.attachments.includes('12-gauge-slug'));
});

test('routes list the fewest levels to go first', () => {
  const routes = unlockRoutes(data, 'han-86', '5-56-nato-overpressured', settings('han-86', { level: 40, armory: armory({ levels: { m4: 1, 'finn-lmg': 50 } }) }));
  assert.deepEqual(routes.map(route => [route.weaponId, route.left]), [['m4', 2], ['finn-lmg', 6], ['han-86', 19]]);
  // Gun-specific parts only unlock on their own gun.
  assert.deepEqual(unlockRoutes(data, 'm4', '60-round-drum', settings('m4', { level: 5 })).map(route => route.weaponId), ['m4']);
});
