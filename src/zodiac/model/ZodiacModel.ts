/**
 * ZodiacModel.ts
 *
 * Top-level model for the Zodiac screen (Screen 3).
 *
 * Composes:
 *  - `timeMaster` — manages solar/sidereal time with eased jumps (TimeMaster)
 *  - `timer`      — play/pause + elapsed time (TimeModel)
 *
 * Continuous play advances solarTime at `SOLAR_DAYS_PER_SECOND` solar days per
 * real second (same as Screen 2, D7 / D8).
 *
 * The Lambert azimuthal projection is fixed at lat 41° N looking south (D8).
 * All derived astronomical quantities are DerivedProperties over TimeMaster's
 * solarDaysSinceVernalEquinoxProperty and siderealTimeProperty.
 *
 * Physics source: NAAP/flash-animations/flashdev2/zodiacSimulator/Main.as (lines
 * 171–185 for month/day algorithm) and ZodiacSkyView.as (lines 658–686 for sun
 * from longitude, twilight).
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { BooleanProperty, DerivedProperty, Property } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { TimeMaster } from "../../common/model/TimeMaster.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  JULIAN_TROPICAL_YEAR,
  MONTH_START_DOY,
  OBLIQUITY_DEG,
  SIMPLE_TROPICAL_YEAR,
  SOLAR_DAYS_PER_SECOND,
  SOLAR_TIME_AT_EPOCH,
  VE_DOY_OFFSET,
  ZODIAC_LATITUDE_DEG,
  ZODIAC_TWILIGHT_RANGE_DEG,
} from "../../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../../MotionsOfTheSunNamespace.js";

/** Zodiac screen view mode: Lambert sky vs lab geocentric celestial sphere. */
export type ZodiacViewMode = "sky" | "earthCentered";

const TWO_PI = 2 * Math.PI;
const OBLIQUITY_RAD = OBLIQUITY_DEG * (Math.PI / 180);
const SIN_OBLIQUITY = Math.sin(OBLIQUITY_RAD);
const COS_OBLIQUITY = Math.cos(OBLIQUITY_RAD);
const LATITUDE_RAD = ZODIAC_LATITUDE_DEG * (Math.PI / 180);
const SIN_LATITUDE = Math.sin(LATITUDE_RAD);
const COS_LATITUDE = Math.cos(LATITUDE_RAD);
const TWILIGHT_RAD = ZODIAC_TWILIGHT_RANGE_DEG * (Math.PI / 180);

/** Month names in order (index 0 = January). */
export const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

export type MonthName = (typeof MONTH_NAMES)[number];

/** Zodiac sign keys in ecliptic longitude order (0 = Aries at λ=0°). */
export const SIGN_KEYS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpius",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type SignKey = (typeof SIGN_KEYS)[number];

/**
 * Compute ecliptic longitude (radians, [0, 2π)) from solar days since vernal equinox
 * and tropical year length.
 */
function sunLongitude(daysSinceVE: number, tropicalYear: number): number {
  return ((daysSinceVE / tropicalYear) * TWO_PI + TWO_PI) % TWO_PI;
}

/**
 * Month and day-of-month from solar days since VE.
 * Transcribed from Main.as `getDayStringFromDaysSinceLastVernalEquinox` (lines 171–185).
 *
 * Flash passes `daysSinceVE - SOLAR_TIME_AT_EPOCH` so we do the same subtraction here.
 */
function monthDayFromDaysSinceVE(daysSinceVE: number): { monthIndex: number; day: number } {
  // Flash line 153: getDayStringFromDaysSinceLastVernalEquinox(daysSinceVE - SOLAR_TIME_AT_EPOCH)
  const adjusted = daysSinceVE - SOLAR_TIME_AT_EPOCH;
  const doy = (((adjusted + VE_DOY_OFFSET) % 365) + 365) % 365;

  let i = 0;
  while (i < 12 && doy >= (MONTH_START_DOY[i + 1] ?? 365)) {
    i++;
  }
  const monthStart = MONTH_START_DOY[i] ?? 0;
  const day = Math.floor(doy - monthStart + 1);
  return { monthIndex: i, day };
}

export class ZodiacModel implements TModel {
  /** Manages solar/sidereal time, eased jumps, and isAt* derived properties. */
  public readonly timeMaster: TimeMaster;

  /** Play/pause + elapsed time; bind to TimeControlNode. */
  public readonly timer: TimeModel;

  // ── Label visibility toggles (default false, per Flash reset) ────────────────

  /** Whether constellation name labels are visible. */
  public readonly constellationLabelsVisibleProperty: BooleanProperty;

  /** Whether the "Ecliptic" label is visible. */
  public readonly eclipticLabelVisibleProperty: BooleanProperty;

  /** Whether the "Celestial Equator" label is visible. */
  public readonly celestialEquatorLabelVisibleProperty: BooleanProperty;

  /**
   * View mode toggle:
   *  - `"earthCentered"` — lab geocentric Zodiac Explorer (`zodiac.swf`) sphere (default)
   *  - `"sky"` — Lambert observer sky view (zodiacSimulator)
   */
  public readonly viewModeProperty: Property<ZodiacViewMode>;

  // ── Derived astronomical quantities ──────────────────────────────────────────

  /**
   * Ecliptic longitude of the Sun in radians [0, 2π).
   * λ = (solarDaysSinceVE / tropicalYear) × 2π.
   */
  public readonly sunLongitudeRadProperty: TReadOnlyProperty<number>;

  /** Sun declination in radians: asin(sin λ · sin ε). */
  public readonly sunDecRadProperty: TReadOnlyProperty<number>;

  /** Sun right ascension in radians: atan2(sin λ · cos ε, cos λ). */
  public readonly sunRaRadProperty: TReadOnlyProperty<number>;

  /**
   * Local Sidereal Time in radians [0, 2π):
   * frac(siderealTimeDays) × 2π.
   */
  public readonly siderealTimeRadProperty: TReadOnlyProperty<number>;

  /**
   * Sun altitude in radians at the fixed observer latitude (41° N).
   * asin(sin dec · sin φ + cos dec · cos(LST − ra) · cos φ).
   */
  public readonly sunAltitudeRadProperty: TReadOnlyProperty<number>;

  /**
   * Twilight intensity: 0 = full night, 1 = full day.
   * clamp((twilightRange + sunAlt) / twilightRange, 0, 1)
   * with twilightRange = 7° in radians.
   */
  public readonly twilightIntensityProperty: TReadOnlyProperty<number>;

  /**
   * Current month (0-based index into MONTH_NAMES) and day-of-month.
   * Derived from solarDaysSinceVE via the Flash month-arithmetic algorithm.
   */
  public readonly monthDayProperty: TReadOnlyProperty<{ monthIndex: number; day: number }>;

  /**
   * Index into SIGN_KEYS for the zodiac sign the Sun is currently in.
   * 0 = Aries (λ = 0), 1 = Taurus, … 11 = Pisces.
   */
  public readonly sunSignIndexProperty: TReadOnlyProperty<number>;

  /** Human-readable solar time string "h:mm AM/PM" from timeMaster.solarTimeProperty. */
  public readonly solarClockStringProperty: TReadOnlyProperty<string>;

  // ── Private: prefers-reduced-motion guard ───────────────────────────────────

  public constructor() {
    this.timeMaster = new TimeMaster();
    this.timer = new TimeModel(false); // starts paused

    // When an eased jump starts, pause continuous playback.
    this.timeMaster.isAnimatingProperty.lazyLink((isAnimating) => {
      if (isAnimating) {
        this.timer.isPlayingProperty.value = false;
      }
    });

    // ── Toggles ────────────────────────────────────────────────────────────
    this.constellationLabelsVisibleProperty = new BooleanProperty(false);
    this.eclipticLabelVisibleProperty = new BooleanProperty(false);
    this.celestialEquatorLabelVisibleProperty = new BooleanProperty(false);
    this.viewModeProperty = new Property<ZodiacViewMode>("earthCentered");

    // ── Derived: sun longitude ──────────────────────────────────────────────
    this.sunLongitudeRadProperty = new DerivedProperty(
      [this.timeMaster.solarDaysSinceVernalEquinoxProperty, this.timeMaster.modeProperty],
      (daysSinceVE, mode) => {
        const Y = mode === "simple" ? SIMPLE_TROPICAL_YEAR : JULIAN_TROPICAL_YEAR;
        return sunLongitude(daysSinceVE, Y);
      },
    );

    // ── Derived: sun RA and Dec ─────────────────────────────────────────────
    this.sunDecRadProperty = new DerivedProperty([this.sunLongitudeRadProperty], (lon) => {
      return Math.asin(Math.sin(lon) * SIN_OBLIQUITY);
    });

    this.sunRaRadProperty = new DerivedProperty([this.sunLongitudeRadProperty], (lon) => {
      return Math.atan2(Math.sin(lon) * COS_OBLIQUITY, Math.cos(lon));
    });

    // ── Derived: LST in radians ─────────────────────────────────────────────
    this.siderealTimeRadProperty = new DerivedProperty([this.timeMaster.siderealTimeProperty], (sidDays) => {
      const frac = ((sidDays % 1) + 1) % 1;
      return frac * TWO_PI;
    });

    // ── Derived: sun altitude ───────────────────────────────────────────────
    this.sunAltitudeRadProperty = new DerivedProperty(
      [this.sunDecRadProperty, this.sunRaRadProperty, this.siderealTimeRadProperty],
      (dec, ra, lst) => {
        return Math.asin(Math.sin(dec) * SIN_LATITUDE + Math.cos(dec) * Math.cos(lst - ra) * COS_LATITUDE);
      },
    );

    // ── Derived: twilight intensity ─────────────────────────────────────────
    this.twilightIntensityProperty = new DerivedProperty([this.sunAltitudeRadProperty], (alt) => {
      const raw = (TWILIGHT_RAD + alt) / TWILIGHT_RAD;
      return Math.max(0, Math.min(1, raw));
    });

    // ── Derived: month + day ────────────────────────────────────────────────
    this.monthDayProperty = new DerivedProperty([this.timeMaster.solarDaysSinceVernalEquinoxProperty], (daysSinceVE) =>
      monthDayFromDaysSinceVE(daysSinceVE),
    );

    // ── Derived: sun sign index ─────────────────────────────────────────────
    this.sunSignIndexProperty = new DerivedProperty([this.sunLongitudeRadProperty], (lon) => {
      // Normalize to [0, 2π) (already done in sunLongitude)
      const index = Math.floor((lon / TWO_PI) * 12);
      return Math.max(0, Math.min(11, index));
    });

    // ── Derived: solar clock string ─────────────────────────────────────────
    this.solarClockStringProperty = new DerivedProperty([this.timeMaster.solarTimeProperty], (solar) => {
      const frac = ((solar % 1) + 1) % 1;
      const totalHours = frac * 24;
      const h24 = Math.floor(totalHours);
      const m = Math.floor((totalHours - h24) * 60);
      const isPm = h24 >= 12;
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const mm = String(m).padStart(2, "0");
      return `${h12}:${mm} ${isPm ? "PM" : "AM"}`;
    });
  }

  /**
   * Advance the simulation by one solar hour as an instant jump.
   * Bound to the TimeControlNode's step-forward button.
   */
  public stepForward(): void {
    this.timeMaster.incrementSolarTime(1 / 24, 0);
  }

  /**
   * Steps the model forward by dt seconds.
   */
  public step(dt: number): void {
    this.timer.step(dt);
    this.timeMaster.step(dt);

    if (this.timer.isPlayingProperty.value && !this.timeMaster.isAnimatingProperty.value) {
      this.timeMaster.incrementSolarTime(dt * SOLAR_DAYS_PER_SECOND);
    }
  }

  /**
   * Resets all model state to initial values.
   */
  public reset(): void {
    this.timeMaster.reset();
    this.timer.reset();
    this.constellationLabelsVisibleProperty.reset();
    this.eclipticLabelVisibleProperty.reset();
    this.celestialEquatorLabelVisibleProperty.reset();
    this.viewModeProperty.reset();
  }
}

MotionsOfTheSunNamespace.register("ZodiacModel", ZodiacModel);
