/**
 * geocentricZodiacMath.ts
 *
 * Closed-form helpers for the lab geocentric Zodiac Explorer (`zodiac.swf` /
 * ZodiacViewer.as). Day-of-year is Flash calendar DOY in [0, 365) with Jan 1 = 0.
 *
 * Flash places the Sun and Earth on the horizon plane with latitude 66.5° and
 * LST = 18h so the north ecliptic pole sits at the zenith — that plane *is* the
 * ecliptic. Sun ecliptic longitude follows from the Flash azimuth formula.
 */

import { Vector3 } from "scenerystack/dot";
import { OBLIQUITY_DEG, SIDEREAL_RATE, VE_DOY_OFFSET } from "../../MotionsOfTheSunConstants.js";

/** Degrees of solar motion per calendar day (−360/365). */
export const ZODIAC_GEOCENTRIC_AZ_RATE_DEG = -360 / 365;

/** Phase offset so day 0 ≈ early January / Capricorn (Flash `+ 10.8`). */
export const ZODIAC_GEOCENTRIC_AZ_OFFSET_DAYS = 10.8;

/** Flash `zodiacBandHalfAngle` (degrees from ecliptic). */
export const ZODIAC_BAND_HALF_ANGLE_DEG = 24;

/** Flash default camera θ (degrees). */
export const ZODIAC_DEFAULT_THETA_DEG = 206;

/** Flash default camera φ (degrees). */
export const ZODIAC_DEFAULT_PHI_DEG = 30;

/** Flash `maxViewerAltitude` (degrees). */
export const ZODIAC_MAX_VIEWER_ALTITUDE_DEG = 50;

/** Flash sphere diameter (px) at `initZodiacSize`. */
export const ZODIAC_FLASH_SPHERE_DIAMETER = 600;

/** Flash Earth disc diameter (px) at `initEarthDiskSize`. */
export const ZODIAC_FLASH_EARTH_DISK_SIZE = 35;

const OBLIQUITY_RAD = OBLIQUITY_DEG * (Math.PI / 180);
const COS_EPS = Math.cos(OBLIQUITY_RAD);
const SIN_EPS = Math.sin(OBLIQUITY_RAD);
const TWO_PI = 2 * Math.PI;
const DEG = Math.PI / 180;

/**
 * Flash Earth azimuth on the ecliptic/horizon plane (degrees):
 * `az = −360/365 × (dayOfYear + 10.8)`.
 */
export const geocentricEarthAzDeg = (dayOfYear: number): number =>
  ZODIAC_GEOCENTRIC_AZ_RATE_DEG * (dayOfYear + ZODIAC_GEOCENTRIC_AZ_OFFSET_DAYS);

/**
 * Sun ecliptic longitude (radians) matching Flash Sun-on-rim placement.
 * Calibrated so March ~20 (VE) → λ ≈ 0 and late December (WS) → λ ≈ 270°.
 *
 * `λ_deg = −earthAz − 90`.
 */
export const geocentricSunLongitudeRad = (dayOfYear: number): number => {
  const earthAz = geocentricEarthAzDeg(dayOfYear);
  const lonDeg = -earthAz - 90;
  return (((lonDeg * DEG) % TWO_PI) + TWO_PI) % TWO_PI;
};

/**
 * Unit vector of a point on the ecliptic at longitude `lonRad` (β = 0), in the
 * equatorial frame (+Z = NCP, +X = RA 0h / vernal equinox).
 */
export const eclipticLongitudeToVector3 = (lonRad: number): Vector3 => eclipticToVector3(lonRad, 0);

/**
 * Ecliptic (longitude λ, latitude β) → unit vector in the equatorial frame.
 * Matches the β = 0 case used by Flash Sun placement.
 */
export const eclipticToVector3 = (lonRad: number, latRad: number): Vector3 => {
  const cosB = Math.cos(latRad);
  const sinB = Math.sin(latRad);
  const cosL = Math.cos(lonRad);
  const sinL = Math.sin(lonRad);
  const x = cosB * cosL;
  const yEcl = cosB * sinL;
  return new Vector3(x, yEcl * COS_EPS - sinB * SIN_EPS, yEcl * SIN_EPS + sinB * COS_EPS);
};

/** Flash `GlobeComponent.axisExtent` — polar axis length in Earth radii. */
export const ZODIAC_AXIS_EXTENT = 1.5;

/** Flash axis stroke width (px). */
export const ZODIAC_AXIS_LINE_WIDTH = 2;

/** Half-width (degrees along ecliptic) of the Flash day/night gradient blend. */
export const ZODIAC_BAND_GRADIENT_WIDTH_DEG = 15;

/**
 * Globe spin angle (radians) from Flash:
 * `siderealDay = dayOfYear × 1.002739…`; angle = frac × 2π.
 */
export const geocentricGlobeRotationRad = (dayOfYear: number): number => {
  const siderealDay = dayOfYear * SIDEREAL_RATE;
  const frac = ((siderealDay % 1) + 1) % 1;
  return frac * TWO_PI;
};

/**
 * Calendar day-of-year in [0, 365) from TimeMaster solar days since VE.
 * Matches ZodiacModel's month/day arithmetic (VE_DOY_OFFSET ≈ March 20).
 */
export const calendarDayOfYearFromDaysSinceVE = (daysSinceVE: number, solarTimeAtEpoch = 0.5): number => {
  const adjusted = daysSinceVE - solarTimeAtEpoch;
  return (((adjusted + VE_DOY_OFFSET) % 365) + 365) % 365;
};
