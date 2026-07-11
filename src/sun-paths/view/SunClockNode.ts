/**
 * SunClockNode.ts
 *
 * The Sun Paths 24-hour time-of-day clock, matching Flash `Time Of Day Clock`:
 * a full 24-hour dial (0 at the top = midnight, 12 at the bottom = noon) with
 * every hour numbered, an hour hand that makes one revolution per day, a
 * minute hand that makes one revolution per hour, and "12 am / 6 am / 12 pm /
 * 6 pm" helper labels. Dragging either hand sets the time of day; crossing
 * midnight advances or rewinds the calendar day (Flash behaviour).
 *
 * Contrast: the face is a light surface in BOTH color profiles, so ticks,
 * numerals, and hubs use dark clock ink; the hour hand uses the accent
 * hand colour.
 */

import type { NumberProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { DragListener, KeyboardListener, Node, Path, Text, type TPaint } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { ClockNode } from "../../common/view/ClockNode.js";
import {
  dialPoint,
  normalizeDeltaDegrees,
  pointerToClockDegrees,
  pointerToClockRadians,
} from "../../common/view/clockGeometry.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { DAY_OF_YEAR_RANGE, SUN_CLOCK_RADIUS } from "../../MotionsOfTheSunConstants.js";

/** This dial spans a full 24 hours. */
const HOURS_ON_DIAL = 24;

const YEAR_SPAN = DAY_OF_YEAR_RANGE.max - DAY_OF_YEAR_RANGE.min;

const wrapDay = (day: number): number =>
  ((((day - DAY_OF_YEAR_RANGE.min) % YEAR_SPAN) + YEAR_SPAN) % YEAR_SPAN) + DAY_OF_YEAR_RANGE.min;

/** Five minutes as a fraction of a day. */
const FIVE_MINUTES_DAYS = 5 / (24 * 60);

type HandKind = "hour" | "minute";

class SunClockHandNode extends Node {
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

    const shaft = new Path(new Shape().moveTo(0, 0).lineTo(0, -length), {
      stroke,
      lineWidth,
      lineCap: "round",
    });
    const hit = new Path(new Shape().moveTo(0, 0).lineTo(0, -length), {
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
          const deg =
            this.kind === "hour"
              ? (forward ? 1 : -1) * (FIVE_MINUTES_DAYS * 360)
              : (forward ? 1 : -1) * (FIVE_MINUTES_DAYS * 360 * 24);
          onRotated(deg);
        },
      }),
    );
  }

  public setFromDayFraction(frac: number): void {
    const f = ((frac % 1) + 1) % 1;
    const degrees = this.kind === "hour" ? f * 360 : ((f * 24) % 1) * 360;
    this.rotation = (degrees * Math.PI) / 180;
  }
}

export type SunClockNodeOptions = {
  /** Decimal day-of-year; fraction = time of day. Hand drag may wrap the day. */
  dayOfYearProperty: NumberProperty;
  accessibleNameProperty: TReadOnlyProperty<string>;
  accessibleHelpTextProperty: TReadOnlyProperty<string>;
  amStringProperty: TReadOnlyProperty<string>;
  pmStringProperty: TReadOnlyProperty<string>;
};

export class SunClockNode extends ClockNode {
  public constructor(options: SunClockNodeOptions) {
    const r = SUN_CLOCK_RADIUS;
    const ink = MotionsOfTheSunColors.clockInkColorProperty;

    super({
      radius: r,
      faceFill: MotionsOfTheSunColors.clockFaceColorProperty,
      faceStroke: ink,
      faceLineWidth: 1.5,
      markColor: ink,
      hubRadius: 3.5,
      ticks: {
        count: HOURS_ON_DIAL,
        majorEvery: 3,
        minorInnerFraction: 0.9,
        majorInnerFraction: 0.86,
        outerFraction: 0.96,
        minorLineWidth: 0.75,
        majorLineWidth: 1.5,
      },
      tagName: "div",
      focusable: true,
      cursor: "pointer",
      accessibleName: options.accessibleNameProperty,
      accessibleHelpText: options.accessibleHelpTextProperty,
    });

    // ── Hour numerals 0–23 ───────────────────────────────────────────────────
    const numerals = new Node({ pickable: false });
    for (let h = 0; h < HOURS_ON_DIAL; h++) {
      const major = h % 3 === 0;
      numerals.addChild(
        new Text(String(h), {
          font: new PhetFont({ size: major ? 9 : 7.5, weight: major ? "bold" : "normal" }),
          fill: ink,
          center: dialPoint(h, r * 0.74, HOURS_ON_DIAL),
        }),
      );
    }

    // ── "12 am / 6 am / 12 pm / 6 pm" helper labels ───────────────────────────
    const helperLabels = new Node({ pickable: false });
    const helpers: Array<{ hour: number; prefix: string; ampm: TReadOnlyProperty<string> }> = [
      { hour: 0, prefix: "12", ampm: options.amStringProperty },
      { hour: 6, prefix: "6", ampm: options.amStringProperty },
      { hour: 12, prefix: "12", ampm: options.pmStringProperty },
      { hour: 18, prefix: "6", ampm: options.pmStringProperty },
    ];
    for (const helper of helpers) {
      const prefixText = new Text(`${helper.prefix} `, { font: new PhetFont(6.5), fill: ink });
      const ampmText = new Text(helper.ampm, {
        font: new PhetFont(6.5),
        fill: ink,
        left: prefixText.right + 1,
        centerY: prefixText.centerY,
      });
      const group = new Node({ children: [prefixText, ampmText] });
      group.center = dialPoint(helper.hour, r * 0.42, HOURS_ON_DIAL);
      helperLabels.addChild(group);
    }

    const applyDayDelta = (dayDelta: number): void => {
      if (Math.abs(dayDelta) < 1e-12) {
        return;
      }
      options.dayOfYearProperty.value = wrapDay(options.dayOfYearProperty.value + dayDelta);
    };

    // Hour hand: one revolution per day (Flash hourHandMC._rotation = 360 * arg).
    const hourHand = new SunClockHandNode(
      "hour",
      r * 0.55,
      3,
      MotionsOfTheSunColors.clockHandColorProperty,
      (deltaDeg) => {
        applyDayDelta(deltaDeg / 360);
      },
    );
    // Minute hand: one revolution per hour.
    const minuteHand = new SunClockHandNode("minute", r * 0.72, 1.75, ink, (deltaDeg) => {
      applyDayDelta(deltaDeg / (360 * 24));
    });
    const hub = this.createHub();

    this.addChild(numerals);
    this.addChild(helperLabels);
    this.addChild(hourHand);
    this.addChild(minuteHand);
    this.addChild(hub);

    options.dayOfYearProperty.link((day) => {
      const frac = ((day % 1) + 1) % 1;
      hourHand.setFromDayFraction(frac);
      minuteHand.setFromDayFraction(frac);
    });

    // Dragging the face (not a hand) snaps time from the pointer direction.
    this.addInputListener(
      new DragListener({
        drag: (event) => {
          const local = this.globalToLocalPoint(event.pointer.point);
          const hours = (pointerToClockRadians(local.x, local.y) / (2 * Math.PI)) * HOURS_ON_DIAL;
          const intDay = Math.floor(options.dayOfYearProperty.value);
          const next = wrapDay(intDay + hours / 24);
          if (Math.abs(options.dayOfYearProperty.value - next) > 1e-6) {
            options.dayOfYearProperty.value = next;
          }
        },
      }),
    );

    // Arrow keys on the clock root nudge by 15 minutes.
    this.addInputListener(
      new KeyboardListener({
        keys: ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"],
        fire: (_event, keysPressed) => {
          const forward = keysPressed.includes("arrowRight") || keysPressed.includes("arrowUp");
          applyDayDelta((forward ? 1 : -1) * (0.25 / 24));
        },
      }),
    );
  }
}
