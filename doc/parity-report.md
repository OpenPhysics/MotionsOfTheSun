# Feature-parity report — Motions of the Sun

Companion to [model.md](./model.md) and [implementation-notes.md](./implementation-notes.md).

This document compares the SceneryStack port (`src/`) against its original NAAP sources,
screen by screen, and records which original features are present, which the port adds on
top, and the few genuine gaps.

## Reference sources
| Screen | Lab SWF | Flash / AS reference | JS reference |
|---|---|---|---|
| Sun Paths | `sunmotions.swf` (= `sunMotions068`) | `NAAP/decompiled/sunMotions068-C` (close sibling) | `NAAP/astro-simulations/sun-motion-simulator` (React/WebGL) |
| Sidereal & Solar Time | `siderealSolarTime.swf` | AS3 `flashdev2/siderealSolarTime` + decompile | *(none — Flash only)* |
| Zodiac | `zodiac.swf` (ZodiacViewer / `zodiac016` family) | Decompiled `zodiac017` (+ `zodiac016` for axis); optional Lambert from `zodiacSimulator` | *(none — Flash only)* |

Only Sun Paths has a modern JS reimplementation; it mirrors the Flash lab ~1:1 (the Flash
Info panel additionally shows **hour angle**). Sidereal and Zodiac parity is judged against
the ActionScript / lab SWFs.

**Verdict: the port is at feature parity on all three screens** for the Flash lab behaviours
that matter pedagogically. Remaining differences are intentional (strip / continuous play
additions; SceneryStack control idioms) or small ephemeris indexing offsets on Sun Paths.

---

## Screen 1 — Sun Paths

| Original feature (Flash `sunMotions068` / JS) | Port | Location |
|---|---|---|
| Display: sun's declination circle, ecliptic, month labels, underside of sphere, stickfigure + shadow, analemma | ✅ 6 checkboxes | `SunPathsControlPanel`, `SunDeclinationCircleNode`, `EclipticOnHorizonNode`, `HorizonDomeNode`, `ObserverFigureNode`, `AnalemmaNode` |
| Latitude: numeric input + hemisphere + draggable map; default 40.8° | ✅ NumberControl + `WorldMapNode` | `SunPathsControlPanel`, `WorldMapNode` |
| Date: month/day + draggable year strip | ✅ NumberControl + `CalendarStripNode` (localized month abbrevs) | `SunPathsControlPanel`, `CalendarStripNode` |
| Time of day: inputs + 24 h analog clock (hour + minute hands, midnight day-wrap) | ✅ NumberControl + `SunClockNode` | `SunPathsControlPanel`, `SunClockNode` |
| Info readouts: altitude, azimuth, RA, declination, hour angle, sidereal time, equation of time | ✅ all 7 | `SunReadoutPanel` |
| 3D horizon/celestial sphere, rotatable by drag | ✅ Flash-faithful surfaces on `SkyProjection` (sky/horizon shade, NCP/SCP axes, wireframe) + camera drag/keys | `SunPathsSkyNode`, `SkyBowlShadingNode`, `HorizonShadeNode`, `CelestialPoleAxisNode` |
| Draggable Sun disk | ✅ | `SunNode` |
| Sun-drag mode: time-of-day / day-of-year (along analemma) | ✅ radio + `findClosestAnalemmaDay` | `SunPathsModel.sunDragModeProperty`, `SunNode`, `SunPathsControlPanel` |
| Animate start/stop + speed | ✅ play/pause/step + SLOW/NORMAL/FAST | `TimeControlNode` |
| Loop-day | ✅ (disabled in step-by-day mode) | `SunPathsControlPanel` |
| Animation mode: Continuous / Step by day | ✅ | `SunPathsModel.step()`, `SunPathsControlPanel` |
| Circle hover balloons (0ʰ, equator, ecliptic, declination, analemma) | ✅ | `CircleHoverBalloonNode`, `SunPathsSkyNode` |
| Low-animation-quality checkbox | N/A — Flash rendering perf hack, irrelevant to SceneryStack | — |

**Port adds:** color/projector profiles, PWA, i18n, full keyboard nav + screen-reader summaries,
`?latitude` / `?day` query params.

**Day index / year wrap:** aligned with Flash — 0-based DOY (`146.5` = May 27 noon) into the
Siedell/Flash Fourier coeffs, year wrap `% 365` (`DAY_OF_YEAR_RANGE = [0, 365)`). (CCNMTL's JS
rewrite used 1-based `Date` DOY; same coeffs with `147.5` would shift RA/dec by ~0.07 h / ~0.16°.)

**Renderer:** orthographic `SkyProjection` (same software-3D class as Flash) with Flash-faithful
surfaces — altitude-linked sky bowl + horizon shade (`updateSky`), NCP/SCP axis stubs, wireframe
meridians/poles. Not a WebGL/Three.js port of CCNMTL `CelestialSphere.jsx`.

---

## Screen 2 — Sidereal & Solar Time

| Original feature (Flash `siderealSolarTime`) | Port | Location |
|---|---|---|
| Orbit view: Sun at center, Earth globe travelling the orbit | ✅ | `OrbitViewNode` |
| Draggable Earth globe (change date; Shift = sidereal days) | ✅ + arrow keys | `OrbitViewNode` |
| Draggable observer figure (change time of day) | ✅ | `OrbitViewNode` |
| Season ticks + labels (VE / SS / AE / WS) | ✅ | `OrbitViewNode` |
| Two analog clocks (solar w/ AM·PM, sidereal) w/ draggable hands | ✅ (dark ink on light face) | `AnalogClockNode` ×2 |
| Day-of-year slider | ✅ | `SiderealSolarTimeScreenView` |
| Readouts: solar & sidereal days since vernal equinox | ✅ | `TimeJumpPanel` |
| Jump buttons: ±1/±10 solar days, ±1/±10 sidereal days | ✅ (8) | `TimeJumpPanel` |
| Time-of-day jumps: midnight / sunrise / noon / sunset | ✅ (4) w/ active highlight | `TimeJumpPanel` |
| Sidereal jumps: 0h / 6h / 12h / 18h | ✅ (4) w/ active highlight | `TimeJumpPanel` |
| Season jumps: vernal equinox / summer solstice / autumnal equinox / winter solstice | ✅ (4) w/ active highlight | `TimeJumpPanel` |
| Eased (cubic) jump animation | ✅ (D4) | `TimeMaster` |
| SIMPLE (365 d) / JULIAN (365.25 d) year mode | ✅ radio; day slider hides in JULIAN | `SiderealSolarTimeScreenView` |

**Port adds:** continuous play/pause + speed (the Flash only animates discrete jumps),
color/projector profiles, PWA, i18n, full keyboard nav + screen-reader summaries.

---

## Screen 3 — Zodiac

Lab primary = geocentric ZodiacViewer (`zodiac.swf` / `zodiac016`). Optional mode = Lambert
sky from `zodiacSimulator`.

| Original feature | Port | Location |
|---|---|---|
| Geocentric celestial sphere, Earth at center, Sun on ecliptic rim | ✅ | `GeocentricZodiacNode` |
| Drag-to-rotate camera (θ default 206°, φ ≤ 50°) | ✅ | `GeocentricZodiacNode`, `attachSkyCameraInteraction` |
| 12 Flash stick-figure constellations + labels | ✅ | `ZodiacFlashConstellationsData`, `GeocentricZodiacNode` |
| ±24° zodiac-band day/night gradient masks | ✅ | `zodiacBandGraphics.ts` |
| Earth's rotational axis (NCP–SCP; present in `zodiac016`) | ✅ | `GeocentricZodiacNode` |
| Day-of-year slider + month-day readout | ✅ | `ZodiacScreenView` |
| Uniform solar motion `az = −360/365 × (doy + 10.8)` | ✅ | `geocentricZodiacMath.ts` |
| Optional: Lambert sky at 41° N looking south (`zodiacSimulator`) | ✅ | `ZodiacSkyNode`, `lambertProjection` |
| Optional: sky/ground gradient + twilight | ✅ | `ZodiacSkyNode` |
| Optional: alt/az grid, celestial equator, ecliptic | ✅ | `ZodiacSkyNode` |
| Optional: SSM polyline constellations on Lambert sky | ✅ | `ZodiacConstellationsNode` |
| Label toggles (constellation / ecliptic / equator) | ✅ | `ZodiacScreenView` |
| Time buttons: −2h/+2h, −6h/+6h, −1 month/+1 month | ✅ (6) | `ZodiacScreenView` |

**Port adds:** the **zodiac sun-strip** panorama (D8), continuous play/pause, view-mode toggle,
color/projector profiles, PWA, i18n, screen-reader summaries.

---

## Remaining intentional differences
1. **Zodiac strip + continuous play** — not in the lab SWFs; pedagogical additions.
2. **Sun Paths projection** — Scenery orthographic `SkyProjection` (not Flash mask layers or
   CCNMTL WebGL); visual surfaces match Flash `CelestialSphere` shading/axes.
3. **Latitude N/S hemisphere click** (Sun Paths) — port uses a signed NumberControl (−90…90)
   instead of absolute degrees + N/S toggle; the world map covers the same interaction.
4. **SceneryStack control chrome** — NumberControl / RectangularRadioButtonGroup instead of
   Flash Component UI widgets; Sun Paths speed is SLOW/NORMAL/FAST rather than a continuous slider.

## Contrast note (default / projector profiles)
Light control surfaces (clock faces, calendar strip) always use dark ink
(`clockInkColorProperty` / `controlSurfaceTextColorProperty`) so marks stay readable in
default (dark) mode. Do not paint those marks with `textColorProperty` (near-white in default).
