/**
 * attachDayTimeMirrors.test.ts
 *
 * Dragging time-of-day to 24 h advances dayOfYear to the next midnight; without
 * a syncing guard axon reenters timeProperty (0 vs 24) under ?ea.
 */
import { enableAssert } from "scenerystack/assert";
import { NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { attachDayTimeMirrors } from "../src/sun-paths/view/attachDayTimeMirrors.js";

enableAssert();

describe("attachDayTimeMirrors", () => {
  it("does not reenter timeProperty when the slider hits 24 h", async () => {
    const dayOfYearProperty = new NumberProperty(146.5, { range: new Range(0, 365) });
    const dayProperty = new NumberProperty(146, { range: new Range(0, 364) });
    const timeProperty = new NumberProperty(12, { range: new Range(0, 24) });
    attachDayTimeMirrors(dayOfYearProperty, dayProperty, timeProperty);

    expect(() => {
      timeProperty.value = 24;
    }).not.toThrow();
    await Promise.resolve();
    expect(dayOfYearProperty.value).toBeCloseTo(147, 6);
    expect(dayProperty.value).toBe(147);
    expect(timeProperty.value).toBeCloseTo(0, 6);
  });
});
