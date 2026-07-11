/**
 * MotionsOfTheSunScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for the three Motions of the Sun
 * screens. Each icon is drawn from scenery primitives on the standard PhET
 * 548 × 373 icon canvas and uses MotionsOfTheSunColors so it follows the active
 * (default / projector) color profile.
 *
 *   Sun Paths          — horizon dome with three sun-path arcs and a sun disc.
 *   Sidereal/Solar     — sun at center, orbit circle, Earth disc with meridian.
 *   Zodiac             — zodiac band with constellation lines and sun disc.
 */
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import MotionsOfTheSunColors from "../MotionsOfTheSunColors.js";

// ── Canvas dimensions (PhET standard icon size) ────────────────────────────────
const W = 548;
const H = 373;
const CX = W / 2;
const CY = H / 2;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, {
    fill: MotionsOfTheSunColors.backgroundColorProperty,
  });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: MotionsOfTheSunColors.backgroundColorProperty,
  });
}

/** Filled lower semicircle (the ground disk). */
function groundSemicircle(centerX: number, horizonY: number, radius: number): Path {
  return new Path(
    new Shape()
      .moveTo(centerX - radius, horizonY)
      .arc(centerX, horizonY, radius, Math.PI, 0, false)
      .close(),
    { fill: MotionsOfTheSunColors.groundColorProperty },
  );
}

/** Upper semicircle arc (the dome silhouette). */
function domeArc(centerX: number, horizonY: number, radius: number, lineWidth: number): Path {
  return new Path(new Shape().moveTo(centerX - radius, horizonY).arc(centerX, horizonY, radius, Math.PI, 0, true), {
    stroke: MotionsOfTheSunColors.sphereOutlineColorProperty,
    lineWidth,
    lineCap: "round",
  });
}

/**
 * Sun-path arc: drawn as an altitude-ring arc on the dome.
 * Each arc represents the daily path of the Sun at a particular declination.
 */
function sunPathArc(
  centerX: number,
  horizonY: number,
  domRadius: number,
  elevationDeg: number,
  lineWidth: number,
  opacity: number,
): Path {
  const elRad = (elevationDeg * Math.PI) / 180;
  const ringRadius = domRadius * Math.cos(elRad);
  const ringCenterY = horizonY - domRadius * Math.sin(elRad);
  return new Path(
    new Shape().moveTo(centerX - ringRadius, ringCenterY).arc(centerX, ringCenterY, ringRadius, Math.PI, 0, true),
    {
      stroke: MotionsOfTheSunColors.sunPathColorProperty,
      lineWidth,
      opacity,
      lineCap: "round",
      lineDash: [10, 6],
    },
  );
}

/** Bright sun disc. */
function sunDisc(x: number, y: number, radius: number): Circle {
  return new Circle(radius, {
    fill: MotionsOfTheSunColors.sunColorProperty,
    centerX: x,
    centerY: y,
  });
}

// ── Sun Paths icon ────────────────────────────────────────────────────────────

export function createSunPathsIcon(): ScreenIcon {
  const horizonY = CY + 40;
  const domRadius = 130;

  // Three arcs at winter (20°), equinox (45°), and summer (68°) declinations.
  // Sun disc placed inside the dome at a plausible afternoon position.
  const sunX = CX + domRadius * 0.32;
  const sunY = horizonY - domRadius * 0.48;

  return iconFrom(
    new Node({
      children: [
        background(),
        groundSemicircle(CX, horizonY, domRadius),
        new Line(CX - domRadius, horizonY, CX + domRadius, horizonY, {
          stroke: MotionsOfTheSunColors.horizonColorProperty,
          lineWidth: 3,
          lineCap: "round",
        }),
        domeArc(CX, horizonY, domRadius, 3),
        sunPathArc(CX, horizonY, domRadius, 18, 1.5, 0.45), // winter path
        sunPathArc(CX, horizonY, domRadius, 45, 2.0, 0.6), // equinox path
        sunPathArc(CX, horizonY, domRadius, 68, 2.5, 0.8), // summer path
        sunDisc(sunX, sunY, 13),
      ],
    }),
  );
}

// ── Sidereal and Solar Time icon ──────────────────────────────────────────────

export function createSiderealSolarTimeIcon(): ScreenIcon {
  const orbitRadius = 95;
  const earthRadius = 15;

  // Earth at the right of its orbit, angled slightly downward.
  const earthAngle = Math.PI / 5; // ~36° clockwise from top-right
  const earthX = CX + orbitRadius * Math.sin(earthAngle);
  const earthY = CY - orbitRadius * Math.cos(earthAngle);

  // Orbit ellipse (circle in this 2-D icon).
  const orbit = new Circle(orbitRadius, {
    stroke: MotionsOfTheSunColors.orbitPathColorProperty,
    lineWidth: 2,
    fill: null,
    centerX: CX,
    centerY: CY,
  });

  // Sun disc at center.
  const sun = new Circle(30, {
    fill: MotionsOfTheSunColors.sunColorProperty,
    centerX: CX,
    centerY: CY,
  });

  // Earth globe disc.
  const earth = new Circle(earthRadius, {
    fill: MotionsOfTheSunColors.earthFillColorProperty,
    stroke: MotionsOfTheSunColors.sphereOutlineColorProperty,
    lineWidth: 1.5,
    centerX: earthX,
    centerY: earthY,
  });

  // Noon-meridian line through the Earth disc (vertical in this orientation).
  const meridian = new Line(earthX, earthY - earthRadius, earthX, earthY + earthRadius, {
    stroke: MotionsOfTheSunColors.earthMeridianColorProperty,
    lineWidth: 2,
    lineCap: "round",
  });

  return iconFrom(new Node({ children: [background(), orbit, sun, earth, meridian] }));
}

// ── Zodiac icon ───────────────────────────────────────────────────────────────

export function createZodiacIcon(): ScreenIcon {
  const bandHeight = 52;
  const bandWidth = W * 0.82;
  const bandX = (W - bandWidth) / 2;
  const bandY = CY + 20; // center of the band, slightly below canvas center

  // Zodiac band background.
  const band = new Rectangle(bandX, bandY - bandHeight / 2, bandWidth, bandHeight, {
    fill: MotionsOfTheSunColors.zodiacBandColorProperty,
    stroke: MotionsOfTheSunColors.zodiacBorderColorProperty,
    lineWidth: 2.5,
  });

  // Sign dividers (5 evenly-spaced dividers creating 6 visible cells).
  const numDividers = 5;
  const dividers = Array.from({ length: numDividers }, (_, i) => {
    const x = bandX + ((i + 1) / (numDividers + 1)) * bandWidth;
    return new Line(x, bandY - bandHeight / 2, x, bandY + bandHeight / 2, {
      stroke: MotionsOfTheSunColors.zodiacDividerColorProperty,
      lineWidth: 1.5,
    });
  });

  // Sun disc centered in the second cell (marker for current sun position).
  const sunCellFraction = 1.5 / (numDividers + 1); // center of second cell
  const sunOnBandX = bandX + sunCellFraction * bandWidth;
  const sunOnBand = sunDisc(sunOnBandX, bandY, 11);

  // Simple constellation stick figure above the band (suggests Scorpius-like shape).
  const cx0 = CX - 30;
  const cy0 = CY - 55;
  const constellation = new Path(
    new Shape()
      .moveTo(cx0 - 75, cy0 + 18)
      .lineTo(cx0 - 45, cy0 + 5)
      .lineTo(cx0 - 15, cy0)
      .lineTo(cx0 + 15, cy0 + 10)
      .lineTo(cx0 + 45, cy0 + 2)
      .lineTo(cx0 + 75, cy0 + 14)
      .moveTo(cx0 - 15, cy0)
      .lineTo(cx0 - 5, cy0 - 22)
      .moveTo(cx0 + 15, cy0 + 10)
      .lineTo(cx0 + 10, cy0 + 32),
    {
      stroke: MotionsOfTheSunColors.constellationLineColorProperty,
      lineWidth: 2.5,
      lineCap: "round",
      lineJoin: "round",
    },
  );

  // Star dots at constellation vertices.
  const starPositions: [number, number][] = [
    [cx0 - 75, cy0 + 18],
    [cx0 - 45, cy0 + 5],
    [cx0 - 15, cy0],
    [cx0 + 15, cy0 + 10],
    [cx0 + 45, cy0 + 2],
    [cx0 + 75, cy0 + 14],
    [cx0 - 5, cy0 - 22],
    [cx0 + 10, cy0 + 32],
  ];
  const starDots = starPositions.map(
    ([x, y]) =>
      new Circle(3.5, {
        fill: MotionsOfTheSunColors.starColorProperty,
        centerX: x,
        centerY: y,
      }),
  );

  return iconFrom(
    new Node({
      children: [background(), constellation, ...starDots, band, ...dividers, sunOnBand],
    }),
  );
}
