import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { asset, attachmentImage, hideMissing, multiplayerData, shortCategory, slotName, sortSlots, weaponImage } from '../data/game';
import { modeView } from '../data/mode';
import { roleOf } from '../engine';
import type { Role } from '../engine';
import { DISTANCES, HALF_MISS_M, HALF_ROLES, MIXES, bestPairs, optionFor, soloScore } from '../engine/warzone';
import type { Half, MixId, Option, Pair } from '../engine/warzone';
import { GEAR_STYLES, SOURCE_NAMES, recommendWarzoneGear } from '../engine/wzgear';
import type { GearPick, GearStyle } from '../engine/wzgear';
import { Icon } from '../components/Icon';
import { Roll, Typed } from '../components/Terminal';
import type { WeaponData } from '../types';

const data = modeView(multiplayerData, 'wz');
const ROLE_NAMES: Record<Role, string> = { ar: 'assault rifle', lmg: 'LMG', dmr: 'marksman rifle', bolt: 'bolt-action rifle', sniper: 'sniper', smg: 'SMG', pistol: 'pistol', shotgun: 'shotgun' };
const HALF_NAMES: Record<Half, string> = { long: 'Long-range gun', close: 'Close-range gun' };
// Quick starts for the two slots.
const PRESETS: { label: string; long: string; close: string }[] = [
  { label: 'Rifle + SMG', long: 'role:ar', close: 'role:smg' },
  { label: 'Sniper + SMG', long: 'role:sniper', close: 'role:smg' },
  { label: 'Best of anything', long: 'any', close: 'any' },
];

const guns = (half: Half) => data.weapons.filter(weapon => weapon.base && data.warzone?.builds?.[weapon.id] && HALF_ROLES[half].includes(roleOf(weapon)) && optionFor(data, weapon, half));
/** Weapon ids a slot choice allows: 'any', 'role:<role>' or 'gun:<id>'. */
function allowed(half: Half, choice: string) {
  const list = guns(half);
  if (choice.startsWith('gun:')) return list.filter(weapon => weapon.id === choice.slice(4)).map(weapon => weapon.id);
  if (choice.startsWith('role:')) return list.filter(weapon => roleOf(weapon) === choice.slice(5)).map(weapon => weapon.id);
  return list.map(weapon => weapon.id);
}

// CODMunity's pick rates: each gun's highest share across its Warzone playstyles.
const pickRate = new Map<string, { share: number; playstyle: string }>();
for (const [playstyle, list] of Object.entries(data.warzone?.popularity ?? {})) for (const [id, share] of list) {
  if ((pickRate.get(id)?.share ?? 0) < share) pickRate.set(id, { share, playstyle });
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
type Tune = (weaponId: string, styleId: string, apex: boolean) => void;

/** The gear playstyle a loadout implies: a sniper pair plays sniper, close quarters plays like Resurgence. */
function autoStyle(pair: Pair, mix: MixId): GearStyle {
  const role = roleOf(pair.long.weapon);
  if (role === 'sniper' || role === 'bolt') return 'sniper';
  return mix === 'close' ? 'resurgence' : 'aggressive';
}

export function WarzoneView({ onTune }: { onTune: Tune }) {
  const [long, setLong] = useState('role:ar');
  const [close, setClose] = useState('role:smg');
  const [mix, setMix] = useState<MixId>('mixed');
  const [gearStyle, setGearStyle] = useState<GearStyle | 'auto'>('auto');

  const pairs = useMemo(() => bestPairs(data, mix, allowed('long', long), allowed('close', close), 5), [mix, long, close]);
  const ranked = (half: Half, choice: string) => {
    // A single picked gun ranks against the rest of its class, so the list still answers "how good is it?".
    const pickedRole = choice.startsWith('gun:') ? roleOf(data.weapons.find(weapon => weapon.id === choice.slice(4))!) : null;
    const ids = pickedRole ? guns(half).filter(weapon => roleOf(weapon) === pickedRole).map(weapon => weapon.id) : allowed(half, choice);
    return ids.map(id => optionFor(data, data.weapons.find(weapon => weapon.id === id)!, half, undefined, mix)).filter((option): option is Option => !!option)
      .map(option => ({ option, score: soloScore(option, mix) })).sort((a, b) => a.score - b.score);
  };
  const longRanked = useMemo(() => ranked('long', long), [mix, long]);
  const closeRanked = useMemo(() => ranked('close', close), [mix, close]);

  const scanned = allowed('long', long).length * allowed('close', close).length;
  const rules = data.warzone?.rules;

  return <div className="data-view warzone-view">
    <header className="page-head wz-title">
      <div>
        <span className="eyebrow">Warzone <span className="jp">二挺兵装 · 戦闘距離分析</span></span>
        <h1><Typed text="Warzone"/><span className="o"><Typed text="loadout" delay={320}/></span></h1>
        <p>Pick what you want in each slot, or leave it open. Every pair runs each gun's best Warzone build and is scored on how fast it wins fights from 5 to 150 m, with whichever gun is faster at each distance. A kill takes {rules?.health ?? 300} damage through plates.</p>
      </div>
      <div className="radar-box" aria-hidden="true"><div className="radar"><i/><i/></div><div className="radar-cap">Pairs scanned · <b><Roll value={String(scanned)}/></b></div></div>
    </header>

    <section className="wz-controls" aria-label="Loadout options">
      <div className="wz-ctl">
        <span id="wz-preset">Preset</span>
        <div className="seg" role="group" aria-labelledby="wz-preset">{PRESETS.map(preset => { const on = long === preset.long && close === preset.close; return <button key={preset.label} className={on ? 'active' : ''} aria-pressed={on} onClick={() => { setLong(preset.long); setClose(preset.close); }}>{preset.label}</button>; })}</div>
      </div>
      <SlotPicker half="long" value={long} onChange={setLong}/>
      <SlotPicker half="close" value={close} onChange={setClose}/>
      <div className="wz-ctl">
        <span id="wz-mix">Where you fight</span>
        <div className="seg" role="group" aria-labelledby="wz-mix">{(Object.keys(MIXES) as MixId[]).map(id => <button key={id} className={mix === id ? 'active' : ''} aria-pressed={mix === id} onClick={() => setMix(id)}>{MIXES[id].name}</button>)}</div>
        <p className="hint">{MIXES[mix].blurb}</p>
      </div>
      <div className="wz-ctl wide">
        <label htmlFor="wz-gear">Perks and equipment for</label>
        <select id="wz-gear" value={gearStyle} onChange={event => setGearStyle(event.target.value as GearStyle | 'auto')}>
          <option value="auto">Match each loadout's guns</option>
          {(Object.keys(GEAR_STYLES) as GearStyle[]).map(id => <option key={id} value={id}>{GEAR_STYLES[id].name}: {GEAR_STYLES[id].blurb}</option>)}
        </select>
      </div>
    </section>

    {pairs.length === 0 && <p className="callout">No pair fits those choices. Pick a different gun for one slot.</p>}
    <div className="wz-list">{pairs.map((pair, index) => <LoadoutCard key={`${pair.long.weapon.id}-${pair.close.weapon.id}-${mix}`} pair={pair} rank={index + 1} lead={pairs[0].score} scanned={scanned} style={gearStyle === 'auto' ? autoStyle(pair, mix) : gearStyle} onTune={onTune}/>)}</div>

    <div className="wz-ranks">
      <RankList title={HALF_NAMES.long} rows={longRanked} picked={long} onTune={onTune}/>
      <RankList title={HALF_NAMES.close} rows={closeRanked} picked={close} onTune={onTune}/>
    </div>

    <section className="guide-section">
      <h2>How this works</h2>
      <ul className="facts-list">
        <li>A fight takes the time to aim in, every bullet it takes to kill through 300 health with misses counted, a reload if the magazine runs dry, and the bullet's travel time. Fights inside 15 m add sprint-to-fire, and fights out to 30 m add half of it.</li>
        <li>Misses grow with distance. Half of an automatic's shots miss at {HALF_MISS_M.smg} m for an SMG, {HALF_MISS_M.ar} m for a rifle and {HALF_MISS_M.lmg} m for an LMG, stretched or shrunk by the build's recoil against its class. Snipers and bolt actions lose half at {HALF_MISS_M.sniper} and {HALF_MISS_M.bolt} m, on top of an aimed-shot miss rate. These distances are this site's assumptions.</li>
        <li>How often fights happen at each distance is an assumption too. Switch between close quarters, mixed and long sight lines to see how the picks move.</li>
        <li>Each gun runs its best build for its job, found with every part unlocked, once with its Apex and once without. The Apex goes in when its Warzone stat changes win this kind of match faster. Apex damage conversions, like the MAR-9 Auto's switch to full auto, are not modeled, and some Apex attachments have no Warzone stats yet. Press Tune in Build to redo any gun with your own unlocks and locks.</li>
        <li>Perks, the lethal and the tactical are scored from three sources: WZStats' Season 1 Warzone tier lists (meta tier counts 2, A tier 1), TimeSaver's perk combo for the playstyle (1.5) and Activision's default loadouts for it (1), plus this site's own rule of what suits the playstyle (1). Each slot shows how many of the three sources back its pick. Elite perks are found or bought in a match.</li>
        <li>Movement speed, tactical sprint and how easy a gun is to control by hand are not part of the score. An LMG can win fights on paper and still be slow to move with.</li>
        <li>Shotguns and the Hyeon Burst have no damage model, so they are left out. Stats, damage and builds are CODMunity's Warzone records, read {data.warzone?.retrieved}. Pick rates are CODMunity's. Perk, equipment and newer part icons are CODMunity's.</li>
      </ul>
    </section>
  </div>;
}

function SlotPicker({ half, value, onChange }: { half: Half; value: string; onChange: (value: string) => void }) {
  const list = guns(half);
  const roles = [...new Set(list.map(roleOf))];
  return <div className="wz-ctl">
    <label htmlFor={`wz-${half}`}>{HALF_NAMES[half]}</label>
    <select id={`wz-${half}`} value={value} onChange={event => onChange(event.target.value)}>
      <option value="any">Best of any</option>
      {roles.map(role => <option key={role} value={`role:${role}`}>Any {ROLE_NAMES[role]}</option>)}
      {roles.map(role => <optgroup key={role} label={`${ROLE_NAMES[role][0].toUpperCase()}${ROLE_NAMES[role].slice(1)}s`}>
        {list.filter(weapon => roleOf(weapon) === role).map(weapon => <option key={weapon.id} value={`gun:${weapon.id}`}>{weapon.name}</option>)}
      </optgroup>)}
    </select>
  </div>;
}

function PickTag({ weapon }: { weapon: WeaponData }) {
  const rate = pickRate.get(weapon.id);
  return rate ? <span className="tag ok" title={`CODMunity's ${rate.playstyle} pick rate in Warzone`}>{rate.share}% pick rate</span> : null;
}

const APEX_REASON = { faster: 'Wins fights faster here.', slower: 'Slower than the build without it.', 'no-stats': 'Not scored, no Warzone stats published.', 'no-build': 'No legal build with it.' } as const;
const NEW_GUNS = new Set(multiplayerData.patches[0]?.newWeapons.map(item => item.id) ?? []);

/** A primary or secondary slot: the gun as a scan, its Apex, and every part with its icon, as the in-game loadout shows it. */
function WeaponSlot({ option, half, index, onTune }: { option: Option; half: Half; index: number; onTune: Tune }) {
  const { weapon, apex } = option;
  const label = index === 0 ? 'Primary' : 'Secondary';
  return <div className="slot-gun">
    <div className="slot-top">
      <span><span className="slot-label">{label}</span> <span className="jp">{index === 0 ? '主兵装' : '副兵装'}</span></span>
      <span>{NEW_GUNS.has(weapon.id) && <span className="tag new">New · {multiplayerData.patches[0]?.title.replace('Season ', 'S')}</span>} <PickTag weapon={weapon}/></span>
    </div>
    <div className={`scan ${half}`}>
      <img src={weaponImage(weapon.id)} onError={hideMissing} alt=""/>
      <span className="beam"/>
      <span className="ref2">{shortCategory[weapon.category]} · {Math.round(option.stats.mag_size)} rnd</span>
      <span className="ref">SCAN 0{index + 1}<span className="cursor"/></span>
    </div>
    <h4><Typed text={weapon.name} delay={300 + index * 250}/></h4>
    <div className="slot-meta">{shortCategory[weapon.category]} · {option.style.name} · ADS {Math.round(option.stats.ads)} ms · {Math.round(option.stats.mag_size)} rounds</div>
    {apex && <p className={`apex-box ${apex.used ? 'on' : ''}`}><b>APEX {apex.used ? 'ON' : 'OFF'}</b><span>{apex.name}. {APEX_REASON[apex.reason]}</span></p>}
    <ul className="parts">{sortSlots(option.attachments).map(id => {
      const part = data.attachments[id], icon = attachmentImage(id);
      return <li key={id}>
        <span className="slot-name">{slotName(part.slot)}</span>
        <span className="icon-well">{icon && <img src={icon} onError={hideMissing} alt=""/>}</span>
        <span>{part.slot === 'optic' && option.style.optic === 'choice' ? 'Your pick, no stat change' : part.name}</span>
        <span className="ok" aria-hidden="true">[OK]</span>
      </li>;
    })}</ul>
    <button className="tune-btn" onClick={() => onTune(weapon.id, option.style.id, !!apex?.used)}>Tune in Build ▶</button>
  </div>;
}

/** One perk or equipment slot: its icon, what it does, and which of the three sources back it. */
function KitSlot({ label, pick, kind }: { label: string; pick: GearPick; kind: 'perk' | 'elite' | 'equipment' }) {
  const backed = pick.votes.filter(Boolean).length;
  const src = asset(`gear/${pick.id}.webp`);
  return <div className={`kit-slot ${kind === 'elite' ? 'elite' : ''}`} title={pick.reasons.join(' · ')}>
    <div className="kit-head"><span className="slot-label">{label}</span><span className={`tally ${backed < 2 ? 'lo' : ''}`} title={`${backed} of 3 sources pick it`}>{backed}/3</span></div>
    <div className="kit-main">
      {/* Perk icons are line art, so they take the terminal's color. Equipment icons are photos and keep theirs. */}
      <div className="gear-icon">{kind === 'equipment' ? <img src={src} onError={hideMissing} alt=""/> : <span className="mask" style={{ '--src': `url("${src}")` } as CSSProperties}/>}</div>
      <div><h4>{pick.name}</h4><p>{pick.effect}</p></div>
    </div>
    <div className="votes">{SOURCE_NAMES.map((source, i) => <div key={source} className={`vote ${pick.votes[i] ? 'yes' : 'no'}`}>{source}<em>{pick.votes[i] ?? '-'}</em></div>)}</div>
    {(pick.rule || pick.runnerUp) && <div className="kit-note">{[pick.rule, pick.runnerUp && `Next · ${pick.runnerUp}`].filter(Boolean).join(' · ')}</div>}
  </div>;
}

/** Which gun wins each distance. Hover or press a distance to read it; a cursor steps through them on its own. */
function Coverage({ pair }: { pair: Pair }) {
  const [cursor, setCursor] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0, interval = 0;
    const start = window.setTimeout(() => { setCursor(0); interval = window.setInterval(() => setCursor(i = (i + 1) % DISTANCES.length), 450); }, 1600);
    return () => { window.clearTimeout(start); window.clearInterval(interval); };
  }, []);
  const shown = pinned ?? hover ?? cursor;
  const names = { long: pair.long.weapon.name, close: pair.close.weapon.name };
  const longCount = pair.takes.filter(who => who === 'long').length;
  return <div className="cover">
    <div className="cover-top">
      <span className="slot-label">Range coverage · who wins each distance (m)</span>
      <span className="cover-legend"><span className="close">{names.close}</span><span className="long">{names.long}</span></span>
    </div>
    <div className="cells" onMouseLeave={() => setHover(null)}>
      {DISTANCES.map((d, i) => <button key={d} className={`${pair.takes[i]} ${shown === i ? 'cur' : ''}`} aria-pressed={pinned === i} aria-label={`${d} m: ${names[pair.takes[i]]} wins`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setPinned(pinned === i ? null : i)}>{d}</button>)}
    </div>
    <p className="cover-read" aria-live="polite">{shown === null
      ? `${names.long} takes ${longCount} of ${DISTANCES.length} distances, ${names.close} the rest.`
      : <>&gt; {String(DISTANCES[shown]).padStart(3, '0')} m · <span className={pair.takes[shown]}>{names[pair.takes[shown]]}</span> wins this range{pinned !== null ? ' · pinned' : ''}</>}</p>
  </div>;
}

function LoadoutCard({ pair, rank, lead, scanned, style, onTune }: { pair: Pair; rank: number; lead: number; scanned: number; style: GearStyle; onTune: Tune }) {
  const gear = useMemo(() => data.warzone?.gear ? recommendWarzoneGear(data.warzone.gear, style) : null, [style]);
  const rules = data.warzone?.rules;
  return <article className="frame">
    <span className="c tl"/><span className="c tr"/><span className="c bl"/><span className="c br"/>
    <div className="frame-head">
      <div className="frame-rank">{String(rank).padStart(2, '0')}</div>
      <div className="frame-title"><span className="eyebrow">Loadout · {GEAR_STYLES[style].name}</span><h3><Typed text={`${pair.long.weapon.name} / ${pair.close.weapon.name}`} delay={200}/></h3></div>
      <div className="readout"><span className="eyebrow">Avg fight time</span><strong><Roll value={(pair.score / 1000).toFixed(2)}/><small>s</small></strong><small>{rank === 1 ? `Best of ${scanned} pairs` : `+${Math.round(pair.score - lead)} ms vs #1`}</small></div>
    </div>
    <Coverage pair={pair}/>
    <div className="frame-body">
      <div className="frame-weapons">
        <WeaponSlot option={pair.long} half="long" index={0} onTune={onTune}/>
        <WeaponSlot option={pair.close} half="close" index={1} onTune={onTune}/>
      </div>
      {gear && <div className="kit">
        {gear.perks.map((pick, index) => <KitSlot key={pick.id} label={`Perk ${index + 1}`} pick={pick} kind="perk"/>)}
        {gear.elite && <KitSlot label="Elite · found in match" pick={gear.elite} kind="elite"/>}
        <KitSlot label="Lethal" pick={gear.lethal} kind="equipment"/>
        <KitSlot label="Tactical" pick={gear.tactical} kind="equipment"/>
      </div>}
    </div>
    <div className="frame-foot"><span>Src · CODMunity WZ {data.warzone?.retrieved} · WZStats · TimeSaver · Activision</span>{rules && <span>Health {rules.health - rules.plate * rules.plates} + {rules.plates}×{rules.plate} plates · {rules.attachments} attachments</span>}</div>
  </article>;
}

function RankList({ title, rows, picked, onTune }: { title: string; rows: { option: Option; score: number }[]; picked: string; onTune: Tune }) {
  return <section className="guide-section">
    <h2>{title}s ranked</h2>
    <p className="lede">Average fight time over the distances each gun is built for, with its best build.</p>
    <ol className="wz-rank">{rows.map(({ option, score }) => <li key={option.weapon.id} className={picked === `gun:${option.weapon.id}` ? 'picked' : ''}>
      <span className="wz-rank-name">{option.weapon.name}<small>{shortCategory[option.weapon.category]} · {option.style.name}{option.apex?.used ? ` · ${option.apex.name}` : ''}</small></span>
      <PickTag weapon={option.weapon}/>
      <strong>{seconds(score)}</strong>
      <button className="icon-btn" onClick={() => onTune(option.weapon.id, option.style.id, !!option.apex?.used)} aria-label={`Tune the ${option.weapon.name} in Build`} title="Tune in Build"><Icon name="arrow" size={13}/></button>
    </li>)}</ol>
  </section>;
}
