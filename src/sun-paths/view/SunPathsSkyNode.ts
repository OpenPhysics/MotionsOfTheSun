/**
 * SunPathsSkyNode.ts
 *
 * The Sun Paths celestial sphere — owns the `SkyProjection` and layers every
 * visual element in Flash CelestialSphere paint order:
 *
 *  1. Transparent hit-rect (camera drag / keyboard target)
 *  2. SkyBowlShadingNode — altitude-linked day/night bowl
 *  3. HorizonGroundNode  — filled ground disk with N/E/S/W labels
 *  4. HorizonShadeNode   — Flash horizonShade darkening
 *  5. HorizonDomeNode    — wireframe dome, optional underside
 *  6. CelestialPoleAxisNode — NCP/SCP stubs past the poles
 *  7. CelestialEquatorOnHorizonNode  — the equator great circle
 *  8. HourCircleOnHorizonNode        — the RA = 0h hour circle (rotates with LST)
 *  9. EclipticOnHorizonNode          — ecliptic great circle + optional month labels
 * 10. SunDeclinationCircleNode       — Sun's daily path (small circle at current dec)
 * 11. Analemma / observer / Sun
 * 12. CircleHoverBalloonNode         — Flash-style roll-over labels
 *
 * Horizon-frame SkyProjection (identity frame matrix); overlays convert via
 * `equatorialToHorizonVector`. Flash-faithful surfaces (sky/horizon shade +
 * pole axes) close the former D5 wireframe-only gap without WebGL.
 */

import { BooleanProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector2 } from "scenerystack/dot";
import { Node, Rectangle } from "scenerystack/scenery";
import { degToRad } from "../../common/SkyCoordinates.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { attachSkyCameraInteraction } from "../../common/view/attachSkyCameraInteraction.js";
import { CelestialEquatorOnHorizonNode } from "../../common/view/CelestialEquatorOnHorizonNode.js";
import { CelestialPoleAxisNode } from "../../common/view/CelestialPoleAxisNode.js";
import { HorizonDomeNode } from "../../common/view/HorizonDomeNode.js";
import { HorizonGroundNode } from "../../common/view/HorizonGroundNode.js";
import { HourCircleOnHorizonNode } from "../../common/view/HourCircleOnHorizonNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import { SPHERE_RADIUS } from "../../MotionsOfTheSunConstants.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";
import { AnalemmaNode } from "./AnalemmaNode.js";
import { attachCircleHoverBalloon, CircleHoverBalloonNode } from "./CircleHoverBalloonNode.js";
import { EclipticOnHorizonNode } from "./EclipticOnHorizonNode.js";
import { HorizonShadeNode } from "./HorizonShadeNode.js";
import { ObserverFigureNode } from "./ObserverFigureNode.js";
import { SkyBowlShadingNode } from "./SkyBowlShadingNode.js";
import { SunDeclinationCircleNode } from "./SunDeclinationCircleNode.js";
import { SunNode } from "./SunNode.js";

/**
 * Flash `viewerAltitude = 35` (°). SkyProjection elevation is negative when
 * looking down onto the sphere, so elevation = −altitude.
 */
const DEFAULT_ELEVATION = -degToRad(35);

/** Flash `viewerAzimuth = 215` (°) — slightly west of south. */
const DEFAULT_AZIMUTH = degToRad(215);

/** Equator, 0h circle, and pole axes are always drawn in the Flash lab (no toggle). */
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

    const skyBowl = new SkyBowlShadingNode(this.projection, model.sunAltDegProperty, model.showUndersideProperty);
    const groundNode = new HorizonGroundNode(this.projection);
    const horizonShade = new HorizonShadeNode(this.projection, model.sunAltDegProperty);
    const domeNode = new HorizonDomeNode(this.projection, model.latitudeProperty, {
      undersideVisibleProperty: model.showUndersideProperty,
    });
    const poleAxes = new CelestialPoleAxisNode(this.projection, model.latitudeProperty, ALWAYS_VISIBLE);

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
      skyBowl,
      groundNode,
      horizonShade,
      domeNode,
      poleAxes,
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
