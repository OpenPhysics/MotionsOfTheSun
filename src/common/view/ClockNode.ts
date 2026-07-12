/**
 * ClockNode.ts
 *
 * Shared foundation for the sim's analog clocks. Draws the circular face and the
 * ring of hour ticks common to every clock, and provides the center-hub factory
 * plus the shared clock geometry (via `clockGeometry`). Each concrete clock only
 * has to add its own numerals, hands, and labels on top:
 *
 *  - `SunClockNode` (Sun Paths) — a 24-hour time-of-day dial, one hand, numerals.
 *  - `AnalogClockNode` (Sidereal/Solar) — a 12-hour, two-hand standard clock.
 *
 * Subclasses build their decorations/hands (and a hub from {@link createHub}),
 * then `addChild` them so they layer above the face and ticks.
 */

import { Circle, Line, Node, type NodeOptions, Text, type TPaint } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { dialPoint } from "./clockGeometry.js";

export type ClockTickConfig = {
  /** Number of ticks around the dial (24 for an hour dial, 12 for a standard clock). */
  count: number;
  /** Every Nth tick (0, majorEvery, 2·majorEvery, …) is drawn longer and thicker. */
  majorEvery: number;
  /** Inner end of a minor / major tick, as a fraction of the radius. */
  minorInnerFraction: number;
  majorInnerFraction: number;
  /** Outer end of every tick, as a fraction of the radius. */
  outerFraction: number;
  minorLineWidth: number;
  majorLineWidth: number;
};

/**
 * Ring of hour numerals drawn on the dial. Numeral `index` (0 = top, clockwise)
 * is centered at `radiusFraction · radius`; every `majorEvery`-th numeral is
 * drawn bold and at `majorFontSize`, the rest at `minorFontSize`.
 */
export type ClockNumeralConfig = {
  /** Number of evenly-spaced numerals (usually matches `ticks.count`). */
  count: number;
  /** Text for the numeral at each index (0 = top, clockwise). */
  labelForIndex: (index: number) => string;
  /** Radius fraction at which numerals are centered. */
  radiusFraction: number;
  /** Every Nth numeral (0, majorEvery, …) is drawn bold and larger. */
  majorEvery: number;
  majorFontSize: number;
  minorFontSize: number;
  /** Numeral fill; defaults to `markColor`. */
  fill?: TPaint;
};

export type ClockNodeOptions = {
  radius: number;
  faceFill: TPaint;
  faceStroke: TPaint;
  faceLineWidth?: number;
  /** Colour used for the ticks and the center hub. */
  markColor: TPaint;
  hubRadius?: number;
  ticks: ClockTickConfig;
  /** Optional ring of hour numerals drawn above the ticks, below the hands. */
  numerals?: ClockNumeralConfig;
} & NodeOptions;

export class ClockNode extends Node {
  protected readonly radius: number;
  private readonly markColor: TPaint;
  private readonly hubRadius: number;

  protected constructor(options: ClockNodeOptions) {
    const {
      radius,
      faceFill,
      faceStroke,
      faceLineWidth = 1.5,
      markColor,
      hubRadius = 3.5,
      ticks,
      numerals,
      ...nodeOptions
    } = options;

    const face = new Circle(radius, { fill: faceFill, stroke: faceStroke, lineWidth: faceLineWidth });

    const tickNode = new Node({ pickable: false });
    for (let i = 0; i < ticks.count; i++) {
      const major = i % ticks.majorEvery === 0;
      const from = dialPoint(i, radius * (major ? ticks.majorInnerFraction : ticks.minorInnerFraction), ticks.count);
      const to = dialPoint(i, radius * ticks.outerFraction, ticks.count);
      tickNode.addChild(
        new Line(from.x, from.y, to.x, to.y, {
          stroke: markColor,
          lineWidth: major ? ticks.majorLineWidth : ticks.minorLineWidth,
        }),
      );
    }

    const children: Node[] = [face, tickNode];

    if (numerals) {
      const numeralNode = new Node({ pickable: false });
      const numeralFill = numerals.fill ?? markColor;
      for (let i = 0; i < numerals.count; i++) {
        const major = i % numerals.majorEvery === 0;
        numeralNode.addChild(
          new Text(numerals.labelForIndex(i), {
            font: new PhetFont({
              size: major ? numerals.majorFontSize : numerals.minorFontSize,
              weight: major ? "bold" : "normal",
            }),
            fill: numeralFill,
            center: dialPoint(i, radius * numerals.radiusFraction, numerals.count),
          }),
        );
      }
      children.push(numeralNode);
    }

    super({ ...nodeOptions, children });

    this.radius = radius;
    this.markColor = markColor;
    this.hubRadius = hubRadius;
  }

  /** A center hub disc in the mark colour. Subclasses add it above their hands. */
  protected createHub(): Circle {
    return new Circle(this.hubRadius, { fill: this.markColor });
  }
}
