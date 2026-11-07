import { attachmentImage, data, hideMissing, slotName, sortSlots, weaponById, weaponImage } from '../data/game';
import { Icon } from '../components/Icon';
import type { Settings } from '../types';

export type SavedClass = {
  id: string; name: string; weaponId: string; variant: 'standard' | 'apex'; attachments: string[]; gear?: string[];
  score: number; createdAt: string; dataVersion: string; settings: Settings;
};

export function SavedView({ saved, onLoad, onDelete, onCopy, onBuild, onCompare }: { saved: SavedClass[]; onLoad: (item: SavedClass) => void; onDelete: (id: string) => void; onCopy: (text: string) => void; onBuild: () => void; onCompare: (item: SavedClass) => void }) {
  return <div className="saved">
    <header className="page-head">
      <span className="eyebrow">Saved</span>
      <h1>Your classes</h1>
      <p>Stored in this browser only. Each one keeps the exact attachments you saved, even if the data changes later.</p>
    </header>
    {saved.length === 0 ? <div className="empty">
      <Icon name="save" size={34}/>
      <h2>No saved classes yet</h2>
      <p>Save a class from the Build tab and it shows up here.</p>
      <button className="button" onClick={onBuild}>Build a class<Icon name="arrow" size={15}/></button>
    </div> : <div className="saved-grid">{saved.map(item => {
      const weapon = weaponById(item.weaponId)!;
      const gearNames = (item.gear ?? []).map(id => data.gear.find(gear => gear.id === id)?.name).filter(Boolean);
      const text = [item.name, ...sortSlots(item.attachments).map(id => `${slotName(data.attachments[id].slot)}: ${data.attachments[id].name}`), ...(gearNames.length ? [`Perks, equipment and streaks: ${gearNames.join(', ')}`] : [])].join('\n');
      return <article key={item.id} className={`saved-card ${item.variant === 'apex' ? 'apex' : ''}`}>
        <div className="saved-art"><img src={weaponImage(weapon.id)} onError={hideMissing} alt="" loading="lazy"/></div>
        <div className="saved-body">
          <span className="eyebrow">{item.variant === 'apex' ? 'Apex class' : 'No Apex'} · {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{item.dataVersion !== data.version && <b className="tag warn">Older data</b>}</span>
          <h2>{item.name}</h2>
          <ul>{sortSlots(item.attachments).map(id => {
            const image = attachmentImage(id);
            return <li key={id}>{image ? <img src={image} alt=""/> : <Icon name="grid" size={14}/>}<span>{data.attachments[id].name}</span></li>;
          })}</ul>
          {gearNames.length > 0 && <p className="saved-gear">{gearNames.join(' · ')}</p>}
        </div>
        <footer>
          <button className="button ghost" onClick={() => onLoad(item)}>Open<Icon name="arrow" size={14}/></button>
          <button className="icon-btn" onClick={() => onCompare(item)} aria-label={`Compare ${item.name}`} title="Add to Compare"><Icon name="grid" size={15}/></button>
          <button className="icon-btn" onClick={() => onCopy(text)} aria-label={`Copy ${item.name}`} title="Copy list"><Icon name="copy" size={15}/></button>
          <button className="icon-btn" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.name}`} title="Delete"><Icon name="trash" size={15}/></button>
        </footer>
      </article>;
    })}</div>}
  </div>;
}
