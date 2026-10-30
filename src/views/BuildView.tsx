import { useMemo, useState } from 'react';
import { attachmentEntry, attachmentImage, categories, data, shortCategory, slotName, sortSlots, supported, weaponById, weaponImage } from '../data/game';
import { ATTACHMENT_LIMIT, METRICS, PRESETS, STABILITY, TIE_MS, apexState, fullModel, recoilRatio } from '../engine';
import { effects } from '../effects';
import { Icon } from '../components/Icon';
import type { BuildResult, ClassResult, MetricId, OptimizeResult, PresetId, Settings, Stability, WeaponData } from '../types';

type Props = {
  settings: Settings; change: (patch: Partial<Settings>) => void; selectWeapon: (id: string) => void;
  result: OptimizeResult | null; busy: boolean; error: string;
  onSave: (variant: 'standard' | 'apex', build: BuildResult) => void; onShare: () => void; onCopy: (text: string) => void; onReset: () => void;
};

const TUNABLE: MetricId[] = ['ads', 'stf', 'ttk', 'recoil', 'mobility', 'adsMove', 'flinch', 'hipfire', 'magazine', 'reload', 'velocity', 'sway'];
const emphasisLabel = (value: number) => value === 0 ? 'Off' : value < .75 ? 'Low' : value <= 1.25 ? 'Normal' : value <= 2 ? 'High' : 'Max';
const ms = (value: number | null | undefined) => value == null ? 'n/a' : `${Math.round(value)}`;
const window_ = (distance: number) => `${Math.round(distance * .5)}–${Math.round(distance * 1.5)} m`;

export function BuildView({ settings, change, selectWeapon, result, busy, error, onSave, onShare, onCopy, onReset }: Props) {
  const weapon = weaponById(settings.weaponId)!;
  const [pickerOpen, setPickerOpen] = useState(false);
  const toggle = (key: 'locked' | 'excluded', id: string) => {
    const other = key === 'locked' ? 'excluded' : 'locked';
    change({ [key]: settings[key].includes(id) ? settings[key].filter(item => item !== id) : [...settings[key], id], [other]: settings[other].filter(item => item !== id) });
  };
  const copyClass = (title: string, build: BuildResult) => onCopy([`${weapon.name} · ${title}`, ...sortSlots(build.attachments).map(id => `${slotName(data.attachments[id].slot)}: ${data.attachments[id].name}`)].join('\n'));

  return <div className="build-layout">
    <aside className="controls" aria-label="Build settings">
      <WeaponPicker weapon={weapon} open={pickerOpen} setOpen={setPickerOpen} onSelect={id => { selectWeapon(id); setPickerOpen(false); }}/>
      <section className="control">
        <div className="control-head"><label htmlFor="level">Weapon level</label><output>{settings.level}<small> / {weapon.maxLevel}</small></output></div>
        <input id="level" type="range" min={1} max={weapon.maxLevel ?? 1} value={settings.level} onChange={event => change({ level: Number(event.target.value) })}/>
        <p className="hint">Only attachments unlocked by this level are used.{weapon.apex?.level ? ` ${weapon.apex.name} needs ${weapon.apex.level}.` : ''}</p>
      </section>
      <section className="control">
        <div className="control-head"><span>Playstyle</span></div>
        <div className="presets">{(Object.keys(PRESETS) as PresetId[]).map(id => <button key={id} className={settings.preset === id ? 'active' : ''} aria-pressed={settings.preset === id} onClick={() => change({ preset: id, distanceM: PRESETS[id].distanceM })}>
          <strong>{PRESETS[id].name}</strong><span>{PRESETS[id].blurb}</span>
        </button>)}</div>
      </section>
      <section className="control">
        <div className="control-head"><label htmlFor="distance">Typical fight distance</label><output>{settings.distanceM}<small> m</small></output></div>
        <input id="distance" type="range" min={4} max={50} value={settings.distanceM} onChange={event => change({ distanceM: Number(event.target.value) })}/>
        <p className="hint">Damage range is scored by time to kill across fights from {window_(settings.distanceM)}.</p>
      </section>
      <section className="control">
        <label className="switch"><input type="checkbox" checked={settings.optic} onChange={event => change({ optic: event.target.checked })}/><span/>Use an optic</label>
        <p className="hint">Off keeps iron sights and frees the slot. On reserves one slot for the optic that costs the least.</p>
      </section>
      <details className="control tune">
        <summary><Icon name="sliders" size={15}/>Fine-tune what matters<Icon name="chevron" size={14}/></summary>
        <div className="tune-list">{TUNABLE.map(id => <div key={id} className="tune-row">
          <label htmlFor={`e-${id}`} title={METRICS[id].help}>{METRICS[id].name}</label>
          <output>{emphasisLabel(settings.emphasis[id])}</output>
          <input id={`e-${id}`} type="range" min={0} max={3} step={.25} value={settings.emphasis[id]} onChange={event => change({ emphasis: { ...settings.emphasis, [id]: Number(event.target.value) } })}/>
        </div>)}</div>
        <button className="link" onClick={onReset}>Reset all settings for this gun</button>
      </details>
    </aside>

    <section className="workspace" aria-busy={busy}>
      <Hero weapon={weapon} result={result} settings={settings} busy={busy}/>
      {!fullModel(weapon) && <div className="callout"><Icon name="info" size={16}/><p><b>Handling-only build.</b> The stat data covers aim speed, recoil and movement for this gun, but not pellet spread, one-shot range or slug behavior. Those decide most {shortCategory[weapon.category]?.toLowerCase() ?? 'weapon'} fights, so treat these picks as a starting point.</p></div>}
      {error && <div className="callout bad"><Icon name="info" size={16}/><p>{error}</p></div>}
      {result?.warnings.map(text => <div className="callout" key={text}><Icon name="info" size={16}/><p>{text}</p></div>)}
      {(settings.locked.length > 0 || settings.excluded.length > 0) && <div className="pins">
        {settings.locked.map(id => <button key={id} className="pin locked" onClick={() => toggle('locked', id)}><Icon name="lock" size={12}/>{data.attachments[id]?.name}<Icon name="close" size={12}/></button>)}
        {settings.excluded.map(id => <button key={id} className="pin excluded" onClick={() => toggle('excluded', id)}><Icon name="ban" size={12}/>{data.attachments[id]?.name}<Icon name="close" size={12}/></button>)}
        <button className="link" onClick={() => change({ locked: [], excluded: [] })}>Clear all</button>
      </div>}
      <div className={`classes ${busy ? 'is-busy' : ''}`}>
        <ClassCard index={1} title="No Apex" weapon={weapon} result={result?.standard} settings={settings} change={change} toggle={toggle} onSave={build => onSave('standard', build)} onCopy={build => copyClass('No Apex', build)}/>
        <ClassCard index={2} title={weapon.apex?.name ?? 'Apex'} weapon={weapon} result={result?.apex} settings={settings} change={change} toggle={toggle} onSave={build => onSave('apex', build)} onCopy={build => copyClass(weapon.apex?.name ?? 'Apex', build)} apex/>
      </div>
      {result && <CompareTable weapon={weapon} result={result} settings={settings}/>}
      <div className="share-row">
        <p>Build codes come from the game, so make the class in Gunsmith and it will give you a code to share.</p>
        <button className="button ghost" onClick={onShare}><Icon name="share" size={15}/>Share these settings</button>
      </div>
      <details className="method">
        <summary>How the optimizer scores builds<Icon name="chevron" size={14}/></summary>
        <ul>
          <li>Every legal combination of up to {ATTACHMENT_LIMIT} attachments is checked. Attachments that are worse in every scored stat than another in the same slot are skipped first, which cannot change the winner.</li>
          <li>Attachment changes multiply together, the way CODMunity combines them. A +18% range muzzle and a +28% range barrel give 1.18 × 1.28 = +51%.</li>
          <li>The score is milliseconds of fight time saved against the stock gun. ADS, sprint-to-fire and time to kill count in real milliseconds. One percent of recoil counts as {Math.round(PRESETS[settings.preset].weights.recoil)}% of the time a missed shot costs, so slow-firing guns value recoil more.</li>
          <li>Recoil above stock is penalized faster than it grows, because a gun gets much harder to hold past a point.</li>
          <li>Time to kill assumes chest hits with every bullet. Damage range attachments stretch every damage band by their multiplier.</li>
          <li>The stability check rescores the top {STABILITY.pool.toLocaleString()} builds {STABILITY.samples} times, each with every priority scaled by up to {STABILITY.weightSpread}x either way and the fight distance moved by up to {STABILITY.distanceSpread * 100}%. Core parts are in at least 75% of those winners, flex parts in under 40%. A test checks that this matches a full search almost every time.</li>
        </ul>
      </details>
    </section>
  </div>;
}

function WeaponPicker({ weapon, open, setOpen, onSelect }: { weapon: WeaponData; open: boolean; setOpen: (open: boolean) => void; onSelect: (id: string) => void }) {
  const [category, setCategory] = useState(weapon.category);
  const list = data.weapons.filter(item => item.category === category);
  return <section className="picker">
    <button className="picker-current" onClick={() => setOpen(!open)} aria-expanded={open}>
      <img src={weaponImage(weapon.id)} alt=""/>
      <span><small>{weapon.category}</small><strong>{weapon.name}</strong></span>
      <Icon name="chevron" size={16}/>
    </button>
    {open && <div className="picker-panel">
      <div className="picker-cats" role="tablist">{categories.map(item => <button key={item} role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{shortCategory[item]}</button>)}</div>
      <div className="picker-list">{list.map(item => {
        const ok = supported(item);
        return <button key={item.id} disabled={!ok} className={item.id === weapon.id ? 'active' : ''} onClick={() => onSelect(item.id)}>
          <img src={weaponImage(item.id)} alt="" loading="lazy"/>
          <span><strong>{item.name}</strong><small>{ok ? `${item.rpm ?? '?'} rpm · ${item.magazine ?? '?'} rds${item.apex ? ' · Apex' : ''}` : 'No Gunsmith data'}</small></span>
        </button>;
      })}</div>
    </div>}
  </section>;
}

function Hero({ weapon, result, settings, busy }: { weapon: WeaponData; result: OptimizeResult | null; settings: Settings; busy: boolean }) {
  const base = weapon.base!;
  const facts = [
    { label: 'Fire rate', value: weapon.rpm ? `${weapon.rpm}` : 'n/a', unit: 'rpm' },
    { label: 'Magazine', value: `${weapon.magazine ?? Math.round(base.mag_size)}`, unit: 'rds' },
    { label: 'ADS', value: ms(base.ads), unit: 'ms' },
    { label: 'Sprint to fire', value: ms(base.stf), unit: 'ms' },
    { label: `TTK ${window_(settings.distanceM)}`, value: ms(result?.baseTtkMs), unit: result?.baseTtkMs ? 'ms' : '' },
  ];
  return <section className="hero">
    <div className="hero-copy">
      <span className="eyebrow">{weapon.category}{busy && <i className="spinner" aria-label="Calculating"/>}</span>
      <h1>{weapon.name}</h1>
      <p>{weapon.description}</p>
    </div>
    <div className="hero-art"><img src={weaponImage(weapon.id)} alt={`${weapon.name} render`}/></div>
    <dl className="facts">{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}<small>{fact.unit}</small></dd></div>)}</dl>
  </section>;
}

function ClassCard({ index, title, weapon, result, settings, change, toggle, onSave, onCopy, apex = false }: {
  index: number; title: string; weapon: WeaponData; result: ClassResult | undefined; settings: Settings; change: (patch: Partial<Settings>) => void;
  toggle: (key: 'locked' | 'excluded', id: string) => void; onSave: (build: BuildResult) => void; onCopy: (build: BuildResult) => void; apex?: boolean;
}) {
  const best = result?.best ?? null;
  const contributions = useMemo(() => new Map(best?.contributions.map(item => [item.id, item.score]) ?? []), [best]);
  const holds = useMemo(() => new Map(result?.stability?.parts.map(item => [item.id, item.share]) ?? []), [result]);
  const needed = weapon.apex?.level ?? weapon.maxLevel ?? 0;
  return <article className={`class-card ${apex ? 'apex' : ''}`}>
    <header>
      <span className="class-index">Class {index}</span>
      <h2>{apex ? <><Icon name="bolt" size={16}/>{title}</> : title}</h2>
      {best && <div className="edge" title="Estimated milliseconds of fight time saved against the stock gun"><strong>{best.score >= 0 ? '+' : '−'}{Math.abs(Math.round(best.score))}</strong><span>ms edge</span></div>}
    </header>
    {apex && weapon.apex && <p className="apex-note">{weapon.apex.description}{weapon.apex.blocks.length ? <> Blocks the <b>{weapon.apex.blocks.map(slotName).map(name => name.toLowerCase()).join(', ')}</b> slot{weapon.apex.blocks.length > 1 ? 's' : ''}.</> : ' Blocks no slots.'}</p>}
    {best && result?.stability && <StabilityNote stability={result.stability}/>}
    {!result && <div className="class-empty"><i className="spinner"/>Finding the best build</div>}
    {result && !result.available && <div className="class-empty locked">
      <Icon name="lock" size={22}/><p>{result.reason}</p>
      {apex && weapon.apex && settings.level < needed && apexState(weapon, settings.level).reason && <button className="button ghost" onClick={() => change({ level: needed })}>Set weapon level to {needed}</button>}
    </div>}
    {best && <>
      <ul className="attachments">
        {sortSlots(best.attachments).map(id => {
          const info = data.attachments[id];
          const entry = attachmentEntry(weapon.id, id)!;
          const image = attachmentImage(id);
          const locked = settings.locked.includes(id);
          const value = contributions.get(id) ?? 0;
          const hold = holds.get(id);
          return <li key={id} className={locked ? 'is-locked' : ''}>
            <span className="att-icon">{image ? <img src={image} alt="" loading="lazy"/> : <Icon name="grid" size={18}/>}</span>
            <div className="att-main">
              <span className="att-slot">{slotName(info.slot)}{info.kind && <> · {info.kind}</>}</span>
              <strong>{info.name}</strong>
              <span className="chips">{effects(entry.mods, 3).map(effect => <em key={effect.label} className={effect.good ? 'good' : 'bad'}>{effect.label} {effect.text}</em>)}</span>
            </div>
            <div className="att-side">
              <span className="att-value" title="What removing this attachment would cost, in milliseconds of fight time">{value >= 0 ? '+' : '−'}{Math.abs(Math.round(value))} ms</span>
              <span className="att-level">{entry.level ? `Lv ${entry.level}` : 'Lv ?'}</span>
              {hold !== undefined && <span className={`att-hold ${hold >= .75 ? 'core' : hold < .4 ? 'flex' : ''}`} title={`Used by ${Math.round(hold * 100)}% of the winning builds when your settings are nudged`}>{hold >= .75 ? 'Core' : hold < .4 ? 'Flex' : 'Likely'} {Math.round(hold * 100)}%</span>}
              <span className="att-actions">
                <button className={`icon-btn ${locked ? 'on' : ''}`} onClick={() => toggle('locked', id)} aria-pressed={locked} aria-label={`${locked ? 'Unlock' : 'Lock'} ${info.name}`} title={locked ? 'Locked in every build' : 'Lock into every build'}><Icon name="lock" size={14}/></button>
                <button className="icon-btn" onClick={() => toggle('excluded', id)} aria-label={`Exclude ${info.name}`} title="Never use this attachment"><Icon name="ban" size={14}/></button>
              </span>
            </div>
          </li>;
        })}
        {best.attachments.length < ATTACHMENT_LIMIT && <li className="att-empty"><Icon name="info" size={14}/>{ATTACHMENT_LIMIT - best.attachments.length} slot{best.attachments.length === ATTACHMENT_LIMIT - 1 ? '' : 's'} left open. Nothing else unlocked improves this build.</li>}
      </ul>
      <footer>
        <button className="button" onClick={() => onSave(best)}><Icon name="save" size={15}/>Save class</button>
        <button className="button ghost" onClick={() => onCopy(best)}><Icon name="copy" size={15}/>Copy list</button>
      </footer>
      {result!.alternatives.length > 0 && <details className="alternatives">
        <summary>Close runners-up<Icon name="chevron" size={14}/></summary>
        <ol>{result!.alternatives.map(alt => {
          const swapIn = alt.attachments.filter(id => !best.attachments.includes(id));
          const swapOut = best.attachments.filter(id => !alt.attachments.includes(id));
          return <li key={alt.attachments.join()}>
            <span className="alt-diff">−{Math.max(0, Math.round(best.score - alt.score))} ms</span>
            <span>{swapIn.length ? <>Swap in <b>{swapIn.map(id => data.attachments[id].name).join(', ')}</b></> : 'Same parts'}{swapOut.length ? <> for {swapOut.map(id => data.attachments[id].name).join(', ')}</> : ''}</span>
          </li>;
        })}</ol>
      </details>}
      <p className="evaluated">{result!.evaluated.toLocaleString()} legal builds checked</p>
    </>}
  </article>;
}

function StabilityNote({ stability }: { stability: Stability }) {
  const near = stability.nearBest;
  const tone = near >= .7 ? 'solid' : near >= .4 ? 'mixed' : 'shaky';
  const label = tone === 'solid' ? 'Solid pick' : tone === 'mixed' ? 'Depends on the details' : 'Close call';
  return <div className={`stability ${tone}`} title={`Your priorities were nudged up to ${STABILITY.weightSpread}x either way and your fight distance up to ${STABILITY.distanceSpread * 100}%, ${stability.samples} times.`}>
    <p><strong>{label}.</strong> Within {TIE_MS} ms of the best build in {Math.round(near * 100)}% of nearby settings.</p>
    {stability.contenders.length > 0 && <p className="contenders">Often wins instead: {stability.contenders.slice(0, 3).map(item => `${data.attachments[item.id].name} (${Math.round(item.share * 100)}%)`).join(', ')}.</p>}
  </div>;
}

function CompareTable({ weapon, result, settings }: { weapon: WeaponData; result: OptimizeResult; settings: Settings }) {
  const stock = result.stock;
  if (!stock) return null;
  const base = weapon.base!;
  const cols = [{ label: 'Stock', build: stock }, { label: 'Class 1', build: result.standard.best }, { label: 'Class 2', build: result.apex.best }];
  type Row = { label: string; get: (build: BuildResult) => number | null; fmt: (value: number) => string; lowerBetter: boolean; show?: boolean };
  const rows: Row[] = [
    { label: 'ADS time', get: b => b.stats.ads, fmt: v => `${Math.round(v)} ms`, lowerBetter: true },
    { label: 'Sprint to fire', get: b => b.stats.stf, fmt: v => `${Math.round(v)} ms`, lowerBetter: true },
    { label: `Avg TTK, ${window_(settings.distanceM)}`, get: b => b.ttkMs, fmt: v => `${Math.round(v)} ms`, lowerBetter: true, show: stock.ttkMs != null },
    { label: 'Damage range', get: b => b.stats.range / base.range, fmt: v => `×${v.toFixed(2)}`, lowerBetter: false },
    { label: 'Recoil vs stock', get: b => (recoilRatio(b.stats, base) - 1) * 100, fmt: v => `${v > 0.5 ? '+' : v < -0.5 ? '−' : ''}${Math.abs(Math.round(v))}%`, lowerBetter: true },
    { label: 'Fire rate', get: b => weapon.rpm ? weapon.rpm * b.stats.rpm / base.rpm : null, fmt: v => `${Math.round(v)} rpm`, lowerBetter: false, show: cols.some(c => c.build && Math.abs(c.build.stats.rpm - base.rpm) > .5) },
    { label: 'Magazine', get: b => Math.round((weapon.magazine ?? base.mag_size) * b.stats.mag_size / base.mag_size), fmt: v => `${v} rds`, lowerBetter: false },
    { label: 'Sprint speed', get: b => b.stats.sprint, fmt: v => `${v.toFixed(2)} m/s`, lowerBetter: false },
    { label: 'ADS movement', get: b => b.stats.ads_movement, fmt: v => `${v.toFixed(2)} m/s`, lowerBetter: false },
    { label: 'Flinch vs stock', get: b => (b.stats.flinch_received / base.flinch_received - 1) * 100, fmt: v => `${v > 0.5 ? '+' : v < -0.5 ? '−' : ''}${Math.abs(Math.round(v))}%`, lowerBetter: true },
    { label: 'Reload', get: b => b.stats.reload / 1000, fmt: v => `${v.toFixed(2)} s`, lowerBetter: true },
  ];
  return <section className="compare">
    <h3>Stock vs your two classes</h3>
    <div className="table-wrap"><table>
      <thead><tr><th scope="col">Stat</th>{cols.map(col => <th scope="col" key={col.label}>{col.label}</th>)}</tr></thead>
      <tbody>{rows.filter(row => row.show !== false).map(row => {
        const stockValue = row.get(stock);
        return <tr key={row.label}><th scope="row">{row.label}</th>{cols.map(col => {
          const value = col.build ? row.get(col.build) : null;
          // Only color a change the reader can see in the shown value.
          const same = value == null || stockValue == null || col.build === stock || row.fmt(value) === row.fmt(stockValue);
          const tone = same ? '' : (value! < stockValue!) === row.lowerBetter ? 'good' : 'bad';
          return <td key={col.label} className={tone}>{value == null ? 'n/a' : row.fmt(value)}</td>;
        })}</tr>;
      })}</tbody>
    </table></div>
  </section>;
}
