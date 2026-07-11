/**
 * ObserverFigureNode.ts
 *
 * A stick-figure observer standing at the dome center (the projection's
 * "zenith" point on screen) with a shadow cast opposite the Sun.
 *
 * Shadow geometry
 * ───────────────
 * The shadow extends from the observer's feet toward `sunAzimuth + 180°`,
 * with screen length `min(60, 18 / tan(alt))` px (clamped to [0, 60]).
 * Hidden when the Sun is below the horizon (alt ≤ 0).
 *
 * The stick figure is drawn in screen space relative to the dome center,
 * so it doesn't move when the camera rotates — it always sits at zenith.
 */

import { Multilink } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path } from "scenerystack/scenery";
import { altAzToVector3, degToRad } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";

const MAX_SHADOW_PX = 60;
const BODY_COLOR = MotionsOfTheSunColors.observerFigureColorProperty;
const SHADOW_COLOR = MotionsOfTheSunColors.shadowColorProperty;

export class ObserverFigureNode extends Node {
  public constructor(projection: SkyProjection, model: SunPathsModel) {
    super({ pickable: false });

    // ── Stick-figure parts (all in screen space, centred at (0,0) for the feet) ─
    const head = new Circle(4, { fill: BODY_COLOR });
    head.centerY = -28;

    const body = new Line(0, -24, 0, -14, { stroke: BODY_COLOR, lineWidth: 1.5 });
    const leftArm = new Line(0, -20, -6, -15, { stroke: BODY_COLOR, lineWidth: 1.5 });
    const rightArm = new Line(0, -20, 6, -15, { stroke: BODY_COLOR, lineWidth: 1.5 });
    const leftLeg = new Line(0, -14, -5, 0, { stroke: BODY_COLOR, lineWidth: 1.5 });
    const rightLeg = new Line(0, -14, 5, 0, { stroke: BODY_COLOR, lineWidth: 1.5 });

    const figure = new Node({ children: [head, body, leftArm, rightArm, leftLeg, rightLeg] });

    const shadowPath = new Path(null, { stroke: SHADOW_COLOR, lineWidth: 2 });

    this.children = [shadowPath, figure];

    // ── Position (always at dome center on screen) ────────────────────────────
    // The stick figure stands at the dome's visual center (the observer's feet).
    figure.x = projection.center.x;
    figure.y = projection.center.y;

    // ── Shadow update ────────────────────────────────────────────────────────
    Multilink.multilink(
      [projection.viewMatrixProperty, model.sunAltDegProperty, model.sunAzDegProperty, model.showStickfigureProperty],
      (_m, alt, az, showFigure) => {
        this.visible = showFigure;
        if (!showFigure || alt <= 0) {
          shadowPath.shape = null;
          return;
        }

        const altRad = degToRad(alt);
        const shadowLen = Math.min(MAX_SHADOW_PX, 18 / Math.tan(altRad));

        // Shadow extends opposite to Sun: azimuth + 180°
        const shadowAzDeg = az + 180;
        const shadowDirV = altAzToVector3(0, shadowAzDeg);
        const shadowScreen = projection.project(shadowDirV);

        const feetX = projection.center.x;
        const feetY = projection.center.y;
        const dir = shadowScreen.minus(projection.center);
        const dirLen = dir.magnitude;
        if (dirLen < 1e-6) {
          shadowPath.shape = null;
          return;
        }
        const unitDir = dir.dividedScalar(dirLen);
        const tipX = feetX + unitDir.x * shadowLen;
        const tipY = feetY + unitDir.y * shadowLen;

        const shape = new Shape();
        shape.moveTo(feetX, feetY);
        shape.lineTo(tipX, tipY);
        shadowPath.shape = shape;
      },
    );
  }
}
