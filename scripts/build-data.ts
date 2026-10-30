// Builds src/data/game.json from the raw source snapshots in research/raw.
// Run with: npm run data
import { readFileSync, writeFileSync } from 'node:fs';
import { baseCatalog } from './source/base-catalog.ts';
import { weaponStatOverrides } from './source/stat-overrides.ts';

type Mods = Record<string, number>;
type LevelRow = [name: string, slot: string, level: number, label: string];

const root = new URL('..', import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const stats = read('research/raw/mw4-community-stats.json');
const attachmentMeta = read('research/raw/mw4-community-attachments.json');
const levels: Record<string, LevelRow[]> = read('research/raw/codmunity-unlock-levels.json').weapons;

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slotId = (slot: string) => slug(slot);
const metaById = new Map<string, any>(attachmentMeta.attachments.map((item: any) => [item.id, item]));
const problems: string[] = [];

const attachments: Record<string, { name: string; slot: string; kind: string; image: boolean }> = {};
const loadouts: Record<string, [id: string, level: number, mods: Mods][]> = {};

const weapons = baseCatalog.weapons.map(weapon => {
  const overrides = weaponStatOverrides[weapon.id] ?? {};
  const rows = levels[weapon.id] ?? [];
  const statMods: Record<string, Mods> = stats.attachments[weapon.id] ?? {};
  const apexRow = rows.find(row => slotId(row[1]) === 'apex');
  const list: [string, number, Mods][] = [];
  for (const [name, slot, level, label] of rows) {
    if (slotId(slot) === 'apex') continue;
    const id = slug(name);
    const meta = metaById.get(id);
    if (!meta) problems.push(`${weapon.id}: no attachment record for "${name}" (${id})`);
    attachments[id] ??= { name, slot: slotId(slot), kind: label || meta?.about || '', image: !!meta?.picture };
    list.push([id, level, statMods[id] ?? {}]);
  }
  for (const id of Object.keys(statMods)) {
    if (list.some(entry => entry[0] === id)) continue;
    // CODMunity's MAR-9 page has no attachment table. Its stat entries stay usable with level 0, shown as unpublished.
    const meta = metaById.get(id);
    if (!rows.length && meta) {
      attachments[id] ??= { name: meta.name, slot: meta.type, kind: meta.about ?? '', image: !!meta.picture };
      list.push([id, 0, statMods[id]]);
    } else problems.push(`${weapon.id}: stat entry ${id} has no unlock row`);
  }
  if (list.length) loadouts[weapon.id] = list.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));

  const apex = weapon.apex && {
    id: weapon.apex.id,
    name: weapon.apex.name,
    description: weapon.apex.description,
    level: apexRow?.[2] ?? weapon.apex.unlockLevel ?? weapon.maxLevel,
    blocks: weapon.apex.blockedSlots.map(slotId),
    // A missing entry means the source lists no stat change, not a known zero effect.
    mods: stats.apex[weapon.id] ?? null,
  };
  const profile = (overrides as any).damageProfile ?? weapon.damageProfile;
  return {
    id: weapon.id,
    name: weapon.name,
    category: weapon.category,
    slot: weapon.slot,
    description: weapon.description,
    unlockLevel: Math.max(...[weapon.unlockLevel, ...((overrides as any).reportedUnlockLevels ?? weapon.reportedUnlockLevels ?? [])].filter((value): value is number => typeof value === 'number')),
    // The official max can trail CODMunity's unlock table, so the highest listed unlock wins.
    maxLevel: Math.max(weapon.maxLevel ?? 0, apexRow?.[2] ?? 0, ...list.map(entry => entry[1])) || null,
    fireMode: (overrides as any).fireMode ?? weapon.fireMode ?? null,
    // Fire rate comes from the same CODMunity record as the damage profile, so TTK stays consistent.
    rpm: (overrides as any).rpm ?? weapon.rpm,
    magazine: weapon.magazine,
    health: (overrides as any).stats?.health ?? 100,
    base: stats.weapons[weapon.id] ?? null,
    damage: profile ?? null,
    apex,
  };
});

const out = {
  version: 'mw4-2026-10-30',
  checkedAt: '2026-10-30',
  statNames: Object.fromEntries(stats.stats.map((stat: any) => [stat.id, { name: stat.name, unit: stat.unit, better: stat.better }])),
  weapons,
  attachments,
  loadouts,
};
writeFileSync(new URL('src/data/game.json', root), JSON.stringify(out));
console.log(`weapons ${weapons.length}, with stats ${weapons.filter(w => loadouts[w.id]).length}, attachments ${Object.keys(attachments).length}, entries ${Object.values(loadouts).reduce((n, l) => n + l.length, 0)}`);
if (problems.length) { console.log(`${problems.length} problems:`); for (const problem of problems) console.log('  ' + problem); }
