/**
 * OrbitViewNode.ts
 *
 * Top-down view of Earth orbiting the Sun. The Sun is at the local origin.
 * Earth moves along a circular orbit and its globe spins to encode both the
 * sidereal and solar day.
 *
 * Coordinate conventions (transcribed from OrbitView.as):
 *  - `angle = (solarDaysSinceVE / tropicalYear) × 2π` — orbital angle (0 at VE)
 *  - Earth center: `x = R·cos(angle − π/2)`, `y = −R·sin(angle − π/2)`
 *    (y-down screen; Earth starts below the Sun at VE when angle = 0)
 *  - Globe rotation (SceneryStack radians; Flash and SceneryStack share the
 *    y-down clockwise-positive convention, so no sign flip vs. OrbitView.as):
 *    `π − frac(solarTime)·2π − angle`
 *    (encodes the extra sidereal turn per orbit; noon meridian toward the Sun
 *    at solar noon)
 *
 * Interactions:
 *  - Globe drag: changes date (whole solar days; Shift = whole sidereal days).
 *  - Figure drag: changes time of day (rotationDelta / 2π days).
 *  - Keyboard: left/right arrow ±1 solar day; Shift + arrow ±1 sidereal day.
 */

import { Multilink } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import {
  Circle,
  DragListener,
  KeyboardListener,
  Line,
  Node,
  Path,
  Rectangle,
  Text,
  type TPaint,
} from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { EARTH_SHORE_POLYGONS } from "../../common/EarthShoreData.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import {
  CONTROL_FONT_SIZE,
  EARTH_GLOBE_RADIUS,
  JULIAN_TROPICAL_YEAR,
  ORBIT_RADIUS,
  SIMPLE_TROPICAL_YEAR,
} from "../../MotionsOfTheSunConstants.js";
import type { SiderealSolarTimeModel } from "../model/SiderealSolarTimeModel.js";

/** Season tick radius (outside the orbit). */
const SEASON_TICK_LENGTH = 14;
const SEASON_LABEL_OFFSET = 24;

/** Fraction of a solar day added per keyboard press (±1 solar day). */
const KEYBOARD_SOLAR_DAY_STEP = 1;

/**
 * Normalize an angle (radians) to the half-open interval (−π, π].
 */
function normalizeAngle(a: number): number {
  let r = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (r > Math.PI) {
    r -= 2 * Math.PI;
  }
  return r;
}

/**
 * Land outline for the orbit-view globe: the {@link EARTH_SHORE_POLYGONS}
 * coastlines orthographically projected onto the front hemisphere (viewer along
 * −X, so the prime meridian — Africa/Europe — faces forward, north up). Far-side
 * points (x < 0) break the subpath so only the visible hemisphere is drawn; the
 * caller clips the result to the globe disc.
 */
function buildGlobeLandShape(radius: number): Shape {
  const land = new Shape();
  for (const polygon of EARTH_SHORE_POLYGONS) {
    let penDown = false;
    for (const p of polygon) {
      if (p.x < 0) {
        penDown = false; // behind the globe
        continue;
      }
      const px = p.y * radius;
      const py = -p.z * radius;
      if (penDown) {
        land.lineTo(px, py);
      } else {
        land.moveTo(px, py);
        penDown = true;
      }
    }
  }
  return land;
}

/**
 * A little observer standing figure whose feet are at local (0, 0) and whose
 * body points "up" (toward negative y). Placed at the top of the globe and
 * rotated with the Earth group, it reads as a person standing on the surface.
 */
function createStickFigure(paint: TPaint): Node {
  const body = new Shape()
    .moveTo(-2.2, 0)
    .lineTo(0, -5)
    .lineTo(2.2, 0) // legs
    .moveTo(0, -5)
    .lineTo(0, -10.5) // torso
    .moveTo(-4, -12.5)
    .lineTo(0, -9.5)
    .lineTo(4, -12.5); // arms

  const limbs = new Path(body, {
    stroke: paint,
    lineWidth: 1.6,
    lineCap: "round",
    lineJoin: "round",
  });
  const head = new Circle(2.6, { y: -13.2, fill: paint });

  // Transparent, larger hit target so the small figure is easy to grab.
  const hit = new Circle(11, { y: -8, fill: "rgba(0,0,0,0)" });

  return new Node({ children: [hit, limbs, head] });
}

export class OrbitViewNode extends Node {
  public constructor(model: SiderealSolarTimeModel) {
    const a11y = StringManager.getInstance().getSiderealSolarTimeA11yStrings();
    const strings = StringManager.getInstance().getSiderealSolarTimeStrings();

    super({
      tagName: "div",
      focusable: true,
      accessibleName: a11y.controls.orbitEarthStringProperty,
      accessibleHelpText: a11y.controls.orbitEarthHelpStringProperty,
    });

    // ── Static elements ──────────────────────────────────────────────────────

    // Orbit circle
    const orbitCircle = new Circle(ORBIT_RADIUS, {
      stroke: MotionsOfTheSunColors.orbitPathColorProperty,
      lineWidth: 1.5,
      fill: null,
    });

    // Sun disc at origin
    const sunDisc = new Circle(10, {
      fill: MotionsOfTheSunColors.sunColorProperty,
    });

    // ── Season tick marks and labels ─────────────────────────────────────────
    // 4 ticks at VE (0), SS (π/2), AE (π), WS (3π/2) around the orbit.
    // angle = 0 → Earth at bottom (south) of orbit (VE).
    const seasonData = [
      { fraction: 0, labelProperty: strings.vernalEquinoxStringProperty },
      { fraction: 0.25, labelProperty: strings.summerSolsticeStringProperty },
      { fraction: 0.5, labelProperty: strings.autumnalEquinoxStringProperty },
      { fraction: 0.75, labelProperty: strings.winterSolsticeStringProperty },
    ];

    const seasonLayer = new Node();
    for (const { fraction, labelProperty } of seasonData) {
      const angle = fraction * 2 * Math.PI - Math.PI / 2;
      const tickInner = new Vector2(Math.cos(angle) * ORBIT_RADIUS, Math.sin(angle) * ORBIT_RADIUS);
      const tickOuter = new Vector2(
        Math.cos(angle) * (ORBIT_RADIUS + SEASON_TICK_LENGTH),
        Math.sin(angle) * (ORBIT_RADIUS + SEASON_TICK_LENGTH),
      );
      const tick = new Line(tickInner.x, tickInner.y, tickOuter.x, tickOuter.y, {
        stroke: MotionsOfTheSunColors.textColorProperty,
        lineWidth: 1,
      });

      const labelCenter = new Vector2(
        Math.cos(angle) * (ORBIT_RADIUS + SEASON_LABEL_OFFSET),
        Math.sin(angle) * (ORBIT_RADIUS + SEASON_LABEL_OFFSET),
      );
      const label = new Text(labelProperty, {
        font: new PhetFont({ size: CONTROL_FONT_SIZE - 1 }),
        fill: MotionsOfTheSunColors.textColorProperty,
        center: labelCenter,
        maxWidth: 80,
      });

      seasonLayer.addChild(tick);
      seasonLayer.addChild(label);
    }

    // ── Earth group (globe + meridian + figure) ───────────────────────────────

    const R = EARTH_GLOBE_RADIUS;

    // Ocean disc (the globe body; also the drag target for changing the date).
    const earthGlobe = new Circle(R, {
      fill: MotionsOfTheSunColors.earthFillColorProperty,
      cursor: "pointer",
    });

    // Continents: the real NAAP coastline outlines (same data as the Sun Paths
    // world map) projected onto the front hemisphere of the globe and clipped to
    // its disc. They 2D-spin with the globe, reinforcing Earth's rotation.
    const continents = new Path(buildGlobeLandShape(R), {
      fill: MotionsOfTheSunColors.earthLandColorProperty,
      pickable: false,
      clipArea: Shape.circle(0, 0, R),
    });

    // Thin rim for definition against the background.
    const rim = new Circle(R, {
      fill: null,
      stroke: MotionsOfTheSunColors.earthMeridianColorProperty,
      lineWidth: 0.75,
      pickable: false,
    });

    // Noon meridian (radial line through the globe's local y-axis)
    const meridianLine = new Line(0, -R, 0, R, {
      stroke: MotionsOfTheSunColors.earthMeridianColorProperty,
      lineWidth: 2,
      pickable: false,
    });

    // Stick figure standing at the "noon" meridian (top of globe in local frame),
    // feet on the surface, body pointing radially outward. Drag it to change the
    // time of day.
    const figureNode = createStickFigure(MotionsOfTheSunColors.observerFigureColorProperty);
    figureNode.translation = new Vector2(0, -R); // feet on the globe surface
    figureNode.cursor = "pointer";

    const earthGroup = new Node({
      children: [earthGlobe, continents, rim, meridianLine, figureNode],
    });

    // Night-side shade: a translucent dark half-disc covering the hemisphere
    // facing away from the Sun. It follows the Earth but does NOT spin with the
    // globe — it stays aligned with the Earth–Sun line, so the terminator is
    // fixed while the continents rotate underneath. Its default (unrotated) half
    // covers the +x side; the reactive update below rotates it to the night side.
    const nightShade = new Node({
      pickable: false,
      clipArea: Shape.circle(0, 0, R),
      children: [new Rectangle(0, -R, R, 2 * R, { fill: MotionsOfTheSunColors.nightShadeColorProperty })],
    });

    // ── Assemble layer order ────────────────────────────────────────────────

    this.addChild(seasonLayer);
    this.addChild(orbitCircle);
    this.addChild(sunDisc);
    this.addChild(earthGroup);
    this.addChild(nightShade);

    // ── Reactive position / rotation update ──────────────────────────────────

    Multilink.multilink(
      [
        model.timeMaster.solarDaysSinceVernalEquinoxProperty,
        model.timeMaster.solarTimeProperty,
        model.timeMaster.modeProperty,
      ],
      (solarDaysSinceVE, solarTime, mode) => {
        const Y = mode === "simple" ? SIMPLE_TROPICAL_YEAR : JULIAN_TROPICAL_YEAR;
        const angle = (solarDaysSinceVE / Y) * 2 * Math.PI;

        // Earth position (orbit center = Sun at origin, y-down screen)
        const earthX = ORBIT_RADIUS * Math.cos(angle - Math.PI / 2);
        const earthY = -ORBIT_RADIUS * Math.sin(angle - Math.PI / 2);
        earthGroup.translation = new Vector2(earthX, earthY);

        // Night shade follows the Earth and points away from the Sun (which is at
        // the origin). The night hemisphere is the direction from the Sun to the
        // Earth, i.e. atan2(earthY, earthX); rotating the +x-side half by that
        // angle aligns the shaded half with it.
        nightShade.translation = new Vector2(earthX, earthY);
        nightShade.rotation = Math.atan2(earthY, earthX);

        // Globe spin: noon meridian points toward Sun at solar noon.
        // Transcribed from OrbitView.as (setTime). Flash and SceneryStack share a
        // y-down screen and the same rotation matrix, so positive rotation is
        // clockwise in both — the Flash degrees convert straight to radians with
        // no sign flip (matching how the Earth position above is transcribed):
        //   flashRotDeg      = 180 − frac(solarTime)·360 − angle·(180/π)
        //   scenerystackRad  = flashRotDeg · π/180
        //                    = π − frac(solarTime)·2π − angle
        // At solar noon (frac = 0.5) this gives θ = −angle, placing the meridian
        // and figure on the Sun-facing (day) side.
        const solarFrac = ((solarTime % 1) + 1) % 1;
        earthGroup.rotation = Math.PI - solarFrac * 2 * Math.PI - angle;
      },
    );

    // ── Globe drag: sets date (whole solar/sidereal days) ────────────────────

    let globeDragStartOffset = 0;

    const getEarthAngle = () => Math.atan2(earthGroup.translation.y, earthGroup.translation.x);

    earthGlobe.addInputListener(
      new DragListener({
        start: (event) => {
          // Cancel any ongoing animation — use setSolarTime(current, 0)
          model.timeMaster.setSolarTime(model.timeMaster.solarTimeProperty.value, 0);
          const localPoint = this.globalToLocalPoint(event.pointer.point);
          globeDragStartOffset = Math.atan2(localPoint.y, localPoint.x) - getEarthAngle();
        },
        drag: (event) => {
          const localPoint = this.globalToLocalPoint(event.pointer.point);
          const ptrAngle = Math.atan2(localPoint.y, localPoint.x);
          const earthAngle = getEarthAngle();

          const angleDelta = normalizeAngle(-(ptrAngle - earthAngle - globeDragStartOffset));

          const Y = model.timeMaster.tropicalYear;
          let timeDelta = (angleDelta * Y) / (2 * Math.PI);

          const isShift = event.domEvent instanceof MouseEvent && event.domEvent.shiftKey;
          if (isShift) {
            // Snap to nearest whole sidereal day
            const sps = model.timeMaster.siderealPerSolar;
            timeDelta = Math.round(timeDelta * sps) / sps;
          } else {
            // Snap to nearest whole solar day
            timeDelta = Math.round(timeDelta);
          }

          model.timeMaster.incrementSolarTime(timeDelta, 0);
        },
      }),
    );

    // ── Figure drag: sets time of day ────────────────────────────────────────

    let figureDragStartOffset = 0;

    figureNode.addInputListener(
      new DragListener({
        start: (event) => {
          model.timeMaster.setSolarTime(model.timeMaster.solarTimeProperty.value, 0);
          const localPoint = this.globalToLocalPoint(event.pointer.point);
          const relX = localPoint.x - earthGroup.translation.x;
          const relY = localPoint.y - earthGroup.translation.y;
          const ptrAngleDeg = Math.atan2(relY, relX) * (180 / Math.PI);
          figureDragStartOffset = ptrAngleDeg - earthGroup.rotation * (180 / Math.PI);
        },
        drag: (event) => {
          const localPoint = this.globalToLocalPoint(event.pointer.point);
          const relX = localPoint.x - earthGroup.translation.x;
          const relY = localPoint.y - earthGroup.translation.y;
          const ptrAngleDeg = Math.atan2(relY, relX) * (180 / Math.PI);

          let rotationDelta = -(ptrAngleDeg - earthGroup.rotation * (180 / Math.PI) - figureDragStartOffset);
          rotationDelta = ((rotationDelta % 360) + 360) % 360;
          if (rotationDelta > 180) {
            rotationDelta -= 360;
          }

          const timeDelta = rotationDelta / 360;
          model.timeMaster.incrementSolarTime(timeDelta, 0);
        },
      }),
    );

    // ── Keyboard interaction: arrows move ±1 solar day; Shift = sidereal ────

    this.addInputListener(
      new KeyboardListener({
        keys: ["arrowLeft", "arrowRight", "shift+arrowLeft", "shift+arrowRight"],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          if (keysPressed === "arrowRight") {
            model.timeMaster.incrementSolarTime(KEYBOARD_SOLAR_DAY_STEP, 0);
          } else if (keysPressed === "arrowLeft") {
            model.timeMaster.incrementSolarTime(-KEYBOARD_SOLAR_DAY_STEP, 0);
          } else if (keysPressed === "shift+arrowRight") {
            model.timeMaster.incrementSiderealTime(KEYBOARD_SOLAR_DAY_STEP, 0);
          } else if (keysPressed === "shift+arrowLeft") {
            model.timeMaster.incrementSiderealTime(-KEYBOARD_SOLAR_DAY_STEP, 0);
          }
        },
      }),
    );
  }
}
