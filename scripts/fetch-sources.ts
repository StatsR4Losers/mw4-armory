// Downloads fresh source snapshots into research/raw, rebuilds src/data/game.json, prints what
// changed and runs the tests. Run with: npm run fetch
// Flags: --skip-levels keeps the current unlock table. CODMunity's pages are still read for rechamber and hitscan stats.
//        --skip-pages skips the CODMunity pages entirely and only refreshes the stat files.
//        --skip-stats keeps the current COD Loadout stat files.
//        --no-test skips the test run at the end.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { baseCatalog } from './source/base-catalog.ts';

type Mods = Record<string, number>;
type Game = { weapons: { id: string; name: string; base: Record<string, number> | null; damage?: unknown; apex: { name: string; mods: Mods | null } | null }[]; attachments: Record<string, { name: string }>; loadouts: Record<string, [string, number, Mods][]> };
type LevelRow = [name: string, slot: string, level: number, label: string];

const root = new URL('..', import.meta.url);
const file = (path: string) => new URL(path, root);
const readJson = (path: string) => JSON.parse(readFileSync(file(path), 'utf8'));
const writeJson = (path: string, value: unknown) => writeFileSync(file(path), JSON.stringify(value, null, 1) + '\n');
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const args = new Set(process.argv.slice(2));
const today = new Date().toISOString().slice(0, 10);
// Requests say what they are. If a site refuses them, the old snapshot stays in place.
const UA = 'mw4-armory-data-refresh/1.0 (personal fan tool; about 30 requests a run, 5 s apart)';

async function get(url: string, attempts = 6, backoffMs = 25_000): Promise<string | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60_000) });
      if (response.ok) return await response.text();
      console.log(`  ${response.status} from ${url} (try ${attempt}/${attempts})`);
    } catch (error) {
      console.log(`  ${error instanceof Error ? error.message : error} from ${url} (try ${attempt}/${attempts})`);
    }
    if (attempt < attempts) await sleep(backoffMs);
  }
  return null;
}

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'", nbsp: ' ' };
const text = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')
  .replace(/&(#x27|#39|amp|lt|gt|quot|nbsp);/g, (_, name: string) => entities[name]).replace(/\s+/g, ' ').trim();

/** Rows of the attachment table on a CODMunity weapon page: name, slot, "Level N", type label. */
export function parseUnlockTable(html: string): LevelRow[] {
  const rows: LevelRow[] = [];
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(match => text(match[1]));
    const level = cells[2]?.match(/^Level (\d+)$/);
    if (level) rows.push([cells[0], cells[1], Number(level[1]), cells[3] ?? '']);
  }
  return rows;
}

// Stats CODMunity's weapon pages carry that COD Loadout's files do not: bolt rechamber time and steadiness, and the
// distance inside which bullets hit instantly.
const EXTRA_BASE = ['rechamber_speed', 'ads_rechamber_accuracy', 'hip_rechamber_accuracy', 'hitscan_range', 'pre_fire_delay'];
const EXTRA_MODS = ['rechamber_speed', 'ads_rechamber_accuracy', 'hip_rechamber_accuracy', 'pre_fire_delay'];
// COD Loadout's stat ids. A page record names a stat the same way, and an attachment's change to it as <id>_mod.
const STATS = ['movement', 'ads_movement', 'sprint', 'tac_sprint', 'crouch_movement', 'strafe_movement', 'firing_movement', 'ads', 'ads_out', 'stf', 'reload', 'raise_speed', 'drop_speed', 'vert_recoil', 'horiz_recoil', 'vert_gun_kick', 'horiz_gun_kick', 'ads_idle_sway', 'ads_gun_bob', 'bv', 'range', 'bullet_penetration', 'hip_idle_sway', 'hip_gun_bob', 'hip_turn_sway', 'flinch_received', 'rpm', 'mag_size', 'reserve_ammo', 'head_multiplier'];
const REGIONS = ['head', 'neck', 'chest', 'stomach', 'upperarm', 'lowerarm', 'upperleg', 'lowerleg'];
export type DamageBand = { minM: number; maxM: number | null; regions: Record<string, number> };
export type PageExtras = {
  base: Record<string, number>; attachments: Record<string, Record<string, number>>;
  // The gun's own stats under COD Loadout's ids, and its damage by distance. Shotguns and launchers have no damage.
  stats?: Record<string, number>; damage?: DamageBand[];
  // Every attachment's change to COD Loadout's stats, by part name. Kept only for guns COD Loadout does not cover yet.
  mods?: Record<string, Record<string, number>>;
};

/** Top-level records in a CODMunity page's serialized data: each {__v:0,_id:"..."} object. flat has nested objects cut out. */
function records(html: string) {
  const out: { raw: string; flat: string }[] = [];
  for (let start = html.indexOf('{__v:0,_id:'); start >= 0; start = html.indexOf('{__v:0,_id:', start + 1)) {
    let depth = 0, end = start, flat = '';
    for (; end < html.length; end++) {
      const char = html[end];
      if (char === '{' || char === '[') depth++;
      else if (char === '}' || char === ']') { depth--; if (depth === 0) break; }
      else if (depth === 1) flat += char;
    }
    out.push({ raw: html.slice(start, end + 1), flat });
  }
  return out;
}
const field = (record: string, key: string) => record.match(new RegExp(`(?:^|,)${key}:(-?[0-9.]+)(?=,|$)`))?.[1];
const label = (record: string, key: string) => record.match(new RegExp(`(?:^|,)${key}:"([^"]*)"`))?.[1];
const numbers = (record: string, keys: string[], suffix = '') => Object.fromEntries(keys.map(key => [key, field(record, `${key}${suffix}`)])
  .filter(([, value]) => value != null).map(([key, value]) => [key, Number(value)]));

/** The damage bands in a record's simple_damage list: one entry per dropoff distance, damage per body part. */
export function parseDamage(raw: string): DamageBand[] | undefined {
  // The list may carry a reference tag first: simple_damage:$R[811]=[...].
  const head = raw.match(/simple_damage:(?:\$R\[\d+\]=)?\[/);
  if (!head) return undefined;
  const open = head.index! + head[0].length - 1;
  let depth = 0, end = open;
  for (; end < raw.length; end++) {
    if (raw[end] === '[') depth++;
    else if (raw[end] === ']' && --depth === 0) break;
  }
  // Each band holds a nested multipliers object. Cut it so each band is one flat {...}.
  const list = raw.slice(open + 1, end).replace(/multipliers:(?:\$R\[\d+\]=)?\{[^{}]*\},?/g, '');
  const bands = [...list.matchAll(/\{([^{}]*)\}/g)].map(match => ({ from: Number(field(match[1], 'dropoff')), regions: numbers(match[1], REGIONS) }));
  if (!bands.length || bands.some(band => Number.isNaN(band.from) || Object.keys(band.regions).length !== REGIONS.length)) return undefined;
  bands.sort((a, b) => a.from - b.from);
  return bands.map((band, index) => ({ minM: band.from, maxM: bands[index + 1]?.from ?? null, regions: band.regions }));
}

// A page holds records for several modes. Multiplayer ones say game mw4; their sourceGame is mw4 or missing. Warzone
// ones say game warzone-2 with sourceGame mw4; Warzone records with sourceGame mw2 are older guns of the same name.
// Only the multiplayer set matches COD Loadout's files, value for value.
export type Mode = 'mp' | 'wz';
const inMode = (flat: string, mode: Mode) => mode === 'mp'
  ? label(flat, 'game') === 'mw4' && [undefined, 'mw4'].includes(label(flat, 'sourceGame'))
  : label(flat, 'game') === 'warzone-2' && label(flat, 'sourceGame') === 'mw4';

/** The weapon's own stat record and each attachment's multipliers in one mode, from one CODMunity weapon page. */
export function parsePageExtras(html: string, withMods = false, mode: Mode = 'mp'): PageExtras | null {
  const list = records(html);
  // The weapon's own record has a fire rate and no loadout. Loadout records repeat it with attachments applied.
  const own = list.find(({ flat }) => inMode(flat, mode) && field(flat, 'rpm') && field(flat, 'hitscan_range') && !flat.includes('loadoutId:') && !flat.includes('attachment:'));
  if (!own) return null;
  const base = numbers(own.flat, EXTRA_BASE);
  const attachments: PageExtras['attachments'] = {}, mods: NonNullable<PageExtras['mods']> = {};
  const parts = new Map<string, string>();
  for (const { flat } of list) {
    const name = label(flat, 'attachment');
    if (name && inMode(flat, mode)) parts.set(name, flat);
  }
  for (const [name, flat] of parts) {
    const extra = numbers(flat, EXTRA_MODS, '_mod');
    if (Object.keys(extra).length) attachments[name] = extra;
    // A change of 0 or 1 means the part leaves that stat alone, as COD Loadout's files read it. Those files carry no optic
    // stats, and the optimizer treats optics as stat-free, so new guns do too.
    if (label(flat, 'slot') !== 'Optic') mods[name] = Object.fromEntries(Object.entries(numbers(flat, STATS, '_mod')).filter(([, value]) => value !== 0 && value !== 1));
  }
  const damage = parseDamage(own.raw);
  // COD Loadout gives every gun a relative range of 100 for range attachments to multiply. Pages leave it out.
  const stats = { range: 100, ...numbers(own.flat, STATS) };
  return { base, attachments, stats, ...(damage ? { damage } : {}), ...(withMods ? { mods } : {}) };
}

// A site build: label, import code, part names, Apex name or null, last updated date.
export type SiteBuild = [label: string, code: string, parts: string[], apex: string | null, updated: string];
const BUILD_SLOTS = ['Optic', 'Muzzle', 'Barrel', 'Laser', 'Underbarrel', 'Guard', 'Magazine', 'Ammunition', 'Rear Grip', 'Stock', 'Comb', 'Bolt', 'Trigger Action', 'Cylinder'];
// Values can hold escaped quotes, as in Barrel:"18\" LE Crosswind".
// Keys with a space are quoted, as in "Rear Grip":"...".
const quoted = (record: string, key: string) => {
  const name = key.includes(' ') ? `"${key}"` : key;
  const value = record.match(new RegExp(String.raw`(?:^|,)${name}:"((?:[^"\\]|\\.)*)"`))?.[1];
  return value?.replace(/\\(.)/g, '$1');
};

/** CODMunity's free Warzone build cards for this gun: the loadout records in the meta collection "wz". */
export function parseWarzoneBuilds(html: string): SiteBuild[] {
  const builds = new Map<string, SiteBuild>();
  // Each card is a flat object up to its nested stats record. The same card appears more than once on a page.
  for (const [, body] of html.matchAll(/\{((?:Ammunition|Apex):[^{}]*?appGame:"warzone-2",collec:"wz"[^{}]*?)(?:,stats:|\})/g)) {
    const id = label(body, '_id');
    if (!id || builds.has(id) || /isPremium:!0/.test(body) || /active:!1/.test(body)) continue;
    const parts = BUILD_SLOTS.map(slot => quoted(body, slot)).filter((name): name is string => !!name);
    const updated = Number(field(body, 'updated') ?? field(body, 'created'));
    builds.set(id, [quoted(body, 'Playstyle') ?? 'Warzone', quoted(body, 'LoadoutCode') ?? '', parts, quoted(body, 'Apex') ?? null, updated ? new Date(updated).toISOString().slice(0, 10) : '']);
  }
  return [...builds.values()];
}

/** CODMunity's most-used Warzone guns per playstyle, as [weapon id, pick rate in percent]. Every page carries the list. */
export function parseWarzonePopularity(html: string): Record<string, [string, number][]> {
  const start = html.indexOf('pairings:'), list = start < 0 ? '' : html.slice(start, html.indexOf('patchDays:', start));
  if (!/link:"warzone"/.test(list)) return {};
  const out: Record<string, [string, number][]> = {};
  for (const [, playstyle, body] of list.matchAll(/playstyle:"([^"]+)",weapons:(?:\$R\[\d+\]=)?\[(.*?)\]\}/g)) {
    out[playstyle] = [...body.matchAll(/slug:"([^"]+)",game:"mw4"[^}]*?popularity:([0-9.]+)/g)].map(([, slug, value]) => [slug, Math.round(Number(value) * 10) / 10]);
  }
  return out;
}

/** Warzone's health, plates and attachment limit, from the game settings every CODMunity page carries. */
export function parseWarzoneRules(html: string) {
  const match = html.match(/health:(\d+),healthPerPlate:(\d+),icon:"[^"]*",maxAttachments:(\d+),maxPlates:(\d+),name:"Warzone"/);
  return match ? { health: Number(match[1]), plate: Number(match[2]), attachments: Number(match[3]), plates: Number(match[4]) } : null;
}

async function refreshStats() {
  console.log('Stat files from COD Loadout');
  for (const [name, check] of [
    ['mw4-community-stats.json', (value: any) => Object.keys(value.weapons ?? {}).length >= 28 && Object.keys(value.attachments ?? {}).length >= 20 && value.apex],
    ['mw4-community-attachments.json', (value: any) => Array.isArray(value.attachments) && value.attachments.length >= 400],
  ] as const) {
    const body = await get(`https://codloadout.gitlab.io/data/${name}`, 3, 5_000);
    let parsed: any = null;
    try { parsed = body && JSON.parse(body); } catch { /* handled below */ }
    if (!parsed || !check(parsed)) { console.log(`  ${name}: download failed or looks wrong, keeping the old copy`); continue; }
    writeFileSync(file(`research/raw/${name}`), body!);
    console.log(`  ${name}: updated ${parsed.meta?.updated ?? 'date unknown'}`);
  }
}

/** Reads each CODMunity weapon page once for its unlock table and its extra stats. levels false keeps the unlock table. */
export async function refreshPages(levels: boolean) {
  const levelPath = 'research/raw/codmunity-unlock-levels.json', extraPath = 'research/raw/codmunity-extra-stats.json';
  const previous = readJson(levelPath);
  let previousExtras: { weapons: Record<string, PageExtras> } = { weapons: {} };
  try { previousExtras = readJson(extraPath); } catch { /* first run */ }
  const stats = readJson('research/raw/mw4-community-stats.json');
  // Guns COD Loadout's file does not have yet, like new seasonal weapons, take all their stats from their own page.
  const pageOnly = new Set(baseCatalog.weapons.map(weapon => weapon.id).filter(id => !stats.weapons[id]));
  const ids = [...Object.keys(stats.attachments), ...pageOnly];
  const weapons: Record<string, LevelRow[]> = {}, extras: Record<string, PageExtras> = {};
  const kept: string[] = [], keptExtras: string[] = [];
  // Warzone versions of the same guns and parts, plus CODMunity's Warzone build cards. COD Loadout has no Warzone data.
  const warzonePath = 'research/raw/codmunity-warzone.json';
  let previousWarzone: { weapons: Record<string, unknown> } = { weapons: {} };
  try { previousWarzone = readJson(warzonePath); } catch { /* first run */ }
  const warzone: Record<string, (PageExtras & { builds: SiteBuild[] }) | unknown> = {};
  let rules: ReturnType<typeof parseWarzoneRules> = null;
  let popularity: Record<string, [string, number][]> = {};
  console.log(`CODMunity weapon pages, ${ids.length} of them, about ${Math.ceil(ids.length * 7 / 60)} minutes`);
  for (const [index, id] of ids.entries()) {
    const html = await get(`https://codmunity.gg/weapon/mw4/${id}`);
    const rows = html && levels ? parseUnlockTable(html) : [];
    const old: LevelRow[] = previous.weapons[id] ?? [];
    // A rate-limited or changed page must not wipe a weapon's known unlocks or stats.
    if (!rows.length && old.length) { weapons[id] = old; if (levels) kept.push(id); }
    else weapons[id] = rows;
    const found = html ? parsePageExtras(html, pageOnly.has(id)) : null;
    if (found) extras[id] = found;
    else if (previousExtras.weapons[id]) { extras[id] = previousExtras.weapons[id]; keptExtras.push(id); }
    const wz = html ? parsePageExtras(html, true, 'wz') : null;
    if (wz) warzone[id] = { ...wz, builds: parseWarzoneBuilds(html!) };
    else if (previousWarzone.weapons[id]) warzone[id] = previousWarzone.weapons[id];
    rules ??= html ? parseWarzoneRules(html) : null;
    if (html && !Object.keys(popularity).length) popularity = parseWarzonePopularity(html);
    console.log(`  ${String(index + 1).padStart(2)}/${ids.length} ${id}: ${levels ? (rows.length ? `${rows.length} unlock rows` : old.length ? 'unlocks failed, kept old rows' : 'no unlock table') + ', ' : ''}${found ? `${Object.keys(found.attachments).length} parts with extra stats` : 'extra stats failed'}, ${wz ? `Warzone ${Object.keys(wz.mods ?? {}).length} parts` : 'no Warzone record'}`);
    await sleep(5_000);
  }
  if (levels) writeJson(levelPath, { ...previous, retrieved: today, weapons, stale: kept.length ? kept : undefined });
  writeJson(extraPath, { source: 'https://codmunity.gg/weapon/mw4/', retrieved: today, weapons: extras, stale: keptExtras.length ? keptExtras : undefined });
  writeJson(warzonePath, {
    source: 'https://codmunity.gg/weapon/mw4/', retrieved: today,
    note: 'Warzone records (game warzone-2, sourceGame mw4) on each MW4 weapon page: base stats, damage, each part\'s changes, and the free Warzone build cards. Builds are [label, code, parts, apex, updated].',
    rules: rules ?? { health: 300, plate: 50, attachments: 5, plates: 3 },
    popularity: Object.keys(popularity).length ? popularity : (previousWarzone as { popularity?: unknown }).popularity ?? {},
    weapons: warzone,
  });
  if (kept.length) console.log(`  Kept older unlock rows for ${kept.join(', ')}. Run again later to refresh them.`);
  if (keptExtras.length) console.log(`  Kept older extra stats for ${keptExtras.join(', ')}.`);
}

function same(a: Mods | null | undefined, b: Mods | null | undefined) {
  return JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());
}

/** Human summary of what changed between two builds of game.json. */
export function diffGames(before: Game, after: Game): string[] {
  const lines: string[] = [];
  const name = (game: Game, id: string) => game.attachments[id]?.name ?? id;
  for (const weapon of after.weapons) {
    const old = before.weapons.find(item => item.id === weapon.id);
    if (!old) { lines.push(`${weapon.name}: new gun with ${after.loadouts[weapon.id]?.length ?? 0} parts`); continue; }
    const changes: string[] = [];
    if (JSON.stringify(old.damage ?? null) !== JSON.stringify(weapon.damage ?? null)) changes.push('damage profile changed');
    const a = new Map((before.loadouts[weapon.id] ?? []).map(entry => [entry[0], entry]));
    const b = new Map((after.loadouts[weapon.id] ?? []).map(entry => [entry[0], entry]));
    const added = [...b.keys()].filter(id => !a.has(id)), removed = [...a.keys()].filter(id => !b.has(id));
    if (added.length) changes.push(`added ${added.map(id => name(after, id)).join(', ')}`);
    if (removed.length) changes.push(`removed ${removed.map(id => name(before, id)).join(', ')}`);
    const levels = [...b.keys()].filter(id => a.has(id) && a.get(id)![1] !== b.get(id)![1]);
    if (levels.length) changes.push(`unlock levels moved for ${levels.map(id => `${name(after, id)} ${a.get(id)![1]}→${b.get(id)![1]}`).join(', ')}`);
    const mods = [...b.keys()].filter(id => a.has(id) && !same(a.get(id)![2], b.get(id)![2]));
    if (mods.length) changes.push(`new stat changes for ${mods.map(id => name(after, id)).join(', ')}`);
    const baseStats = Object.keys(weapon.base ?? {}).filter(stat => old?.base?.[stat] !== weapon.base![stat]);
    if (baseStats.length) changes.push(`base ${baseStats.map(stat => `${stat} ${old?.base?.[stat] ?? 'none'}→${weapon.base![stat]}`).join(', ')}`);
    if (weapon.apex && !same(old?.apex?.mods, weapon.apex.mods)) changes.push(`${weapon.apex.name} ${weapon.apex.mods ? (old?.apex?.mods ? 'stats changed' : 'now has stats') : 'lost its stats'}`);
    if (changes.length) lines.push(`${weapon.name}: ${changes.join('; ')}`);
  }
  return lines;
}

async function main() {
  const before: Game = readJson('src/data/game.json');
  if (!args.has('--skip-stats')) await refreshStats();
  if (!args.has('--skip-pages')) await refreshPages(!args.has('--skip-levels'));
  console.log('Rebuilding src/data/game.json');
  execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/build-data.ts'], { cwd: file('.'), stdio: 'inherit' });
  const changes = diffGames(before, readJson('src/data/game.json'));
  console.log(changes.length ? `\n${changes.length} weapons changed:\n${changes.map(line => `  ${line}`).join('\n')}` : '\nNo data changed.');
  if (!args.has('--no-test')) {
    console.log('\nRunning tests');
    execFileSync('npm', ['test', '--silent'], { cwd: file('.'), stdio: 'inherit' });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
