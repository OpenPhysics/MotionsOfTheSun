/**
 * motionsOfTheSunQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in MotionsOfTheSunPreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?latitude=60&day=355` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import { DEFAULT_DAY_OF_YEAR, DEFAULT_LATITUDE } from "../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../MotionsOfTheSunNamespace.js";

const motionsOfTheSunQueryParameters = QueryStringMachine.getAll({
  /**
   * Default observer latitude in degrees (+N / −S). Seeds the Preferences value
   * and the Sun Paths screen's initial latitude. Example: `?latitude=-33.9`.
   */
  latitude: {
    type: "number",
    defaultValue: DEFAULT_LATITUDE,
    isValidValue: (value: number) => value >= -90 && value <= 90,
    public: true,
  },

  /**
   * Starting day of year for the Sun Paths screen (1 = Jan 1, 365 = Dec 31).
   * Example: `?day=355` starts near the December solstice.
   */
  day: {
    type: "number",
    defaultValue: DEFAULT_DAY_OF_YEAR,
    isValidValue: (value: number) => value >= 0 && value <= 366,
    public: true,
  },
});

MotionsOfTheSunNamespace.register("motionsOfTheSunQueryParameters", motionsOfTheSunQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default motionsOfTheSunQueryParameters;
