// Builds src/data/game.json from the raw source snapshots in research/raw.
// Run with: npm run data
import { readFileSync, writeFileSync } from 'node:fs';
import { baseCatalog } from './source/base-catalog.ts';
import { weaponStatOverrides } from './source/stat-overrides.ts';
import { consensusFor } from '../src/engine/consensus.ts';
import type { GameData } from '../src/types.ts';

type Mods = Record<string, number>;
type LevelRow = [name: string, slot: string, level: number, label: string];

const root = new URL('..', import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const stats = read('research/raw/mw4-community-stats.json');
const attachmentMeta = read('research/raw/mw4-community-attachments.json');
const levels: Record<string, LevelRow[]> = read('research/raw/codmunity-unlock-levels.json').weapons;
// Rechamber, rechamber steadiness, pre-fire delay and hitscan range, read from CODMunity's weapon pages by npm run fetch.
const extras: Record<string, { base: Record<string, number>; attachments: Record<string, Mods> }> = read('research/raw/codmunity-extra-stats.json').weapons;
// Only bolt-action rifles use the rechamber: both shotguns list the same 733 ms, the Rezi is semi-automatic, and no
// source says what it does on a shotgun.
const BOLT_ACTIONS = new Set(['mosin-nagant', 'oris-8-6', 'kg-7-vulcan', 'astaroth-57']);
const EXTRA_KEYS: Record<string, string> = { rechamber_speed: 'rechamber', ads_rechamber_accuracy: 'rechamber_aim', hitscan_range: 'hitscan_range', pre_fire_delay: 'pre_fire_delay' };
function extraFor(weaponId: string, values: Record<string, number>) {
  const out: Mods = {};
  for (const [key, value] of Object.entries(values)) {
    const name = EXTRA_KEYS[key];
    if (!name || !value) continue;
    if ((name === 'rechamber' || name === 'rechamber_aim') && !BOLT_ACTIONS.has(weaponId)) continue;
    out[name] = value;
  }
  return out;
}

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
    list.push([id, level, { ...statMods[id] ?? {}, ...extraFor(weapon.id, extras[weapon.id]?.attachments[name] ?? {}) }]);
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
    mods: (() => {
      const extra = extraFor(weapon.id, extras[weapon.id]?.attachments[weapon.apex!.name] ?? extras[weapon.id]?.attachments[apexRow?.[0] ?? ''] ?? {});
      const listed = stats.apex[weapon.id];
      return listed || Object.keys(extra).length ? { ...listed ?? {}, ...extra } : null;
    })(),
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
    base: stats.weapons[weapon.id] ? { ...stats.weapons[weapon.id], ...extraFor(weapon.id, extras[weapon.id]?.base ?? {}) } : null,
    damage: profile ?? null,
    apex,
  };
});

// Perks, equipment and killstreaks: Activision's launch catalog, plus kill costs and two perk tier lists.
const streakCosts: Record<string, number> = read('research/raw/streak-costs.json').costs;
const tierLists: { source: string; tiers: string[][] }[] = read('research/raw/perk-tiers.json').lists;
const tierScore = (name: string) => {
  const scores = tierLists.map(list => { const index = list.tiers.findIndex(tier => tier.includes(name)); return index < 0 ? null : Math.max(0, 1 - index / 3); }).filter((value): value is number => value !== null);
  return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length * 100) / 100 : null;
};
// Game8 and WZStats both call the sticky grenade Semtex, so the site uses that name.
const gearNames: Record<string, string> = { 'Sticky Grenade': 'Semtex' };
const gear = baseCatalog.gear.map(item => ({
  id: item.id, name: gearNames[item.name] ?? item.name, kind: item.kind, perkSlot: item.perkSlot ?? null, unlock: item.unlockLevel,
  description: item.description, cost: item.kind === 'streak' ? streakCosts[item.name] ?? null : null, tier: item.kind === 'perk' ? tierScore(item.name) : null,
}));
const gearBySlug = new Map(gear.flatMap(item => [[slug(item.name), item.id], [slug(baseCatalog.gear.find(g => g.id === item.id)!.name), item.id]]));

// Guide builds from CODMunity, Game8 and WZStats, matched to this gun's attachment IDs.
// Drop patch tags, and round decimal millimetres ("406.4MM") the way CODMunity names barrels ("406mm").
const clean = (name: string) => name.replace(/[▲▼]\s*(Buff|Nerf)$/i, '').replace(/(\d+\.\d+)\s*mm\b/i, (_, value: string) => `${Math.round(Number(value))}mm`).trim();
const apexNames: Record<string, string[]> = Object.fromEntries(baseCatalog.weapons.map(weapon => [weapon.id, [weapon.apex?.name, levels[weapon.id]?.find(row => slotId(row[1]) === 'apex')?.[0]].filter((name): name is string => !!name)]));
const isApex = (weaponId: string, name: string) => {
  const words = new Set(slug(name).split('-'));
  return (apexNames[weaponId] ?? []).some(apex => slug(apex) === slug(name) || slug(apex).endsWith(`-${slug(name)}`) || slug(apex).split('-').every(word => words.has(word)));
};
const unmatchedNames = new Set<string>(), fuzzyMatches = new Set<string>();
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) { const current = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = current; }
  }
  return row[b.length];
}
function matchParts(weaponId: string, names: string[]) {
  const known = [...new Set((loadouts[weaponId] ?? []).map(entry => entry[0]))];
  const attachmentsOut: string[] = [], unmatched: string[] = [];
  let apex = false;
  for (const raw of names) {
    const name = clean(raw), id = slug(name);
    if (isApex(weaponId, name)) { apex = true; continue; }
    if (known.includes(id)) { attachmentsOut.push(id); continue; }
    // Guide typos like "Sclager Visiv-5" match when exactly one part of this gun is within two edits
    // and every number agrees, so "25 Round Mag" never becomes "14 Round Mag".
    const numbers = (text: string) => (text.match(/\d+/g) ?? []).join(',');
    const close = id.length >= 8 ? known.filter(other => distance(id, other) <= 2 && numbers(other) === numbers(id)) : [];
    if (close.length === 1) { attachmentsOut.push(close[0]); fuzzyMatches.add(`${weaponId}: ${name} -> ${close[0]}`); continue; }
    unmatched.push(name); unmatchedNames.add(`${weaponId}: ${name}`);
  }
  return { attachments: attachmentsOut, unmatched, apex };
}
const LABELS = ['Apex Attachment', 'Versatile', 'Mobility', 'Long Range', 'Close Range', 'Mid Range', 'Sniper'];
const meta: Record<string, any[]> = {}, metaGear: Record<string, any[]> = {};
const push = (weaponId: string, build: any) => { if (loadouts[weaponId]) (meta[weaponId] ??= []).push(build); };
const titleCase = (text: string) => text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

const codmunity = read('research/raw/meta-codmunity.json');
for (const [weaponId, rows] of Object.entries<any[]>(codmunity.weapons)) for (const [title, mode, variant, code, parts, updated] of rows) {
  if (!/Multiplayer|DMZ/.test(mode)) continue;
  const match = matchParts(weaponId, parts.split('|'));
  const label = LABELS.find(item => title.endsWith(item)) ?? title;
  push(weaponId, { source: 'CODMunity', label: `${/DMZ/.test(mode) ? 'DMZ ' : ''}${label}`, apex: variant === 'apex' || (variant === 'default' && match.apex), code: code || null, attachments: match.attachments, unmatched: match.unmatched, url: `https://codmunity.gg/weapon/mw4/${weaponId}`, updated: updated ? updated.split('/').reverse().join('-') : null, note: null });
}
const game8 = read('research/raw/meta-game8.json');
for (const [weaponId, [page, updated, builds, gearRow]] of Object.entries<any>(game8.weapons)) {
  const weapon = baseCatalog.weapons.find(item => item.id === weaponId)!;
  const url = game8.url.replace('<page>', page);
  for (const [title, code, parts, noCode] of builds) {
    const match = matchParts(weaponId, parts.split('|'));
    const label = title.replace(/ Build$/, '').replace(new RegExp(`^(${weapon.name}|${weapon.name.replace(/[ .-]/g, '[ .-]?')})\\s*`, 'i'), '') || 'Build';
    push(weaponId, { source: 'Game8', label, apex: /Apex/.test(title) || match.apex, code: code || null, attachments: match.attachments, unmatched: match.unmatched, url, updated: updated ? new Date(`${updated} UTC`).toISOString().slice(0, 10) : null, note: noCode ? 'Game8 could not get a code for this build.' : null });
  }
  const [tactical, lethal, field, perks] = gearRow;
  const names = [tactical, lethal, field, ...perks.split('|')].filter(Boolean);
  (metaGear[weaponId] ??= []).push({ source: 'Game8', url, items: names.map((name: string) => gearBySlug.get(slug(name))).filter(Boolean), unmatched: names.filter((name: string) => !gearBySlug.get(slug(name))) });
}
const wzstats = read('research/raw/meta-wzstats.json');
for (const [weaponId, [url, updated, builds, perks, equipment]] of Object.entries<any>(wzstats.weapons)) {
  for (const [label, parts] of builds) {
    const list = parts.split('|').map((part: string) => part.split('~'));
    const match = matchParts(weaponId, list.map(([name]: string[]) => name));
    push(weaponId, { source: 'WZStats', label: titleCase(label), apex: list.some(([, slot]: string[]) => slot === 'Apex') || match.apex, code: null, attachments: match.attachments, unmatched: match.unmatched, url, updated: updated ? new Date(`${updated} UTC`).toISOString().slice(0, 10) : null, note: null });
  }
  const names = [...perks.split('|'), ...equipment.split('|')].filter(Boolean);
  if (names.length) (metaGear[weaponId] ??= []).push({ source: 'WZStats', url, items: names.map((name: string) => gearBySlug.get(slug(name))).filter(Boolean), unmatched: names.filter((name: string) => !gearBySlug.get(slug(name))) });
}

// A source that lists the same gear on every gun page is a general pick, not one for that gun.
for (const source of new Set(Object.values(metaGear).flat().map(pick => pick.source))) {
  const picks = Object.values(metaGear).flat().filter(pick => pick.source === source);
  const generic = picks.length > 3 && new Set(picks.map(pick => [...pick.items].sort().join())).size === 1;
  for (const pick of picks) pick.generic = generic;
}

const retrieved: string = read('research/raw/codmunity-unlock-levels.json').retrieved;
const out = {
  version: `mw4-${retrieved}`,
  checkedAt: retrieved,
  statsUpdated: stats.meta.updated as string,
  statNames: {
    ...Object.fromEntries(stats.stats.map((stat: any) => [stat.id, { name: stat.name, unit: stat.unit, better: stat.better }])),
    rechamber: { name: 'Rechamber time', unit: 'ms', better: 'lower' },
    rechamber_aim: { name: 'Aim movement while rechambering', unit: '', better: 'lower' },
    hitscan_range: { name: 'Hitscan range', unit: 'm', better: 'higher' },
    pre_fire_delay: { name: 'Pre-fire delay', unit: 'ms', better: 'lower' },
  },
  weapons,
  attachments,
  loadouts,
  gear,
  meta,
  metaGear,
  metaSources: Object.fromEntries([codmunity, game8, wzstats].map(source => [source.source, { name: source.source, url: source.url, retrieved: source.retrieved }])),
};
// What each gun's site builds are tuned for, scored with the same engine the site uses.
const consensus: Record<string, unknown> = {};
for (const weapon of weapons) {
  if (!loadouts[weapon.id]) continue;
  const found = consensusFor({ ...out, consensus: {} } as unknown as GameData, weapon);
  if (found) consensus[weapon.id] = found;
}
writeFileSync(new URL('src/data/game.json', root), JSON.stringify({ ...out, consensus }));
console.log(`weapons ${weapons.length}, with stats ${weapons.filter(w => loadouts[w.id]).length}, attachments ${Object.keys(attachments).length}, entries ${Object.values(loadouts).reduce((n, l) => n + l.length, 0)}`);
console.log(`gear ${gear.length}, guide builds ${Object.values(meta).reduce((n, l) => n + l.length, 0)}, guide gear picks ${Object.values(metaGear).reduce((n, l) => n + l.length, 0)}, unmatched guide parts ${unmatchedNames.size}`);
if (process.argv.includes('--verbose')) {
  for (const name of fuzzyMatches) console.log(`  near match ${name}`);
  for (const name of unmatchedNames) console.log(`  unmatched ${name}`);
}
// Known gaps: a few stat entries are not on the weapon's CODMunity page, and a few new parts lack icons.
if (problems.length) {
  const byWeapon = new Map<string, string[]>();
  for (const problem of problems) { const [weapon, rest] = problem.split(': '); byWeapon.set(weapon, [...byWeapon.get(weapon) ?? [], rest]); }
  console.log(`${problems.length} entries skipped or missing icons:`);
  for (const [weapon, list] of byWeapon) console.log(`  ${weapon}: ${list.length} (${list.slice(0, 2).join('; ')}${list.length > 2 ? '; ...' : ''})`);
}
