/**
 * CelestialPoleAxisNode.ts
 *
 * Short stubs extending outward from the NCP and SCP on the horizon dome
 * (Flash `ncpAxis` / `scpAxis`: celestial ±Z → ±1.2× radius). Near segments
 * are solid; far segments are dashed.
 *
 * Ported from RotatingSky `CelestialPoleAxisNode` with MotionsOfTheSun colors.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { altAzToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { addSplitPolyline } from "./skyGraphics.js";

/** Flash pole → 1.2× radius ⇒ extension of 0.2 beyond the unit sphere. */
const AXIS_EXTENSION = 0.2;

/** Outward stubs from each pole marker on the dome surface. */
const poleAxisSegments = (latitudeDeg: number): Vector3[][] => {
  const ncp = altAzToVector3(latitudeDeg, 0);
  const scp = altAzToVector3(-latitudeDeg, 180);
  return [
    [ncp, ncp.plus(ncp.normalized().timesScalar(AXIS_EXTENSION))],
    [scp, scp.plus(scp.normalized().timesScalar(AXIS_EXTENSION))],
  ];
};

export class CelestialPoleAxisNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    visibleProperty?: TReadOnlyProperty<boolean>,
  ) {
    super({ pickable: false });

    const backPath = new Path(null, {
      stroke: MotionsOfTheSunColors.accentColorProperty,
      lineWidth: 2,
      lineDash: [5, 4],
      opacity: 0.6,
    });
    const frontPath = new Path(null, {
      stroke: MotionsOfTheSunColors.accentColorProperty,
      lineWidth: 2,
    });
    this.children = [backPath, frontPath];

    Multilink.multilink([projection.viewMatrixProperty, latitudeProperty], (_m, latitude) => {
      const frontShape = new Shape();
      const backShape = new Shape();
      for (const segment of poleAxisSegments(latitude)) {
        addSplitPolyline(projection, segment, false, frontShape, backShape);
      }
      frontPath.shape = frontShape;
      backPath.shape = backShape;
    });

    if (visibleProperty) {
      visibleProperty.link((visible) => {
        this.visible = visible;
      });
    }
  }
}
