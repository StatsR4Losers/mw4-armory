import { metricIds } from '../types.ts';
import type { Consensus, GameData, Settings, WeaponData, Weights } from '../types.ts';
import { evaluateBuild, optimizeClass, slugAmmo } from './index.ts';
import { playstylesFor } from './playstyles.ts';

// Reads what the guide sites are building for. Every fully matched site build is scored under each playstyle of
// its class and compared with the best build for that playstyle. The playstyle where the sites' builds get the
// largest share of the best possible gain is the one they most likely had in mind.

// A lead smaller than this is within the noise of a handful of builds, so no playstyle is called the sites' pick.
export const CLEAR_MARGIN = .05;

const PROFILE: { stat: string; label: string; lowerBetter: boolean }[] = [
  { stat: 'ads', label: 'ADS time', lowerBetter: true },
  { stat: 'stf', label: 'sprint to fire', lowerBetter: true },
  { stat: 'recoil', label: 'recoil', lowerBetter: true },
  { stat: 'range', label: 'damage range', lowerBetter: false },
  { stat: 'rpm', label: 'fire rate', lowerBetter: false },
  { stat: 'ads_idle_sway', label: 'aim sway', lowerBetter: true },
  { stat: 'hip_idle_sway', label: 'hip-fire sway', lowerBetter: true },
  { stat: 'flinch_received', label: 'flinch', lowerBetter: true },
  { stat: 'mobility', label: 'movement', lowerBetter: false },
  { stat: 'ads_movement', label: 'ADS movement', lowerBetter: false },
  { stat: 'bv', label: 'bullet velocity', lowerBetter: false },
  { stat: 'mag_size', label: 'magazine', lowerBetter: false },
];

const statRatio = (stats: Record<string, number>, base: Record<string, number>, stat: string) => {
  if (stat === 'recoil') return ['vert_recoil', 'horiz_recoil', 'vert_gun_kick', 'horiz_gun_kick'].reduce((sum, key) => sum + stats[key] / base[key], 0) / 4;
  if (stat === 'mobility') return ['movement', 'sprint', 'tac_sprint', 'strafe_movement'].reduce((sum, key) => sum + stats[key] / base[key], 0) / 4;
  return base[stat] ? stats[stat] / base[stat] : 1;
};

export function consensusFor(data: GameData, weapon: WeaponData): Consensus | null {
  const builds = (data.meta[weapon.id] ?? []).filter(build => !build.unmatched.length && build.attachments.length);
  if (!weapon.base || !builds.length) return null;
  const slug = slugAmmo(data, weapon)?.[0];
  const neutral = Object.fromEntries(metricIds.map(id => [id, 1])) as Weights;
  const optic = (ids: string[]) => ids.some(id => data.attachments[id]?.slot === 'optic');
  const fit: Consensus['fit'] = {};
  for (const style of playstylesFor(weapon)) {
    const settings: Settings = { weaponId: weapon.id, level: weapon.maxLevel ?? 1, preset: style.id, emphasis: neutral, distanceM: style.distanceM, apex: false, optic: false, locked: [], excluded: [], playerLevel: 55, killBand: 8, streakStyle: 'mixed', gearLocks: {}, streakLocks: [] };
    const best = new Map<string, number | null>();
    const captures: number[] = [];
    for (const build of builds) {
      // Slug builds only speak to slug playstyles, and pellet builds only to pellet ones.
      const slugged = !!slug && build.attachments.includes(slug);
      if ((style.ammo === 'slug' && !slugged) || (style.ammo === 'pellets' && slugged)) continue;
      const { build: scored, issues } = evaluateBuild(data, weapon, settings, build.attachments, build.apex);
      if (!scored || issues.length) continue;
      const key = `${build.apex}|${optic(build.attachments)}`;
      if (!best.has(key)) best.set(key, optimizeClass(data, weapon, settings, build.apex, { keep: 1, optic: optic(build.attachments) }).best?.score ?? null);
      const top = best.get(key);
      if (top && top > 0) captures.push(Math.max(-1, scored.score / top));
    }
    if (captures.length) fit[style.id] = { capture: captures.reduce((sum, value) => sum + value, 0) / captures.length, builds: captures.length };
  }
  const ranked = Object.entries(fit).sort((a, b) => b[1].capture - a[1].capture);
  if (!ranked.length) return null;

  // What the site builds change on average, and the parts most of them share.
  const scoredBuilds = builds.map(build => evaluateBuild(data, weapon, { weaponId: weapon.id, preset: ranked[0][0], emphasis: neutral, distanceM: 15 } as Settings, build.attachments, build.apex).build).filter(build => !!build);
  const profile = PROFILE.map(item => {
    const change = scoredBuilds.reduce((sum, build) => sum + statRatio(build.stats, weapon.base!, item.stat) - 1, 0) / scoredBuilds.length;
    return { label: item.label, change: Math.round(change * 100), good: change !== 0 && (change < 0) === item.lowerBetter };
  }).filter(item => Math.abs(item.change) >= 3).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);
  const counts = new Map<string, number>();
  for (const build of builds) for (const id of new Set(build.attachments)) counts.set(id, (counts.get(id) ?? 0) + 1);
  const shared = [...counts].filter(([, count]) => count >= 2 && count / builds.length >= .5).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));
  return { style: ranked[0][0], clear: ranked.length === 1 || ranked[0][1].capture - ranked[1][1].capture >= CLEAR_MARGIN, fit, builds: builds.length, profile, shared };
}
