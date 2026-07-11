/**
 * TimeMaster.test.ts
 *
 * Unit tests for the TimeMaster solar/sidereal time model.
 * Test numbering matches the porting-plan §Step 1.2 specification:
 *
 *  1. Year-wrap: +365 solar days (SIMPLE) / +365.25 (JULIAN) → sidereal +366/+366.25,
 *     solarDaysSinceVE wraps to 0.
 *  2. Epoch check: getSiderealTimeForSolarTime(0.5) === 0; solar↔sidereal round-trip.
 *  3. goToFractionOfYear(0.25) → lands at SS, isAtSummerSolstice true, moves forward.
 *  4. Already-at-fraction edge → advances a full day / full year.
 *  5. Easing determinism: setSolarTime(1.5, 1.0) + 60 × step(1/60) → exactly 1.5;
 *     mid-animation value is strictly between start and target.
 *  6. incrementSiderealTime(1) in SIMPLE advances solar by 365/366 days.
 */

import { describe, expect, it } from "vitest";
import { TimeMaster } from "../src/common/model/TimeMaster.js";
import { JULIAN_TROPICAL_YEAR, SIMPLE_TROPICAL_YEAR, SOLAR_TIME_AT_EPOCH } from "../src/MotionsOfTheSunConstants.js";

// ── Test 1: Year-wrap ────────────────────────────────────────────────────────

describe("TimeMaster — SIMPLE year wrap", () => {
  it("+365 solar days → solarDaysSinceVE wraps back to 0", () => {
    const tm = new TimeMaster();
    tm.incrementSolarTime(365);
    expect(tm.solarDaysSinceVernalEquinoxProperty.value).toBeCloseTo(0, 10);
  });

  it("+365 solar days → sidereal time advances by exactly 366 days", () => {
    const tm = new TimeMaster();
    const sidBefore = tm.siderealTimeProperty.value;
    tm.incrementSolarTime(365);
    const sidAfter = tm.siderealTimeProperty.value;
    expect(sidAfter - sidBefore).toBeCloseTo(366, 10);
  });

  it("isAtVernalEquinox is true after exactly +365 solar days", () => {
    const tm = new TimeMaster();
    tm.incrementSolarTime(365);
    expect(tm.isAtVernalEquinoxProperty.value).toBe(true);
  });
});

describe("TimeMaster — JULIAN year wrap", () => {
  it("+365.25 solar days → solarDaysSinceVE wraps back to 0", () => {
    const tm = new TimeMaster();
    tm.modeProperty.value = "julian";
    tm.incrementSolarTime(365.25);
    expect(tm.solarDaysSinceVernalEquinoxProperty.value).toBeCloseTo(0, 10);
  });

  it("+365.25 solar days → sidereal time advances by exactly 366.25 days", () => {
    const tm = new TimeMaster();
    tm.modeProperty.value = "julian";
    // Mode change resets to 0.5; capture sidereal after mode set
    const sidBefore = tm.siderealTimeProperty.value;
    tm.incrementSolarTime(365.25);
    const sidAfter = tm.siderealTimeProperty.value;
    expect(sidAfter - sidBefore).toBeCloseTo(366.25, 10);
  });
});

// ── Test 2: Epoch check and round-trip ───────────────────────────────────────

describe("TimeMaster — epoch and round-trip conversions", () => {
  it("getSiderealTimeForSolarTime(0.5) === 0 (epoch definition)", () => {
    const tm = new TimeMaster();
    expect(tm.getSiderealTimeForSolarTime(SOLAR_TIME_AT_EPOCH)).toBe(0);
  });

  it("solar → sidereal → solar round-trips to 1e-12 (SIMPLE)", () => {
    const tm = new TimeMaster();
    const solar = 42.75;
    const sid = tm.getSiderealTimeForSolarTime(solar);
    const back = tm.getSolarTimeForSiderealTime(sid);
    expect(back).toBeCloseTo(solar, 12);
  });

  it("solar → sidereal → solar round-trips to 1e-12 (JULIAN)", () => {
    const tm = new TimeMaster();
    tm.modeProperty.value = "julian";
    const solar = 100.25;
    const sid = tm.getSiderealTimeForSolarTime(solar);
    const back = tm.getSolarTimeForSiderealTime(sid);
    expect(back).toBeCloseTo(solar, 12);
  });

  it("siderealTimeProperty.value === getSiderealTimeForSolarTime(solarTimeProperty.value)", () => {
    const tm = new TimeMaster();
    tm.incrementSolarTime(30.7);
    expect(tm.siderealTimeProperty.value).toBeCloseTo(tm.getSiderealTimeForSolarTime(tm.solarTimeProperty.value), 12);
  });
});

// ── Test 3: goToFractionOfYear(0.25) → Summer Solstice ──────────────────────

describe("TimeMaster — goToFractionOfYear(0.25)", () => {
  it("lands at solarDaysSinceVE === 0.25 × tropicalYear", () => {
    const tm = new TimeMaster();
    tm.goToFractionOfYear(0.25);
    expect(tm.solarDaysSinceVernalEquinoxProperty.value).toBeCloseTo(0.25 * SIMPLE_TROPICAL_YEAR, 10);
  });

  it("isAtSummerSolstice becomes true", () => {
    const tm = new TimeMaster();
    tm.goToFractionOfYear(0.25);
    expect(tm.isAtSummerSolsticeProperty.value).toBe(true);
  });

  it("other season isAt* are false", () => {
    const tm = new TimeMaster();
    tm.goToFractionOfYear(0.25);
    expect(tm.isAtVernalEquinoxProperty.value).toBe(false);
    expect(tm.isAtAutumnalEquinoxProperty.value).toBe(false);
    expect(tm.isAtWinterSolsticeProperty.value).toBe(false);
  });

  it("always moves forward: result > starting solar time", () => {
    const tm = new TimeMaster();
    const before = tm.solarTimeProperty.value;
    tm.goToFractionOfYear(0.25);
    expect(tm.solarTimeProperty.value).toBeGreaterThan(before);
  });
});

// ── Test 4: Already-at-fraction edge cases ───────────────────────────────────

describe("TimeMaster — already-at-fraction edge", () => {
  it("goToSolarTimeOfDay(0.5) when already at noon advances one full solar day", () => {
    const tm = new TimeMaster();
    // Initial state: solarTime = 0.5 (exactly noon)
    expect(tm.isAtNoonProperty.value).toBe(true);
    const before = tm.solarTimeProperty.value;
    tm.goToSolarTimeOfDay(0.5);
    // Should advance to the next noon (+ 1 day)
    expect(tm.solarTimeProperty.value).toBeCloseTo(before + 1, 10);
  });

  it("goToFractionOfYear(0) when already at VE advances one full tropical year", () => {
    const tm = new TimeMaster();
    // Initial state: solarDaysSinceVE = 0 (exactly VE)
    expect(tm.isAtVernalEquinoxProperty.value).toBe(true);
    const before = tm.solarTimeProperty.value;
    tm.goToFractionOfYear(0);
    expect(tm.solarTimeProperty.value).toBeCloseTo(before + SIMPLE_TROPICAL_YEAR, 10);
  });
});

// ── Test 5: Easing determinism ────────────────────────────────────────────────

describe("TimeMaster — easing determinism", () => {
  it("setSolarTime(1.5, 1.0) + 60 × step(1/60) → exactly 1.5", () => {
    const tm = new TimeMaster();
    const target = 1.5;
    tm.setSolarTime(target, 1.0);
    for (let i = 0; i < 60; i++) {
      tm.step(1 / 60);
    }
    expect(tm.solarTimeProperty.value).toBe(target);
    expect(tm.isAnimatingProperty.value).toBe(false);
  });

  it("value at step 30 of 60 is strictly between start and target", () => {
    const tm = new TimeMaster();
    const start = tm.solarTimeProperty.value; // 0.5
    const target = 1.5;
    tm.setSolarTime(target, 1.0);
    for (let i = 0; i < 30; i++) {
      tm.step(1 / 60);
    }
    const mid = tm.solarTimeProperty.value;
    expect(mid).toBeGreaterThan(start);
    expect(mid).toBeLessThan(target);
    expect(tm.isAnimatingProperty.value).toBe(true);
  });

  it("isAnimatingProperty.value is true during animation and false after", () => {
    const tm = new TimeMaster();
    tm.setSolarTime(2.0, 1.0);
    expect(tm.isAnimatingProperty.value).toBe(true);
    for (let i = 0; i < 60; i++) {
      tm.step(1 / 60);
    }
    expect(tm.isAnimatingProperty.value).toBe(false);
  });
});

// ── Test 6: incrementSiderealTime ────────────────────────────────────────────

describe("TimeMaster — incrementSiderealTime", () => {
  it("in SIMPLE mode, +1 sidereal day advances solar by 365/366 days", () => {
    const tm = new TimeMaster();
    const solarBefore = tm.solarTimeProperty.value;
    tm.incrementSiderealTime(1);
    const solarAfter = tm.solarTimeProperty.value;
    const expectedDelta = SIMPLE_TROPICAL_YEAR / (SIMPLE_TROPICAL_YEAR + 1);
    expect(solarAfter - solarBefore).toBeCloseTo(expectedDelta, 10);
  });

  it("in JULIAN mode, +1 sidereal day advances solar by 365.25/366.25 days", () => {
    const tm = new TimeMaster();
    tm.modeProperty.value = "julian";
    const solarBefore = tm.solarTimeProperty.value;
    tm.incrementSiderealTime(1);
    const solarAfter = tm.solarTimeProperty.value;
    const expectedDelta = JULIAN_TROPICAL_YEAR / (JULIAN_TROPICAL_YEAR + 1);
    expect(solarAfter - solarBefore).toBeCloseTo(expectedDelta, 10);
  });
});

// ── Test 7: reset() ──────────────────────────────────────────────────────────

describe("TimeMaster — reset()", () => {
  it("resets solarTime to 0.5 and cancels animation", () => {
    const tm = new TimeMaster();
    tm.setSolarTime(10.25, 2.0);
    tm.reset();
    expect(tm.solarTimeProperty.value).toBe(SOLAR_TIME_AT_EPOCH);
    expect(tm.isAnimatingProperty.value).toBe(false);
  });

  it("resets mode to 'simple'", () => {
    const tm = new TimeMaster();
    tm.modeProperty.value = "julian";
    tm.reset();
    expect(tm.modeProperty.value).toBe("simple");
  });

  it("isAtNoon is true after reset", () => {
    const tm = new TimeMaster();
    tm.incrementSolarTime(0.3);
    tm.reset();
    expect(tm.isAtNoonProperty.value).toBe(true);
  });
});
