import type { Apex, Catalog, Gear, Roles, Weapon } from './legacy-types.ts';

// Scores are editorial role-fit estimates on a 0-100 scale, not game statistics.
const roles = (values: Partial<Roles> = {}): Roles => ({ combat: 45, handling: 45, mobility: 45, sustain: 45, survival: 45, intel: 45, objective: 45, streaks: 45, ...values });
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const image = (n: number | null) => n === null ? null : `https://imgs.callofduty.com/content/dam/atvi/callofduty/cod-touchui/blog/body/mw4/rfl-ops-and-weapons/MW4-RFL-OPS-WEAPONS-${String(n).padStart(3, '0')}.webp`;
const sourceIds = ['launch-guide'];

// The guide's paired image shows the base weapon and its Apex conversion together.
function weapon(name: string, category: string, slot: Weapon['slot'], unlockLevel: number, maxLevel: number, magazine: number | null, rpm: number | null, description: string, imageNo: number | null, fit: Partial<Roles>, apexData?: [string, string, string[], Partial<Roles>]): Weapon {
  const imageUrl = image(imageNo);
  const apex: Apex | null = apexData ? { id: slug(apexData[0]), name: apexData[0], description: apexData[1], unlockLevel: maxLevel, blockedSlots: apexData[2], imageUrl, roles: apexData[3], sourceIds } : null;
  return { id: slug(name), name, category, slot, unlockLevel, maxLevel, magazine, rpm, description, imageUrl, sourceIds, apex, roles: roles(fit) };
}

const weapons: Weapon[] = [
  weapon('Han 86', 'Assault rifle', 'primary', 4, 72, 30, 740, 'Versatile automatic 5.56 rifle.', 9, { combat: 70, handling: 65 }, ['Han X20 Skybreaker', 'Targeting optic and airburst launcher flush enemies from cover; direct impacts are duds.', ['optic', 'stock', 'barrel'], { objective: 12 }]),
  weapon('M4', 'Assault rifle', 'primary', 14, 72, 30, 810, 'Adaptable automatic service rifle.', 10, { combat: 70, handling: 70 }, ['M4 Hurricane', 'High-capacity top-loading conversion with faster fire and mobility.', ['barrel', 'magazine'], { mobility: 10, sustain: 8 }]),
  weapon('Hyeon Burst', 'Assault rifle', 'primary', 21, 68, 30, 375, '6.8 mm rifle with a hard-hitting burst.', 11, { combat: 68, handling: 60 }, ['Hyeon Hyperburst', 'Fast three-round burst followed by slower automatic fire.', [], { combat: 8 }]),
  weapon('Patriot XMR', 'Assault rifle', 'primary', 27, 72, 25, 645, 'Hard-hitting automatic rifle with substantial recoil.', 12, { combat: 72, handling: 48 }, ['Patriot XMR Volt', 'Underbarrel launcher fires a spread of nonlethal stun darts.', ['barrel'], { objective: 8 }]),
  weapon('Kastov 762', 'Assault rifle', 'primary', 34, 68, 30, 600, 'Automatic 7.62 rifle with strong recoil.', 13, { combat: 72, handling: 48 }, ['Kastov ARC', 'RF pulse disrupts infantry, electronics and vehicles.', ['barrel'], { objective: 8, intel: 5 }]),
  weapon('Oden', 'Assault rifle', 'primary', 39, 65, 20, 413, 'Slow-firing 12.7 mm bullpup rifle.', 14, { combat: 72, handling: 48, sustain: 40 }, ['Oden Sentinel', 'Semi-automatic sniper conversion with bipod, suppressor and scope.', ['barrel', 'muzzle'], { combat: 5, mobility: -8 }]),
  weapon('Axion', 'Assault rifle', 'primary', 52, 69, 30, 705, 'Subsonic .300 BLK rifle hides enemy death markers.', 15, { combat: 70, intel: 62 }, ['Axion Clearcut', 'Chainsaw-style grip, foregrip and canted aiming suit mobile hipfire.', ['optic', 'laser', 'underbarrel', 'stock', 'rear-grip'], { mobility: 12, handling: 5 }]),
  weapon('Cronen Squall', 'Assault rifle', 'primary', 55, 67, 20, 673, '6.8 mm bullpup rifle for controlled long-range fire.', null, { combat: 72, handling: 60 }, ['Cronen Maelstrom', 'Launches a missile guided by an aiming laser.', ['laser', 'underbarrel'], { objective: 10 }]),
  // Season 1 Battle Pass guns unlock by Battle Pass tier, not player level. Their Apex blocked slots are not published yet.
  weapon('Cronen Osprey', 'Assault rifle', 'primary', 1, 0, 30, 882, '5.56 rifle with the highest fire rate of any assault rifle. Season 1 Battle Pass.', null, { combat: 70, handling: 68 }, ['Cronen Helix Mk.II', 'Apex attachment. CODMunity lists it doubling the magazine and raising horizontal recoil.', [], { sustain: 10 }]),
  weapon('ISO Nightshade', 'Submachine gun', 'primary', 4, 64, 30, 923, 'Fast automatic SMG for close quarters.', 17, { combat: 68, handling: 72, mobility: 78 }, ['ISO Trace', 'Tracking ammunition marks hit targets on an integrated optic.', ['optic', 'ammunition'], { intel: 14 }]),
  weapon('VEL 46', 'Submachine gun', 'primary', 13, 60, 40, 952, 'Maneuverable SMG with predictable recoil.', 18, { combat: 68, handling: 75, mobility: 80 }, ['VEL 46 Snap', 'Sling speeds weapon transitions and permits Quick Draw with Overkill.', ['stock'], { handling: 10 }]),
  weapon('Wz.55 Striga', 'Submachine gun', 'primary', 21, 60, 25, 651, 'Mobile, controllable SMG with subsonic ammunition.', 19, { combat: 65, handling: 78, mobility: 82, intel: 55 }, ['WZ.55 Striga Rampage', 'Akimbo conversion increases close-range fire volume.', ['optic', 'stock', 'underbarrel'], { combat: 8, handling: -8 }]),
  weapon('PPSh-41', 'Submachine gun', 'primary', 27, 62, 71, 1110, 'High-rate SMG with a large magazine.', 20, { combat: 70, mobility: 78, sustain: 72 }, ['PPSh-41 Ember', 'Underbarrel incendiary projectiles leave a short-lived burning area.', ['barrel', 'underbarrel', 'magazine'], { objective: 12 }]),
  weapon('X-58 Nyx', 'Submachine gun', 'primary', 34, 53, 40, 800, 'Integrally suppressed SMG for covert close-to-mid-range work.', 21, { combat: 65, mobility: 75, intel: 75 }, ['X-58 Void', 'Quieter subsonic fire hides death markers and reduces directional hit indicators.', ['barrel', 'ammunition'], { intel: 12 }]),
  weapon('CSG-35', 'Submachine gun', 'primary', 1, 0, 28, 1200, 'Fast-firing SMG the Season 1 notes say can be dual-wielded. Season 1 Battle Pass.', null, { combat: 68, handling: 72, mobility: 78 }, ['CSG Crossfire', 'Apex attachment, likely the akimbo conversion the Season 1 notes describe. CODMunity lists slower aiming and faster sprint.', [], { combat: 8, handling: -8 }]),
  weapon('Rezi 12', 'Shotgun', 'primary', 4, 60, 6, 150, 'Fast-cycling semi-automatic shotgun.', 22, { combat: 68, mobility: 65, sustain: 35 }, ['Rezi 12 Enforcer', 'Pump-action conversion adds explosive slugs for longer engagements.', [], { combat: 5, objective: 7 }]),
  weapon('Warlord', 'Shotgun', 'primary', 32, 60, 14, 105, 'Dual-tube pump shotgun with a slow reload.', 23, { combat: 68, handling: 50, sustain: 55 }, ['Warlord Lumen', 'A rechargeable aiming strobe impairs enemy vision.', ['optic', 'laser'], { survival: 8 }]),
  weapon('FiNN LMG', 'Light machine gun', 'primary', 4, 59, 100, 587, 'Belt-fed 5.56 LMG with stable sustained fire.', 24, { combat: 70, handling: 55, mobility: 48, sustain: 88 }, ['FiNN Adverse', 'Increases fire rate, but sustained fire can overheat the weapon.', [], { combat: 8, sustain: -5 }]),
  weapon('Type 73', 'Light machine gun', 'primary', 9, 65, 60, 821, 'Heavy 7.62 LMG for sustained medium and long-range fire.', 25, { combat: 73, handling: 42, mobility: 38, sustain: 80 }, ['Type 73 Assault', 'Top-mounted magazine uses explosive rounds with limited capacity.', ['magazine', 'ammunition'], { combat: 7, sustain: -10 }]),
  weapon('APOC-338', 'Light machine gun', 'primary', 44, 56, 50, 554, 'Belt-fed .338 LMG with heavy recoil.', 26, { combat: 75, handling: 38, mobility: 35, sustain: 75 }, ['APOC-338 Praetor', 'Ten-round belt and semi-automatic fire trade volume for heavier shots.', ['magazine'], { combat: 5, sustain: -12 }]),
  weapon('MAR-9', 'Marksman rifle', 'primary', 4, 73, 20, 315, 'Semi-automatic 7.62 precision rifle.', 27, { combat: 70, handling: 58 }, ['MAR-9 Auto', 'Converts the rifle to high-rate automatic fire.', ['trigger-action'], { combat: 8 }]),
  weapon('Oris 8.6', 'Marksman rifle', 'primary', 11, 70, 10, 89, 'Compact bolt-action rifle with subsonic ammunition.', 28, { combat: 70, mobility: 62, intel: 55 }, ['Oris 8.6 Razor', 'Receiver module stores up to three throwing knives.', ['underbarrel'], { mobility: 4 }]),
  weapon('Mosin-Nagant', 'Marksman rifle', 'primary', 36, 69, 5, 44, 'Bolt-action rifle built for long-range shots.', 29, { combat: 73, handling: 45, sustain: 30 }, ['Mosin Harpoon', 'Launchable, retrievable bayonet also extends melee lunge.', ['barrel', 'muzzle'], { combat: 5 }]),
  weapon('KG-7 Vulcan', 'Sniper rifle', 'primary', 4, 75, 10, 41, 'High-capacity bolt-action sniper rifle.', 30, { combat: 75, handling: 40, mobility: 40 }, ['KG-7 Drillcharge', 'Side-mounted projectiles drill into surfaces before detonating.', [], { objective: 10 }]),
  weapon('Astaroth .57', 'Sniper rifle', 'primary', 10, 54, 3, 34, 'Heavy 14.5 mm sniper rifle.', 31, { combat: 78, handling: 30, mobility: 30, sustain: 25 }, ['Astaroth .57 Infiltrator', 'Detects enemies through some cover, with capacity reduced to one.', ['optic'], { intel: 15, sustain: -10 }]),
  weapon('Signal 50', 'Sniper rifle', 'primary', 35, 74, 7, 111, 'Semi-automatic .50 caliber rifle with a recoil-reducing barrel.', 32, { combat: 75, handling: 40, mobility: 35 }, ['Signal Inferno', 'Incendiary rounds increase damage to vehicles and streaks.', ['ammunition'], { streaks: 12 }]),
  weapon('SANG 9mm', 'Pistol', 'secondary', 4, 38, 13, 370, 'Low-recoil 9 mm sidearm for quick follow-up shots.', 33, { combat: 48, handling: 75, mobility: 75 }, ['SANG Breach', 'Single-shell underbarrel shotgun for close encounters.', ['laser'], { combat: 8 }]),
  weapon('Krait P68', 'Pistol', 'secondary', 7, 38, 10, null, 'Semi-automatic .45 pistol with subsonic rounds.', 34, { combat: 50, handling: 68, mobility: 72, intel: 55 }, ['Krait P68 Commando', 'Off-hand knife improves melee and stabilizes recoil.', [], { handling: 6, combat: 5 }]),
  weapon('.50 GS', 'Pistol', 'secondary', 41, 37, 7, 166, 'Heavy-hitting .50 caliber pistol with strong recoil.', 35, { combat: 58, handling: 45, mobility: 65 }, ['GS Magna', 'Fully automatic conversion trades control for fire rate.', ['trigger-action'], { combat: 7, handling: -8 }]),
  weapon('Mojave .357', 'Pistol', 'secondary', 48, 44, 8, 141, 'Close-range .357 revolver.', 36, { combat: 55, handling: 50, mobility: 65 }, ['Mojave Lawless', 'Fan the hammer for rapid hipfire at a precision cost.', ['trigger-action'], { combat: 5, handling: -5 }]),
  weapon('PILA', 'Launcher', 'secondary', 4, 46, 1, 8, 'Portable launcher supports guided and unguided missiles.', 37, { combat: 40, mobility: 30, streaks: 80 }),
  weapon('RPG-8', 'Launcher', 'secondary', 23, 46, 1, 20, 'Unguided anti-vehicle rocket launcher.', 38, { combat: 48, mobility: 35, streaks: 62 }),
  weapon('JOKR', 'Launcher', 'secondary', 43, 46, 1, 13, 'Lock-on launcher attacks vehicles from above.', 39, { combat: 38, mobility: 25, streaks: 85 }),
  weapon('PM-40 Anvil', 'Launcher', 'secondary', 54, 46, 3, 38, 'Pump-action grenade launcher for room clearing and area denial.', null, { combat: 60, mobility: 35, objective: 75 }),
  weapon('FSS Carbon Edge 1095', 'Melee', 'melee', 4, 46, null, null, 'Fast, quiet combat knife.', 41, { combat: 38, handling: 80, mobility: 85, intel: 58 }),
];

// The guide's progression table and individual entries disagree on these six player unlocks.
const reportedUnlocks: Record<string, number[]> = {
  'vel-46': [5, 13], 'wz-55-striga': [18, 21], 'ppsh-41': [27, 30],
  'x-58-nyx': [34, 46], 'astaroth-57': [10, 25], 'signal-50': [35, 50],
};
for (const item of weapons) if (reportedUnlocks[item.id]) item.reportedUnlockLevels = reportedUnlocks[item.id];

// Role fit is a qualitative estimate. Zero is a low fit, not a measurement of zero effect.
function gear(name: string, kind: Gear['kind'], unlockLevel: number, description: string, fit: Partial<Roles>, perkSlot?: number, threshold?: number | null): Gear {
  return { id: slug(name), name, kind, unlockLevel, description, imageUrl: null, sourceIds: name === 'UAV' ? ['launch-guide', 'launch-patch'] : sourceIds, roles: roles(fit), ...(perkSlot ? { perkSlot } : {}), ...(kind === 'streak' ? { threshold: threshold ?? null } : {}) };
}
const gearItems: Gear[] = [
  gear('Flash Grenade', 'tactical', 4, 'Blinds and deafens targets.', { combat: 65, objective: 65 }),
  gear('Smoke Grenade', 'tactical', 4, 'Blocks sight and automated targeting; gunfire and explosions disrupt cover.', { survival: 75, objective: 80 }),
  gear('Snapshot Grenade', 'tactical', 10, 'Briefly reveals nearby enemies to the team.', { intel: 82, objective: 70 }),
  gear('Concussion Grenade', 'tactical', 15, 'Disorients enemies and slows their reactions.', { combat: 65, objective: 68 }),
  gear('Heartbeat Sensor', 'tactical', 23, 'Battery-powered sensor displays nearby enemies.', { intel: 80 }),
  gear('Shock Stick', 'tactical', 29, 'Sticks to surfaces, shocks enemies and disrupts equipment and vehicles.', { combat: 65, objective: 72 }),
  gear('Decoy Grenade', 'tactical', 42, 'Simulates gunfire, movement and radar signals.', { intel: 68, objective: 60 }),
  gear('Stim', 'tactical', 47, 'Starts health regeneration, refreshes Tactical Sprint and mitigates flash and stun.', { survival: 85, mobility: 75 }),
  gear('Screamer Mine', 'tactical', 53, 'Proximity mine suppresses and marks nearby enemies.', { intel: 75, objective: 80 }),
  gear('Frag Grenade', 'lethal', 4, 'Cookable fragmentation grenade.', { combat: 70, objective: 65 }),
  gear('Sticky Grenade', 'lethal', 4, 'Timed grenade sticks to surfaces.', { combat: 70, objective: 65 }),
  gear('Drill Charge', 'lethal', 7, 'Drills through a surface before releasing an explosive.', { combat: 70, objective: 80 }),
  gear('Proximity Mine', 'lethal', 13, 'Proximity-triggered explosive; can attach to passing vehicles.', { objective: 80, survival: 65 }),
  gear('Zip Gun', 'lethal', 17, 'Single-use printed pistol for close targets.', { combat: 65, mobility: 60 }),
  gear('Trip Wire', 'lethal', 22, 'Thrown wire trap can connect with other trip wires.', { objective: 80, survival: 65 }),
  gear('Thermite', 'lethal', 26, 'Sticky incendiary effective against vehicles and armor.', { combat: 65, objective: 72, streaks: 62 }),
  gear('Molotov Cocktail', 'lethal', 28, 'Impact incendiary leaves burning pools.', { objective: 82, combat: 68 }),
  gear('Claymore', 'lethal', 37, 'Proximity-activated explosive mine.', { objective: 80, survival: 65 }),
  gear('C4', 'lethal', 43, 'Sticky explosive detonated remotely.', { objective: 78, combat: 70 }),
  gear('Throwing Knife', 'lethal', 49, 'Retrievable knife that is lethal on impact.', { combat: 65, mobility: 65 }),
  gear('Portable Radar', 'field', 4, 'Medium recharge. Periodically detects nearby enemies.', { intel: 82, objective: 70 }),
  gear('DDOS', 'field', 4, 'Fast recharge. Temporarily disables nearby enemy electronics and sensors.', { intel: 68, objective: 75 }),
  gear('Munitions Box', 'field', 6, 'Medium recharge. Supplies ammunition and equipment to the team.', { sustain: 85, objective: 70 }),
  gear('SAM Airburst Turret', 'field', 8, 'Slow recharge. Deployable turret attacks aerial threats.', { streaks: 85, survival: 65 }),
  gear('Riot Shield', 'field', 11, 'Medium recharge. Destructible shield provides team cover.', { survival: 80, objective: 80 }),
  gear('Trophy System', 'field', 14, 'Fast recharge. Intercepts up to three airborne projectiles.', { survival: 85, objective: 85 }),
  gear('Seeker Drone', 'field', 19, 'Slow recharge. Finds nearby enemies and reveals them.', { intel: 85, objective: 70 }),
  gear('Inflatable Decoy', 'field', 25, 'Medium recharge. Proximity or manually activated decoy.', { intel: 60, survival: 65 }),
  gear('Smoke Wall', 'field', 29, 'Medium recharge. Rocket produces a long trail of smoke.', { survival: 75, objective: 82 }),
  gear('Recon Drone', 'field', 33, 'Slow recharge. Remote drone can mark targets manually or automatically.', { intel: 88, objective: 70 }),
  gear('Razor Wire Trap', 'field', 41, 'Medium recharge. Proximity trap ensnares enemies in wire.', { objective: 82, survival: 65 }),
  gear('Tactical Insertion', 'field', 45, 'Medium recharge. Marks the next spawn location.', { mobility: 70, objective: 80 }),
  gear('Quick Fix', 'perk', 4, 'Kills and capturing or holding objectives start health regeneration; damage interrupts it.', { survival: 88, objective: 75 }, 1),
  gear('Overkill', 'perk', 4, 'Allows a second primary weapon.', { combat: 78, sustain: 65 }, 1),
  gear('High Alert', 'perk', 8, 'Vision pulses when an unseen enemy spots you.', { survival: 82, intel: 70 }, 1),
  gear('Ghost', 'perk', 24, 'Conceals you from enemy callouts, UAVs, portable radars and heartbeat sensors.', { intel: 85, survival: 70 }, 1),
  gear('Resupply', 'perk', 31, 'Equipment recharges, capacity increases and field upgrades charge faster.', { sustain: 85, objective: 75 }, 1),
  gear('Kill Chain', 'perk', 48, 'Kills from streaks award half streak points.', { streaks: 88 }, 1),
  gear('Hardline', 'perk', 4, 'Reduces streak cost by one kill.', { streaks: 90 }, 2),
  gear('Blood Rush', 'perk', 4, 'Enables Tactical Sprint; kills replenish stamina.', { mobility: 90, sustain: 65 }, 2),
  gear('Bomb Squad', 'perk', 16, 'Reduces non-streak explosive damage, resets picked-up grenade fuses and prevents knockdown.', { survival: 88, objective: 70 }, 2),
  gear('Fast Hands', 'perk', 20, 'Speeds reloads, equipment use and weapon swaps.', { handling: 85, sustain: 78 }, 2),
  gear('Ninja', 'perk', 30, 'Reduces footstep sound and its audible range.', { intel: 85, mobility: 65 }, 2),
  gear('Birdseye', 'perk', 40, 'Expands the minimap and adds enemy direction to UAV and radar pings.', { intel: 88, streaks: 65 }, 2),
  gear('Lethal Reach', 'perk', 4, 'Throws equipment farther and uses the dedicated melee weapon for a weapon butt.', { combat: 65, objective: 65 }, 3),
  gear('Combat Grid', 'perk', 4, 'Highlights friendly players and reveals enemy equipment, field upgrades, streaks and vehicles through walls.', { intel: 82, objective: 70 }, 3),
  gear('Battle Hardened', 'perk', 12, 'Reduces the effects of enemy tacticals.', { survival: 82, objective: 72 }, 3),
  gear('Scavenger', 'perk', 28, 'Collect ammunition from fallen enemies; launcher ammunition is excluded.', { sustain: 88 }, 3),
  gear('Tracker', 'perk', 32, 'Shows enemy footprints and death markers while hiding your kill markers.', { intel: 85 }, 3),
  gear('Cold-Blooded', 'perk', 36, 'Avoids AI targeting and several thermal, drone, snapshot and alert detections.', { intel: 82, survival: 75 }, 3),
  gear('UAV', 'streak', 4, 'Reveals enemies on the minimap. Five kills, or four with Hardline, per launch patch notes.', { intel: 90, streaks: 78 }, undefined, 5),
  gear('Bomb Glider', 'streak', 6, 'Hand-launched explosive glider.', { combat: 75, streaks: 70 }),
  gear('Care Package', 'streak', 9, 'Calls in a random streak package.', { streaks: 75 }),
  gear('Impact Warhead', 'streak', 12, 'Explosive payload drills through multiple floors.', { combat: 78, objective: 75, streaks: 72 }),
  gear('Artillery Beacon', 'streak', 4, 'Calls heat-seeking missiles to the deployed beacon.', { combat: 78, objective: 75, streaks: 75 }),
  gear('Crossfire', 'streak', 20, 'Calls airstrikes from two directions.', { combat: 82, objective: 78, streaks: 80 }),
  gear('Combat Drone', 'streak', 26, 'Remote-controlled anti-personnel drone.', { combat: 75, streaks: 72 }),
  gear('Counter UAV', 'streak', 31, 'Scrambles enemy minimaps.', { intel: 85, streaks: 75 }),
  gear('Wheelson', 'streak', 16, 'Autonomous vehicle hunts targets or guards its owner.', { combat: 80, objective: 80, streaks: 80 }),
  gear('Missile Salvo', 'streak', 24, 'Aerial platform fires lock-on missiles.', { combat: 80, streaks: 80 }),
  gear('Railgun Sentry', 'streak', 38, 'Autonomous electromagnetic sentry cannon.', { combat: 80, objective: 85, streaks: 80 }),
  gear('Attack Helicopter', 'streak', 4, 'Overhead helicopter tracks and attacks targets.', { combat: 85, streaks: 85 }),
  gear('Deathstalker', 'streak', 35, 'Remote helicopter has twin turrets that can overheat.', { combat: 88, streaks: 85 }),
  gear('Advanced UAV', 'streak', 40, 'Reveals enemy direction in real time and resists lock-on.', { intel: 95, streaks: 88 }),
  gear('Argonaut', 'streak', 45, 'Equips heavy armor, a cluster grenade launcher and burst sidearm.', { combat: 90, survival: 85, streaks: 88 }),
  gear('Gunship', 'streak', 51, 'Heavy aircraft with three cannon types.', { combat: 95, streaks: 95 }),
  gear('Air Lockdown', 'streak', 55, 'Bombing runs with additional anti-air coverage.', { combat: 92, objective: 85, streaks: 95 }),
];

export const baseCatalog: Catalog = {
  version: 'mw4-mp-launch-2026-10-29',
  checkedAt: '2026-10-30',
  sources: [
    { id: 'launch-guide', title: 'Official launch weapons and equipment guide', url: 'https://www.callofduty.com/uk/en/blog/2026/10/call-of-duty-modern-warfare-4-launch-multiplayer-operators-weapons-equipment-create-a-class', checkedAt: '2026-10-30', note: 'Published October 19. Base weapon values and launch catalog; some streak values conflict with the later patch notes.' },
    { id: 'launch-patch', title: 'Infinity Ward launch patch notes', url: 'https://www.callofduty.com/patchnotes/2026/10/call-of-duty-modern-warfare-4-launch-patch-notes', checkedAt: '2026-10-30', note: 'Includes updates through October 29. Multiplayer and DMZ have separate tuning.' },
    { id: 'season-1-patch', title: 'Infinity Ward Season 1 patch notes', url: 'https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes', checkedAt: '2026-11-07', note: 'November 6. Adds the Cronen Osprey and CSG-35, and retunes damage on 17 guns. Transcribed in research/raw/patch-notes.json.' },
  ],
  weapons, attachments: [], gear: gearItems,
  notes: [
    'The launch guide gives conflicting player unlock levels for VEL 46 (5 or 13), Wz.55 Striga (18 or 21), PPSh-41 (27 or 30), X-58 Nyx (34 or 46), Astaroth .57 (10 or 25) and Signal 50 (35 or 50).',
    'The launch guide lists base RPM and magazine capacity. October 28 multiplayer tuning means these launch values may be stale; they are not sufficient for TTK calculations.',
    'UAV cost is five kills, four with Hardline, in the launch patch notes; the guide says four. Other current streak costs require in-game verification and are unknown here.',
    'Role fit scores are editorial estimates from 0 to 100, not observed game stats. Apex adjustments are editorial signed deltas.',
    'Apex blocked slots match the launch guide and an independent transcription; an empty list is not proof of complete compatibility.',
    'Field recharge speed is qualitative. Exact seconds, attachment effects and weapon damage remain unmeasured. Krait P68 fire rate is unknown in RPM because the guide labels its 260 value BPM.',
    'Images are official base-weapon and Apex comparison composites. Cronen Squall and PM-40 Anvil guide images depict other content and are omitted.',
    'The Cronen Osprey and CSG-35 come from the Season 1 Battle Pass. Nobody has published which slots their Apex attachments block, and there are no renders for them yet.',
  ],
};
