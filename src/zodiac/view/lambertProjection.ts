/**
 * lambertProjection.ts
 *
 * Pure functions implementing the Lambert azimuthal equal-area projection
 * used by the NAAP Zodiac sky view (ZodiacSkyView.as).
 *
 * The view is fixed at:
 *   latitude = 41° N, looking south (azimuth = π, altitude = −0.1 rad).
 *
 * Coordinate conventions (from Flash source):
 *   Horizon frame:  hx = cos(alt)·cos(az),  hy = −cos(alt)·sin(az),  hz = sin(alt)
 *   Celestial frame: cx = cos(dec)·cos(ra),  cy = cos(dec)·sin(ra),  cz = sin(dec)
 *
 * The two-step transform chain is:
 *   1. H  — horizon→world (fixed; depends only on view center az/alt)
 *   2. C  — celestial→horizon (depends on siderealTime; β = lat − π/2, α = −LST)
 *   3. M = H·C — celestial→world (precomputed per siderealTime)
 *
 * Sizing (from ZodiacSkyView.setWidth):
 *   height  = 0.54 · width
 *   offset  = 0.49 · width   (projection origin y below top edge)
 *   size    = 1.07 · width
 *   S       = size / 4        (scale factor)
 *
 * Screen origin = (width/2, offset) within the clipped rectangle.
 * Returned (x, y) are relative to that origin (positive y is downward).
 *
 * Physics source: NAAP/flash-animations/flashdev2/zodiacSimulator/ZodiacSkyView.as
 *   lines 154–162, 214–231, 794–914 (updateConstants, projectCelestialToScreen,
 *   projectHorizonToScreen, getAltitudeFromCelestialCoord).
 */

// ── Fixed view parameters ──────────────────────────────────────────────────────

const CENTER_AZIMUTH: number = Math.PI; // θ₀ = π (looking south)
const CENTER_ALTITUDE: number = -0.1; // φ₀ = −0.1 rad (slightly below horizon)
const LATITUDE_RAD: number = (41 * Math.PI) / 180; // 41° N

// Precomputed trig for center (these are constants since the view never pans)
const CPhi0: number = Math.cos(CENTER_ALTITUDE);
const SPhi0: number = Math.sin(CENTER_ALTITUDE);
const CTheta0: number = Math.cos(CENTER_AZIMUTH); // = −1
const STheta0: number = Math.sin(CENTER_AZIMUTH); // ≈ 0

// ── Horizon→world matrix H (constant) ─────────────────────────────────────────
// Transcribed from updateConstants (ZodiacSkyView.as lines 805–819)
// Row-major: [htw0 htw1 htw2; htw3 htw4 htw5; htw6 htw7 htw8]

const htw0: number = CPhi0 * CTheta0;
const htw1: number = -CPhi0 * STheta0;
const htw2: number = SPhi0;
const htw3: number = STheta0;
const htw4: number = CTheta0;
const htw5: number = 0;
const htw6: number = -SPhi0 * CTheta0;
const htw7: number = SPhi0 * STheta0;
const htw8: number = CPhi0;

// ── Sizing helpers ─────────────────────────────────────────────────────────────

/** View height in pixels for a given width. */
export function viewHeight(widthPx: number): number {
  return 0.54 * widthPx;
}

/**
 * y-offset of the projection origin below the top edge of the clipped rectangle.
 * The screen origin is at (width/2, offset) within the clip rect.
 */
export function viewOffset(widthPx: number): number {
  return 0.49 * widthPx;
}

/** Lambert scale factor S = (1.07 · width) / 4. */
function scaleFactor(widthPx: number): number {
  return (1.07 * widthPx) / 4;
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/** Apply Lambert equal-area formula: (wx, wy, wz) → screen (x, y) or null. */
function applyLambert(wx: number, wy: number, wz: number, S: number): { x: number; y: number } | null {
  if (wx <= -1) {
    return null; // antipodal — projection diverges
  }
  if (wx >= 1 - 1e-12) {
    // Center of view — converges to (0, 0) since wy, wz → 0 simultaneously
    return { x: 0, y: 0 };
  }
  const k = S * Math.sqrt(2 / (1 + wx));
  return { x: -k * wy, y: -k * wz };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Project a horizon-frame direction (azimuth az, altitude alt) to screen coords.
 * Returns null if the point is on the back hemisphere (antipodal to view center).
 *
 * @param az - azimuth in radians (0 = north, π = south)
 * @param alt - altitude in radians
 * @param widthPx - view width in pixels (determines scale)
 * @returns screen coords relative to the projection origin, or null
 */
export function projectHorizon(az: number, alt: number, widthPx: number): { x: number; y: number } | null {
  const hl = Math.cos(alt);
  const hx = hl * Math.cos(az);
  const hy = -hl * Math.sin(az);
  const hz = Math.sin(alt);

  const wx = htw0 * hx + htw1 * hy + htw2 * hz;
  const wy = htw3 * hx + htw4 * hy + htw5 * hz;
  const wz = htw6 * hx + htw7 * hy + htw8 * hz;

  return applyLambert(wx, wy, wz, scaleFactor(widthPx));
}

/**
 * Project a celestial-frame direction (right ascension ra, declination dec) to screen coords.
 * Requires the current Local Sidereal Time in radians.
 *
 * @param ra - right ascension in radians
 * @param dec - declination in radians
 * @param siderealTimeRad - LST in radians [0, 2π)
 * @param widthPx - view width in pixels
 * @returns screen coords relative to the projection origin, or null
 */
export function projectCelestial(
  ra: number,
  dec: number,
  siderealTimeRad: number,
  widthPx: number,
): { x: number; y: number } | null {
  const S = scaleFactor(widthPx);

  // ── Build celestial→horizon matrix C (depends on siderealTime) ───────────
  // β = latitude − π/2, α = −LST
  const beta = LATITUDE_RAD - Math.PI / 2;
  const alpha = -siderealTimeRad;
  const cb = Math.cos(beta);
  const sb = Math.sin(beta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  const cth0 = -cb * ca;
  const cth1 = cb * sa;
  const cth2 = -sb;
  const cth3 = -sa;
  const cth4 = -ca;
  // cth5 = 0
  const cth6 = -sb * ca;
  const cth7 = sb * sa;
  const cth8 = cb;

  // ── Combined M = H·C (celestial→world) ─────────────────────────────────
  const ctw0 = htw0 * cth0 + htw1 * cth3 + htw2 * cth6;
  const ctw1 = htw0 * cth1 + htw1 * cth4 + htw2 * cth7;
  const ctw2 = htw0 * cth2 + 0 /* htw1*cth5=0 */ + htw2 * cth8;
  const ctw3 = htw3 * cth0 + htw4 * cth3 + htw5 * cth6;
  const ctw4 = htw3 * cth1 + htw4 * cth4 + htw5 * cth7;
  const ctw5 = htw3 * cth2 + 0 + htw5 * cth8;
  const ctw6 = htw6 * cth0 + htw7 * cth3 + htw8 * cth6;
  const ctw7 = htw6 * cth1 + htw7 * cth4 + htw8 * cth7;
  const ctw8 = htw6 * cth2 + 0 + htw8 * cth8;

  // ── Celestial unit vector ────────────────────────────────────────────────
  const cl = Math.cos(dec);
  const cx = cl * Math.cos(ra);
  const cy = cl * Math.sin(ra);
  const cz = Math.sin(dec);

  const wx = ctw0 * cx + ctw1 * cy + ctw2 * cz;
  const wy = ctw3 * cx + ctw4 * cy + ctw5 * cz;
  const wz = ctw6 * cx + ctw7 * cy + ctw8 * cz;

  return applyLambert(wx, wy, wz, S);
}

/**
 * The y-coordinate of the horizon point (az = π, alt = 0) on the screen.
 * Used to split sky (above) from ground (below) in the rendered view.
 *
 * @param widthPx - view width in pixels
 * @returns y coordinate in projection-origin space (positive = downward)
 */
export function ySouth(widthPx: number): number {
  const pt = projectHorizon(Math.PI, 0, widthPx);
  // Should always be valid (south horizon is always in the visible hemisphere)
  return pt ? pt.y : 0;
}

/**
 * Altitude of a celestial point at the current LST.
 * asin(sin dec · sin φ + cos dec · cos(LST − ra) · cos φ)
 * Transcribed from ZodiacSkyView.as `getAltitudeFromCelestialCoord` (line 890–892).
 */
export function getAltitudeFromCelestial(ra: number, dec: number, siderealTimeRad: number): number {
  return Math.asin(
    Math.sin(dec) * Math.sin(LATITUDE_RAD) + Math.cos(dec) * Math.cos(siderealTimeRad - ra) * Math.cos(LATITUDE_RAD),
  );
}
