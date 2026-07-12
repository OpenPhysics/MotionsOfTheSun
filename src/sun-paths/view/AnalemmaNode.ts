/**
 * AnalemmaNode.ts
 *
 * Draws the analemma — the figure-eight traced by the Sun at the same mean
 * clock time every day of the year — on the horizon dome.
 *
 * Algorithm (from the porting plan)
 * ──────────────────────────────────
 *   T = frac(dayOfYear) × 24        mean clock time in hours (0 = midnight, 12 = noon)
 *   for d = 0 … 364:
 *     (ra_d, dec_d) = getSunPosition(d)
 *     H_d  = (T − 12) + eqnOfTimeHours(d)   hour angle at mean clock time T
 *     lst  = ra_d + H_d                       local sidereal time that gives H_d
 *     v    = equatorialToHorizonVector(ra_d, dec_d, lat, lst)
 *
 * The closed loop is drawn as a single faded polyline (not split front/back) to
 * keep it readable. Redraws whenever [dayOfYear, latitude, viewMatrix] change.
 * Visible only when `showAnalemmaProperty` is true.
 */

import { Multilink } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";
import { equatorialToHorizonVector } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { getEqnOfTimeHours, getSunPosition } from "../../common/SunEphemeris.js";
import { addSplitSmoothPolyline } from "../../common/view/skyGraphics.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";

export class AnalemmaNode extends Node {
  /** Front stroke — used for roll-over balloon hit testing. */
  public readonly hoverTarget: Path;

  public constructor(projection: SkyProjection, model: SunPathsModel) {
    super();

    const frontPath = new Path(null, {
      stroke: MotionsOfTheSunColors.analemmaColorProperty,
      lineWidth: 1.5,
      opacity: 0.7,
    });
    this.hoverTarget = frontPath;
    const backPath = new Path(null, {
      stroke: MotionsOfTheSunColors.analemmaColorProperty,
      lineWidth: 1.5,
      lineDash: [4, 4],
      opacity: 0.35,
      pickable: false,
    });

    this.children = [backPath, frontPath];

    Multilink.multilink(
      [projection.viewMatrixProperty, model.dayOfYearProperty, model.latitudeProperty],
      (_m, dayOfYear, lat) => {
        const T = (dayOfYear % 1) * 24; // mean clock time in hours
        const front = new Shape();
        const back = new Shape();

        const points = [];
        for (let d = 0; d < 365; d++) {
          const { raHours: ra, decDeg: dec } = getSunPosition(d);
          const eotHours = getEqnOfTimeHours(d);
          // Hour angle at mean clock time T
          const H = T - 12 + eotHours;
          // LST that places the Sun at hour angle H with its RA
          const lst = ra + H;
          points.push(equatorialToHorizonVector(ra, dec, lat, lst));
        }
        // Close the loop by appending the first point
        if (points[0]) {
          points.push(points[0]);
        }

        addSplitSmoothPolyline(projection, points, false, front, back);
        frontPath.shape = front;
        backPath.shape = back;
      },
    );

    model.showAnalemmaProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
