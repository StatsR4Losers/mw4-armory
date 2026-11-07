import { useEffect, useState } from 'react';
import { hideMissing, multiplayerData as data, shortCategory, weaponImage } from '../data/game';
import { ttkAt } from '../engine';
import { Icon } from '../components/Icon';
import type { DamageBand, Patch, PatchRow, PatchWeapon, WeaponData } from '../types';
import { Typed } from '../components/Terminal';

// The before and now comparison scans this far, every half meter. Every damage band in the notes ends inside it.
const SCAN_M = 60, STEP_M = .5;
type Filter = 'all' | 'buff' | 'nerf';
type Span = { from: number; to: number; was: number | null; is: number | null };

/** The distance spans where the stock chest value differs before the patch and now, with neighbouring equal spans merged. */
function changedSpans(weapon: WeaponData, before: DamageBand[], now: DamageBand[]): Span[] {
  const spans: Span[] = [];
  for (let d = 0; d < SCAN_M; d += STEP_M) {
    const was = chestValue(weapon, before, d), is = chestValue(weapon, now, d);
    if (was === is) continue;
    const last = spans.at(-1);
    if (last && last.to === d && last.was === was && last.is === is) last.to = d + STEP_M;
    else spans.push({ from: d, to: d + STEP_M, was, is });
  }
  return spans;
}

/** Stock chest time to kill for automatics, or chest shots to kill for everything else, at one distance. */
function chestValue(weapon: WeaponData, damage: DamageBand[], distanceM: number): number | null {
  const gun = { ...weapon, damage };
  if (weapon.fireMode === 'auto') return ttkAt(gun, distanceM);
  const chest = damage.find(band => distanceM >= band.minM && (band.maxM === null || distanceM < band.maxM))?.regions.chest;
  return chest ? Math.ceil(weapon.health / chest) : null;
}

// Patch notes describe multiplayer, so this screen reads multiplayer numbers in either mode.
const weaponById = (id: string) => data.weapons.find(weapon => weapon.id === id);
const supported = (weapon: WeaponData) => !!weapon.base && !!data.loadouts[weapon.id]?.length;

const fmt = (value: number | null, auto: boolean) => value == null ? '–' : auto ? `${Math.round(value)}` : `${value}`;
const direction = (row: PatchRow) => row[3] === 'up' ? 'good' : row[3] === 'down' ? 'bad' : '';

export function PatchView({ focus, onBuild }: { focus: string | null; onBuild: (weaponId: string) => void }) {
  const [patchId, setPatchId] = useState(data.patches[0]?.id);
  const [filter, setFilter] = useState<Filter>('all');
  const patch = data.patches.find(item => item.id === patchId) ?? data.patches[0];

  // Opened from a gun's Build screen: scroll to that gun's changes.
  useEffect(() => {
    if (!focus) return;
    setFilter('all');
    requestAnimationFrame(() => document.getElementById(`patch-${focus}`)?.scrollIntoView({ block: 'start' }));
  }, [focus]);

  if (!patch) return <div className="data-view"><div className="empty"><h2>No patch notes yet</h2></div></div>;
  const shown = patch.weapons.filter(item => filter === 'all' || item.verdict === filter);
  const count = (verdict: Filter) => patch.weapons.filter(item => item.verdict === verdict).length;
  const date = new Date(`${patch.date}T12:00:00Z`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return <div className="data-view patch-view">
    <header className="page-head">
      <span className="eyebrow">Patch notes</span>
      <h1><Typed text={`${patch.title} changes`}/></h1>
      <p>Infinity Ward's {date} patch, transcribed from the <a href={patch.url} target="_blank" rel="noreferrer">official notes</a>. The optimizer already uses these numbers. Time to kill below is the stock gun with every bullet to the chest of a 100-health target.</p>
      {data.patches.length > 1 && <select aria-label="Patch" value={patch.id} onChange={event => setPatchId(event.target.value)}>
        {data.patches.map(item => <option key={item.id} value={item.id}>{item.title}, {item.date}</option>)}
      </select>}
    </header>

    <section className="coverage patch-counts">
      <div><span>New guns</span><strong>{patch.newWeapons.length}</strong><p>{patch.newWeapons.map(item => weaponById(item.id)?.name ?? item.id).join(' and ')}</p></div>
      <div><span>Guns retuned</span><strong>{patch.weapons.length}</strong><p>{count('buff')} buffs and {count('nerf')} nerfs, as CODMunity sorts them. The notes don't label buffs and nerfs.</p></div>
    </section>

    {patch.newWeapons.length > 0 && <section className="guide-section">
      <h2>New guns</h2>
      <div className="patch-new">{patch.newWeapons.map(item => <NewGun key={item.id} id={item.id} note={item.note} onBuild={onBuild}/>)}</div>
    </section>}

    <section className="guide-section">
      <div className="patch-head">
        <h2>Weapon changes</h2>
        <div className="seg" role="group" aria-label="Show">
          {(['all', 'buff', 'nerf'] as Filter[]).map(item => <button key={item} className={filter === item ? 'active' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}>
            {item === 'all' ? `All ${patch.weapons.length}` : item === 'buff' ? `Buffs ${count('buff')}` : `Nerfs ${count('nerf')}`}
          </button>)}
        </div>
      </div>
      <div className="patch-list">{shown.map(item => <WeaponChanges key={item.id} change={item} onBuild={onBuild}/>)}</div>
    </section>

    {patch.other.length > 0 && <section className="guide-section">
      <h2>Killstreaks and equipment</h2>
      <div className="patch-list">{patch.other.map(item => <article key={item.name} className="patch-card">
        <h3>{item.name}</h3>
        {item.rows.length > 0 && <RowTable rows={item.rows}/>}
        {item.notes && <ul className="facts-list">{item.notes.map(note => <li key={note}>{note}</li>)}</ul>}
      </article>)}</div>
    </section>}

    <section className="guide-section">
      <h2>How to read this</h2>
      <ul className="facts-list">
        {patch.notes.map(note => <li key={note}>{note}</li>)}
        <li>Damage ranges in the notes are exact. The optimizer uses CODMunity's post-patch readings, which round each range to the meter.</li>
        <li>Read {patch.read}. Patch numbers are Infinity Ward's. Everything else on this site is community-measured.</li>
      </ul>
    </section>
  </div>;
}

function NewGun({ id, note, onBuild }: { id: string; note: string; onBuild: (id: string) => void }) {
  const weapon = weaponById(id);
  if (!weapon) return null;
  const base = weapon.base ?? {};
  const facts = [
    { label: 'Fire rate', value: weapon.rpm, unit: 'rpm' },
    { label: 'Magazine', value: weapon.magazine, unit: '' },
    { label: 'ADS', value: base.ads, unit: 'ms' },
    { label: 'Sprint to fire', value: base.stf, unit: 'ms' },
    { label: 'Chest TTK, 5 m', value: weapon.damage ? ttkAt(weapon, 5) : null, unit: 'ms' },
  ];
  return <article className="patch-card patch-new-card">
    <div className="patch-card-head">
      <div><span className="eyebrow">{weapon.category}</span><h3>{weapon.name}</h3></div>
      <span className="tag new">New</span>
    </div>
    <img className="patch-art" src={weaponImage(weapon.id)} alt="" onError={hideMissing}/>
    <p className="patch-note">{note}</p>
    <dl className="patch-facts">{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value == null ? '–' : Math.round(fact.value)}<small>{fact.value == null ? '' : fact.unit}</small></dd></div>)}</dl>
    {weapon.apex && <p className="patch-note">Apex: <b>{weapon.apex.name}</b>, unlocks at weapon level {weapon.apex.level ?? 'unknown'}.</p>}
    {supported(weapon) && <button className="button" onClick={() => onBuild(weapon.id)}>Find its best build <Icon name="arrow" size={14}/></button>}
  </article>;
}

function WeaponChanges({ change, onBuild }: { change: PatchWeapon; onBuild: (id: string) => void }) {
  const weapon = weaponById(change.id);
  if (!weapon) return null;
  return <article className="patch-card" id={`patch-${weapon.id}`}>
    <div className="patch-card-head">
      <div><span className="eyebrow">{shortCategory[weapon.category] ?? weapon.category}</span><h3>{weapon.name}</h3></div>
      <span className={`tag ${change.verdict === 'buff' ? 'ok' : 'nerf'}`}>{change.verdict === 'buff' ? 'Buff' : 'Nerf'}</span>
    </div>
    {change.groups.map(group => <div key={group.label} className="patch-group">
      <h4>{group.label}</h4>
      <RowTable rows={group.rows}/>
    </div>)}
    {change.damageBefore && weapon.damage && <KillChange weapon={weapon} before={change.damageBefore} now={weapon.damage}/>}
    {change.flag && <p className="callout">{change.flag}</p>}
    {supported(weapon) && <button className="link" onClick={() => onBuild(weapon.id)}>Open in Build <Icon name="arrow" size={13}/></button>}
  </article>;
}

function RowTable({ rows }: { rows: PatchRow[] }) {
  return <div className="table-wrap"><table className="patch-rows">
    <thead><tr><th scope="col">Stat</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row[0]}>
      <th scope="row">{row[0]}</th>
      <td>{row[1] || '–'}</td>
      <td className={direction(row)}>{row[2]}{row[3] && <span className="sr-only">{row[3] === 'up' ? ' (better)' : ' (worse)'}</span>}</td>
    </tr>)}</tbody>
  </table></div>;
}

/** Stock chest time to kill, or shots to kill, before the patch and now, at a spread of distances. */
function KillChange({ weapon, before, now }: { weapon: WeaponData; before: DamageBand[]; now: DamageBand[] }) {
  const auto = weapon.fireMode === 'auto';
  const spans = changedSpans(weapon, before, now);
  const label = auto ? 'Stock chest time to kill, ms' : 'Stock chest shots to kill';
  if (!spans.length) return <p className="patch-note">{auto ? 'Stock chest time to kill' : 'Stock chest shots to kill'} is the same at every distance out to {SCAN_M} m. The change is on headshots or other body parts, or smaller than CODMunity's 1 m rounding of ranges.</p>;
  return <div className="patch-group">
    <h4>{label}</h4>
    <div className="table-wrap"><table className="patch-ttk">
      <thead><tr><th scope="col">Distance</th><th scope="col">Before</th><th scope="col">Now</th></tr></thead>
      <tbody>{spans.map(span => {
        const tone = span.was == null || span.is == null ? '' : span.is < span.was ? 'good' : 'bad';
        return <tr key={span.from}>
          <th scope="row">{span.from}–{span.to >= SCAN_M ? `${SCAN_M}+` : span.to} m</th>
          <td>{fmt(span.was, auto)}</td>
          <td className={tone}>{fmt(span.is, auto)}</td>
        </tr>;
      })}</tbody>
    </table></div>
  </div>;
}

export function patchFor(weaponId: string): { patch: Patch; change: PatchWeapon | null; isNew: boolean } | null {
  const patch = data.patches?.[0];
  if (!patch) return null;
  const change = patch.weapons.find(item => item.id === weaponId) ?? null;
  const isNew = patch.newWeapons.some(item => item.id === weaponId);
  return change || isNew ? { patch, change, isNew } : null;
}
