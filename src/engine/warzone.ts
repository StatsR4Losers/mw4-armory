// Warzone loadouts: two guns that cover each other's distances. Each gun runs its best Warzone build, worked out ahead
// of time with every part unlocked. A fight at a distance takes the time to aim in, the bullets it takes to kill through
// 300 health with misses counted, any reload that needs, and the bullet's travel time. A loadout takes each fight with
// whichever of its two guns wins it faster.
import { AIMS, playstylesFor, roleOf } from './playstyles.ts';
import type { Playstyle, Role } from './playstyles.ts';
import { applyMods, fullModel, killAt, shotInterval } from './index.ts';
import type { GameData, WeaponData } from '../types.ts';

export const DISTANCES = [5, 10, 15, 20, 30, 40, 50, 60, 75, 100, 125, 150];

// The distance where half of a class's shots miss a moving target, for a gun with its class's typical recoil. Misses
// grow with distance squared past it. These are this site's assumptions, not measurements.
export const HALF_MISS_M: Record<Role, number> = { shotgun: 10, pistol: 25, smg: 30, ar: 60, lmg: 70, dmr: 90, bolt: 200, sniper: 250 };
// Recoil moves that distance: half the class's typical recoil keeps hitting about 40% farther. Bolt actions and
// snipers fire one aimed shot at a time, so recoil does not move theirs.
const RECOIL_SCALED = new Set<Role>(['smg', 'ar', 'lmg', 'dmr', 'pistol']);
const recoilOf = (stats: Record<string, number>) => (stats.vert_recoil ?? 0) + (stats.horiz_recoil ?? 0);

// How often fights happen at each distance in DISTANCES, by kind of match. Also this site's assumptions.
export const MIXES = {
  close: { name: 'Close quarters', blurb: 'Resurgence maps, buildings and rooftops. Most fights inside 30 m.', weights: [12, 14, 14, 12, 12, 10, 8, 6, 5, 4, 2, 1] },
  mixed: { name: 'Mixed', blurb: 'A full-size map played normally. Most fights from 15 to 75 m.', weights: [6, 8, 10, 10, 12, 12, 10, 9, 8, 7, 5, 3] },
  long: { name: 'Long sight lines', blurb: 'Open ground and hills. Many fights past 50 m.', weights: [3, 4, 6, 7, 9, 10, 11, 11, 11, 10, 9, 9] },
} as const;
export type MixId = keyof typeof MIXES;

// What each half of a loadout is for. A gun's build for a half comes from its Warzone playstyle for that job.
export type Half = 'long' | 'close';
// Long-range builds keep a slot for an optic, as every CODMunity long-range Warzone build does. Optics change no
// stats, so any optic fills it. Snipers keep their own scope, and close-range builds run iron sights.
export const NEEDS_OPTIC = new Set(['wz-ar-long', 'wz-lmg-long', 'wz-dmr-long', 'wz-bolt-long']);
export const HALF_ROLES: Record<Half, Role[]> = { long: ['ar', 'lmg', 'dmr', 'bolt', 'sniper'], close: ['smg', 'ar', 'pistol'] };

/** The Warzone playstyle a gun plays in one half of a loadout. A sniper's partner plays sniper support. */
export function styleFor(weapon: WeaponData, half: Half, partnerRole?: Role): Playstyle | null {
  const styles = playstylesFor(weapon, 'wz');
  const pick = (id: string) => styles.find(style => style.id === id) ?? null;
  switch (roleOf(weapon)) {
    case 'ar': return pick(half === 'long' ? 'wz-ar-long' : 'wz-ar-close');
    case 'smg': return half === 'close' ? pick(partnerRole === 'sniper' || partnerRole === 'bolt' ? 'wz-smg-support' : 'wz-smg-close') : null;
    case 'pistol': return half === 'close' ? pick('wz-pistol-secondary') : null;
    default: return half === 'long' ? styles[0] ?? null : null;
  }
}

/** Typical recoil of each class in this data: the median of its guns' base recoil. */
const typical = new WeakMap<GameData, Partial<Record<Role, number>>>();
function classRecoil(data: GameData, role: Role) {
  let byRole = typical.get(data);
  if (!byRole) typical.set(data, byRole = {});
  if (byRole[role] === undefined) {
    const values = data.weapons.filter(weapon => weapon.base && roleOf(weapon) === role).map(weapon => recoilOf(weapon.base!)).sort((a, b) => a - b);
    byRole[role] = values.length ? values[Math.floor(values.length / 2)] : 0;
  }
  return byRole[role]!;
}

/** Share of shots that land at a distance. */
export function hitRate(weapon: WeaponData, stats: Record<string, number>, distanceM: number, typicalRecoil: number) {
  const role = roleOf(weapon), own = recoilOf(stats);
  const scale = RECOIL_SCALED.has(role) && own > 0 && typicalRecoil > 0 ? Math.min(1.6, Math.max(.6, Math.sqrt(typicalRecoil / own))) : 1;
  return 1 / (1 + (distanceM / (HALF_MISS_M[role] * scale)) ** 2);
}

/** Fight time at one distance in ms. Null when the data cannot model the gun's damage. */
export function fightTime(weapon: WeaponData, stats: Record<string, number>, style: Playstyle, distanceM: number, typicalRecoil: number): number | null {
  const base = weapon.base!;
  if (!fullModel(weapon)) return null;
  const ratio = (key: string) => base[key] ? stats[key] / base[key] : 1;
  const rangeMult = ratio('range');
  const travel = Math.max(0, distanceM - (base.hitscan_range ?? 0) * ratio('bv')) / stats.bv * 1000;
  const hit = hitRate(weapon, stats, distanceM, typicalRecoil);
  const magazine = Math.max(1, Math.round((weapon.magazine ?? 1) * ratio('mag_size')));
  let bullets: number, interval: number;
  if (weapon.fireMode === 'auto') {
    const chest = weapon.damage!.find(band => distanceM >= band.minM * rangeMult && (band.maxM === null || distanceM < band.maxM * rangeMult))?.regions.chest;
    if (!chest) return null;
    bullets = Math.ceil(weapon.health / chest) / hit;
    interval = 60_000 / ((weapon.rpm ?? 1) * ratio('rpm'));
  } else {
    // Aimed shots: the playstyle's hit spread over body parts and its own miss rate, then the distance misses on top.
    const aim = style.aim ?? AIMS.paced;
    const kill = killAt(weapon, distanceM, rangeMult, aim);
    if (!kill) return null;
    bullets = kill.hits / (1 - aim.miss) / hit;
    interval = shotInterval(weapon, stats);
  }
  // A kill that empties the magazine waits for a reload before the next bullet.
  const reloads = Math.max(0, Math.ceil(bullets / magazine) - 1);
  // Close fights usually start mid-sprint: all of sprint-to-fire inside 15 m, half of it out to 30 m.
  const sprinting = distanceM <= 15 ? 1 : distanceM <= 30 ? .5 : 0;
  return sprinting * stats.stf + stats.ads + (bullets - 1) * interval + reloads * stats.reload + travel;
}

/** Whether a gun's Apex is in its build, and why. */
export type ApexUse = { name: string; used: boolean; reason: 'faster' | 'slower' | 'no-stats' | 'no-build' } | null;
/** A gun with one build: its stats after the build's parts, and its fight time at each distance in DISTANCES. */
export interface Option { weapon: WeaponData; style: Playstyle; attachments: string[]; stats: Record<string, number>; times: (number | null)[]; apex: ApexUse }

function build(data: GameData, weapon: WeaponData, style: Playstyle, attachments: string[], withApex: boolean): Option | null {
  const parts = new Map((data.loadouts[weapon.id] ?? []).map(([id, , mods]) => [id, mods]));
  const mods = attachments.map(id => parts.get(id) ?? {});
  if (withApex) mods.push(weapon.apex!.mods!);
  const stats = applyMods(weapon.base!, mods);
  const reference = classRecoil(data, roleOf(weapon));
  const times = DISTANCES.map(d => fightTime(weapon, stats, style, d, reference));
  return times.every(time => time === null) ? null : { weapon, style, attachments, stats, times, apex: null };
}

/**
 * One gun in one half of a loadout, with its stored best Warzone build. The Apex build is used when its stat changes
 * make the gun's own fights faster in this kind of match. Null when the gun has no build for that job.
 */
export function optionFor(data: GameData, weapon: WeaponData, half: Half, partnerRole?: Role, mix: MixId = 'mixed'): Option | null {
  const style = styleFor(weapon, half, partnerRole);
  const attachments = style && data.warzone?.builds?.[weapon.id]?.[style.id];
  if (!style || !attachments || !weapon.base) return null;
  const plain = build(data, weapon, style, attachments, false);
  if (!plain || !weapon.apex) return plain;
  const name = weapon.apex.name;
  if (!weapon.apex.mods) return { ...plain, apex: { name, used: false, reason: 'no-stats' } };
  const apexParts = data.warzone?.apexBuilds?.[weapon.id]?.[style.id];
  const withApex = apexParts && build(data, weapon, style, apexParts, true);
  if (!withApex) return { ...plain, apex: { name, used: false, reason: 'no-build' } };
  return soloScore(withApex, mix) < soloScore(plain, mix)
    ? { ...withApex, apex: { name, used: true, reason: 'faster' } }
    : { ...plain, apex: { name, used: false, reason: 'slower' } };
}

const mean = (values: number[], weights: readonly number[]) => values.reduce((sum, value, i) => sum + value * weights[i], 0) / weights.reduce((sum, w) => sum + w, 0);

/** The distances a gun is built for: from half its playstyle's distance to double it. */
export const bandOf = (option: Option) => DISTANCES.map(d => d >= option.style.distanceM / 2 && d <= option.style.distanceM * 2);

/** Average fight time over the distances this gun is built for. Ranks guns of one kind against each other. */
export function soloScore(option: Option, mix: MixId): number {
  const band = bandOf(option), weights = MIXES[mix].weights.map((w, i) => band[i] ? w : 0);
  return mean(option.times.map(time => time ?? 0), weights);
}

export interface Pair { long: Option; close: Option; score: number; takes: Half[] }

/** A loadout's average fight time over every distance, taking each fight with its faster gun. */
export function pairScore(long: Option, close: Option, mix: MixId): Pair {
  const takes = DISTANCES.map((_, i) => {
    const a = long.times[i] ?? Infinity, b = close.times[i] ?? Infinity;
    return a <= b ? 'long' as const : 'close' as const;
  });
  const times = takes.map((who, i) => (who === 'long' ? long.times[i] : close.times[i]) ?? 0);
  return { long, close, score: mean(times, MIXES[mix].weights), takes };
}

/** Every allowed pair, fastest first. Each list holds the weapon ids allowed in that half. */
export function bestPairs(data: GameData, mix: MixId, longIds: string[], closeIds: string[], limit = 5): Pair[] {
  const guns = new Map(data.weapons.map(weapon => [weapon.id, weapon]));
  const longs = longIds.map(id => guns.get(id) && optionFor(data, guns.get(id)!, 'long', undefined, mix)).filter((option): option is Option => !!option);
  const pairs: Pair[] = [];
  for (const long of longs) for (const id of closeIds) {
    const gun = guns.get(id);
    if (!gun || id === long.weapon.id) continue;
    const close = optionFor(data, gun, 'close', roleOf(long.weapon), mix);
    if (close) pairs.push(pairScore(long, close, mix));
  }
  return pairs.sort((a, b) => a.score - b.score).slice(0, limit);
}
