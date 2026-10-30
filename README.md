# MW4 Armory

A Gunsmith optimizer for Modern Warfare 4 (2026) multiplayer. Pick a gun, a playstyle and your weapon level. It finds the best build without the Apex attachment and the best build with it, from community-measured attachment stats.

## Run locally

Use Node 26 or newer.

- `npm install`
- `npm run dev` starts the site at http://127.0.0.1:5173
- `npm test` runs the engine and data checks
- `npm run build` typechecks and writes the static site to `dist/`
- `npm run data` rebuilds `src/data/game.json` from the snapshots in `research/raw/`

## How it works

The engine in `src/engine/index.ts` checks every legal combination of up to five attachments, one per slot, leaving out the slots an Apex blocks. Before searching, it drops any attachment that is worse in every scored stat than another one in the same slot. A test compares the result against a full brute-force search.

Attachment changes multiply, the way CODMunity combines them. A build is scored in milliseconds of fight time saved against the stock gun:

- ADS time, sprint-to-fire and average time to kill count in real milliseconds. Time to kill is averaged over fights from half to one and a half times the typical distance, with damage range attachments stretching every damage band.
- Recoil counts as a share of one missed shot. On the All-around preset, 1% less recoil saves 3% of a shot interval, so 1.9 ms on the VEL 46 and 3 ms on the Kastov 762. Recoil above stock is penalized faster than it grows.
- Movement, flinch, hip fire, magazine, reload and velocity count as percents with small weights. Idle aim sway counts for almost nothing.

The four presets in `PRESETS` set those weights. Shotguns, marksman rifles, snipers and pistols only get handling and recoil scoring, because the data has no pellet spread or one-shot range.

## Data

`scripts/build-data.ts` merges four inputs into `src/data/game.json`:

- `research/raw/mw4-community-stats.json`: base stats and per-attachment multipliers for 28 guns, from CODMunity via COD Loadout, Oct 28.
- `research/raw/codmunity-unlock-levels.json`: which attachments fit each gun and their unlock levels, read from each CODMunity weapon page on Oct 30. The MAR-9 page has no table.
- `scripts/source/base-catalog.ts`: names, categories, Apex attachments and blocked slots from Activision's launch guide.
- `scripts/source/stat-overrides.ts`: damage profiles and fire rates from CODMunity's MW4 records.

Weapon renders and attachment icons in `public/assets/` come from COD Loadout. The artwork belongs to Activision. See `research/stats-sources.md` and `research/catalog-review.md` for the older source notes on the base catalog.

## Verification

See `VERIFICATION.md`.
