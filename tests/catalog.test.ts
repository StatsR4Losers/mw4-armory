import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/data/catalog.ts';
import { dimensions } from '../src/types.ts';

// Reconcile the launch inventory separately from numeric and attachment coverage.
test('the launch arsenal and every requested class category are present', () => {
  assert.equal(catalog.weapons.filter(item => item.slot === 'primary').length, 24);
  assert.equal(catalog.weapons.filter(item => item.slot === 'secondary').length, 8);
  assert.equal(catalog.weapons.filter(item => item.slot === 'melee').length, 1);
  for (const [kind, count] of Object.entries({ tactical: 9, lethal: 11, field: 12, perk: 18, streak: 17 })) {
    assert.equal(catalog.gear.filter(item => item.kind === kind).length, count, kind);
  }
  for (const slot of [1, 2, 3]) assert.equal(catalog.gear.filter(item => item.perkSlot === slot).length, 6);
});

test('catalog IDs and evidence references resolve without collisions', () => {
  const records = [...catalog.weapons, ...catalog.gear, ...catalog.attachments];
  assert.equal(new Set(records.map(item => item.id)).size, records.length);
  const sourceIds = new Set(catalog.sources.map(source => source.id));
  for (const record of records) {
    assert.ok(record.sourceIds.length, record.id);
    for (const id of record.sourceIds) assert.ok(sourceIds.has(id), `${record.id}: ${id}`);
    if (record.imageUrl) assert.ok(record.imageUrl.startsWith('https://'), record.id);
  }
});

test('attachment compatibility and known unlock weapons exist', () => {
  const weaponIds = new Set(catalog.weapons.map(weapon => weapon.id));
  assert.ok(catalog.attachments.length > 0);
  for (const attachment of catalog.attachments) {
    assert.ok(attachment.weaponIds.length, attachment.id);
    for (const id of attachment.weaponIds) assert.ok(weaponIds.has(id), `${attachment.id}: ${id}`);
    if (attachment.unlock.weaponId !== null) assert.ok(weaponIds.has(attachment.unlock.weaponId), attachment.id);
    if (attachment.unlock.level !== null) assert.ok(Number.isInteger(attachment.unlock.level) && attachment.unlock.level > 0, attachment.id);
  }
});

test('game measurements use positive values and role weights stay separate', () => {
  for (const weapon of catalog.weapons) {
    for (const key of ['rpm', 'magazine', 'maxLevel'] as const) {
      assert.ok(weapon[key] === null || (Number.isFinite(weapon[key]) && weapon[key]! > 0), `${weapon.id}: ${key}`);
    }
    for (const value of Object.values(weapon.stats ?? {})) assert.ok(Number.isFinite(value) && value > 0, weapon.id);
    for (const dimension of dimensions) assert.ok(weapon.roles[dimension] >= 0 && weapon.roles[dimension] <= 100, weapon.id);
    for (const band of weapon.damageProfile ?? []) {
      assert.ok(band.minM >= 0 && (band.maxM === null || band.maxM > band.minM), weapon.id);
      for (const damage of Object.values(band.regions)) assert.ok(Number.isFinite(damage) && damage > 0, weapon.id);
    }
  }
});
