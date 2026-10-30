import { recoilRatio, shotInterval } from './engine';
import type { BuildResult, MetricId, WeaponData } from './types';

// Rows tied to a metric only show when the playstyle scores that metric.
export type StatRow = { label: string; get: (build: BuildResult, weapon: WeaponData) => number | null; fmt: (value: number) => string; delta: (diff: number) => string; lowerBetter: boolean; optional?: boolean; metric?: MetricId };

const signed = (value: number, unit: string, digits = 0) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}${unit}`;
const percent = (value: number) => `${value > 0.5 ? '+' : value < -0.5 ? '−' : ''}${Math.abs(Math.round(value))}%`;
const vsStock = (build: BuildResult, weapon: WeaponData, stat: string) => weapon.base![stat] ? (build.stats[stat] / weapon.base![stat] - 1) * 100 : null;
const cycled = (weapon: WeaponData) => weapon.fireMode === 'single' || weapon.fireMode === 'semi';

/** The stats every comparison shows, in fight-relevance order. Percent rows are against each gun's own stock. */
export function statRows(window: string, scored: (metric: MetricId) => boolean = () => true): StatRow[] {
  const rows: StatRow[] = [
    { label: 'ADS time', get: b => b.stats.ads, fmt: v => `${Math.round(v)} ms`, delta: d => signed(d, ' ms'), lowerBetter: true },
    { label: 'Sprint to fire', get: b => b.stats.stf, fmt: v => `${Math.round(v)} ms`, delta: d => signed(d, ' ms'), lowerBetter: true },
    { label: `Avg TTK, ${window}`, get: b => b.ttkMs, fmt: v => `${Math.round(v)} ms`, delta: d => signed(d, ' ms'), lowerBetter: true, optional: true },
    { label: `One-shot hits, ${window}`, get: b => b.oneShot == null ? null : b.oneShot * 100, fmt: v => `${Math.round(v)}%`, delta: d => signed(d, ' pts'), lowerBetter: false, optional: true },
    { label: 'Damage range', get: (b, w) => b.stats.range / w.base!.range, fmt: v => `×${v.toFixed(2)}`, delta: d => signed(d, '', 2), lowerBetter: false },
    { label: 'Time between shots', get: (b, w) => cycled(w) && w.rpm ? shotInterval(w, b.stats) : null, fmt: v => `${Math.round(v)} ms`, delta: d => signed(d, ' ms'), lowerBetter: true, optional: true },
    { label: 'Recoil vs stock', get: (b, w) => (recoilRatio(b.stats, w.base!) - 1) * 100, fmt: percent, delta: d => signed(d, ' pts'), lowerBetter: true, metric: 'recoil' },
    { label: 'Fire rate', get: (b, w) => !cycled(w) && w.rpm ? w.rpm * b.stats.rpm / w.base!.rpm : null, fmt: v => `${Math.round(v)} rpm`, delta: d => signed(d, ' rpm'), lowerBetter: false, optional: true },
    { label: 'Aim sway vs stock', get: (b, w) => vsStock(b, w, 'ads_idle_sway'), fmt: percent, delta: d => signed(d, ' pts'), lowerBetter: true, metric: 'sway' },
    { label: 'Hip-fire sway vs stock', get: (b, w) => vsStock(b, w, 'hip_idle_sway'), fmt: percent, delta: d => signed(d, ' pts'), lowerBetter: true, metric: 'hipfire' },
    { label: 'Magazine', get: (b, w) => Math.round((w.magazine ?? w.base!.mag_size) * b.stats.mag_size / w.base!.mag_size), fmt: v => `${v} rds`, delta: d => signed(d, ' rds'), lowerBetter: false },
    { label: 'Sprint speed', get: b => b.stats.sprint, fmt: v => `${v.toFixed(2)} m/s`, delta: d => signed(d, '', 2), lowerBetter: false, metric: 'mobility' },
    { label: 'ADS movement', get: b => b.stats.ads_movement, fmt: v => `${v.toFixed(2)} m/s`, delta: d => signed(d, '', 2), lowerBetter: false, metric: 'adsMove' },
    { label: 'Flinch vs stock', get: (b, w) => vsStock(b, w, 'flinch_received'), fmt: percent, delta: d => signed(d, ' pts'), lowerBetter: true, metric: 'flinch' },
    { label: 'Bullet velocity', get: b => b.stats.bv, fmt: v => `${Math.round(v)} m/s`, delta: d => signed(d, ' m/s'), lowerBetter: false, metric: 'velocity' },
    { label: 'Hitscan range', get: (b, w) => w.base!.hitscan_range ? w.base!.hitscan_range * b.stats.bv / w.base!.bv : null, fmt: v => `${Math.round(v)} m`, delta: d => signed(d, ' m'), lowerBetter: false, optional: true, metric: 'velocity' },
    { label: 'Sway while rechambering', get: (b, w) => w.base!.rechamber_aim ? vsStock(b, w, 'rechamber_aim') : null, fmt: percent, delta: d => signed(d, ' pts'), lowerBetter: true, optional: true, metric: 'steady' },
    { label: 'Weapon swap', get: b => b.stats.raise_speed, fmt: v => `${Math.round(v)} ms`, delta: d => signed(d, ' ms'), lowerBetter: true, metric: 'swap' },
    { label: 'Reload', get: b => b.stats.reload / 1000, fmt: v => `${v.toFixed(2)} s`, delta: d => signed(d, ' s', 2), lowerBetter: true, metric: 'reload' },
  ];
  return rows.filter(row => !row.metric || scored(row.metric));
}

/** Tone of a value against a baseline, only when the change shows at the displayed precision. */
export function tone(row: StatRow, value: number | null, base: number | null) {
  if (value == null || base == null || row.fmt(value) === row.fmt(base)) return '';
  return (value < base) === row.lowerBetter ? 'good' : 'bad';
}
