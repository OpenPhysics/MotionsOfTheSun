# Implementation Notes — Motions of the Sun

Developer companion to [model.md](./model.md).

## High-level architecture

```
src/main.ts
  ├─ SunPathsScreen            Screen<SunPathsModel, SunPathsScreenView>
  ├─ SiderealSolarTimeScreen   Screen<SiderealSolarTimeModel, SiderealSolarTimeScreenView>
  └─ ZodiacScreen              Screen<ZodiacModel, ZodiacScreenView>
```

Each screen folder contains:

```
<Prefix>Screen.ts
model/<Prefix>Model.ts
view/<Prefix>ScreenView.ts              layout + pdomOrder
view/<Prefix>ScreenSummaryContent.ts   PDOM accessible overview
view/<Prefix>KeyboardHelpContent.ts    keyboard-help dialog
view/...                               per-screen visual nodes
```

Shared infrastructure lives in `src/common/`, colours in `src/MotionsOfTheSunColors.ts`, numeric constants in `src/MotionsOfTheSunConstants.ts`, strings in `src/i18n/`.

Data flows Model → View through AXON `Property` objects; the view observes via `.link()` / `Multilink.multilink()`.

---

## Donor-file provenance map

### From RotatingSky (`/home/veillette/OpenPhysics/RotatingSky/`)

All files were copied with global renames:
`RotatingSky*` → `MotionsOfTheSun*`, `rotating-sky` → `motions-of-the-sun`, `ROTATING_SKY_` → `MOTIONS_OF_THE_SUN_`.

| This repo (`src/`) | Donor file (RS `src/`) | Adaptations |
|---|---|---|
| `common/SkyCoordinates.ts` | `common/SkyCoordinates.ts` | verbatim copy |
| `common/SkyProjection.ts` | `common/SkyProjection.ts` | rename only |
| `common/skyMorph.ts` | `common/skyMorph.ts` | rename only |
| `common/model/ViewDirection.ts` | `common/model/ViewDirection.ts` | rename only |
| `common/view/skyGraphics.ts` | `common/view/skyGraphics.ts` | rename only |
| `common/view/starGraphics.ts` | `common/view/starGraphics.ts` | rename only |
| `common/view/skyViewLayout.ts` | `common/view/skyViewLayout.ts` | rename only |
| `common/view/HorizonDomeNode.ts` | `common/view/HorizonDomeNode.ts` | rename only |
| `common/view/HorizonGroundNode.ts` | `common/view/HorizonGroundNode.ts` | rename only |
| `common/view/CelestialEquatorOnHorizonNode.ts` | `common/view/CelestialEquatorOnHorizonNode.ts` | rename only |
| `common/view/HourCircleOnHorizonNode.ts` | `common/view/HourCircleOnHorizonNode.ts` | rename only |
| `common/view/attachSkyCameraInteraction.ts` | `common/view/attachSkyCameraInteraction.ts` | D9: `sky: SkyModel` narrowed to `{ advanceSiderealTime(hours): void }` (drops `onAddStarAt`/Shift-click) |
| `common/MotionsOfTheSunControlOptions.ts` | `common/RotatingSkyControlOptions.ts` | rename; exports renamed `MOTIONS_OF_THE_SUN_*` |
| `common/MotionsOfTheSunHotkeyData.ts` | `common/RotatingSkyHotkeyData.ts` | rename; removed star-specific keys (`ADD_STAR_AT_CENTER_KEYS`, `MOVE_STAR_KEYS`, `MOVE_GUIDE_STAR`) |

**Not copied (D5/D6):** `Star.ts`, `SkyModel.ts`, `StarPatterns.ts`, `EarthGlobeNode`, `FlatEarthMapNode`, `EarthShoreData*`.

### From SolarSystemModels (`/home/veillette/OpenPhysics/SolarSystemModels/`)

| This repo (`src/`) | Donor file (SSM `src/`) | Adaptations |
|---|---|---|
| `common/ZodiacConstellationsData.ts` | `common/ZodiacConstellationsData.ts` | verbatim; namespace rename |
| `common/ZodiacStripBackground.ts` | `common/ZodiacStripBackground.ts` | colours rename |

**Cherry-picked (not copied):** `lonToX` formula and sign order from `ptolemaic/view/PtolemaicZodiacStrip.ts` lines 1–90. The class itself was not copied because it couples to `PtolemaicModel`.

**Not used:** `ConfigurationsZodiacStrip`, `ZodiacConstellationNode`. These hardcode `STAR_RADIUS = 235` and `LAT_SCALE = 120` magic radii designed for a Ptolemaic orbital layout. The optional Lambert sky mode uses the **Lambert azimuthal equal-area projection** from `zodiacSimulator/ZodiacSkyView.as` (see `doc/model.md`). The default geocentric view uses Flash stick figures (`ZodiacFlashConstellationsData`) on `SkyProjection`.

### New files (no donor)

| File | Purpose |
|---|---|
| `common/SunEphemeris.ts` | Closed-form solar RA/dec/EoT/GMST from CCNMTL `utils.js` (D1) |
| `common/model/TimeMaster.ts` | Port of NAAP `siderealSolarTime/TimeMaster.as` |
| `common/MotionsOfTheSunScreenIcons.ts` | Canvas-drawn home-screen / nav-bar icons for all three screens |
| `sun-paths/view/SunNode.ts` | Draggable Sun disc (D6 pattern from `SkyStarsNode`) |
| `sun-paths/view/AnalemmaNode.ts` | Figure-eight analemma overlay |
| `sun-paths/view/ObserverFigureNode.ts` | Stick figure + shadow |
| `sun-paths/view/EclipticOnHorizonNode.ts` | Ecliptic + optional month labels |
| `sun-paths/view/SunDeclinationCircleNode.ts` | Sun's daily path small circle |
| `sidereal-solar-time/view/OrbitViewNode.ts` | Top-down orbit; draggable Earth (globe + figure) |
| `sidereal-solar-time/view/TimeJumpPanel.ts` | Four themed control sections with active-state highlighting |
| `sidereal-solar-time/view/AnalogClockNode.ts` | Draggable analog solar/sidereal clocks (Phase 7.1) |
| `sun-paths/view/CalendarStripNode.ts` | 12-month calendar strip with wrap-around drag (Phase 7.2) |
| `common/view/WorldMapNode.ts` | Flat equirectangular latitude picker (Phase 7.3; replaced stylized globe) |
| `sun-paths/view/SunClockNode.ts` | 24-hour clock with hour + minute hands (Flash Time Of Day Clock) |
| `sun-paths/view/CircleHoverBalloonNode.ts` | Roll-over balloons for celestial circles |
| `zodiac/view/lambertProjection.ts` | Pure projection functions (verbatim from ZodiacSkyView.as) |
| `zodiac/view/ZodiacSkyNode.ts` | Optional Lambert sky: gradient + grid + equator + ecliptic + Sun |
| `zodiac/view/ZodiacConstellationsNode.ts` | Lambert-projected constellation polylines + labels |
| `zodiac/view/ZodiacSunStrip.ts` | Zodiac-strip panorama with Sun marker (TS addition; Flash lacked it) |
| `zodiac/model/geocentricZodiacMath.ts` | Flash ZodiacViewer day→az / λ / globe-spin helpers |
| `zodiac/model/ZodiacFlashConstellationsData.ts` | Stick-figure star polylines from ZodiacViewer.as |
| `zodiac/view/GeocentricZodiacNode.ts` | Lab geocentric Zodiac Explorer (`zodiac.swf` / zodiac016) |
| `zodiac/view/zodiacBandGraphics.ts` | ±24° ecliptic band day/night gradient masks + axis helpers |

---

## Per-screen node trees

### Screen 1 — Sun Paths

```
SunPathsScreenView (ScreenView)
  ├─ backgroundRect (Rectangle)
  ├─ SunPathsControlPanel (MotionsOfTheSunPanel)
  │    ├─ latitudeControl (NumberControl)
  │    ├─ WorldMapNode (flat map, Phase 7.3)
  │    ├─ dayControl      (NumberControl)
  │    ├─ monthDayText    (Text)
  │    ├─ CalendarStripNode (Phase 7.2)
  │    ├─ timeControl     (NumberControl)
  │    ├─ SunClockNode (24 h, hour + minute hands)
  │    └─ checkboxes ×6 + sun-drag mode radio
  ├─ SunReadoutPanel (MotionsOfTheSunPanel)
  │    └─ 7 Text rows — altitude, azimuth, RA, dec, hour angle, sidereal time, EoT
  ├─ SunPathsSkyNode (Node)
  │    ├─ hitRect (Rectangle) — camera drag + keyboard target
  │    ├─ HorizonGroundNode
  │    ├─ HorizonDomeNode
  │    ├─ CelestialEquatorOnHorizonNode
  │    ├─ HourCircleOnHorizonNode
  │    ├─ EclipticOnHorizonNode
  │    ├─ SunDeclinationCircleNode
  │    ├─ AnalemmaNode
  │    ├─ ObserverFigureNode
  │    ├─ SunNode (draggable; time-of-day or day-of-year mode)
  │    └─ CircleHoverBalloonNode
  ├─ TimeControlNode
  └─ ResetAllButton

pdomPlayAreaNode.pdomOrder  = [hitRect, sunNode]
pdomControlAreaNode.pdomOrder = [controlPanel, readoutPanel, timeControl, resetAllButton]
```

### Screen 2 — Sidereal & Solar Time

```
SiderealSolarTimeScreenView (ScreenView)
  ├─ backgroundRect (Rectangle)
  ├─ OrbitViewNode (Node, focusable)
  │    ├─ seasonLayer (orbit ticks + labels)
  │    ├─ orbitCircle (Circle)
  │    ├─ sunDisc (Circle)
  │    └─ earthGroup (globe + meridian + figure, draggable)
  ├─ sliderContainer (VBox)
  │    ├─ dayOfYear label (Text)
  │    └─ dayOfYearSlider (HSlider)
  ├─ clocksBox (HBox) — AnalogClockNode ×2 (solar + sidereal, Phase 7.1)
  ├─ TimeJumpPanel (Node)
  │    ├─ solarSection / siderealSection / timeOfDaySection / seasonSection
  ├─ TimeControlNode
  └─ ResetAllButton

pdomPlayAreaNode.pdomOrder  = [orbitNode, solarClock, siderealClock]
pdomControlAreaNode.pdomOrder = [dayOfYearSlider, ...jumpButtons(20), timeControl, resetAllButton]
```

### Screen 3 — Zodiac

```
ZodiacScreenView (ScreenView)
  ├─ backgroundRect (Rectangle)
  ├─ GeocentricZodiacNode — default when viewMode === "earthCentered" (lab zodiac.swf)
  ├─ ZodiacSkyNode (Node, clipped) — visible when viewMode === "sky"
  ├─ ZodiacConstellationsNode — visible when viewMode === "sky"
  ├─ ZodiacSunStrip (ZodiacStripBackground + sun marker)
  ├─ rightColumn (VBox)
  │    ├─ viewModeRadioGroup (RectangularRadioButtonGroup: earthCentered | sky)
  │    ├─ time buttons (−2h/+2h/−6h/+6h/−1mo/+1mo)
  │    ├─ day-of-year slider + label + month-day readout
  │    ├─ constellationCheckbox / eclipticCheckbox / equatorCheckbox
  │    └─ latitudeNoteText (Lambert mode only)
  ├─ TimeControlNode
  └─ ResetAllButton

pdomPlayAreaNode.pdomOrder  = [geocentricNode (or sky hit target)]
pdomControlAreaNode.pdomOrder = [viewModeRadioGroup, time buttons ×6, slider, checkboxes ×3,
                                  timeControl, resetAllButton]
```

---

## Porting map (NAAP → screens)

| Screen | Lab SWF (published) | Flash identity | Port primary source |
|---|---|---|---|
| Sun Paths | `sunmotions.swf` | = `sunMotions068.swf` (decompile default `068-C` is a close sibling) | CCNMTL `sun-motion-simulator/` + Flash |
| Sidereal & Solar Time | `siderealSolarTime.swf` | = `flashdev2/siderealSolarTime/siderealSolarTime.swf` | AS3 in `flashdev2/siderealSolarTime/` |
| Zodiac | `zodiac.swf` | ZodiacViewer family (`zodiac016` / `zodiac017`); **not** `zodiacSimulator` | Decompiled ZodiacViewer + `GeocentricZodiacNode` |

Optional Zodiac mode: Lambert sky from `flashdev2/zodiacSimulator/` (`ZodiacSkyNode`).

---

## Design decisions (summary)

These are fixed and must not be re-derived (full rationale in `doc/porting-plan.md`):

| # | Decision |
|---|---|
| D1 | All Sun Paths math uses CCNMTL/Flash closed forms; **day arg is Flash 0-based** (not CCNMTL 1-based Date DOY); npm `solar-calculator` is not used |
| D2 | One obliquity 23.44° for all three screens; zodiacSimulator's 23.5° normalized to it |
| D3 | Lambert sky constellation art = polylines from SSM `ZodiacConstellationsData.ts`. Geocentric view uses Flash stick figures from `ZodiacFlashConstellationsData.ts` |
| D4 | Animated jumps = cubic ease-in-out inside `step(dt)`; no Flash Timer/twixt |
| D5 | Sun Paths uses horizon-frame `SkyProjection`; no RS `CelestialSphereNode`/`SkyModel`. Geocentric Zodiac reuses `SkyProjection` + camera drag for the sphere |
| D6 | Draggable Sun moves along its declination circle (= controls time of day) |
| D7 | ~~Screen 2 exposes SIMPLE mode only~~ — **superseded:** Screen 2 now shows a SIMPLE/JULIAN year-length radio bound to `timeMaster.modeProperty`; the day-of-year slider hides in JULIAN mode (matches Flash). See `doc/parity-report.md` |
| D8 | Zodiac screen adds `ZodiacSunStrip` even though Flash lacked it |
| D9 | `attachSkyCameraInteraction`'s `sky` param narrowed to `{ advanceSiderealTime(hours): void }` |

**Zodiac screen provenance (supersedes early plan D1 for Zodiac):** the lab embed is the **geocentric** ZodiacViewer (`zodiac.swf` ≈ `zodiac016`; decompile default `zodiac017` is the same family without the rotational axis). Default `viewModeProperty = "earthCentered"` → `GeocentricZodiacNode`. Optional `"sky"` → Lambert `zodiacSimulator` view.

---

## Colour scheme

`src/MotionsOfTheSunColors.ts` defines `ProfileColorProperty` instances for "default" (dark) and "projector" (light) profiles. SceneryStack switches profiles automatically when the user toggles Projector Mode in Preferences. All colour references go through these properties — never hardcoded hex strings in view code. Zodiac band / axis colours: `zodiacBandDayColorProperty`, `zodiacBandNightColorProperty`, `earthAxisColorProperty`.

---

## Deferred items

All planned phases (0–8) are implemented. Optional future polish not in the plan:

- `dispose()` calls: most nodes hold external Property listeners created via `.link()`. Add dispose logic once the sim enters a disposal path (e.g., screen deactivation).
- `public/icons/icon.svg` brand alignment review.

---

## Known gaps / TODOs

- `dispose()` on view nodes that link to external Properties.
- Projector-mode visual QA pass for Phase 7–8 widgets (clocks, calendar, balloons).

---

## Lab Zodiac Explorer findings (`zodiac.swf` / ZodiacViewer)

Sources: lab `astroUNL/naap/motion3/animations/zodiac.swf` (ZodiacViewer family); AIR/`flashdev2` ships `zodiac016.swf` (with rotational axis); decompile default `zodiac017` is the same scene without that axis. Ported as `GeocentricZodiacNode` (+ `geocentricZodiacMath.ts`, `zodiacBandGraphics.ts`).

### Scene layout

- **Geocentric celestial sphere**: diameter `initZodiacSize = 600` px; drag camera, `maxViewerAltitude = 50°`, default `theta = 206°`, `phi = 30°`.
- **Earth at center**: globe scaled from `initEarthDiskSize = 35`.
- **Sun on the ecliptic rim**: opposite Earth on Flash's ecliptic/horizon plane (lat 66.5° + LST 18h so NEP is at zenith).
- **Zodiac band**: ±24° ecliptic-latitude band with day/night linear gradient (`#aecdff` / `#474747`, ~60% opacity); terminator ±15°.
- **Rotational axis** (`zodiac016`): NCP–SCP through Earth, extent 1.5× Earth radius, `#ef5050`; front solid / back dashed.
- **Constellations**: 12 Flash stick figures + labels; front/back depth split. Pure sphere (no horizon mask).

### Math (`setDayOfYear` → `updateGlobe`)

```
az = -0.9863013698630136 * (dayOfYear + 10.8);   // −360/365 °/day; Flash DOY Jan 1 = 0
globe.setPosition({az: az, alt: 0, r: 0.001});
sunDisk.setPosition({az: az + 180, alt: 0, r: 0.9999});
siderealDay = dayOfYear * 1.0027397260273974;
globe.setRotationAngle((siderealDay % 1) * 360);
```

Port maps Flash az → ecliptic longitude via `λ_deg = −earthAz − 90` (`geocentricSunLongitudeRad`), calibrated so VE ≈ λ 0° and WS ≈ λ 270°. Obliquity normalized to 23.44° (D2).

### vs. `zodiacSimulator` (optional Lambert sky)

| | **ZodiacViewer / lab `zodiac.swf`** | **`zodiacSimulator`** |
|---|---|---|
| Viewpoint | Geocentric; Earth at sphere center | Observer on Earth (lat 41°N) |
| Projection | 3D celestial sphere (`SkyProjection`) | Lambert azimuthal equal-area |
| Horizon | None | Masked; twilight sky gradient |
| Sun position | From calendar DOY via az → λ | From `solarDaysSinceVE` → λ |
| Port node | `GeocentricZodiacNode` (default) | `ZodiacSkyNode` (optional mode) |
