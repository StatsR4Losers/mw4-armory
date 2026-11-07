import { Icon } from '../components/Icon';
import { Typed } from '../components/Terminal';

const sources = [
  { title: 'Activision: Modern Warfare 4 progression and prestige (Oct 19)', url: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige' },
  { title: 'Infinity Ward: Oct 28 weapon tuning (via CODMunity)', url: 'https://codmunity.gg/patch-notes/mw4/2026-10-28' },
  { title: 'TimeSaver: Weapon Prestige explained', url: 'https://timesaver.gg/blog/modern-warfare-4-weapon-prestige-pyroclast-camos-explained' },
  { title: 'TimeSaver: Shipment 24/7 XP farm', url: 'https://timesaver.gg/blog/mw4-shipment-xp-farm-decoy-grenades-fastest-weapon-leveling' },
  { title: 'esports.gg: Leveling weapons in MW4', url: 'https://esports.gg/guides/call-of-duty/how-to-level-up-weapons-faster-in-modern-warfare-4/' },
  { title: 'Boosting Factory: Best XP modes', url: 'https://www.boostingfactory.com/modern-warfare-4/blog/how-level-fast-mw4' },
  { title: 'CODMunity: weapon pages with rechamber and hitscan stats', url: 'https://codmunity.gg/weapon/mw4/mosin-nagant' },
  { title: 'CODMunity: time to kill by class', url: 'https://codmunity.gg/ttk/mw4?cat=SMG' },
  { title: 'Insider Gaming: no hip-fire bloom in MW4', url: 'https://insider-gaming.com/infinity-ward-promises-no-bloom-in-mw4-and-most-authentic-gunplay-yet/' },
  { title: 'Gfinity: launch patch notes, flinch on one-shot weapons', url: 'https://www.gfinityesports.com/article/call-of-duty-mw4-launch-patch-notes' },
  { title: 'Dexerto: the Oris 8.6 and quickscoping', url: 'https://www.dexerto.com/call-of-duty/one-shot-modern-warfare-4-rifle-is-a-throwback-to-one-of-cods-most-op-weapons-3422193/' },
  { title: 'Game8: Mosin-Nagant optics and ADS', url: 'https://game8.co/games/Call-of-Duty-Modern-Warfare-4/archives/634319' },
  { title: 'Game8: Warlord slug builds', url: 'https://game8.co/games/Call-of-Duty-Modern-Warfare-4/archives/634417' },
  { title: 'Dexerto: MWIII idle sway delay (earlier game)', url: 'https://www.dexerto.com/call-of-duty/mw3-season-2-patch-note-2520071/' },
];

// What each class's playstyles weigh most, from the Oct 30 research pass. The optimizer's weights follow these lists.
const classes = [
  { name: 'SMGs', styles: 'Rush, Mid-range', body: 'Sprint-to-fire and hip fire lead for Rush: most SMG fights start off a sprint, and MW4 removed hip-fire bloom, so hip sway, gun bob and turn sway decide where hip shots land. Mid-range puts damage range first, because SMG kill times jump 115 to 140 ms past the first damage drop at 11 to 15 m. Idle aim sway does nothing for either.' },
  { name: 'Assault rifles', styles: 'All-around, Aggressive, Anchor, Low recoil', body: 'Recoil, ADS and damage range lead. Anchor adds flinch and sway for long sightlines. Aggressive moves sprint-to-fire up. The sites take bigger magazines than creators say they need, so magazine size counts more than it used to.' },
  { name: 'LMGs', styles: 'Anchor, Mobile', body: 'ADS time is the LMG problem at 360 to 510 ms, so it leads both. Anchor adds recoil, range and a reload you can live with, since reloads run 6 to 7 seconds on the FiNN and APOC.' },
  { name: 'Bolt-action rifles and snipers', styles: 'Quickscope, Hardscope', body: 'Quickscoping is ADS, sprint-to-fire and rechamber. Sway never ramps in before you shoot. Hardscoping is flinch, aim sway, one-shot range and a steady scope while the bolt cycles. The rechamber is its own stat on CODMunity: 1767 ms on the Mosin, 1633 ms on the KG-7, 1000 ms on the Oris. A missed shot or a limb hit costs one full cycle, which is why light bolts score high. Snipers keep their own scope, because no optic lists a stat change.' },
  { name: 'Shotguns', styles: 'Hip fire, Close ADS, Slugs', body: 'Hip fire wants sprint-to-fire, movement and hip sway. Slugs want ADS, recoil and range, and slug playstyles always run the slug. The data has no pellet spread, one-shot range or slug damage, so shotgun picks are handling only.' },
  { name: 'Pistols', styles: 'Sidearm, Run and gun, Precision', body: 'As a sidearm, swap speed and sprint-to-fire lead. Run and gun is where the Mojave Lawless and GS Magna Apex conversions live. Precision is for the .50 GS and Mojave aimed in. The Krait P68\'s Tapper 9 trigger, +39% fire rate, is the meta pick.' },
];

const modes = [
  { mode: 'Shipment 24/7', best: 'Weapon XP, kill-count camo challenges', why: 'The most kills per minute. Players report about 9 weapon levels a match with two Decoy Grenades (unlock at level 42) and DDOS.', proof: 'Player reports' },
  { mode: 'Hardpoint', best: 'Account XP', why: 'The most common first pick in guides because objective time pays steadily.', proof: 'Guide consensus' },
  { mode: 'Domination, Kill Confirmed', best: 'Account XP', why: 'Close behind Hardpoint. Kill Confirmed pays for every tag, Domination for captures and defends.', proof: 'No published numbers' },
  { mode: 'Search and Destroy, Collateral', best: 'Kill XP per life', why: 'Kill XP went from 100 to 300 on Oct 25, but rounds are slow.', proof: 'Official change' },
  { mode: 'DMZ', best: 'Leveling many guns at once', why: 'Counts toward your account level and the same camo track. Challenges need more kills: Gold is 100 kills in one match.', proof: 'Official' },
  { mode: 'Gun Game, Infected', best: 'Nothing specific', why: 'You do not choose the gun, so XP goes everywhere.', proof: 'Guide consensus' },
];

export function GuideView() {
  return <div className="guide">
    <header className="page-head">
      <span className="eyebrow">Leveling guide</span>
      <h1><Typed text="Prestige, camos and where to grind"/></h1>
      <p>The order that wastes the least XP, from Activision's progression rules and what guides and players report. Anything not from Activision is marked.</p>
    </header>

    <section className="guide-section">
      <h2>What matters, by weapon class</h2>
      <p className="lede">Each class has its own playstyles on the Build tab, weighted by these rankings. Each gun opens on the playstyle its site builds fit best. Change any weight under Fine-tune if you play differently.</p>
      <div className="class-list">{classes.map(item => <div key={item.name} className="card-plain"><h3>{item.name}</h3><p className="class-styles">{item.styles}</p><p>{item.body}</p></div>)}</div>
      <ul className="facts-list">
        <li>Bullets hit instantly inside each gun's hitscan range, 19 to 28 m on SMGs and 30 to 37 m on snipers, per CODMunity. Bullet velocity only counts past that, and velocity attachments stretch the hitscan range by the same amount.</li>
        <li>Every missed bullet on an automatic adds one shot interval to your kill time: 63 ms on the VEL 46, 100 ms on the Kastov 762. That is how recoil is priced.</li>
        <li>Nobody has measured when idle sway starts after you aim in MW4. In MWIII it ramped in over about 3 seconds, which is why it only counts for playstyles that hold an angle.</li>
        <li>Game8 measured up to 70 ms of ADS difference between optics on the Mosin and the Oris. CODMunity has no per-optic numbers yet, so the optimizer cannot rank optics. For quickscoping, pick a low-zoom optic.</li>
      </ul>
    </section>

    <section className="guide-section">
      <h2>Two classes per gun</h2>
      <p>Every gun's Apex attachment unlocks at max weapon level and sits in a sixth slot. Many block a normal slot, so the best Apex build is often a different build, not the same one plus the Apex. The VEL 46 Snap blocks the stock, the Kastov ARC blocks the barrel, and the Han X20 Skybreaker blocks the optic, stock and barrel. That is why the Build tab has an Apex switch, and why its compare picker can put the best build with and without the Apex next to each other.</p>
      <p>Game8 says the VEL 46 Snap's Quick Draw needs the Overkill perk. CODMunity's stat changes for it apply either way.</p>
    </section>

    <section className="guide-section">
      <h2>Shared attachments</h2>
      <p className="lede">MW4 unlocks each attachment once. After that it works on every gun that takes it, per Activision.</p>
      <ul className="facts-list">
        <li>The same part unlocks at a different level on each gun. 5.56 NATO Overpressured is level 3 on the M4 and level 59 on the Han 86, so the quickest way to a part is often another gun.</li>
        <li>When a weapon level would give you a part you already own, the game skips that level with a Bonus Level Up. Every shared part you own makes the next gun that uses it level faster.</li>
        <li>Prestiging a gun relocks its own parts. Your other guns keep the shared parts it unlocked.</li>
        <li>On the Build tab, enter your levels under Your other guns. The optimizer counts their shared parts, and under the build it lists what each missing part would add and the fewest levels to it.</li>
        <li>CODMunity does not mark which parts are shared. This site counts a part as shared when two or more guns list it by the same name, except magazines and No Stock, which reuse generic names across calibers. If the game disagrees, press I have it or Don't have it on that part.</li>
      </ul>
    </section>

    <section className="guide-section">
      <h2>Account prestige</h2>
      <div className="two-col">
        <div className="card-plain"><h3>Classic</h3><p>+20% XP, one Permanent Unlock Token and bonus cosmetics. Relocks your level unlocks and Create-a-Class progress.</p></div>
        <div className="card-plain"><h3>Regular</h3><p>Back to level 1 with every unlock kept. No XP boost and no token.</p></div>
      </div>
      <ul className="facts-list">
        <li>Max level is 55. Then come 10 prestiges, then Prestige Master up to level 1,000.</li>
        <li>You choose the track again at every prestige.</li>
        <li>For speed, take Classic. The 20% boost lasts the whole prestige, and relocking mostly hurts for the first few levels.</li>
        <li>Activision advises spending the token on a perk, field upgrade, killstreak or equipment. Any gun you own a blueprint for stays unlocked anyway.</li>
        <li>Account prestige never resets weapon levels or camos. Activision does not say whether the 20% boost applies to weapon XP.</li>
      </ul>
    </section>

    <section className="guide-section">
      <h2>Weapon prestige and the camo grind</h2>
      <p className="lede">Short version: finish a gun's camos through Gold, then prestige it.</p>
      <ol className="steps">
        <li><span>1</span><div><b>Level the gun.</b> The 8 Military camos unlock on their own at set weapon levels.</div></li>
        <li><span>2</span><div><b>Work the 3 Special camos as they open.</b> Each challenge opens at a weapon level, and the last one opens at max level. Some need an attachment: the Han 86's Stormwave needs silencer kills.</div></li>
        <li><span>3</span><div><b>At max level, finish the last Special and get Gold.</b> Gold is 15 kills in one multiplayer match, which is easiest with your full build.</div></li>
        <li><span>4</span><div><b>Prestige the gun right after Gold.</b> Its level goes back to 1 and every attachment relocks except the Apex and blueprint attachments. Your other guns keep the shared parts it unlocked. Camos stay. Weapon XP earned at max level probably goes nowhere, as in earlier games, but Activision has not confirmed that.</div></li>
        <li><span>5</span><div><b>Re-level it.</b> Pyroclast unlocks right away, Pyroclast Terminus at max level again. After that the gun enters Weapon Prestige Master with nothing else reset: Pyroclast Scatter at level 150 and Pyroclast Cascade at 250.</div></li>
        <li><span>6</span><div><b>Grind Platinum and beyond on prestiged guns.</b> Platinum opens once every gun in the class has Gold. Harmonic Break opens after Platinum on all 33 guns, then Divergence and the three Mastery camos per mode. These are not tied to weapon level, so they progress while the gun earns XP toward Pyroclast.</div></li>
      </ol>
      <div className="two-col">
        <div className="card-plain"><h3>SMG challenges</h3><p>Platinum: kills from behind. Harmonic Break: hip-fire kills. Both are fast on Shipment.</p></div>
        <div className="card-plain"><h3>Not confirmed</h3><p>Activision does not say whether an unfinished Special challenge stays open after a weapon prestige. Finishing them first avoids the question.</p></div>
      </div>
    </section>

    <section className="guide-section">
      <h2>Where to grind</h2>
      <p className="lede">No site has published measured XP per match by mode. This is what the sources agree on. To settle Domination against Kill Confirmed for yourself, note your end-of-match XP over three or four games of each.</p>
      <div className="table-wrap"><table className="mode-table">
        <thead><tr><th scope="col">Mode</th><th scope="col">Best for</th><th scope="col">Why</th><th scope="col">Basis</th></tr></thead>
        <tbody>{modes.map(row => <tr key={row.mode}><th scope="row">{row.mode}</th><td>{row.best}</td><td>{row.why}</td><td><span className={`tag ${row.proof.startsWith('Official') ? 'ok' : 'warn'}`}>{row.proof}</span></td></tr>)}</tbody>
      </table></div>
      <ul className="facts-list">
        <li>Double Weapon XP tokens only count down during a match.</li>
        <li>Finishing all three daily challenges pays a large XP bonus.</li>
        <li>Level one or two guns per session so each token goes to the gun you want.</li>
      </ul>
    </section>

    <section className="guide-section">
      <h2>Sources</h2>
      <ul className="source-links">{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<Icon name="external" size={13}/></a></li>)}</ul>
    </section>
  </div>;
}
