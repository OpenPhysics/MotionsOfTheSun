/**
 * MotionsOfTheSunHotkeyData.ts
 *
 * Single source of truth for Motions of the Sun keyboard shortcuts. Listeners and the
 * Keyboard Shortcuts dialog both derive from these HotkeyData instances.
 *
 * Star-specific entries (ADD_STAR_AT_CENTER, MOVE_STAR, MOVE_GUIDE_STAR) are
 * intentionally omitted per decision D5.
 */

import { HotkeyData } from "scenerystack/scenery";

const ARROW_KEYS = ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"] as const;
const ALT_ARROW_KEYS = ["alt+arrowLeft", "alt+arrowRight", "alt+arrowUp", "alt+arrowDown"] as const;
const CTRL_HORIZONTAL_ARROW_KEYS = ["ctrl+arrowLeft", "ctrl+arrowRight"] as const;

const MotionsOfTheSunHotkeyData = {
  ARROW_KEYS,
  ROTATE_SKY_KEYS: ARROW_KEYS,
  ROTATE_ABOUT_ZENITH_KEYS: ALT_ARROW_KEYS,
  ADVANCE_SIDEREAL_TIME_KEYS: CTRL_HORIZONTAL_ARROW_KEYS,

  /**
   * Free camera rotate on a focused sky region (arrow keys).
   */
  ROTATE_SKY: new HotkeyData({
    keys: [...ARROW_KEYS],
    repoName: "motions-of-the-sun",
    binderName: "Rotate Sky View",
  }),

  /**
   * Rotate about zenith only (Alt + arrows), matching Alt-drag.
   */
  ROTATE_ABOUT_ZENITH: new HotkeyData({
    keys: [...ALT_ARROW_KEYS],
    repoName: "motions-of-the-sun",
    binderName: "Rotate About Zenith",
  }),

  /**
   * Advance / rewind sidereal time (Ctrl + left/right), matching Ctrl-drag.
   */
  ADVANCE_SIDEREAL_TIME: new HotkeyData({
    keys: [...CTRL_HORIZONTAL_ARROW_KEYS],
    repoName: "motions-of-the-sun",
    binderName: "Advance Sidereal Time",
  }),

  /**
   * Move the Sun along its daily path (left/right arrows) — Sun Paths screen.
   */
  MOVE_SUN: new HotkeyData({
    keys: ["arrowLeft", "arrowRight"],
    repoName: "motions-of-the-sun",
    binderName: "Move Sun Along Path",
  }),

  /**
   * Advance Earth in orbit by solar days (arrows) or sidereal days (Shift+arrows).
   */
  ORBIT_EARTH: new HotkeyData({
    keys: ["arrowLeft", "arrowRight", "shift+arrowLeft", "shift+arrowRight"],
    repoName: "motions-of-the-sun",
    binderName: "Move Earth In Orbit",
  }),

  /**
   * Nudge analog clock hands by five minutes.
   */
  ANALOG_CLOCK_HANDS: new HotkeyData({
    keys: ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"],
    repoName: "motions-of-the-sun",
    binderName: "Nudge Analog Clock Hands",
  }),
} as const;

export default MotionsOfTheSunHotkeyData;
