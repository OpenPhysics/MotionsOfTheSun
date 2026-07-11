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

**Not used:** `ConfigurationsZodiacStrip`, `ZodiacConstellationNode`. These hardcode `STAR_RADIUS = 235` and `LAT_SCALE = 120` magic radii designed for a Ptolemaic orbital layout. The Zodiac sky view instead uses the **Lambert azimuthal equal-area projection** transcribed from `zodiacSimulator/ZodiacSkyView.as`, which places stars at their correct celestial coordinates without those radii. See `doc/model.md` § "Lambert projection" for the maths.

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
| `zodiac/view/ZodiacSkyNode.ts` | Sky gradient + grid + equator + ecliptic + Sun; clipped Node |
| `zodiac/view/ZodiacConstellationsNode.ts` | Lambert-projected constellation polylines + labels |
| `zodiac/view/ZodiacSunStrip.ts` | Zodiac-strip panorama with Sun marker |
| `zodiac/view/EarthCenteredZodiacNode.ts` | Top-down Earth-centered ecliptic diagram (Phase 8.2) |

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
  ├─ ZodiacSkyNode (Node, clipped) — visible when viewMode === "sky"
  ├─ ZodiacConstellationsNode — visible when viewMode === "sky"
  ├─ EarthCenteredZodiacNode — visible when viewMode === "earthCentered" (Phase 8)
  ├─ ZodiacSunStrip (ZodiacStripBackground + sun marker)
  ├─ rightColumn (VBox)
  │    ├─ viewModeRadioGroup (RectangularRadioButtonGroup: sky | earthCentered)
  │    ├─ time buttons (−2h/+2h/−6h/+6h/−1mo/+1mo)
  │    ├─ day-of-year slider + label + month-day readout
  │    ├─ constellationCheckbox / eclipticCheckbox / equatorCheckbox
  │    └─ latitudeNoteText
  ├─ TimeControlNode
  └─ ResetAllButton

pdomPlayAreaNode.pdomOrder  = []
pdomControlAreaNode.pdomOrder = [viewModeRadioGroup, time buttons ×6, slider, checkboxes ×3,
                                  timeControl, resetAllButton]
```

---

## Porting map (NAAP → screens)

| Screen | NAAP animation (published) | Flash source (decompile target) | JS reference |
|---|---|---|---|
| Sun Paths | `sunmotions.swf` | `sunMotions068-C.swf` | CCNMTL `sun-motion-simulator/` |
| Sidereal & Solar Time | `siderealSolarTime.swf` | `siderealSolarTime/siderealSolarTime.swf` | AS3 sources in `flashdev2/siderealSolarTime/` |
| Zodiac | `zodiac.swf` → `zodiacSimulator` | `zodiacSimulator/zodiacSimulator.swf` | AS3 sources in `flashdev2/zodiacSimulator/` |

---

## Design decisions (summary)

These are fixed and must not be re-derived (full rationale in `doc/porting-plan.md`):

| # | Decision |
|---|---|
| D1 | All Sun Paths math uses CCNMTL `utils.js` closed forms; npm `solar-calculator` is not used |
| D2 | One obliquity 23.44° for all three screens; zodiacSimulator's 23.5° normalized to it |
| D3 | Constellation art = polylines from `ZodiacConstellationsData.ts`; no AS3 opcode/SVG art |
| D4 | Animated jumps = cubic ease-in-out inside `step(dt)`; no Flash Timer/twixt |
| D5 | Sun Paths uses horizon-frame `SkyProjection`; no RS `CelestialSphereNode`/`SkyModel` |
| D6 | Draggable Sun moves along its declination circle (= controls time of day) |
| D7 | ~~Screen 2 exposes SIMPLE mode only~~ — **superseded:** Screen 2 now shows a SIMPLE/JULIAN year-length radio bound to `timeMaster.modeProperty`; the day-of-year slider hides in JULIAN mode (matches Flash). See `doc/parity-report.md` |
| D8 | Zodiac screen adds `ZodiacSunStrip` even though Flash lacked it |
| D9 | `attachSkyCameraInteraction`'s `sky` param narrowed to `{ advanceSiderealTime(hours): void }` |

---

## Colour scheme

`src/MotionsOfTheSunColors.ts` defines `ProfileColorProperty` instances for "default" (dark) and "projector" (light) profiles. SceneryStack switches profiles automatically when the user toggles Projector Mode in Preferences. All colour references go through these properties — never hardcoded hex strings in view code.

---

## Deferred items

All planned phases (0–8) are implemented. Optional future polish not in the plan:

- `dispose()` calls: most nodes hold external Property listeners created via `.link()`. Add dispose logic once the sim enters a disposal path (e.g., screen deactivation).
- `public/icons/icon.svg` brand alignment review.
- Full Flash celestial-sphere renderer for zodiac017 (we ship a simplified top-down ecliptic diagram instead — see "zodiac017 findings" below).

---

## Known gaps / TODOs

- `dispose()` on view nodes that link to external Properties.
- Projector-mode visual QA pass for Phase 7–8 widgets (clocks, calendar, balloons).

---

## zodiac017 findings

Source: `NAAP/decompiled/zodiac017/` (lab SWF `zodiac017`, NAAP *Seasons and the Zodiac* demo). Decompiled via `npm run decompile` (Phase 8.1).

### Scene layout

- **Geocentric celestial sphere** (`CelestialSphere`): diameter `initZodiacSize = 600` px; draggable, `maxViewerAltitude = 50°`, default `theta = 206°`, `phi = 30°`.
- **Earth at center**: `GlobeComponent` at `{az, alt:0, r:0.001}`. Scale from `initEarthDiskSize = 35`, `initEarthOrbitSize = 250`.
- **Sun on the rim**: `sunDisk` at `{az: az+180, alt:0, r:0.9999}` — opposite Earth on the ecliptic plane.
- **Zodiac band**: invisible `bandCircle` at ±24°; gradient wedge follows `globe.az − 90°`. Ecliptic at obliquity 23.5° (normalized to 23.44° in this port — D2).
- **Constellations**: 12 zodiac stick figures + labels on the sphere; front/back depth split. Horizon plane removed — pure sphere view.

### Math (`setDayOfYear` → `updateGlobe`)

```
az = -0.9863013698630136 * (dayOfYear + 10.8);   // −360/365 °/day
globe.setPosition({az: az, alt: 0, r: 0.001});
sunDisk.setPosition({az: az + 180, alt: 0, r: 0.9999});
siderealDay = dayOfYear * 1.0027397260273974;
globe.setRotationAngle((siderealDay % 1) * 360);
```

- `0.9863… = 360/365`: uniform solar motion (no equation-of-time).
- `+10.8`: phase offset so day 0 maps near Capricorn / late December.
- Controls: year slider (`Modified Year Slider`, 0–365) → `changeDay` → `setDayOfYear`.

### vs. `zodiacSimulator` (Lambert sky view)

| | **zodiac017** (lab) | **zodiacSimulator** |
|---|---|---|
| Viewpoint | Geocentric; Earth at sphere center | Observer on Earth (lat 41°N) |
| Projection | 3D celestial-sphere | Lambert azimuthal equal-area |
| Horizon | Disabled | Masked; twilight sky gradient |
| Sun position | From `dayOfYear` via `az` | Direct `sunLongitude` (radians) |

### Port choice (`EarthCenteredZodiacNode`)

Skip the full celestial-sphere renderer. Ship a **top-down ecliptic-plane diagram**:

1. Earth at origin; ecliptic circle of radius `EARTH_CENTERED_ORBIT_RADIUS`.
2. 12 sign markers at `λ = i · 30°` (Aries at λ=0).
3. Sun at shared `sunLongitudeRadProperty` (same as sky view / strip — gate: sight-line sign matches strip).
4. Sight-line Earth → Sun → highlighted sign.
5. Toggle via `viewModeProperty: "sky" | "earthCentered"` and a `RectangularRadioButtonGroup`.
