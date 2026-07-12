# CLAUDE.md — Motions of the Sun

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

A three-screen SceneryStack simulation porting the NAAP **Motions of the Sun** lab
(astroUNL `naap/motion3`), scaffolded from `TemplateSingleSim`. **All three screens are
implemented** (models, physics, views, a11y, tests). Architecture and formulas live in
`doc/model.md` and `doc/implementation-notes.md`; feature parity vs Flash is in
`doc/parity-report.md`. Historical step plan: `doc/porting-plan.md` (phases 0–8 complete;
treat provenance notes there as superseded by the docs above when they conflict).

- **Sun Paths** (`src/sun-paths/`) — port of the NAAP *Motions of the Sun* simulator
  (`sunmotions.swf` = `sunMotions068.swf`): horizon diagram with the Sun's daily path for a
  chosen latitude and date, with time animation.
- **Sidereal and Solar Time** (`src/sidereal-solar-time/`) — port of the NAAP *Sidereal Time
  and Solar Time* demo (`siderealSolarTime.swf`): Earth's rotation vs. orbit, sidereal vs.
  solar day.
- **Zodiac** (`src/zodiac/`) — port of the NAAP *Seasons and the Zodiac* explorer
  (`zodiac.swf`, geocentric `ZodiacViewer` / `zodiac016` family): Earth at the center of a
  celestial sphere, Sun on the ecliptic rim, zodiac stick figures, day/night band gradient,
  Earth's rotational axis. Optional secondary mode: Lambert sky view from `zodiacSimulator`.

Shared code keeps the `MotionsOfTheSun` prefix; per-screen code uses the
`SunPaths` / `SiderealSolarTime` / `Zodiac` prefixes. Concept-named folders, no `-screen`
suffix. `RotatingSky/` (the motion2 lab port) is the closest sibling sim — its horizon
diagram / `SkyProjection` view code is directly relevant to the Sun Paths screen and the
geocentric Zodiac sphere. `SolarSystemModels/` has zodiac-strip components relevant to the
Zodiac strip UI.

## Key files

| File | Purpose |
|---|---|
| `src/MotionsOfTheSunColors.ts` | All `ProfileColorProperty` instances (default + projector profiles) |
| `src/MotionsOfTheSunConstants.ts` | Named numeric constants (layout px, physics SI units) |
| `src/MotionsOfTheSunNamespace.ts` | Namespace used by `.register()` |
| `src/common/MotionsOfTheSunPanel.ts` | Pre-themed `Panel` wrapper |
| `src/common/MotionsOfTheSunButtonOptions.ts` | Flat button-appearance option bundles + light-control-surface combo-box options |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `src/common/SunEphemeris.ts` | Closed-form solar RA/dec/EoT/GMST (CCNMTL / Flash) |
| `src/common/model/TimeMaster.ts` | Solar ↔ sidereal time + eased jumps (siderealSolarTime) |
| `src/i18n/StringManager.ts` | Singleton localized string accessor; per-screen name + a11y getters |
| `src/main.ts` | Entry point; registers the three screens |
| `src/sun-paths/SunPathsScreen.ts` | `Screen<SunPathsModel, SunPathsScreenView>` wrapper |
| `src/sidereal-solar-time/SiderealSolarTimeScreen.ts` | `Screen<SiderealSolarTimeModel, SiderealSolarTimeScreenView>` wrapper |
| `src/zodiac/ZodiacScreen.ts` | `Screen<ZodiacModel, ZodiacScreenView>` wrapper |
| `src/zodiac/view/GeocentricZodiacNode.ts` | Lab geocentric Zodiac Explorer (`zodiac.swf`) |
| `src/preferences/motionsOfTheSunQueryParameters.ts` | `QueryStringMachine` parameters |
| `scripts/decompile-flash.ts` | Extract ActionScript from the NAAP Flash `.swf` sources via JPEXS FFDec (→ `NAAP/decompiled/`) |

## Screens

Three screens registered in `src/main.ts`, in this order:

1. **Sun Paths** (`src/sun-paths/`)
2. **Sidereal and Solar Time** (`src/sidereal-solar-time/`)
3. **Zodiac** (`src/zodiac/`) — default view = geocentric sphere; optional Lambert sky

Shared physics lives in `src/common/`; per-screen state in each `*Model.ts`. Per-screen a11y
lives under `a11y.<screenKey>` in each locale JSON, exposed via
`StringManager.getSunPathsA11yStrings()` / `getSiderealSolarTimeA11yStrings()` /
`getZodiacA11yStrings()`. Each `currentDetailsContent` is a live `DerivedProperty` over
model state; interactive nodes have `accessibleName`s.

## Decompiling the Flash sources

`npm run decompile` (script: `scripts/decompile-flash.ts`) extracts readable
ActionScript from the NAAP Flash movies so the port can be diffed against the
originals. The `.fla` files are old binary projects no tool reads directly, so the
script decompiles their sibling compiled `.swf` via **JPEXS FFDec** (needs Java).

```sh
npm run decompile                 # the three lab simulators → NAAP/decompiled/<name>/scripts/*.as
npm run decompile -- --all        # + supporting sun-path / sidereal-time demos
npm run decompile -- --list       # dry run: print what would be decompiled
npm run decompile -- --setup      # one-time: download FFDec into tools/ffdec/
```

Default targets: `sunMotions068-C` (dev sibling of lab `sunmotions.swf` = `sunMotions068`),
`siderealSolarTime` (matches lab SWF), `zodiac017` (same family as lab `zodiac.swf` /
`zodiac016`; 017 drops the rotational axis that 016 keeps). Output goes to
`NAAP/decompiled/` (git-ignored, along with `tools/ffdec/`). The decompiled AS is a
**read-only reference** — transcribe the maths into typed TS in `src/`; don't vendor it.

**Lab SWF identity (verify with md5 when unsure):**
- `astroUNL/naap/motion3/animations/sunmotions.swf` = `flashdev2/sunMotions/sunMotions068.swf`
- `…/siderealSolarTime.swf` = `flashdev2/siderealSolarTime/siderealSolarTime.swf`
- `…/zodiac.swf` = ZodiacViewer family (`zodiac016`/`017`); **not** `zodiacSimulator`

## npm scripts

`start`/`dev` (vite) · `build` · `build:single` · `check` (tsc) · `lint`/`format` (biome) ·
`test` (vitest) · `icons` · `decompile` · `rename`. Gate: `npm run check && npm run lint && npm run build && npm test`.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
