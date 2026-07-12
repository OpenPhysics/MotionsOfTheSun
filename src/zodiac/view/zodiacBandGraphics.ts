/**
 * zodiacBandGraphics.ts
 *
 * Zodiac-band gradient masks transcribed from ZodiacViewer.as
 * (`updateZodiacBand` + `drawZodiacBandMasks`).
 *
 * Flash draws full-sphere day/night linear gradients on front/back surfaces,
 * then masks them to the ±24° ecliptic band. Here we build front/back filled
 * band shapes directly and paint LinearGradients clipped to those masks.
 */

import type { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { worldDepth } from "../../common/view/skyGraphics.js";
import {
  eclipticToVector3,
  ZODIAC_BAND_GRADIENT_WIDTH_DEG,
  ZODIAC_BAND_HALF_ANGLE_DEG,
} from "../model/geocentricZodiacMath.js";

const TWO_PI = 2 * Math.PI;
const DEG = Math.PI / 180;
const BAND_HALF_RAD = ZODIAC_BAND_HALF_ANGLE_DEG * DEG;
const GRADIENT_WIDTH_RAD = ZODIAC_BAND_GRADIENT_WIDTH_DEG * DEG;

/** Longitude samples around the ecliptic for the band mesh. */
const BAND_LON_SAMPLES = 72;

export type ZodiacBandShapes = {
  /** Near-side band fill (mask for the front gradient). */
  frontMask: Shape;
  /** Far-side band fill (mask for the back gradient). */
  backMask: Shape;
};

/**
 * Build front/back filled shapes for the ecliptic strip |β| ≤ halfAngle.
 * Each longitude step forms a quad; quads are routed by average camera depth.
 */
export const buildZodiacBandMasks = (projection: SkyProjection, halfAngleRad = BAND_HALF_RAD): ZodiacBandShapes => {
  const frontMask = new Shape();
  const backMask = new Shape();

  const north: Vector3[] = [];
  const south: Vector3[] = [];
  for (let i = 0; i < BAND_LON_SAMPLES; i++) {
    const lon = (i / BAND_LON_SAMPLES) * TWO_PI;
    north.push(eclipticToVector3(lon, halfAngleRad));
    south.push(eclipticToVector3(lon, -halfAngleRad));
  }

  for (let i = 0; i < BAND_LON_SAMPLES; i++) {
    const j = (i + 1) % BAND_LON_SAMPLES;
    const n0 = north[i];
    const n1 = north[j];
    const s1 = south[j];
    const s0 = south[i];
    if (!(n0 && n1 && s1 && s0)) {
      continue;
    }

    const depth =
      (worldDepth(projection, n0) +
        worldDepth(projection, n1) +
        worldDepth(projection, s1) +
        worldDepth(projection, s0)) /
      4;
    const target = depth >= 0 ? frontMask : backMask;

    const p0 = projection.project(n0);
    const p1 = projection.project(n1);
    const p2 = projection.project(s1);
    const p3 = projection.project(s0);
    target.moveToPoint(p0).lineToPoint(p1).lineToPoint(p2).lineToPoint(p3).close();
  }

  return { frontMask, backMask };
};

export type ZodiacBandGradientEndpoints = {
  /** Screen point on the dark (night) side of the blend. */
  dark: Vector2;
  /** Screen point on the light (day) side of the blend. */
  light: Vector2;
  /** True when the terminator mid-point faces the camera (Flash `inFront`). */
  terminatorInFront: boolean;
};

/**
 * Flash gradient endpoints from `updateZodiacBand`:
 * terminator at `globe.az − 90` (= sunLon − π), with ±15° blend width.
 *
 * With our λ convention, Earth is opposite the Sun, so terminator mid-longitude
 * on the ecliptic is `sunLon − π/2`.
 */
export const zodiacBandGradientEndpoints = (
  projection: SkyProjection,
  sunLongitudeRad: number,
): ZodiacBandGradientEndpoints => {
  const terminatorLon = sunLongitudeRad - Math.PI / 2;
  const darkWorld = eclipticToVector3(terminatorLon - GRADIENT_WIDTH_RAD, 0);
  const lightWorld = eclipticToVector3(terminatorLon + GRADIENT_WIDTH_RAD, 0);
  const midWorld = eclipticToVector3(terminatorLon, 0);

  return {
    dark: projection.project(darkWorld),
    light: projection.project(lightWorld),
    terminatorInFront: worldDepth(projection, midWorld) >= 0,
  };
};
