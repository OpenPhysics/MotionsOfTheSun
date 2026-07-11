/**
 * ZodiacSunStrip.ts
 *
 * A zodiac strip showing all 12 sign labels and a sun marker at the Sun's
 * current ecliptic longitude.
 *
 * Strip order: Pisces → Aries (rightward) — same convention as SSM's
 * `PtolemaicZodiacStrip`. The sun marker uses the Flash-convention longitude
 * mapping: `x = (−λ · W / 2π) mod W` (lonToX, cherry-picked from SSM
 * `PtolemaicZodiacStrip.ts` lines 24–26).
 *
 * Design decision D8: added even though Flash lacked a zodiac strip, because
 * it cheaply reinforces "the Sun moves through the zodiac signs".
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Circle, Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { ZodiacStripBackground } from "../../common/ZodiacStripBackground.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { ZODIAC_STRIP_HEIGHT, ZODIAC_STRIP_WIDTH } from "../../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../../MotionsOfTheSunNamespace.js";

const W = ZODIAC_STRIP_WIDTH;
const H = ZODIAC_STRIP_HEIGHT;
const TWO_PI = 2 * Math.PI;
const LONGITUDE_TO_X = W / TWO_PI;

/**
 * Map ecliptic longitude (rad) to strip x-coordinate.
 * Pisces (λ ≈ 2π) is at x ≈ 0; Aries (λ = 0) is at x = 0 (wraps to W).
 * Convention from SSM PtolemaicZodiacStrip.ts line 24.
 */
function lonToX(lon: number): number {
  return (((-lon * LONGITUDE_TO_X) % W) + W) % W;
}

export class ZodiacSunStrip extends Node {
  private readonly sunMarker: Circle;

  public constructor(
    signStringProperties: readonly TReadOnlyProperty<string>[],
    sunLongitudeRadProperty: TReadOnlyProperty<number>,
  ) {
    super();

    // Background chrome (labels + dividers)
    const background = new ZodiacStripBackground(W, H, signStringProperties);
    this.addChild(background);

    // Sun marker: yellow circle + "☉" label below the strip baseline
    this.sunMarker = new Circle(7, {
      fill: MotionsOfTheSunColors.sunColorProperty,
      centerY: H / 2 + 12,
    });
    const sunLabel = new Text("☉", {
      font: new PhetFont({ size: 10, weight: "bold" }),
      fill: MotionsOfTheSunColors.sunColorProperty,
      centerY: H / 2 + 12,
    });

    // Group marker + label so both move together
    const markerGroup = new Node({ children: [this.sunMarker, sunLabel] });
    this.addChild(markerGroup);

    sunLongitudeRadProperty.link((lon) => {
      const x = lonToX(lon);
      markerGroup.x = x;
      sunLabel.left = this.sunMarker.right + 2;
    });
  }
}

MotionsOfTheSunNamespace.register("ZodiacSunStrip", ZodiacSunStrip);
