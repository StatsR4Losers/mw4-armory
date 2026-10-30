import { recoilRatio } from './engine';
import type { BuildResult, WeaponData } from './types';

export type StatRow = { label: string; get: (build: BuildResult, weapon: WeaponData) => number | null; fmt: (value: number) => string; delta: (diff: number) => string; lowerBetter: boolean; optional?: boolean };

const signed = (value: number, unit: string, digits = 0) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}${unit}`;
const percent = (value: number) => `${value > 0.5 ? '+' : value < -0.5 ? '−' : ''}${Math.abs(Math.round(value))}%`;

/** The stats every comparison shows, in fight-relevance order. Percent rows are against each gun's own stock. */
export function statRows(window: string): StatRow[] {
  return [
    { label: 'ADS time', get: b => b.stats.ads, fmt: v => `${Math.round(v)} ms`, delta: d => signed(d, ' ms'), lowerBetter: true },
    { label: 'Sprint to fire', get: b => b.stats.stf, fmt: v => `${Math.round(v)} ms`, delta: d => signed(d, ' ms'), lowerBetter: true },
    { label: `Avg TTK, ${window}`, get: b => b.ttkMs, fmt: v => `${Math.round(v)} ms`, delta: d => signed(d, ' ms'), lowerBetter: true, optional: true },
    { label: 'Damage range', get: (b, w) => b.stats.range / w.base!.range, fmt: v => `×${v.toFixed(2)}`, delta: d => signed(d, '', 2), lowerBetter: false },
    { label: 'Recoil vs stock', get: (b, w) => (recoilRatio(b.stats, w.base!) - 1) * 100, fmt: percent, delta: d => signed(d, ' pts'), lowerBetter: true },
    { label: 'Fire rate', get: (b, w) => w.rpm ? w.rpm * b.stats.rpm / w.base!.rpm : null, fmt: v => `${Math.round(v)} rpm`, delta: d => signed(d, ' rpm'), lowerBetter: false, optional: true },
    { label: 'Magazine', get: (b, w) => Math.round((w.magazine ?? w.base!.mag_size) * b.stats.mag_size / w.base!.mag_size), fmt: v => `${v} rds`, delta: d => signed(d, ' rds'), lowerBetter: false },
    { label: 'Sprint speed', get: b => b.stats.sprint, fmt: v => `${v.toFixed(2)} m/s`, delta: d => signed(d, '', 2), lowerBetter: false },
    { label: 'ADS movement', get: b => b.stats.ads_movement, fmt: v => `${v.toFixed(2)} m/s`, delta: d => signed(d, '', 2), lowerBetter: false },
    { label: 'Flinch vs stock', get: (b, w) => (b.stats.flinch_received / w.base!.flinch_received - 1) * 100, fmt: percent, delta: d => signed(d, ' pts'), lowerBetter: true },
    { label: 'Reload', get: b => b.stats.reload / 1000, fmt: v => `${v.toFixed(2)} s`, delta: d => signed(d, ' s', 2), lowerBetter: true },
  ];
}

/** Tone of a value against a baseline, only when the change shows at the displayed precision. */
export function tone(row: StatRow, value: number | null, base: number | null) {
  if (value == null || base == null || row.fmt(value) === row.fmt(base)) return '';
  return (value < base) === row.lowerBetter ? 'good' : 'bad';
}
