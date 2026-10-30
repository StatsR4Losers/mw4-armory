# Catalog review

Reviewed October 30, 2026 against the official launch guide, launch patch notes and a separately published transcription. This is source review, not a capture from the running game.

## Player unlock conflicts

The [official launch guide](https://www.callofduty.com/uk/en/blog/2026/10/call-of-duty-modern-warfare-4-launch-multiplayer-operators-weapons-equipment-create-a-class) gives different player unlock levels in its progression table and individual weapon sections. The catalog preserves both values in `reportedUnlockLevels` and retains the individual entry in `unlockLevel`. Neither value is confirmed in game.

| Weapon | Progression table | Individual entry |
| --- | ---: | ---: |
| VEL 46 | 5 | 13 |
| Wz.55 Striga | 18 | 21 |
| PPSh-41 | 30 | 27 |
| X-58 Nyx | 46 | 34 |
| Astaroth .57 | 25 | 10 |
| Signal 50 | 50 | 35 |

The engine should use the higher reported level as a conservative eligibility bound and disclose the conflict. Verify the in-game progression screen to settle the values. The [COD Loadout transcription](https://codloadout.gitlab.io/data/mw4.json) follows the progression table and is not independent confirmation because it cites the same launch guide.

## Apex and weapon data

All 33 catalog weapon IDs, weapon maximum levels and magazine values match the public transcription. All 28 Apex names and documented blocked slots match after normalizing slot names. The official guide says Apex unlocks at maximum weapon level. The Krait P68's guide entry calls its fire-rate value `260 BPM`; the catalog leaves RPM unknown rather than changing the unit. The transcription labels it RPM, which does not establish a correction.

The source does not state blocked slots for Hyeon Hyperburst, Rezi 12 Enforcer, FiNN Adverse, KG-7 Drillcharge or Krait P68 Commando. An empty array records no documented restriction, not verified compatibility. More generally, a list in the guide establishes the listed blocks but does not independently establish every compatible combination.

The importer uses `rear-grip` and `trigger-action`. The original catalog used spaces for those blocks; the engine used exact string comparison. The catalog now uses the importer's hyphenated form. This affects Axion Clearcut, MAR-9 Auto, GS Magna and Mojave Lawless.

## Images

The guide links Han 86 to `MW4-RFL-OPS-WEAPONS-009.webp` and M4 to `...-010.webp`; its later linked image URLs follow the catalog's numbered mapping. The page describes these as official base and Apex comparisons. Its Cronen Squall image link `...-016.webp` is described as a killstreak chart, and the PM-40 Anvil image link `...-040.webp` as a Han 86 Gunsmith screen, so the catalog intentionally leaves those images empty. The knife links to `...-041.webp`. The web tool resolved the guide's image links to those URLs, but direct image fetching returned an internal error and the in-app browser was unavailable. Actual pixels and browser delivery have not been independently verified.

## Engine consequences

`src/engine/index.ts` compares `blockedSlots` and attachment slot identifiers by exact string, so normalization is necessary. Its limitation text currently calls complete Apex compatibility unverified only when no blocked slots are listed; the same uncertainty applies to any combination not validated in game. Streaks with unknown thresholds are included in a build and disclosed as unverified. Their suitability for the selected attainable band remains unproved. The engine treats null player unlock levels as available with a limitation, so simply setting conflicting levels null would still allow recommendations without proving that the player has unlocked them.

The imported attachment file contains 1,589 weapon-specific records. A direct ID check found no `weaponIds` or unlock weapon IDs absent from the base catalog. Every normalized Apex blocked slot name appears among the imported attachment slot names. This verifies identifier matching only, not the accuracy, completeness or licensing of the underlying imported records.
