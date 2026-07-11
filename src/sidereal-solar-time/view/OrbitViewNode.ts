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
 *  - Globe rotation (SceneryStack radians, ccw positive):
 *    `−π + frac(solarTime)·2π + angle`
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
import { Circle, DragListener, KeyboardListener, Line, Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
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

    // Globe disc
    const earthGlobe = new Circle(EARTH_GLOBE_RADIUS, {
      fill: MotionsOfTheSunColors.earthFillColorProperty,
      stroke: MotionsOfTheSunColors.earthMeridianColorProperty,
      lineWidth: 1,
      cursor: "pointer",
    });

    // Noon meridian (radial line through the globe's local y-axis)
    const meridianLine = new Line(0, -EARTH_GLOBE_RADIUS, 0, EARTH_GLOBE_RADIUS, {
      stroke: MotionsOfTheSunColors.earthMeridianColorProperty,
      lineWidth: 2,
      pickable: false,
    });

    // Stick figure: small circle at "noon" position (top of globe in local frame)
    const figureNode = new Circle(5, {
      fill: MotionsOfTheSunColors.observerFigureColorProperty,
      cursor: "pointer",
      // Position at top of globe in local coords; rotation handled by earthGroup
      centerX: 0,
      centerY: -EARTH_GLOBE_RADIUS,
    });

    const earthGroup = new Node({
      children: [earthGlobe, meridianLine, figureNode],
    });

    // ── Assemble layer order ────────────────────────────────────────────────

    this.addChild(seasonLayer);
    this.addChild(orbitCircle);
    this.addChild(sunDisc);
    this.addChild(earthGroup);

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

        // Globe spin: noon meridian points toward Sun at solar noon.
        // Formula (transcribed from OrbitView.as, converted to ccw radians):
        //   flashRotDeg = 180 − frac(solarTime)·360 − angle·(180/π)
        //   scenerystackRad = −flashRotDeg · π/180
        //                   = −π + frac(solarTime)·2π + angle
        const solarFrac = ((solarTime % 1) + 1) % 1;
        earthGroup.rotation = -Math.PI + solarFrac * 2 * Math.PI + angle;
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
