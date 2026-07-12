/**
 * HorizonShadeNode.ts
 *
 * Flash `horizonShade` — a dark overlay on the ground disk whose alpha rises
 * as the Sun sets (`SimulationMaster.updateSky`):
 *
 *   alpha = min(0.4, 0.4 × (1 − alt° / 90)^4)
 *
 * Painted above {@link HorizonGroundNode} and below the wireframe dome.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Node, Path } from "scenerystack/scenery";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { projectFilledShape, smallCirclePoints } from "../../common/view/skyGraphics.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";

const ZENITH = new Vector3(0, 0, 1);

/** Flash horizonShade alpha scale (percent → 0–1). */
const SHADE_ALPHA_SCALE = 0.4;

export class HorizonShadeNode extends Node {
  public constructor(projection: SkyProjection, sunAltDegProperty: TReadOnlyProperty<number>) {
    super({ pickable: false });

    const shade = new Path(null, {
      fill: MotionsOfTheSunColors.horizonShadeColorProperty,
    });
    this.children = [shade];

    Multilink.multilink([projection.viewMatrixProperty, sunAltDegProperty], (_matrix, altDeg) => {
      const horizon = smallCirclePoints(ZENITH, 90);
      shade.shape = projectFilledShape(projection, horizon);

      // Flash: 40 * pow(1 - alt/90, 4), capped at 40. Below the horizon the
      // shade stays at max so dusk/night ground reads darker.
      const t = Math.max(0, 1 - altDeg / 90);
      shade.opacity = Math.min(SHADE_ALPHA_SCALE, SHADE_ALPHA_SCALE * t * t * t * t);
      shade.visible = projection.isFrontFacing(ZENITH);
    });
  }
}
