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

import { Circle, Line, Node, type NodeOptions, type TPaint } from "scenerystack/scenery";
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

export type ClockNodeOptions = {
  radius: number;
  faceFill: TPaint;
  faceStroke: TPaint;
  faceLineWidth?: number;
  /** Colour used for the ticks and the center hub. */
  markColor: TPaint;
  hubRadius?: number;
  ticks: ClockTickConfig;
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

    super({ ...nodeOptions, children: [face, tickNode] });

    this.radius = radius;
    this.markColor = markColor;
    this.hubRadius = hubRadius;
  }

  /** A center hub disc in the mark colour. Subclasses add it above their hands. */
  protected createHub(): Circle {
    return new Circle(this.hubRadius, { fill: this.markColor });
  }
}
