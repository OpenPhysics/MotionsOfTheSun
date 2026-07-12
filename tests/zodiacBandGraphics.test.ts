/**
 * zodiacBandGraphics.test.ts
 *
 * Smoke tests for Flash zodiac-band mask / gradient helpers.
 */

import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { SkyProjection } from "../src/common/SkyProjection.js";
import { buildZodiacBandMasks, zodiacBandGradientEndpoints } from "../src/zodiac/view/zodiacBandGraphics.js";

describe("zodiacBandGraphics", () => {
  const projection = new SkyProjection({
    center: new Vector2(200, 200),
    radius: 200,
    azimuth: 0,
    elevation: -0.5,
  });

  it("buildZodiacBandMasks returns non-empty front and back shapes", () => {
    const { frontMask, backMask } = buildZodiacBandMasks(projection);
    expect(frontMask.getArea()).toBeGreaterThan(0);
    expect(backMask.getArea()).toBeGreaterThan(0);
  });

  it("gradient endpoints are distinct screen points", () => {
    const { dark, light } = zodiacBandGradientEndpoints(projection, 0);
    expect(dark.distance(light)).toBeGreaterThan(1);
  });
});
