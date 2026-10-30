import { data, supported } from '../data/game';
import { fullModel } from '../engine';
import { Icon } from '../components/Icon';

const sources = [
  { title: 'CODMunity attachment stats, via COD Loadout', url: 'https://codloadout.gitlab.io/data/mw4-community-stats.json', note: 'Base stats for every gun and each attachment\'s multiplier on each gun. Snapshot from Oct 28, after the patch that day. Spot-checked by hand against CODMunity\'s VEL 46 and Kastov 762 pages: every value checked matched.' },
  { title: 'CODMunity weapon pages', url: 'https://codmunity.gg/weapon-stats/mw4', note: 'Which attachments fit each gun and the weapon level that unlocks each one. Read Oct 30. Also the source of the damage profiles used for time to kill.' },
  { title: 'Activision launch weapon guide', url: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige', note: 'Weapon names, Apex attachments and the slots each Apex blocks.' },
  { title: 'COD Loadout renders', url: 'https://codloadout.gitlab.io/credits/', note: 'Weapon renders and attachment icons, bundled with the site. Artwork belongs to Activision.' },
];

export function DataView() {
  const guns = data.weapons.filter(supported);
  const entries = Object.values(data.loadouts).reduce((sum, list) => sum + list.length, 0);
  const apexNoStats = guns.filter(weapon => weapon.apex && !weapon.apex.mods);
  const partial = guns.filter(weapon => !fullModel(weapon));
  const unsupported = data.weapons.filter(weapon => !supported(weapon));
  const coverage = [
    { label: 'Guns with full Gunsmith stats', value: `${guns.length} of ${data.weapons.length}`, note: `No data for ${unsupported.map(w => w.name).join(', ')}.` },
    { label: 'Attachments', value: data.attachments ? Object.keys(data.attachments).length.toLocaleString() : '0', note: `${entries.toLocaleString()} gun and attachment pairs with unlock levels and stat changes.` },
    { label: 'Full time-to-kill model', value: `${guns.length - partial.length} guns`, note: `Automatic guns with damage profiles. ${partial.length} others get handling-only scoring.` },
    { label: 'Apex with stat changes', value: `${guns.filter(w => w.apex?.mods).length} of ${guns.filter(w => w.apex).length}`, note: apexNoStats.length ? `No published changes for ${apexNoStats.map(w => w.apex!.name).join(', ')}. Their builds only account for blocked slots.` : '' },
  ];
  return <div className="data-view">
    <header className="page-head">
      <span className="eyebrow">Data</span>
      <h1>Where the numbers come from</h1>
      <p>Community-measured launch data, version {data.version}. None of it is published by Activision, and patches change it.</p>
    </header>
    <section className="coverage">{coverage.map(item => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong><p>{item.note}</p></div>)}</section>
    <section className="guide-section">
      <h2>Sources</h2>
      <ul className="source-cards">{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<Icon name="external" size={13}/></a><p>{source.note}</p></li>)}</ul>
    </section>
    <section className="guide-section">
      <h2>Known limits</h2>
      <ul className="facts-list">
        <li>Time to kill assumes every bullet hits the chest of a 100-health target. Headshots, misses and armor are not modeled.</li>
        <li>Damage range attachments are applied by stretching each damage band by their multiplier. CODMunity lists range as a percent, not in meters.</li>
        <li>The MAR-9 page on CODMunity has no unlock table, so its attachments show "Lv ?" and are always available.</li>
        <li>Shotguns, marksman rifles, snipers and pistols are scored on handling and recoil only. Pellet spread and one-shot range are not in the data.</li>
        <li>The Oct 28 patch raised arm and hand damage on five SMGs from 0.95x to 1x. The damage profiles already reflect it. Chest-hit kill times did not change.</li>
        <li>Nobody here measured anything in a private match. Treat close scores, within about 5 ms, as a tie and pick the one that feels better.</li>
      </ul>
    </section>
  </div>;
}
