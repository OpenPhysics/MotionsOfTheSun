/**
 * SunEphemeris.test.ts
 *
 * Unit tests for the closed-form solar position engine. These pin down the
 * expected behaviour that view code and derived models rely on.
 *
 * Day arguments use the Flash / Siedell 0-based DOY convention (Jan 1 = 0).
 *
 * Test numbering matches the porting-plan §Step 1.1 specification:
 *  1. Equinox position
 *  2. Solstice positions
 *  3. Equation of time extrema and zero crossing
 *  4. Sidereal drift (≈ 3.94 min/day)
 *  5. Transit altitude identity: alt at H=0 ≈ 90° − |lat − dec|
 *  6. Cross-check vs SkyCoordinates.equatorialToHorizontal (1e-6 tolerance)
 */

import { describe, expect, it } from "vitest";
import { equatorialToHorizontal } from "../src/common/SkyCoordinates.js";
import {
  getEqnOfTimeMinutes,
  getSiderealTimeHours,
  getSolarAltitudeRad,
  getSolarAzimuthRad,
  getSunPosition,
} from "../src/common/SunEphemeris.js";

// ── Helper ───────────────────────────────────────────────────────────────────

const DEG: number = Math.PI / 180;

// ── Flash default date parity ────────────────────────────────────────────────

describe("getSunPosition — Flash default May 27 noon (day 146.5)", () => {
  it("matches Solar Position Functions.as / Simulation Master default", () => {
    const { raHours, decDeg } = getSunPosition(146.5);
    expect(raHours).toBeCloseTo(4.316966, 5);
    expect(decDeg).toBeCloseTo(21.41298, 4);
  });
});

// ── Test 1: Equinox ──────────────────────────────────────────────────────────

describe("getSunPosition — equinox (day 78.9)", () => {
  it("has |dec| < 1° near the vernal equinox", () => {
    const { decDeg } = getSunPosition(78.9);
    expect(Math.abs(decDeg)).toBeLessThan(1);
  });

  it("has RA within 0.5 h of 0h / 24h near the vernal equinox", () => {
    const { raHours } = getSunPosition(78.9);
    // raHours is in [0, 24); check distance from 0 (≡ 24)
    const distFrom0 = Math.min(raHours, 24 - raHours);
    expect(distFrom0).toBeLessThan(0.5);
  });
});

// ── Test 2: Solstices ────────────────────────────────────────────────────────

describe("getSunPosition — summer solstice (day 171)", () => {
  it("has dec ≈ +23.44° ± 0.5", () => {
    const { decDeg } = getSunPosition(171);
    expect(decDeg).toBeGreaterThan(23.44 - 0.5);
    expect(decDeg).toBeLessThan(23.44 + 0.5);
  });

  it("has RA ≈ 6h ± 0.4", () => {
    const { raHours } = getSunPosition(171);
    expect(raHours).toBeGreaterThan(6 - 0.4);
    expect(raHours).toBeLessThan(6 + 0.4);
  });
});

describe("getSunPosition — winter solstice (day 354.5)", () => {
  it("has dec ≈ −23.44° ± 0.5", () => {
    const { decDeg } = getSunPosition(354.5);
    expect(decDeg).toBeGreaterThan(-23.44 - 0.5);
    expect(decDeg).toBeLessThan(-23.44 + 0.5);
  });

  it("has RA ≈ 18h ± 0.4", () => {
    const { raHours } = getSunPosition(354.5);
    expect(raHours).toBeGreaterThan(18 - 0.4);
    expect(raHours).toBeLessThan(18 + 0.4);
  });
});

// ── Test 3: Equation of time extrema and zero crossing ───────────────────────

describe("getEqnOfTimeMinutes — extrema and zero crossing", () => {
  it("early November (day 306): |EoT| ∈ [14, 18] min", () => {
    const eot = getEqnOfTimeMinutes(306);
    expect(Math.abs(eot)).toBeGreaterThan(14);
    expect(Math.abs(eot)).toBeLessThan(18);
  });

  it("mid February (day 41): |EoT| ∈ [12, 16] min", () => {
    const eot = getEqnOfTimeMinutes(41);
    expect(Math.abs(eot)).toBeGreaterThan(12);
    expect(Math.abs(eot)).toBeLessThan(16);
  });

  it("November and February peaks have opposite signs", () => {
    const novEot = getEqnOfTimeMinutes(306);
    const febEot = getEqnOfTimeMinutes(41);
    expect(novEot * febEot).toBeLessThan(0);
  });

  it("mid April (day 105): |EoT| < 2 min (zero crossing)", () => {
    const eot = getEqnOfTimeMinutes(105);
    expect(Math.abs(eot)).toBeLessThan(2);
  });
});

// ── Test 4: Sidereal drift ───────────────────────────────────────────────────

describe("getSiderealTimeHours — daily drift", () => {
  const days = [0, 50, 150, 200, 300];
  for (const d of days) {
    it(`sidereal advances ≈ 0.0658 h over one solar day at day ${d}`, () => {
      const h0 = getSiderealTimeHours(d);
      const h1 = getSiderealTimeHours(d + 1);
      const drift = (((h1 - h0 + 24) % 24) + 24) % 24;
      // 1 sidereal day = 23h 56m 4s ≈ 23.934 h; so drift vs solar = 24 − 23.934 ≈ 0.0658 h
      expect(drift).toBeGreaterThan(0.0655);
      expect(drift).toBeLessThan(0.0661);
    });
  }
});

// ── Test 5: Transit altitude identity ────────────────────────────────────────

describe("getSolarAltitudeRad — transit altitude identity", () => {
  it("at H = 0 (transit), alt ≈ 90° − |lat − dec| (lat 40.8°, day 146.5)", () => {
    // day 146.5 = May 27 noon (Flash); default latitude 40.8° N
    const lat = 40.8 * DEG;
    const { decDeg } = getSunPosition(146.5);
    const dec = decDeg * DEG;
    const altRad = getSolarAltitudeRad(lat, dec, 0); // H = 0 at transit
    const altDeg = (180 / Math.PI) * altRad;
    const expected = 90 - Math.abs(40.8 - decDeg);
    expect(altDeg).toBeGreaterThan(expected - 0.5);
    expect(altDeg).toBeLessThan(expected + 0.5);
  });
});

// ── Test 6: Cross-check vs SkyCoordinates.equatorialToHorizontal ─────────────

describe("getSolarAltitudeRad / getSolarAzimuthRad cross-check vs SkyCoordinates", () => {
  // Five (lat°, dec°, H h) triples
  const cases: [number, number, number][] = [
    [40.8, 21.3, 0], // transit at lat 40.8, summer-ish dec
    [40.8, 21.3, -3], // morning
    [40.8, -10, 2], // winter afternoon
    [0, 0, 6], // equator, equatorial star setting
    [60, 23.44, -2], // high latitude, summer morning
  ];

  for (const [latDeg, decDeg, haH] of cases) {
    it(`lat=${latDeg} dec=${decDeg} H=${haH}h matches SkyCoordinates to 1e-6`, () => {
      const latRad = latDeg * DEG;
      const decRad = decDeg * DEG;
      const haRad = (haH / 24) * 2 * Math.PI;

      // SunEphemeris alt/az
      const altRad = getSolarAltitudeRad(latRad, decRad, haRad);
      const zenithRad = Math.PI / 2 - altRad;
      const azRad = getSolarAzimuthRad(zenithRad, haRad, decRad, latRad);

      // SkyCoordinates via hour-angle → LST trick: LST = RA + H; use arbitrary RA = 6h
      const raHours = 6;
      const lstHours = raHours + haH;
      const { altDeg: altDegSC, azDeg: azDegSC } = equatorialToHorizontal(raHours, decDeg, latDeg, lstHours);

      const altDegEph = (180 / Math.PI) * altRad;
      const azDegEph = (180 / Math.PI) * azRad;

      expect(altDegEph).toBeCloseTo(altDegSC, 5);
      expect(azDegEph).toBeCloseTo(azDegSC, 5);
    });
  }
});
