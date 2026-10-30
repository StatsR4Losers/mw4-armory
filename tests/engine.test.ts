import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaseIdealTtk, calculateIdealTtk, getApexAvailability, getAvailableAttachments, optimize, PROFILE_PRIORITIES } from '../src/engine/index.ts';
import type { Attachment, Build, Catalog, Gear, OptimizeSettings, Roles, Weapon } from '../src/types.ts';

// Small sourced fixtures exercise constraints independently from the expanding production catalog.
function roles(values: Partial<Roles> = {}): Roles {
  return { combat: 50, handling: 50, mobility: 50, sustain: 50, survival: 50, intel: 50, objective: 50, streaks: 50, ...values };
}
function weapon(id: string, slot: Weapon['slot'], values: Partial<Weapon> = {}): Weapon {
  return { id, name: id, slot, category: slot, unlockLevel: 1, maxLevel: 10, fireMode: 'auto', rpm: null, magazine: null,
    description: 'Fixture', imageUrl: null, sourceIds: ['verified'], apex: null, roles: roles(), ...values };
}
function attachment(id: string, values: Partial<Attachment> = {}): Attachment {
  return { id, name: id, slot: 'barrel', weaponIds: ['p1'], unlock: { weaponId: 'p1', level: 2 }, description: 'Fixture',
    pros: [], cons: [], imageUrl: null, sourceIds: ['verified'], roles: { combat: 10 }, ...values };
}
function gear(id: string, kind: Gear['kind'], values: Partial<Gear> = {}): Gear {
  return { id, name: id, kind, unlockLevel: 1, description: 'Fixture', imageUrl: null, sourceIds: ['verified'], roles: roles(), ...values };
}
function fixture(): Catalog {
  return { version: 'test-1', checkedAt: '2026-10-30', attachmentLimit: 5, notes: [],
    sources: [{ id: 'verified', title: 'Fixture source', url: 'https://example.com/observations', checkedAt: '2026-10-30' }],
    weapons: [
      weapon('p1', 'primary', { roles: roles({ combat: 85, handling: 35, mobility: 30 }), apex: { id: 'p1-apex', name: 'p1 Apex', description: 'Fixture', unlockLevel: null, blockedSlots: ['optic'], imageUrl: null, sourceIds: ['verified'], roles: { combat: 15, handling: -8 } } }),
      weapon('p2', 'primary', { roles: roles({ combat: 50, handling: 85, mobility: 85 }) }),
      weapon('s1', 'secondary'), weapon('s2', 'secondary', { roles: roles({ handling: 80, mobility: 80 }) }), weapon('knife', 'melee'),
    ],
    attachments: [attachment('barrel'), attachment('optic', { slot: 'optic', roles: { combat: 5, handling: -2 } }), attachment('grip', { slot: 'grip', roles: { handling: 10 } }),
      attachment('speed-barrel', { roles: { mobility: 15, combat: -3 } }), attachment('s1-grip', { weaponIds: ['s1'], unlock: { weaponId: 's1', level: 2 }, slot: 'grip', roles: { handling: 15 } })],
    gear: [gear('flash', 'tactical'), gear('smoke', 'tactical', { roles: roles({ intel: 90, mobility: 80 }) }), gear('frag', 'lethal'), gear('mine', 'lethal', { roles: roles({ objective: 90, survival: 80 }) }),
      gear('ammo', 'field'), gear('cover', 'field', { roles: roles({ survival: 90, objective: 85 }) }),
      gear('quick', 'perk', { perkSlot: 1 }), gear('hardline', 'perk', { perkSlot: 1, roles: roles({ streaks: 85 }) }),
      gear('ghost', 'perk', { perkSlot: 2, roles: roles({ intel: 85 }) }), gear('overkill', 'perk', { perkSlot: 2, unlockLevel: 4 }),
      gear('sprint', 'perk', { perkSlot: 3, roles: roles({ mobility: 90 }) }), gear('focus', 'perk', { perkSlot: 3, roles: roles({ combat: 85 }) }),
      gear('uav', 'streak', { threshold: 5, thresholdWithHardline: 4 }), gear('radar', 'streak', { threshold: 3 }), gear('counter', 'streak', { threshold: 4 }),
      gear('high-streak', 'streak', { threshold: 8, roles: roles({ streaks: 100 }) })],
  };
}
function settings(values: Partial<OptimizeSettings> = {}): OptimizeSettings {
  return { profile: 'balanced', primaryId: 'p1', secondaryId: 's1', weaponLevels: { p1: 5, p2: 5, s1: 5, s2: 5 }, playerLevel: 10,
    apexMode: 'compare', ownedAttachmentIds: [], lockedGear: {}, priorities: {}, streakBand: 5, ...values };
}
function assertComplete(build: Build) {
  assert.ok(build.primary);
  assert.ok(build.secondary);
  assert.equal(build.melee?.slot, 'melee');
  assert.equal(build.gear.filter(item => item.kind === 'tactical').length, 1);
  assert.equal(build.gear.filter(item => item.kind === 'lethal').length, 1);
  assert.equal(build.gear.filter(item => item.kind === 'field').length, 1);
  for (const slot of [1, 2, 3]) assert.equal(build.gear.filter(item => item.kind === 'perk' && item.perkSlot === slot).length, 1);
  assert.equal(build.gear.filter(item => item.kind === 'streak').length, 3);
  assert.equal(new Set(build.gear.map(item => item.id)).size, 9);
}

test('all eight presets return complete legal classes with reproducible comparisons', () => {
  const catalog = fixture();
  assert.equal(Object.keys(PROFILE_PRIORITIES).length, 8);
  for (const profile of Object.keys(PROFILE_PRIORITIES) as (keyof typeof PROFILE_PRIORITIES)[]) {
    const input = settings({ profile });
    const result = optimize(catalog, input);
    assert.equal(result.builds.length, 3, profile);
    result.builds.forEach(assertComplete);
    assert.deepEqual(result, optimize(catalog, input));
    assert.equal(new Set(result.builds.map(build => build.id)).size, result.builds.length);
    assert.match(result.method, /editorial role fit/);
    assert.ok(result.evaluated > 0);
  }
});

test('weapon levels exclude above-level, unknown-level and unsourced attachments unless manually owned', () => {
  const catalog = fixture();
  catalog.attachments.push(attachment('above', { unlock: { weaponId: 'p1', level: 6 } }), attachment('unknown', { unlock: { weaponId: 'p1', level: null } }), attachment('unsourced', { sourceIds: [] }));
  const input = settings();
  const available = getAvailableAttachments(catalog, catalog.weapons[0], input).map(item => item.id);
  for (const id of ['above', 'unknown', 'unsourced']) assert.ok(!available.includes(id));
  const owned = getAvailableAttachments(catalog, catalog.weapons[0], { ...input, ownedAttachmentIds: ['above', 'unknown', 'unsourced'] }).map(item => item.id);
  for (const id of ['above', 'unknown', 'unsourced']) assert.ok(owned.includes(id));
  assert.ok(optimize(catalog, input).builds.every(build => build.attachments.every(item => !['above', 'unknown', 'unsourced'].includes(item.id))));
});

test('shared attachment unlock uses the documented other weapon level only', () => {
  const catalog = fixture();
  catalog.attachments.push(attachment('shared', { unlock: { weaponId: 'p2', level: 7 } }));
  const get = (levels: Record<string, number>) => getAvailableAttachments(catalog, catalog.weapons[0], settings({ weaponLevels: levels })).some(item => item.id === 'shared');
  assert.equal(get({ p1: 10, p2: 6 }), false);
  assert.equal(get({ p1: 1, p2: 7 }), true);
  catalog.attachments.at(-1)!.sourceIds = ['missing-source'];
  assert.equal(get({ p2: 7 }), false);
});

test('Apex requires known max or explicit unlock level and honors the three modes', () => {
  const catalog = fixture();
  const primary = catalog.weapons[0];
  assert.equal(getApexAvailability(primary, settings()).available, false);
  const maxed = settings({ weaponLevels: { p1: 10, s1: 5 } });
  assert.equal(getApexAvailability(primary, maxed).available, true);
  const compare = optimize(catalog, maxed);
  assert.ok(compare.builds.some(build => build.apex));
  assert.ok(compare.builds.some(build => !build.apex));
  assert.ok(optimize(catalog, { ...maxed, apexMode: 'off' }).builds.every(build => !build.apex && !build.secondaryApex));
  assert.ok(optimize(catalog, { ...maxed, apexMode: 'on' }).builds.every(build => build.apex));
  assert.equal(optimize(catalog, settings({ apexMode: 'on' })).builds.length, 0);
  primary.maxLevel = null;
  assert.equal(getApexAvailability(primary, maxed).available, false);
  primary.apex!.unlockLevel = 4;
  assert.equal(getApexAvailability(primary, settings()).available, true);
});

test('blocked slots, attachment conflicts, dependencies and attachment budget are enforced', () => {
  const catalog = fixture();
  catalog.attachmentLimit = 2;
  catalog.attachments.push(attachment('blocker', { slot: 'stock', blockedSlots: ['grip'] }), attachment('conflict', { slot: 'laser', conflicts: ['barrel'] }), attachment('dependent', { slot: 'magazine', prerequisites: ['optic'] }));
  const result = optimize(catalog, settings({ weaponLevels: { p1: 10, s1: 5 } }));
  assert.ok(result.builds.length);
  for (const build of result.builds) {
    assert.ok(build.attachments.length <= 2);
    assert.equal(new Set(build.attachments.map(item => item.slot)).size, build.attachments.length);
    const ids = build.attachments.map(item => item.id);
    assert.ok(!(ids.includes('barrel') && ids.includes('conflict')));
    assert.ok(!(ids.includes('grip') && ids.includes('blocker')));
    if (ids.includes('dependent')) assert.ok(ids.includes('optic'));
    if (build.apex) assert.ok(build.attachments.every(item => item.slot !== 'optic'));
  }
});

test('an Apex conversion conflicting with a locked attachment produces an impossible request', () => {
  const result = optimize(fixture(), settings({ apexMode: 'on', weaponLevels: { p1: 10, s1: 5 }, lockedAttachmentIds: { p1: ['optic'] } }));
  assert.equal(result.builds.length, 0);
  assert.match(result.warnings.join(' '), /Apex|conflict/);
});

test('slot spellings normalize spaces, underscores and hyphens for Apex and attachment blockers', () => {
  const catalog = fixture();
  catalog.weapons[0].apex!.blockedSlots = ['rear grip', 'trigger_action'];
  catalog.attachments.push(attachment('rear', { slot: 'rear-grip' }), attachment('trigger', { slot: 'trigger-action' }),
    attachment('rear-alias', { slot: 'rear grip', roles: { handling: 20 } }));
  const result = optimize(catalog, settings({ apexMode: 'on', weaponLevels: { p1: 10, s1: 5 } }));
  assert.ok(result.builds.length);
  assert.ok(result.builds.every(build => build.attachments.every(item => !['rear', 'trigger', 'rear-alias'].includes(item.id))));
  assert.equal(optimize(catalog, settings({ apexMode: 'off', lockedAttachmentIds: { p1: ['rear', 'rear-alias'] } })).builds.length, 0);
  catalog.attachments.push(attachment('stock-blocker', { slot: 'stock', blockedSlots: ['rear grip'] }));
  assert.equal(optimize(catalog, settings({ apexMode: 'off', lockedAttachmentIds: { p1: ['stock-blocker', 'rear'] } })).builds.length, 0);
});

test('two primary weapons require Overkill and respect a conflicting fixed perk', () => {
  const catalog = fixture();
  const result = optimize(catalog, settings({ secondaryId: 'p2' }));
  assert.ok(result.builds.length);
  assert.ok(result.builds.every(build => build.gear.some(item => item.id === 'overkill')));
  assert.equal(optimize(catalog, settings({ secondaryId: 'p2', lockedGear: { perk2: 'ghost' } })).builds.length, 0);
  assert.equal(optimize(catalog, settings({ secondaryId: 'p2', playerLevel: 3 })).builds.length, 0);
});

test('favorite perks, gear and streak locks remain equipped while exclusions remain absent', () => {
  const input = settings({ lockedGear: { perk1: 'quick', tactical: 'flash' }, lockedStreakIds: ['counter'], excludedIds: ['mine', 'optic'], lockedAttachmentIds: { p1: ['grip'] } });
  const result = optimize(fixture(), input);
  assert.ok(result.builds.length);
  for (const build of result.builds) {
    for (const id of ['quick', 'flash', 'counter']) assert.ok(build.gear.some(item => item.id === id));
    assert.ok(build.attachments.some(item => item.id === 'grip'));
    assert.ok(!build.attachments.some(item => item.id === 'optic'));
    assert.ok(!build.gear.some(item => item.id === 'mine'));
  }
});

test('player level filters weapons and all gear, and a bad fixed slot is rejected', () => {
  const catalog = fixture();
  catalog.weapons[0].unlockLevel = 12;
  assert.equal(optimize(catalog, settings()).builds.length, 0);
  catalog.weapons[0].unlockLevel = 1;
  catalog.gear.find(item => item.id === 'flash')!.unlockLevel = 12;
  assert.ok(optimize(catalog, settings()).builds.every(build => !build.gear.some(item => item.id === 'flash')));
  assert.equal(optimize(catalog, settings({ lockedGear: { tactical: 'flash' } })).builds.length, 0);
  assert.equal(optimize(catalog, settings({ lockedGear: { tactical: 'frag' } })).builds.length, 0);
});

test('conflicting sourced player unlock levels use the conservative highest requirement', () => {
  const catalog = fixture();
  catalog.weapons[0].reportedUnlockLevels = [1, 12];
  assert.equal(optimize(catalog, settings({ playerLevel: 10 })).builds.length, 0);
  const result = optimize(catalog, settings({ playerLevel: 12 }));
  assert.ok(result.builds.length);
  assert.ok(result.builds.every(build => build.limitations.some(note => /conflicting reported player unlock/.test(note))));
});

test('streak band applies sourced Hardline alternative without inventing other discounts', () => {
  const catalog = fixture();
  const result = optimize(catalog, settings({ streakBand: 4, lockedGear: { perk1: 'hardline' }, lockedStreakIds: ['uav'] }));
  assert.ok(result.builds.length);
  assert.ok(result.builds.every(build => build.gear.some(item => item.id === 'uav')));
  assert.equal(optimize(catalog, settings({ streakBand: 4, lockedGear: { perk1: 'quick' }, lockedStreakIds: ['uav'] })).builds.length, 0);
  assert.ok(result.builds.every(build => !build.gear.some(item => item.id === 'high-streak')));
});

test('unknown streak costs are disclosed and never shown as verified attainable', () => {
  const catalog = fixture();
  catalog.gear.find(item => item.id === 'uav')!.threshold = null;
  catalog.gear.find(item => item.id === 'uav')!.thresholdWithHardline = null;
  const result = optimize(catalog, settings({ lockedStreakIds: ['uav'] }));
  assert.ok(result.builds.length);
  assert.ok(result.builds.every(build => build.limitations.some(note => /band cannot be verified/.test(note))));
  assert.ok(result.warnings.some(note => /Streak suggestions include unknown/.test(note)));
});

test('invalid priorities, impossible locks, duplicate streaks and invalid levels return clear failures', () => {
  const catalog = fixture();
  const cases: Partial<OptimizeSettings>[] = [
    { priorities: { combat: -1 } }, { priorities: { combat: Number.NaN } },
    { priorities: Object.fromEntries(Object.keys(PROFILE_PRIORITIES.balanced).map(key => [key, 0])) },
    { playerLevel: 0 }, { weaponLevels: { p1: 11 } }, { streakBand: 0 }, { distanceM: -1 },
    { lockedStreakIds: ['uav', 'uav'] }, { lockedAttachmentIds: { p1: ['missing'] } },
    { excludedIds: ['quick'], lockedGear: { perk1: 'quick' } }, { primaryId: 'missing' },
    { secondaryId: 'p1' }, { excludedIds: ['knife'] },
  ];
  for (const invalid of cases) {
    const result = optimize(catalog, settings(invalid));
    assert.equal(result.builds.length, 0, JSON.stringify(invalid));
    assert.ok(result.warnings.length);
  }
});

test('malformed imported settings return warnings instead of throwing', () => {
  const catalog = fixture();
  for (const invalid of [null, {}, { ...settings(), weaponLevels: null }, { ...settings(), ownedAttachmentIds: 'barrel' }, { ...settings(), excludedIds: 'knife' }, { ...settings(), lockedAttachmentIds: { p1: 7 } }, { ...settings(), profile: 'constructor' }]) {
    const result = optimize(catalog, invalid as unknown as OptimizeSettings);
    assert.equal(result.builds.length, 0);
    assert.ok(result.warnings.length);
  }
});

test('editable priorities change recommendations while unrelated filtered items do not change a class score', () => {
  const catalog = fixture();
  const combat = optimize(catalog, settings({ primaryId: 'auto', priorities: { combat: 100, mobility: 0, handling: 0 } })).builds[0];
  const speed = optimize(catalog, settings({ primaryId: 'auto', priorities: { combat: 0, mobility: 100, handling: 50 } })).builds[0];
  assert.equal(combat.primary.id, 'p1');
  assert.equal(speed.primary.id, 'p2');
  const initial = optimize(catalog, settings()).builds[0];
  catalog.weapons.push(weapon('irrelevant', 'primary', { roles: roles({ combat: 100 }) }));
  const filtered = optimize(catalog, settings({ excludedIds: ['irrelevant'] })).builds.find(build => build.id === initial.id);
  assert.equal(filtered?.score, initial.score);
});

test('secondary Gunsmith and secondary Apex follow their own weapon level constraints', () => {
  const catalog = fixture();
  catalog.weapons.find(item => item.id === 's1')!.apex = { id: 's1-apex', name: 'Secondary Apex', unlockLevel: 8, blockedSlots: ['grip'], imageUrl: null, sourceIds: ['verified'], description: 'Fixture', roles: { combat: 10 } };
  const low = optimize(catalog, settings({ weaponLevels: { p1: 5, s1: 1 } }));
  assert.ok(low.builds.every(build => !build.secondaryAttachments.length && !build.secondaryApex));
  const owned = optimize(catalog, settings({ weaponLevels: { p1: 5, s1: 1 }, ownedAttachmentIds: ['s1-grip'] }));
  assert.ok(owned.builds.some(build => build.secondaryAttachments.length > 0));
  const maxed = optimize(catalog, settings({ weaponLevels: { p1: 10, s1: 8 }, profile: 'close', priorities: { combat: 30 } }));
  assert.ok(maxed.builds.some(build => build.secondaryApex));
  assert.ok(maxed.builds.every(build => !build.secondaryApex || !build.secondaryAttachments.some(item => item.slot === 'grip')));
});

test('secondary Apex alone cannot stand in for a locked primary Apex comparison', () => {
  const catalog = fixture();
  catalog.weapons.find(item => item.id === 's1')!.apex = { id: 'secondary-apex', name: 'Secondary Apex', description: 'Fixture', unlockLevel: 3, blockedSlots: [], imageUrl: null, sourceIds: ['verified'], roles: { combat: 30 } };
  const result = optimize(catalog, settings({ weaponLevels: { p1: 1, s1: 10 } }));
  assert.ok(result.builds.length);
  assert.ok(result.builds.every(build => build.variant === 'standard' && !build.apex && !build.secondaryApex));
  assert.match(result.warnings.join(' '), /Primary Apex comparison/);
});

test('automatic primary comparison retains both states of the same selected weapon', () => {
  const catalog = fixture();
  const result = optimize(catalog, settings({ primaryId: 'auto', weaponLevels: { p1: 10, p2: 10, s1: 10 }, priorities: { combat: 20 } }));
  assert.ok(result.builds.length >= 2);
  assert.equal(result.builds[0].primary.id, result.builds[1].primary.id);
  assert.notEqual(result.builds[0].variant, result.builds[1].variant);
  assert.ok(result.builds.find(build => build.variant === 'standard')!.secondaryApex === null);
});

test('TTK is withheld for missing inputs, burst fire, insufficient ammo and unknown configuration effects', () => {
  const measured = weapon('measured', 'primary', { rpm: 600, magazine: 30, stats: { damage: 25, health: 100 } });
  assert.equal(calculateIdealTtk(measured), 300);
  assert.equal(calculateIdealTtk({ ...measured, stats: { damage: 100, health: 100 } }), 0);
  assert.equal(calculateIdealTtk({ ...measured, stats: { health: 100 } }), null);
  assert.equal(calculateIdealTtk({ ...measured, fireMode: 'burst' }), null);
  assert.equal(calculateIdealTtk({ ...measured, magazine: 3 }), null);
  assert.equal(calculateIdealTtk({ ...measured, rpm: 0 }), null);
  assert.equal(calculateIdealTtk(measured, [attachment('unknown-effect')]), null);
  assert.equal(calculateIdealTtk(measured, [], fixture().weapons[0].apex), null);
  assert.ok(optimize(fixture(), settings()).builds.every(build => build.idealTtkMs === null));
});

test('base damage breakpoints use explicit distance, hit region, health and cadence', () => {
  const measured = weapon('measured', 'primary', { rpm: 600, magazine: 30, stats: { health: 100 }, damageProfile: [
    { minM: 0, maxM: 20, regions: { chest: 25, head: 50 } },
    { minM: 20, maxM: null, regions: { chest: 24, head: 34 } },
  ] });
  assert.equal(calculateBaseIdealTtk(measured, 19.99, 'chest'), 300);
  assert.equal(calculateBaseIdealTtk(measured, 20, 'chest'), 400);
  assert.equal(calculateBaseIdealTtk(measured, 10, 'head'), 100);
  assert.equal(calculateBaseIdealTtk(measured, 20, 'head'), 200);
  assert.equal(calculateBaseIdealTtk(measured, 20, 'unknown'), null);
  assert.equal(calculateBaseIdealTtk({ ...measured, stats: {} }, 10), null);
  const catalog = fixture();
  catalog.weapons[0] = { ...measured, id: 'p1' };
  const result = optimize(catalog, settings({ distanceM: 20, hitRegion: 'chest' }));
  assert.ok(result.builds.every(build => build.idealTtkMs === 400 && /Base measured/.test(build.idealTtkBasis ?? '')));
  assert.ok(result.builds.every(build => build.limitations.some(note => /Attachment changes, Apex behavior/.test(note))));
});

test('small exhaustive case selects the highest score and the engine does not mutate inputs', () => {
  const catalog = fixture();
  // One legal gear package and two barrel choices make this space small enough to enumerate independently.
  catalog.gear = catalog.gear.filter(item => ['flash', 'frag', 'ammo', 'quick', 'ghost', 'focus', 'uav', 'radar', 'counter'].includes(item.id));
  catalog.attachments = [attachment('good', { roles: { combat: 10 } }), attachment('costly', { roles: { combat: -10 } })];
  const input = settings({ apexMode: 'off', profile: 'close', priorities: { combat: 10 } });
  const original = JSON.stringify({ catalog, input });
  const result = optimize(catalog, input);
  assert.equal(result.builds[0].attachments[0]?.id, 'good');
  const weights = { ...PROFILE_PRIORITIES.close, ...input.priorities };
  const baseline = roles({ combat: 85, handling: 35, mobility: 30 });
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const expected = Object.entries(weights).reduce((sum, [key, weight]) => {
    const dimension = key as keyof Roles;
    const main = baseline[dimension] + (dimension === 'combat' ? 10 : 0);
    const otherWeapons = 50 * .16;
    const gearValue = 50 * .4 + (dimension === 'combat' || dimension === 'intel' ? 35 * .05 : 0);
    return sum + weight * (main * .44 + otherWeapons + gearValue);
  }, 0) / weightSum;
  assert.equal(result.builds[0].score, Math.round(expected * 100) / 100);
  assert.equal(JSON.stringify({ catalog, input }), original);
});
