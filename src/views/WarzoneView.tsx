import { useMemo, useState } from 'react';
import { hideMissing, multiplayerData, shortCategory, slotName, sortSlots, weaponImage } from '../data/game';
import { modeView } from '../data/mode';
import { roleOf } from '../engine';
import type { Role } from '../engine';
import { DISTANCES, HALF_MISS_M, HALF_ROLES, MIXES, bestPairs, optionFor, soloScore } from '../engine/warzone';
import type { Half, MixId, Option, Pair } from '../engine/warzone';
import { GEAR_STYLES, recommendWarzoneGear } from '../engine/wzgear';
import type { GearPick, GearStyle } from '../engine/wzgear';
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
      <div className="wz-slots">
        <div>
          <span className="wz-label">Where you fight</span>
          <div className="seg" role="group" aria-label="Where you fight">{(Object.keys(MIXES) as MixId[]).map(id => <button key={id} className={mix === id ? 'active' : ''} aria-pressed={mix === id} onClick={() => setMix(id)}>{MIXES[id].name}</button>)}</div>
          <p className="hint">{MIXES[mix].blurb}</p>
        </div>
        <label className="wz-slot">
          <span>Perks and equipment for</span>
          <select value={gearStyle} onChange={event => setGearStyle(event.target.value as GearStyle | 'auto')}>
            <option value="auto">Match each loadout's guns</option>
            {(Object.keys(GEAR_STYLES) as GearStyle[]).map(id => <option key={id} value={id}>{GEAR_STYLES[id].name}: {GEAR_STYLES[id].blurb}</option>)}
          </select>
        </label>
      </div>
    </section>

    <section className="guide-section">
      <h2>Best loadouts</h2>
      {pairs.length === 0 && <p className="lede">No pair fits those choices. Pick a different gun for one slot.</p>}
      <div className="patch-list">{pairs.map((pair, index) => <LoadoutCard key={`${pair.long.weapon.id}-${pair.close.weapon.id}`} pair={pair} rank={index + 1} lead={pairs[0].score} style={gearStyle === 'auto' ? autoStyle(pair, mix) : gearStyle} onTune={onTune}/>)}</div>
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
        <li>Each gun runs its best build for its job, found with every part unlocked, once with its Apex and once without. The Apex goes in when its Warzone stat changes win this kind of match faster. Apex damage conversions, like the MAR-9 Auto's switch to full auto, are not modeled, and some Apex attachments have no Warzone stats yet. Press Tune in Build to redo any gun with your own unlocks and locks.</li>
        <li>Perks, the lethal and the tactical are scored from three sources: WZStats' Season 1 Warzone tier lists (meta tier counts 2, A tier 1), TimeSaver's perk combo for the playstyle (1.5) and Activision's default loadouts for it (1), plus this site's own rule of what suits the playstyle (1). Each pick lists its reasons. Elite perks are found or bought in a match.</li>
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

const APEX_REASON = { faster: 'wins fights faster here', slower: 'slower than the build without it', 'no-stats': 'not scored, no Warzone stats published', 'no-build': 'no legal build with it' } as const;

/** A primary or secondary slot: the gun, its Apex, and every part, as the in-game loadout shows it. */
function WeaponSlot({ option, label, onTune }: { option: Option; label: string; onTune: Tune }) {
  const { weapon, apex } = option;
  return <div className="wz-weapon">
    <div className="wz-weapon-head">
      <span className="wz-slot-label">{label}</span>
      <PickTag weapon={weapon}/>
    </div>
    <div className="wz-gun-head">
      <img src={weaponImage(weapon.id)} onError={hideMissing} alt=""/>
      <div><h3>{weapon.name}</h3><span className="wz-sub">{shortCategory[weapon.category]} · {option.style.name} · ADS {Math.round(option.stats.ads)} ms · {Math.round(option.stats.mag_size)} rounds</span></div>
    </div>
    {apex && <p className={`wz-apex ${apex.used ? 'on' : ''}`} title={`${apex.name}: ${APEX_REASON[apex.reason]}`}>
      <b>Apex</b>{apex.used ? `${apex.name}, on` : `${apex.name}, off`}<small>{APEX_REASON[apex.reason]}</small>
    </p>}
    <ul className="wz-parts">{sortSlots(option.attachments).map(id => <li key={id}><span>{slotName(data.attachments[id].slot)}</span>{data.attachments[id].slot === 'optic' && option.style.optic === 'choice' ? 'Your pick, no stat change' : data.attachments[id].name}</li>)}</ul>
    <button className="link" onClick={() => onTune(weapon.id, option.style.id, !!apex?.used)}>Tune in Build <Icon name="arrow" size={13}/></button>
  </div>;
}

function GearTile({ label, pick, elite }: { label: string; pick: GearPick; elite?: boolean }) {
  return <div className={`wz-tile ${elite ? 'elite' : ''}`} title={`${pick.effect}${pick.runnerUp ? `\nRunner-up: ${pick.runnerUp}` : ''}`}>
    <span className="wz-slot-label">{label}</span>
    <strong>{pick.name}</strong>
    <p>{pick.effect}</p>
    <small>{pick.reasons.join(' · ')}{pick.runnerUp ? ` · next best ${pick.runnerUp}` : ''}</small>
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

function LoadoutCard({ pair, rank, lead, style, onTune }: { pair: Pair; rank: number; lead: number; style: GearStyle; onTune: Tune }) {
  const gear = useMemo(() => data.warzone?.gear ? recommendWarzoneGear(data.warzone.gear, style) : null, [style]);
  return <article className="patch-card wz-pair">
    <div className="patch-card-head">
      <div><span className="eyebrow">Loadout #{rank} · {GEAR_STYLES[style].name}</span><h3>{pair.long.weapon.name} + {pair.close.weapon.name}</h3></div>
      <div className="wz-score"><strong>{seconds(pair.score)}</strong><small>{rank === 1 ? 'average fight' : `+${Math.round(pair.score - lead)} ms vs #1`}</small></div>
    </div>
    <div>
      <Coverage pair={pair}/>
      <p className="wz-legend"><i className="long"/>{pair.long.weapon.name} <i className="close"/>{pair.close.weapon.name} <span>who wins each distance, in meters</span></p>
    </div>
    <div className="wz-loadout">
      <div className="wz-weapons">
        <WeaponSlot option={pair.long} label="Primary" onTune={onTune}/>
        <WeaponSlot option={pair.close} label="Secondary" onTune={onTune}/>
      </div>
      {gear && <div className="wz-kit">
        <div className="wz-perks">
          {gear.perks.map((pick, index) => <GearTile key={pick.id} label={`Perk ${index + 1}`} pick={pick}/>)}
          {gear.elite && <GearTile label="Elite, found in match" pick={gear.elite} elite/>}
        </div>
        <div className="wz-equip">
          <GearTile label="Lethal" pick={gear.lethal}/>
          <GearTile label="Tactical" pick={gear.tactical}/>
        </div>
      </div>}
    </div>
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
