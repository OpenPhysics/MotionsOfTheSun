/**
 * SunDeclinationCircleNode.ts
 *
 * Draws the Sun's daily path (small circle at fixed declination = Sun's current
 * declination) on the horizon dome. This is the circle the Sun traces through
 * the sky over one sidereal day at the current date and latitude.
 *
 * Sampling: RA 0–24 h in 0.25 h steps at fixed dec = sunDecDeg.
 * Each point → `equatorialToHorizonVector(ra, dec, lat, lst)` → projected.
 * Front half is solid, back half is dashed.
 * Redraws whenever [dayOfYear, latitudeProperty, viewMatrix] changes.
 */

import { Multilink } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";
import { equatorialToHorizonVector } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { addSplitSmoothPolyline } from "../../common/view/skyGraphics.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";

const RA_STEP_HOURS = 0.25;

/** Sample a full 24-h declination circle at a given dec and LST. */
const sampleDecCircle = (decDeg: number, latDeg: number, lstHours: number): Vector3[] => {
  const points: Vector3[] = [];
  for (let ra = 0; ra < 24; ra += RA_STEP_HOURS) {
    points.push(equatorialToHorizonVector(ra, decDeg, latDeg, lstHours));
  }
  return points;
};

export class SunDeclinationCircleNode extends Node {
  /** Front stroke — used for roll-over balloon hit testing. */
  public readonly hoverTarget: Path;

  public constructor(projection: SkyProjection, model: SunPathsModel) {
    super();

    const frontPath = new Path(null, {
      stroke: MotionsOfTheSunColors.sunPathColorProperty,
      lineWidth: 2,
    });
    this.hoverTarget = frontPath;
    const backPath = new Path(null, {
      stroke: MotionsOfTheSunColors.sunPathColorProperty,
      lineWidth: 2,
      lineDash: [6, 4],
      opacity: 0.5,
      pickable: false,
    });

    this.children = [backPath, frontPath];

    Multilink.multilink(
      [projection.viewMatrixProperty, model.sunDecDegProperty, model.latitudeProperty, model.siderealTimeHoursProperty],
      (_matrix, dec, lat, lst) => {
        const points = sampleDecCircle(dec, lat, lst);
        const front = new Shape();
        const back = new Shape();
        addSplitSmoothPolyline(projection, points, true, front, back);
        frontPath.shape = front;
        backPath.shape = back;
      },
    );

    model.showDeclinationCircleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
