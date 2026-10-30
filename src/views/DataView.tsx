import { data, supported } from '../data/game';
import { fullModel } from '../engine';
import { Icon } from '../components/Icon';

const sources = [
  { title: 'CODMunity attachment stats, via COD Loadout', url: 'https://codloadout.gitlab.io/data/mw4-community-stats.json', note: 'Base stats for every gun and each attachment\'s multiplier on each gun. Snapshot from Oct 28, after the patch that day. Spot-checked by hand against CODMunity\'s VEL 46 and Kastov 762 pages: every value checked matched.' },
  { title: 'CODMunity weapon pages', url: 'https://codmunity.gg/weapon-stats/mw4', note: 'Which attachments fit each gun and the weapon level that unlocks each one. Read Oct 30. Also the source of the damage profiles used for time to kill.' },
  { title: 'CODMunity weapon page data: rechamber and hitscan', url: 'https://codmunity.gg/weapon/mw4/mosin-nagant', note: 'Each gun\'s rechamber time, sway while rechambering, pre-fire delay and hitscan range, and the bolts, triggers and lasers that change them. COD Loadout\'s files leave these out. Read from all 28 pages by npm run fetch on Oct 30.' },
  { title: 'Activision launch weapon guide', url: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige', note: 'Weapon names, Apex attachments and the slots each Apex blocks.' },
  { title: 'COD Loadout renders', url: 'https://codloadout.gitlab.io/credits/', note: 'Weapon renders and attachment icons, bundled with the site. Artwork belongs to Activision.' },
  { title: 'Guide builds: CODMunity, Game8 and WZStats', url: 'https://game8.co/games/Call-of-Duty-Modern-Warfare-4/archives/630961', note: 'Each site\'s builds for every gun, with import codes where the site published one, plus Game8\'s and WZStats\' perk and equipment picks. Read in a browser on Oct 30. Names are matched to this site\'s parts; obvious typos are matched, anything else is shown crossed out and left out of the score.' },
  { title: 'Killstreak costs', url: 'https://codloadout.gitlab.io/mw4/perks-and-equipment/', note: 'From Activision\'s Oct 19 launch post, as listed by COD Loadout and LFCarry, which agree. The UAV is 5 kills per the Oct 21 launch patch notes.' },
  { title: 'Perk tier lists: GameRant and games.gg', url: 'https://gamerant.com/call-of-duty-modern-warfare-4-cod-mw4-best-perks-tier-list/', note: 'Two published tier lists from Oct 26 and Oct 29, averaged into one score per perk.' },
];

export function DataView() {
  const guns = data.weapons.filter(supported);
  const entries = Object.values(data.loadouts).reduce((sum, list) => sum + list.length, 0);
  const apexNoStats = guns.filter(weapon => weapon.apex && !weapon.apex.mods);
  const partial = guns.filter(weapon => !fullModel(weapon));
  const unsupported = data.weapons.filter(weapon => !supported(weapon));
  const guideBuilds = Object.values(data.meta).flat();
  const coverage = [
    { label: 'Guns with full Gunsmith stats', value: `${guns.length} of ${data.weapons.length}`, note: `No data for ${unsupported.map(w => w.name).join(', ')}.` },
    { label: 'Attachments', value: data.attachments ? Object.keys(data.attachments).length.toLocaleString() : '0', note: `${entries.toLocaleString()} gun and attachment pairs with unlock levels and stat changes.` },
    { label: 'Time-to-kill model', value: `${guns.length - partial.length} guns`, note: `Automatics by chest TTK; bolt-action, semi-auto and pistols by shots to kill. ${partial.map(w => w.name).join(', ')} get handling-only scoring.` },
    { label: 'Site builds read for intent', value: `${Object.keys(data.consensus ?? {}).length} guns`, note: `${Object.values(data.consensus ?? {}).filter(item => item.clear).length} lean clearly toward one playstyle. Each gun opens on that playstyle.` },
    { label: 'Guide builds', value: guideBuilds.length.toLocaleString(), note: `${guideBuilds.filter(build => build.code).length} with an import code, from ${Object.keys(data.metaSources).join(', ')}.` },
    { label: 'Perks, equipment and streaks', value: `${data.gear.length} items`, note: `${data.gear.filter(item => item.cost != null).length} killstreak costs and ${data.gear.filter(item => item.tier != null).length} perk tier scores.` },
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
        <li>Automatic time to kill assumes every bullet hits the chest of a 100-health target. Misses are priced through recoil instead.</li>
        <li>Bolt-action, semi-auto and pistol kill times assume a hit spread and miss rate per playstyle: 30% misses for quickscopes and run-and-gun, 15% for hardscoping, 20% otherwise. These are this site's assumptions, not measurements.</li>
        <li>A bolt action is assumed to fire at the slower of its fire rate and its rechamber time. Nobody has published which one sets the real pace.</li>
        <li>Velocity attachments are assumed to stretch hitscan range by their multiplier, as CODMunity shows on the Mosin. Nobody has published this for every gun.</li>
        <li>Optics have no stat data, so sniper builds keep their own scope and other builds treat an optic as a free slot cost. Game8 measured up to 70 ms of ADS difference between optics.</li>
        <li>Site builds run parts the data lists with little or no effect, like shotgun chokes and the ZLR Competition-B6 bolt. Their real effects are not published, and those builds score lower here than they may play.</li>
        <li>Damage range attachments are applied by stretching each damage band by their multiplier. CODMunity lists range as a percent, not in meters.</li>
        <li>The MAR-9 page on CODMunity has no unlock table, so its attachments show "Lv ?" and are always available.</li>
        <li>COD Loadout lists 20 more parts for the M4 than CODMunity's M4 page does, including Han 86 parts and the Schlager Visiv-5. The site follows each gun's own CODMunity page and leaves them out.</li>
        <li>Shotguns and the Hyeon Burst are scored on handling, recoil and fire rate only. The data has no pellet spread, shotgun one-shot range, slug damage or burst delay.</li>
        <li>The Oct 28 patch raised arm and hand damage on five SMGs from 0.95x to 1x. The damage profiles already reflect it. Chest-hit kill times did not change.</li>
        <li>No site ranks killstreaks yet. Streak picks follow your kills per life and streak style, using values this site sets.</li>
        <li>Perk and equipment picks lean on what Game8 and WZStats run on each gun, so they inherit those sites' judgment. Game8's Kastov 762 Apex build lists the M4's Hurricane Apex, which is shown crossed out.</li>
        <li>Activision's launch guide calls the Axion's Apex the Clearcut; CODMunity and Game8 call it the Reaver. They block the same slots, so the site treats them as one. Game8 and WZStats call the sticky grenade Semtex, and the site uses that name.</li>
        <li>Nobody here measured anything in a private match. Treat close scores, within about 5 ms, as a tie and pick the one that feels better.</li>
      </ul>
    </section>
  </div>;
}
