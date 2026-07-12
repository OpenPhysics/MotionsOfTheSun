/**
 * SkyBowlShadingNode.ts
 *
 * Flash CelestialSphere sky fill (`CSGradientDisk` skyFront / skyBack +
 * `SimulationMaster.updateSky`). Orthographic silhouette disks sit behind the
 * ground and wireframe; day-bowl opacity tracks Sun altitude:
 *
 *   dayAlpha = 0.8 × (clamp(alt° / 90, 0, 1))^0.15
 *
 * Night wash takes the complementary opacity. When underside is shown, a filled
 * lower-hemisphere night bowl is drawn as well.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path } from "scenerystack/scenery";
import { altAzToVector3 } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";

const ZENITH = new Vector3(0, 0, 1);
const ALT_STEPS = 6;
const AZ_STEPS = 48;

/** Flash `skyBack` alpha scale (percent → 0–1). */
const DAY_ALPHA_SCALE = 0.8;

/** Build a filled shape for the altitude band [altFrom, altTo] (degrees). */
const hemisphereBandFill = (projection: SkyProjection, altFrom: number, altTo: number): Shape => {
  const shape = new Shape();
  for (let i = 0; i < ALT_STEPS; i++) {
    const a0 = altFrom + (i / ALT_STEPS) * (altTo - altFrom);
    const a1 = altFrom + ((i + 1) / ALT_STEPS) * (altTo - altFrom);
    for (let j = 0; j < AZ_STEPS; j++) {
      const az0 = (j / AZ_STEPS) * 360;
      const az1 = ((j + 1) / AZ_STEPS) * 360;
      const p00 = altAzToVector3(a0, az0);
      const p01 = altAzToVector3(a0, az1);
      const p11 = altAzToVector3(a1, az1);
      const p10 = altAzToVector3(a1, az0);
      const s0 = projection.project(p00);
      const s1 = projection.project(p01);
      const s2 = projection.project(p11);
      const s3 = projection.project(p10);
      shape.moveToPoint(s0).lineToPoint(s1).lineToPoint(s2).lineToPoint(s3).close();
    }
  }
  return shape;
};

export class SkyBowlShadingNode extends Node {
  public constructor(
    projection: SkyProjection,
    sunAltDegProperty: TReadOnlyProperty<number>,
    showUndersideProperty: TReadOnlyProperty<boolean>,
  ) {
    super({ pickable: false });

    // Silhouette disks match Flash CSGradientDisk (screen-space radial disks
    // scaled to sphere radius, masked by depth layers in the original).
    const nightDisk = new Circle(projection.radius, {
      fill: MotionsOfTheSunColors.skyBowlNightColorProperty,
      center: projection.center,
    });
    const dayDisk = new Circle(projection.radius, {
      fill: MotionsOfTheSunColors.skyBowlDayColorProperty,
      center: projection.center,
    });

    const undersidePath = new Path(null, {
      fill: MotionsOfTheSunColors.skyBowlNightColorProperty,
      opacity: 0.55,
    });

    this.children = [nightDisk, dayDisk, undersidePath];

    const updateOpacity = (altDeg: number): void => {
      const dayFactor = clamp(altDeg / 90, 0, 1) ** 0.15;
      dayDisk.opacity = DAY_ALPHA_SCALE * dayFactor;
      // Keep a residual night wash so the bowl never goes fully transparent.
      nightDisk.opacity = DAY_ALPHA_SCALE * (1 - dayFactor) + 0.15;
    };

    const updateGeometry = (): void => {
      nightDisk.radius = projection.radius;
      dayDisk.radius = projection.radius;
      nightDisk.center = projection.center;
      dayDisk.center = projection.center;

      if (showUndersideProperty.value) {
        undersidePath.shape = hemisphereBandFill(projection, -90, 0);
        undersidePath.visible = true;
      } else {
        undersidePath.shape = null;
        undersidePath.visible = false;
      }

      // Hide silhouette when looking from below the horizon so the underside
      // mesh (if any) carries the fill instead of a flat disk.
      const fromAbove = projection.isFrontFacing(ZENITH);
      nightDisk.visible = fromAbove;
      dayDisk.visible = fromAbove;
    };

    Multilink.multilink(
      [projection.viewMatrixProperty, sunAltDegProperty, showUndersideProperty],
      (_matrix, altDeg) => {
        updateOpacity(altDeg);
        updateGeometry();
      },
    );
  }
}
