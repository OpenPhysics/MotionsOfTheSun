/**
 * CalendarStripNode.ts
 *
 * 12-month calendar strip with a draggable day marker (Phase 7.2).
 * Wrap-around drag transcribed from DayOfYearSlider.as:
 *   deltaPx wrapped into ±half-width before converting to day delta.
 *
 * Sets the integer part of `dayOfYearProperty` (preserves time-of-day fraction).
 * Jan 1 = day 1 (sim convention).
 *
 * Contrast: the strip is a light control surface in BOTH profiles, so month
 * labels, dividers, and the marker use dark ink (`controlSurfaceText`), not
 * the general panel text color (near-white in default mode).
 */

import type { NumberProperty, TReadOnlyProperty } from "scenerystack/axon";
import { DragListener, KeyboardListener, Line, Node, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import {
  CALENDAR_STRIP_HEIGHT,
  CALENDAR_STRIP_WIDTH,
  CONTROL_FONT_SIZE,
  MONTH_START_DOY,
  SIMPLE_TROPICAL_YEAR,
} from "../../MotionsOfTheSunConstants.js";

/**
 * Map day-of-year (1 = Jan 1) to x in [0, width].
 * Uses 0-based DOY fraction over a 365-day year for placement.
 */
function dayToX(dayOfYear: number, width: number): number {
  const doy0 = Math.max(0, Math.min(SIMPLE_TROPICAL_YEAR, Math.floor(dayOfYear) - 1));
  return (doy0 / SIMPLE_TROPICAL_YEAR) * width;
}

/**
 * Map x to integer day-of-year (1…365), wrapping via modular arithmetic.
 */
function xToDay(x: number, width: number): number {
  const frac = (((x / width) % 1) + 1) % 1;
  return Math.max(1, Math.min(365, Math.floor(frac * SIMPLE_TROPICAL_YEAR) + 1));
}

export type CalendarStripNodeOptions = {
  dayOfYearProperty: NumberProperty;
  /** Localized short month names (length 12), e.g. Jan / Ene / Jan. */
  monthAbbreviationProperties: ReadonlyArray<TReadOnlyProperty<string>>;
  accessibleNameProperty: TReadOnlyProperty<string>;
  accessibleHelpTextProperty: TReadOnlyProperty<string>;
};

export class CalendarStripNode extends Node {
  public constructor(options: CalendarStripNodeOptions) {
    super({
      tagName: "div",
      focusable: true,
      cursor: "pointer",
      accessibleName: options.accessibleNameProperty,
      accessibleHelpText: options.accessibleHelpTextProperty,
    });

    const width = CALENDAR_STRIP_WIDTH;
    const height = CALENDAR_STRIP_HEIGHT;
    const ink = MotionsOfTheSunColors.controlSurfaceTextColorProperty;
    const markerColor = MotionsOfTheSunColors.worldMapMarkerColorProperty;

    const background = new Rectangle(0, 0, width, height, {
      fill: MotionsOfTheSunColors.controlSurfaceColorProperty,
      stroke: ink,
      lineWidth: 1,
      cornerRadius: 3,
    });

    const monthLayer = new Node({ pickable: false });
    for (let i = 0; i < 12; i++) {
      const x0 = ((MONTH_START_DOY[i] ?? 0) / SIMPLE_TROPICAL_YEAR) * width;
      const x1 = ((MONTH_START_DOY[i + 1] ?? SIMPLE_TROPICAL_YEAR) / SIMPLE_TROPICAL_YEAR) * width;
      if (i > 0) {
        monthLayer.addChild(
          new Line(x0, 4, x0, height - 4, {
            stroke: ink,
            lineWidth: 1,
            opacity: 0.35,
          }),
        );
      }
      const abbrevProperty = options.monthAbbreviationProperties[i];
      if (abbrevProperty) {
        monthLayer.addChild(
          new Text(abbrevProperty, {
            font: new PhetFont(CONTROL_FONT_SIZE - 3),
            fill: ink,
            centerX: (x0 + x1) / 2,
            centerY: height / 2,
            maxWidth: x1 - x0 - 2,
          }),
        );
      }
    }

    // Draggable marker (vertical line + arrowhead)
    const marker = new Node({ cursor: "ew-resize" });
    const markerLine = new Line(0, 2, 0, height - 2, {
      stroke: markerColor,
      lineWidth: 2,
    });
    // Simple downward triangle tip at top
    const tip = new Line(-6, 2, 6, 2, {
      stroke: markerColor,
      lineWidth: 2,
    });
    marker.children = [markerLine, tip];

    this.children = [background, monthLayer, marker];

    const setDayInteger = (dayInt: number): void => {
      const frac = options.dayOfYearProperty.value % 1;
      const next = dayInt + frac;
      if (Math.abs(options.dayOfYearProperty.value - next) > 1e-9) {
        options.dayOfYearProperty.value = next;
      }
    };

    const updateMarker = (day: number): void => {
      marker.x = dayToX(day, width);
    };
    options.dayOfYearProperty.link(updateMarker);

    // Wrap-around thumb drag (DayOfYearSlider.as)
    let thumbOffset = 0;
    marker.addInputListener(
      new DragListener({
        start: (event) => {
          const local = this.globalToLocalPoint(event.pointer.point);
          thumbOffset = local.x - marker.x;
        },
        drag: (event) => {
          const local = this.globalToLocalPoint(event.pointer.point);
          let deltaPx = local.x - marker.x - thumbOffset;
          deltaPx = ((deltaPx % width) + width) % width;
          if (deltaPx > width / 2) {
            deltaPx -= width;
          }
          const timeDelta = (SIMPLE_TROPICAL_YEAR / width) * deltaPx;
          const currentInt = Math.max(1, Math.floor(options.dayOfYearProperty.value));
          let nextInt = Math.round(currentInt + timeDelta);
          // Wrap into 1…365
          nextInt = ((((nextInt - 1) % 365) + 365) % 365) + 1;
          setDayInteger(nextInt);
        },
      }),
    );

    // Click on bar: ±1 day toward the click (Flash bar behavior)
    background.addInputListener(
      new DragListener({
        press: (event) => {
          const local = this.globalToLocalPoint(event.pointer.point);
          const currentInt = Math.max(1, Math.floor(options.dayOfYearProperty.value));
          if (local.x < marker.x - 1) {
            setDayInteger(((((currentInt - 2) % 365) + 365) % 365) + 1);
          } else if (local.x > marker.x + 1) {
            setDayInteger((currentInt % 365) + 1);
          } else {
            setDayInteger(xToDay(local.x, width));
          }
        },
      }),
    );

    this.addInputListener(
      new KeyboardListener({
        keys: ["arrowLeft", "arrowRight"],
        fire: (_event, keysPressed) => {
          const currentInt = Math.max(1, Math.floor(options.dayOfYearProperty.value));
          const delta = keysPressed.includes("arrowRight") ? 1 : -1;
          setDayInteger(((((currentInt - 1 + delta) % 365) + 365) % 365) + 1);
        },
      }),
    );
  }
}
