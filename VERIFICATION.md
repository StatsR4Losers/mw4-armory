# Release verification

Checked October 30, 2026. This records local acceptance before publication. The deployment receipt is saved separately in the parent workspace after Sites confirms publication.

## Completed checks

- Production TypeScript check and Vite build pass.
- All 26 automated engine and catalog checks pass. They cover complete class categories, source references, level boundaries, unknown unlocks, shared unlock paths, Apex gating and slot blockers, perk locks, Overkill, deterministic results, damage breakpoints, and comparison with an exhaustive small case.
- The browser displayed a complete M4 class. Setting its weapon level to 14 removed Apex and restricted the primary attachment choices. Restoring level 72 enabled the same-weapon standard versus Apex comparison.
- Locking Ninja kept it in perk slot 2 after recalculation.
- A saved M4 build remained in browser storage after a page reload and after the desktop app restarted.
- A share link survived reload with the selected standard build and Ninja lock intact.
- The ownership manager accepted an explicit confirmation for an attachment with no published unlock level.
- The browser loaded actual weapon and attachment images. The tested class included ammunition, optic, laser, magazine, barrel, and stock renders. Image fallback components handle unavailable hosts.
- The base TTK step plot rendered sourced distance breakpoints and an accessible values table. It excludes attachment and Apex effects.
- A 390 px mobile viewport showed the single-column layout and loaded attachment images without horizontal document overflow. The viewport override was reset afterward.
- The optimizer runs in a Web Worker. Changing settings cancels an obsolete worker and prevents its result from replacing a newer search. Saving and sharing remain disabled during calculation.

## Data coverage

- 33 launch weapons and all 67 gear entries across the requested categories.
- 28 supported Apex options with reported unlock and blocked-slot information.
- 615 distinct standard attachment names represented by 1,589 weapon-specific entries.
- 175 provisional weapon-level unlock observations. The other 1,414 entries require manual ownership confirmation before use.
- 611 distinct attachment image addresses, covering 1,585 entries. These are remote source assets, not locally recreated artwork.
- 32 weapons have reported handling, movement, reload, and projectile observations. Knife measurements remain unknown.
- 26 weapons have sourced damage profiles. The baseline TTK calculator supports 15 documented automatic weapons and withholds unsupported firing mechanics.

## Remaining limits

No live-game private-match measurements were collected. Community values and compatibility remain source reports. Conflicting official player unlock levels use a conservative maximum and remain disclosed. Current costs for 16 streaks remain unresolved; suggestions involving them cannot establish an attainable streak band.

Full-class ranking uses explicit editorial role weights. It does not model exact attachment stacking, recoil-to-hit probability, Apex damage behavior, burst timing, pellets, or a measured player win rate. Base TTK is a separate comparison under perfect chest-hit assumptions. Unknown inputs are not filled with fabricated values.

Browser checks exercised the primary requested flows. They did not exhaustively test every imported attachment, every image address, all device sizes, JSON import/export round trips, or all keyboard interactions.
