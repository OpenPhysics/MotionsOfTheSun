/**
 * SunEphemeris.ts
 *
 * Closed-form solar position functions transcribed from the CCNMTL JS rewrite
 * of the NAAP sun-motion-simulator (`NAAP/astro-simulations/sun-motion-simulator/src/utils.js`).
 * The original algorithm is credited to
 * https://gist.github.com/chris-siedell/b5de8dae41cfa8a5ad67a1501aeeab47 (Chris Siedell).
 *
 * Design decision D1: these closed-form functions are used for all Sun Paths math;
 * the npm `solar-calculator` package is not used.
 * Design decision D2: one obliquity, 23.44° (COT_OBLIQUITY = 2.30644456403329), is used
 * on all three screens.
 *
 * ── Conventions ──────────────────────────────────────────────────────────────
 *  - `day` = decimal day-of-year; Jan 1 00:00 UT = 1.0 (Jan 1 noon ≈ 1.5).
 *  - RA is returned in decimal hours [0, 24).
 *  - Declination is returned in degrees.
 *  - Hour angle is in hours, wrapped to [−12, 12].
 *  - All *Rad functions accept and return radians.
 *  - Altitude and azimuth are in radians.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Note: `getSolarAltitudeRad` and `getSolarAzimuthRad` duplicate the transforms
 * in SkyCoordinates.equatorialToHorizontal for cross-checking; production view
 * code should use SkyCoordinates.
 */

import { COT_OBLIQUITY, EOT_FUNDAMENTAL_RAD_PER_DAY } from "../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../MotionsOfTheSunNamespace.js";

// Fundamental angular rate: 2π / (mean tropical year ≈ 365.25 d) ≈ 0.017214 rad/day.
// Named `a` in the literature; equals EOT_FUNDAMENTAL_RAD_PER_DAY.
const a = EOT_FUNDAMENTAL_RAD_PER_DAY;

/**
 * Solar right ascension and declination for a given decimal day-of-year.
 *
 * The polynomial/Fourier expansion of RA matches `getPosition` in utils.js verbatim.
 * The declination is derived from RA via the obliquity: `dec = atan2(sin ra, cot ε)`.
 *
 * @param day - decimal day-of-year (Jan 1 00:00 UT = 1.0)
 * @returns `{ raHours, decDeg }` — right ascension in hours [0, 24), declination in degrees
 */
export const getSunPosition = (day: number): { raHours: number; decDeg: number } => {
  const ra =
    0.01721421 * day -
    1.3793756 -
    0.001830724 * Math.cos(a * day) +
    0.032070267 * Math.sin(a * day) +
    0.015952904 * Math.cos(2 * a * day) +
    0.04026479 * Math.sin(2 * a * day) +
    0.00044373354 * Math.cos(3 * a * day) +
    0.0013114725 * Math.sin(3 * a * day) +
    0.00064591583 * Math.cos(4 * a * day) +
    0.00070547099 * Math.sin(4 * a * day);

  const raHours = ((((12 / Math.PI) * ra) % 24) + 24) % 24;
  const decDeg = (180 / Math.PI) * Math.atan2(Math.sin(ra), COT_OBLIQUITY);

  return { raHours, decDeg };
};

/**
 * Equation of time in radians.
 *
 * Positive means the apparent sun is ahead of the mean sun (solar noon is early).
 * Transcribed verbatim from `getEqnOfTime` in utils.js.
 *
 * @param day - decimal day-of-year (Jan 1 00:00 UT = 1.0)
 */
export const getEqnOfTimeRad = (day: number): number =>
  -4.3796019e-6 +
  0.001830724 * Math.cos(a * day) -
  0.032070267 * Math.sin(a * day) -
  0.015952904 * Math.cos(2 * a * day) -
  0.04026479 * Math.sin(2 * a * day) -
  0.00044373354 * Math.cos(3 * a * day) -
  0.0013114725 * Math.sin(3 * a * day) -
  0.00064591583 * Math.cos(4 * a * day) -
  0.00070547099 * Math.sin(4 * a * day);

/**
 * Equation of time in decimal hours.
 * Positive: solar noon is early (sun ahead of clock).
 */
export const getEqnOfTimeHours = (day: number): number => getEqnOfTimeRad(day) * (12 / Math.PI);

/**
 * Equation of time in minutes.
 * Positive: solar noon is early; peaks around +16 min in early November.
 */
export const getEqnOfTimeMinutes = (day: number): number => getEqnOfTimeHours(day) * 60;

/**
 * Greenwich Mean Sidereal Time (GMST) for a given decimal day-of-year, in hours.
 *
 * Transcribed verbatim from `getSiderealTime` in utils.js.
 * Uses epoch offset 0.280464857844662 and sidereal rate 1.0027397260274 sid-day/solar-day.
 *
 * @param day - decimal day-of-year (Jan 1 00:00 UT = 1.0)
 * @returns GMST in hours [0, 24)
 */
export const getSiderealTimeHours = (day: number): number =>
  24 * ((((0.280464857844662 + 1.0027397260274 * day) % 1) + 1) % 1);

/**
 * Local hour angle of the Sun in hours, wrapped to [−12, 12].
 *
 * H = LST − RA; positive when the Sun is west of the meridian (afternoon).
 * Transcribed from `getHourAngle` in utils.js.
 *
 * @param siderealHours - local sidereal time in hours
 * @param raHours - solar right ascension in hours
 */
export const getHourAngleHours = (siderealHours: number, raHours: number): number => {
  let ha = (((siderealHours - raHours) % 24) + 24) % 24;
  if (ha > 12) {
    ha -= 24;
  }
  if (ha < -12) {
    ha += 24;
  }
  return ha;
};

/**
 * Solar altitude above the horizon in radians.
 *
 * Standard formula: sin(alt) = sin(lat)·sin(dec) + cos(lat)·cos(dec)·cos(H).
 * This duplicates `SkyCoordinates.equatorialToHorizontal` for cross-checking;
 * view code should use SkyCoordinates.
 *
 * @param latRad - observer latitude in radians (+N)
 * @param decRad - solar declination in radians
 * @param haRad  - solar hour angle in radians
 */
export const getSolarAltitudeRad = (latRad: number, decRad: number, haRad: number): number => {
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt)));
};

/**
 * Solar azimuth from North (increasing through East) in radians.
 *
 * The quadrant check uses the same rule as `getSolarAzimuth` in utils.js:
 * if H < 0 (morning) or H > π (late morning in radians? — mirroring the JS source
 * which uses hours converted to radians, equivalent to H < 0 h or H > 12 h), return
 * the raw acos; otherwise return 2π − acos (afternoon/PM).
 *
 * @param zenithRad - solar zenith angle (π/2 − altitude) in radians
 * @param haRad     - solar hour angle in radians
 * @param decRad    - solar declination in radians
 * @param latRad    - observer latitude in radians
 */
export const getSolarAzimuthRad = (zenithRad: number, haRad: number, decRad: number, latRad: number): number => {
  const cosPhi =
    (Math.sin(decRad) * Math.cos(latRad) - Math.cos(haRad) * Math.cos(decRad) * Math.sin(latRad)) / Math.sin(zenithRad);
  const az = Math.acos(Math.max(-1, Math.min(1, cosPhi)));
  return haRad < 0 || haRad > Math.PI ? az : 2 * Math.PI - az;
};

MotionsOfTheSunNamespace.register("SunEphemeris", {
  getSunPosition,
  getEqnOfTimeRad,
  getEqnOfTimeHours,
  getEqnOfTimeMinutes,
  getSiderealTimeHours,
  getHourAngleHours,
  getSolarAltitudeRad,
  getSolarAzimuthRad,
});
