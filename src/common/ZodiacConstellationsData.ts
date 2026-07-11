/**
 * ZodiacConstellationsData.ts
 *
 * Verbatim copy from SolarSystemModels `src/common/ZodiacConstellationsData.ts`
 * with namespace rename: SolarSystemModelsNamespace → MotionsOfTheSunNamespace.
 *
 * Provides ECLIPTIC_CONSTELLATIONS — each zodiac constellation as a set of
 * ecliptic (lon, lat) star positions plus polyline connectivity, derived from
 * the original NAAP Flash `constellationsData.as` pixel data.
 *
 * Also exports `equatorialToEcliptic` and `OBLIQUITY` for callers that need
 * the inverse transform (ecliptic → equatorial) using the same constant.
 */

import MotionsOfTheSunNamespace from "../MotionsOfTheSunNamespace.js";

type StarPos = { x: number; y: number };
type PathSeg = { m: number; b: number; e: number };

type ConstellationData = {
  name: string;
  path: PathSeg[];
  radius: number;
  center: { x: number; y: number; z: number };
  stars: StarPos[];
};

type EclipticStar = {
  lon: number; // ecliptic longitude (rad)
  lat: number; // ecliptic latitude (rad)
};

type EclipticConstellation = {
  name: string;
  eclipticStars: EclipticStar[];
  polylines: number[][]; // each polyline: [moveToIdx, lineToIdx_0, ..., lineToIdx_{n-1}]
};

// Raw star positions from NAAP Flash Constellations Data.as — pixel coords in
// an RA/Dec-like projection (RA_rad = -x * π / 350, Dec_rad = -y * π / 350).
const RAW_DATA: ConstellationData[] = [
  {
    name: "leo",
    path: [
      { m: 3, b: 0, e: 9 },
      { m: 7, b: 9, e: 12 },
      { m: 9, b: 12, e: 13 },
      { m: 9, b: 13, e: 15 },
      { m: 13, b: 0, e: 1 },
      { m: 13, b: 5, e: 6 },
      { m: 13, b: 15, e: 16 },
    ],
    radius: 0.314,
    center: { x: -0.882, y: 0.3367, z: 0.3296 },
    stars: [
      { x: 415.2, y: -46.2 },
      { x: 422.1, y: -44.7 },
      { x: 425.5, y: -50.9 },
      { x: 411.9, y: -50.6 },
      { x: 400.2, y: -45.5 },
      { x: 398.6, y: -37.6 },
      { x: 378, y: -39.2 },
      { x: 372.3, y: -39.9 },
      { x: 355.3, y: -28.3 },
      { x: 372.3, y: -30 },
      { x: 367.5, y: -20.5 },
      { x: 368.9, y: -11.7 },
      { x: 392.4, y: -18.1 },
      { x: 404.8, y: -32.6 },
      { x: 404.3, y: -23.3 },
      { x: 417.5, y: -19.2 },
    ],
  },
  {
    name: "gemini",
    path: [
      { m: 0, b: 1, e: 10 },
      { m: 7, b: 10, e: 12 },
      { m: 3, b: 12, e: 13 },
      { m: 4, b: 13, e: 14 },
      { m: 4, b: 14, e: 16 },
      { m: 6, b: 16, e: 17 },
      { m: 6, b: 17, e: 18 },
    ],
    radius: 0.206,
    center: { x: -0.2192, y: 0.8859, z: 0.4089 },
    stars: [
      { x: 523, y: -45.2 },
      { x: 517.8, y: -43.8 },
      { x: 513.8, y: -43.8 },
      { x: 503.7, y: -48.9 },
      { x: 490.4, y: -58.8 },
      { x: 483.3, y: -54.1 },
      { x: 478.4, y: -52.3 },
      { x: 486.1, y: -42.7 },
      { x: 493.8, y: -40 },
      { x: 506.6, y: -31.9 },
      { x: 487, y: -32.2 },
      { x: 503, y: -25.1 },
      { x: 510.9, y: -39.3 },
      { x: 499.3, y: -66 },
      { x: 481.7, y: -61.8 },
      { x: 479, y: -62 },
      { x: 473.8, y: -54.5 },
      { x: 474.2, y: -47.4 },
    ],
  },
  {
    name: "sagittarius",
    path: [
      { m: 5, b: 0, e: 11 },
      { m: 2, b: 5, e: 6 },
      { m: 11, b: 8, e: 9 },
      { m: 11, b: 7, e: 8 },
      { m: 15, b: 12, e: 17 },
      { m: 14, b: 17, e: 19 },
      { m: 7, b: 12, e: 13 },
      { m: 6, b: 13, e: 14 },
    ],
    radius: 0.264,
    center: { x: 0.2427, y: -0.8266, z: -0.5078 },
    stars: [
      { x: 163.2, y: 66.9 },
      { x: 166.4, y: 71.5 },
      { x: 172.2, y: 59.2 },
      { x: 168.3, y: 40.9 },
      { x: 161.4, y: 49.4 },
      { x: 164.8, y: 58 },
      { x: 152.8, y: 52.5 },
      { x: 148.1, y: 51.1 },
      { x: 141.1, y: 40.9 },
      { x: 135.3, y: 34.7 },
      { x: 135.3, y: 31 },
      { x: 146.9, y: 41 },
      { x: 142.4, y: 53.8 },
      { x: 144.6, y: 58.1 },
      { x: 134.2, y: 79 },
      { x: 116.8, y: 68.6 },
      { x: 119, y: 81.4 },
      { x: 134.8, y: 86.4 },
      { x: 134.6, y: 87.1 },
    ],
  },
  {
    name: "capricornus",
    path: [
      { m: 3, b: 0, e: 6 },
      { m: 2, b: 6, e: 10 },
      { m: 2, b: 8, e: 9 },
      { m: 6, b: 10, e: 11 },
      { m: 7, b: 11, e: 13 },
    ],
    radius: 0.1933,
    center: { x: 0.6814, y: -0.6764, z: -0.2795 },
    stars: [
      { x: 73.5, y: 42.4 },
      { x: 74.6, y: 43.6 },
      { x: 84.6, y: 33.5 },
      { x: 76.7, y: 32.7 },
      { x: 68, y: 32.4 },
      { x: 64.6, y: 31.4 },
      { x: 85.4, y: 38.6 },
      { x: 102.6, y: 34.6 },
      { x: 106.5, y: 28.7 },
      { x: 107.9, y: 24.4 },
      { x: 84, y: 48.6 },
      { x: 94.3, y: 49.1 },
      { x: 91.5, y: 52.3 },
    ],
  },
  {
    name: "aries",
    path: [
      { m: 2, b: 0, e: 6 },
      { m: 5, b: 3, e: 4 },
      { m: 3, b: 7, e: 8 },
      { m: 6, b: 7, e: 10 },
      { m: 8, b: 0, e: 1 },
    ],
    radius: 0.1627,
    center: { x: 0.7356, y: 0.5787, z: 0.3522 },
    stars: [
      { x: 617.4, y: -53 },
      { x: 618.4, y: -56.9 },
      { x: 620.6, y: -53.9 },
      { x: 638.2, y: -45.6 },
      { x: 642.7, y: -45.9 },
      { x: 644.3, y: -40.5 },
      { x: 644.8, y: -37.5 },
      { x: 635.5, y: -41.2 },
      { x: 612.9, y: -41.5 },
      { x: 606.8, y: -38.4 },
    ],
  },
  {
    name: "cancer",
    path: [
      { m: 3, b: 0, e: 5 },
      { m: 2, b: 5, e: 6 },
    ],
    radius: 0.1829,
    center: { x: -0.5687, y: 0.754, z: 0.3288 },
    stars: [
      { x: 460.7, y: -34.3 },
      { x: 458.6, y: -17.9 },
      { x: 444.9, y: -35.3 },
      { x: 445.6, y: -41.7 },
      { x: 444, y: -55.9 },
      { x: 438.2, y: -23.1 },
    ],
  },
  {
    name: "virgo",
    path: [
      { m: 4, b: 0, e: 13 },
      { m: 8, b: 14, e: 15 },
      { m: 9, b: 13, e: 14 },
      { m: 10, b: 6, e: 7 },
      { m: 11, b: 4, e: 5 },
    ],
    radius: 0.4011,
    center: { x: -0.9451, y: -0.3254, z: 0.0304 },
    stars: [
      { x: 347.5, y: -17 },
      { x: 356.9, y: -12.7 },
      { x: 354.5, y: -3.4 },
      { x: 340.3, y: 1.3 },
      { x: 329.8, y: 2.8 },
      { x: 316, y: 10.8 },
      { x: 308.6, y: 21.7 },
      { x: 285.4, y: 20 },
      { x: 283.9, y: 11.7 },
      { x: 290.8, y: -3 },
      { x: 304, y: 1.2 },
      { x: 323, y: -6.6 },
      { x: 319.8, y: -21.3 },
      { x: 269.2, y: -3.7 },
      { x: 270.7, y: 11 },
    ],
  },
  {
    name: "pisces",
    path: [
      { m: 0, b: 1, e: 15 },
      { m: 14, b: 10, e: 11 },
      { m: 12, b: 15, e: 16 },
    ],
    radius: 0.4004,
    center: { x: 0.9771, y: 0.1458, z: 0.155 },
    stars: [
      { x: 665.2, y: -58.5 },
      { x: 661.4, y: -53 },
      { x: 664.2, y: -47.8 },
      { x: 655.5, y: -29.8 },
      { x: 648.7, y: -17.8 },
      { x: 640.7, y: -5.4 },
      { x: 650.7, y: -10.7 },
      { x: 669.4, y: -15.3 },
      { x: 676.3, y: -14.7 },
      { x: 700.3, y: -13.3 },
      { x: 709.7, y: -10.9 },
      { x: 715.6, y: -12.4 },
      { x: 720.8, y: -6.4 },
      { x: 716.1, y: -2.4 },
      { x: 708.7, y: -3.5 },
      { x: 727.3, y: -7.4 },
    ],
  },
  {
    name: "scorpius",
    path: [
      { m: 0, b: 1, e: 17 },
      { m: 13, b: 17, e: 20 },
    ],
    radius: 0.2635,
    center: { x: -0.2739, y: -0.8021, z: -0.5306 },
    stars: [
      { x: 179.9, y: 72 },
      { x: 187.8, y: 72.2 },
      { x: 189.2, y: 72.5 },
      { x: 186.2, y: 74.6 },
      { x: 183.5, y: 75.9 },
      { x: 181, y: 78 },
      { x: 186, y: 83.6 },
      { x: 198.2, y: 84.1 },
      { x: 206.8, y: 82.4 },
      { x: 208.1, y: 74 },
      { x: 209, y: 66.7 },
      { x: 215.9, y: 54.9 },
      { x: 219, y: 51.4 },
      { x: 223, y: 49.8 },
      { x: 227.4, y: 54.3 },
      { x: 234.9, y: 56.8 },
      { x: 233.9, y: 50.8 },
      { x: 227.5, y: 37.8 },
      { x: 230.7, y: 38.5 },
      { x: 233.2, y: 44 },
    ],
  },
  {
    name: "aquarius",
    path: [
      { m: 8, b: 0, e: 14 },
      { m: 9, b: 14, e: 15 },
    ],
    radius: 0.3853,
    center: { x: 0.8592, y: -0.4287, z: -0.2793 },
    stars: [
      { x: 22.2, y: 11.8 },
      { x: 19.9, y: 18.7 },
      { x: 8.4, y: 28.3 },
      { x: 6.8, y: 36.3 },
      { x: 16.5, y: 40.1 },
      { x: 24.6, y: 41.2 },
      { x: 31.8, y: 30.8 },
      { x: 34.2, y: 26.4 },
      { x: 32.8, y: 14.7 },
      { x: 44.3, y: 0 },
      { x: 47.8, y: 2.7 },
      { x: 56.7, y: 4.2 },
      { x: 72.2, y: 10.8 },
      { x: 93.5, y: 18.5 },
      { x: 46.1, y: -2.7 },
    ],
  },
  {
    name: "taurus",
    path: [
      { m: 0, b: 1, e: 9 },
      { m: 5, b: 9, e: 12 },
    ],
    radius: 0.3031,
    center: { x: 0.3807, y: 0.87, z: 0.3133 },
    stars: [
      { x: 541.4, y: -55.6 },
      { x: 562.8, y: -44.6 },
      { x: 569.4, y: -37.3 },
      { x: 570.9, y: -34.9 },
      { x: 572.2, y: -34.1 },
      { x: 573.7, y: -30.4 },
      { x: 583, y: -24.3 },
      { x: 599.3, y: -18.9 },
      { x: 600.4, y: -17.6 },
      { x: 569.4, y: -30.9 },
      { x: 565.9, y: -32.1 },
      { x: 535.9, y: -41.1 },
    ],
  },
  {
    name: "libra",
    path: [
      { m: 0, b: 1, e: 6 },
      { m: 2, b: 4, e: 5 },
    ],
    radius: 0.1849,
    center: { x: -0.5674, y: -0.754, z: -0.331 },
    stars: [
      { x: 243.7, y: 57.9 },
      { x: 244.5, y: 54.7 },
      { x: 245.2, y: 28.8 },
      { x: 254.2, y: 18.2 },
      { x: 266.9, y: 31.2 },
      { x: 260.5, y: 49.2 },
    ],
  },
];

// Obliquity of the ecliptic (ε ≈ 23.44°) — same constant as SSM source
export const OBLIQUITY = 0.40913426548833737;

const SCALE = 350; // pixel to rad conversion factor from AS

function rawToEquatorial(star: StarPos): { ra: number; dec: number } {
  const ra = (-star.x * Math.PI) / SCALE;
  const dec = (-star.y * Math.PI) / SCALE;
  return { ra, dec };
}

export function equatorialToEcliptic(ra: number, dec: number): EclipticStar {
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const sinRa = Math.sin(ra);
  const cosRa = Math.cos(ra);
  const sinEps = Math.sin(OBLIQUITY);
  const cosEps = Math.cos(OBLIQUITY);

  const lat = Math.asin(sinDec * cosEps - cosDec * sinRa * sinEps);
  const lon = Math.atan2(cosDec * sinRa * cosEps + sinDec * sinEps, cosDec * cosRa);

  return { lon: ((lon % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), lat };
}

function convertConstellation(raw: ConstellationData): EclipticConstellation {
  const eclipticStars = raw.stars.map((s) => {
    const { ra, dec } = rawToEquatorial(s);
    return equatorialToEcliptic(ra, dec);
  });

  // Each segment {m, b, e}: moveTo(stars[m]), then lineTo(stars[b..e-1])
  const polylines: number[][] = raw.path.map((seg) => {
    const poly = [seg.m];
    for (let i = seg.b; i < seg.e; i++) {
      poly.push(i);
    }
    return poly;
  });

  return { name: raw.name, eclipticStars, polylines };
}

export type { EclipticConstellation };

export const ECLIPTIC_CONSTELLATIONS: EclipticConstellation[] = RAW_DATA.map(convertConstellation);

MotionsOfTheSunNamespace.register("ZodiacConstellationsData", ECLIPTIC_CONSTELLATIONS);
