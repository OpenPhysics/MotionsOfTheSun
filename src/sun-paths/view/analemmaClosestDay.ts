/**
 * analemmaClosestDay.ts
 *
 * Finds the calendar day whose analemma position (at a fixed mean clock time)
 * is closest to a screen pointer — the Flash `Analemma Curve.setClosestDay`
 * behaviour used when sun-drag mode is "day of year".
 */

import type { Vector2 } from "scenerystack/dot";
import { equatorialToHorizonVector } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { getEqnOfTimeHours, getSunPosition } from "../../common/SunEphemeris.js";

/**
 * Return the integer day-of-year (0…364, Flash) whose analemma sample at mean
 * clock time `dayFraction · 24` h is nearest to `pointerLocal` (projection
 * parent coords). Prefers front-hemisphere samples when both sides are near.
 */
export const findClosestAnalemmaDay = (
  pointerLocal: Vector2,
  projection: SkyProjection,
  latitudeDeg: number,
  dayFraction: number,
): number => {
  const T = (((dayFraction % 1) + 1) % 1) * 24;
  let bestDay = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let d = 0; d < 365; d++) {
    const { raHours, decDeg } = getSunPosition(d);
    const eotHours = getEqnOfTimeHours(d);
    const H = T - 12 + eotHours;
    const lst = raHours + H;
    const world = equatorialToHorizonVector(raHours, decDeg, latitudeDeg, lst);
    const { point, depth } = projection.projectWithDepth(world);
    const dx = point.x - pointerLocal.x;
    const dy = point.y - pointerLocal.y;
    // Penalise the far hemisphere slightly so the near branch of the figure-eight wins ties.
    const score = dx * dx + dy * dy + (depth < 0 ? 4 : 0);
    if (score < bestScore) {
      bestScore = score;
      bestDay = d;
    }
  }

  return bestDay;
};
