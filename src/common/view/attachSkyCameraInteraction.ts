/**
 * attachSkyCameraInteraction.ts
 *
 * Pointer + keyboard camera control for a sky projection region. Matches the
 * NAAP drag modes:
 *   - plain drag / arrow keys          → free camera rotate
 *   - Alt-drag / Alt+arrows            → rotate about zenith only
 *   - Ctrl/Meta-drag / Ctrl+arrows     → advance sidereal time ("rotate about NCP")
 *
 * The `sky` parameter is narrowed to just the one method that the camera needs
 * (D9), so any screen model that exposes `advanceSiderealTime` can be passed in
 * without depending on RotatingSky's full SkyModel.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { DragListener, KeyboardListener, type Node } from "scenerystack/scenery";
import MotionsOfTheSunHotkeyData from "../MotionsOfTheSunHotkeyData.js";
import type { SkyProjection } from "../SkyProjection.js";

/** Radians of camera rotation per pixel of pointer movement. */
export const SKY_ROTATE_SPEED = 0.01;
/** Sidereal hours advanced per pixel of Ctrl-drag. */
export const SKY_TIME_DRAG_RATE = 0.02;

/** Radians of camera rotation per keyboard arrow press. */
const KEYBOARD_ROTATE_STEP = 0.1;
/** Sidereal hours advanced per Ctrl+arrowLeft/Right press. */
const KEYBOARD_TIME_STEP_HOURS = 0.25;

export type AttachSkyCameraInteractionOptions = {
  projection: SkyProjection;
  /** Narrowed sky interface (D9): only the sidereal-time advance method is required. */
  sky: { advanceSiderealTime(hours: number): void };
  /** Localized accessible name for the focusable sky region. */
  accessibleNameProperty: TReadOnlyProperty<string>;
  /** Localized help text describing arrow / Alt / Ctrl modes. */
  accessibleHelpTextProperty?: TReadOnlyProperty<string>;
};

/**
 * Makes `target` a focusable sky-camera control with pointer drag and keyboard
 * equivalents. Returns `target` for chaining.
 */
export const attachSkyCameraInteraction = <T extends Node>(
  target: T,
  options: AttachSkyCameraInteractionOptions,
): T => {
  const { projection, sky, accessibleNameProperty, accessibleHelpTextProperty } = options;

  target.tagName = "div";
  target.focusable = true;
  target.accessibleName = accessibleNameProperty;
  if (accessibleHelpTextProperty) {
    target.accessibleHelpText = accessibleHelpTextProperty;
  }

  let lastPoint: import("scenerystack/dot").Vector2 | null = null;
  let dragMode: "simple" | "zenith" | "ncp" = "simple";

  target.addInputListener(
    new DragListener({
      start: (event) => {
        const domEvent = event.domEvent as {
          altKey?: boolean;
          ctrlKey?: boolean;
          metaKey?: boolean;
        } | null;
        lastPoint = event.pointer.point.copy();
        dragMode = domEvent?.altKey ? "zenith" : domEvent?.ctrlKey || domEvent?.metaKey ? "ncp" : "simple";
      },
      drag: (event) => {
        if (!lastPoint) {
          return;
        }
        const p = event.pointer.point;
        const dx = p.x - lastPoint.x;
        const dy = lastPoint.y - p.y;
        switch (dragMode) {
          case "zenith":
            projection.rotateAboutZenith(dx * SKY_ROTATE_SPEED);
            break;
          case "ncp":
            sky.advanceSiderealTime(-dx * SKY_TIME_DRAG_RATE);
            break;
          default:
            projection.rotateBy(dx * SKY_ROTATE_SPEED, dy * SKY_ROTATE_SPEED);
            break;
        }
        lastPoint = p.copy();
      },
      end: () => {
        lastPoint = null;
      },
    }),
  );

  target.addInputListener(
    new KeyboardListener({
      keys: [
        ...MotionsOfTheSunHotkeyData.ROTATE_SKY_KEYS,
        ...MotionsOfTheSunHotkeyData.ROTATE_ABOUT_ZENITH_KEYS,
        ...MotionsOfTheSunHotkeyData.ADVANCE_SIDEREAL_TIME_KEYS,
      ],
      fireOnHold: true,
      fire: (_event, keysPressed) => {
        if (
          keysPressed === "alt+arrowLeft" ||
          keysPressed === "alt+arrowRight" ||
          keysPressed === "alt+arrowUp" ||
          keysPressed === "alt+arrowDown"
        ) {
          const sign = keysPressed === "alt+arrowLeft" || keysPressed === "alt+arrowDown" ? -1 : 1;
          projection.rotateAboutZenith(sign * KEYBOARD_ROTATE_STEP);
          return;
        }

        if (keysPressed === "ctrl+arrowLeft" || keysPressed === "ctrl+arrowRight") {
          const sign = keysPressed === "ctrl+arrowLeft" ? 1 : -1;
          sky.advanceSiderealTime(sign * KEYBOARD_TIME_STEP_HOURS);
          return;
        }

        // Plain arrows: free camera rotate (left/right = azimuth, up/down = elevation).
        if (keysPressed === "arrowLeft") {
          projection.rotateBy(-KEYBOARD_ROTATE_STEP, 0);
        } else if (keysPressed === "arrowRight") {
          projection.rotateBy(KEYBOARD_ROTATE_STEP, 0);
        } else if (keysPressed === "arrowUp") {
          projection.rotateBy(0, KEYBOARD_ROTATE_STEP);
        } else if (keysPressed === "arrowDown") {
          projection.rotateBy(0, -KEYBOARD_ROTATE_STEP);
        }
      },
    }),
  );

  return target;
};
