/**
 * MotionsOfTheSunConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in MotionsOfTheSunColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import { Dimension2, Range } from "scenerystack/dot";
import MotionsOfTheSunNamespace from "./MotionsOfTheSunNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Bottom inset for the Reset All button — sits slightly closer to the corner than {@link SCREEN_VIEW_MARGIN}. */
export const RESET_ALL_BUTTON_BOTTOM_MARGIN = 10;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Horizontal padding inside control panels. */
export const PANEL_X_MARGIN = 8;

/** Vertical padding inside control panels. */
export const PANEL_Y_MARGIN = 7;

/** Default font size (px) for labels on panel controls. */
export const CONTROL_FONT_SIZE = 12;

/** Font size (px) for bold panel section titles. */
export const PANEL_TITLE_FONT_SIZE = 12;

/** Side length (px) of checkbox boxes in control panels. */
export const CHECKBOX_BOX_WIDTH = 16;

/** Default vertical spacing between children inside a panel VBox. */
export const PANEL_CONTENT_SPACING = 8;

/** Track size for standalone panel sliders (e.g. animation-rate). */
export const STANDALONE_SLIDER_TRACK_SIZE = new Dimension2(75, 4);

/** Track size for NumberControl sliders. */
export const NUMBER_CONTROL_SLIDER_TRACK_SIZE = new Dimension2(140, 3);

/** Thumb size shared by panel sliders and NumberControl sliders. */
export const SLIDER_THUMB_SIZE = new Dimension2(13, 26);

/** Default screen-space radius of a projected sky sphere / dome. */
export const SPHERE_RADIUS = 170;

/** Max side length (px) of the sky-view panel, kept near the dome diameter. */
export const SKY_VIEW_MAX_SIZE = 2 * SPHERE_RADIUS;

/** Vertical gap between a sky sphere and the coordinate readout beneath it. */
export const VIEW_READOUT_GAP = 10;

// ── Astronomy / physics constants ──────────────────────────────────────────────

/** Mean obliquity of the ecliptic (degrees). One source of truth for all three screens (D2). */
export const OBLIQUITY_DEG = 23.44;

/** cot(obliquity) = cos(23.44°)/sin(23.44°); used in the solar RA/dec formulas. */
export const COT_OBLIQUITY = 2.30644456403329;

/** Sidereal days per solar day (= 366.25/365.25 ≈ 1.0027379…); from TimeMaster. */
export const SIDEREAL_RATE = 1.0027397260274;

/** GMST epoch offset (days): GMST at J2000.0 epoch / 2π, fractional sidereal day. */
export const SIDEREAL_EPOCH_OFFSET = 0.280464857844662;

/** Fundamental angular frequency of Earth's orbital motion (radians per day). */
export const EOT_FUNDAMENTAL_RAD_PER_DAY = 0.017214206;

// ── TimeMaster constants ───────────────────────────────────────────────────────

/** Decimal day value of solarTime at epoch (0.5 = solar noon on vernal equinox). */
export const SOLAR_TIME_AT_EPOCH = 0.5;

/** SIMPLE mode: tropical year length in solar days. */
export const SIMPLE_TROPICAL_YEAR = 365;

/** JULIAN mode: tropical year length in solar days. */
export const JULIAN_TROPICAL_YEAR = 365.25;

/** Tolerance (days) for isAt* DerivedProperties. */
export const TIME_EQUALITY_TOLERANCE = 1e-6;

/** Duration (real seconds) of a short animated time jump (e.g. ±1 day). */
export const JUMP_ANIMATION_SHORT_S = 1.0;

/** Duration (real seconds) of a long animated time jump (e.g. ±10 days / season). */
export const JUMP_ANIMATION_LONG_S = 2.0;

/** Continuous playback rate: solar days advanced per real second at NORMAL speed. */
export const SOLAR_DAYS_PER_SECOND = 0.25;

// ── Sun Paths (screen 1) ───────────────────────────────────────────────────────

/** Allowed latitude range (degrees, +N). */
export const LATITUDE_RANGE = new Range(-90, 90);

/** Default observer latitude (degrees, +N). Boulder, CO ≈ 40.8° N. */
export const DEFAULT_LATITUDE = 40.8;

/**
 * Default day of year (fractional; Jan 1 = 1, so 0.5 = just before Jan 1 midnight).
 * 147.5 ≈ May 27 noon (mean solar time).
 */
export const DEFAULT_DAY_OF_YEAR = 147.5;

/** Allowed day-of-year range (fractional days; 0 to just past Dec 31). */
export const DAY_OF_YEAR_RANGE = new Range(0, 365.25);

/** Rate of sky animation: solar hours of elapsed time per real second. */
export const ANIMATION_HOURS_PER_SECOND = 3;

/**
 * Step-by-day animation rate: whole calendar days advanced per real second at
 * NORMAL speed. Matches the CCNMTL JS reference (default rate = 1 day/sec).
 * In this mode the time-of-day is held fixed while the date marches forward.
 */
export const STEP_DAYS_PER_SECOND = 1;

// ── Zodiac (screen 3) ─────────────────────────────────────────────────────────

/** Observer latitude for the zodiac sky view (degrees, +N). */
export const ZODIAC_LATITUDE_DEG = 41;

/** Central azimuth of the zodiac sky view (radians; π = south). */
export const ZODIAC_CENTER_AZIMUTH_RAD = Math.PI;

/** Central altitude of the zodiac sky view (radians; slightly below horizon). */
export const ZODIAC_CENTER_ALTITUDE_RAD = -0.1;

/** Twilight half-range (degrees); sky brightens linearly across ±ZODIAC_TWILIGHT_RANGE_DEG. */
export const ZODIAC_TWILIGHT_RANGE_DEG = 7;

/** Width (px) of the zodiac strip at the bottom of the zodiac screen. */
export const ZODIAC_STRIP_WIDTH = 600;

/** Height (px) of the zodiac strip. */
export const ZODIAC_STRIP_HEIGHT = 40;

/**
 * Cumulative day-of-year at the start of each month (Jan–Dec + sentinel).
 * Index 0 = Jan 1, index 12 = Dec 31 + 1 = 365.
 */
export const MONTH_START_DOY = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365] as const;

/** Day-of-year offset of the vernal equinox (≈ March 20 = DOY 79; Flash uses 78). */
export const VE_DOY_OFFSET = 78;

// ── Sidereal & Solar Time (screen 2) layout ────────────────────────────────────

/** Screen-space radius of the Earth's orbit circle in the top-down orbit view. */
export const ORBIT_RADIUS = 150;

/** Screen-space radius of the Earth globe disc. */
export const EARTH_GLOBE_RADIUS = 22;

/** Radius (px) of the analog solar/sidereal clocks on Screen 2. */
export const ANALOG_CLOCK_RADIUS = 42;

/** Width (px) of the Sun Paths calendar-strip date picker. */
export const CALENDAR_STRIP_WIDTH = 280;

/** Height (px) of the Sun Paths calendar-strip date picker. */
export const CALENDAR_STRIP_HEIGHT = 36;

/** Width (px) of the Sun Paths flat world map (equirectangular latitude picker). */
export const WORLD_MAP_WIDTH = 176;

/** Height (px) of the Sun Paths flat world map (2:1 equirectangular aspect). */
export const WORLD_MAP_HEIGHT = 88;

/** Radius (px) of the Sun Paths 24-hour time-of-day clock. */
export const SUN_CLOCK_RADIUS = 58;

/** Orbit radius (px) of the Earth-centered zodiac diagram (Phase 8). */
export const EARTH_CENTERED_ORBIT_RADIUS = 130;

MotionsOfTheSunNamespace.register("MotionsOfTheSunConstants", {
  SCREEN_VIEW_MARGIN,
  RESET_ALL_BUTTON_BOTTOM_MARGIN,
  PANEL_CORNER_RADIUS,
  PANEL_X_MARGIN,
  PANEL_Y_MARGIN,
  CONTROL_FONT_SIZE,
  PANEL_TITLE_FONT_SIZE,
  CHECKBOX_BOX_WIDTH,
  PANEL_CONTENT_SPACING,
  STANDALONE_SLIDER_TRACK_SIZE,
  NUMBER_CONTROL_SLIDER_TRACK_SIZE,
  SLIDER_THUMB_SIZE,
  SPHERE_RADIUS,
  SKY_VIEW_MAX_SIZE,
  VIEW_READOUT_GAP,
  OBLIQUITY_DEG,
  COT_OBLIQUITY,
  SIDEREAL_RATE,
  SIDEREAL_EPOCH_OFFSET,
  EOT_FUNDAMENTAL_RAD_PER_DAY,
  SOLAR_TIME_AT_EPOCH,
  SIMPLE_TROPICAL_YEAR,
  JULIAN_TROPICAL_YEAR,
  TIME_EQUALITY_TOLERANCE,
  JUMP_ANIMATION_SHORT_S,
  JUMP_ANIMATION_LONG_S,
  SOLAR_DAYS_PER_SECOND,
  LATITUDE_RANGE,
  DEFAULT_LATITUDE,
  DEFAULT_DAY_OF_YEAR,
  DAY_OF_YEAR_RANGE,
  ANIMATION_HOURS_PER_SECOND,
  STEP_DAYS_PER_SECOND,
  ZODIAC_LATITUDE_DEG,
  ZODIAC_CENTER_AZIMUTH_RAD,
  ZODIAC_CENTER_ALTITUDE_RAD,
  ZODIAC_TWILIGHT_RANGE_DEG,
  ZODIAC_STRIP_WIDTH,
  ZODIAC_STRIP_HEIGHT,
  MONTH_START_DOY,
  VE_DOY_OFFSET,
  ORBIT_RADIUS,
  EARTH_GLOBE_RADIUS,
  ANALOG_CLOCK_RADIUS,
  CALENDAR_STRIP_WIDTH,
  CALENDAR_STRIP_HEIGHT,
  WORLD_MAP_WIDTH,
  WORLD_MAP_HEIGHT,
  SUN_CLOCK_RADIUS,
  EARTH_CENTERED_ORBIT_RADIUS,
});
