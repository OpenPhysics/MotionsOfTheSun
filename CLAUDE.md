# CLAUDE.md — Motions of the Sun

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

SceneryStack port of the NAAP **Motions of the Sun** lab ([astro.unl.edu/naap/motion3](https://astro.unl.edu/naap/motion3/motion3.html)). Three screens cover the Sun's daily path, the sidereal vs solar day, and the yearly zodiac circuit. Architecture and formulas: [doc/model.md](doc/model.md), [doc/implementation-notes.md](doc/implementation-notes.md). Feature parity vs Flash: [doc/parity-report.md](doc/parity-report.md).

- **Sun Paths** (`src/sun-paths/`) — horizon diagram with daily Sun path for latitude and date; draggable Sun; analemma overlay.
- **Sidereal and Solar Time** (`src/sidereal-solar-time/`) — Earth's orbit vs rotation; `TimeMaster` solar/sidereal clocks and jump panels.
- **Zodiac** (`src/zodiac/`) — default geocentric celestial sphere (`zodiac.swf` family); optional Lambert sky view from `zodiacSimulator`.

Shared code uses the `MotionsOfTheSun` prefix; per-screen code uses `SunPaths` / `SiderealSolarTime` / `Zodiac`. `RotatingSky/` donated horizon/sky-view code; `SolarSystemModels/` donated zodiac-strip constellation data.

## Key files

| Area | Location |
|---|---|
| Screens | `src/sun-paths/SunPathsScreen.ts`, `src/sidereal-solar-time/SiderealSolarTimeScreen.ts`, `src/zodiac/ZodiacScreen.ts` |
| Shared solar math | `src/common/SunEphemeris.ts` (closed-form RA/dec/EoT/GMST), `src/common/model/TimeMaster.ts` |
| Shared sky engine | `src/common/SkyCoordinates.ts`, `SkyProjection.ts`, `skyMorph.ts`, `view/skyGraphics.ts`, `HorizonDomeNode.ts`, `attachSkyCameraInteraction.ts` |
| Sun Paths views | `sun-paths/view/SunNode.ts`, `AnalemmaNode.ts`, `SunPathsSkyNode.ts`, `CalendarStripNode.ts`, `SunClockNode.ts` |
| Zodiac views | `zodiac/view/GeocentricZodiacNode.ts`, `ZodiacSkyNode.ts`, `ZodiacSunStrip.ts`, `zodiac/model/geocentricZodiacMath.ts` |
| Animation | `src/common/TimeModel.ts` (Sun Paths + Zodiac) |
| Colors / constants | `src/MotionsOfTheSunColors.ts`, `src/MotionsOfTheSunConstants.ts` |
| Strings | `src/i18n/StringManager.ts` |
| Preferences / query params | `src/preferences/motionsOfTheSunQueryParameters.ts` |
| Entry | `src/main.ts` |

## Model

Three **independent** screen models — no shared root state.

| Screen | Model | Notes |
|---|---|---|
| **Sun Paths** | `SunPathsModel` | Closed-form solar position via `SunEphemeris.getSunPosition(day)`; **0-based day-of-year** (Jan 1 00:00 UT = 0.0; default 146.5 = May 27 noon); horizon alt/az from `SkyCoordinates`; draggable Sun in time-of-day or day-of-year mode; GMST used as LST (Greenwich observer) |
| **Sidereal & Solar Time** | `SiderealSolarTimeModel` | `TimeMaster` port: solar vs sidereal time in solar days from vernal-equinox epoch; SIMPLE (365 d) vs JULIAN (365.25 d) year modes; animated cubic ease-in-out jumps; draggable Earth on orbit view |
| **Zodiac** | `ZodiacModel` | Default `viewMode = "earthCentered"` → `GeocentricZodiacNode` (Flash ZodiacViewer); optional `"sky"` → Lambert `ZodiacSkyNode`; adds `ZodiacSunStrip` (configurations-style starfield) though Flash lacked it; `VE_DOY_OFFSET = 78` for days-since-VE bookkeeping |

**Shared gotchas**

- **D1:** All solar math uses CCNMTL/Flash closed forms in `SunEphemeris.ts`; npm `solar-calculator` is **not** used. Day argument is **Flash 0-based**, not CCNMTL's 1-based Date DOY.
- **D2:** One obliquity **ε = 23.44°** (`COT_OBLIQUITY`) for all three screens (Flash `zodiacSimulator` used 23.5°).
- **D9:** `attachSkyCameraInteraction`'s `sky` param is narrowed to `{ advanceSiderealTime(hours): void }` — no Shift-click star placement.
- Lab SWF identity: `sunmotions.swf` = `sunMotions068`; `siderealSolarTime.swf` matches decompile target; `zodiac.swf` = ZodiacViewer family (**not** `zodiacSimulator`).

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
Each screen registers `*ScreenSummaryContent` and `*KeyboardHelpContent`, with explicit `pdomOrder`. A11y strings live under `a11y.sunPaths`, `a11y.siderealSolarTime`, and `a11y.zodiac` in each locale JSON, via `StringManager.getSunPathsA11yStrings()` / `getSiderealSolarTimeA11yStrings()` / `getZodiacA11yStrings()`. Keep `currentDetailsContent` live over model state; every interactive node needs an `accessibleName`.

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | Test environment + `setupFiles`; `execArgv: ["--expose-gc"]` with memory-leak suite |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/**/*.test.ts` | Model/physics unit tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

| File | Covers |
|---|---|
| `SunEphemeris.test.ts` | RA/dec, EoT, GMST, 0-based DOY |
| `SunPathsModel.test.ts` | Horizon geometry, drag modes, reset |
| `SiderealSolarTimeModel.test.ts` | TimeMaster jumps, year modes |
| `TimeMaster.test.ts` | Solar/sidereal ratios, `isAt*` predicates |
| `ZodiacModel.test.ts` | View modes, day advancement |
| `geocentricZodiacMath.test.ts`, `zodiacBandGraphics.test.ts`, `lambertProjection.test.ts` | Zodiac geometry |
| `analemmaClosestDay.test.ts` | Analemma overlay |
| `SkyCoordinates.test.ts`, `ViewDirection.test.ts`, `skyGraphics.test.ts` | Shared sky helpers |
| `TimeModel.test.ts` | Play/pause elapsed time |
| `memory-leak.test.ts` | Dispose regression |

- Put unit tests only under root `tests/` (never co-locate or use `__tests__/`).
- Run `npm test`. CI runs the suite when a `test` script is present.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

## Development notes

**Donor provenance (from `RotatingSky/`):** `SkyCoordinates.ts`, `SkyProjection.ts`, `skyMorph.ts`, `ViewDirection.ts`, `skyGraphics.ts`, `starGraphics.ts`, `skyViewLayout.ts`, `HorizonDomeNode.ts`, `HorizonGroundNode.ts`, `CelestialPoleAxisNode.ts`, `CelestialEquatorOnHorizonNode.ts`, `HourCircleOnHorizonNode.ts`, `attachSkyCameraInteraction.ts`, and control/hotkey option bundles — copied with `RotatingSky*` → `MotionsOfTheSun*` renames. **Not copied:** `Star.ts`, `SkyModel.ts`, `StarPatterns.ts`.

**From `SolarSystemModels/`:** `ZodiacConstellationsData.ts`, `ZodiacStripBackground.ts` (verbatim + namespace rename); Lambert constellation art uses SSM polylines; geocentric stick figures come from Flash `ZodiacFlashConstellationsData.ts`.

**New (no donor):** `SunEphemeris.ts`, `TimeMaster.ts`, Sun Paths / Sidereal / Zodiac screen-specific view nodes, `EarthShoreData.ts`, `WorldMapNode.ts`, `GeocentricZodiacNode.ts`, `lambertProjection.ts`.

- **`npm run decompile`** default targets: `sunMotions068-C`, `siderealSolarTime`, `zodiac017` (same family as lab `zodiac.swf` / `zodiac016`).
- After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
