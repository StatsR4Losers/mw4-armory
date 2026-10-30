# MW4 Armory

A class optimizer for Modern Warfare 4 (2026) multiplayer. Pick a gun, a playstyle and your weapon level. It finds the best build without the Apex attachment and the best build with it, from community-measured attachment stats, then fills in perks, equipment and killstreaks.

The Build screen shows one build at a time, with switches for the Apex attachment and an optic. Every build is shown against a baseline you pick: by default the build you had before your last change, or the stock gun, the other Apex choice, any site's build, or a saved class. Changed parts and stats get an arrow; unchanged ones do not.

"What the sites say" shows each of CODMunity's, Game8's and WZStats' top build for the gun, with import codes, scored with the same math, and every other site build on request. The Compare tab puts up to three builds side by side with every part editable and a baseline you choose.

## Run locally

Use Node 26 or newer.

- `npm install`
- `npm run dev` starts the site at http://127.0.0.1:5173
- `npm test` runs the engine and data checks
- `npm run build` typechecks and writes the static site to `dist/`
- `npm run data` rebuilds `src/data/game.json` from the snapshots in `research/raw/`
- `npm run fetch` downloads fresh snapshots, rebuilds the data, prints what changed and runs the tests

## How it works

The engine in `src/engine/index.ts` checks every legal combination of up to five attachments, one per slot, leaving out the slots an Apex blocks. Before searching, it drops any attachment that is worse in every scored stat than another one in the same slot. A test compares the result against a full brute-force search.

Attachment changes multiply, the way CODMunity combines them. A build is scored in milliseconds of fight time saved against the stock gun:

- ADS time, sprint-to-fire and average time to kill count in real milliseconds. Time to kill is averaged over fights from half to one and a half times the typical distance, with damage range attachments stretching every damage band.
- Recoil counts as a share of one missed shot. On the All-around preset, 1% less recoil saves 3% of a shot interval, so 1.9 ms on the VEL 46 and 3 ms on the Kastov 762. Recoil above stock is penalized faster than it grows.
- Movement, flinch, hip fire, magazine, reload and velocity count as percents with small weights. Idle aim sway counts for almost nothing.

The four presets in `PRESETS` set those weights.

Perks, equipment and killstreaks come from `src/engine/gear.ts`. Each item scores on how often Game8 and WZStats pick it for this gun (45%), for its weapon class (25%), the two perk tier lists (15%, perks only) and a short playstyle rule with a stated reason (15%). Overkill is never picked automatically, since the site does not choose a second primary. Killstreaks are three picks at or under the kills-per-life band, valued by streak style, because no site ranks them yet. Hardline lowers each cost by one. Any slot can be locked.

Each class also gets a stability check. The engine keeps the top 1,000 builds and rescores them 200 times, each time scaling every weight by up to 1.6x either way and moving the fight distance by up to 30%. It reports how often the best build stays within 5 ms of that setting's winner, how often each of its parts appears in the winners, and which other parts win often. A test checks that rescoring the pool finds the same winner as a full search under nudged settings. Shotguns, marksman rifles, snipers and pistols only get handling and recoil scoring, because the data has no pellet spread or one-shot range.

## Data

`scripts/build-data.ts` merges four inputs into `src/data/game.json`:

- `research/raw/mw4-community-stats.json`: base stats and per-attachment multipliers for 28 guns, from CODMunity via COD Loadout, Oct 28.
- `research/raw/codmunity-unlock-levels.json`: which attachments fit each gun and their unlock levels, read from each CODMunity weapon page on Oct 30. The MAR-9 page has no table.
- `scripts/source/base-catalog.ts`: names, categories, Apex attachments and blocked slots from Activision's launch guide.
- `scripts/source/stat-overrides.ts`: damage profiles and fire rates from CODMunity's MW4 records.

Guide builds come from `research/raw/meta-codmunity.json`, `meta-game8.json` and `meta-wzstats.json`, read in a browser on Oct 30 because CODMunity and WZStats render their builds in the page. Part names are matched to this site's attachment IDs. A name within two edits of exactly one part of that gun, with the same numbers in it, counts as a typo and matches. Anything else stays visible as unmatched and is left out of the score. `npm run data -- --verbose` lists every near match and unmatched name. `npm run fetch` does not refresh guide builds.

## Refreshing after a patch

`npm run fetch` pulls the two COD Loadout files, then reads the attachment table on each CODMunity weapon page, one page every 5 seconds, which takes about 3 minutes. Requests identify themselves as this tool. If a page fails after retries, that gun keeps its previous rows and the script lists it under `stale` in the snapshot. It then rebuilds the data, prints each gun whose parts, unlock levels, stat changes or Apex changed, and runs the tests. `npm run fetch -- --skip-levels` refreshes only the COD Loadout files.

New attachments need icons in `public/assets/attachments/`, named by attachment ID. Without one, the site shows a placeholder.

Weapon renders and attachment icons in `public/assets/` come from COD Loadout. The artwork belongs to Activision. See `research/stats-sources.md` and `research/catalog-review.md` for the older source notes on the base catalog.

## Verification

See `VERIFICATION.md`.
