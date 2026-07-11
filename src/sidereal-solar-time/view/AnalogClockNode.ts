/**
 * AnalogClockNode.ts
 *
 * Analog clock with draggable hour and minute hands (Phase 7.1).
 * Transcribed from siderealSolarTime/AnalogClock.as + AnalogClockHand.as.
 *
 * The face, ticks, and hub come from the shared {@link ClockNode} base; this
 * subclass adds the two draggable hands, the optional AM/PM labels, and the
 * optional title.
 *
 * Formulas (Flash):
 *   hourHand.rotation   = frac(t) · 360°
 *   minuteHand.rotation = frac(frac(t) · 24) · 360°
 * Hand drag:
 *   hour   → Δdeg / 360 days
 *   minute → Δdeg / (360 · 24) days
 * Keyboard (focused hand): arrows ±5 minutes.
 *
 * Solar clocks show AM/PM labels; sidereal clocks do not.
 *
 * Contrast: the face is a light surface in BOTH color profiles, so every mark
 * drawn on it (ticks, hands, hub, AM/PM) uses dark clock ink. The optional
 * title above the face uses the general panel text color.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { DragListener, KeyboardListener, Line, Node, Text, type TPaint } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { ClockNode } from "../../common/view/ClockNode.js";
import { normalizeDeltaDegrees, pointerToClockDegrees } from "../../common/view/clockGeometry.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { ANALOG_CLOCK_RADIUS, CONTROL_FONT_SIZE } from "../../MotionsOfTheSunConstants.js";

/** Five minutes as a fraction of a day. */
const FIVE_MINUTES_DAYS = 5 / (24 * 60);

type HandKind = "hour" | "minute";

/**
 * One clock hand. Focusable; drag and arrow keys call `onRotated(deltaDegrees)`.
 */
class AnalogClockHandNode extends Node {
  private readonly kind: HandKind;

  public constructor(
    kind: HandKind,
    length: number,
    lineWidth: number,
    stroke: TPaint,
    onRotated: (deltaDegrees: number) => void,
  ) {
    super({
      tagName: "div",
      focusable: true,
      cursor: "pointer",
    });
    this.kind = kind;

    const shaft = new Line(0, 0, 0, -length, {
      stroke,
      lineWidth,
      lineCap: "round",
    });
    // Invisible hit target thicker than the visible shaft.
    const hit = new Line(0, 0, 0, -length, {
      stroke: "rgba(0,0,0,0)",
      lineWidth: Math.max(14, lineWidth + 10),
      lineCap: "round",
    });
    this.children = [hit, shaft];

    let dragOffset = 0;

    this.addInputListener(
      new DragListener({
        start: (event) => {
          const local = this.globalToParentPoint(event.pointer.point);
          dragOffset = pointerToClockDegrees(local.x, local.y) - this.rotation * (180 / Math.PI);
          onRotated(0); // cancel any in-progress animation (Flash AnalogClockHand)
        },
        drag: (event) => {
          const local = this.globalToParentPoint(event.pointer.point);
          const target = pointerToClockDegrees(local.x, local.y);
          const current = this.rotation * (180 / Math.PI);
          const delta = normalizeDeltaDegrees(target - current - dragOffset);
          if (delta !== 0) {
            onRotated(delta);
          }
        },
      }),
    );

    this.addInputListener(
      new KeyboardListener({
        keys: ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"],
        fire: (_event, keysPressed) => {
          const forward = keysPressed.includes("arrowRight") || keysPressed.includes("arrowUp");
          // Hour hand: 5 min = 5/60 of an hour-hand revolution → 2.5°; minute: 5 min = 30°.
          const deg =
            this.kind === "hour"
              ? (forward ? 1 : -1) * (FIVE_MINUTES_DAYS * 360)
              : (forward ? 1 : -1) * (FIVE_MINUTES_DAYS * 360 * 24);
          onRotated(deg);
        },
      }),
    );
  }

  /** Set hand rotation from a day-fraction in [0, 1). */
  public setFromDayFraction(frac: number): void {
    const f = ((frac % 1) + 1) % 1;
    const degrees = this.kind === "hour" ? f * 360 : ((f * 24) % 1) * 360;
    this.rotation = (degrees * Math.PI) / 180;
  }
}

export type AnalogClockNodeOptions = {
  /** Fractional day Property (solar or sidereal). Only the fractional part is used. */
  timeProperty: TReadOnlyProperty<number>;
  /** Called with a day delta when a hand is dragged or nudged. */
  onHandsDragged: (dayDelta: number) => void;
  /** Show AM/PM labels (solar clocks only). */
  showAmPmLabels: boolean;
  accessibleNameProperty: TReadOnlyProperty<string>;
  accessibleHelpTextProperty: TReadOnlyProperty<string>;
  amStringProperty?: TReadOnlyProperty<string>;
  pmStringProperty?: TReadOnlyProperty<string>;
  labelProperty?: TReadOnlyProperty<string>;
};

export class AnalogClockNode extends ClockNode {
  public constructor(options: AnalogClockNodeOptions) {
    const r = ANALOG_CLOCK_RADIUS;
    const ink = MotionsOfTheSunColors.clockInkColorProperty;

    super({
      radius: r,
      faceFill: MotionsOfTheSunColors.clockFaceColorProperty,
      faceStroke: ink,
      faceLineWidth: 2,
      markColor: ink,
      hubRadius: 3.5,
      ticks: {
        count: 12,
        majorEvery: 3,
        minorInnerFraction: 0.86,
        majorInnerFraction: 0.78,
        outerFraction: 0.94,
        minorLineWidth: 1,
        majorLineWidth: 2,
      },
      tagName: "div",
      accessibleName: options.accessibleNameProperty,
      accessibleHelpText: options.accessibleHelpTextProperty,
    });

    const hourHand = new AnalogClockHandNode("hour", r * 0.55, 3.5, ink, (deltaDeg) => {
      options.onHandsDragged(deltaDeg / 360);
    });
    const minuteHand = new AnalogClockHandNode(
      "minute",
      r * 0.78,
      2,
      MotionsOfTheSunColors.clockHandColorProperty,
      (deltaDeg) => {
        options.onHandsDragged(deltaDeg / (360 * 24));
      },
    );
    const hub = this.createHub();

    // Layer hands + hub above the shared face + ticks.
    this.addChild(hourHand);
    this.addChild(minuteHand);
    this.addChild(hub);

    if (options.showAmPmLabels && options.amStringProperty && options.pmStringProperty) {
      const amLabel = new Text(options.amStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE - 2),
        fill: ink,
        centerX: -r * 0.45,
        centerY: r * 0.35,
        maxWidth: r * 0.6,
      });
      const pmLabel = new Text(options.pmStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE - 2),
        fill: ink,
        centerX: r * 0.45,
        centerY: r * 0.35,
        maxWidth: r * 0.6,
      });
      this.addChild(amLabel);
      this.addChild(pmLabel);
    }

    if (options.labelProperty) {
      // Title sits above the light face, on the dark panel — use panel text color.
      this.addChild(
        new Text(options.labelProperty, {
          font: new PhetFont({ size: CONTROL_FONT_SIZE, weight: "bold" }),
          fill: MotionsOfTheSunColors.textColorProperty,
          centerX: 0,
          bottom: -r - 6,
          maxWidth: r * 2.4,
        }),
      );
    }

    options.timeProperty.link((t) => {
      const frac = ((t % 1) + 1) % 1;
      hourHand.setFromDayFraction(frac);
      minuteHand.setFromDayFraction(frac);
    });
  }
}
