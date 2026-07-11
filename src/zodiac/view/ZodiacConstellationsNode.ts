/**
 * ZodiacConstellationsNode.ts
 *
 * Renders the 12 zodiac constellations as polyline stick figures + star dots in the
 * Lambert azimuthal sky projection. Each star's ecliptic (lon, lat) position is
 * converted to equatorial (ra, dec) using the inverse of `equatorialToEcliptic`
 * (from ZodiacConstellationsData), then projected onto the screen via `projectCelestial`.
 *
 * Labels are shown/hidden via `constellationLabelsVisibleProperty`.
 *
 * Formula (ecliptic → equatorial; porting plan Step 4.5):
 *   dec = asin(sin lat · cos ε + cos lat · sin ε · sin lon)
 *   ra  = atan2(cos lat · sin lon · cos ε − sin lat · sin ε,  cos lat · cos lon)
 */

import { Multilink } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { ECLIPTIC_CONSTELLATIONS, OBLIQUITY } from "../../common/ZodiacConstellationsData.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import MotionsOfTheSunNamespace from "../../MotionsOfTheSunNamespace.js";
import type { ZodiacModel } from "../model/ZodiacModel.js";
import { projectCelestial, viewOffset } from "./lambertProjection.js";

const SIN_OBL = Math.sin(OBLIQUITY);
const COS_OBL = Math.cos(OBLIQUITY);

/** Convert ecliptic (lon, lat) → equatorial (ra, dec) — inverse of equatorialToEcliptic. */
function eclipticToEquatorial(lon: number, lat: number): { ra: number; dec: number } {
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);

  const dec = Math.asin(sinLat * COS_OBL + cosLat * SIN_OBL * sinLon);
  const ra = Math.atan2(cosLat * sinLon * COS_OBL - sinLat * SIN_OBL, cosLat * cosLon);
  return { ra, dec };
}

export class ZodiacConstellationsNode extends Node {
  private readonly widthPx: number;
  private readonly offset: number;
  private readonly originX: number;
  private readonly labelContainer: Node;
  private readonly lineContainer: Node;
  private readonly dotContainer: Node;

  public constructor(model: ZodiacModel, widthPx: number, labelStrings: Record<string, string>) {
    super({ pickable: false });

    this.widthPx = widthPx;
    this.offset = viewOffset(widthPx);
    this.originX = widthPx / 2;

    this.lineContainer = new Node();
    this.dotContainer = new Node();
    this.labelContainer = new Node();

    this.addChild(this.lineContainer);
    this.addChild(this.dotContainer);
    this.addChild(this.labelContainer);

    // Build static constellation art layers; they are redrawn on siderealTime changes
    Multilink.lazyMultilink([model.siderealTimeRadProperty], (lst) => {
      this._redraw(lst, labelStrings);
    });

    // Bind label visibility
    model.constellationLabelsVisibleProperty.link((v) => {
      this.labelContainer.visible = v;
    });

    // Initial draw
    this._redraw(model.siderealTimeRadProperty.value, labelStrings);
  }

  private _redraw(lst: number, labelStrings: Record<string, string>): void {
    this.lineContainer.removeAllChildren();
    this.dotContainer.removeAllChildren();
    this.labelContainer.removeAllChildren();

    for (const constellation of ECLIPTIC_CONSTELLATIONS) {
      // Convert all stars from ecliptic → equatorial, then project
      const screenPositions: Array<{ x: number; y: number } | null> = constellation.eclipticStars.map(
        ({ lon, lat }) => {
          const { ra, dec } = eclipticToEquatorial(lon, lat);
          const pt = projectCelestial(ra, dec, lst, this.widthPx);
          if (!pt) {
            return null;
          }
          return { x: this.originX + pt.x, y: this.offset + pt.y };
        },
      );

      // ── Polyline stick figures ──────────────────────────────────────────
      const lineShape = new Shape();
      for (const poly of constellation.polylines) {
        let penDown = false;
        for (const idx of poly) {
          const pos = screenPositions[idx];
          if (!pos) {
            penDown = false;
            continue;
          }
          if (!penDown) {
            lineShape.moveTo(pos.x, pos.y);
            penDown = true;
          } else {
            lineShape.lineTo(pos.x, pos.y);
          }
        }
      }
      const linePath = new Path(lineShape, {
        stroke: MotionsOfTheSunColors.constellationLineColorProperty,
        lineWidth: 1,
      });
      this.lineContainer.addChild(linePath);

      // ── Star dots (2 px radius) ─────────────────────────────────────────
      for (const pos of screenPositions) {
        if (!pos) {
          continue;
        }
        const dot = new Circle(2, {
          fill: MotionsOfTheSunColors.constellationLineColorProperty,
          centerX: pos.x,
          centerY: pos.y,
        });
        this.dotContainer.addChild(dot);
      }

      // ── Centroid label ──────────────────────────────────────────────────
      // Compute centroid from visible stars
      const visible = screenPositions.filter((p) => p !== null) as Array<{ x: number; y: number }>;
      if (visible.length > 0) {
        const cx = visible.reduce((sum, p) => sum + p.x, 0) / visible.length;
        const cy = visible.reduce((sum, p) => sum + p.y, 0) / visible.length;
        const nameStr = labelStrings[constellation.name] ?? constellation.name;
        const label = new Text(nameStr, {
          font: new PhetFont({ size: 10, style: "italic" }),
          fill: MotionsOfTheSunColors.constellationLabelColorProperty,
          centerX: cx,
          centerY: cy - 12,
        });
        this.labelContainer.addChild(label);
      }
    }
  }
}

MotionsOfTheSunNamespace.register("ZodiacConstellationsNode", ZodiacConstellationsNode);
