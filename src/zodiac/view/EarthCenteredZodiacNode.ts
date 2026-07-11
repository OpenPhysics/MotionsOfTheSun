/**
 * EarthCenteredZodiacNode.ts
 *
 * Top-down ecliptic-plane diagram for the zodiac017 "Earth at the center" mode
 * (Phase 8.2). Simplified port — not the full Flash celestial-sphere renderer.
 *
 * Layout:
 *  - Earth disc at the origin
 *  - Ecliptic circle of radius EARTH_CENTERED_ORBIT_RADIUS
 *  - 12 sign markers at λ = i · 30° (Aries at λ=0 along +x, ccw)
 *  - Sun disc at sunLongitude on the circle
 *  - Sight-line from Earth through the Sun to the highlighted sign
 *
 * Gate: the sight-line's sign matches ZodiacSunStrip / sunSignIndex for the
 * same sunLongitude (shared model Property).
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Multilink } from "scenerystack/axon";
import { Circle, Line, Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { CONTROL_FONT_SIZE, EARTH_CENTERED_ORBIT_RADIUS, EARTH_GLOBE_RADIUS } from "../../MotionsOfTheSunConstants.js";
import type { ZodiacModel } from "../model/ZodiacModel.js";

const TWO_PI = 2 * Math.PI;
const LABEL_RADIUS = EARTH_CENTERED_ORBIT_RADIUS + 22;

/** Ecliptic longitude → screen position (λ=0 at +x / 3 o'clock, ccw = north-of-east). */
function lonToPoint(lon: number, radius: number): { x: number; y: number } {
  return {
    x: radius * Math.cos(lon),
    y: -radius * Math.sin(lon),
  };
}

export class EarthCenteredZodiacNode extends Node {
  public constructor(model: ZodiacModel, signLabelProperties: ReadonlyArray<TReadOnlyProperty<string>>) {
    super({ pickable: false });

    const R = EARTH_CENTERED_ORBIT_RADIUS;

    const orbit = new Circle(R, {
      stroke: MotionsOfTheSunColors.orbitPathColorProperty,
      lineWidth: 1.5,
      fill: null,
    });

    const earth = new Circle(EARTH_GLOBE_RADIUS * 0.7, {
      fill: MotionsOfTheSunColors.earthFillColorProperty,
      stroke: MotionsOfTheSunColors.earthMeridianColorProperty,
      lineWidth: 1,
    });

    // Sign tick marks + labels
    const signLayer = new Node();
    const signHighlights: Circle[] = [];
    for (let i = 0; i < 12; i++) {
      const lon = (i / 12) * TWO_PI;
      const onOrbit = lonToPoint(lon, R);
      const onLabel = lonToPoint(lon, LABEL_RADIUS);

      const tick = new Circle(3, {
        fill: MotionsOfTheSunColors.zodiacDividerColorProperty,
        centerX: onOrbit.x,
        centerY: onOrbit.y,
      });
      signHighlights.push(tick);

      const labelProp = signLabelProperties[i];
      if (labelProp) {
        signLayer.addChild(
          new Text(labelProp, {
            font: new PhetFont(CONTROL_FONT_SIZE - 2),
            fill: MotionsOfTheSunColors.zodiacLabelColorProperty,
            centerX: onLabel.x,
            centerY: onLabel.y,
            maxWidth: 56,
          }),
        );
      }
      signLayer.addChild(tick);
    }

    const sightLine = new Line(0, 0, R, 0, {
      stroke: MotionsOfTheSunColors.sunColorProperty,
      lineWidth: 1.5,
      lineDash: [6, 4],
      opacity: 0.85,
    });

    const sunDisc = new Circle(10, {
      fill: MotionsOfTheSunColors.sunColorProperty,
      stroke: "rgba(255,255,255,0.5)",
      lineWidth: 1,
    });

    this.children = [orbit, sightLine, signLayer, earth, sunDisc];

    Multilink.multilink([model.sunLongitudeRadProperty, model.sunSignIndexProperty], (lon, signIndex) => {
      const p = lonToPoint(lon, R);
      sunDisc.centerX = p.x;
      sunDisc.centerY = p.y;
      sightLine.setPoint2(p.x * 1.15, p.y * 1.15);

      for (let i = 0; i < signHighlights.length; i++) {
        const tick = signHighlights[i];
        if (!tick) {
          continue;
        }
        const active = i === signIndex;
        tick.setScaleMagnitude(active ? 2 : 1);
        tick.opacity = active ? 1 : 0.7;
      }
    });
  }
}
