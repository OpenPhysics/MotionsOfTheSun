/**
 * analemmaClosestDay.test.ts
 *
 * Sanity checks for the Flash setClosestDay nearest-neighbour search.
 */

import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { equatorialToHorizonVector } from "../src/common/SkyCoordinates.js";
import { SkyProjection } from "../src/common/SkyProjection.js";
import { getEqnOfTimeHours, getSunPosition } from "../src/common/SunEphemeris.js";
import { DEFAULT_LATITUDE } from "../src/MotionsOfTheSunConstants.js";
import { findClosestAnalemmaDay } from "../src/sun-paths/view/analemmaClosestDay.js";

describe("findClosestAnalemmaDay", () => {
  it("returns the day whose analemma sample projects nearest the pointer", () => {
    const projection = new SkyProjection({
      center: new Vector2(0, 0),
      radius: 170,
      elevation: -0.4,
      azimuth: Math.PI,
    });
    const lat = DEFAULT_LATITUDE;
    const dayFrac = 0.5; // noon
    const targetDay = 172; // near June solstice
    const T = dayFrac * 24;
    const { raHours, decDeg } = getSunPosition(targetDay);
    const H = T - 12 + getEqnOfTimeHours(targetDay);
    const lst = raHours + H;
    const world = equatorialToHorizonVector(raHours, decDeg, lat, lst);
    const { point } = projection.projectWithDepth(world);

    const found = findClosestAnalemmaDay(point, projection, lat, dayFrac);
    // Allow a few days of tolerance — discrete sampling + projection rounding.
    expect(Math.abs(found - targetDay)).toBeLessThanOrEqual(3);
  });
});
