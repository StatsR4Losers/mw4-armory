import { Icon } from '../components/Icon';

const sources = [
  { title: 'Activision: Modern Warfare 4 progression and prestige (Oct 19)', url: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige' },
  { title: 'Infinity Ward: Oct 28 weapon tuning (via CODMunity)', url: 'https://codmunity.gg/patch-notes/mw4/2026-10-28' },
  { title: 'TimeSaver: Weapon Prestige explained', url: 'https://timesaver.gg/blog/modern-warfare-4-weapon-prestige-pyroclast-camos-explained' },
  { title: 'TimeSaver: Shipment 24/7 XP farm', url: 'https://timesaver.gg/blog/mw4-shipment-xp-farm-decoy-grenades-fastest-weapon-leveling' },
  { title: 'esports.gg: Leveling weapons in MW4', url: 'https://esports.gg/guides/call-of-duty/how-to-level-up-weapons-faster-in-modern-warfare-4/' },
  { title: 'Boosting Factory: Best XP modes', url: 'https://www.boostingfactory.com/modern-warfare-4/blog/how-level-fast-mw4' },
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
      <h1>Prestige, camos and where to grind</h1>
      <p>The order that wastes the least XP, from Activision's progression rules and what guides and players report. Anything not from Activision is marked.</p>
    </header>

    <section className="guide-section">
      <h2>What matters in a gunfight</h2>
      <p className="lede">The optimizer is weighted by this ranking. Change it under Fine-tune if you play differently.</p>
      <ol className="rank">
        <li><b>Sprint-to-fire and ADS speed.</b> Most SMG fights start off a sprint around a corner. Whoever shoots first usually wins, so these decide the opening.</li>
        <li><b>Recoil.</b> Every missed bullet adds one shot interval to your kill time: 63 ms on the VEL 46 at 952 rpm, 100 ms on the Kastov 762 at 600 rpm. Slow guns lose more per miss.</li>
        <li><b>Damage range, if you fight past the first drop.</b> The VEL 46 kills in 252 ms inside 10 m, 315 ms to 17 m, and 378 ms to 25 m on chest hits. Range attachments move those lines out. On small maps they rarely pay for their ADS cost.</li>
        <li><b>Movement and strafe speed.</b> Faster rotations and harder targets mid-fight.</li>
        <li><b>Flinch.</b> Matters in the fights where the other player shoots first.</li>
        <li><b>Barely matters.</b> Idle aim sway, gun bob, bullet velocity on SMGs, and reload speed with a 40-round magazine.</li>
      </ol>
    </section>

    <section className="guide-section">
      <h2>Two classes per gun</h2>
      <p>Every gun's Apex attachment unlocks at max weapon level and sits in a sixth slot. Many block a normal slot, so the best Apex build is often a different build, not the same one plus the Apex. The VEL 46 Snap blocks the stock, the Kastov ARC blocks the barrel, and the Han X20 Skybreaker blocks the optic, stock and barrel. That is why the Build tab has an Apex switch, and why its compare picker can put the best build with and without the Apex next to each other.</p>
      <p>Game8 says the VEL 46 Snap's Quick Draw needs the Overkill perk. CODMunity's stat changes for it apply either way.</p>
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
        <li><span>4</span><div><b>Prestige the gun right after Gold.</b> Its level goes back to 1 and every attachment relocks except the Apex and blueprint attachments. Camos stay. Weapon XP earned at max level probably goes nowhere, as in earlier games, but Activision has not confirmed that.</div></li>
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
