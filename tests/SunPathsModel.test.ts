/**
 * SunPathsModel.test.ts
 *
 * Tests for SunPathsModel — verifies initial ephemeris values, loop-day
 * behaviour, step/advanceSiderealTime, and hour-angle at default noon.
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_DAY_OF_YEAR, DEFAULT_LATITUDE, STEP_DAYS_PER_SECOND } from "../src/MotionsOfTheSunConstants.js";
import { SunPathsModel } from "../src/sun-paths/model/SunPathsModel.js";

/** Real seconds needed to accrue exactly one whole day at NORMAL speed. */
const ONE_DAY_SECONDS: number = 1 / STEP_DAYS_PER_SECOND;

describe("SunPathsModel", () => {
  it("initial altitude ≈ 70.5° at default noon (day 147.5, lat 40.8°)", () => {
    const model = new SunPathsModel();
    expect(model.dayOfYearProperty.value).toBeCloseTo(DEFAULT_DAY_OF_YEAR, 5);
    expect(model.latitudeProperty.value).toBeCloseTo(DEFAULT_LATITUDE, 5);

    const alt = model.sunAltDegProperty.value;
    expect(alt).toBeGreaterThan(70.0);
    expect(alt).toBeLessThan(71.0);
  });

  it("initial azimuth ≈ 180° (Sun due south at noon, lat 40.8°)", () => {
    const model = new SunPathsModel();
    const az = model.sunAzDegProperty.value;
    // Should be near 180°
    expect(az).toBeGreaterThan(177);
    expect(az).toBeLessThan(183);
  });

  it("initial declination ≈ 21.3° at day 147.5", () => {
    const model = new SunPathsModel();
    const dec = model.sunDecDegProperty.value;
    expect(dec).toBeGreaterThan(20.6);
    expect(dec).toBeLessThan(22.0);
  });

  it("initial hour angle ≈ 0 ± 0.3 h at default noon", () => {
    const model = new SunPathsModel();
    const ha = model.hourAngleHoursProperty.value;
    expect(Math.abs(ha)).toBeLessThan(0.3);
  });

  it("loopDay keeps floor(dayOfYear) constant over 100 steps", () => {
    const model = new SunPathsModel();
    model.loopDayProperty.value = true;
    model.timer.isPlayingProperty.value = true;

    const initialIntDay = Math.floor(model.dayOfYearProperty.value);
    for (let i = 0; i < 100; i++) {
      model.step(0.1);
    }
    const finalIntDay = Math.floor(model.dayOfYearProperty.value);
    expect(finalIntDay).toBe(initialIntDay);
  });

  it("step advances dayOfYear when playing (no loop)", () => {
    const model = new SunPathsModel();
    model.timer.isPlayingProperty.value = true;

    const initial = model.dayOfYearProperty.value;
    model.step(1.0); // 1 real second at NORMAL speed = 3 h / 24 = 0.125 days
    const after = model.dayOfYearProperty.value;
    expect(after).toBeGreaterThan(initial);
  });

  it("step does not advance dayOfYear when paused", () => {
    const model = new SunPathsModel();
    // timer starts paused
    const initial = model.dayOfYearProperty.value;
    model.step(1.0);
    expect(model.dayOfYearProperty.value).toBeCloseTo(initial, 10);
  });

  it("advanceSiderealTime moves dayOfYear by the equivalent solar increment", () => {
    const model = new SunPathsModel();
    const before = model.dayOfYearProperty.value;
    const sidHours = 1.0;
    model.advanceSiderealTime(sidHours);
    const after = model.dayOfYearProperty.value;
    const expectedDelta = sidHours / 24 / 1.0027397260274;
    expect(after - before).toBeCloseTo(expectedDelta, 8);
  });

  it("step-by-day advances by whole days while holding time-of-day fixed", () => {
    const model = new SunPathsModel();
    model.animationModeProperty.value = "stepByDay";
    model.timer.isPlayingProperty.value = true;

    const initial = model.dayOfYearProperty.value; // 147.5
    const initialFrac = initial % 1; // 0.5 (noon)
    model.step(ONE_DAY_SECONDS); // accrues exactly one whole day
    expect(model.dayOfYearProperty.value).toBeCloseTo(initial + 1, 6);
    // Time-of-day fraction is preserved (only the calendar date advanced).
    expect(model.dayOfYearProperty.value % 1).toBeCloseTo(initialFrac, 6);
  });

  it("step-by-day does not advance until a full day has accrued", () => {
    const model = new SunPathsModel();
    model.animationModeProperty.value = "stepByDay";
    model.timer.isPlayingProperty.value = true;

    const initial = model.dayOfYearProperty.value;
    model.step(ONE_DAY_SECONDS * 0.4); // partial day — no change yet
    expect(model.dayOfYearProperty.value).toBeCloseTo(initial, 10);
    model.step(ONE_DAY_SECONDS * 0.7); // total 1.1 days → one whole-day step
    expect(model.dayOfYearProperty.value).toBeCloseTo(initial + 1, 6);
  });

  it("pausing clears the step-by-day accumulator (no carry-over)", () => {
    const model = new SunPathsModel();
    model.animationModeProperty.value = "stepByDay";
    model.timer.isPlayingProperty.value = true;

    const initial = model.dayOfYearProperty.value;
    model.step(ONE_DAY_SECONDS * 0.9); // accrue 0.9 day, still below one day
    model.timer.isPlayingProperty.value = false; // pause resets accumulator
    model.timer.isPlayingProperty.value = true;
    model.step(ONE_DAY_SECONDS * 0.5); // only 0.5 day since resume → no advance
    expect(model.dayOfYearProperty.value).toBeCloseTo(initial, 10);
  });

  it("reset restores default values", () => {
    const model = new SunPathsModel();
    model.dayOfYearProperty.value = 1;
    model.latitudeProperty.value = -33;
    model.loopDayProperty.value = true;
    model.animationModeProperty.value = "stepByDay";
    model.reset();

    expect(model.dayOfYearProperty.value).toBeCloseTo(DEFAULT_DAY_OF_YEAR, 5);
    expect(model.latitudeProperty.value).toBeCloseTo(DEFAULT_LATITUDE, 5);
    expect(model.loopDayProperty.value).toBe(false);
    expect(model.animationModeProperty.value).toBe("continuous");
  });

  it("sunDragMode defaults to timeOfDay, enables analemma in dayOfYear, and resets", () => {
    const model = new SunPathsModel();
    expect(model.sunDragModeProperty.value).toBe("timeOfDay");
    model.sunDragModeProperty.value = "dayOfYear";
    expect(model.showAnalemmaProperty.value).toBe(true);
    model.reset();
    expect(model.sunDragModeProperty.value).toBe("timeOfDay");
  });
});
