import { useEffect, useMemo, useRef, useState } from 'react';
import { attachmentImage, data, slotName, sortSlots } from '../data/game';
import { GEAR_SLOTS, streakCost } from '../engine/gear';
import { evaluateBuild } from '../engine';
import { Icon } from '../components/Icon';
import type { BuildResult, GearItem, GearResult, GearSlot, OptimizeResult, ScoredMeta, Settings, WeaponData } from '../types';

const gearById = new Map(data.gear.map(item => [item.id, item]));

/** What changed in a class since the last result for the same gun, scored at the current settings. */
export function useBuildChanges(weapon: WeaponData, settings: Settings, best: BuildResult | null, apex: boolean) {
  const previous = useRef<{ key: string; attachments: string[] } | null>(null);
  const [changes, setChanges] = useState<{ swaps: [string | null, string | null][]; gain: number } | null>(null);
  useEffect(() => {
    if (!best) return;
    const key = `${weapon.id}|${apex}`;
    const before = previous.current;
    previous.current = { key, attachments: best.attachments };
    if (!before || before.key !== key) { setChanges(null); return; }
    const added = best.attachments.filter(id => !before.attachments.includes(id));
    const removed = before.attachments.filter(id => !best.attachments.includes(id));
    if (!added.length && !removed.length) return;
    // Pair parts by slot so the note reads "old → new".
    const swaps: [string | null, string | null][] = [];
    const left = [...added];
    for (const id of removed) {
      const match = left.find(other => data.attachments[other].slot === data.attachments[id].slot);
      if (match) left.splice(left.indexOf(match), 1);
      swaps.push([id, match ?? null]);
    }
    for (const id of left) swaps.push([null, id]);
    const old = evaluateBuild(data, weapon, settings, before.attachments, apex).build;
    setChanges({ swaps, gain: old ? best.score - old.score : 0 });
  }, [best]); // eslint-disable-line react-hooks/exhaustive-deps
  return [changes, () => setChanges(null)] as const;
}

export function ChangeNote({ changes, onDismiss }: { changes: { swaps: [string | null, string | null][]; gain: number }; onDismiss: () => void }) {
  const name = (id: string | null) => id ? data.attachments[id]?.name ?? id : '';
  return <div className="change-note" role="status">
    <Icon name="refresh" size={14}/>
    <p>{changes.swaps.map(([from, to], index) => <span key={index}>{from && to ? <><s>{name(from)}</s> → <b>{name(to)}</b></> : to ? <>Added <b>{name(to)}</b></> : <>Dropped <s>{name(from)}</s></>}</span>)}
      {Math.abs(changes.gain) >= .5 && <em>{changes.gain >= 0 ? '+' : '−'}{Math.abs(Math.round(changes.gain))} ms over the old build at these settings</em>}</p>
    <button className="icon-btn" aria-label="Dismiss" onClick={onDismiss}><Icon name="close" size={12}/></button>
  </div>;
}

function itemsFor(slot: GearSlot): GearItem[] {
  return data.gear.filter(item => slot.startsWith('perk') ? item.kind === 'perk' && item.perkSlot === Number(slot.slice(-1)) : item.kind === slot)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function ClassSetup({ gear, settings, change, weapon }: { gear: GearResult; settings: Settings; change: (patch: Partial<Settings>) => void; weapon: WeaponData }) {
  // Remember the last picks for this gun so a swap shows what it replaced.
  const previous = useRef<{ weapon: string; picks: Record<string, string> } | null>(null);
  const [was, setWas] = useState<Record<string, string>>({});
  const current = useMemo(() => Object.fromEntries([...GEAR_SLOTS.map(({ slot }) => [slot, gear.picks[slot]?.id ?? '']), ...gear.streaks.map((pick, index) => [`streak${index}`, pick.id])]), [gear]);
  useEffect(() => {
    const before = previous.current;
    previous.current = { weapon: weapon.id, picks: current };
    if (!before || before.weapon !== weapon.id) { setWas({}); return; }
    const diff = Object.fromEntries(Object.entries(current).filter(([slot, id]) => before.picks[slot] && before.picks[slot] !== id).map(([slot]) => [slot, before.picks[slot]]));
    if (Object.keys(diff).length) setWas(diff);
  }, [current, weapon.id]);
  const setLock = (slot: GearSlot, id: string) => {
    const gearLocks = { ...settings.gearLocks };
    if (id) gearLocks[slot] = id; else delete gearLocks[slot];
    change({ gearLocks });
  };
  const toggleStreak = (id: string) => change({ streakLocks: settings.streakLocks.includes(id) ? settings.streakLocks.filter(other => other !== id) : [...settings.streakLocks.slice(-2), id] });
  return <section className="class-setup">
    <div className="section-head">
      <h3>Perks, equipment and killstreaks</h3>
      <p>Picked for the {weapon.name} from what Game8 runs on it, what Game8 and WZStats run across its class, two perk tier lists, and your playstyle. Choose any slot to swap it. Your choice stays until you set it back to Auto.</p>
    </div>
    <div className="gear-grid">{GEAR_SLOTS.map(({ slot, label }) => {
      const pick = gear.picks[slot];
      const item = pick ? gearById.get(pick.id) : undefined;
      return <div key={slot} className={`gear-card ${pick?.locked ? 'is-locked' : ''}`}>
        <div className="gear-top"><span>{label}</span>{pick?.locked && <Icon name="lock" size={12}/>}</div>
        <select aria-label={label} value={settings.gearLocks[slot] ?? ''} onChange={event => setLock(slot, event.target.value)}>
          <option value="">Auto{item && !pick?.locked ? `: ${item.name}` : ''}</option>
          {itemsFor(slot).map(option => <option key={option.id} value={option.id} disabled={option.unlock != null && option.unlock > settings.playerLevel}>{option.name}{option.unlock != null && option.unlock > settings.playerLevel ? ` (rank ${option.unlock})` : ''}</option>)}
        </select>
        {item && <strong>{item.name}</strong>}
        {was[slot] && <span className="was">was {gearById.get(was[slot])?.name}</span>}
        {item && <p>{item.description}</p>}
        {pick && pick.reasons.length > 0 && <ul className="reasons">{pick.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      </div>;
    })}</div>
    <div className="streak-head">
      <h4>Killstreaks</h4>
      <p>No site ranks killstreaks yet. These follow your kills per life ({settings.killBand}) and streak style. Lock one to keep it.</p>
    </div>
    <div className="streak-row">{gear.streaks.length === 0 ? <p className="hint">No streaks fit under {settings.killBand} kills. Raise kills per life in the sidebar.</p> : gear.streaks.map((pick, index) => {
      const item = gearById.get(pick.id)!;
      return <div key={pick.id} className={`streak-card ${pick.locked ? 'is-locked' : ''}`}>
        <span className="streak-cost">{streakCost(item, gear.hardline)}<small>kills</small></span>
        <div><strong>{item.name}</strong><p>{item.description}</p>{was[`streak${index}`] && <span className="was">was {gearById.get(was[`streak${index}`])?.name}</span>}</div>
        <button className={`icon-btn ${pick.locked ? 'on' : ''}`} aria-pressed={pick.locked} aria-label={`${pick.locked ? 'Unlock' : 'Lock'} ${item.name}`} onClick={() => toggleStreak(item.id)}><Icon name="lock" size={13}/></button>
      </div>;
    })}</div>
  </section>;
}

export function GuideBuilds({ weapon, result, onCompare, onCopy }: { weapon: WeaponData; result: OptimizeResult; onCompare: (meta: ScoredMeta) => void; onCopy: (text: string, message?: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'standard' | 'apex'>('all');
  const ours = { standard: result.standard.best, apex: result.apex.best };
  const list = result.meta.filter(meta => filter === 'all' || (filter === 'apex') === meta.apex)
    .sort((a, b) => (b.build?.score ?? -Infinity) - (a.build?.score ?? -Infinity));
  if (!result.meta.length) return <section className="guide-builds"><div className="section-head"><h3>What the sites run</h3><p>No guide builds were collected for the {weapon.name}.</p></div></section>;
  const sources = Object.values(data.metaSources);
  return <section className="guide-builds">
    <div className="section-head">
      <h3>What the sites run</h3>
      <p>{result.meta.length} builds for the {weapon.name} from {sources.map(source => source.name).join(', ')}, read {sources[0]?.retrieved}. Each is scored with the same math as your classes, at your current settings.</p>
      <div className="seg" role="group" aria-label="Filter guide builds">{(['all', 'standard', 'apex'] as const).map(id => <button key={id} aria-pressed={filter === id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{id === 'all' ? 'All' : id === 'apex' ? 'Apex' : 'No Apex'}</button>)}</div>
    </div>
    <div className="guide-list">{list.map((meta, index) => {
      const mine = meta.apex ? ours.apex : ours.standard;
      const versus = meta.build && mine ? meta.build.score - mine.score : null;
      return <article key={`${meta.source}-${meta.label}-${index}`} className="guide-card">
        <header>
          <span className={`source-tag ${meta.source.toLowerCase()}`}>{meta.source}</span>
          <strong>{meta.label}</strong>
          {meta.apex && <span className="apex-tag"><Icon name="bolt" size={11}/>Apex</span>}
          <span className={`guide-score ${meta.build && meta.build.score < 0 ? 'bad' : ''}`}>{meta.build ? `${meta.build.score >= 0 ? '+' : '−'}${Math.abs(Math.round(meta.build.score))} ms` : 'n/a'}</span>
        </header>
        <ul className="guide-parts">
          {sortSlots(meta.attachments).map(id => { const image = attachmentImage(id); return <li key={id} title={slotName(data.attachments[id].slot)}>{image ? <img src={image} alt=""/> : <Icon name="grid" size={12}/>}{data.attachments[id].name}</li>; })}
          {meta.unmatched.map(name => <li key={name} className="unmatched" title="Not in this gun's data, so not scored">{name}</li>)}
        </ul>
        <div className="guide-foot">
          {versus !== null && <span className={`versus ${versus > .5 ? 'good' : versus < -.5 ? 'bad' : ''}`}>{Math.abs(versus) < .5 ? `Ties your Class ${meta.apex ? 2 : 1}` : versus > 0 ? `${Math.round(versus)} ms better than your Class ${meta.apex ? 2 : 1}` : `${Math.round(-versus)} ms behind your Class ${meta.apex ? 2 : 1}`}</span>}
          {meta.code ? <button className="code" onClick={() => onCopy(meta.code!, 'Build code copied. Import it in Gunsmith.')} title="Copy build code"><Icon name="copy" size={12}/>{meta.code}</button> : <span className="no-code">{meta.note ?? 'No code published'}</span>}
          <button className="button ghost small" onClick={() => onCompare(meta)}><Icon name="grid" size={13}/>Compare</button>
          <a href={meta.url} target="_blank" rel="noreferrer" className="source-link" aria-label={`Open ${meta.source}`}><Icon name="external" size={13}/></a>
        </div>
        {meta.issues.filter(issue => !issue.startsWith('Not scored')).length > 0 && <p className="guide-issues">{meta.issues.filter(issue => !issue.startsWith('Not scored')).join(' ')}</p>}
      </article>;
    })}</div>
  </section>;
}
