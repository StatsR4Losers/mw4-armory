import { metricIds } from '../types.ts';
import type { BuildResult, ClassResult, GameData, MetaBuild, MetricId, Mods, OptimizeResult, ScoredMeta, Settings, Stability, WeaponData, Weights } from '../types.ts';
import { recommendGear } from './gear.ts';
import { playstyleFor } from './playstyles.ts';
import type { Aim, Playstyle } from './playstyles.ts';

export { AIMS, PLAYSTYLES, ROLES, playstyleById, playstyleFor, playstylesFor, roleOf } from './playstyles.ts';
export type { Aim, Playstyle, Role } from './playstyles.ts';

// Scores are in milliseconds of fight time, or a millisecond equivalent for stats without a time unit.
// ADS, sprint-to-fire, weapon swap, bullet travel and time to kill count in real milliseconds saved. Recoil counts
// as the share of a missed shot it saves: a recoil weight of 3 means 1% less recoil saves 3% of one shot interval,
// so slower firing guns value it more. Everything else is a percent with a small weight. Each weapon class has its
// own playstyles and weights, in playstyles.ts.

export const METRICS: Record<MetricId, { name: string; help: string; unit: 'ms' | '%' }> = {
  ads: { name: 'ADS speed', help: 'Time to aim down sights.', unit: 'ms' },
  stf: { name: 'Sprint to fire', help: 'Time from sprinting to your first shot.', unit: 'ms' },
  ttk: { name: 'Damage range', help: 'Time to kill gained from damage range: longer damage bands, or more one-shot kills on bolt and semi-auto guns.', unit: 'ms' },
  recoil: { name: 'Recoil control', help: 'Recoil and gun kick, vertical counted double.', unit: '%' },
  mobility: { name: 'Movement', help: 'Walk, strafe, sprint and tactical sprint speed.', unit: '%' },
  adsMove: { name: 'ADS movement', help: 'Strafe speed while aiming.', unit: '%' },
  flinch: { name: 'Flinch', help: 'Aim punch when you get hit.', unit: '%' },
  hipfire: { name: 'Hip fire', help: 'Hip-fire sway, gun bob and turn sway. MW4 has no hip-fire bloom, so these place your shots.', unit: '%' },
  magazine: { name: 'Magazine', help: 'Rounds per magazine.', unit: '%' },
  reload: { name: 'Reload', help: 'Reload time.', unit: '%' },
  velocity: { name: 'Bullet velocity', help: 'Travel time saved to your typical fight distance.', unit: 'ms' },
  sway: { name: 'Aim sway', help: 'Idle sway while aiming. Matters when you hold a scope on an angle.', unit: '%' },
  fireRate: { name: 'Fire rate', help: 'Time between shots. On bolt actions and pumps this is the rechamber.', unit: 'ms' },
  swap: { name: 'Weapon swap', help: 'Time to raise the gun after switching to it.', unit: 'ms' },
  steady: { name: 'Steady rechamber', help: 'How little your scope moves while the bolt cycles, for a fast second shot.', unit: '%' },
};

export function weightsFor(settings: Pick<Settings, 'emphasis'>, style: Playstyle): Weights {
  const base = style.weights;
  return Object.fromEntries(metricIds.map(id => [id, base[id] * (settings.emphasis[id] ?? 1)])) as Weights;
}

export const ATTACHMENT_LIMIT = 5;
// Recoil above stock gets harder to control faster than linearly.
const EXCESS_RECOIL = .05;
// Recoil weights are calibrated on the VEL 46, whose missed shot costs 63 ms.
const REFERENCE_SHOT_MS = 60_000 / 952;
const LOWER_BETTER = new Set(['rechamber', 'rechamber_aim', 'pre_fire_delay', 'ads', 'ads_out', 'stf', 'reload', 'raise_speed', 'drop_speed', 'vert_recoil', 'horiz_recoil', 'vert_gun_kick', 'horiz_gun_kick', 'ads_idle_sway', 'ads_gun_bob', 'hip_idle_sway', 'hip_gun_bob', 'hip_turn_sway', 'flinch_received']);
const METRIC_STATS: Record<MetricId, string[]> = {
  ads: ['ads'], stf: ['stf'], recoil: ['vert_recoil', 'horiz_recoil', 'vert_gun_kick', 'horiz_gun_kick'], ttk: ['range', 'mag_size'],
  mobility: ['movement', 'sprint', 'tac_sprint', 'strafe_movement'], adsMove: ['ads_movement'], flinch: ['flinch_received'],
  hipfire: ['hip_idle_sway', 'hip_gun_bob', 'hip_turn_sway'], magazine: ['mag_size'], reload: ['reload'], velocity: ['bv'], sway: ['ads_idle_sway'],
  fireRate: ['rpm', 'mag_size', 'rechamber', 'pre_fire_delay'], swap: ['raise_speed'], steady: ['rechamber_aim'],
};

type Option = { id: string; slot: string; level: number; mods: Mods };

export function applyMods(base: Record<string, number>, mods: Mods[]): Record<string, number> {
  const out = { ...base };
  // Changes multiply, as CODMunity combines them.
  for (const set of mods) for (const [stat, value] of Object.entries(set)) if (stat in out) out[stat] *= value;
  return out;
}

/** Ideal chest TTK for automatic weapons. Damage range multipliers stretch every band boundary. */
export function ttkAt(weapon: WeaponData, distanceM: number, rangeMult = 1, magazine = weapon.magazine, rpm = weapon.rpm): number | null {
  if (weapon.fireMode !== 'auto' || !weapon.damage?.length || !rpm || !magazine) return null;
  const band = weapon.damage.find(item => distanceM >= item.minM * rangeMult && (item.maxM === null || distanceM < item.maxM * rangeMult));
  const damage = band?.regions.chest;
  if (!damage) return null;
  const shots = Math.ceil(weapon.health / damage);
  return shots <= magazine ? (shots - 1) * 60_000 / rpm : null;
}

// Many builds share the same range, magazine and fire rate, so the average is cached.
const ttkCache = new Map<string, number | null>();

/** Average TTK over fights from half to one and a half times the typical distance. */
export function averageTtk(weapon: WeaponData, distanceM: number, rangeMult = 1, magazine = weapon.magazine, rpm = weapon.rpm): number | null {
  const key = `${weapon.id}|${distanceM}|${rangeMult}|${magazine}|${rpm}`;
  if (ttkCache.has(key)) return ttkCache.get(key)!;
  if (ttkCache.size > 20_000) ttkCache.clear();
  const value = computeAverageTtk(weapon, distanceM, rangeMult, magazine, rpm);
  ttkCache.set(key, value);
  return value;
}

function computeAverageTtk(weapon: WeaponData, distanceM: number, rangeMult: number, magazine: number | null, rpm: number | null): number | null {
  const from = distanceM * .5, to = distanceM * 1.5, step = .25;
  let total = 0, count = 0;
  for (let d = from; d <= to + 1e-9; d += step) {
    const value = ttkAt(weapon, d, rangeMult, magazine, rpm);
    if (value === null) return null;
    total += value; count++;
  }
  return count ? total / count : ttkAt(weapon, distanceM, rangeMult, magazine, rpm);
}

// Kill model for bolt-action, semi-auto and single-shot guns. Each hit lands on a body part drawn from the playstyle's
// aim, so a gun that one-shots the chest but not the arms needs a second shot on some hits. Misses add shots too.
const killCache = new Map<string, { hits: number; oneShot: number }>();

/** Expected hits to kill from full health, and the share of hits that kill at once, for one damage band. */
function bandKill(weapon: WeaponData, index: number, aim: Aim) {
  const key = `${weapon.id}|${index}|${aim.name}`;
  const cached = killCache.get(key);
  if (cached) return cached;
  const regions = weapon.damage![index].regions, health = weapon.health;
  const parts = Object.entries(aim.regions).map(([region, share]) => [share, regions[region] ?? regions.chest] as const);
  // expected[h] is the expected number of hits to finish a target with h health left.
  const expected = new Float64Array(health + 1);
  for (let h = 1; h <= health; h++) expected[h] = 1 + parts.reduce((sum, [share, damage]) => sum + share * expected[Math.max(0, Math.ceil(h - damage))], 0);
  const value = { hits: expected[health], oneShot: parts.reduce((sum, [share, damage]) => sum + (damage >= health ? share : 0), 0) };
  killCache.set(key, value);
  return value;
}

// Builds share a handful of range multipliers and velocities, so window averages are cached like averageTtk.
const windowCache = new Map<string, { hits: number; oneShot: number } | number | null>();
function cached<T extends { hits: number; oneShot: number } | number | null>(key: string, compute: () => T): T {
  if (windowCache.has(key)) return windowCache.get(key) as T;
  if (windowCache.size > 50_000) windowCache.clear();
  const value = compute();
  windowCache.set(key, value);
  return value;
}

/** Hits to kill and one-shot share, averaged over fights from half to one and a half times the distance. */
export function killAt(weapon: WeaponData, distanceM: number, rangeMult: number, aim: Aim): { hits: number; oneShot: number } | null {
  return cached(`k|${weapon.id}|${distanceM}|${rangeMult}|${aim.name}`, () => computeKillAt(weapon, distanceM, rangeMult, aim));
}

function computeKillAt(weapon: WeaponData, distanceM: number, rangeMult: number, aim: Aim): { hits: number; oneShot: number } | null {
  if (!weapon.damage?.length) return null;
  let hits = 0, oneShot = 0, count = 0;
  for (let d = distanceM * .5; d <= distanceM * 1.5 + 1e-9; d += .25) {
    const index = weapon.damage.findIndex(item => d >= item.minM * rangeMult && (item.maxM === null || d < item.maxM * rangeMult));
    if (index < 0) continue;
    const band = bandKill(weapon, index, aim);
    hits += band.hits; oneShot += band.oneShot; count++;
  }
  return count ? { hits: hits / count, oneShot: oneShot / count } : null;
}

/** Expected time from the first shot to the kill: every extra shot, hit or miss, costs one shot interval. */
function followUpMs(kill: { hits: number }, aim: Aim, intervalMs: number) {
  return (kill.hits / (1 - aim.miss) - 1) * intervalMs;
}

/** Time between shots. A bolt action waits for both its fire rate and its rechamber, both from CODMunity. A revolver's
 * pre-fire delay comes before every shot. */
export function shotInterval(weapon: WeaponData, stats: Record<string, number>) {
  const base = weapon.base!;
  const fire = 60_000 / (weapon.rpm! * ratio(stats, base, 'rpm'));
  const cycle = base.rechamber ? Math.max(fire, stats.rechamber) : fire;
  return cycle + (weapon.fireMode === 'semi' ? stats.pre_fire_delay ?? 0 : 0);
}

/** Bullet travel time averaged over the fight window. Bullets hit instantly inside the hitscan range, and velocity
 * attachments stretch that range by the same multiplier: CODMunity shows the Mosin's 35 m becoming 42 m with +20% velocity. */
function travelMs(weapon: WeaponData, stats: Record<string, number>, distanceM: number): number {
  return cached(`t|${weapon.id}|${distanceM}|${stats.bv}`, () => computeTravel(weapon, stats, distanceM));
}

function computeTravel(weapon: WeaponData, stats: Record<string, number>, distanceM: number) {
  const base = weapon.base!;
  if (!base.bv || !stats.bv) return 0;
  const scale = stats.bv / base.bv, hitscan = (base.hitscan_range ?? 0) * scale;
  let total = 0, count = 0;
  for (let d = distanceM * .5; d <= distanceM * 1.5 + 1e-9; d += .25) { total += Math.max(0, d - hitscan) / stats.bv * 1000; count++; }
  return total / count;
}

function ratio(stats: Record<string, number>, base: Record<string, number>, stat: string) {
  return base[stat] ? stats[stat] / base[stat] : 1;
}
function mean(values: number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }

export function recoilRatio(stats: Record<string, number>, base: Record<string, number>) {
  return (2 * ratio(stats, base, 'vert_recoil') + ratio(stats, base, 'horiz_recoil') + 2 * ratio(stats, base, 'vert_gun_kick') + ratio(stats, base, 'horiz_gun_kick')) / 6;
}

/** True when the gun's time to kill is modeled: automatics by chest TTK, bolt and semi-auto guns by shots to kill. */
export function fullModel(weapon: WeaponData) {
  return !!weapon.damage?.length && !!weapon.rpm && (weapon.fireMode === 'auto' || weapon.fireMode === 'semi' || weapon.fireMode === 'single');
}

/** Improvement over stock for each metric. Positive is better. ADS, sprint-to-fire, swap, travel and kill time are milliseconds saved. */
export function metrics(weapon: WeaponData, stats: Record<string, number>, distanceM: number, style: Playstyle): { values: Record<MetricId, number>; ttkMs: number | null; oneShot: number | null } {
  const base = weapon.base!;
  const rangeMult = ratio(stats, base, 'range');
  const magazine = Math.round((weapon.magazine ?? base.mag_size) * ratio(stats, base, 'mag_size'));
  const rpm = weapon.rpm ? weapon.rpm * ratio(stats, base, 'rpm') : null;
  // Range and fire rate are split so each can be tuned on its own. At equal weights they add up to the full TTK change.
  let ttk: number, fireRate: number, ttkMs: number | null = null, oneShot: number | null = null;
  const aim = style.aim;
  if (weapon.fireMode === 'auto' && fullModel(weapon)) {
    const baseTtk = averageTtk(weapon, distanceM), rangeOnly = averageTtk(weapon, distanceM, rangeMult, magazine);
    const full = averageTtk(weapon, distanceM, rangeMult, magazine, rpm);
    ttk = baseTtk && rangeOnly ? baseTtk - rangeOnly : (rangeMult - 1) * 100;
    fireRate = rangeOnly && full ? rangeOnly - full : 0;
    ttkMs = baseTtk ? full : null;
  } else if (aim && fullModel(weapon)) {
    const stock = killAt(weapon, distanceM, 1, aim)!, ranged = killAt(weapon, distanceM, rangeMult, aim)!;
    const before = shotInterval(weapon, base), after = shotInterval(weapon, stats);
    ttk = followUpMs(stock, aim, before) - followUpMs(ranged, aim, before);
    // A pre-fire delay also comes before the first shot.
    fireRate = followUpMs(ranged, aim, before) - followUpMs(ranged, aim, after) + (weapon.fireMode === 'semi' ? (base.pre_fire_delay ?? 0) - (stats.pre_fire_delay ?? 0) : 0);
    oneShot = ranged.oneShot;
  } else {
    // No kill model: each percent of damage range counts as a millisecond, and a faster cycle saves time on the
    // share of fights that need a second shot.
    ttk = (rangeMult - 1) * 100;
    fireRate = weapon.rpm && rpm ? (shotInterval(weapon, base) - shotInterval(weapon, stats)) * (style.followUps ?? 1) : 0;
  }
  const values: Record<MetricId, number> = {
    ads: base.ads - stats.ads,
    stf: base.stf - stats.stf,
    ttk,
    fireRate,
    recoil: (1 - recoilRatio(stats, base)) * 100,
    mobility: (mean(['movement', 'sprint', 'tac_sprint', 'strafe_movement'].map(stat => ratio(stats, base, stat))) - 1) * 100,
    adsMove: (ratio(stats, base, 'ads_movement') - 1) * 100,
    flinch: (1 - ratio(stats, base, 'flinch_received')) * 100,
    // MW4 has no hip-fire bloom, so sway, bob and turn sway place hip-fire shots.
    hipfire: (1 - mean([ratio(stats, base, 'hip_idle_sway'), ratio(stats, base, 'hip_gun_bob'), ratio(stats, base, 'hip_turn_sway')])) * 100,
    magazine: Math.log(ratio(stats, base, 'mag_size')) * 100,
    reload: (1 - ratio(stats, base, 'reload')) * 100,
    velocity: travelMs(weapon, base, distanceM) - travelMs(weapon, stats, distanceM),
    sway: (1 - ratio(stats, base, 'ads_idle_sway')) * 100,
    swap: (base.raise_speed ?? 0) - (stats.raise_speed ?? 0),
    steady: base.rechamber_aim ? (1 - ratio(stats, base, 'rechamber_aim')) * 100 : 0,
  };
  return { values, ttkMs, oneShot };
}

/** Score in fight-time milliseconds. shotMs is what one missed shot costs on this weapon. */
export function score(values: Record<MetricId, number>, weights: Weights, shotMs = REFERENCE_SHOT_MS) {
  let total = 0;
  for (const id of metricIds) total += weights[id] * values[id] * (id === 'recoil' ? shotMs / 100 : 1);
  if (values.recoil < 0) total -= EXCESS_RECOIL * (Math.max(weights.recoil, 0) / 3) * (shotMs / REFERENCE_SHOT_MS) * values.recoil ** 2;
  return total;
}

/** What one missed shot costs. Capped at 100 ms for slow automatics. Semi-auto and single-shot guns
 * recover between shots, so recoil counts at half the reference. */
export function missedShotMs(weapon: WeaponData) {
  if (weapon.fireMode !== 'auto' && weapon.fireMode !== 'burst') return REFERENCE_SHOT_MS / 2;
  return Math.min(weapon.rpm ? 60_000 / weapon.rpm : REFERENCE_SHOT_MS, 100);
}

function relevantStats(weights: Weights) {
  return [...new Set(metricIds.filter(id => weights[id] > 0).flatMap(id => METRIC_STATS[id]))];
}

/** True when a is at least as good as b on every scored stat and strictly better on one. */
function dominates(a: Option, b: Option, stats: string[]) {
  let strictly = false;
  for (const stat of stats) {
    const x = a.mods[stat] ?? 1, y = b.mods[stat] ?? 1;
    const better = LOWER_BETTER.has(stat) ? x < y : x > y;
    const worse = LOWER_BETTER.has(stat) ? x > y : x < y;
    if (worse) return false;
    if (better) strictly = true;
  }
  return strictly;
}

/** The gun's slug ammunition, which the data lists without its damage or range. */
export function slugAmmo(data: GameData, weapon: WeaponData) {
  return (data.loadouts[weapon.id] ?? []).find(([id]) => data.attachments[id].slot === 'ammunition' && /slug/i.test(data.attachments[id].name)) ?? null;
}

/** Whether the build must carry an optic. Sniper playstyles keep the gun's own scope, hip-fire ones run none. */
export function opticOn(settings: Pick<Settings, 'optic'>, style: Playstyle) { return style.optic === 'choice' && settings.optic; }

export function availableOptions(data: GameData, weapon: WeaponData, settings: Settings): Option[] {
  return (data.loadouts[weapon.id] ?? [])
    .filter(([id, level]) => level <= settings.level && !settings.excluded.includes(id))
    .map(([id, level, mods]) => ({ id, slot: data.attachments[id].slot, level, mods }));
}

export function apexState(weapon: WeaponData, level: number): { available: boolean; reason: string | null } {
  if (!weapon.apex) return { available: false, reason: `${weapon.name} has no Apex attachment.` };
  const needed = weapon.apex.level ?? weapon.maxLevel;
  if (needed && level < needed) return { available: false, reason: `${weapon.apex.name} unlocks at weapon level ${needed}.` };
  return { available: true, reason: null };
}

// collect receives the ranked pool the stability check rescores, so tests can compare it to a full search.
// optic overrides the playstyle's optic rule, so a site build that runs an optic is compared with a best build that does too.
type SearchOptions = { prune?: boolean; keep?: number; collect?: BuildResult[]; optic?: boolean };

// Each stability sample scales every weight by up to 1.6x either way and moves the fight distance by up to 30%.
// Builds within TIE_MS of each other count as a tie: smaller differences are below what the data can resolve.
export const STABILITY = { samples: 200, weightSpread: 1.6, distanceSpread: .3, pool: 1000 };
export const TIE_MS = 5;

/** Seeded generator, so the same settings always report the same stability. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Rescores the best builds under nearby priorities and distances and reports how well the winner holds. */
export function stability(weapon: WeaponData, pool: BuildResult[], settings: Settings, samples = STABILITY.samples): Stability | null {
  if (pool.length < 2) return null;
  const random = seeded(`${weapon.id}|${pool[0].apex}|${pool[0].attachments.join()}|${settings.distanceM}`);
  const style = playstyleFor(weapon, settings.preset);
  const base = weightsFor(settings, style), shot = missedShotMs(weapon);
  const cache = new Map<string, Record<MetricId, number>>();
  const used = new Map<string, number>();
  let wins = 0, near = 0;
  for (let sample = 0; sample < samples; sample++) {
    const weights = Object.fromEntries(metricIds.map(id => [id, base[id] * Math.exp((random() * 2 - 1) * Math.log(STABILITY.weightSpread))])) as Weights;
    const distance = Math.max(2, Math.round(settings.distanceM * (1 + (random() * 2 - 1) * STABILITY.distanceSpread)));
    let bestScore = -Infinity, winner = 0, ours = 0;
    pool.forEach((build, index) => {
      const key = `${distance}|${index}`;
      let values = cache.get(key);
      if (!values) { values = metrics(weapon, build.stats, distance, style).values; cache.set(key, values); }
      const value = score(values, weights, shot);
      if (index === 0) ours = value;
      if (value > bestScore) { bestScore = value; winner = index; }
    });
    if (winner === 0) wins++;
    if (ours >= bestScore - TIE_MS) near++;
    for (const id of pool[winner].attachments) used.set(id, (used.get(id) ?? 0) + 1);
  }
  const share = (id: string) => (used.get(id) ?? 0) / samples;
  return {
    samples, nearBest: near / samples, wins: wins / samples, gapMs: pool[0].score - pool[1].score,
    parts: pool[0].attachments.map(id => ({ id, share: share(id) })),
    contenders: [...used.keys()].filter(id => !pool[0].attachments.includes(id) && share(id) >= .25)
      .map(id => ({ id, share: share(id) })).sort((a, b) => b.share - a.share),
  };
}

export function optimizeClass(data: GameData, weapon: WeaponData, settings: Settings, useApex: boolean, options: SearchOptions = {}): ClassResult {
  const variant = useApex ? 'apex' : 'standard';
  const empty = (reason: string): ClassResult => ({ variant, available: false, reason, best: null, alternatives: [], evaluated: 0, stability: null });
  if (!weapon.base) return empty(`No attachment stat data is published for ${weapon.name}.`);
  if (useApex) {
    const state = apexState(weapon, settings.level);
    if (!state.available) return empty(state.reason!);
  }
  const blocked = new Set(useApex ? weapon.apex!.blocks : []);
  const style = playstyleFor(weapon, settings.preset);
  const slug = slugAmmo(data, weapon);
  const pool = availableOptions(data, weapon, settings).filter(option => style.ammo !== 'pellets' || option.id !== slug?.[0]);
  const locked = settings.locked.filter(id => (data.loadouts[weapon.id] ?? []).some(entry => entry[0] === id));
  if (style.ammo === 'slug') {
    if (!slug) return empty(`${weapon.name} has no slug ammunition.`);
    if (slug[1] > settings.level) return empty(`${data.attachments[slug[0]].name} unlocks at weapon level ${slug[1]}.`);
    if (!locked.includes(slug[0])) locked.push(slug[0]);
  }
  for (const id of locked) {
    const option = pool.find(item => item.id === id);
    if (!option) return empty(`${data.attachments[id]?.name ?? id} is locked but not unlocked at weapon level ${settings.level}.`);
    if (blocked.has(option.slot)) return empty(`${data.attachments[id].name} is locked, but ${weapon.apex!.name} blocks the ${option.slot.replace('-', ' ')} slot.`);
  }
  const lockedSlots = new Map<string, Option>();
  for (const id of locked) {
    const option = pool.find(item => item.id === id)!;
    if (lockedSlots.has(option.slot)) return empty(`Two locked attachments use the ${option.slot.replace('-', ' ')} slot.`);
    lockedSlots.set(option.slot, option);
  }
  if (lockedSlots.size > ATTACHMENT_LIMIT) return empty(`Lock at most ${ATTACHMENT_LIMIT} attachments.`);

  const weights = weightsFor(settings, style);
  const shot = missedShotMs(weapon);
  const stats = relevantStats(weights);
  const optic = options.optic ?? opticOn(settings, style);
  const slots = new Map<string, Option[]>();
  for (const option of pool) {
    if (blocked.has(option.slot)) continue;
    if (option.slot === 'optic' && !optic && !lockedSlots.has('optic')) continue;
    const list = slots.get(option.slot) ?? [];
    list.push(option);
    slots.set(option.slot, list);
  }
  for (const [slot, list] of slots) {
    const fixed = lockedSlots.get(slot);
    if (fixed) { slots.set(slot, [fixed]); continue; }
    if (options.prune === false) continue;
    // Drop options another one beats on every scored stat, then keep one of each group with identical scored stats,
    // such as the optics, which all list no changes. The first is the lowest unlock level.
    const kept = list.filter(option => !list.some(other => other !== option && dominates(other, option, stats)));
    const seen = new Set<string>();
    slots.set(slot, kept.filter(option => { const key = stats.map(stat => option.mods[stat] ?? 1).join(); if (seen.has(key)) return false; seen.add(key); return true; }));
  }
  const requireOptic = optic && blocked.has('optic') === false && slots.has('optic');
  const required = new Set([...lockedSlots.keys(), ...(requireOptic ? ['optic'] : [])]);
  const order = [...slots.keys()].sort((a, b) => Number(required.has(b)) - Number(required.has(a)) || a.localeCompare(b));
  const apexMods = useApex ? [weapon.apex!.mods ?? {}] : [];
  const keep = options.keep ?? STABILITY.pool;
  const top: BuildResult[] = [];
  let evaluated = 0;

  const evaluate = (chosen: Option[]): BuildResult => {
    const finalStats = applyMods(weapon.base!, [...apexMods, ...chosen.map(item => item.mods)]);
    const { values, ttkMs, oneShot } = metrics(weapon, finalStats, settings.distanceM, style);
    return { apex: useApex, attachments: chosen.map(item => item.id), stats: finalStats, metrics: values, score: score(values, weights, shot), ttkMs, oneShot, contributions: [] };
  };
  const visit = (index: number, chosen: Option[]) => {
    if (index === order.length) {
      evaluated++;
      const result = evaluate(chosen);
      if (top.length >= keep && result.score <= top[top.length - 1].score) return;
      // Binary insertion keeps the list sorted, with earlier builds first on ties.
      let low = 0, high = top.length;
      while (low < high) { const mid = (low + high) >> 1; if (top[mid].score >= result.score) low = mid + 1; else high = mid; }
      top.splice(low, 0, result);
      if (top.length > keep) top.pop();
      return;
    }
    const slot = order[index];
    if (!required.has(slot)) visit(index + 1, chosen);
    if (chosen.length >= ATTACHMENT_LIMIT) return;
    for (const option of slots.get(slot)!) visit(index + 1, [...chosen, option]);
  };
  visit(0, []);
  const best = top[0] ?? null;
  // A search with a set keep is an inner search: a full-search check, a site-build reading or a wider stability pool.
  const outer = options.keep === undefined;
  let ranked = [...top];
  if (best && outer && style.aim && fullModel(weapon) && weapon.fireMode !== 'auto') {
    // On one-shot guns a few meters can flip a kill, so the best builds change sharply with distance. The stability
    // pool also takes the best builds at the near and far ends of the nudged distances, rescored at yours.
    const seen = new Set(top.map(build => build.attachments.join()));
    const extra: BuildResult[] = [];
    for (const factor of [1 - STABILITY.distanceSpread, 1 + STABILITY.distanceSpread]) {
      optimizeClass(data, weapon, { ...settings, distanceM: Math.max(2, Math.round(settings.distanceM * factor)) }, useApex, { keep: STABILITY.pool, collect: extra, optic: options.optic, prune: options.prune });
    }
    for (const build of extra) {
      const key = build.attachments.join();
      if (seen.has(key)) continue;
      seen.add(key);
      ranked.push(evaluate(build.attachments.map(id => pool.find(item => item.id === id)!)));
    }
    ranked = [top[0], ...ranked.slice(1).sort((a, b) => b.score - a.score)];
  }
  options.collect?.push(...ranked);
  if (best) {
    const chosen = best.attachments.map(id => pool.find(item => item.id === id)!);
    best.contributions = chosen.map(item => ({ id: item.id, score: best.score - evaluate(chosen.filter(other => other !== item)).score }))
      .sort((a, b) => b.score - a.score);
  }
  const alternatives = top.slice(1).filter((build, index, list) => list.findIndex(other => other.attachments.join() === build.attachments.join()) === index).slice(0, 3);
  return { variant, available: true, reason: null, best, alternatives, evaluated, stability: best && outer ? stability(weapon, ranked, settings) : null };
}

/** Scores a given set of attachments, for guide builds and the compare view. Problems are listed, not fixed. */
export function evaluateBuild(data: GameData, weapon: WeaponData, settings: Settings, attachmentIds: string[], useApex: boolean): { build: BuildResult | null; issues: string[] } {
  if (!weapon.base) return { build: null, issues: [`No attachment stat data is published for ${weapon.name}.`] };
  const issues: string[] = [];
  const known = new Map((data.loadouts[weapon.id] ?? []).map(([id, level, mods]) => [id, { id, slot: data.attachments[id].slot, level, mods }]));
  const chosen: Option[] = [];
  for (const id of attachmentIds) {
    const option = known.get(id);
    if (!option) { issues.push(`${data.attachments[id]?.name ?? id} is not listed for the ${weapon.name}.`); continue; }
    if (chosen.some(item => item.slot === option.slot)) issues.push(`Two parts use the ${option.slot.replace('-', ' ')} slot.`);
    if (useApex && weapon.apex?.blocks.includes(option.slot)) issues.push(`${weapon.apex.name} blocks the ${option.slot.replace('-', ' ')} slot.`);
    chosen.push(option);
  }
  if (chosen.length > ATTACHMENT_LIMIT) issues.push(`${chosen.length} attachments, one more than the game allows.`);
  const style = playstyleFor(weapon, settings.preset), slug = slugAmmo(data, weapon)?.[0];
  if (slug && style.ammo === 'slug' && !attachmentIds.includes(slug)) issues.push(`Runs pellets, but the ${style.name} playstyle assumes slugs.`);
  if (slug && style.ammo === 'pellets' && attachmentIds.includes(slug)) issues.push(`Runs slugs, which the ${style.name} playstyle leaves out.`);
  if (useApex && !weapon.apex) issues.push(`${weapon.name} has no Apex attachment.`);
  const apex = useApex && weapon.apex;
  const weights = weightsFor(settings, style), shot = missedShotMs(weapon);
  const evaluate = (list: Option[]): BuildResult => {
    const stats = applyMods(weapon.base!, [...(apex ? [weapon.apex!.mods ?? {}] : []), ...list.map(item => item.mods)]);
    const { values, ttkMs, oneShot } = metrics(weapon, stats, settings.distanceM, style);
    return { apex: !!apex, attachments: list.map(item => item.id), stats, metrics: values, score: score(values, weights, shot), ttkMs, oneShot, contributions: [] };
  };
  const build = evaluate(chosen);
  build.contributions = chosen.map(item => ({ id: item.id, score: build.score - evaluate(chosen.filter(other => other !== item)).score }));
  return { build, issues };
}

export function scoreMeta(data: GameData, weapon: WeaponData, settings: Settings, builds: MetaBuild[]): ScoredMeta[] {
  return builds.map(meta => {
    const { build, issues } = evaluateBuild(data, weapon, settings, meta.attachments, meta.apex);
    if (meta.unmatched.length) issues.unshift(`Not scored: ${meta.unmatched.join(', ')}.`);
    return { ...meta, build, issues };
  });
}

export function stockBuild(weapon: WeaponData, settings: Settings): BuildResult | null {
  if (!weapon.base) return null;
  const { values, ttkMs, oneShot } = metrics(weapon, weapon.base, settings.distanceM, playstyleFor(weapon, settings.preset));
  return { apex: false, attachments: [], stats: { ...weapon.base }, metrics: values, score: 0, ttkMs, oneShot, contributions: [] };
}

export function optimize(data: GameData, settings: Settings): OptimizeResult {
  const weapon = data.weapons.find(item => item.id === settings.weaponId);
  const warnings: string[] = [];
  if (!weapon) {
    const missing: ClassResult = { variant: 'standard', available: false, reason: 'Choose a weapon.', best: null, alternatives: [], evaluated: 0, stability: null };
    return { stock: null, standard: missing, apex: { ...missing, variant: 'apex' }, baseTtkMs: null, warnings: ['Choose a weapon.'], gear: null, meta: [] };
  }
  if (weapon.apex && !weapon.apex.mods) warnings.push(`CODMunity lists no stat changes for ${weapon.apex.name}. Its build only accounts for the slots it blocks.`);
  return {
    stock: stockBuild(weapon, settings),
    standard: optimizeClass(data, weapon, settings, false),
    apex: optimizeClass(data, weapon, settings, true),
    baseTtkMs: averageTtk(weapon, settings.distanceM),
    warnings,
    gear: data.gear.length ? recommendGear(data, weapon, settings) : null,
    meta: scoreMeta(data, weapon, settings, data.meta[weapon.id] ?? []),
  };
}
