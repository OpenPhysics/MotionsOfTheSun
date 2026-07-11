/**
 * SiderealSolarTimeModel.test.ts
 *
 * Unit tests for SiderealSolarTimeModel (Phase 2, Step 2.2).
 * Gate: 4 s play at NORMAL → +1.0 solar day; jump pauses play;
 *       `isAtNoon` true initially.
 */

import { TimeSpeed } from "scenerystack/scenery-phet";
import { describe, expect, it } from "vitest";
import { SOLAR_DAYS_PER_SECOND, SOLAR_TIME_AT_EPOCH } from "../src/MotionsOfTheSunConstants.js";
import { SiderealSolarTimeModel } from "../src/sidereal-solar-time/model/SiderealSolarTimeModel.js";

describe("SiderealSolarTimeModel", () => {
  it("starts at solar noon on the vernal equinox (isAtNoon = true)", () => {
    const model = new SiderealSolarTimeModel();
    expect(model.timeMaster.isAtNoonProperty.value).toBe(true);
    expect(model.timeMaster.solarTimeProperty.value).toBeCloseTo(SOLAR_TIME_AT_EPOCH, 10);
    expect(model.timeMaster.solarDaysSinceVernalEquinoxProperty.value).toBeCloseTo(0, 10);
  });

  it("4 s of continuous play at NORMAL speed → +1.0 solar day", () => {
    const model = new SiderealSolarTimeModel();
    model.timer.isPlayingProperty.value = true;
    model.timeSpeedProperty.value = TimeSpeed.NORMAL;

    // SOLAR_DAYS_PER_SECOND = 0.25 × 1 (NORMAL) × 4 s = 1.0 day
    const expectedDays = SOLAR_DAYS_PER_SECOND * 1 * 4;

    const startSolar = model.timeMaster.solarTimeProperty.value;
    for (let i = 0; i < 400; i++) {
      model.step(4 / 400); // 400 frames at dt = 0.01 s
    }

    const elapsed = model.timeMaster.solarTimeProperty.value - startSolar;
    expect(elapsed).toBeCloseTo(expectedDays, 4);
  });

  it("play at SLOW speed is 0.25× normal rate", () => {
    const model = new SiderealSolarTimeModel();
    model.timer.isPlayingProperty.value = true;
    model.timeSpeedProperty.value = TimeSpeed.SLOW;

    const startSolar = model.timeMaster.solarTimeProperty.value;
    model.step(4);
    const elapsed = model.timeMaster.solarTimeProperty.value - startSolar;

    // 0.25 solar days/s × 0.25 multiplier × 4 s = 0.25 solar days
    expect(elapsed).toBeCloseTo(SOLAR_DAYS_PER_SECOND * 0.25 * 4, 4);
  });

  it("play at FAST speed is 4× normal rate", () => {
    const model = new SiderealSolarTimeModel();
    model.timer.isPlayingProperty.value = true;
    model.timeSpeedProperty.value = TimeSpeed.FAST;

    const startSolar = model.timeMaster.solarTimeProperty.value;
    model.step(4);
    const elapsed = model.timeMaster.solarTimeProperty.value - startSolar;

    // 0.25 solar days/s × 4 multiplier × 4 s = 4.0 solar days
    expect(elapsed).toBeCloseTo(SOLAR_DAYS_PER_SECOND * 4 * 4, 4);
  });

  it("starting an eased jump pauses the timer", () => {
    const model = new SiderealSolarTimeModel();
    model.timer.isPlayingProperty.value = true;

    expect(model.timer.isPlayingProperty.value).toBe(true);

    // Fire a 1-second animated jump
    model.timeMaster.incrementSolarTime(1, 1.0);

    // The lazyLink on isAnimatingProperty should have paused the timer
    expect(model.timer.isPlayingProperty.value).toBe(false);
  });

  it("stepForward() advances by one solar hour (1/24 day) instantly", () => {
    const model = new SiderealSolarTimeModel();
    const before = model.timeMaster.solarTimeProperty.value;
    model.stepForward();
    const after = model.timeMaster.solarTimeProperty.value;
    expect(after - before).toBeCloseTo(1 / 24, 8);
  });

  it("reset() returns to epoch, NORMAL speed, paused", () => {
    const model = new SiderealSolarTimeModel();
    model.timer.isPlayingProperty.value = true;
    model.timeSpeedProperty.value = TimeSpeed.FAST;
    model.step(10);

    model.reset();

    expect(model.timeMaster.solarTimeProperty.value).toBeCloseTo(SOLAR_TIME_AT_EPOCH, 10);
    expect(model.timer.isPlayingProperty.value).toBe(false);
    expect(model.timeSpeedProperty.value).toBe(TimeSpeed.NORMAL);
  });

  it("does not advance solar time while an animation is running", () => {
    const model = new SiderealSolarTimeModel();
    // Start playing and fire an animated jump
    model.timer.isPlayingProperty.value = true;
    model.timeMaster.setSolarTime(1.5, 2.0); // 2-second animation
    // isAnimatingProperty is now true; timer should have been paused
    expect(model.timeMaster.isAnimatingProperty.value).toBe(true);

    const before = model.timeMaster.solarTimeProperty.value;
    // step while timer is paused — only animation progresses, not free-play
    model.step(0.5);
    // Solar time advanced due to animation, not continuous playback
    // Value is strictly between start and target
    expect(model.timeMaster.solarTimeProperty.value).toBeGreaterThan(before);
    expect(model.timeMaster.solarTimeProperty.value).toBeLessThan(1.5);
  });
});
