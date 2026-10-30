import type { Source, Weapon } from './legacy-types.ts';

// Public CODMunity records were filtered by both game and sourceGame == 'mw4'.
// These observations are community reported. They have not been tested in the live game.
const checkedAt = '2026-10-30';
const sourceId = (id: string) => `codmunity-mw4-${id}`;

// Each row retains the exact public record update time and the page that supplied it.
const observations: { id: string; name: string; updatedAt: string; url: string }[] = [
  { id: 'han-86', name: 'Han 86', updatedAt: '2026-10-28T19:33:04.980Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'm4', name: 'M4', updatedAt: '2026-10-28T19:36:56.044Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'hyeon-burst', name: 'Hyeon Burst', updatedAt: '2026-10-30T16:51:06.753Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'patriot-xmr', name: 'Patriot XMR', updatedAt: '2026-10-28T19:44:24.258Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'kastov-762', name: 'Kastov 762', updatedAt: '2026-10-28T19:34:52.752Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'oden', name: 'Oden', updatedAt: '2026-10-28T19:41:11.999Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'axion', name: 'Axion', updatedAt: '2026-10-23T14:54:34.790Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'cronen-squall', name: 'Cronen Squall', updatedAt: '2026-10-23T14:54:57.521Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'iso-nightshade', name: 'ISO Nightshade', updatedAt: '2026-10-28T19:50:41.207Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'vel-46', name: 'VEL 46', updatedAt: '2026-10-28T19:53:13.984Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'wz-55-striga', name: 'WZ.55 Striga', updatedAt: '2026-10-28T19:53:56.230Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'ppsh-41', name: 'PPSh-41', updatedAt: '2026-10-28T19:52:43.791Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'x-58-nyx', name: 'X-58 Nyx', updatedAt: '2026-10-28T19:58:06.429Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'rezi-12', name: 'Rezi 12', updatedAt: '2026-10-29T18:48:55.976Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'warlord', name: 'Warlord', updatedAt: '2026-10-23T18:46:25.794Z', url: 'https://codmunity.gg/weapon/mw4/warlord' },
  { id: 'finn-lmg', name: 'FiNN LMG', updatedAt: '2026-10-28T20:01:12.008Z', url: 'https://codmunity.gg/weapon/mw4/finn-lmg' },
  { id: 'type-73', name: 'Type 73', updatedAt: '2026-10-23T19:40:15.752Z', url: 'https://codmunity.gg/weapon/mw4/type-73' },
  { id: 'apoc-338', name: 'APOC-338', updatedAt: '2026-10-28T20:00:26.611Z', url: 'https://codmunity.gg/weapon/mw4/apoc-338' },
  { id: 'mar-9', name: 'MAR-9', updatedAt: '2026-10-23T19:54:01.106Z', url: 'https://codmunity.gg/weapon/mw4/mar-9' },
  { id: 'oris-8-6', name: 'Oris 8.6', updatedAt: '2026-10-23T19:10:54.446Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'mosin-nagant', name: 'Mosin-Nagant', updatedAt: '2026-10-23T19:11:25.845Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'kg-7-vulcan', name: 'KG-7 Vulcan', updatedAt: '2026-10-23T19:11:58.200Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'astaroth-57', name: 'Astaroth .57', updatedAt: '2026-10-23T20:03:24.775Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'signal-50', name: 'Signal 50', updatedAt: '2026-10-23T20:02:29.738Z', url: 'https://codmunity.gg/weapon-stats/mw4' },
  { id: 'sang-9mm', name: 'SANG 9mm', updatedAt: '2026-10-23T19:16:24.599Z', url: 'https://codmunity.gg/weapon/mw4/sang-9mm' },
  { id: 'krait-p68', name: 'Krait P68', updatedAt: '2026-10-23T19:16:45.054Z', url: 'https://codmunity.gg/weapon/mw4/krait-p68' },
  { id: '50-gs', name: '.50 GS', updatedAt: '2026-10-23T20:06:23.019Z', url: 'https://codmunity.gg/weapon/mw4/50-gs' },
  { id: 'mojave-357', name: 'Mojave .357', updatedAt: '2026-10-23T20:12:10.389Z', url: 'https://codmunity.gg/weapon/mw4/mojave-357' },
  { id: 'pila', name: 'PILA', updatedAt: '2026-10-22T16:06:50.547Z', url: 'https://codmunity.gg/weapon/mw4/pila' },
  { id: 'rpg-8', name: 'RPG-8', updatedAt: '2026-10-22T16:06:51.218Z', url: 'https://codmunity.gg/weapon/mw4/rpg-8' },
  { id: 'jokr', name: 'JOKR', updatedAt: '2026-10-22T16:06:51.547Z', url: 'https://codmunity.gg/weapon/mw4/jokr' },
  { id: 'pm-40-anvil', name: 'PM-40 Anvil', updatedAt: '2026-10-22T16:06:50.904Z', url: 'https://codmunity.gg/weapon/mw4/pm-40-anvil' },
  { id: 'fss-carbon-edge-1095', name: 'FSS Carbon Edge 1095', updatedAt: '2026-10-22T16:06:51.914Z', url: 'https://codmunity.gg/weapon/mw4/fss-carbon-edge-1095' },
];

// Source notes identify the selected game record because a shared weapon page may default to Warzone.
export const statSources: Source[] = observations.map(({ id, name, updatedAt, url }) => ({
  id: sourceId(id),
  title: `CODMunity MW4 multiplayer base data: ${name}`,
  url,
  checkedAt,
  note: `Public page data, game=mw4 and sourceGame=mw4; base weapon. Record updated ${updatedAt}. Timings in ms, projectile and movement speeds in m/s, damage in health points, distance in meters. Community reported; no independent game measurement.`,
}));

// Only source values enter this overlay. Editorial role scores stay in the base catalog.
// Damage intervals include minM and exclude maxM. The last interval continues with maxM=null.
export const weaponStatOverrides: Record<string, Partial<Weapon>> = {
  'han-86': { fireMode: 'auto', rpm: 741, sourceIds: ['launch-guide', sourceId('han-86')], stats: { movementMps: 4.67, adsMovementMps: 2.47, sprintMps: 6.13, tacticalSprintMps: 7.21, health: 100, adsMs: 250, sprintToFireMs: 210, velocityMps: 615, reloadMs: 3133 },
    damageProfile: [
      { minM: 0, maxM: 30, regions: { head: 28, neck: 23, chest: 23, stomach: 23, upperarm: 23, lowerarm: 23, upperleg: 23, lowerleg: 23 } },
      { minM: 30, maxM: null, regions: { head: 23, neck: 19, chest: 19, stomach: 19, upperarm: 19, lowerarm: 19, upperleg: 19, lowerleg: 19 } },
    ],
  },
  'm4': { fireMode: 'auto', rpm: 811, sourceIds: ['launch-guide', sourceId('m4')], stats: { movementMps: 4.7, adsMovementMps: 2.51, sprintMps: 6.18, tacticalSprintMps: 7.26, health: 100, adsMs: 240, sprintToFireMs: 210, velocityMps: 590, reloadMs: 2600 },
    damageProfile: [
      { minM: 0, maxM: 26, regions: { head: 28, neck: 23, chest: 23, stomach: 23, upperarm: 23, lowerarm: 23, upperleg: 23, lowerleg: 23 } },
      { minM: 26, maxM: null, regions: { head: 23, neck: 19, chest: 19, stomach: 19, upperarm: 19, lowerarm: 19, upperleg: 19, lowerleg: 19 } },
    ],
  },
  'hyeon-burst': { fireMode: 'burst', rpm: 375, sourceIds: ['launch-guide', sourceId('hyeon-burst')], stats: { movementMps: 4.58, adsMovementMps: 2.36, sprintMps: 6.07, tacticalSprintMps: 7.11, health: 100, adsMs: 275, sprintToFireMs: 210, velocityMps: 775, reloadMs: 3400 },
    damageProfile: [
      { minM: 0, maxM: 21, regions: { head: 41, neck: 34, chest: 34, stomach: 31, upperarm: 31, lowerarm: 31, upperleg: 31, lowerleg: 31 } },
      { minM: 21, maxM: 43, regions: { head: 31, neck: 26, chest: 26, stomach: 24, upperarm: 24, lowerarm: 24, upperleg: 24, lowerleg: 24 } },
      { minM: 43, maxM: null, regions: { head: 28, neck: 24, chest: 24, stomach: 22, upperarm: 22, lowerarm: 22, upperleg: 22, lowerleg: 22 } },
    ],
  },
  'patriot-xmr': { fireMode: 'auto', rpm: 645, sourceIds: ['launch-guide', sourceId('patriot-xmr')], stats: { movementMps: 4.54, adsMovementMps: 2.22, sprintMps: 6.05, tacticalSprintMps: 7.09, health: 100, adsMs: 280, sprintToFireMs: 210, velocityMps: 620, reloadMs: 3333 },
    damageProfile: [
      { minM: 0, maxM: 31, regions: { head: 39, neck: 30, chest: 30, stomach: 30, upperarm: 30, lowerarm: 30, upperleg: 30, lowerleg: 30 } },
      { minM: 31, maxM: 50, regions: { head: 31, neck: 24, chest: 24, stomach: 24, upperarm: 24, lowerarm: 24, upperleg: 24, lowerleg: 24 } },
      { minM: 50, maxM: null, regions: { head: 28, neck: 22, chest: 22, stomach: 22, upperarm: 22, lowerarm: 22, upperleg: 22, lowerleg: 22 } },
    ],
  },
  'kastov-762': { fireMode: 'auto', rpm: 600, sourceIds: ['launch-guide', sourceId('kastov-762')], stats: { movementMps: 4.52, adsMovementMps: 2.34, sprintMps: 6.05, tacticalSprintMps: 7.1, health: 100, adsMs: 280, sprintToFireMs: 210, velocityMps: 560, reloadMs: 3467 },
    damageProfile: [
      { minM: 0, maxM: 27, regions: { head: 39, neck: 32, chest: 32, stomach: 30, upperarm: 30, lowerarm: 30, upperleg: 30, lowerleg: 30 } },
      { minM: 27, maxM: 40, regions: { head: 31, neck: 25, chest: 25, stomach: 24, upperarm: 24, lowerarm: 24, upperleg: 24, lowerleg: 24 } },
      { minM: 40, maxM: null, regions: { head: 29, neck: 23, chest: 23, stomach: 22, upperarm: 22, lowerarm: 22, upperleg: 22, lowerleg: 22 } },
    ],
  },
  'oden': { fireMode: 'auto', rpm: 414, sourceIds: ['launch-guide', sourceId('oden')], stats: { movementMps: 4.46, adsMovementMps: 2.18, sprintMps: 6.03, tacticalSprintMps: 6.97, health: 100, adsMs: 320, sprintToFireMs: 210, velocityMps: 690, reloadMs: 3300 },
    damageProfile: [
      { minM: 0, maxM: 33, regions: { head: 57, neck: 45, chest: 45, stomach: 41, upperarm: 41, lowerarm: 41, upperleg: 41, lowerleg: 41 } },
      { minM: 33, maxM: 50, regions: { head: 50, neck: 40, chest: 40, stomach: 36, upperarm: 36, lowerarm: 36, upperleg: 36, lowerleg: 36 } },
      { minM: 50, maxM: null, regions: { head: 44, neck: 35, chest: 35, stomach: 32, upperarm: 32, lowerarm: 32, upperleg: 32, lowerleg: 32 } },
    ],
  },
  'axion': { fireMode: 'auto', rpm: 706, sourceIds: ['launch-guide', sourceId('axion')], stats: { movementMps: 4.62, adsMovementMps: 2.41, sprintMps: 6.11, tacticalSprintMps: 7.16, health: 100, adsMs: 260, sprintToFireMs: 210, velocityMps: 400, reloadMs: 3333 },
    damageProfile: [
      { minM: 0, maxM: 23, regions: { head: 32, neck: 26, chest: 26, stomach: 24, upperarm: 24, lowerarm: 24, upperleg: 24, lowerleg: 24 } },
      { minM: 23, maxM: 34, regions: { head: 29, neck: 24, chest: 24, stomach: 22, upperarm: 22, lowerarm: 22, upperleg: 22, lowerleg: 22 } },
      { minM: 34, maxM: null, regions: { head: 27, neck: 22, chest: 22, stomach: 20, upperarm: 20, lowerarm: 20, upperleg: 20, lowerleg: 20 } },
    ],
  },
  'cronen-squall': { fireMode: 'auto', rpm: 674, sourceIds: ['launch-guide', sourceId('cronen-squall')], stats: { movementMps: 4.55, adsMovementMps: 2.24, sprintMps: 6.07, tacticalSprintMps: 7.11, health: 100, adsMs: 305, sprintToFireMs: 210, velocityMps: 660, reloadMs: 3533 },
    damageProfile: [
      { minM: 0, maxM: 26, regions: { head: 37, neck: 30, chest: 30, stomach: 28, upperarm: 28, lowerarm: 28, upperleg: 28, lowerleg: 28 } },
      { minM: 26, maxM: 37, regions: { head: 35, neck: 28, chest: 28, stomach: 26, upperarm: 26, lowerarm: 26, upperleg: 26, lowerleg: 26 } },
      { minM: 37, maxM: null, regions: { head: 29, neck: 24, chest: 24, stomach: 22, upperarm: 22, lowerarm: 22, upperleg: 22, lowerleg: 22 } },
    ],
  },
  'iso-nightshade': { fireMode: 'auto', rpm: 923, sourceIds: ['launch-guide', sourceId('iso-nightshade')], stats: { movementMps: 4.8, adsMovementMps: 3.2, sprintMps: 6.33, tacticalSprintMps: 7.43, health: 100, adsMs: 240, sprintToFireMs: 110, velocityMps: 530, reloadMs: 3267 },
    damageProfile: [
      { minM: 0, maxM: 11, regions: { head: 27, neck: 21, chest: 21, stomach: 21, upperarm: 21, lowerarm: 21, upperleg: 19, lowerleg: 19 } },
      { minM: 11, maxM: 20, regions: { head: 22, neck: 17, chest: 17, stomach: 17, upperarm: 17, lowerarm: 17, upperleg: 16, lowerleg: 16 } },
      { minM: 20, maxM: 28, regions: { head: 19, neck: 15, chest: 15, stomach: 15, upperarm: 15, lowerarm: 15, upperleg: 14, lowerleg: 14 } },
      { minM: 28, maxM: null, regions: { head: 16, neck: 13, chest: 13, stomach: 13, upperarm: 13, lowerarm: 13, upperleg: 12, lowerleg: 12 } },
    ],
  },
  'vel-46': { fireMode: 'auto', rpm: 952, sourceIds: ['launch-guide', sourceId('vel-46')], stats: { movementMps: 4.77, adsMovementMps: 3.22, sprintMps: 6.26, tacticalSprintMps: 7.33, health: 100, adsMs: 230, sprintToFireMs: 110, velocityMps: 565, reloadMs: 2633 },
    damageProfile: [
      { minM: 0, maxM: 10, regions: { head: 26, neck: 20, chest: 20, stomach: 20, upperarm: 20, lowerarm: 20, upperleg: 19, lowerleg: 19 } },
      { minM: 10, maxM: 17, regions: { head: 22, neck: 17, chest: 17, stomach: 17, upperarm: 17, lowerarm: 17, upperleg: 16, lowerleg: 16 } },
      { minM: 17, maxM: 25, regions: { head: 19, neck: 15, chest: 15, stomach: 15, upperarm: 15, lowerarm: 15, upperleg: 14, lowerleg: 14 } },
      { minM: 25, maxM: null, regions: { head: 16, neck: 13, chest: 13, stomach: 13, upperarm: 13, lowerarm: 13, upperleg: 12, lowerleg: 12 } },
    ],
  },
  'wz-55-striga': { fireMode: 'auto', rpm: 651, sourceIds: ['launch-guide', sourceId('wz-55-striga')], stats: { movementMps: 5.06, adsMovementMps: 3.54, sprintMps: 6.46, tacticalSprintMps: 7.68, health: 100, adsMs: 196, sprintToFireMs: 96, velocityMps: 380, reloadMs: 3167 },
    damageProfile: [
      { minM: 0, maxM: 12, regions: { head: 36, neck: 26, chest: 26, stomach: 26, upperarm: 26, lowerarm: 26, upperleg: 24, lowerleg: 24 } },
      { minM: 12, maxM: 21, regions: { head: 32, neck: 23, chest: 23, stomach: 23, upperarm: 23, lowerarm: 23, upperleg: 21, lowerleg: 21 } },
      { minM: 21, maxM: 30, regions: { head: 25, neck: 18, chest: 18, stomach: 18, upperarm: 18, lowerarm: 18, upperleg: 17, lowerleg: 17 } },
      { minM: 30, maxM: null, regions: { head: 24, neck: 17, chest: 17, stomach: 17, upperarm: 17, lowerarm: 17, upperleg: 16, lowerleg: 16 } },
    ],
  },
  'ppsh-41': { fireMode: 'auto', rpm: 1110, sourceIds: ['launch-guide', sourceId('ppsh-41')], stats: { movementMps: 4.7, adsMovementMps: 3.15, sprintMps: 6.21, tacticalSprintMps: 7.29, health: 100, adsMs: 280, sprintToFireMs: 110, velocityMps: 550, reloadMs: 3900 },
    damageProfile: [
      { minM: 0, maxM: 11, regions: { head: 23, neck: 18, chest: 18, stomach: 18, upperarm: 18, lowerarm: 18, upperleg: 17, lowerleg: 17 } },
      { minM: 11, maxM: 20, regions: { head: 19, neck: 15, chest: 15, stomach: 15, upperarm: 15, lowerarm: 15, upperleg: 14, lowerleg: 14 } },
      { minM: 20, maxM: 29, regions: { head: 16, neck: 13, chest: 13, stomach: 13, upperarm: 13, lowerarm: 13, upperleg: 12, lowerleg: 12 } },
      { minM: 29, maxM: null, regions: { head: 15, neck: 12, chest: 12, stomach: 12, upperarm: 12, lowerarm: 12, upperleg: 11, lowerleg: 11 } },
    ],
  },
  'x-58-nyx': { fireMode: 'auto', rpm: 800, sourceIds: ['launch-guide', sourceId('x-58-nyx')], stats: { movementMps: 4.74, adsMovementMps: 3.26, sprintMps: 6.27, tacticalSprintMps: 7.31, health: 100, adsMs: 255, sprintToFireMs: 110, velocityMps: 450, reloadMs: 2767 },
    damageProfile: [
      { minM: 0, maxM: 11, regions: { head: 28, neck: 22, chest: 22, stomach: 22, upperarm: 22, lowerarm: 22, upperleg: 20, lowerleg: 20 } },
      { minM: 11, maxM: 20, regions: { head: 23, neck: 18, chest: 18, stomach: 18, upperarm: 18, lowerarm: 18, upperleg: 17, lowerleg: 17 } },
      { minM: 20, maxM: 30, regions: { head: 19, neck: 15, chest: 15, stomach: 15, upperarm: 15, lowerarm: 15, upperleg: 14, lowerleg: 14 } },
      { minM: 30, maxM: null, regions: { head: 16, neck: 13, chest: 13, stomach: 13, upperarm: 13, lowerarm: 13, upperleg: 12, lowerleg: 12 } },
    ],
  },
  'rezi-12': { fireMode: 'semi', rpm: 150, sourceIds: ['launch-guide', sourceId('rezi-12')], stats: { movementMps: 4.72, adsMovementMps: 3.09, sprintMps: 6.26, tacticalSprintMps: 7.34, adsMs: 340, sprintToFireMs: 160, velocityMps: 340, reloadMs: 6131 }
  },
  'warlord': { fireMode: 'single', rpm: 106, sourceIds: ['launch-guide', sourceId('warlord')], stats: { movementMps: 4.55, adsMovementMps: 2.93, sprintMps: 6.11, tacticalSprintMps: 7.09, adsMs: 340, sprintToFireMs: 210, velocityMps: 325, reloadMs: 20796 }
  },
  'finn-lmg': { fireMode: 'auto', rpm: 588, sourceIds: ['launch-guide', sourceId('finn-lmg')], stats: { movementMps: 4.38, adsMovementMps: 2.03, sprintMps: 5.82, tacticalSprintMps: 6.75, health: 100, adsMs: 400, sprintToFireMs: 237, velocityMps: 710, reloadMs: 6270 },
    damageProfile: [
      { minM: 0, maxM: 22, regions: { head: 39, neck: 33, chest: 33, stomach: 30, upperarm: 30, lowerarm: 30, upperleg: 30, lowerleg: 30 } },
      { minM: 22, maxM: 41, regions: { head: 36, neck: 30, chest: 30, stomach: 28, upperarm: 28, lowerarm: 28, upperleg: 28, lowerleg: 28 } },
      { minM: 41, maxM: null, regions: { head: 33, neck: 28, chest: 28, stomach: 26, upperarm: 26, lowerarm: 26, upperleg: 26, lowerleg: 26 } },
    ],
  },
  'type-73': { fireMode: 'auto', rpm: 821, sourceIds: ['launch-guide', sourceId('type-73')], stats: { movementMps: 4.33, adsMovementMps: 1.81, sprintMps: 5.71, tacticalSprintMps: 6.55, health: 100, adsMs: 460, sprintToFireMs: 245, velocityMps: 690, reloadMs: 6767 },
    damageProfile: [
      { minM: 0, maxM: 25, regions: { head: 27, neck: 24, chest: 24, stomach: 22, upperarm: 22, lowerarm: 22, upperleg: 22, lowerleg: 22 } },
      { minM: 25, maxM: 47, regions: { head: 26, neck: 23, chest: 23, stomach: 21, upperarm: 21, lowerarm: 21, upperleg: 21, lowerleg: 21 } },
      { minM: 47, maxM: null, regions: { head: 23, neck: 20, chest: 20, stomach: 19, upperarm: 19, lowerarm: 19, upperleg: 19, lowerleg: 19 } },
    ],
  },
  'apoc-338': { fireMode: 'auto', rpm: 555, sourceIds: ['launch-guide', sourceId('apoc-338')], stats: { movementMps: 4.05, adsMovementMps: 1.51, sprintMps: 5.57, tacticalSprintMps: 6.35, health: 100, adsMs: 510, sprintToFireMs: 250, velocityMps: 730, reloadMs: 7100 },
    damageProfile: [
      { minM: 0, maxM: 23, regions: { head: 55, neck: 45, chest: 45, stomach: 41, upperarm: 41, lowerarm: 41, upperleg: 41, lowerleg: 41 } },
      { minM: 23, maxM: 48, regions: { head: 49, neck: 40, chest: 40, stomach: 37, upperarm: 37, lowerarm: 37, upperleg: 37, lowerleg: 37 } },
      { minM: 48, maxM: null, regions: { head: 44, neck: 36, chest: 36, stomach: 33, upperarm: 33, lowerarm: 33, upperleg: 33, lowerleg: 33 } },
    ],
  },
  'mar-9': { fireMode: 'semi', rpm: 316, sourceIds: ['launch-guide', sourceId('mar-9')], stats: { movementMps: 4.41, adsMovementMps: 2.1, sprintMps: 5.93, tacticalSprintMps: 6.95, health: 100, adsMs: 330, sprintToFireMs: 249, velocityMps: 670, reloadMs: 2933 },
    damageProfile: [
      { minM: 0, maxM: 20, regions: { head: 100, neck: 55, chest: 55, stomach: 50, upperarm: 50, lowerarm: 50, upperleg: 50, lowerleg: 50 } },
      { minM: 20, maxM: 29, regions: { head: 84, neck: 46, chest: 46, stomach: 42, upperarm: 42, lowerarm: 42, upperleg: 42, lowerleg: 42 } },
      { minM: 29, maxM: null, regions: { head: 74, neck: 40, chest: 40, stomach: 37, upperarm: 37, lowerarm: 37, upperleg: 37, lowerleg: 37 } },
    ],
  },
  'oris-8-6': { fireMode: 'single', rpm: 90, sourceIds: ['launch-guide', sourceId('oris-8-6')], stats: { movementMps: 4.77, adsMovementMps: 2.78, sprintMps: 6.18, tacticalSprintMps: 7.34, health: 100, adsMs: 260, sprintToFireMs: 150, velocityMps: 570, reloadMs: 3000 },
    damageProfile: [
      { minM: 0, maxM: 19, regions: { head: 152, neck: 114, chest: 104, stomach: 95, upperarm: 95, lowerarm: 95, upperleg: 95, lowerleg: 95 } },
      { minM: 19, maxM: 30, regions: { head: 134, neck: 100, chest: 92, stomach: 84, upperarm: 84, lowerarm: 84, upperleg: 84, lowerleg: 84 } },
      { minM: 30, maxM: 46, regions: { head: 112, neck: 84, chest: 77, stomach: 70, upperarm: 70, lowerarm: 70, upperleg: 70, lowerleg: 70 } },
      { minM: 46, maxM: null, regions: { head: 92, neck: 70, chest: 63, stomach: 58, upperarm: 58, lowerarm: 58, upperleg: 58, lowerleg: 58 } },
    ],
  },
  'mosin-nagant': { fireMode: 'single', rpm: 44, sourceIds: ['launch-guide', sourceId('mosin-nagant')], stats: { movementMps: 4.57, adsMovementMps: 2.1, sprintMps: 6.04, tacticalSprintMps: 7.09, health: 100, adsMs: 350, sprintToFireMs: 240, velocityMps: 700, reloadMs: 3333 },
    damageProfile: [
      { minM: 0, maxM: 37, regions: { head: 158, neck: 111, chest: 102, stomach: 102, upperarm: 93, lowerarm: 93, upperleg: 93, lowerleg: 93 } },
      { minM: 37, maxM: 56, regions: { head: 146, neck: 103, chest: 94, stomach: 94, upperarm: 86, lowerarm: 86, upperleg: 86, lowerleg: 86 } },
      { minM: 56, maxM: null, regions: { head: 102, neck: 72, chest: 66, stomach: 66, upperarm: 60, lowerarm: 60, upperleg: 60, lowerleg: 60 } },
    ],
  },
  'kg-7-vulcan': { fireMode: 'single', rpm: 41, sourceIds: ['launch-guide', sourceId('kg-7-vulcan')], stats: { movementMps: 4.33, adsMovementMps: 1.13, sprintMps: 5.8, tacticalSprintMps: 6.67, health: 100, adsMs: 550, sprintToFireMs: 270, velocityMps: 740, reloadMs: 4367 },
    damageProfile: [
      { minM: 0, maxM: 68, regions: { head: 269, neck: 168, chest: 168, stomach: 102, upperarm: 99, lowerarm: 99, upperleg: 102, lowerleg: 99 } },
      { minM: 68, maxM: 86, regions: { head: 261, neck: 163, chest: 163, stomach: 99, upperarm: 96, lowerarm: 96, upperleg: 99, lowerleg: 96 } },
      { minM: 86, maxM: null, regions: { head: 251, neck: 156, chest: 156, stomach: 95, upperarm: 92, lowerarm: 92, upperleg: 95, lowerleg: 92 } },
    ],
  },
  'astaroth-57': { fireMode: 'single', rpm: 35, sourceIds: ['launch-guide', sourceId('astaroth-57')], stats: { movementMps: 4.04, adsMovementMps: 1.04, sprintMps: 5.47, tacticalSprintMps: 6.22, health: 100, adsMs: 603, sprintToFireMs: 500, velocityMps: 620, reloadMs: 6533 },
    damageProfile: [
      { minM: 0, maxM: 50, regions: { head: 322, neck: 214, chest: 199, stomach: 102, upperarm: 107, lowerarm: 100, upperleg: 100, lowerleg: 99 } },
      { minM: 50, maxM: 86, regions: { head: 316, neck: 210, chest: 195, stomach: 100, upperarm: 105, lowerarm: 98, upperleg: 98, lowerleg: 97 } },
      { minM: 86, maxM: null, regions: { head: 313, neck: 208, chest: 193, stomach: 99, upperarm: 104, lowerarm: 97, upperleg: 97, lowerleg: 96 } },
    ],
  },
  'signal-50': { fireMode: 'semi', rpm: 111, sourceIds: ['launch-guide', sourceId('signal-50')], stats: { movementMps: 4.22, adsMovementMps: 1.07, sprintMps: 5.67, tacticalSprintMps: 6.52, health: 100, adsMs: 590, sprintToFireMs: 283, velocityMps: 600, reloadMs: 4967 },
    damageProfile: [
      { minM: 0, maxM: 34, regions: { head: 284, neck: 178, chest: 132, stomach: 102, upperarm: 104, lowerarm: 96, upperleg: 96, lowerleg: 96 } },
      { minM: 34, maxM: 49, regions: { head: 276, neck: 173, chest: 128, stomach: 99, upperarm: 101, lowerarm: 93, upperleg: 93, lowerleg: 93 } },
      { minM: 49, maxM: 66, regions: { head: 223, neck: 140, chest: 104, stomach: 80, upperarm: 82, lowerarm: 75, upperleg: 75, lowerleg: 75 } },
      { minM: 66, maxM: null, regions: { head: 209, neck: 131, chest: 97, stomach: 75, upperarm: 76, lowerarm: 71, upperleg: 71, lowerleg: 71 } },
    ],
  },
  'sang-9mm': { fireMode: 'semi', rpm: 370, sourceIds: ['launch-guide', sourceId('sang-9mm')], stats: { movementMps: 5.05, adsMovementMps: 3.73, sprintMps: 6.62, tacticalSprintMps: 7.64, health: 100, adsMs: 170, sprintToFireMs: 80, velocityMps: 370, reloadMs: 2500 },
    damageProfile: [
      { minM: 0, maxM: 9, regions: { head: 60, neck: 48, chest: 48, stomach: 44, upperarm: 40, lowerarm: 40, upperleg: 40, lowerleg: 40 } },
      { minM: 9, maxM: 19, regions: { head: 49, neck: 39, chest: 39, stomach: 36, upperarm: 33, lowerarm: 33, upperleg: 33, lowerleg: 33 } },
      { minM: 19, maxM: 26, regions: { head: 42, neck: 39, chest: 39, stomach: 30, upperarm: 28, lowerarm: 28, upperleg: 28, lowerleg: 28 } },
      { minM: 26, maxM: null, regions: { head: 36, neck: 28, chest: 28, stomach: 26, upperarm: 24, lowerarm: 24, upperleg: 24, lowerleg: 24 } },
    ],
  },
  'krait-p68': { fireMode: 'semi', rpm: 261, sourceIds: ['launch-guide', sourceId('krait-p68')], stats: { movementMps: 4.99, adsMovementMps: 3.68, sprintMps: 6.58, tacticalSprintMps: 7.6, health: 100, adsMs: 180, sprintToFireMs: 80, velocityMps: 250, reloadMs: 2967 },
    damageProfile: [
      { minM: 0, maxM: 9, regions: { head: 59, neck: 50, chest: 50, stomach: 46, upperarm: 46, lowerarm: 46, upperleg: 46, lowerleg: 46 } },
      { minM: 9, maxM: 20, regions: { head: 50, neck: 42, chest: 42, stomach: 39, upperarm: 39, lowerarm: 39, upperleg: 39, lowerleg: 39 } },
      { minM: 20, maxM: 37, regions: { head: 44, neck: 37, chest: 37, stomach: 34, upperarm: 34, lowerarm: 34, upperleg: 34, lowerleg: 34 } },
      { minM: 37, maxM: null, regions: { head: 39, neck: 33, chest: 33, stomach: 30, upperarm: 30, lowerarm: 30, upperleg: 30, lowerleg: 30 } },
    ],
  },
  '50-gs': { fireMode: 'semi', rpm: 167, sourceIds: ['launch-guide', sourceId('50-gs')], stats: { movementMps: 4.92, adsMovementMps: 3.51, sprintMps: 6.55, tacticalSprintMps: 7.51, health: 100, adsMs: 200, sprintToFireMs: 80, velocityMps: 460, reloadMs: 2333 },
    damageProfile: [
      { minM: 0, maxM: 22, regions: { head: 105, neck: 77, chest: 77, stomach: 77, upperarm: 70, lowerarm: 70, upperleg: 70, lowerleg: 70 } },
      { minM: 22, maxM: 42, regions: { head: 87, neck: 63, chest: 63, stomach: 63, upperarm: 58, lowerarm: 58, upperleg: 58, lowerleg: 58 } },
      { minM: 42, maxM: null, regions: { head: 67, neck: 49, chest: 49, stomach: 49, upperarm: 45, lowerarm: 45, upperleg: 45, lowerleg: 45 } },
    ],
  },
  'mojave-357': { fireMode: 'semi', rpm: 142, sourceIds: ['launch-guide', sourceId('mojave-357')], stats: { movementMps: 4.96, adsMovementMps: 3.58, sprintMps: 6.56, tacticalSprintMps: 7.55, health: 100, adsMs: 190, sprintToFireMs: 80, velocityMps: 400, reloadMs: 3700 },
    damageProfile: [
      { minM: 0, maxM: 25, regions: { head: 115, neck: 76, chest: 76, stomach: 70, upperarm: 64, lowerarm: 64, upperleg: 64, lowerleg: 64 } },
      { minM: 25, maxM: 31, regions: { head: 93, neck: 62, chest: 62, stomach: 57, upperarm: 52, lowerarm: 52, upperleg: 52, lowerleg: 52 } },
      { minM: 31, maxM: 40, regions: { head: 86, neck: 57, chest: 57, stomach: 52, upperarm: 48, lowerarm: 48, upperleg: 48, lowerleg: 48 } },
      { minM: 40, maxM: null, regions: { head: 75, neck: 50, chest: 50, stomach: 46, upperarm: 42, lowerarm: 42, upperleg: 42, lowerleg: 42 } },
    ],
  },
  'pila': { fireMode: 'single', rpm: 9, sourceIds: ['launch-guide', sourceId('pila')], stats: { movementMps: 4.12, adsMovementMps: 1.07, sprintMps: 5.52, tacticalSprintMps: 6.33, adsMs: 680, sprintToFireMs: 250, velocityMps: 63.5, reloadMs: 5933 }
  },
  'rpg-8': { fireMode: 'single', rpm: 21, sourceIds: ['launch-guide', sourceId('rpg-8')], stats: { movementMps: 4.33, adsMovementMps: 1.51, sprintMps: 5.63, tacticalSprintMps: 6.46, adsMs: 550, sprintToFireMs: 500, velocityMps: 52.1, reloadMs: 3300 }
  },
  'jokr': { fireMode: 'single', rpm: 13, sourceIds: ['launch-guide', sourceId('jokr')], stats: { movementMps: 4.05, adsMovementMps: 0.97, sprintMps: 5.46, tacticalSprintMps: 6.25, adsMs: 740, sprintToFireMs: 250, velocityMps: 30.5, reloadMs: 4033 }
  },
  'pm-40-anvil': { fireMode: 'single', rpm: 39, sourceIds: ['launch-guide', sourceId('pm-40-anvil')], stats: { movementMps: 4.44, adsMovementMps: 1.72, sprintMps: 5.97, tacticalSprintMps: 6.79, adsMs: 350, sprintToFireMs: 250, velocityMps: 790, reloadMs: 7034 }
  },
  'fss-carbon-edge-1095': { sourceIds: ['launch-guide', sourceId('fss-carbon-edge-1095')]
  },
};

// These limits travel with the catalog so the UI can explain what a computed result proves.
export const statNotes: string[] = [
  'Community weapon measurements were read from public CODMunity MW4 multiplayer page data on October 30, 2026. Both game and sourceGame must equal mw4; Warzone, DMZ and older same-name weapon records were excluded.',
  'Base handling and projectile values cover 32 of 33 weapons. The knife has no ADS, sprint-to-fire, reload or projectile value. Missing values remain absent.',
  'Movement, ADS movement, sprint and tactical sprint speeds cover 32 of 33 weapons in meters per second. The public knife record has no movement value, so those fields remain absent.',
  'Damage by distance and hit region covers 26 of 33 weapons. Damage for the two shotguns, four launchers and knife is unavailable in the selected public records. No pellet, blast or melee damage was inferred.',
  "Health 100 comes from CODMunity's explicit MW4 game configuration. Damage values and health are community reported, not independent in-game measurements. This rule applies to the selected standard multiplayer data only.",
  'Damage intervals use meters: minM <= distance < maxM; maxM null means the final reported damage interval. Region keys are head, neck, chest, stomach, upperarm, lowerarm, upperleg and lowerleg.',
  'Community RPM is retained beside the launch-guide provenance. Several values differ from the official launch sheet by one RPM, including M4 811 versus 810 and Han 86 741 versus 740. This is a source conflict, not proof of a balance change.',
  'Public MW4 PPSh-41 data reports ADS 280 ms. The October 28 COD Loadout secondary snapshot reports 300 ms. This snapshot uses the original MW4 record and preserves the discrepancy in the source ledger.',
  'Ideal TTK calculations use base damage profiles and do not establish a configured attachment or Apex TTK. Burst timing, charging, rechambering, pellets, explosions, misses and healing require their own event models.',
  'The source reports nonzero pre-fire delays for some automatic weapons. A first-shot-to-lethal-shot TTK excludes those delays and excludes ADS, sprint-to-fire, projectile travel and reloads.',
  'The COD Loadout range value of 100 is a relative index, not 100 meters. No physical damage distance was derived from that index, and no hit probability was derived from recoil or movement values.',
];
