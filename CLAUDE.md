# CLAUDE.md — Motions of the Sun

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

A three-screen SceneryStack simulation porting the NAAP **Motions of the Sun** lab
(astroUNL `naap/motion3`), scaffolded from `TemplateSingleSim`. **Currently a framework
scaffold** — placeholder label + Reset All per screen; no models/physics yet.

- **Sun Paths** (`src/sun-paths/`) — port of the NAAP *Motions of the Sun* simulator
  (`sunmotions.swf`): a horizon diagram with the Sun's daily path for a chosen latitude and
  date, with time animation.
- **Sidereal and Solar Time** (`src/sidereal-solar-time/`) — port of the NAAP *Sidereal Time
  and Solar Time* demo (`siderealSolarTime.swf`): Earth's rotation vs. orbit, sidereal vs.
  solar day.
- **Zodiac** (`src/zodiac/`) — port of the NAAP zodiac demo (`zodiac.swf`): the Sun's annual
  motion along the ecliptic through the zodiac constellations.

Shared code keeps the `MotionsOfTheSun` prefix; per-screen code uses the
`SunPaths` / `SiderealSolarTime` / `Zodiac` prefixes. Concept-named folders, no `-screen`
suffix. `RotatingSky/` (the motion2 lab port) is the closest sibling sim — its horizon
diagram / `SkyProjection` view code is directly relevant to the Sun Paths screen, and
`SolarSystemModels/` has zodiac-strip components (`ZodiacConstellationNode`,
`ZodiacStripBackground`) relevant to the Zodiac screen.

## Key files

| File | Purpose |
|---|---|
| `src/MotionsOfTheSunColors.ts` | All `ProfileColorProperty` instances (default + projector profiles) |
| `src/MotionsOfTheSunConstants.ts` | Named numeric constants (layout px, physics SI units) |
| `src/MotionsOfTheSunNamespace.ts` | Namespace used by `.register()` |
| `src/common/MotionsOfTheSunPanel.ts` | Pre-themed `Panel` wrapper |
| `src/common/MotionsOfTheSunButtonOptions.ts` | Flat button-appearance option bundles + light-control-surface combo-box options |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `src/i18n/StringManager.ts` | Singleton localized string accessor; per-screen name + a11y getters |
| `src/main.ts` | Entry point; registers the three screens |
| `src/sun-paths/SunPathsScreen.ts` | `Screen<SunPathsModel, SunPathsScreenView>` wrapper |
| `src/sidereal-solar-time/SiderealSolarTimeScreen.ts` | `Screen<SiderealSolarTimeModel, SiderealSolarTimeScreenView>` wrapper |
| `src/zodiac/ZodiacScreen.ts` | `Screen<ZodiacModel, ZodiacScreenView>` wrapper |
| `src/preferences/motionsOfTheSunQueryParameters.ts` | `QueryStringMachine` parameters |
| `scripts/decompile-flash.ts` | Extract ActionScript from the NAAP Flash `.swf` sources via JPEXS FFDec (→ `NAAP/decompiled/`) |

## Screens

Three screens registered in `src/main.ts`, in this order:

1. **Sun Paths** (`src/sun-paths/`)
2. **Sidereal and Solar Time** (`src/sidereal-solar-time/`)
3. **Zodiac** (`src/zodiac/`)

When implementing: put shared physics in `src/common/`, per-screen state in each
`*Model.ts`. Per-screen a11y lives under `a11y.<screenKey>` in each locale JSON,
exposed via `StringManager.getSunPathsA11yStrings()` / `getSiderealSolarTimeA11yStrings()` /
`getZodiacA11yStrings()`. Make each `currentDetailsContent` a live `DerivedProperty`
over model state and add `accessibleName`s to every interactive node.

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

Default targets (one per screen): `sunMotions068-C` (sunmotions; lab shipped 068),
`siderealSolarTime`, `zodiac017` (zodiac). Output goes to `NAAP/decompiled/`
(git-ignored, along with `tools/ffdec/`). The decompiled AS is a **read-only
reference** — transcribe the maths into typed TS in `src/`; don't vendor it.

## npm scripts

`start`/`dev` (vite) · `build` · `build:single` · `check` (tsc) · `lint`/`fix` (biome) ·
`test` (vitest) · `icons` · `decompile` · `rename`. Gate: `npm run check && npm run lint && npm run build && npm test`.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
