# Model - Motions of the Sun

This document describes the model (the underlying physics, math, and behavior) for the simulation, in
terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

> **Status:** the sim is a framework scaffold; the models below describe the intended port of the
> NAAP "Motions of the Sun" lab and will be refined as each screen is implemented.

## Overview

The simulation covers the Sun's apparent motions on two time scales:

1. **Sun Paths** — the daily arc. For an observer at latitude φ on a given date, the Sun rises,
   crosses the meridian at its maximum altitude, and sets. The path's shape and day length depend on
   latitude and on the Sun's declination (i.e., the date).
2. **Sidereal and Solar Time** — the ~4-minute gap. Because Earth moves about 1° along its orbit each
   day, it must rotate slightly more than 360° between successive solar noons: the solar day
   (24 h) is longer than the sidereal day (23 h 56 m 4 s).
3. **Zodiac** — the yearly circuit. The Sun's apparent position drifts eastward about 1° per day
   along the ecliptic, passing through the zodiac constellations over a year, which also determines
   which constellations are visible at night.

## Quantities and units

| Quantity | Symbol | Units | Range |
|---|---|---|---|
| observer latitude | φ | degrees | 90° S – 90° N |
| solar declination | δ☉ | degrees | −23.4° – +23.4° |
| hour angle | H | hours | −12 h – +12 h |
| solar altitude | h | degrees | −90° – +90° |
| solar azimuth | A | degrees | 0° – 360° |
| Sun's ecliptic longitude | λ☉ | degrees | 0° – 360° (one year) |
| sidereal day | — | h m s | 23 h 56 m 4 s (fixed) |
| solar day | — | h | 24 h (fixed) |

## Governing equations

- Solar declination through the year: sin δ☉ = sin ε · sin λ☉, with obliquity ε = 23.4°.
- Altitude: sin h = sin φ · sin δ☉ + cos φ · cos δ☉ · cos H.
- Azimuth: cos A = (sin δ☉ − sin φ · sin h) / (cos φ · cos h), resolved by the sign of H.
- Day length follows from the sunrise/sunset condition h = 0: cos H₀ = −tan φ · tan δ☉.
- Solar vs. sidereal day: Earth's ~0.986°/day orbital motion means one extra rotation per year
  (365.24 solar days = 366.24 sidereal days).

## Simplifications and assumptions

- Circular Earth orbit and uniform ecliptic motion (no equation of time, as in the NAAP original).
- No atmospheric refraction or finite solar disc; sunrise/sunset is the instant the Sun's center
  crosses the horizon.
- Obliquity is constant at 23.4°; star positions are fixed on the celestial sphere.

## References

- NAAP "Motions of the Sun" lab: https://astro.unl.edu/naap/motion3/motion3.html
