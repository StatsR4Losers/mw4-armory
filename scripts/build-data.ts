// Builds src/data/game.json from the raw source snapshots in research/raw.
// Run with: npm run data
import { readFileSync, writeFileSync } from 'node:fs';
import { baseCatalog } from './source/base-catalog.ts';
import { weaponStatOverrides } from './source/stat-overrides.ts';
import { consensusFor } from '../src/engine/consensus.ts';
import { fullModel, optimizeClass, playstylesFor, resetCaches, setPlaystyleMode } from '../src/engine/index.ts';
import { modeView } from '../src/data/mode.ts';
import { NEEDS_OPTIC } from '../src/engine/warzone.ts';
import { metricIds } from '../src/types.ts';
import type { GameData, WarzoneData, Weights } from '../src/types.ts';

type Mods = Record<string, number>;
type LevelRow = [name: string, slot: string, level: number, label: string];

const root = new URL('..', import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const stats = read('research/raw/mw4-community-stats.json');
const attachmentMeta = read('research/raw/mw4-community-attachments.json');
const levels: Record<string, LevelRow[]> = read('research/raw/codmunity-unlock-levels.json').weapons;
// Rechamber, rechamber steadiness, pre-fire delay, hitscan range and damage by distance, read from CODMunity's weapon
// pages by npm run fetch. Guns COD Loadout does not cover yet also get their base stats and attachment changes there.
type DamageBand = { minM: number; maxM: number | null; regions: Record<string, number> };
const extras: Record<string, { base: Record<string, number>; attachments: Record<string, Mods>; stats?: Record<string, number>; damage?: DamageBand[]; mods?: Record<string, Mods> }> = read('research/raw/codmunity-extra-stats.json').weapons;
// Patch notes transcribed by hand. Base stat changes apply over a COD Loadout snapshot taken before the patch.
type PatchWeapon = { id: string; base?: Mods; damageBefore?: DamageBand[] };
const patchNotes: { patches: { id: string; date: string; weapons: PatchWeapon[] }[] } = read('research/raw/patch-notes.json');
const patchBase = (weaponId: string) => Object.assign({}, ...patchNotes.patches.filter(patch => patch.date > stats.meta.updated)
  .sort((a, b) => a.date.localeCompare(b.date)).map(patch => patch.weapons.find(item => item.id === weaponId)?.base ?? {}));
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
  const page = extras[weapon.id];
  // A gun COD Loadout lists keeps its numbers. A newer gun takes them from its CODMunity page, keyed the same way.
  const pageMods: Record<string, Mods> = Object.fromEntries(Object.entries(page?.mods ?? {}).map(([name, mods]) => [slug(name), mods]));
  const statMods: Record<string, Mods> = stats.attachments[weapon.id] ?? pageMods;
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
    // A page lists its Apex among the attachments. It is read below.
    if (statMods === pageMods && apexRow && id === slug(apexRow[0])) continue;
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
      const fromPage = stats.weapons[weapon.id] ? undefined : pageMods[slug(apexRow?.[0] ?? '')] ?? pageMods[weapon.apex!.id];
      const listed = stats.apex[weapon.id] ?? (fromPage && Object.keys(fromPage).length ? fromPage : undefined);
      return listed || Object.keys(extra).length ? { ...listed ?? {}, ...extra } : null;
    })(),
  };
  // The page's damage profile is the newest reading. Guns with no damage model here, like shotguns, stay without one.
  const fallback = (overrides as any).damageProfile ?? weapon.damageProfile;
  const profile = page?.damage && (fallback || !stats.weapons[weapon.id]) ? page.damage : fallback;
  const listedBase = stats.weapons[weapon.id] ? { ...stats.weapons[weapon.id], ...patchBase(weapon.id) } : page?.stats;
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
    base: listedBase ? { ...listedBase, ...extraFor(weapon.id, page?.base ?? {}) } : null,
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
  // Newest patch first, for the Patch screen.
  patches: [...patchNotes.patches].sort((a, b) => b.date.localeCompare(a.date)),
};
// What each gun's site builds are tuned for, scored with the same engine the site uses.
const consensus: Record<string, unknown> = {};
for (const weapon of weapons) {
  if (!loadouts[weapon.id]) continue;
  const found = consensusFor({ ...out, consensus: {} } as unknown as GameData, weapon);
  if (found) consensus[weapon.id] = found;
}

// Warzone: the same guns, parts and unlock levels, with the Warzone numbers from each CODMunity page. A part with no
// Warzone record keeps its multiplayer changes and is listed in fallback.
type WarzoneRaw = { retrieved: string; rules: WarzoneData['rules']; popularity?: WarzoneData['popularity']; weapons: Record<string, { stats?: Mods; base: Mods; damage?: DamageBand[]; attachments: Record<string, Mods>; mods?: Record<string, Mods>; builds: [string, string, string[], string | null, string][] }> };
let warzoneRaw: WarzoneRaw | null = null;
try { warzoneRaw = read('research/raw/codmunity-warzone.json'); } catch { /* no Warzone snapshot yet */ }
let warzone: WarzoneData | undefined;
if (warzoneRaw) {
  const wz: WarzoneData = { retrieved: warzoneRaw.retrieved, rules: warzoneRaw.rules, popularity: warzoneRaw.popularity ?? {}, weapons: {}, loadouts: {}, fallback: {}, meta: {}, consensus: {} };
  for (const weapon of weapons) {
    const page = warzoneRaw.weapons[weapon.id];
    if (!page?.stats || !loadouts[weapon.id]) continue;
    const mods: Record<string, Mods> = Object.fromEntries(Object.entries(page.mods ?? {}).map(([name, value]) => [slug(name), value]));
    const fallback: string[] = [];
    wz.loadouts[weapon.id] = loadouts[weapon.id].map(([id, level, mpMods]) => {
      const extra = extraFor(weapon.id, page.attachments[attachments[id].name] ?? {});
      if (mods[id]) return [id, level, { ...mods[id], ...extra }];
      // Optics carry no stat changes in either mode, only rechamber steadiness.
      if (attachments[id].slot === 'optic') return [id, level, extra];
      if (Object.keys(mpMods).length) fallback.push(id);
      return [id, level, mpMods];
    });
    if (fallback.length) wz.fallback[weapon.id] = fallback;
    const apexName = levels[weapon.id]?.find(row => slotId(row[1]) === 'apex')?.[0] ?? weapon.apex?.name ?? '';
    const apexMods = mods[slug(apexName)];
    wz.weapons[weapon.id] = {
      base: { range: 100, ...page.stats, ...extraFor(weapon.id, page.base) },
      // Shotguns and launchers have no damage model in multiplayer, and none in Warzone either.
      damage: weapon.damage && page.damage ? page.damage : null,
      apex: apexMods && Object.keys(apexMods).length ? apexMods : null,
    };
    const url = `https://codmunity.gg/weapon/mw4/${weapon.id}`;
    wz.meta[weapon.id] = page.builds.map(([label, code, parts, apex, updated]) => {
      const match = matchParts(weapon.id, parts);
      return { source: 'CODMunity', label, apex: !!apex || match.apex, code: code || null, attachments: match.attachments, unmatched: match.unmatched, url, updated: updated || null, note: null };
    });
  }
  // Read the Warzone site builds for intent under the Warzone playstyles.
  const view = modeView({ ...out, consensus, warzone: wz } as unknown as GameData, 'wz');
  setPlaystyleMode('wz'); resetCaches();
  for (const weapon of view.weapons) {
    if (!wz.loadouts[weapon.id] || !weapon.base) continue;
    const found = consensusFor({ ...view, consensus: {} }, weapon);
    if (found) wz.consensus[weapon.id] = found;
  }
  // The Warzone page pairs guns instantly, so each gun's best build per Warzone playstyle is found here, with every part
  // unlocked and no Apex. The Build screen still tunes any one gun to the player's own unlocks.
  wz.builds = {};
  const neutral = Object.fromEntries(metricIds.map(id => [id, 1])) as Weights;
  for (const weapon of view.weapons) {
    if (!wz.loadouts[weapon.id] || !fullModel(weapon)) continue;
    for (const style of playstylesFor(weapon)) {
      const settings = { mode: 'wz' as const, weaponId: weapon.id, level: weapon.maxLevel ?? 1, preset: style.id, emphasis: neutral, distanceM: style.distanceM, apex: false, optic: NEEDS_OPTIC.has(style.id), locked: [], excluded: [], playerLevel: 55, killBand: 8, streakStyle: 'mixed' as const, gearLocks: {}, streakLocks: [] };
      const best = optimizeClass(view, weapon, settings, false).best;
      if (best) (wz.builds[weapon.id] ??= {})[style.id] = best.attachments;
      // An Apex with Warzone stat changes gets its own build, in the slots it leaves open.
      if (weapon.apex?.mods) {
        const apexBest = optimizeClass(view, weapon, settings, true).best;
        if (apexBest) ((wz.apexBuilds ??= {})[weapon.id] ??= {})[style.id] = apexBest.attachments;
      }
    }
  }
  setPlaystyleMode('mp'); resetCaches();
  wz.gear = read('research/raw/warzone-gear.json');
  warzone = wz;
  const fallbacks = Object.values(wz.fallback).reduce((n, list) => n + list.length, 0);
  console.log(`Warzone: ${Object.keys(wz.weapons).length} guns, ${Object.values(wz.meta).reduce((n, list) => n + list.length, 0)} CODMunity Warzone builds, ${fallbacks} parts without a Warzone record keep multiplayer numbers`);
}
writeFileSync(new URL('src/data/game.json', root), JSON.stringify({ ...out, consensus, ...(warzone ? { warzone } : {}) }));
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
