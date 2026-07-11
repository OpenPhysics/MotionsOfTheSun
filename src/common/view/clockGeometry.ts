/**
 * clockGeometry.ts
 *
 * Pure angle helpers shared by the sim's analog clocks (Sun Paths' 24-hour
 * time-of-day dial and the Sidereal/Solar screen's 12-hour two-hand clock).
 * All angles are measured clockwise from 12 o'clock (top) in a y-down
 * (screen) coordinate frame, so `atan2(x, -y)` is the common primitive.
 */

import { Vector2 } from "scenerystack/dot";

const TWO_PI = 2 * Math.PI;

/** Position of mark `index` of `count` evenly-spaced marks at `radius` (clock-centered, y-down). */
export const dialPoint = (index: number, radius: number, count: number): Vector2 => {
  const angle = (index / count) * TWO_PI;
  return new Vector2(Math.sin(angle) * radius, -Math.cos(angle) * radius);
};

/** Hours → hand angle in radians (cw from top) for a dial spanning `hoursOnDial` hours. */
export const hoursToClockRadians = (hours: number, hoursOnDial: number): number =>
  (((hours % hoursOnDial) + hoursOnDial) % hoursOnDial) * (TWO_PI / hoursOnDial);

/** Pointer position (clock-centered, y-down) → angle in [0, 2π), cw from top. */
export const pointerToClockRadians = (x: number, y: number): number => (Math.atan2(x, -y) + TWO_PI) % TWO_PI;

/** Pointer position (clock-centered, y-down) → angle in [0, 360), cw from top. */
export const pointerToClockDegrees = (x: number, y: number): number => (pointerToClockRadians(x, y) * 180) / Math.PI;

/** Normalize a degree delta into (−180, 180]. */
export const normalizeDeltaDegrees = (delta: number): number => {
  let d = ((delta % 360) + 360) % 360;
  if (d > 180) {
    d -= 360;
  }
  return d;
};
