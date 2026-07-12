# Port NAAP "Motions of the Sun" to SceneryStack — Phased Implementation Plan

> **Status (2026):** Phases 0–8 are **complete**. This file is a historical execution log for
> lesser-LLM step runners. For current architecture, formulas, and Flash parity, prefer
> [`implementation-notes.md`](./implementation-notes.md), [`model.md`](./model.md), and
> [`parity-report.md`](./parity-report.md).
>
> **Provenance correction:** the lab Zodiac embed (`zodiac.swf`) is the **geocentric**
> ZodiacViewer family (`zodiac016` / `zodiac017`), **not** `zodiacSimulator`. The shipped
> default is `GeocentricZodiacNode`; Lambert sky from `zodiacSimulator` is an optional mode.
> Early plan text below that maps `zodiac.swf` → `zodiacSimulator` or describes Phase 8 as a
> simplified top-down diagram is **superseded**.

## Context

This plan was written when the repo was a three-screen SceneryStack scaffold (placeholder
label + Reset All per screen) that needed to become a full port of the NAAP *Motions of the
Sun* lab (`astroUNL/naap/motion3`). Steps below remain useful as an audit trail; each named
input/output files, formulas, and gates.

Key facts established by exploration:

- **Sun Paths** (`sunmotions.swf`): no ActionScript source exists (timeline-scripted `.fla` only; the lab ships `sunMotions068`). But CCNMTL's finished JS rewrite exists at `NAAP/astro-simulations/sun-motion-simulator/` — its `src/utils.js` contains all the solar math, and `/home/veillette/OpenPhysics/RotatingSky/session-ses_0f39.md` is an 872-line architecture analysis of it.
- **Sidereal & Solar Time**: clean AS3 sources exist at `NAAP/flash-animations/flashdev2/siderealSolarTime/*.as` (`TimeMaster.as`, `OrbitView.as`, `AnalogClock.as`, `AnalogClockHand.as`, `DayOfYearSlider.as`, `Main.as`). Direct transcription.
- **Zodiac:** lab `zodiac.swf` = ZodiacViewer / `zodiac016` family (geocentric sphere; `017`
  drops the rotational axis). Richer optional Lambert sky: `zodiacSimulator` AS3
  (`Main.as`, `ZodiacSkyView.as`, `constellationsData.as`). **Shipped:** geocentric default +
  optional Lambert (see status banner above — early plan order was reversed).
- **Donor repos** (same `scenerystack ^3.0.0`, copy freely): `/home/veillette/OpenPhysics/RotatingSky` (RS) — completed motion2 port with the whole sky-projection/rendering stack; `/home/veillette/OpenPhysics/SolarSystemModels` (SSM) — zodiac strip + constellation vector data.

### User decisions (historical — see status banner for Zodiac correction)

1. **~~Zodiac screen ports `zodiacSimulator` first; `zodiac017` later (Phase 8).~~**
   **Superseded:** lab primary is geocentric ZodiacViewer; Lambert is optional.
2. **Controls** are idiomatic SceneryStack (NumberControl / HSlider / TimeControlNode / buttons) in the main phases, keeping the direct manipulations (draggable Sun on the sky, draggable Earth in the orbit view). Replica widgets (draggable analog-clock hands, calendar strip, Earth-map latitude picker) are separate polish phases at the end (Phase 7).

### Resolved design decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | All Sun Paths solar math uses the closed-form set from CCNMTL `utils.js` (`getPosition`, `getEqnOfTime`, `getSiderealTime`); the npm `solar-calculator` dep is **not** ported | Self-consistent, dependency-free; deviation documented in `doc/model.md` |
| D2 | One obliquity, 23.44° (`cot = 2.30644456403329`), for all three screens; zodiacSimulator's 23.5° is normalized to it | One source of truth; 0.06° is invisible at screen scale |
| D3 | Zodiac constellation art = polylines from SSM `ZodiacConstellationsData.ts` (copied verbatim), **not** the AS3 opcode vector art, not the SVGs | Already-TypeScript, already-shipped dataset; opcode/SVG transcription is high-risk for no pedagogical gain |
| D4 | `TimeMaster`'s animated jumps re-implemented as cubic ease-in-out inside `step(dt)` (no Flash Timer, no twixt in the model) | Deterministic, unit-testable by stepping fixed dt |
| D5 | Sun Paths uses a horizon-frame `SkyProjection` (identity frame matrix), converting celestial overlays per-point via `equatorialToHorizonVector` — the RS *Horizon System* pattern. RS `CelestialSphereNode`, `FirstPersonSkyViewNode`, `SkyModel`, `SkyTrailsNode`, `Star.ts` are **not** copied | Matches the CCNMTL scene with fewer moving parts; no sphere-morph machinery needed |
| D6 | Draggable Sun = new `SunNode` adapting `SkyStarsNode`'s drag/keyboard logic; dragging moves the Sun **along its declination circle, setting time of day** (the daily path is that small circle, drawn analytically) | Flash and CCNMTL both treat sun-drag as a time control |
| D7 | Screen 2 UI exposes SIMPLE mode only; `TimeMaster` implements JULIAN too (fully tested) but no mode toggle until the replica phase | The Flash UI didn't surface the toggle prominently either; keeps screen 2 small |
| D8 | Zodiac screen adds a `ZodiacStripBackground`-based strip with a sun marker (`lonToX` from SSM `PtolemaicZodiacStrip`) even though Flash lacked it | Cheap donor reuse; reinforces "sun moves through the signs" |
| D9 | `attachSkyCameraInteraction`'s `sky: SkyModel` param is narrowed on copy to `{ advanceSiderealTime(hours: number): void }` | Any screen model can satisfy it without RS's SkyModel |

### Execution rules (apply to every step)

- **Read-only sources:** never modify anything under `NAAP/`, `/home/veillette/OpenPhysics/RotatingSky`, or `/home/veillette/OpenPhysics/SolarSystemModels`.
- **Copy procedure:** read the donor file fully, then apply global renames: `RotatingSky*` → `MotionsOfTheSun*`, `rotating-sky` → `motions-of-the-sun`, `ROTATING_SKY_` → `MOTIONS_OF_THE_SUN_`, `SolarSystemModels*` → `MotionsOfTheSun*`. Relative import shapes are the same in all three repos (`src/common/…`, `src/i18n/…`).
- **Strings:** `src/i18n/strings_en.json`, `_es.json`, `_fr.json` are always edited together in the same step with identical key trees (compile-time `satisfies` checks enforce this). Provide real es/fr translations — donor repos already contain translations for most reused strings.
- **Colors** only as `ProfileColorProperty` (default + projector) in `src/MotionsOfTheSunColors.ts`; **named numbers** only in `src/MotionsOfTheSunConstants.ts`; register on `MotionsOfTheSunNamespace`.
- **Conventions:** models `implements TModel` with axon Properties + `step(dt)` + `reset()`; views extend `ScreenView`, panels via `MotionsOfTheSunPanel`, flat buttons via `FLAT_*` bundles in `src/common/MotionsOfTheSunButtonOptions.ts`; ResetAllButton bottom-right at `SCREEN_VIEW_MARGIN`; interactive nodes get `accessibleName` from StringManager, and each ScreenView sets `pdomPlayAreaNode.pdomOrder` / `pdomControlAreaNode.pdomOrder`.
- **Standard gate** (every step): `npm run check && npm run lint && npm test`. **Full gate** (phase-final steps): add `npm run build` and the listed `npm start` visual checks.
- Commit after each passing gate.

---

# PHASE 0 — Infrastructure and donor code

## Step 0.0 (optional, needs Java + network) — Decompile Flash references
Run `npm run decompile -- --setup` once, then `npm run decompile` (defaults cover `sunMotions068-C`, `siderealSolarTime`, `zodiac017` → `NAAP/decompiled/`). Purely reference material for later steps; skip if Java is unavailable — nothing depends on it except Phase 8.

## Step 0.1 — Colors and constants

**Goal:** add every color/constant later phases need, so donor copies compile with renames only.

**Read:** RS `src/RotatingSkyColors.ts`, RS `src/RotatingSkyConstants.ts`, SSM `src/SolarSystemModelsColors.ts` (zodiac colors), target `src/MotionsOfTheSunColors.ts` + `src/MotionsOfTheSunConstants.ts`.

**Modify:** `src/MotionsOfTheSunColors.ts`, `src/MotionsOfTheSunConstants.ts`.

Colors to add (keep the existing 8; copy default/projector values from RS for the first group):
- From RS (same names): `sphereOutline`, `grid`, `celestialEquator`, `ecliptic`, `horizon`, `ground`, `skyViewBackground`, `cardinalLabel`, `star`, `trail`, `observer`, `observerFigure` color properties.
- New for Sun Paths: `sun` (`#ffd54f` / `#f9a825`), `sunPath` (reuse trail hue), `analemma` (`#ff8a65` / `#bf360c`), `monthLabel`, `shadow` (`rgba(0,0,0,0.45)` / `rgba(0,0,0,0.35)`).
- New for Sidereal: `orbitPath`, `earthFill` (`#4a7abf` / `#2c5aa0`), `earthMeridian`, `activeButtonHighlight` (`#ffe082` / `#ffd54f`).
- Zodiac from SSM (copy values): `zodiacBand`, `zodiacBorder`, `zodiacDivider`, `zodiacLabel`. Zodiac scene gradients (same hex in both profiles — scene colors, not chrome): `zodiacSkyNightTop #000000`, `zodiacSkyNightBottom #303547`, `zodiacSkyDayTop #7dacf0`, `zodiacSkyDayBottom #afbcd8`, `zodiacHorizonNightTop #161f14`, `zodiacHorizonNightBottom #354730`, `zodiacHorizonDayTop #5a7a52`, `zodiacHorizonDayBottom #779768`, plus `zodiacEcliptic #fff0a0`, `zodiacCelestialEquator #8080ff`, `zodiacGrid #ffffff`, `constellationLine`, `constellationLabel`.

Constants to add:
- Layout (px, from RS): `RESET_ALL_BUTTON_BOTTOM_MARGIN = 10`, `PANEL_X_MARGIN = 8`, `PANEL_Y_MARGIN = 7`, `CONTROL_FONT_SIZE = 12`, `PANEL_TITLE_FONT_SIZE = 12`, `CHECKBOX_BOX_WIDTH = 16`, `PANEL_CONTENT_SPACING = 8`, `STANDALONE_SLIDER_TRACK_SIZE = new Dimension2(75, 4)`, `NUMBER_CONTROL_SLIDER_TRACK_SIZE = new Dimension2(140, 3)`, `SLIDER_THUMB_SIZE = new Dimension2(13, 26)`, `SPHERE_RADIUS = 170`, `SKY_VIEW_MAX_SIZE = 2 * SPHERE_RADIUS`, `VIEW_READOUT_GAP = 10`.
- Astronomy: `OBLIQUITY_DEG = 23.44`, `COT_OBLIQUITY = 2.30644456403329`, `SIDEREAL_RATE = 1.0027397260274`, `SIDEREAL_EPOCH_OFFSET = 0.280464857844662`, `EOT_FUNDAMENTAL_RAD_PER_DAY = 0.017214206`.
- TimeMaster: `SOLAR_TIME_AT_EPOCH = 0.5`, `SIMPLE_TROPICAL_YEAR = 365`, `JULIAN_TROPICAL_YEAR = 365.25`, `TIME_EQUALITY_TOLERANCE = 1e-6`, `JUMP_ANIMATION_SHORT_S = 1.0`, `JUMP_ANIMATION_LONG_S = 2.0`, `SOLAR_DAYS_PER_SECOND = 0.25`.
- Sun Paths: `LATITUDE_RANGE = new Range(-90, 90)`, `DEFAULT_LATITUDE = 40.8`, `DEFAULT_DAY_OF_YEAR = 147.5` (May 27 noon; Jan 1 = day 1), `DAY_OF_YEAR_RANGE = new Range(0, 365.25)`, `ANIMATION_HOURS_PER_SECOND = 3`.
- Zodiac: `ZODIAC_LATITUDE_DEG = 41`, `ZODIAC_CENTER_AZIMUTH_RAD = Math.PI`, `ZODIAC_CENTER_ALTITUDE_RAD = -0.1`, `ZODIAC_TWILIGHT_RANGE_DEG = 7`, `ZODIAC_STRIP_WIDTH = 600`, `ZODIAC_STRIP_HEIGHT = 40`, `MONTH_START_DOY = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]`, `VE_DOY_OFFSET = 78`.
- Screen 2 layout: `ORBIT_RADIUS = 150`, `EARTH_GLOBE_RADIUS = 22`.

**Gate:** standard.

## Step 0.2 — Shared strings scaffolding

**Read:** RS `src/i18n/strings_en.json`/`_es`/`_fr` (top-level `controls` and `keyboardHelp` groups), SSM `src/i18n/strings_en.json`/`_es`/`_fr` (`zodiac` group — 12 sign names), target `src/i18n/StringManager.ts`.

**Modify:** the three target locale JSONs + `src/i18n/StringManager.ts`.

- Add top-level `"zodiac"` group with 12 sign keys (`aries`…`pisces`) — copy en/es/fr values from SSM verbatim.
- Add top-level `"controls"` group: `latitude`, `dayOfYear`, `timeOfDay`, and `months` sub-group with 12 month names (translate es/fr).
- Add top-level `"keyboardHelp"` group — copy from RS the applicable subset (sky rotate arrows, rotate about zenith, advance time, slider keys); drop star-specific entries.
- Add getters to `StringManager`: `getZodiacStrings()`, `getControls()`, `getKeyboardHelpStrings()` (same pattern as existing getters).
- Strengthen the parity check: existing `satisfies` covers en↔fr only — add `void (stringsEn satisfies typeof stringsEs);` and `void (stringsEs satisfies typeof stringsEn);`.

**Gate:** standard.

## Step 0.3 — Copy the spherical-astronomy library + tests

**Copy** (verbatim; deps only `scenerystack/dot`):
- RS `src/common/SkyCoordinates.ts` → `src/common/SkyCoordinates.ts`
- RS `tests/SkyCoordinates.test.ts` → `tests/SkyCoordinates.test.ts` (19 cases; `tests/setup.ts` is byte-identical between repos — no bootstrap change)

**Gate:** standard; the 19 SkyCoordinates cases must pass.

## Step 0.4 — Copy projector + drawing helpers + tests

**Copy with global renames** (constants added in 0.1 use the same names):
- RS `src/common/SkyProjection.ts` → `src/common/SkyProjection.ts`
- RS `src/common/view/skyGraphics.ts` → `src/common/view/skyGraphics.ts`
- RS `src/common/view/starGraphics.ts` → `src/common/view/starGraphics.ts`
- RS `src/common/view/skyViewLayout.ts` → `src/common/view/skyViewLayout.ts`
- RS `src/common/skyMorph.ts` → `src/common/skyMorph.ts`
- RS `src/common/model/ViewDirection.ts` → `src/common/model/ViewDirection.ts`
- RS `tests/skyGraphics.test.ts` → `tests/skyGraphics.test.ts`; RS `tests/ViewDirection.test.ts` → `tests/ViewDirection.test.ts`

Do **not** copy `Star.ts`, `SkyModel.ts`, `StarPatterns.ts` (D5/D6).

**Gate:** standard.

## Step 0.5 — Copy control-option and hotkey bundles

**Copy:**
- RS `src/common/RotatingSkyControlOptions.ts` → `src/common/MotionsOfTheSunControlOptions.ts` (exports renamed `MOTIONS_OF_THE_SUN_SLIDER_OPTIONS`, `MOTIONS_OF_THE_SUN_NUMBER_CONTROL_OPTIONS`, `MOTIONS_OF_THE_SUN_CHECKBOX_OPTIONS`)
- RS `src/common/RotatingSkyHotkeyData.ts` → `src/common/MotionsOfTheSunHotkeyData.ts` (`repoName: "motions-of-the-sun"`; delete star-specific entries `ADD_STAR_AT_CENTER_KEYS`, `MOVE_STAR_KEYS`, `MOVE_GUIDE_STAR`; keep arrows/zenith/advance-time)

Where the RS file duplicates the target's existing `MotionsOfTheSunButtonOptions.ts` / `MotionsOfTheSunPanel.ts`, reuse the target's versions.

**Gate:** standard.

## Step 0.6 — Copy the horizon-frame view nodes

**Copy with renames:**
- RS `src/common/view/HorizonDomeNode.ts` → `src/common/view/HorizonDomeNode.ts`
- RS `src/common/view/HorizonGroundNode.ts` → `src/common/view/HorizonGroundNode.ts` (ground disk with flat N/E/S/W cardinal labels)
- RS `src/common/view/CelestialEquatorOnHorizonNode.ts` → same path
- RS `src/common/view/HourCircleOnHorizonNode.ts` → same path
- RS `src/common/view/attachSkyCameraInteraction.ts` → same path

**Adaptations:** in `attachSkyCameraInteraction.ts`, replace `sky: SkyModel` with `sky: { advanceSiderealTime(hours: number): void }` (D9) and delete the `onAddStarAt` option + Shift-click branch. If the `*OnHorizonNode` files reference `SkyModel` types, replace with explicit `TReadOnlyProperty<number>` latitude/sidereal-time parameters (read them first — siblings take `(projection, latitudeProperty, options)`).

**Gate:** full gate (`npm run build` proves the donor graph resolves). Nothing on screen yet.

---

# PHASE 1 — Shared astronomy engine

## Step 1.1 — `SunEphemeris` (closed-form solar position) + tests

**Read:** `NAAP/astro-simulations/sun-motion-simulator/src/utils.js` (250 lines, fully; `src/utils.test.js` too if present).

**Create:** `src/common/SunEphemeris.ts`, `tests/SunEphemeris.test.ts`.

Functions to transcribe (`day` = decimal day-of-year, Jan 1 00:00 UT = 1.0; let `a = 0.017214206` rad/day):
- `getSunPosition(day): { raHours, decDeg }` —
  `ra_rad = 0.01721421·day − 1.3793756 − 0.001830724·cos(a·day) + 0.032070267·sin(a·day) + 0.015952904·cos(2a·day) + 0.04026479·sin(2a·day) + 0.00044373354·cos(3a·day) + 0.0013114725·sin(3a·day) + 0.00064591583·cos(4a·day) + 0.00070547099·sin(4a·day)`;
  `raHours = (((12/π)·ra_rad) % 24 + 24) % 24`; `decDeg = (180/π)·atan2(sin(ra_rad), COT_OBLIQUITY)`.
- `getEqnOfTimeRad(day)` — `−4.3796019e−6 + 0.001830724·cos(a·day) − 0.032070267·sin(a·day) − 0.015952904·cos(2a·day) − 0.04026479·sin(2a·day) − 0.00044373354·cos(3a·day) − 0.0013114725·sin(3a·day) − 0.00064591583·cos(4a·day) − 0.00070547099·sin(4a·day)`; also `eqnOfTimeHours = rad·12/π`, `eqnOfTimeMinutes = 60·hours`.
- `getSiderealTimeHours(day) = 24 · frac(0.280464857844662 + 1.0027397260274·day)` where `frac(x) = ((x % 1) + 1) % 1`.
- `getHourAngleHours(siderealHours, raHours)` — `(sid − ra) % 24` wrapped into `[−12, 12]`.
- `getSolarAltitudeRad(latRad, decRad, haRad) = asin(sin lat·sin dec + cos lat·cos dec·cos H)`; `getSolarAzimuthRad(zenithRad, haRad, decRad, latRad)`: `cos φ = (sin dec·cos lat − cos H·cos dec·sin lat)/sin zenith` clamped to [−1,1]; return `acos(cos φ)` if `H < 0 || H > π`, else `2π − acos(cos φ)`. (These duplicate `SkyCoordinates.equatorialToHorizontal` for cross-checking; views use SkyCoordinates.)

Tests:
1. Equinox: `getSunPosition(79.9)` → `|decDeg| < 1`, `raHours` within 0.5 h of 0/24.
2. Solstices: day 172 → `dec ≈ +23.44 ± 0.5`, `ra ≈ 6 ± 0.4`; day 355.5 → `dec ≈ −23.44 ± 0.5`, `ra ≈ 18 ± 0.4`.
3. EoT: `|eqnOfTimeMinutes(307)| ∈ [14, 18]` (early Nov) and `|eqnOfTimeMinutes(42)| ∈ [12, 16]` (mid Feb), opposite signs; `|eqnOfTimeMinutes(106)| < 2` (mid-April zero).
4. Sidereal drift: `getSiderealTimeHours(d+1) − getSiderealTimeHours(d)` (mod 24) ≈ 0.0658 h (≈ 3.94 min) for several d.
5. Identity: altitude at H = 0 equals `90° − |lat − dec|` (lat 40.8, day 147.5 → ≈ 70.5° ± 0.5).
6. Cross-check vs `SkyCoordinates.equatorialToHorizontal` to 1e-6 for 5 (lat, dec, H) triples.

**Gate:** standard.

## Step 1.2 — `TimeMaster` port + tests

**Read:** `NAAP/flash-animations/flashdev2/siderealSolarTime/TimeMaster.as` (387 lines, fully); `NAAP/flash-animations/flashdev2/siderealSolarTime/Main.as` lines 93–116 (`getNextTimeWithFraction`, `goTo*`); target `src/common/TimeModel.ts` (style reference only — TimeMaster does not compose it).

**Create:** `src/common/model/TimeMaster.ts`, `tests/TimeMaster.test.ts`.

API (verified against the AS source):
- `solarTimeProperty: NumberProperty` — decimal days; integers = midnight; initial `SOLAR_TIME_AT_EPOCH = 0.5` (solar noon, March 20, vernal equinox).
- `modeProperty: Property<"simple" | "julian">` — SIMPLE: `tropicalYear = 365`, JULIAN: `365.25`; both `siderealPerSolar = (tropicalYear + 1)/tropicalYear`. Setting mode resets solarTime to 0.5.
- Derived: `siderealTimeProperty = (solar − 0.5)·siderealPerSolar` (days); `solarDaysSinceVernalEquinoxProperty = ((solar − 0.5) % Y + Y) % Y`; `siderealDaysSinceVernalEquinoxProperty = solarDaysSinceVE·siderealPerSolar`.
- 12 `isAt*` DerivedProperties, tolerance `1e-6` days: midnight/sunrise/noon/sunset on `frac(solar)` vs 0/0.25/0.5/0.75; sidereal 0h/6h/12h/18h on `frac(sidereal)`; VE/SS/AE/WS on `solarDaysSinceVE` vs 0 (or Y)/0.25·Y/0.5·Y/0.75·Y.
- Mutators: `setSolarTime(target, durationSeconds = 0)`; `incrementSolarTime(days, duration)`; `incrementSiderealTime(sidDays, duration)` = `setSolarTime(solar + sidDays/siderealPerSolar, duration)`; `goToSolarTimeOfDay(f, duration)`, `goToSiderealTimeOfDay(f, duration)`, `goToFractionOfYear(f, duration)` — all use `getNextTimeWithFraction(current, fraction)`: normalize fraction to [0,1); `int = floor(current)`; if `fraction − (current − int) < 1e-8` then `int += 1`; return `int + fraction`. Year fractions operate in `t = (solar − 0.5)/Y` units, mapped back `solar = 0.5 + t·Y`.
- Easing (D4): a `setSolarTime` with duration > 0 records `{ start, target, duration, elapsed: 0 }`; `step(dt)` sets `solar = start + (target − start)·easeInOutCubic(elapsed/duration)` with `easeInOutCubic(u) = u < 0.5 ? 4u³ : 1 − (−2u + 2)³/2`; finishes exactly at target. Retarget from current displayed value if interrupted. `isAnimatingProperty: BooleanProperty`. `reset()` → simple mode, solar 0.5, cancel animation.

Tests: (1) SIMPLE: +365 solar days → sidereal advances exactly 366 days and `solarDaysSinceVE` wraps to 0; JULIAN: 365.25 ↔ 366.25. (2) `getSiderealTimeForSolarTime(0.5) === 0`; solar↔sidereal round-trip to 1e-12. (3) `goToFractionOfYear(0.25)` lands `solarDaysSinceVE === 0.25·Y`, `isAtSummerSolstice` true, others false, always moves forward. (4) already-at-fraction edge → advances a full day. (5) easing determinism: `setSolarTime(1.5, 1.0)` + 60×`step(1/60)` → exactly 1.5; value at 30 steps strictly between start/target. (6) `incrementSiderealTime(1)` in SIMPLE advances solar by 365/366 days.

**Gate:** standard.

---

# PHASE 2 — Sidereal & Solar Time screen (smallest full vertical; validates TimeMaster)

## Step 2.1 — Screen 2 strings

**Read:** `NAAP/flash-animations/flashdev2/siderealSolarTime/Main.as` (button labels); RS `strings_en.json` `a11y.*.controls` shape.

**Modify:** three locale JSONs + `StringManager.ts` (add `getSiderealSolarTimeStrings()` for the new visible group).

Top-level `"siderealSolarTime"` group: `solarTimeLabel`, `siderealTimeLabel`, `solarDaysSinceVE`, `siderealDaysSinceVE`, `plusOneSolarDay`, `plusTenSolarDays`, `minusOneSolarDay`, `minusTenSolarDays`, `plusOneSiderealDay`, `plusTenSiderealDays`, `minusOneSiderealDay`, `minusTenSiderealDays`, `midnight`, `sunrise`, `noon`, `sunset`, `sidereal0h`, `sidereal6h`, `sidereal12h`, `sidereal18h`, `vernalEquinox`, `summerSolstice`, `autumnalEquinox`, `winterSolstice`, `dayOfYear`, `am`, `pm`. Replace `a11y.siderealSolarTime.controls.exampleControl` with real keys (`orbitEarth` name+help, `dayOfYearSlider`, `timeJumpButtons`, `seasonButtons`, `timeControl`) and a `currentDetails` pattern: `"Earth is {{solarDays}} solar days ({{siderealDays}} sidereal days) past the vernal equinox; solar time is {{solarClock}}."` (translate surrounding text; keep `{{…}}` tokens identical in es/fr).

**Gate:** standard.

## Step 2.2 — `SiderealSolarTimeModel` + tests

**Read:** target placeholder `src/sidereal-solar-time/model/SiderealSolarTimeModel.ts`; RS `src/common/model/SkyModel.ts` (TimeSpeed multiplier style); `src/common/TimeModel.ts`.

**Modify:** `src/sidereal-solar-time/model/SiderealSolarTimeModel.ts`; **create** `tests/SiderealSolarTimeModel.test.ts`.

- Compose `timeMaster = new TimeMaster()`, `timer = new TimeModel()`, `timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL)` (SLOW 0.25 / NORMAL 1 / FAST 4).
- `step(dt)`: `timer.step(dt)`; `timeMaster.step(dt)`; if playing and not animating → `solarTime += dt · SOLAR_DAYS_PER_SECOND · multiplier`.
- `stepForward()` = +1 solar hour instant. Starting an eased jump pauses the timer. `reset()` resets all.

Tests: 4 s play at NORMAL → +1.0 solar day; jump pauses play; `isAtNoon` true initially.

**Gate:** standard.

## Step 2.3 — `OrbitViewNode` (top-down orbit, draggable Earth + figure)

**Read:** `NAAP/flash-animations/flashdev2/siderealSolarTime/OrbitView.as` (156 lines, fully); RS `src/common/view/SkyStarsNode.ts` (DragListener + keyboard pattern only).

**Create:** `src/sidereal-solar-time/view/OrbitViewNode.ts`.

Formulas (Flash screen coords, y down):
- `angle = (solarDaysSinceVE / tropicalYear)·2π`; Earth center relative to Sun at origin: `x = R·cos(angle − π/2)`, `y = −R·sin(angle − π/2)` (`ORBIT_RADIUS`).
- Globe rotation: `180° − frac(solarTime)·360° − angle·(180/π)` — encodes the extra sidereal turn per orbit. Draw globe as filled circle + radial noon-meridian line + rim stick figure so spin is visible.
- Globe drag (sets date): `angleDelta = −(atan2(pointerY, pointerX) − atan2(earthY, earthX) − dragStartOffset)` normalized into (−π, π]; `timeDelta = angleDelta·Y/2π`; snap `round(timeDelta)` whole solar days; Shift: `round(timeDelta·siderealPerSolar)/siderealPerSolar` (whole sidereal days); apply `incrementSolarTime(timeDelta, 0)`; drag start cancels animation.
- Figure drag (sets time of day): `timeDelta = rotationDeltaDeg/360` days.
- Keyboard: arrows ±1 solar day, Shift+arrows ±1 sidereal day (`MotionsOfTheSunHotkeyData`); focusable, accessibleName from 2.1.
- Also draw: orbit circle (`orbitPath`), Sun disc (`sun` color), four season tick labels at year-fraction positions.

**Gate:** standard (compile + lint; node not yet on screen).

## Step 2.4 — Time-jump button panels + readouts

**Read:** `Main.as` lines 31–90, 118–186; target `MotionsOfTheSunButtonOptions.ts`, `MotionsOfTheSunPanel.ts`.

**Create:** `src/sidereal-solar-time/view/TimeJumpPanel.ts` (four `MotionsOfTheSunPanel` sections in a VBox/HBox grid).

- Increments: −10/−1/+1/+10 solar days → `incrementSolarTime(±1, 1.0 s)` / `(±10, 2.0 s)`; same for sidereal via `incrementSiderealTime`.
- Solar time-of-day: midnight/sunrise/noon/sunset → `goToSolarTimeOfDay(0/0.25/0.5/0.75, 1.0 s)`; button highlights (`activeButtonHighlight` as baseColor override) bound to the matching `isAt*` Property.
- Sidereal 0h/6h/12h/18h → `goToSiderealTimeOfDay(…, 1.0 s)` with highlighting.
- Seasons: VE/SS/AE/WS → `goToFractionOfYear(0/0.25/0.5/0.75, 2.0 s)` with highlighting.
- Readouts: `solarDaysSinceVE.toFixed(3)` and `siderealDaysSinceVE.toFixed(3)` (DerivedProperty-bound Text); digital clocks — solar `h:mm AM/PM` from `frac(solarTime)`, sidereal `HH:MM` from `frac(siderealTime)·24`.
- All buttons: `accessibleName` from 2.1, `FLAT_RECTANGULAR_BUTTON_OPTIONS`.

**Gate:** standard.

## Step 2.5 — Assemble Screen 2 + slider + summary + keyboard help

**Read:** target placeholders (`SiderealSolarTimeScreenView.ts`, `…ScreenSummaryContent.ts`, `…KeyboardHelpContent.ts`); RS `src/celestial-sphere/view/CelestialSphereScreenView.ts` lines 263–273 (TimeControlNode wiring), 550–563 (pdomOrder); RS `CelestialSphereScreenSummaryContent.ts` (live PatternStringProperty).

**Modify:** the three screen-2 view files.

- Layout: OrbitViewNode left-center; TimeJumpPanel right; day-of-year `HSlider` (0–365, `MOTIONS_OF_THE_SUN_SLIDER_OPTIONS`) below the orbit — drag sets `solarTime += sliderValue − solarDaysSinceVE` (preserves time of day); season buttons under it; `TimeControlNode` bottom-center (`timer.isPlayingProperty`, `timeSpeedProperty`, `stepForward`); ResetAllButton bottom-right.
- Summary: `currentDetailsContent` = `PatternStringProperty(a11y pattern, { solarDays, siderealDays, solarClock })` with `decimalPlaces: { solarDays: 3, siderealDays: 3 }`.
- Keyboard help: orbit-drag keys, slider keys, time-control keys.
- `pdomPlayAreaNode.pdomOrder = [orbitNode]`; `pdomControlAreaNode.pdomOrder = [slider, jump buttons…, timeControl, resetAllButton]`.

**Gate:** full gate + `npm start` visual checks: (1) "+1 solar day" vs "+1 sidereal day" — solar leaves the Sun overhead-shifted, sidereal returns the globe to the same stellar orientation; (2) "+10 solar days" → counters read 10.000 / 10.027; (3) noon button highlights when reached; (4) Earth drag snaps whole solar days, Shift-drag whole sidereal days; (5) Reset → noon at VE, SIMPLE mode.

---

# PHASE 3 — Sun Paths screen (largest)

## Step 3.1 — Screen 1 strings

**Modify:** three locale JSONs + `StringManager.ts` (`getSunPathsStrings()`).

Top-level `"sunPaths"` group: `showDeclinationCircle`, `showEcliptic`, `showMonthLabels`, `showUnderside`, `showStickfigure`, `showAnalemma`, `loopDay`, `altitude`, `azimuth`, `rightAscension`, `declination`, `hourAngle`, `siderealTime`, `equationOfTime`, `sunReadoutsTitle`, `displayOptionsTitle`. Replace `a11y.sunPaths.controls.exampleControl` with: `skyView` (name + help "Arrow keys rotate the view; Alt+arrows rotate about the zenith; Ctrl+left/right advance time"), `sunDisc` (name + help "Arrow keys move the Sun along its daily path, changing the time of day"), `latitudeControl`, `dayOfYearControl`, `timeOfDayControl`, `displayToggles`. `currentDetails` pattern: `"It is day {{day}} of the year at latitude {{latitude}} degrees. The Sun is at altitude {{altitude}} degrees, azimuth {{azimuth}} degrees."`

**Gate:** standard.

## Step 3.2 — `SunPathsModel` + tests

**Read:** target placeholder; `NAAP/astro-simulations/sun-motion-simulator/src/main.jsx` lines 24–60 (initial state); `/home/veillette/OpenPhysics/RotatingSky/session-ses_0f39.md` (sun-motion sections).

**Modify:** `src/sun-paths/model/SunPathsModel.ts`; **create** `tests/SunPathsModel.test.ts`.

- State: `dayOfYearProperty = NumberProperty(147.5, { range: DAY_OF_YEAR_RANGE })` (fraction = local mean time / 24); `latitudeProperty` (40.8, `LATITUDE_RANGE`); toggles: `showDeclinationCircle: true`, `showEcliptic: true`, `showMonthLabels: false`, `showUnderside: true`, `showStickfigure: true`, `showAnalemma: false`; `loopDayProperty(false)`; `timer = new TimeModel()`; `timeSpeedProperty` (0.25/1/4).
- Derived (from dayOfYear ± latitude): `sunRaHours`/`sunDecDeg` (`SunEphemeris.getSunPosition`), `siderealTimeHours`, `hourAngleHours`, `sunAltDeg`/`sunAzDeg` (via `SkyCoordinates.equatorialToHorizontal`), `eqnOfTimeMinutes`.
- `step(dt)`: playing → `dayOfYear += dt·ANIMATION_HOURS_PER_SECOND·multiplier/24`; `loopDay` keeps `floor(dayOfYear)` fixed (wrap fraction); wrap year at range max. `stepForward()` = +1 h.
- `advanceSiderealTime(hours)` (camera interface, D9): `dayOfYear += hours/24/SIDEREAL_RATE`.

Tests: initial alt ≈ 70.5 ± 0.5, az ≈ 180 ± 3; dec ≈ 21.3 ± 0.7 at day 147.5; loop-day keeps `floor(day)` constant over 100 steps; hour angle ≈ 0 ± 0.3 h initially (mean vs apparent noon differ by EoT — tolerance covers it).

**Gate:** standard.

## Step 3.3 — Sky scene base (projection + dome + ground + camera)

**Read:** RS `src/horizon-system/view/HorizonSystemScreenView.ts` (mimic its wiring of projection + HorizonDomeNode + HorizonGroundNode + attachSkyCameraInteraction wholesale); target `SunPathsScreenView.ts`.

**Create:** `src/sun-paths/view/SunPathsSkyNode.ts` — owns a `SkyProjection` (center per `skyViewLayout`, radius `SPHERE_RADIUS`); children: HorizonGroundNode, HorizonDomeNode (`undersideVisibleProperty: model.showUndersideProperty`); camera via `attachSkyCameraInteraction` with `sky: model`.
**Modify:** `SunPathsScreenView.ts` — instantiate left-of-center; delete placeholder text; keep ResetAllButton.

**Gate:** standard + `npm start`: dome + compass render; drag rotates camera; arrow keys work when focused.

## Step 3.4 — Celestial overlays (equator, 0h circle, ecliptic + months, declination circle)

**Read:** copied `CelestialEquatorOnHorizonNode.ts` + `HourCircleOnHorizonNode.ts` (reuse directly); RS `src/common/view/CelestialSphereNode.ts` lines 24–60 (ecliptic sampling reference); `src/common/view/skyGraphics.ts`.

**Create:** `src/sun-paths/view/EclipticOnHorizonNode.ts`, `src/sun-paths/view/SunDeclinationCircleNode.ts`; **modify** `SunPathsSkyNode.ts` (add these + copied equator/hour-circle nodes, each bound to its visibility Property).

- Ecliptic: sample λ ∈ [0°, 360°) step 2°: `dec = asin(sin λ·sin ε)`, `ra = atan2(sin λ·cos ε, cos λ)` (ε = 23.44°); each point → `equatorialToHorizonVector(raHours, decDeg, lat, lst)`; front/back split polylines (dashed back). Month labels (per `showMonthLabels`): for each month, at `day = MONTH_START_DOY[i] + 1` place the localized month name at `getSunPosition(day)`'s position, nudged ~8 px outward.
- Declination circle = the Sun's daily path: small circle at `dec = sunDecDeg` — sample ra 0–24 h step 0.25 h at fixed dec → horizon vectors; stroke `sunPath` color; visible per `showDeclinationCircle`; redraw on [dayOfYear, latitude, viewMatrix].

**Gate:** standard + visual: equator tilts with latitude; declination circle passes through the Sun's position; ecliptic crosses the equator at two points.

## Step 3.5 — Draggable `SunNode`, `AnalemmaNode`, observer figure + shadow

**Read:** RS `src/common/view/SkyStarsNode.ts` (drag→unproject→coords pattern); `NAAP/astro-simulations/sun-motion-simulator/src/CelestialSphere.jsx` (sun drag, analemma, stick figure — skim with session doc as guide).

**Create:** `src/sun-paths/view/SunNode.ts`, `src/sun-paths/view/AnalemmaNode.ts`, `src/sun-paths/view/ObserverFigureNode.ts`; **modify** `SunPathsSkyNode.ts`.

- `SunNode`: 8 px circle (`sun` color) + glow at projected `equatorialToHorizonVector(sunRa, sunDec, lat, lst)`; hidden when `projectWithDepth.depth < 0` unless underside shown. Drag: `projection.unproject(pointer)` → `horizontalToEquatorial` → new hour angle H′ → `frac(dayOfYear) += (H′ − H)/24` (integer day unchanged — D6). Keyboard: left/right ∓/± 15 min. Focusable; a11y strings from 3.1.
- `AnalemmaNode` (per `showAnalemma`): with mean clock time `T = frac(dayOfYear)·24`, for d = 1…365: `(ra_d, dec_d) = getSunPosition(d)`; `H_d = (T − 12) + eqnOfTimeHours(d)`; position via `equatorialToHorizonVector` with `lst = ra_d + H_d`; closed faded polyline (`analemma` color). Must pass through the Sun's current position (visual gate).
- `ObserverFigureNode`: stick figure at dome center (per `showStickfigure`); shadow line from feet toward azimuth + 180°, screen length `min(60, 18/tan(alt))` px, hidden when alt ≤ 0.

**Gate:** standard + visual: dragging the Sun runs it along the declination circle and updates readouts; analemma figure-eight passes through the Sun.

## Step 3.6 — Controls and readouts panel

**Read:** RS `CelestialSphereScreenView.ts` lines 173–181 (latitude NumberControl exact options), 263–273 (TimeControlNode).

**Create:** `src/sun-paths/view/SunPathsControlPanel.ts` — latitude NumberControl (`delta: 1`, `valuePattern "{{value}}°"`); day-of-year NumberControl (1–365, `delta 1`) with live `Month Day` DerivedProperty subtitle (`MONTH_START_DOY` + localized months); time-of-day NumberControl (0–24 h, `delta 0.25`, formatted `h:mm`); six display toggles + loop-day checkbox (`MOTIONS_OF_THE_SUN_CHECKBOX_OPTIONS`).
**Create:** `src/sun-paths/view/SunReadoutPanel.ts` — 7 rows: altitude, azimuth, RA, declination, hour angle (`Hh Mm`, signed), sidereal time, EoT (`m:ss`) — transcribe `formatHours`/`formatMinutes` from `utils.js`.

**Gate:** standard.

## Step 3.7 — Assemble Sun Paths screen + summary + keyboard help

**Modify:** `SunPathsScreenView.ts` (sky node left; control panel + readouts right; TimeControlNode bottom-center; `pdomPlayAreaNode.pdomOrder = [skyNode, sunNode]`; `pdomControlAreaNode.pdomOrder = [latitude, day, time, toggles…, timeControl, resetAll]`), `SunPathsScreenSummaryContent.ts` (live PatternStringProperty, `decimalPlaces: { day: 0, latitude: 1, altitude: 1, azimuth: 1 }`), `SunPathsKeyboardHelpContent.ts` (camera keys, sun-drag keys, slider keys).

**Gate:** full gate + visual: initial = May 27 noon, lat 40.8, Sun high in the south; play animates the Sun across the sky; loop-day loops one day; latitude 90 → Sun circles parallel to horizon; latitude −40.8 → noon Sun due north.

---

# PHASE 4 — Zodiac screen

## Step 4.1 — Screen 3 strings

**Modify:** three locale JSONs + `StringManager.ts` (`getZodiacScreenStrings()`; sign names exist from 0.2).

Top-level `"zodiacScreen"` group: `minusTwoHours`, `plusTwoHours`, `minusSixHours`, `plusSixHours`, `minusOneMonth`, `plusOneMonth`, `showConstellationLabels`, `showEclipticLabel`, `showCelestialEquatorLabel`, `eclipticLabel`, `celestialEquatorLabel`, `latitudeNote` ("View from latitude 41° N, looking south"), `south`, `east`, `west`. Replace `a11y.zodiac.controls.exampleControl` with `timeButtons`, `dayOfYearSlider`, `labelToggles`, `zodiacStrip`. `currentDetails` pattern: `"The Sun is in {{sign}} on {{month}} {{day}}. It is {{clockTime}} local solar time."`

**Gate:** standard.

## Step 4.2 — `ZodiacModel` + tests

**Read:** target placeholder; `NAAP/flash-animations/flashdev2/zodiacSimulator/Main.as` (fully — buttons, day-string algorithm lines 171–185); `ZodiacSkyView.as` lines 658–686 (sun from longitude, twilight).

**Modify:** `src/zodiac/model/ZodiacModel.ts`; **create** `tests/ZodiacModel.test.ts`.

- Compose `timeMaster = new TimeMaster()` + `timer = new TimeModel()` (continuous play at `SOLAR_DAYS_PER_SECOND` like screen 2).
- Derived: `sunLongitudeRad = (solarDaysSinceVE/tropicalYear)·2π`; `sunDecRad = asin(sin λ·sin ε)`, `sunRaRad = atan2(sin λ·cos ε, cos λ)` (ε = 23.44°, D2); `siderealTimeRad = frac(siderealTimeDays)·2π`; `sunAltitudeRad = asin(sin dec·sin φ + cos dec·cos(LST − ra)·cos φ)` with φ = 41°; `twilightIntensity = clamp((7° + alt)/7°, 0, 1)` (in radians: `(0.1222 + alt)/0.1222`); `monthDayProperty`: `doy = ((solarDaysSinceVE − 0.5 + 78) % 365 + 365) % 365` (Flash passes `daysSinceVE − SOLAR_TIME_AT_EPOCH`), find i with `MONTH_START_DOY[i] ≤ doy < MONTH_START_DOY[i+1]`, `day = floor(doy − MONTH_START_DOY[i] + 1)`; `sunSignIndex = floor(normalize(λ)/(2π/12))`.
- Toggles (default false, per Flash reset): `constellationLabelsVisible`, `eclipticLabelVisible`, `celestialEquatorLabelVisible`.

Tests: reset (VE noon) → λ = 0, dec = 0, month-day ≈ "March 20"; +0.25 year → λ = π/2, dec = +23.44°; twilight: alt 0 → 1.0 (full day), alt −7° → 0, alt −3.5° → 0.5; month arithmetic across the wrap (VE − 30 days → "February 18" ± 1 day).

**Gate:** standard.

## Step 4.3 — Lambert projection module + tests

**Read:** `NAAP/flash-animations/flashdev2/zodiacSimulator/ZodiacSkyView.as` lines 154–162, 794–914 (`updateConstants`, `projectCelestialToScreen`, `projectHorizonToScreen`, `getAltitudeFromCelestialCoord`), 214–231 (sizing).

**Create:** `src/zodiac/view/lambertProjection.ts`, `tests/lambertProjection.test.ts` — pure functions of `(siderealTimeRad, widthPx)`.

Transcribe exactly:
- Sizing: `height = 0.54·width`, projection origin at `(width/2, 0.49·width)` within the masked rect, `size = 1.07·width`, scale `S = size/4`.
- Horizon→world matrix H (φ₀ = −0.1, θ₀ = π): `H = [[cφ₀cθ₀, −cφ₀sθ₀, sφ₀], [sθ₀, cθ₀, 0], [−sφ₀cθ₀, sφ₀sθ₀, cφ₀]]`.
- Celestial→horizon (β = lat − π/2 with lat = 41°, α = −LST): `C = [[−cβcα, cβsα, −sβ], [−sα, −cα, 0], [−sβcα, sβsα, cβ]]`; celestial→world `M = H·C`.
- Unit vectors: horizon `(cos alt·cos az, −cos alt·sin az, sin alt)`; celestial `(cos dec·cos ra, cos dec·sin ra, sin dec)`.
- Project `(wx, wy, wz)`: invalid if `wx ≥ 1 || wx ≤ −1`; else `k = S·√(2/(1 + wx))`, screen `(−k·wy, −k·wz)`.
- Export `ySouth(width)` — projected y of the horizon point (az π, alt 0).

Tests: view center (az π, alt −0.1) → ≈ (0, 0); (az π, alt 0) → x = 0 with y = `ySouth` (pin the sign by evaluation); zenith consistency — celestial point (ra = LST, dec = 41°) projects to the same screen point as horizon (alt 90°) to 1e-6; loose equal-area sanity (two 1°-separated pairs, near center vs 60° off, area ratio < 2×).

**Gate:** standard.

## Step 4.4 — `ZodiacSkyNode`: gradients, grid, equator, ecliptic, sun

**Read:** `ZodiacSkyView.as` lines 324–593 (drawing routines; gradient anchor colors already added in 0.1).

**Create:** `src/zodiac/view/ZodiacSkyNode.ts`.

- Clipped Node (clipArea = `width × 0.54·width` rect). Sky: top→bottom `LinearGradient` between `Color.interpolateRGBA(night, day, twilightIntensity)` pairs. Ground: filled horizon polygon (project az 0→2π at alt 0; ~128 samples suffices vs Flash's 500) with its own gradient below `ySouth`.
- Grid: 24 azimuth semi-meridians (central az = π at alpha 0.25, others 0.09), 5 altitude parallels; celestial equator (ra sweep at dec 0, `zodiacCelestialEquator`, alpha 0.5, lineWidth 2); ecliptic (λ sweep per 4.2 formulas, `zodiacEcliptic`). Optional labels "Ecliptic"/"Celestial equator" at `ra = LST ∓ 0.6 rad` (dec 0.04 and `0.06 + 0.41·sin(LST + 0.6)` per `updateCelestialEquatorAndEclipticLabels`), bound to the toggle Properties.
- Sun: 10 px disc at celestial (sunRa, sunDec). S/E/W labels at alt 5°, az π / π/2 / 3π/2.
- Redraw via Multilink: grid/equator on `[siderealTimeRad]`; sun/ecliptic labels also on `[sunLongitudeRad]`.

**Gate:** standard.

## Step 4.5 — Constellations + labels + zodiac strip

**Copy:**
- SSM `src/common/ZodiacConstellationsData.ts` → `src/common/ZodiacConstellationsData.ts` (verbatim; namespace rename; exports `ECLIPTIC_CONSTELLATIONS`, `equatorialToEcliptic`, `OBLIQUITY = 0.40913426548833737`)
- SSM `src/common/ZodiacStripBackground.ts` → `src/common/ZodiacStripBackground.ts` (colors rename; also exports `wrapToWidth`)
- **Read only:** SSM `src/ptolemaic/view/PtolemaicZodiacStrip.ts` lines 1–90 — cherry-pick `lonToX(lon) = ((−lon·W/2π) % W + W) % W` and the Pisces→Aries sign order; do **not** copy the class (coupled to PtolemaicModel). Do **not** copy `ConfigurationsZodiacStrip` or `ZodiacConstellationNode` (hardcoded layout radii).

**Create:** `src/zodiac/view/ZodiacConstellationsNode.ts` — for each constellation star, convert ecliptic (lon, lat) → equatorial: `dec = asin(sin lat·cos ε + cos lat·sin ε·sin lon)`, `ra = atan2(cos lat·sin lon·cos ε − sin lat·sin ε, cos lat·cos lon)` (exact inverse of the donor's `equatorialToEcliptic`, same OBLIQUITY constant), then project via `lambertProjection`; polyline stick figures (`constellationLine`) + 2 px star dots; centroid name labels bound to `constellationLabelsVisible`; localized names via `getZodiacStrings()`.
**Create:** `src/zodiac/view/ZodiacSunStrip.ts` — `ZodiacStripBackground` at `ZODIAC_STRIP_WIDTH × ZODIAC_STRIP_HEIGHT`, Pisces→Aries order, sun marker at `lonToX(sunLongitude)`. (Skip the ghost trail — optional polish.)

**Gate:** standard + visual: at reset (VE) the Sun sits at the Pisces/Aries boundary; constellations ring the ecliptic curve.

## Step 4.6 — Assemble Zodiac screen + controls + summary + keyboard help

**Read:** `zodiacSimulator/Main.as` lines 75–116 (button deltas/durations).

**Modify:** `ZodiacScreenView.ts`, `ZodiacScreenSummaryContent.ts`, `ZodiacKeyboardHelpContent.ts`.

- Buttons: −2h/+2h → `incrementSolarTime(∓2/24, 0.7 s)`; −6h/+6h → `(∓0.25, 1.0 s)`; ±1 month → `(±30, 0)` instant. Day-of-year slider (screen-2 wiring pattern); month-day readout (`{{month}} {{day}}` from `monthDayProperty` + localized months); three label checkboxes; latitude note; ZodiacSunStrip below the sky view; TimeControlNode; ResetAllButton.
- Live summary per 4.1 (`sign` via `sunSignIndex` → localized sign StringProperties).
- pdomOrder: play area empty (sky non-interactive here); control area `[time buttons ×6, slider, checkboxes ×3, timeControl, resetAll]`.

**Gate:** full gate + visual: +6h ×4 returns the Sun to the same sky position on the next day; +1 month moves the Sun ~1 sign along the ecliptic and the strip marker one cell; twilight gradient brightens near sunrise/sunset; label toggles work; reset → VE noon, bright sky.

---

# PHASE 5 — Icons, query parameters, preferences

## Step 5.1 — Screen icons

**Read:** RS `src/common/RotatingSkyScreenIcons.ts` (548×373 canvas pattern, `iconFrom`, background helpers); target `doc/multi-screen.md` lines 183–198; the three `*Screen.ts`.

**Create:** `src/common/MotionsOfTheSunScreenIcons.ts` — `createSunPathsIcon()` (ground semicircle + dome arc + three sun-path arcs + sun disc), `createSiderealSolarTimeIcon()` (sun center, orbit circle, earth disc with meridian line), `createZodiacIcon()` (band with dividers + stick-figure constellation + sun disc).
**Modify:** the three `*Screen.ts` — add `homeScreenIcon` / `navigationBarIcon` in optionize defaults.

**Gate:** full gate + visual: three distinct icons on the home screen, projector-mode aware.

## Step 5.2 — Query parameters + preferences

**Read:** target `src/preferences/*` (three files); RS `src/preferences/RotatingSkyPreferencesModel.ts` + `RotatingSkyPreferencesNode.ts` (defaultLatitude NumberControl pattern).

**Modify:** the three target preferences files + three locale JSONs (`preferences` group: replace `exampleToggle` with `defaultLatitude` label + description) + `SunPathsModel.ts`.

- Query params: `latitude` (number, default 40.8, valid −90…90, public), `day` (number, default 147.5, valid 0–366, public). Remove `exampleToggle` (and its Property/checkbox).
- Preferences: `defaultLatitudeProperty: NumberProperty(queryParameters.latitude)` with a NumberControl in the preferences node; `SunPathsModel` takes it as a constructor option (RS `SkyModelOptions` pattern) and resets latitude to its current value.

**Gate:** full gate + visual: `?latitude=-33&day=355` starts Sun Paths at a Sydney summer solstice.

---

# PHASE 6 — A11y polish and documentation

## Step 6.1 — Cross-screen a11y audit

**Read:** all three `*ScreenView.ts` / `*ScreenSummaryContent.ts` / `*KeyboardHelpContent.ts`; RS `CelestialSphereScreenView.ts` lines 550–563.

**Fix anything failing:** (1) every interactive node has `accessibleName` (+ helpText for drags) from StringManager — grep `new Checkbox|new HSlider|new NumberControl|new RectangularPushButton|DragListener` and verify each; (2) every screen's two pdomOrders cover ALL interactive nodes, resetAll last; (3) all three `currentDetailsContent` are live PatternStringProperties (no static "initial state" strings remain); (4) each keyboard-help dialog has ≥ 2 sections and every HotkeyData in use appears in one.

**Gate:** full gate + manual tab-through of each screen.

## Step 6.2 — Documentation

**Modify:** `doc/model.md` — TimeMaster math (epoch 0.5, SIMPLE/JULIAN, sidereal ratio), SunEphemeris closed forms + deviation notes (D1, D2), zodiac Lambert projection + twilight model, day-of-year conventions (Jan 1 = day 1; VE offset +78). `doc/implementation-notes.md` — donor-file provenance map (which RS/SSM file each `src/common` file came from, what was renamed/adapted), per-screen node trees, note that SSM's `STAR_RADIUS=235`/`LAT_SCALE=120` magic radii were NOT used (Lambert projection instead), deferred items (Phases 7–8). Also fix stale template artifacts: `package.json` description/repository, `tests/setup.ts` init name `"simTemplate"`.

**Gate:** full gate.

---

# PHASE 7 — Replica widgets (polish; user-approved deferral)

## Step 7.1 — Analog clocks (screen 2)
**Read:** `siderealSolarTime/AnalogClock.as` + `AnalogClockHand.as`. **Create** `src/sidereal-solar-time/view/AnalogClockNode.ts`; **modify** `SiderealSolarTimeScreenView.ts` + strings ×3.
Formulas: `hourHand.rotation = frac(t)·360°`; `minuteHand.rotation = frac(frac(t)·24)·360°`; solar clock shows AM/PM, sidereal doesn't. Hand drag: hour `Δdeg/360` days, minute `Δdeg/(360·24)` days → `incrementSolarTime`/`incrementSiderealTime` (instant). Hands focusable, arrows ±5 min.
**Gate:** full gate + visual parity with Flash.

## Step 7.2 — Calendar-strip date picker (Sun Paths)
**Read:** `NAAP/astro-simulations/sun-motion-simulator/src/DatePicker.jsx`; `DayOfYearSlider.as` (wrap-around drag: delta wrapped into ±half-width). **Create** `src/sun-paths/view/CalendarStripNode.ts` (12-month strip, draggable marker, year-boundary wrap; sets integer part of `dayOfYearProperty`); **modify** `SunPathsControlPanel.ts` + strings ×3.
**Gate:** full gate + visual.

## Step 7.3 — Latitude picker replica (Sun Paths)
**Read:** `NAAP/astro-simulations/sun-motion-simulator/src/LatitudePicker.jsx`. **Create** `src/common/view/WorldMapNode.ts` — a flat (equirectangular) world map with a full-width horizontal latitude marker (arrowheads at both edges) the observer drags up/down to set their latitude, bidirectional with `latitudeProperty`. This mirrors the NAAP "Motions of the Sun" world map; longitude is irrelevant so the marker spans the whole width and only its vertical position matters.

Land outlines come from the NAAP `Globe.as` `_shoreData` low-res polygons, transcribed into `src/common/EarthShoreData.ts` and projected lon → x, lat → y (dateline-crossing edges are split to avoid wrap-around smear). Do **not** copy the heavy RS `EarthGlobeNode`/`FlatEarthMapNode`/`EarthShoreData*` Explorer data — only the light NAAP outlines.

**Decision override (D-note):** the original plan called for a stylized gradient globe (`LatitudePickerNode.ts`, gradient circle + dashed latitude lines). Per reviewer feedback this was replaced with the flat world-map picker above, which reads more clearly as "pick your place on Earth" and matches the NAAP source. `LatitudePickerNode.ts` and the `LATITUDE_PICKER_SIZE` constant were removed.
**Gate:** full gate + visual.

---

# PHASE 8 — Geocentric ZodiacViewer mode (lab `zodiac.swf`)

> **Outcome:** implemented as full `GeocentricZodiacNode` (sphere + Flash stick figures + band
> masks + `zodiac016` rotational axis), not the simplified top-down diagram sketched below.
> Default view mode is `"earthCentered"`. See `doc/implementation-notes.md`.

## Step 8.1 — Decompile and analyze
Run `npm run decompile -- --setup` (once, needs Java), then `npm run decompile` — `zodiac/zodiac017.swf` is in the default target set (`scripts/decompile-flash.ts` `MOS_TARGETS`); output → `NAAP/decompiled/zodiac017/scripts/`. Read the decompiled AS and append findings to `doc/implementation-notes.md`. Also consult `zodiac016` for the rotational axis. No sim code changes in the original step.
**Gate:** decompiled sources exist; `npm run check` still passes.

## Step 8.2 — Earth-centered / geocentric mode
**Shipped:** `src/zodiac/view/GeocentricZodiacNode.ts` (+ `geocentricZodiacMath.ts`, `ZodiacFlashConstellationsData.ts`, `zodiacBandGraphics.ts`); `ZodiacModel.viewModeProperty` (`"earthCentered"` default | `"sky"`); toggle in `ZodiacScreenView`.
**(Historical sketch, superseded):** a flat `EarthCenteredZodiacNode` top-down diagram was an interim idea and was not kept.
**Gate:** full gate + visual: Sun sign matches strip for several dates; band/axis match Flash.

---

## Sequencing rationale & risks

- Phases 0–1 first: every screen consumes `SkyCoordinates`, `SunEphemeris`, or `TimeMaster`; their test suites are the cheapest place to catch sign/convention errors.
- Screen 2 before Screen 1: smallest full vertical; proves TimeMaster + button/slider/TimeControl idioms with zero projection risk.
- Zodiac third: depends on TimeMaster (proven in Phase 2); its bespoke Lambert projection is isolated in a pure, tested module (4.3).
- Biggest risks: (a) sign conventions in the zodiac matrices — mitigated by verbatim transcription + pinned tests; (b) `attachSkyCameraInteraction` narrowing (D9) — one method only; (c) analemma time convention — mitigated by the "must pass through the current Sun" visual gate.

## Verification (end-to-end)

After each phase-final step: `npm run check && npm run lint && npm run build && npm test`, then `npm start` and run that phase's listed visual checks. Physics cross-checks: Screen 2 counters 10.000/10.027 after +10 solar days; Sun Paths noon altitude `90° − |lat − dec|`; Zodiac VE reset puts the Sun at the Pisces/Aries boundary on "March 20".

## Critical reference files

- `NAAP/flash-animations/flashdev2/siderealSolarTime/TimeMaster.as` — screen 2 model source of truth
- `NAAP/astro-simulations/sun-motion-simulator/src/utils.js` — all Sun Paths math
- `NAAP/flash-animations/flashdev2/zodiacSimulator/ZodiacSkyView.as` — optional Lambert sky source of truth
- ZodiacViewer / lab `zodiac.swf` (`zodiac016`/`017`) — geocentric Explorer source of truth
- `/home/veillette/OpenPhysics/RotatingSky/src/common/SkyProjection.ts` (+ `SkyCoordinates.ts`, `skyGraphics.ts` cluster) — donor rendering engine
- `/home/veillette/OpenPhysics/RotatingSky/session-ses_0f39.md` — CCNMTL sun-motion-simulator architecture analysis
- `src/i18n/StringManager.ts` — locale-parity choke point touched in every phase
