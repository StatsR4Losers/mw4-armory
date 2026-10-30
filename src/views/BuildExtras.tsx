import { useEffect, useMemo, useRef, useState } from 'react';
import { attachmentImage, data, slotName, sortSlots } from '../data/game';
import { GEAR_SLOTS, streakCost } from '../engine/gear';
import { Icon } from '../components/Icon';
import type { GearItem, GearResult, GearSlot, OptimizeResult, ScoredMeta, Settings, WeaponData } from '../types';

const gearById = new Map(data.gear.map(item => [item.id, item]));
const signedMs = (value: number) => { const rounded = Math.round(value); return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)} ms`; };

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
      <p>Picked from what Game8 runs on the {weapon.name}, what Game8 and WZStats run across its class, two perk tier lists, and your playstyle. Pick a different item in any slot to keep it there.</p>
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

export function SitePicks({ weapon, result, activeKey, onCompare, onCopy }: { weapon: WeaponData; result: OptimizeResult; activeKey: string; onCompare: (key: string) => void; onCopy: (text: string, message?: string) => void }) {
  const [source, setSource] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const metas = result.meta.map((meta, index) => ({ meta, key: `meta:${index}` }));
  if (!metas.length) return <section className="site-picks"><div className="section-head"><h3>What the sites say</h3><p>No site builds were collected for the {weapon.name}.</p></div></section>;
  const sources = Object.values(data.metaSources).map(item => item.name);
  // Each site's own first-listed build is what it calls best.
  const tops = sources.map(name => metas.find(item => item.meta.source === name)).filter((item): item is typeof metas[number] => !!item);
  const list = metas.filter(item => source === 'all' || item.meta.source === source);
  const ours = (apex: boolean) => (apex ? result.apex.best : result.standard.best);
  const versus = (meta: ScoredMeta) => { const mine = ours(meta.apex); return meta.build && mine ? meta.build.score - mine.score : null; };
  const versusText = (meta: ScoredMeta) => { const value = versus(meta); if (value === null) return ''; return Math.abs(value) < .5 ? 'ties the optimizer' : value > 0 ? `${Math.round(value)} ms ahead of the optimizer` : `${Math.round(-value)} ms behind the optimizer`; };
  const card = ({ meta, key }: typeof metas[number], top: boolean) => <article key={key} className={`site-card ${top ? 'top' : ''} ${activeKey === key ? 'active' : ''}`}>
    <header>
      <span className={`source-tag ${meta.source.toLowerCase()}`}>{meta.source}</span>
      <strong>{meta.label}</strong>
      {meta.apex && <span className="apex-tag"><Icon name="bolt" size={11}/>Apex</span>}
      <span className={`site-score ${meta.build && Math.round(meta.build.score) < 0 ? 'bad' : ''}`}>{meta.build ? signedMs(meta.build.score) : 'n/a'}</span>
      <a href={meta.url} target="_blank" rel="noreferrer" className="source-link" aria-label={`Open on ${meta.source}`}><Icon name="external" size={13}/></a>
    </header>
    <ul className="site-parts">
      {sortSlots(meta.attachments).map(id => { const image = attachmentImage(id); return <li key={id} title={slotName(data.attachments[id].slot)}>{image ? <img src={image} alt=""/> : <Icon name="grid" size={12}/>}{data.attachments[id].name}</li>; })}
      {meta.unmatched.map(name => <li key={name} className="unmatched" title="Not in this gun's data, so not scored">{name}</li>)}
    </ul>
    <div className="site-foot">
      <span className={`versus ${(versus(meta) ?? 0) > .5 ? 'good' : (versus(meta) ?? 0) < -.5 ? 'bad' : ''}`}>{versusText(meta)}</span>
      {meta.code ? <button className="code" onClick={() => onCopy(meta.code!, 'Build code copied. Import it in Gunsmith.')} title="Copy import code"><Icon name="copy" size={12}/>{meta.code}</button> : <span className="no-code">{meta.note ?? 'No code published'}</span>}
      <button className={`button small ${activeKey === key ? '' : 'ghost'}`} onClick={() => onCompare(key)}>{activeKey === key ? <><Icon name="check" size={13}/>Comparing</> : <><Icon name="grid" size={13}/>Compare</>}</button>
    </div>
  </article>;
  return <section className="site-picks">
    <div className="section-head">
      <h3>What the sites say</h3>
      <p>Each site's top build for the {weapon.name}, scored with the same math as the optimizer at your settings. Press Compare to put one next to the optimizer's build above.</p>
    </div>
    <div className="site-tops">{tops.map(item => card(item, true))}</div>
    <button className="link show-all" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>{showAll ? 'Hide' : 'Show'} all {metas.length} site builds<Icon name="chevron" size={13}/></button>
    {showAll && <>
      <div className="seg" role="group" aria-label="Filter by site">{['all', ...sources].map(name => <button key={name} aria-pressed={source === name} className={source === name ? 'active' : ''} onClick={() => setSource(name)}>{name === 'all' ? 'All' : name}</button>)}</div>
      <div className="site-list">{list.map(item => card(item, false))}</div>
    </>}
  </section>;
}
