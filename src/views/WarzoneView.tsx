import { useMemo, useState } from 'react';
import { hideMissing, multiplayerData, shortCategory, slotName, sortSlots, weaponImage } from '../data/game';
import { modeView } from '../data/mode';
import { roleOf } from '../engine';
import type { Role } from '../engine';
import { DISTANCES, HALF_MISS_M, HALF_ROLES, MIXES, bestPairs, optionFor, soloScore } from '../engine/warzone';
import type { Half, MixId, Option, Pair } from '../engine/warzone';
import { Icon } from '../components/Icon';
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

export function WarzoneView({ onTune }: { onTune: (weaponId: string, styleId: string) => void }) {
  const [long, setLong] = useState('role:ar');
  const [close, setClose] = useState('role:smg');
  const [mix, setMix] = useState<MixId>('mixed');

  const pairs = useMemo(() => bestPairs(data, mix, allowed('long', long), allowed('close', close), 5), [mix, long, close]);
  const ranked = (half: Half, choice: string) => {
    // A single picked gun ranks against the rest of its class, so the list still answers "how good is it?".
    const pickedRole = choice.startsWith('gun:') ? roleOf(data.weapons.find(weapon => weapon.id === choice.slice(4))!) : null;
    const ids = pickedRole ? guns(half).filter(weapon => roleOf(weapon) === pickedRole).map(weapon => weapon.id) : allowed(half, choice);
    return ids.map(id => optionFor(data, data.weapons.find(weapon => weapon.id === id)!, half)).filter((option): option is Option => !!option)
      .map(option => ({ option, score: soloScore(option, mix) })).sort((a, b) => a.score - b.score);
  };
  const longRanked = useMemo(() => ranked('long', long), [mix, long]);
  const closeRanked = useMemo(() => ranked('close', close), [mix, close]);

  return <div className="data-view warzone-view">
    <header className="page-head">
      <span className="eyebrow">Warzone</span>
      <h1>Build a Warzone loadout</h1>
      <p>Pick what you want in each slot, or leave it open. Every pair runs each gun's best Warzone build and is scored on how fast it wins fights from 5 to 150 m, with whichever gun is faster at each distance. A kill takes 300 damage through plates.</p>
    </header>

    <section className="guide-section wz-setup">
      <div className="wz-presets">{PRESETS.map(preset => <button key={preset.label} className={`button ${long === preset.long && close === preset.close ? '' : 'ghost'} small`} onClick={() => { setLong(preset.long); setClose(preset.close); }}>{preset.label}</button>)}</div>
      <div className="wz-slots">
        <SlotPicker half="long" value={long} onChange={setLong}/>
        <SlotPicker half="close" value={close} onChange={setClose}/>
      </div>
      <div>
        <div className="seg" role="group" aria-label="Where you fight">{(Object.keys(MIXES) as MixId[]).map(id => <button key={id} className={mix === id ? 'active' : ''} aria-pressed={mix === id} onClick={() => setMix(id)}>{MIXES[id].name}</button>)}</div>
        <p className="hint">{MIXES[mix].blurb}</p>
      </div>
    </section>

    <section className="guide-section">
      <h2>Best loadouts</h2>
      {pairs.length === 0 && <p className="lede">No pair fits those choices. Pick a different gun for one slot.</p>}
      <div className="patch-list">{pairs.map((pair, index) => <PairCard key={`${pair.long.weapon.id}-${pair.close.weapon.id}`} pair={pair} rank={index + 1} lead={pairs[0].score} onTune={onTune}/>)}</div>
    </section>

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
        <li>Each gun runs its best build for its job, found with every part unlocked and no Apex. Press Tune in Build to redo any gun with your own unlocks, locks and Apex.</li>
        <li>Movement speed, tactical sprint and how easy a gun is to control by hand are not part of the score. An LMG can win fights on paper and still be slow to move with.</li>
        <li>Shotguns and the Hyeon Burst have no damage model, so they are left out. Stats, damage and builds are CODMunity's Warzone records, read {data.warzone?.retrieved}. Pick rates are CODMunity's.</li>
      </ul>
    </section>
  </div>;
}

function SlotPicker({ half, value, onChange }: { half: Half; value: string; onChange: (value: string) => void }) {
  const list = guns(half);
  const roles = [...new Set(list.map(roleOf))];
  return <label className="wz-slot">
    <span>{HALF_NAMES[half]}</span>
    <select value={value} onChange={event => onChange(event.target.value)}>
      <option value="any">Best of any</option>
      {roles.map(role => <option key={role} value={`role:${role}`}>Any {ROLE_NAMES[role]}</option>)}
      {roles.map(role => <optgroup key={role} label={`${ROLE_NAMES[role][0].toUpperCase()}${ROLE_NAMES[role].slice(1)}s`}>
        {list.filter(weapon => roleOf(weapon) === role).map(weapon => <option key={weapon.id} value={`gun:${weapon.id}`}>{weapon.name}</option>)}
      </optgroup>)}
    </select>
  </label>;
}

function PickTag({ weapon }: { weapon: WeaponData }) {
  const rate = pickRate.get(weapon.id);
  return rate ? <span className="tag ok" title={`CODMunity's ${rate.playstyle} pick rate in Warzone`}>{rate.share}% pick rate</span> : null;
}

function GunHalf({ option, label, onTune }: { option: Option; label: string; onTune: (weaponId: string, styleId: string) => void }) {
  const { weapon } = option;
  return <div className="wz-gun">
    <div className="wz-gun-head">
      <img src={weaponImage(weapon.id)} onError={hideMissing} alt=""/>
      <div><span className="eyebrow">{label} · {shortCategory[weapon.category]}</span><h3>{weapon.name}</h3></div>
    </div>
    <p className="patch-note">{option.style.name} build · ADS {Math.round(option.stats.ads)} ms · {Math.round(option.stats.mag_size)} rounds <PickTag weapon={weapon}/></p>
    <ul className="wz-parts">{sortSlots(option.attachments).map(id => <li key={id}><span>{slotName(data.attachments[id].slot)}</span>{data.attachments[id].slot === 'optic' && option.style.optic === 'choice' ? 'Your pick. Optics change no stats' : data.attachments[id].name}</li>)}</ul>
    <button className="link" onClick={() => onTune(weapon.id, option.style.id)}>Tune in Build <Icon name="arrow" size={13}/></button>
  </div>;
}

/** Which gun wins each distance, as a strip. */
function Coverage({ pair }: { pair: Pair }) {
  return <div className="wz-cover" role="img" aria-label={`${pair.long.weapon.name} takes ${pair.takes.filter(who => who === 'long').length} of ${DISTANCES.length} distances, ${pair.close.weapon.name} the rest`}>
    {DISTANCES.map((d, i) => <div key={d} className={pair.takes[i]}>
      <span>{d}</span>
    </div>)}
  </div>;
}

function PairCard({ pair, rank, lead, onTune }: { pair: Pair; rank: number; lead: number; onTune: (weaponId: string, styleId: string) => void }) {
  return <article className="patch-card wz-pair">
    <div className="patch-card-head">
      <div><span className="eyebrow">#{rank}</span><h3>{pair.long.weapon.name} + {pair.close.weapon.name}</h3></div>
      <div className="wz-score"><strong>{seconds(pair.score)}</strong><small>{rank === 1 ? 'average fight' : `+${Math.round(pair.score - lead)} ms vs #1`}</small></div>
    </div>
    <div>
      <Coverage pair={pair}/>
      <p className="wz-legend"><i className="long"/>{pair.long.weapon.name} <i className="close"/>{pair.close.weapon.name} <span>distance in meters</span></p>
    </div>
    <div className="wz-guns">
      <GunHalf option={pair.long} label="Long range" onTune={onTune}/>
      <GunHalf option={pair.close} label="Close range" onTune={onTune}/>
    </div>
  </article>;
}

function RankList({ title, rows, picked, onTune }: { title: string; rows: { option: Option; score: number }[]; picked: string; onTune: (weaponId: string, styleId: string) => void }) {
  return <section className="guide-section">
    <h2>{title}s ranked</h2>
    <p className="lede">Average fight time over the distances each gun is built for, with its best build.</p>
    <ol className="wz-rank">{rows.map(({ option, score }) => <li key={option.weapon.id} className={picked === `gun:${option.weapon.id}` ? 'picked' : ''}>
      <span className="wz-rank-name">{option.weapon.name}<small>{shortCategory[option.weapon.category]} · {option.style.name}</small></span>
      <PickTag weapon={option.weapon}/>
      <strong>{seconds(score)}</strong>
      <button className="icon-btn" onClick={() => onTune(option.weapon.id, option.style.id)} aria-label={`Tune the ${option.weapon.name} in Build`} title="Tune in Build"><Icon name="arrow" size={13}/></button>
    </li>)}</ol>
  </section>;
}
