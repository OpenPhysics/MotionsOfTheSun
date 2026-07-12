/**
 * geocentricZodiacMath.test.ts
 *
 * Parity checks for Flash ZodiacViewer day → ecliptic formulas.
 */

import { describe, expect, it } from "vitest";
import { VE_DOY_OFFSET } from "../src/MotionsOfTheSunConstants.js";
import {
  calendarDayOfYearFromDaysSinceVE,
  eclipticLongitudeToVector3,
  eclipticToVector3,
  geocentricEarthAzDeg,
  geocentricGlobeRotationRad,
  geocentricSunLongitudeRad,
  ZODIAC_AXIS_EXTENT,
  ZODIAC_BAND_HALF_ANGLE_DEG,
} from "../src/zodiac/model/geocentricZodiacMath.js";

const DEG: number = Math.PI / 180;

describe("geocentricZodiacMath", () => {
  it("Flash earth az at day 0 matches −360/365 × 10.8", () => {
    expect(geocentricEarthAzDeg(0)).toBeCloseTo((-360 / 365) * 10.8, 10);
  });

  it("winter-solstice-ish day → sun λ ≈ 270°", () => {
    // doy + 10.8 ≡ 0 (mod 365) ⇒ WS phase; λ = −az − 90 → 270°.
    const doy = (365 - 10.8) % 365;
    const lon = geocentricSunLongitudeRad(doy);
    expect(lon / DEG).toBeCloseTo(270, 0);
  });

  it("vernal-equinox calendar day → sun λ ≈ 0°", () => {
    const lon = geocentricSunLongitudeRad(VE_DOY_OFFSET);
    // Calibrated to within ~2° of the equinox (Flash phase vs VE_DOY_OFFSET).
    const wrapped = ((lon / DEG + 180) % 360) - 180;
    expect(Math.abs(wrapped)).toBeLessThan(3);
  });

  it("ecliptic lon 0 → unit vector near +X (RA 0h, Dec 0°)", () => {
    const v = eclipticLongitudeToVector3(0);
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it("ecliptic lon 90° → Dec ≈ +obliquity", () => {
    const v = eclipticLongitudeToVector3(Math.PI / 2);
    const dec = (Math.asin(v.z) * 180) / Math.PI;
    expect(dec).toBeCloseTo(23.44, 1);
  });

  it("eclipticToVector3(λ, ±24°) differs in signed ecliptic latitude", () => {
    const half = (ZODIAC_BAND_HALF_ANGLE_DEG * Math.PI) / 180;
    const n = eclipticToVector3(0, half);
    const s = eclipticToVector3(0, -half);
    expect(n.x).toBeCloseTo(Math.cos(half), 5);
    expect(s.x).toBeCloseTo(Math.cos(half), 5);
    expect(n.z).toBeGreaterThan(s.z);
  });

  it("axis extent matches Flash GlobeComponent", () => {
    expect(ZODIAC_AXIS_EXTENT).toBe(1.5);
  });

  it("globe rotation wraps to [0, 2π)", () => {
    const r = geocentricGlobeRotationRad(10.5);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(2 * Math.PI);
  });

  it("calendar DOY from days-since-VE at epoch noon ≈ VE_DOY_OFFSET", () => {
    // solarDaysSinceVE = 0.5 at reset; adjusted = 0 → doy = VE_DOY_OFFSET.
    expect(calendarDayOfYearFromDaysSinceVE(0.5)).toBeCloseTo(VE_DOY_OFFSET, 10);
  });
});
