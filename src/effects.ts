import type { Mods } from './types';

// Ordered by how much the stat matters in a fight, so the first chips are the ones to read.
// A group marked "all" only shows when every stat in it moves by the same amount.
const ORDER: { stats: string[]; label: string; lowerBetter: boolean; all?: boolean }[] = [
  { stats: ['range'], label: 'Damage range', lowerBetter: false },
  { stats: ['rechamber'], label: 'Rechamber', lowerBetter: true },
  { stats: ['rpm'], label: 'Fire rate', lowerBetter: false },
  { stats: ['pre_fire_delay'], label: 'Pre-fire delay', lowerBetter: true },
  { stats: ['ads'], label: 'ADS time', lowerBetter: true },
  { stats: ['stf'], label: 'Sprint to fire', lowerBetter: true },
  { stats: ['vert_recoil', 'horiz_recoil', 'vert_gun_kick', 'horiz_gun_kick'], label: 'Recoil', lowerBetter: true, all: true },
  { stats: ['vert_recoil', 'vert_gun_kick'], label: 'Vertical recoil', lowerBetter: true },
  { stats: ['horiz_recoil', 'horiz_gun_kick'], label: 'Horizontal recoil', lowerBetter: true },
  { stats: ['mag_size'], label: 'Magazine', lowerBetter: false },
  { stats: ['sprint', 'tac_sprint', 'movement'], label: 'Movement', lowerBetter: false },
  { stats: ['ads_movement'], label: 'ADS movement', lowerBetter: false },
  { stats: ['flinch_received'], label: 'Flinch', lowerBetter: true },
  { stats: ['hip_idle_sway', 'hip_gun_bob'], label: 'Hip-fire sway', lowerBetter: true },
  { stats: ['reload'], label: 'Reload time', lowerBetter: true },
  { stats: ['bv'], label: 'Bullet velocity', lowerBetter: false },
  { stats: ['ads_idle_sway', 'ads_gun_bob'], label: 'Aim sway', lowerBetter: true },
  { stats: ['rechamber_aim'], label: 'Sway while rechambering', lowerBetter: true },
];

export type Effect = { label: string; text: string; good: boolean };

/** Readable effect chips for one attachment, most important first. */
export function effects(mods: Mods, max = 4): Effect[] {
  const used = new Set<string>();
  const out: Effect[] = [];
  for (const group of ORDER) {
    const present = group.stats.filter(stat => !used.has(stat) && mods[stat] !== undefined && mods[stat] !== 1);
    if (!present.length) continue;
    if (group.all && (present.length !== group.stats.length || !present.every(stat => Math.abs(mods[stat] - mods[present[0]]) < .015))) continue;
    present.forEach(stat => used.add(stat));
    const value = present.map(stat => mods[stat]).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1))[0];
    const pct = Math.round((value - 1) * 100);
    if (!pct) continue;
    out.push({ label: group.label, text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`, good: group.lowerBetter ? pct < 0 : pct > 0 });
  }
  return out.slice(0, max);
}
