import { useMemo } from 'react';
import { attachmentImage, data, slotName, sortSlots, supported, weaponById, weaponImage } from '../data/game';
import { evaluateBuild, playstyleFor } from '../engine';
import { statRows, tone } from '../statRows';
import { Icon } from '../components/Icon';
import type { Settings } from '../types';

export type CompareItem = { id: string; label: string; weaponId: string; attachments: string[]; apex: boolean };

const SLOT_ORDER = ['optic', 'muzzle', 'barrel', 'laser', 'underbarrel', 'guard', 'magazine', 'ammunition', 'rear-grip', 'stock', 'comb', 'bolt', 'trigger-action', 'cylinder'];
const window_ = (distance: number) => `${Math.round(distance * .5)}–${Math.round(distance * 1.5)} m`;

export function CompareView({ items, setItems, settings, onCopy, onBuild }: { items: CompareItem[]; setItems: (update: (items: CompareItem[]) => CompareItem[]) => void; settings: Settings; onCopy: (text: string) => void; onBuild: () => void }) {
  const columns = useMemo(() => items.map(item => {
    const weapon = weaponById(item.weaponId)!;
    return { item, weapon, style: playstyleFor(weapon, settings.preset), ...evaluateBuild(data, weapon, { ...settings, weaponId: weapon.id }, item.attachments, item.apex) };
  }), [items, settings]);
  const rows = statRows(window_(settings.distanceM), metric => columns.some(column => column.style.weights[metric] > 0));
  const update = (id: string, patch: Partial<CompareItem>) => setItems(list => list.map(item => item.id === id ? { ...item, ...patch } : item));
  const setSlot = (item: CompareItem, slot: string, attachmentId: string) => {
    const rest = item.attachments.filter(id => data.attachments[id]?.slot !== slot);
    update(item.id, { attachments: attachmentId ? [...rest, attachmentId] : rest });
  };
  const addCustom = () => setItems(list => [...list.slice(list.length >= 3 ? 1 : 0), { id: crypto.randomUUID(), label: 'Custom build', weaponId: settings.weaponId, attachments: [], apex: false }]);
  const baseline = columns[0];

  return <div className="compare-view">
    <header className="page-head with-actions">
      <div>
        <span className="eyebrow">Compare</span>
        <h1>Builds side by side</h1>
        <p>Add builds from the Build tab, a guide site or your saved classes, or make your own here. Change any part and every number updates. Every column is measured against the baseline at {settings.distanceM} m, scored with your current playstyle, or with its own class's default playstyle when the gun is from another class. Use Make baseline to pick which one.</p>
      </div>
      <div className="head-actions">
        <button className="button" onClick={addCustom}><Icon name="plus" size={15}/>Custom build</button>
        {items.length > 0 && <button className="button ghost" onClick={() => setItems(() => [])}>Clear</button>}
      </div>
    </header>
    {items.length === 0 ? <div className="empty">
      <Icon name="grid" size={34}/>
      <h2>Nothing to compare yet</h2>
      <p>Use Compare on a class card or a guide build, or start a custom build for the gun you have open.</p>
      <div className="row-actions"><button className="button" onClick={addCustom}>Start a custom build</button><button className="button ghost" onClick={onBuild}>Go to Build</button></div>
    </div> : <div className="compare-grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))` }}>
      {columns.map(({ item, weapon, build, issues }, index) => {
        const slots = [...new Set((data.loadouts[weapon.id] ?? []).map(entry => data.attachments[entry[0]].slot))]
          .filter(slot => !(item.apex && weapon.apex?.blocks.includes(slot)))
          .sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
        const chosenIn = (slot: string, list: string[]) => list.find(id => data.attachments[id]?.slot === slot) ?? '';
        const text = [`${weapon.name} · ${item.label}${item.apex && weapon.apex ? ` · ${weapon.apex.name}` : ''}`, ...sortSlots(item.attachments).map(id => `${slotName(data.attachments[id].slot)}: ${data.attachments[id].name}`)].join('\n');
        return <article key={item.id} className={`compare-col ${index === 0 ? 'baseline' : ''}`}>
          <header>
            <img src={weaponImage(weapon.id)} alt=""/>
            <div className="compare-title">
              <input aria-label="Build name" value={item.label} maxLength={60} onChange={event => update(item.id, { label: event.target.value })}/>
              <select aria-label="Weapon" value={weapon.id} onChange={event => update(item.id, { weaponId: event.target.value, attachments: [], apex: false })}>
                {data.weapons.filter(supported).map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </div>
            <button className="icon-btn" aria-label={`Remove ${item.label}`} onClick={() => setItems(list => list.filter(other => other.id !== item.id))}><Icon name="close" size={14}/></button>
          </header>
          <div className="baseline-row">{index === 0 ? <span className="baseline-tag">Baseline</span> : <><span className="baseline-tag muted">vs {baseline.item.label}</span><button className="link" onClick={() => setItems(list => [item, ...list.filter(other => other.id !== item.id)])}>Make baseline</button></>}</div>
          {weapon.apex && <label className="switch small"><input type="checkbox" checked={item.apex} onChange={event => update(item.id, { apex: event.target.checked, attachments: event.target.checked ? item.attachments.filter(id => !weapon.apex!.blocks.includes(data.attachments[id]?.slot)) : item.attachments })}/><span/>{weapon.apex.name}</label>}
          {build && <div className="compare-edge"><strong>{build.score >= 0 ? '+' : '−'}{Math.abs(Math.round(build.score))}</strong><span>ms edge vs its stock</span>{index > 0 && baseline.build && baseline.weapon.id === weapon.id && <em className={build.score >= baseline.build.score ? 'good' : 'bad'}>{build.score >= baseline.build.score ? '+' : '−'}{Math.abs(Math.round(build.score - baseline.build.score))} ms vs baseline</em>}</div>}
          <div className="compare-parts">{slots.map(slot => {
            const value = chosenIn(slot, item.attachments);
            const differs = index > 0 && baseline.weapon.id === weapon.id && value !== chosenIn(slot, baseline.item.attachments);
            const image = value ? attachmentImage(value) : null;
            return <label key={slot} className={`compare-part ${differs ? 'diff' : ''} ${value ? '' : 'is-empty'}`}>
              <span className="part-slot">{slotName(slot)}</span>
              <span className="part-pick">{image ? <img src={image} alt=""/> : <i/>}
                <select value={value} onChange={event => setSlot(item, slot, event.target.value)} aria-label={`${slotName(slot)} for ${item.label}`}>
                  <option value="">None</option>
                  {(data.loadouts[weapon.id] ?? []).filter(entry => data.attachments[entry[0]].slot === slot).map(([id, level]) => <option key={id} value={id}>{data.attachments[id].name}{level ? ` (Lv ${level})` : ''}</option>)}
                </select>
              </span>
            </label>;
          })}</div>
          {issues.length > 0 && <ul className="issues">{issues.map(issue => <li key={issue}><Icon name="info" size={13}/>{issue}</li>)}</ul>}
          {build && <table className="compare-stats"><tbody>{rows.filter(row => !row.optional || row.get(build, weapon) != null).map(row => {
            const value = row.get(build, weapon);
            const base = index > 0 && baseline.build ? row.get(baseline.build, baseline.weapon) : null;
            return <tr key={row.label}><th scope="row">{row.label}</th><td className={tone(row, value, base)}>{value == null ? 'n/a' : row.fmt(value)}{value != null && base != null && row.fmt(value) !== row.fmt(base) && <small>{row.delta(value - base)}</small>}</td></tr>;
          })}</tbody></table>}
          <footer><button className="button ghost" onClick={() => onCopy(text)}><Icon name="copy" size={14}/>Copy list</button></footer>
        </article>;
      })}
    </div>}
  </div>;
}
