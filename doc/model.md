# Model — Motions of the Sun

Companion to [implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

The simulation covers three aspects of the Sun's apparent motion:

1. **Sun Paths** — the daily arc. For an observer at latitude φ on a given date, the Sun rises, crosses the meridian at its maximum altitude, and sets. The shape of the path and the day length depend on φ and on the Sun's declination (the date).
2. **Sidereal and Solar Time** — the ~4-minute gap. Because Earth moves ~1° along its orbit each day, it must rotate slightly more than 360° between successive solar noons: the solar day (24 h) is longer than the sidereal day (23 h 56 m 4 s).
3. **Zodiac** — the yearly circuit. The Sun's apparent position drifts eastward ~1°/day along the ecliptic, passing through the zodiac constellations over a year; this also determines which constellations are visible at night.

---

## Day-of-year convention

Throughout the sim, **day-of-year** (DOY) is a decimal number where **Jan 1 00:00 UT = 1.0**:

- Integer part → calendar date (1 = Jan 1, 365 = Dec 31 in a non-leap year).
- Fractional part → local mean time / 24 (0.0 = midnight, 0.5 = noon).
- `DEFAULT_DAY_OF_YEAR = 147.5` → May 27, solar noon (close to the CCNMTL default).

**Vernal Equinox offset:** the CCNMTL `utils.js` math treats DOY 1 as the reference; the VE falls near DOY 79 (~March 20). The Zodiac screen uses `VE_DOY_OFFSET = 78` (so `doy − 1 + 78` mod 365 gives days-since-VE).

**TimeMaster epoch:** `SOLAR_TIME_AT_EPOCH = 0.5` means "solarTime = 0.5" represents solar noon on the vernal equinox (March 20). All TimeMaster time values are measured in **solar days** from that epoch.

---

## Screen 1 — Sun Paths: SunEphemeris (closed-form solar position)

### Deviation notes (D1, D2)

- **D1:** All solar math uses the closed-form set from the CCNMTL `sun-motion-simulator/src/utils.js` (`getPosition`, `getEqnOfTime`, `getSiderealTime`). The npm `solar-calculator` dependency is **not** used. The formulas are self-consistent and dependency-free; deviations from high-precision ephemerides are ≤ 1° in declination and ≤ 2 minutes in the equation of time — invisible at screen scale.
- **D2:** One obliquity, **ε = 23.44°** (`COT_OBLIQUITY = 2.30644456403329 = cos ε / sin ε`), is used for all three screens. The `zodiacSimulator` ActionScript used 23.5°; this discrepancy of 0.06° is invisible at screen scale.

### Solar position (`getSunPosition(day)`)

Let `a = 0.017214206` rad/day (≈ 2π/365.25). Define:

```
ra_rad = 0.01721421·day
       − 1.3793756
       − 0.001830724·cos(a·day) + 0.032070267·sin(a·day)
       + 0.015952904·cos(2a·day) + 0.04026479·sin(2a·day)
       + 0.00044373354·cos(3a·day) + 0.0013114725·sin(3a·day)
       + 0.00064591583·cos(4a·day) + 0.00070547099·sin(4a·day)

raHours = (((12/π)·ra_rad) mod 24 + 24) mod 24
decDeg  = (180/π)·atan2(sin(ra_rad), COT_OBLIQUITY)
```

### Equation of Time (`getEqnOfTimeRad(day)`)

```
eot_rad = −4.3796019×10⁻⁶
        + 0.001830724·cos(a·day) − 0.032070267·sin(a·day)
        − 0.015952904·cos(2a·day) − 0.04026479·sin(2a·day)
        − 0.00044373354·cos(3a·day) − 0.0013114725·sin(3a·day)
        − 0.00064591583·cos(4a·day) − 0.00070547099·sin(4a·day)

eqnOfTimeHours   = eot_rad · 12/π
eqnOfTimeMinutes = 60 · eqnOfTimeHours
```

EoT ranges roughly −14 min (early Nov) to +16 min (early Nov is the minimum). Notable zeros near mid-April, mid-Jun, Sep 1, Dec 25.

### Greenwich Mean Sidereal Time (`getSiderealTimeHours(day)`)

```
GMST_hours = 24 · frac(0.280464857844662 + 1.0027397260274·day)
```

where `frac(x) = ((x mod 1) + 1) mod 1`. The constant 0.280464857844662 is the GMST at J2000.0 (Jan 1.5, 2000) divided by 24, and `SIDEREAL_RATE = 1.0027397260274` is the number of sidereal days per solar day.

### Hour angle and horizontal position

```
H_hours = (GMST − RA) mod 24, wrapped to [−12, 12]
H_rad   = H_hours · π/12

sin h = sin φ · sin δ + cos φ · cos δ · cos H
cos A = (sin δ − sin φ · sin h) / (cos φ · cos h)
A     = acos(clamp(cos A, −1, 1));  if H < 0 or H > π → A, else 2π − A
```

where φ = latitude, δ = solar declination, h = altitude, A = azimuth (N = 0, E = 90°, ...).

### Simplifications

- Circular orbit and mean ecliptic motion (EoT captures the true/mean Sun difference, but not obliquity-only or eccentricity-only decomposition).
- No atmospheric refraction; sunrise/sunset defined by the instant h = 0.
- GMST used as LST (observer at Greenwich longitude 0°), matching the NAAP convention.

---

## Screen 2 — Sidereal & Solar Time: TimeMaster

`TimeMaster` (`src/common/model/TimeMaster.ts`) is a direct port of `siderealSolarTime/TimeMaster.as`.

### Time variables

| Property | Definition |
|---|---|
| `solarTime` | Decimal solar days from epoch; `0.5` = noon on the vernal equinox |
| `siderealTime` | `(solarTime − 0.5) · siderealPerSolar` (solar days) |
| `solarDaysSinceVE` | `((solarTime − 0.5) mod Y + Y) mod Y` |
| `siderealDaysSinceVE` | `solarDaysSinceVE · siderealPerSolar` |

### Tropical year and sidereal ratio

| Mode | `tropicalYear` (Y) | `siderealPerSolar` |
|---|---|---|
| SIMPLE | 365 | 366/365 |
| JULIAN | 365.25 | 366.25/365.25 |

`siderealPerSolar = (Y + 1)/Y` — one extra sidereal rotation per orbit.

### 12 `isAt*` derived properties

Tolerance `TIME_EQUALITY_TOLERANCE = 1×10⁻⁶` days:

| Property | True when |
|---|---|
| `isAtMidnight` | `frac(solarTime) ≈ 0` |
| `isAtSunrise` | `frac(solarTime) ≈ 0.25` |
| `isAtNoon` | `frac(solarTime) ≈ 0.5` |
| `isAtSunset` | `frac(solarTime) ≈ 0.75` |
| `isAtSidereal0h` | `frac(siderealTime) ≈ 0` |
| `isAtSidereal6h` | `frac(siderealTime) ≈ 0.25` |
| `isAtSidereal12h` | `frac(siderealTime) ≈ 0.5` |
| `isAtSidereal18h` | `frac(siderealTime) ≈ 0.75` |
| `isAtVernalEquinox` | `solarDaysSinceVE ≈ 0` |
| `isAtSummerSolstice` | `solarDaysSinceVE ≈ 0.25·Y` |
| `isAtAutumnalEquinox` | `solarDaysSinceVE ≈ 0.5·Y` |
| `isAtWinterSolstice` | `solarDaysSinceVE ≈ 0.75·Y` |

### Jump animation (D4)

`setSolarTime(target, durationSeconds)` stores `{ start, target, duration, elapsed: 0 }`. Each `step(dt)` call advances elapsed and sets:

```
solar = start + (target − start) · easeInOutCubic(elapsed / duration)
easeInOutCubic(u) = u < 0.5 ? 4u³ : 1 − (−2u + 2)³/2
```

Completes exactly at `target` when `elapsed ≥ duration`. A new `setSolarTime` call while animating retargets from the current displayed value (smooth interrupt). `reset()` cancels any in-progress animation.

### Forward-only jump helper: `getNextTimeWithFraction`

```
target = floor(current) + fraction
if (fraction − (current − floor(current)) < 1e-8)  →  target += 1
```

Ensures jumps always move forward in time.

---

## Screen 3 — Zodiac: Lambert azimuthal equal-area projection

The sky view uses the **Lambert azimuthal equal-area** projection, transcribed verbatim from `zodiacSimulator/ZodiacSkyView.as`. The observer is fixed at latitude 41° N looking south.

### Constants

- View center: azimuth θ₀ = π (south), altitude φ₀ = −0.1 rad (~−5.7°, just below the horizon to centre the sky).
- Sizing: `height = 0.54·width`; projection origin at `(width/2, 0.49·width)`; `size = 1.07·width`; scale `S = size/4`.

### Coordinate matrices

**Horizon → world matrix H** (places the "forward" horizon direction along +x):

```
H = [[cos φ₀ cos θ₀,  −cos φ₀ sin θ₀,  sin φ₀],
     [sin θ₀,          cos θ₀,           0      ],
     [−sin φ₀ cos θ₀,   sin φ₀ sin θ₀,  cos φ₀]]
```

**Celestial → horizon matrix C** (β = lat − π/2 = 41° − 90° = −49°, α = −LST):

```
C = [[−cos β cos α,  cos β sin α,  −sin β],
     [−sin α,        −cos α,        0     ],
     [−sin β cos α,  sin β sin α,   cos β]]
```

**Combined:** M = H · C (celestial → world in one step).

### Projection formula

Unit world vector (wx, wy, wz):
- Invalid (not rendered) if `wx ≥ 1 or wx ≤ −1`.
- Otherwise: `k = S · √(2 / (1 + wx))`, screen point = `(−k·wy, −k·wz)`.

For horizon-frame points: `(cos alt · cos az, −cos alt · sin az, sin alt)` → multiply by H.  
For celestial-frame points: `(cos dec · cos ra, cos dec · sin ra, sin dec)` → multiply by M.

### Twilight model

```
twilightIntensity = clamp((7° + alt_deg) / 7°, 0, 1)
```

- alt ≥ 0°: intensity = 1 (full daytime sky colours).
- alt = −3.5°: intensity = 0.5 (civil twilight midpoint).
- alt ≤ −7°: intensity = 0 (astronomical night colours).

### Zodiac month-day calculation

```
doy = ((solarDaysSinceVE − 0.5 + 78) mod 365 + 365) mod 365
```

Find month index i where `MONTH_START_DOY[i] ≤ doy < MONTH_START_DOY[i+1]`.  
Day within month: `day = floor(doy − MONTH_START_DOY[i]) + 1`.

The `−0.5` adjusts for `solarDaysSinceVE` counting from noon (epoch = 0.5 solar days), and `+78` shifts from VE (DOY ~79) to Jan 1 (DOY 1).

### Sun ecliptic longitude

```
λ = (solarDaysSinceVE / tropicalYear) · 2π
sunDecRad = asin(sin λ · sin ε)          (ε = 23.44° = obliquity)
sunRaRad  = atan2(sin λ · cos ε, cos λ)
```

Zodiac sign index: `floor(λ_normalized / (2π/12))` where λ_normalized ∈ [0, 2π).

---

## Quantities and units

| Quantity | Symbol | Units | Range |
|---|---|---|---|
| Observer latitude | φ | degrees | 90° S – 90° N |
| Solar declination | δ☉ | degrees | −23.44° – +23.44° |
| Hour angle | H | hours | −12 h – +12 h |
| Solar altitude | h | degrees | −90° – +90° |
| Solar azimuth | A | degrees | 0° – 360° (N=0, E=90°) |
| Sun's ecliptic longitude | λ☉ | degrees | 0° – 360° |
| Tropical year (SIMPLE) | Y | solar days | 365 |
| Tropical year (JULIAN) | Y | solar days | 365.25 |
| Sidereal day | — | h m s | ≈ 23 h 56 m 4 s |

## References

- CCNMTL `sun-motion-simulator/src/utils.js` — source of all Sun Paths solar math (D1).
- NAAP `siderealSolarTime/TimeMaster.as` — TimeMaster port source of truth.
- NAAP `zodiacSimulator/ZodiacSkyView.as` — Lambert projection source of truth.
- NAAP lab: https://astro.unl.edu/naap/motion3/motion3.html
