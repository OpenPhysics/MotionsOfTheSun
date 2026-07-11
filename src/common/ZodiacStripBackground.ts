/**
 * ZodiacStripBackground.ts
 *
 * Verbatim copy from SolarSystemModels `src/common/ZodiacStripBackground.ts`
 * with colors rename: SolarSystemModelsColors → MotionsOfTheSunColors.
 *
 * Shared zodiac strip chrome: background band, 12 evenly spaced sign labels,
 * and dividers between them. Screen-specific overlays (sun marker, etc.) are
 * added by the caller on top of this Node.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Node, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import MotionsOfTheSunColors from "../MotionsOfTheSunColors.js";

/** Wrap x into [0, width) — shared by both zodiac strips' longitude→x mapping. */
export function wrapToWidth(x: number, width: number): number {
  return ((x % width) + width) % width;
}

/**
 * Shared "view from Earth" zodiac strip chrome: background band, 12 evenly
 * spaced sign labels, and dividers between them. Screen-specific overlays
 * (constellation art, sun/planet markers, elongation labels, ...) are added
 * by the caller on top of this Node.
 */
export class ZodiacStripBackground extends Node {
  public constructor(width: number, height: number, signStringProperties: readonly TReadOnlyProperty<string>[]) {
    super();

    const band = new Rectangle(0, 0, width, height, {
      fill: MotionsOfTheSunColors.zodiacBandColorProperty,
      stroke: MotionsOfTheSunColors.zodiacBorderColorProperty,
      lineWidth: 1,
    });
    this.addChild(band);

    const segW = width / 12;
    signStringProperties.forEach((signStringProperty, i) => {
      const label = new Text(signStringProperty, {
        font: new PhetFont(9),
        fill: MotionsOfTheSunColors.zodiacLabelColorProperty,
        maxWidth: segW - 4,
      });
      label.centerX = (i + 0.5) * segW;
      label.centerY = height * 0.25;
      this.addChild(label);

      if (i > 0) {
        const divider = new Rectangle(i * segW, 0, 1, height, {
          fill: MotionsOfTheSunColors.zodiacDividerColorProperty,
        });
        this.addChild(divider);
      }
    });
  }
}
