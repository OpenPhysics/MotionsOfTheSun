/**
 * SunPathsSkyNode.ts
 *
 * The Sun Paths horizon dome — owns the `SkyProjection` and layers every visual
 * element in the correct depth order:
 *
 *  1. Transparent hit-rect (camera drag / keyboard target)
 *  2. HorizonGroundNode  — filled ground disk with N/E/S/W labels
 *  3. HorizonDomeNode    — wireframe dome, optional underside
 *  4. CelestialEquatorOnHorizonNode  — the equator great circle
 *  5. HourCircleOnHorizonNode        — the RA = 0h hour circle (rotates with LST)
 *  6. EclipticOnHorizonNode          — ecliptic great circle + optional month labels
 *  7. SunDeclinationCircleNode       — Sun's daily path (small circle at current dec)
 *  8. Analemma / observer / Sun
 *  9. CircleHoverBalloonNode         — Flash-style roll-over labels
 *
 * D5: horizon-frame SkyProjection (identity frame matrix); all overlays convert
 * via `equatorialToHorizonVector`.
 */

import { BooleanProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector2 } from "scenerystack/dot";
import { Node, Rectangle } from "scenerystack/scenery";
import { SkyProjection } from "../../common/SkyProjection.js";
import { attachSkyCameraInteraction } from "../../common/view/attachSkyCameraInteraction.js";
import { CelestialEquatorOnHorizonNode } from "../../common/view/CelestialEquatorOnHorizonNode.js";
import { HorizonDomeNode } from "../../common/view/HorizonDomeNode.js";
import { HorizonGroundNode } from "../../common/view/HorizonGroundNode.js";
import { HourCircleOnHorizonNode } from "../../common/view/HourCircleOnHorizonNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import { SPHERE_RADIUS } from "../../MotionsOfTheSunConstants.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";
import { AnalemmaNode } from "./AnalemmaNode.js";
import { attachCircleHoverBalloon, CircleHoverBalloonNode } from "./CircleHoverBalloonNode.js";
import { EclipticOnHorizonNode } from "./EclipticOnHorizonNode.js";
import { ObserverFigureNode } from "./ObserverFigureNode.js";
import { SunDeclinationCircleNode } from "./SunDeclinationCircleNode.js";
import { SunNode } from "./SunNode.js";

/** Initial camera tilt — slightly down to see the dome from above-outside. */
const DEFAULT_ELEVATION = -0.4;

/** Initial camera spin — face south so the Sun rises on the left. */
const DEFAULT_AZIMUTH = Math.PI;

/** Equator and 0h circle are always drawn in the Flash lab (no toggle). */
const ALWAYS_VISIBLE = new BooleanProperty(true);

export class SunPathsSkyNode extends Node {
  /** The orthographic projection shared by all children. */
  public readonly projection: SkyProjection;

  /** Transparent hit-rect used for camera drag / keyboard. */
  public readonly hitRect: Rectangle;

  /** The draggable Sun disc (exposed so ScreenView can include in pdomOrder). */
  public readonly sunNode: SunNode;

  public constructor(model: SunPathsModel, center: Vector2) {
    super();

    const a11y = StringManager.getInstance().getSunPathsA11yStrings();
    const strings = StringManager.getInstance().getSunPathsStrings();

    this.projection = new SkyProjection({
      center,
      radius: SPHERE_RADIUS,
      elevation: DEFAULT_ELEVATION,
      azimuth: DEFAULT_AZIMUTH,
    });

    // Transparent hit rectangle over the dome area.
    this.hitRect = new Rectangle(
      center.x - SPHERE_RADIUS,
      center.y - SPHERE_RADIUS,
      2 * SPHERE_RADIUS,
      2 * SPHERE_RADIUS,
      { fill: "transparent" },
    );

    const groundNode = new HorizonGroundNode(this.projection);
    const domeNode = new HorizonDomeNode(this.projection, model.latitudeProperty, {
      undersideVisibleProperty: model.showUndersideProperty,
    });

    const equatorNode = new CelestialEquatorOnHorizonNode(this.projection, model.latitudeProperty, ALWAYS_VISIBLE);
    const hourCircleNode = new HourCircleOnHorizonNode(
      this.projection,
      model.latitudeProperty,
      model.siderealTimeHoursProperty,
      ALWAYS_VISIBLE,
    );

    const eclipticNode = new EclipticOnHorizonNode(this.projection, model);
    const decCircleNode = new SunDeclinationCircleNode(this.projection, model);

    const analemmaNode = new AnalemmaNode(this.projection, model);
    const observerFigure = new ObserverFigureNode(this.projection, model);
    this.sunNode = new SunNode(this.projection, model);

    const balloon = new CircleHoverBalloonNode();

    this.children = [
      this.hitRect,
      groundNode,
      domeNode,
      equatorNode,
      hourCircleNode,
      eclipticNode,
      decCircleNode,
      analemmaNode,
      observerFigure,
      this.sunNode,
      balloon,
    ];

    // Flash roll-over balloons on the celestial circles.
    attachCircleHoverBalloon(hourCircleNode.hoverTarget, balloon, this, strings.balloonZeroHourStringProperty);
    attachCircleHoverBalloon(equatorNode.hoverTarget, balloon, this, strings.balloonCelestialEquatorStringProperty);
    attachCircleHoverBalloon(eclipticNode.hoverTarget, balloon, this, strings.balloonEclipticStringProperty);
    attachCircleHoverBalloon(decCircleNode.hoverTarget, balloon, this, strings.balloonDeclinationStringProperty);
    attachCircleHoverBalloon(analemmaNode.hoverTarget, balloon, this, strings.balloonAnalemmaStringProperty);

    // D9: model satisfies { advanceSiderealTime(hours): void }.
    attachSkyCameraInteraction(this.hitRect, {
      projection: this.projection,
      sky: model,
      accessibleNameProperty: a11y.controls.skyViewStringProperty as TReadOnlyProperty<string>,
      accessibleHelpTextProperty: a11y.controls.skyViewHelpStringProperty as TReadOnlyProperty<string>,
    });
  }

  /** Restores the camera to its initial orientation. */
  public reset(): void {
    this.projection.reset();
    this.projection.elevationProperty.value = DEFAULT_ELEVATION;
    this.projection.azimuthProperty.value = DEFAULT_AZIMUTH;
  }
}
