/**
 * ZodiacSunStrip.ts
 *
 * Zodiac strip panorama (pedagogical port addition D8): ecliptic starfield with
 * constellation stick figures, east/west labels, and a Sun marker — styled after
 * the NAAP Planetary Configurations Simulator strip (`configurationsSimulator`,
 * Flash `Zodiac Strip.as`).
 *
 * Longitude → x uses the Flash/SSM convention: `x = (−λ · W / 2π) mod W`.
 * Latitude → y uses the same angular scale (Flash `111.408… = 700/2π`, then
 * scaled by `W/700`), with the ecliptic along the strip midline.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Multilink } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { ECLIPTIC_CONSTELLATIONS } from "../../common/ZodiacConstellationsData.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { ZODIAC_STRIP_HEIGHT, ZODIAC_STRIP_WIDTH } from "../../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../../MotionsOfTheSunNamespace.js";
import { SIGN_KEYS } from "../model/ZodiacModel.js";

const W = ZODIAC_STRIP_WIDTH;
const H = ZODIAC_STRIP_HEIGHT;
const TWO_PI = 2 * Math.PI;
const LONGITUDE_TO_X = W / TWO_PI;
const STAR_RADIUS = 1.15;
const SUN_GAP = 10; // half-gap in the vertical tick where the sun disc sits
const LABEL_FONT = new PhetFont(10);
const DIRECTION_FONT = new PhetFont({ size: 11, weight: "bold" });

/** Map ecliptic longitude (rad) to strip x — SSM / Flash `lonToX`. */
function lonToX(lon: number): number {
  return (((-lon * LONGITUDE_TO_X) % W) + W) % W;
}

export class ZodiacSunStrip extends Node {
  public constructor(
    sunLongitudeRadProperty: TReadOnlyProperty<number>,
    sunSignIndexProperty: TReadOnlyProperty<number>,
    signLabelProperties: ReadonlyMap<string, TReadOnlyProperty<string>>,
    eastStringProperty: TReadOnlyProperty<string>,
    westStringProperty: TReadOnlyProperty<string>,
    sunLabelStringProperty: TReadOnlyProperty<string>,
  ) {
    super();

    // ── Band + clipped starfield ──────────────────────────────────────────
    const band = new Rectangle(0, 0, W, H, {
      fill: MotionsOfTheSunColors.zodiacBandColorProperty,
      stroke: MotionsOfTheSunColors.zodiacBorderColorProperty,
      lineWidth: 1,
    });
    this.addChild(band);

    const starfield = new Node({ clipArea: Shape.rectangle(0, 0, W, H) });
    this.addChild(starfield);

    const normalLines = new Path(null, {
      stroke: MotionsOfTheSunColors.zodiacStripConstellationLineColorProperty,
      lineWidth: 1,
      pickable: false,
    });
    const normalStars = new Path(null, {
      fill: MotionsOfTheSunColors.zodiacStripStarColorProperty,
      stroke: null,
      pickable: false,
    });
    const activeLines = new Path(null, {
      stroke: MotionsOfTheSunColors.zodiacStripActiveConstellationColorProperty,
      lineWidth: 1.5,
      pickable: false,
    });
    const activeStars = new Path(null, {
      fill: MotionsOfTheSunColors.zodiacStripActiveConstellationColorProperty,
      stroke: null,
      pickable: false,
    });
    starfield.addChild(normalLines);
    starfield.addChild(normalStars);
    starfield.addChild(activeLines);
    starfield.addChild(activeStars);

    // Static normal constellation art (all signs).
    const { lines: allLines, stars: allStars } = buildConstellationShapes(null);
    normalLines.shape = allLines;
    normalStars.shape = allStars;

    // Active sign name (Flash hover label), above the strip near the sign center.
    const activeNameText = new Text("", {
      font: new PhetFont({ size: 11, weight: "bold" }),
      fill: MotionsOfTheSunColors.zodiacStripActiveConstellationColorProperty,
      maxWidth: 80,
    });
    this.addChild(activeNameText);

    // ── East / west end labels (Flash strip chrome) ───────────────────────
    const eastLabel = new Text(eastStringProperty, {
      font: DIRECTION_FONT,
      fill: MotionsOfTheSunColors.zodiacLabelColorProperty,
      rotation: -Math.PI / 2,
    });
    eastLabel.centerX = 10;
    eastLabel.centerY = H / 2;
    this.addChild(eastLabel);

    const westLabel = new Text(westStringProperty, {
      font: DIRECTION_FONT,
      fill: MotionsOfTheSunColors.zodiacLabelColorProperty,
      rotation: Math.PI / 2,
    });
    westLabel.centerX = W - 10;
    westLabel.centerY = H / 2;
    this.addChild(westLabel);

    // ── Sun marker + vertical tick + "sun" label ──────────────────────────
    const sunTick = new Path(null, {
      stroke: MotionsOfTheSunColors.zodiacStripTickColorProperty,
      lineWidth: 1,
      pickable: false,
    });
    this.addChild(sunTick);

    const sunMarker = new Circle(6, {
      fill: MotionsOfTheSunColors.sunColorProperty,
      centerY: H / 2,
    });
    this.addChild(sunMarker);

    const sunLabel = new Text(sunLabelStringProperty, {
      font: LABEL_FONT,
      fill: MotionsOfTheSunColors.sunColorProperty,
    });
    this.addChild(sunLabel);

    const updateSunAndActive = (lon: number, signIndex: number) => {
      const x = lonToX(lon);
      sunMarker.centerX = x;

      // Vertical tick through the sun, with a gap for the disc (Flash label ticks).
      sunTick.shape = new Shape()
        .moveTo(x, -16)
        .lineTo(x, H / 2 - SUN_GAP)
        .moveTo(x, H / 2 + SUN_GAP)
        .lineTo(x, H + 12);

      sunLabel.centerX = x;
      sunLabel.bottom = -18;

      const signKey = SIGN_KEYS[signIndex] ?? "aries";
      const activeName = constellationNameForSign(signKey);
      const { lines, stars, centerX } = buildConstellationShapes(activeName);
      activeLines.shape = lines;
      activeStars.shape = stars;

      const labelProp = signLabelProperties.get(signKey);
      activeNameText.string = labelProp?.value ?? signKey;
      activeNameText.centerX = centerX ?? x;
      activeNameText.bottom = -2;
    };

    Multilink.multilink([sunLongitudeRadProperty, sunSignIndexProperty], updateSunAndActive);

    // Keep the active name localized when the locale changes.
    for (const prop of signLabelProperties.values()) {
      prop.lazyLink(() => {
        updateSunAndActive(sunLongitudeRadProperty.value, sunSignIndexProperty.value);
      });
    }
  }
}

/**
 * Build stick-figure + star shapes for either all constellations (`activeName`
 * null) or a single named constellation. Returns a rough center-x for labeling.
 */
function buildConstellationShapes(activeName: string | null): {
  lines: Shape;
  stars: Shape;
  centerX: number | null;
} {
  const lines = new Shape();
  const stars = new Shape();
  const cy = H / 2;
  let sumX = 0;
  let n = 0;

  for (const constellation of ECLIPTIC_CONSTELLATIONS) {
    if (activeName !== null && constellation.name !== activeName) {
      continue;
    }

    const positions = constellation.eclipticStars.map((star) => {
      const x = lonToX(star.lon);
      const y = cy - star.lat * LONGITUDE_TO_X;
      return { x, y };
    });

    for (const poly of constellation.polylines) {
      let penDown = false;
      let prev: { x: number; y: number } | null = null;
      for (const idx of poly) {
        const pos = positions[idx];
        if (!pos) {
          penDown = false;
          prev = null;
          continue;
        }
        if (!penDown || prev === null) {
          lines.moveTo(pos.x, pos.y);
          penDown = true;
        } else if (Math.abs(pos.x - prev.x) > W / 2) {
          // Wrap seam — lift the pen (Flash special-cases Scorpius similarly).
          lines.moveTo(pos.x, pos.y);
        } else {
          lines.lineTo(pos.x, pos.y);
        }
        prev = pos;
      }
    }

    for (const pos of positions) {
      stars.circle(pos.x, pos.y, STAR_RADIUS);
      sumX += pos.x;
      n++;
    }
  }

  return { lines, stars, centerX: n > 0 ? sumX / n : null };
}

function constellationNameForSign(signKey: string): string {
  return signKey === "capricorn" ? "capricornus" : signKey;
}

MotionsOfTheSunNamespace.register("ZodiacSunStrip", ZodiacSunStrip);
