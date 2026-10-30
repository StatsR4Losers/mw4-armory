import { dimensions } from '../types.ts';
import type { Apex, Attachment, Build, Catalog, Gear, OptimizeResult, OptimizeSettings, ProfileId, Roles, Weapon } from '../types.ts';

// These are editable preference weights. They describe goals, never measured game performance.
export const PROFILE_PRIORITIES: Record<ProfileId, Roles> = {
  balanced: { combat: 1, handling: 1, mobility: 1, sustain: 1, survival: 1, intel: 1, objective: 1, streaks: 1 },
  close: { combat: 3, handling: 3, mobility: 2, sustain: 1, survival: 1, intel: 1, objective: .5, streaks: .5 },
  long: { combat: 4, handling: 1, mobility: .5, sustain: 2, survival: 1, intel: 2, objective: .5, streaks: 1 },
  speed: { combat: 1, handling: 3, mobility: 5, sustain: .5, survival: 1, intel: 1, objective: 1, streaks: .5 },
  control: { combat: 4, handling: 2, mobility: .5, sustain: 2, survival: 1, intel: 1, objective: 1, streaks: .5 },
  stealth: { combat: 1, handling: 2, mobility: 2, sustain: .5, survival: 2, intel: 5, objective: 1, streaks: 1 },
  objective: { combat: 1, handling: 1, mobility: 1, sustain: 2, survival: 3, intel: 1, objective: 5, streaks: 1 },
  streaks: { combat: 1, handling: .5, mobility: .5, sustain: 2, survival: 3, intel: 2, objective: 1, streaks: 5 },
};

// Fixed role anchors and class shares keep scores independent of the filtered arsenal.
const DEFAULT_ATTACHMENT_LIMIT = 5;
const ATTACHMENT_BEAM = 32;
const WEAPON_BEAM = 96;
const GEAR_BEAM = 48;
const METHOD = 'Deterministic bounded beam search within the documented catalog rules. Best found under these settings, not an exhaustive optimum. Scores are editorial role fit on fixed 0 to 100 anchors, not measured combat superiority. Class shares: primary 44%, secondary 14%, melee 2%, tactical 4%, lethal 4%, field 6%, perks 15%, streaks 11%. Specialized profiles use a weighted mean; balanced uses a weighted geometric mean with zero dimensions scoring zero. Every comparison uses the same selected priorities.';
const gearSlots = ['tactical', 'lethal', 'field', 'perk1', 'perk2', 'perk3'] as const;
type GearSlot = typeof gearSlots[number];
type WeaponSetup = { weapon: Weapon; attachments: Attachment[]; apex: Apex | null; roles: Roles; key: string };
type WeaponPair = { primary: WeaponSetup; secondary: WeaponSetup | null; roles: Roles; overkill: boolean; key: string };
type GearPackage = { gear: Gear[]; roles: Roles; key: string };
type Candidate = { pair: WeaponPair; equipment: GearPackage; melee: Weapon | null; roles: Roles; score: number; key: string };

function zero(): Roles { return Object.fromEntries(dimensions.map(d => [d, 0])) as Roles; }
function clamp(value: number) { return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)); }
function roleVector(roles: Partial<Roles>): Roles { return Object.fromEntries(dimensions.map(d => [d, clamp(roles[d] ?? 0)])) as Roles; }
function add(target: Roles, value: Partial<Roles>, share = 1) {
  for (const d of dimensions) target[d] += (Number.isFinite(value[d]) ? value[d]! : 0) * share;
  return target;
}
function keyCompare(a: { key: string }, b: { key: string }) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; }
function isAuto(id: string) { return id === 'auto' || id === 'any' || id === ''; }
function finitePositive(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
function normalizedSlot(slot: string) { return slot.toLowerCase().trim().replace(/[\s_]+/g, '-'); }
function hasSource(catalog: Catalog, sourceIds: string[]) { return sourceIds.some(id => catalog.sources.some(source => source.id === id && /^https?:\/\//.test(source.url))); }
function excluded(settings: OptimizeSettings, id: string) { return settings.excludedIds?.includes(id) ?? false; }
function reportedPlayerLevels(item: Weapon | Gear) {
  return [item.unlockLevel, ...('reportedUnlockLevels' in item ? item.reportedUnlockLevels ?? [] : [])].filter(finitePositive);
}
function playerAvailable(item: Weapon | Gear, settings: OptimizeSettings) {
  const knownLevels = reportedPlayerLevels(item);
  return !excluded(settings, item.id) && (!knownLevels.length || Math.max(...knownLevels) <= settings.playerLevel);
}
function attachmentLimit(catalog: Catalog) { return Number.isInteger(catalog.attachmentLimit) && catalog.attachmentLimit! >= 0 ? catalog.attachmentLimit! : DEFAULT_ATTACHMENT_LIMIT; }

/** A shared attachment unlock is accepted only through its documented weapon and level. */
export function getAvailableAttachments(catalog: Catalog, weapon: Weapon, settings: OptimizeSettings): Attachment[] {
  return catalog.attachments.filter(attachment => {
    if (!attachment.weaponIds.includes(weapon.id) || excluded(settings, attachment.id)) return false;
    if (settings.ownedAttachmentIds.includes(attachment.id)) return true;
    const { weaponId, level } = attachment.unlock;
    return weaponId !== null && finitePositive(level) && hasSource(catalog, attachment.sourceIds)
      && catalog.weapons.some(item => item.id === weaponId)
      && (settings.weaponLevels[weaponId] ?? 0) >= level;
  }).sort((a, b) => a.id.localeCompare(b.id));
}

/** Apex unlocks require a known unlock level or the weapon's sourced maximum level. */
export function getApexAvailability(weapon: Weapon, settings: OptimizeSettings): { available: boolean; reason: string } {
  if (!weapon.apex) return { available: false, reason: `${weapon.name} has no cataloged Apex option.` };
  if (excluded(settings, weapon.apex.id)) return { available: false, reason: `${weapon.apex.name} is excluded.` };
  const required = weapon.apex.unlockLevel ?? weapon.maxLevel;
  if (!finitePositive(required) || weapon.apex.sourceIds.length === 0) return { available: false, reason: `${weapon.apex.name} has no sourced unlock level or known maximum weapon level.` };
  const level = settings.weaponLevels[weapon.id] ?? 0;
  return level >= required
    ? { available: true, reason: `${weapon.apex.name} is available at weapon level ${required}.` }
    : { available: false, reason: `${weapon.apex.name} needs weapon level ${required}; ${weapon.name} is set to ${level}.` };
}

function fit(roles: Roles, weights: Roles, geometric: boolean) {
  const total = dimensions.reduce((sum, d) => sum + weights[d], 0);
  if (!total) return 0;
  if (geometric) {
    if (dimensions.some(d => weights[d] > 0 && roles[d] <= 0)) return 0;
    return Math.exp(dimensions.reduce((sum, d) => sum + (weights[d] > 0 ? weights[d] * Math.log(clamp(roles[d])) : 0), 0) / total);
  }
  return dimensions.reduce((sum, d) => sum + weights[d] * clamp(roles[d]), 0) / total;
}

// Keep high scoring candidates and dimension extremes so narrow early pruning retains useful tradeoffs.
function retain<T extends { roles: Roles; key: string }>(values: T[], limit: number, weights: Roles, geometric: boolean): T[] {
  const unique = [...new Map(values.map(value => [value.key, value])).values()];
  // Compute fit once per candidate. Sorting the same dimensions must not repeat logarithms millions of times.
  const ranked = unique.map(value => ({ value, score: fit(value.roles, weights, geometric) }));
  const ordered = [...ranked].sort((a, b) => b.score - a.score || keyCompare(a.value, b.value));
  if (ordered.length <= limit) return ordered.map(item => item.value);
  const result = ordered.slice(0, Math.floor(limit / 2)).map(item => item.value);
  const used = new Set(result.map(value => value.key));
  const alternatives = dimensions.map(d => [...ranked].sort((a, b) => b.value.roles[d] - a.value.roles[d] || b.score - a.score || keyCompare(a.value, b.value)));
  for (let index = 0; result.length < limit; index++) {
    for (const list of alternatives) {
      const value = list[index]?.value;
      if (value && !used.has(value.key)) { result.push(value); used.add(value.key); }
      if (result.length === limit) break;
    }
  }
  return result;
}

function canAdd(attachments: Attachment[], next: Attachment, apex: Apex | null, limit: number) {
  const slot = normalizedSlot(next.slot);
  if (attachments.length >= limit || apex?.blockedSlots.some(blocked => normalizedSlot(blocked) === slot)) return false;
  return attachments.every(current => normalizedSlot(current.slot) !== slot
    && !current.conflicts?.includes(next.id) && !next.conflicts?.includes(current.id)
    && !current.blockedSlots?.some(blocked => normalizedSlot(blocked) === slot)
    && !next.blockedSlots?.some(blocked => normalizedSlot(blocked) === normalizedSlot(current.slot)));
}
function dependenciesSatisfied(attachments: Attachment[]) {
  const ids = new Set(attachments.map(item => item.id));
  return attachments.every(item => item.prerequisites?.every(id => ids.has(id)) ?? true);
}
function setupRoles(weapon: Weapon, attachments: Attachment[], apex: Apex | null): Roles {
  const result = roleVector(weapon.roles);
  for (const attachment of attachments) add(result, attachment.roles);
  if (apex) add(result, apex.roles);
  return roleVector(result);
}

function weaponSetups(catalog: Catalog, weapon: Weapon, settings: OptimizeSettings, weights: Roles, primary: boolean): WeaponSetup[] {
  const available = getAvailableAttachments(catalog, weapon, settings);
  const limit = attachmentLimit(catalog);
  const lockedIds = settings.lockedAttachmentIds?.[weapon.id] ?? [];
  const locked = lockedIds.map(id => available.find(attachment => attachment.id === id));
  if (locked.some(item => !item)) return [];
  const unlock = getApexAvailability(weapon, settings);
  const apexUsable = unlock.available && !!weapon.apex && hasSource(catalog, weapon.apex.sourceIds);
  const apexStates: (Apex | null)[] = settings.apexMode === 'off' ? [null]
    : settings.apexMode === 'on' && primary ? (apexUsable ? [weapon.apex] : [])
    : apexUsable ? [null, weapon.apex] : [null];
  const output: WeaponSetup[] = [];
  for (const apex of apexStates) {
    const initial: Attachment[] = [];
    for (const attachment of locked as Attachment[]) {
      if (!canAdd(initial, attachment, apex, limit)) break;
      initial.push(attachment);
    }
    if (initial.length !== locked.length) continue;
    const slots = [...new Set(available.filter(item => !lockedIds.includes(item.id)).map(item => normalizedSlot(item.slot)))].sort();
    let beam = [{ attachments: initial, roles: setupRoles(weapon, initial, apex), key: initial.map(item => item.id).sort().join(',') }];
    for (const slot of slots) {
      const choices = available.filter(item => normalizedSlot(item.slot) === slot && !lockedIds.includes(item.id));
      const expanded = beam.flatMap(state => [state, ...choices.filter(item => canAdd(state.attachments, item, apex, limit)).map(item => {
        const attachments = [...state.attachments, item].sort((a, b) => a.id.localeCompare(b.id));
        return { attachments, roles: setupRoles(weapon, attachments, apex), key: attachments.map(value => value.id).join(',') };
      })]);
      beam = retain(expanded, ATTACHMENT_BEAM, weights, settings.profile === 'balanced');
    }
    for (const state of beam.filter(item => dependenciesSatisfied(item.attachments))) {
      output.push({ weapon, apex, ...state, key: `${weapon.id}:${apex?.id ?? '-'}:${state.key}` });
    }
  }
  // Retain each Apex state separately so compare can show both configurations even when fit differs.
  return [...retain(output.filter(value => !value.apex), 4, weights, settings.profile === 'balanced'),
    ...retain(output.filter(value => value.apex), 4, weights, settings.profile === 'balanced')];
}

function isOverkill(item: Gear) { return item.id === 'overkill' || /^overkill$/i.test(item.name); }
function isHardline(item: Gear) { return item.id === 'hardline' || /^hardline$/i.test(item.name); }
function matchesSlot(item: Gear, slot: GearSlot) { return slot.startsWith('perk') ? item.kind === 'perk' && item.perkSlot === Number(slot.slice(-1)) : item.kind === slot; }
function gearShare(item: Gear) { return item.kind === 'perk' ? .05 : item.kind === 'streak' ? .11 / 3 : item.kind === 'field' ? .06 : .04; }
function gearRoles(gear: Gear[]) { const result = zero(); for (const item of gear) add(result, roleVector(item.roles), gearShare(item)); return result; }

function streakThreshold(item: Gear, gear: Gear[]) {
  const alternative = item.thresholdWithHardline;
  return gear.some(isHardline) && finitePositive(alternative) ? alternative : item.threshold;
}

function gearPackages(catalog: Catalog, settings: OptimizeSettings, weights: Roles, overkill: boolean): GearPackage[] {
  const available = catalog.gear.filter(item => playerAvailable(item, settings));
  const overkillPerk = available.find(isOverkill);
  if (overkill && !overkillPerk) return [];
  let beam: GearPackage[] = [{ gear: [], roles: zero(), key: '' }];
  for (const slot of gearSlots) {
    const lockedId = settings.lockedGear[slot];
    let choices = available.filter(item => matchesSlot(item, slot) && (!lockedId || item.id === lockedId));
    if (overkill && overkillPerk && matchesSlot(overkillPerk, slot)) choices = choices.filter(isOverkill);
    beam = retain(beam.flatMap(state => choices.filter(item => !state.gear.some(current => current.id === item.id)).map(item => {
      const gear = [...state.gear, item];
      return { gear, roles: gearRoles(gear), key: gear.map(current => current.id).join(',') };
    })), GEAR_BEAM, weights, settings.profile === 'balanced');
    if (!beam.length) return [];
  }
  const packages: GearPackage[] = [];
  const lockedStreaks = new Set(settings.lockedStreakIds ?? []);
  for (const state of beam) {
    const choices = available.filter(item => item.kind === 'streak' && (streakThreshold(item, state.gear) == null || streakThreshold(item, state.gear)! <= settings.streakBand));
    // All three streaks are distinct. Known thresholds obey the band; unknown thresholds remain disclosed.
    for (let i = 0; i < choices.length - 2; i++) for (let j = i + 1; j < choices.length - 1; j++) for (let k = j + 1; k < choices.length; k++) {
      const streaks = [choices[i], choices[j], choices[k]];
      if (![...lockedStreaks].every(id => streaks.some(item => item.id === id))) continue;
      const gear = [...state.gear, ...streaks];
      packages.push({ gear, roles: gearRoles(gear), key: gear.map(item => item.id).join(',') });
    }
  }
  return retain(packages, GEAR_BEAM, weights, settings.profile === 'balanced');
}

function validate(catalog: Catalog, settings: OptimizeSettings): string[] {
  const errors: string[] = [];
  const isRecord = (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const stringArray = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === 'string');
  // Shared JSON can bypass TypeScript. Reject malformed containers before reading their contents.
  if (!isRecord(settings) || !isRecord(settings.weaponLevels) || !isRecord(settings.lockedGear) || !isRecord(settings.priorities)
    || !stringArray(settings.ownedAttachmentIds) || typeof settings.primaryId !== 'string' || typeof settings.secondaryId !== 'string') return ['Optimization settings have an invalid shape. Restore defaults or import a valid settings file.'];
  if ((settings.excludedIds !== undefined && !stringArray(settings.excludedIds))
    || (settings.lockedStreakIds !== undefined && !stringArray(settings.lockedStreakIds))
    || (settings.lockedAttachmentIds !== undefined && (!isRecord(settings.lockedAttachmentIds) || !Object.values(settings.lockedAttachmentIds).every(stringArray)))) return ['Exclusions and locked selections must contain item ID arrays.'];
  if (!Object.hasOwn(PROFILE_PRIORITIES, settings.profile)) errors.push('Choose a supported profile.');
  if (!Number.isInteger(settings.playerLevel) || settings.playerLevel < 1) errors.push('Player level must be a positive whole number.');
  if (!finitePositive(settings.streakBand)) errors.push('The attainable streak band must be positive.');
  if (!['compare', 'off', 'on'].includes(settings.apexMode)) errors.push('Choose an Apex mode of compare, off, or on.');
  if (settings.distanceM !== undefined && (!Number.isFinite(settings.distanceM) || settings.distanceM < 0)) errors.push('Engagement distance must be a finite, nonnegative number.');
  if (settings.hitRegion !== undefined && !settings.hitRegion.trim()) errors.push('Choose a hit region.');
  for (const [id, level] of Object.entries(settings.weaponLevels)) {
    const weapon = catalog.weapons.find(item => item.id === id);
    if (!Number.isInteger(level) || level < 0 || (weapon?.maxLevel != null && level > weapon.maxLevel)) errors.push(`Invalid weapon level for ${weapon?.name ?? id}.`);
  }
  if (Object.values(settings.priorities).some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) errors.push('Priorities must be finite, nonnegative numbers.');
  for (const slot of gearSlots) {
    const id = settings.lockedGear[slot];
    if (!id) continue;
    const item = catalog.gear.find(gear => gear.id === id);
    if (!item || !matchesSlot(item, slot)) errors.push(`The locked ${slot} item is missing or belongs in another slot.`);
    else if (!playerAvailable(item, settings)) errors.push(`${item.name} is excluded or above player level ${settings.playerLevel}.`);
  }
  const lockedStreakIds = settings.lockedStreakIds ?? [];
  if (lockedStreakIds.length > 3 || new Set(lockedStreakIds).size !== lockedStreakIds.length) errors.push('Lock at most three distinct streaks.');
  for (const id of lockedStreakIds) {
    const item = catalog.gear.find(gear => gear.id === id && gear.kind === 'streak');
    if (!item || !playerAvailable(item, settings)) errors.push(`Locked streak ${id} is unavailable.`);
  }
  for (const [id, ids] of Object.entries(settings.lockedAttachmentIds ?? {})) {
    const weapon = catalog.weapons.find(item => item.id === id && item.slot !== 'melee');
    if (!weapon) { errors.push(`Attachment locks refer to unknown weapon ${id}.`); continue; }
    const available = getAvailableAttachments(catalog, weapon, settings);
    if (ids.length > attachmentLimit(catalog) || new Set(ids).size !== ids.length) errors.push(`Lock at most ${attachmentLimit(catalog)} distinct attachments on ${weapon.name}.`);
    for (const attachmentId of ids) if (!available.some(item => item.id === attachmentId)) errors.push(`Locked attachment ${attachmentId} is incompatible, excluded, or not unlocked for ${weapon.name}.`);
  }
  return errors;
}

function selectWeapons(catalog: Catalog, settings: OptimizeSettings, id: string, primary: boolean): Weapon[] {
  if (!primary && id === 'none') return [];
  return catalog.weapons.filter(weapon => playerAvailable(weapon, settings)
    && (primary ? weapon.slot === 'primary' : weapon.slot === 'primary' || weapon.slot === 'secondary')
    && (isAuto(id) || weapon.id === id)).sort((a, b) => a.id.localeCompare(b.id));
}

function pairRoles(primary: WeaponSetup, secondary: WeaponSetup | null): Roles {
  const roles = zero();
  add(roles, primary.roles, .44);
  if (secondary) add(roles, secondary.roles, .14);
  return roles;
}

/** Range intervals include their minimum and exclude their maximum. Damage and health come from observations. */
export function calculateBaseIdealTtk(weapon: Weapon, distanceM = 25, hitRegion = 'chest'): number | null {
  if (weapon.fireMode !== 'auto' || !Number.isFinite(distanceM) || distanceM < 0) return null;
  const region = hitRegion.toLowerCase().replace(/[\s_-]/g, '');
  const band = weapon.damageProfile?.find(item => distanceM >= item.minM && (item.maxM === null || distanceM < item.maxM));
  const damage = weapon.damageProfile ? band?.regions[region] : weapon.stats?.damage;
  const health = weapon.stats?.health;
  if (!finitePositive(damage) || !finitePositive(health) || !finitePositive(weapon.rpm) || !finitePositive(weapon.magazine)) return null;
  const shots = Math.ceil(health / damage);
  return shots <= weapon.magazine ? (shots - 1) * 60_000 / weapon.rpm : null;
}

/** Whole-configuration TTK is withheld when the attachment or Apex modifier model is incomplete. */
export function calculateIdealTtk(weapon: Weapon, attachments: Attachment[] = [], apex: Apex | null = null): number | null {
  return apex || attachments.length > 0 ? null : calculateBaseIdealTtk(weapon);
}

function scenario(settings: OptimizeSettings) {
  return { distanceM: settings.distanceM ?? (settings.profile === 'close' ? 10 : settings.profile === 'long' ? 40 : 25), hitRegion: settings.hitRegion ?? 'chest' };
}

function buildLimitations(catalog: Catalog, candidate: Candidate, settings: OptimizeSettings): string[] {
  const { primary, secondary } = candidate.pair;
  const { distanceM, hitRegion } = scenario(settings);
  const limitations = ['Role fit uses editorial weights. It does not predict damage, accuracy, recoil, win rate, or the best weapon in combat.'];
  if (calculateBaseIdealTtk(primary.weapon, distanceM, hitRegion) == null) limitations.push('Base ideal TTK is unavailable. Required automatic-fire, damage, target-health, or ammunition measurements are missing for this distance and hit region.');
  else limitations.push(`Base ideal TTK uses ${hitRegion} damage at ${distanceM} m and the supplied target health. It assumes every shot hits, the first shot starts the clock, and no healing. Attachment changes, Apex behavior, projectile travel and readiness delays are excluded.`);
  const unknownUnlocks = [primary.weapon, ...(secondary ? [secondary.weapon] : []), ...candidate.equipment.gear].filter(item => item.unlockLevel == null);
  if (unknownUnlocks.length) limitations.push(`Player unlock levels are unverified for ${unknownUnlocks.map(item => item.name).join(', ')}.`);
  for (const setup of [primary, ...(secondary ? [secondary] : [])]) {
    const levels = [...new Set(reportedPlayerLevels(setup.weapon))];
    if (levels.length > 1) limitations.push(`${setup.weapon.name} has conflicting reported player unlock levels (${levels.join(', ')}). This search conservatively requires level ${Math.max(...levels)}.`);
  }
  const unknownStreaks = candidate.equipment.gear.filter(item => item.kind === 'streak' && streakThreshold(item, candidate.equipment.gear) == null);
  if (unknownStreaks.length) limitations.push(`Current streak costs are unknown for ${unknownStreaks.map(item => item.name).join(', ')}. Their attainable streak band cannot be verified.`);
  if (!candidate.melee) limitations.push('No dedicated melee is cataloged for this rule set.');
  for (const setup of [primary, ...(secondary ? [secondary] : [])]) {
    if (!catalog.attachments.some(item => item.weaponIds.includes(setup.weapon.id))) limitations.push(`Attachment coverage is missing for ${setup.weapon.name}; an empty Gunsmith does not establish an optimal setup.`);
    else if (!setup.attachments.length) limitations.push(`${setup.weapon.name} has no equipped unlocked attachments under these constraints.`);
    if (setup.apex) limitations.push(`${setup.apex.name} uses its documented slot restrictions. Additional in-game compatibility interactions have not been tested, and its numeric behavior is unmeasured.`);
  }
  return limitations;
}

function finalize(catalog: Catalog, candidate: Candidate, settings: OptimizeSettings): Build {
  const { primary, secondary } = candidate.pair;
  const { distanceM, hitRegion } = scenario(settings);
  const strongest = [...dimensions].sort((a, b) => candidate.roles[b] - candidate.roles[a]).slice(0, 2);
  const attachmentNames = primary.attachments.map(item => item.name);
  const reasons = [`Role fit is ${candidate.score.toFixed(1)}/100 under the selected priorities; the strongest class dimensions are ${strongest.join(' and ')}.`,
    `${primary.weapon.name} contributes 44% of the class role vector${secondary ? ` and ${secondary.weapon.name} contributes 14%` : ''}.`,
    attachmentNames.length ? `Primary Gunsmith: ${attachmentNames.join(', ')}. Attachment benefits and costs are editorial role deltas, not measured percentage changes.` : 'Primary Gunsmith has no attachments in this candidate. Check the available unlocks and alternatives.',
    `Equipment includes one tactical, one lethal, one field upgrade, one perk from each of three slots, and three distinct streaks.`];
  for (const [label, setup] of [['Primary', primary], ['Secondary', secondary]] as const) {
    if (!setup) continue;
    const deltas = dimensions.map(d => ({ dimension: d, delta: setup.roles[d] - setup.weapon.roles[d] })).filter(item => item.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    if (deltas.length) reasons.push(`${label} configuration changes editorial role fit by ${deltas.slice(0, 3).map(item => `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)} ${item.dimension} points`).join(', ')} against its base weapon. These are preference points, not game stat percentages.`);
  }
  if (candidate.pair.overkill) reasons.push('Overkill is equipped because both selected weapons are primaries.');
  if (primary.apex || secondary?.apex) reasons.push(`Apex is equipped: ${[primary.apex?.name, secondary?.apex?.name].filter(Boolean).join(', ')}. Its blocked slots are excluded.`);
  const hash = [...`${catalog.version}|${candidate.key}`].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(36);
  return { id: `build-${hash}`, primary: primary.weapon, secondary: secondary?.weapon ?? null, melee: candidate.melee,
    attachments: primary.attachments, secondaryAttachments: secondary?.attachments ?? [], apex: primary.apex, secondaryApex: secondary?.apex ?? null,
    gear: candidate.equipment.gear, dimensions: candidate.roles, score: Math.round(candidate.score * 100) / 100,
    reasons, limitations: buildLimitations(catalog, candidate, settings), idealTtkMs: calculateBaseIdealTtk(primary.weapon, distanceM, hitRegion),
    idealTtkBasis: `Base ${primary.weapon.name}, ${hitRegion} at ${distanceM} m, first shot to lethal shot. Attachment and Apex changes excluded.`,
    variant: primary.apex || secondary?.apex ? 'apex' : 'standard' };
}

function hasApex(candidate: Candidate) { return !!candidate.pair.primary.apex; }
function decisions(candidate: Candidate): Set<string> {
  const pair = candidate.pair;
  return new Set([pair.primary.weapon.id, pair.secondary?.weapon.id ?? 'none', pair.primary.apex?.id ?? 'standard-primary', pair.secondary?.apex?.id ?? 'standard-secondary', ...pair.primary.attachments.map(item => item.id), ...(pair.secondary?.attachments.map(item => item.id) ?? []), ...candidate.equipment.gear.map(item => item.id)]);
}
function difference(left: Candidate, right: Candidate) {
  const a = decisions(left), b = decisions(right);
  return [...a].filter(id => !b.has(id)).length + [...b].filter(id => !a.has(id)).length;
}

/** Pure synchronous search, suitable for a Web Worker and reproducible saved settings. */
export function optimize(catalog: Catalog, settings: OptimizeSettings): OptimizeResult {
  const warnings = validate(catalog, settings);
  const finish = (builds: Build[] = [], evaluated = 0): OptimizeResult => ({ builds, warnings: [...new Set(warnings)], evaluated, method: METHOD });
  if (warnings.length) return finish();
  const weights = { ...PROFILE_PRIORITIES[settings.profile], ...settings.priorities };
  if (dimensions.every(d => weights[d] === 0)) { warnings.push('At least one priority must be greater than zero.'); return finish(); }
  const primaries = selectWeapons(catalog, settings, settings.primaryId, true);
  const secondaries = selectWeapons(catalog, settings, settings.secondaryId, false);
  if (!primaries.length) warnings.push('The selected primary is missing, excluded, or above the player level.');
  if (!secondaries.length && settings.secondaryId !== 'none') warnings.push('The selected secondary is missing, excluded, or above the player level.');
  if (warnings.length) return finish();
  const meleeOptions = catalog.weapons.filter(item => item.slot === 'melee' && playerAvailable(item, settings));
  const melee = [...meleeOptions].sort((a, b) => fit(b.roles, weights, settings.profile === 'balanced') - fit(a.roles, weights, settings.profile === 'balanced') || a.id.localeCompare(b.id))[0] ?? null;
  if (catalog.weapons.some(item => item.slot === 'melee') && !melee) { warnings.push('A dedicated melee is required, but every cataloged melee is excluded or above the player level.'); return finish(); }
  const primarySetups = primaries.flatMap(weapon => weaponSetups(catalog, weapon, settings, weights, true));
  const secondarySetups = secondaries.flatMap(weapon => weaponSetups(catalog, weapon, settings, weights, false));
  const pairs: WeaponPair[] = [];
  for (const primary of primarySetups) for (const secondary of settings.secondaryId === 'none' ? [null] : secondarySetups) {
    if (primary.weapon.id === secondary?.weapon.id) continue;
    // Compare isolates the primary conversion. A secondary conversion alone is not a primary Apex alternative.
    if (settings.apexMode === 'compare' && !primary.apex && secondary?.apex) continue;
    const overkill = secondary?.weapon.slot === 'primary';
    pairs.push({ primary, secondary, overkill, roles: pairRoles(primary, secondary), key: `${primary.key}|${secondary?.key ?? 'none'}` });
  }
  if (!pairs.length) {
    warnings.push(settings.apexMode === 'on' ? 'No legal primary Apex configuration is unlocked at the selected weapon levels. Check Apex availability and locked attachment conflicts.' : 'No legal weapon pair satisfies the selected weapons and attachment locks. A weapon cannot occupy both slots.');
    return finish();
  }
  const gearByOverkill = new Map([false, true].map(required => [required, gearPackages(catalog, settings, weights, required)]));
  const viable = pairs.filter(pair => gearByOverkill.get(pair.overkill)!.length > 0);
  if (!viable.length) { warnings.push('No complete legal class satisfies the gear, player level, and streak constraints. Two primary weapons require an available Overkill perk in its correct slot; fixed perks must allow it. Three distinct eligible streaks are required.'); return finish(); }
  // Preserve both Apex states and Overkill states before combining complete class packages.
  const globalPairs = [false, true].flatMap(apex => [false, true].flatMap(overkill => retain(viable.filter(pair => !!pair.primary.apex === apex && pair.overkill === overkill), WEAPON_BEAM, weights, settings.profile === 'balanced')));
  const groups = new Map<string, WeaponPair[]>();
  for (const pair of viable) {
    const key = `${pair.primary.weapon.id}:${!!pair.primary.apex}:${pair.overkill}`;
    const group = groups.get(key) ?? [];
    group.push(pair);
    groups.set(key, group);
  }
  const perPrimary = [...groups.values()].flatMap(group => retain(group, 1, weights, settings.profile === 'balanced'));
  const keptPairs = [...new Map([...globalPairs, ...perPrimary].map(pair => [pair.key, pair])).values()];
  const candidates: Candidate[] = [];
  let evaluated = 0;
  for (const pair of keptPairs) for (const equipment of gearByOverkill.get(pair.overkill)!) {
    const roles = add(add(zero(), pair.roles), equipment.roles);
    if (melee) add(roles, roleVector(melee.roles), .02);
    candidates.push({ pair, equipment, melee, roles, score: fit(roles, weights, settings.profile === 'balanced'), key: `${pair.key}|${melee?.id ?? '-'}|${equipment.key}` });
    evaluated++;
  }
  const ordered = candidates.sort((a, b) => b.score - a.score || keyCompare(a, b));
  if (!ordered.length) return finish();
  const chosen = [ordered[0]];
  if (settings.apexMode === 'compare') {
    const opposite = ordered.find(candidate => candidate.pair.primary.weapon.id === chosen[0].pair.primary.weapon.id && hasApex(candidate) !== hasApex(chosen[0]));
    if (opposite) chosen.push(opposite);
    else warnings.push(`Primary Apex comparison has only one available state for ${chosen[0].pair.primary.weapon.name} at these levels and constraints. Secondary Apex availability does not unlock the primary conversion.`);
  }
  for (const dimension of ['handling', 'mobility'] as const) {
    if (chosen.length >= 3) break;
    const pool = ordered.filter(candidate => !chosen.includes(candidate));
    const distinct = pool.filter(candidate => chosen.every(current => difference(candidate, current) >= 2));
    const alternative = (distinct.length ? distinct : pool).sort((a, b) => (b.roles[dimension] + b.score * .35) - (a.roles[dimension] + a.score * .35) || keyCompare(a, b))[0];
    if (alternative) chosen.push(alternative);
  }
  if (chosen.some(candidate => candidate.equipment.gear.some(item => item.kind === 'streak' && streakThreshold(item, candidate.equipment.gear) == null))) warnings.push('Streak suggestions include unknown current costs. Their attainable streak band is unverified; inspect each build\'s limitations.');
  return finish(chosen.map(candidate => finalize(catalog, candidate, settings)), evaluated);
}
