import { metricIds } from '../types.ts';
import type { BuildResult, ClassResult, GameData, MetaBuild, MetricId, Mods, OptimizeResult, PresetId, ScoredMeta, Settings, Stability, WeaponData, Weights } from '../types.ts';
import { recommendGear } from './gear.ts';

// Scores are in milliseconds of fight time, or a millisecond equivalent for stats without a time unit.
// ADS, sprint-to-fire and time to kill count in real milliseconds saved. Recoil counts as the share of a
// missed shot it saves: a recoil weight of 3 means 1% less recoil saves 3% of one shot interval, so slower firing
// guns value it more. Everything else is a percent with a small weight.
// The weights encode which stats decide real fights: first shot and landing shots first, idle sway near zero.
export const PRESETS: Record<PresetId, { name: string; blurb: string; distanceM: number; weights: Weights }> = {
  allround: {
    name: 'All-around', blurb: 'Fast aim and first shot, recoil you can hold, range for mid lanes.', distanceM: 15,
    weights: { ads: 1, stf: .6, ttk: 1, recoil: 3, mobility: 1, adsMove: .3, flinch: .1, hipfire: .1, magazine: .15, reload: .05, velocity: .05, sway: 0 },
  },
  close: {
    name: 'Rush', blurb: 'Small maps and corners. Sprint-to-fire, movement and hip fire first.', distanceM: 8,
    weights: { ads: .8, stf: 1, ttk: 1, recoil: 2, mobility: 2, adsMove: .5, flinch: .1, hipfire: .5, magazine: .1, reload: .05, velocity: 0, sway: 0 },
  },
  long: {
    name: 'Long lanes', blurb: 'Hold sightlines. Damage range and recoil control decide these fights.', distanceM: 30,
    weights: { ads: .8, stf: .2, ttk: 1, recoil: 3.5, mobility: .3, adsMove: .1, flinch: .2, hipfire: 0, magazine: .2, reload: .05, velocity: .3, sway: .05 },
  },
  control: {
    name: 'Low recoil', blurb: 'For a gun that kicks too hard for you. Recoil reduction above all.', distanceM: 20,
    weights: { ads: .7, stf: .4, ttk: 1, recoil: 6, mobility: .5, adsMove: .2, flinch: .2, hipfire: .05, magazine: .15, reload: .05, velocity: .1, sway: .05 },
  },
};

export const METRICS: Record<MetricId, { name: string; help: string; unit: 'ms' | '%' }> = {
  ads: { name: 'ADS speed', help: 'Time to aim down sights.', unit: 'ms' },
  stf: { name: 'Sprint to fire', help: 'Time from sprinting to your first shot.', unit: 'ms' },
  ttk: { name: 'Damage range', help: 'Average time to kill across fights near your typical distance.', unit: 'ms' },
  recoil: { name: 'Recoil control', help: 'Recoil and gun kick, vertical counted double.', unit: '%' },
  mobility: { name: 'Movement', help: 'Walk, strafe, sprint and tactical sprint speed.', unit: '%' },
  adsMove: { name: 'ADS movement', help: 'Strafe speed while aiming.', unit: '%' },
  flinch: { name: 'Flinch', help: 'Aim punch when you get hit.', unit: '%' },
  hipfire: { name: 'Hip fire', help: 'Hip-fire sway and gun bob.', unit: '%' },
  magazine: { name: 'Magazine', help: 'Rounds per magazine.', unit: '%' },
  reload: { name: 'Reload', help: 'Reload time.', unit: '%' },
  velocity: { name: 'Bullet velocity', help: 'Projectile speed.', unit: '%' },
  sway: { name: 'Aim sway', help: 'Idle sway while aiming. Rarely matters.', unit: '%' },
};

export function weightsFor(settings: Pick<Settings, 'preset' | 'emphasis'>): Weights {
  const base = PRESETS[settings.preset].weights;
  return Object.fromEntries(metricIds.map(id => [id, base[id] * (settings.emphasis[id] ?? 1)])) as Weights;
}

export const ATTACHMENT_LIMIT = 5;
// Recoil above stock gets harder to control faster than linearly.
const EXCESS_RECOIL = .05;
// Recoil weights are calibrated on the VEL 46, whose missed shot costs 63 ms.
const REFERENCE_SHOT_MS = 60_000 / 952;
const LOWER_BETTER = new Set(['ads', 'ads_out', 'stf', 'reload', 'raise_speed', 'drop_speed', 'vert_recoil', 'horiz_recoil', 'vert_gun_kick', 'horiz_gun_kick', 'ads_idle_sway', 'ads_gun_bob', 'hip_idle_sway', 'hip_gun_bob', 'hip_turn_sway', 'flinch_received']);
const METRIC_STATS: Record<MetricId, string[]> = {
  ads: ['ads'], stf: ['stf'], recoil: ['vert_recoil', 'horiz_recoil', 'vert_gun_kick', 'horiz_gun_kick'], ttk: ['range', 'rpm', 'mag_size'],
  mobility: ['movement', 'sprint', 'tac_sprint', 'strafe_movement'], adsMove: ['ads_movement'], flinch: ['flinch_received'],
  hipfire: ['hip_idle_sway', 'hip_gun_bob'], magazine: ['mag_size'], reload: ['reload'], velocity: ['bv'], sway: ['ads_idle_sway'],
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

function ratio(stats: Record<string, number>, base: Record<string, number>, stat: string) {
  return base[stat] ? stats[stat] / base[stat] : 1;
}
function mean(values: number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }

export function recoilRatio(stats: Record<string, number>, base: Record<string, number>) {
  return (2 * ratio(stats, base, 'vert_recoil') + ratio(stats, base, 'horiz_recoil') + 2 * ratio(stats, base, 'vert_gun_kick') + ratio(stats, base, 'horiz_gun_kick')) / 6;
}

/** Improvement over stock for each metric. Positive is better. ADS, sprint-to-fire and TTK are milliseconds saved. */
export function metrics(weapon: WeaponData, stats: Record<string, number>, distanceM: number): { values: Record<MetricId, number>; ttkMs: number | null } {
  const base = weapon.base!;
  const rangeMult = ratio(stats, base, 'range');
  const magazine = Math.round((weapon.magazine ?? base.mag_size) * ratio(stats, base, 'mag_size'));
  const baseTtk = averageTtk(weapon, distanceM);
  const rpm = weapon.rpm ? weapon.rpm * ratio(stats, base, 'rpm') : null;
  const ttkMs = averageTtk(weapon, distanceM, rangeMult, magazine, rpm);
  const values: Record<MetricId, number> = {
    ads: base.ads - stats.ads,
    stf: base.stf - stats.stf,
    // Without an automatic-fire TTK model, each percent of damage range counts as a millisecond.
    ttk: baseTtk && ttkMs ? baseTtk - ttkMs : (rangeMult - 1) * 100,
    recoil: (1 - recoilRatio(stats, base)) * 100,
    mobility: (mean(['movement', 'sprint', 'tac_sprint', 'strafe_movement'].map(stat => ratio(stats, base, stat))) - 1) * 100,
    adsMove: (ratio(stats, base, 'ads_movement') - 1) * 100,
    flinch: (1 - ratio(stats, base, 'flinch_received')) * 100,
    hipfire: (1 - mean([ratio(stats, base, 'hip_idle_sway'), ratio(stats, base, 'hip_gun_bob')])) * 100,
    magazine: Math.log(ratio(stats, base, 'mag_size')) * 100,
    reload: (1 - ratio(stats, base, 'reload')) * 100,
    velocity: (ratio(stats, base, 'bv') - 1) * 100,
    sway: (1 - ratio(stats, base, 'ads_idle_sway')) * 100,
  };
  return { values, ttkMs: baseTtk ? ttkMs : null };
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

/** True when the stat model covers what decides this weapon's fights. */
export function fullModel(weapon: WeaponData) { return weapon.fireMode === 'auto' && !!weapon.damage?.length; }

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
type SearchOptions = { prune?: boolean; keep?: number; collect?: BuildResult[] };

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
  const base = weightsFor(settings), shot = missedShotMs(weapon);
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
      if (!values) { values = metrics(weapon, build.stats, distance).values; cache.set(key, values); }
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
  const pool = availableOptions(data, weapon, settings);
  const locked = settings.locked.filter(id => (data.loadouts[weapon.id] ?? []).some(entry => entry[0] === id));
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

  const weights = weightsFor(settings);
  const shot = missedShotMs(weapon);
  const stats = relevantStats(weights);
  const slots = new Map<string, Option[]>();
  for (const option of pool) {
    if (blocked.has(option.slot)) continue;
    if (option.slot === 'optic' && !settings.optic && !lockedSlots.has('optic')) continue;
    const list = slots.get(option.slot) ?? [];
    list.push(option);
    slots.set(option.slot, list);
  }
  for (const [slot, list] of slots) {
    const fixed = lockedSlots.get(slot);
    if (fixed) { slots.set(slot, [fixed]); continue; }
    if (options.prune !== false) slots.set(slot, list.filter(option => !list.some(other => other !== option && dominates(other, option, stats))));
  }
  const requireOptic = settings.optic && blocked.has('optic') === false && slots.has('optic');
  const required = new Set([...lockedSlots.keys(), ...(requireOptic ? ['optic'] : [])]);
  const order = [...slots.keys()].sort((a, b) => Number(required.has(b)) - Number(required.has(a)) || a.localeCompare(b));
  const apexMods = useApex ? [weapon.apex!.mods ?? {}] : [];
  const keep = options.keep ?? STABILITY.pool;
  const top: BuildResult[] = [];
  let evaluated = 0;

  const evaluate = (chosen: Option[]): BuildResult => {
    const finalStats = applyMods(weapon.base!, [...apexMods, ...chosen.map(item => item.mods)]);
    const { values, ttkMs } = metrics(weapon, finalStats, settings.distanceM);
    return { apex: useApex, attachments: chosen.map(item => item.id), stats: finalStats, metrics: values, score: score(values, weights, shot), ttkMs, contributions: [] };
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
  options.collect?.push(...top);
  const best = top[0] ?? null;
  if (best) {
    const chosen = best.attachments.map(id => pool.find(item => item.id === id)!);
    best.contributions = chosen.map(item => ({ id: item.id, score: best.score - evaluate(chosen.filter(other => other !== item)).score }))
      .sort((a, b) => b.score - a.score);
  }
  const alternatives = top.slice(1).filter((build, index, list) => list.findIndex(other => other.attachments.join() === build.attachments.join()) === index).slice(0, 3);
  return { variant, available: true, reason: null, best, alternatives, evaluated, stability: best ? stability(weapon, top, settings) : null };
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
  if (useApex && !weapon.apex) issues.push(`${weapon.name} has no Apex attachment.`);
  const apex = useApex && weapon.apex;
  const weights = weightsFor(settings), shot = missedShotMs(weapon);
  const evaluate = (list: Option[]): BuildResult => {
    const stats = applyMods(weapon.base!, [...(apex ? [weapon.apex!.mods ?? {}] : []), ...list.map(item => item.mods)]);
    const { values, ttkMs } = metrics(weapon, stats, settings.distanceM);
    return { apex: !!apex, attachments: list.map(item => item.id), stats, metrics: values, score: score(values, weights, shot), ttkMs, contributions: [] };
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
  const { values, ttkMs } = metrics(weapon, weapon.base, settings.distanceM);
  return { apex: false, attachments: [], stats: { ...weapon.base }, metrics: values, score: 0, ttkMs, contributions: [] };
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
