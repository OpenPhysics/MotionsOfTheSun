/**
 * SunPathsModel.ts
 *
 * Top-level model for the Sun Paths screen (Screen 1).
 *
 * State
 * ─────
 *  - `dayOfYearProperty`  — decimal day-of-year; integer part = calendar day
 *    (Jan 1 00:00 UT = 1.0); fractional part = local mean time / 24.
 *  - `latitudeProperty`   — observer latitude in degrees (+N).
 *  - Six display-toggle BooleanProperties.
 *  - `loopDayProperty`    — when true, animation wraps within the same day.
 *  - `timer`              — play / pause + elapsed time (TimeModel).
 *  - `timeSpeedProperty`  — SLOW / NORMAL / FAST multiplier.
 *
 * Derived ephemeris (recomputed whenever dayOfYear or latitude changes)
 * ─────────────────────────────────────────────────────────────────────
 *  sunRaHours, sunDecDeg, siderealTimeHours, hourAngleHours,
 *  sunAltDeg, sunAzDeg, eqnOfTimeMinutes
 *
 * Camera interface (D9)
 * ─────────────────────
 *  `advanceSiderealTime(hours)` is the one method `attachSkyCameraInteraction`
 *  needs. It advances dayOfYear by the equivalent solar time increment.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { BooleanProperty, DerivedProperty, EnumerationProperty, NumberProperty, Property } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { TimeSpeed } from "scenerystack/scenery-phet";
import { equatorialToHorizontal } from "../../common/SkyCoordinates.js";
import {
  getEqnOfTimeMinutes,
  getHourAngleHours,
  getSiderealTimeHours,
  getSunPosition,
} from "../../common/SunEphemeris.js";
import { TimeModel, timeSpeedMultiplier } from "../../common/TimeModel.js";
import {
  ANIMATION_HOURS_PER_SECOND,
  DAY_OF_YEAR_RANGE,
  DEFAULT_DAY_OF_YEAR,
  DEFAULT_LATITUDE,
  LATITUDE_RANGE,
  SIDEREAL_RATE,
  STEP_DAYS_PER_SECOND,
} from "../../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../../MotionsOfTheSunNamespace.js";
import motionsOfTheSunQueryParameters from "../../preferences/motionsOfTheSunQueryParameters.js";

/**
 * Animation mode (from the NAAP Flash / CCNMTL JS "Animation mode" radio):
 *  - "continuous" — time-of-day flows and the date drifts continuously.
 *  - "stepByDay"  — the date advances one whole day at a time while the
 *    time-of-day is held fixed, so the Sun's daily path migrates day to day.
 */
export type SunPathsAnimationMode = "continuous" | "stepByDay";

/**
 * Sun-disk drag mode (Flash `sunDragMode` / Settings Panel radio):
 *  - "timeOfDay"  — drag along the declination circle (changes time of day).
 *  - "dayOfYear"  — drag along the analemma (changes calendar day at fixed time).
 */
export type SunDragMode = "timeOfDay" | "dayOfYear";

/** Constructor options for SunPathsModel (RS SkyModelOptions pattern). */
export type SunPathsModelOptions = {
  /**
   * When provided, the model uses this Property's current value as the
   * initial latitude and restores it on reset, so Reset All honours the
   * Preferences "Default Latitude" setting.
   */
  defaultLatitudeProperty?: TReadOnlyProperty<number> | undefined;
};

const YEAR_SPAN = DAY_OF_YEAR_RANGE.max - DAY_OF_YEAR_RANGE.min;

/** Wraps a day value back into [DAY_OF_YEAR_RANGE.min, DAY_OF_YEAR_RANGE.max). */
const wrapDay = (day: number): number =>
  ((((day - DAY_OF_YEAR_RANGE.min) % YEAR_SPAN) + YEAR_SPAN) % YEAR_SPAN) + DAY_OF_YEAR_RANGE.min;

export class SunPathsModel implements TModel {
  /** Decimal day-of-year; integer = calendar day, fraction = time-of-day / 24. */
  public readonly dayOfYearProperty: NumberProperty;

  /** Observer latitude in degrees (+N). */
  public readonly latitudeProperty: NumberProperty;

  /** Holds the current preference value so reset() can restore to it. */
  private readonly defaultLatitudeProperty: TReadOnlyProperty<number>;

  // ── Display toggles ──────────────────────────────────────────────────────────
  public readonly showDeclinationCircleProperty: BooleanProperty;
  public readonly showEclipticProperty: BooleanProperty;
  public readonly showMonthLabelsProperty: BooleanProperty;
  public readonly showUndersideProperty: BooleanProperty;
  public readonly showStickfigureProperty: BooleanProperty;
  public readonly showAnalemmaProperty: BooleanProperty;
  public readonly loopDayProperty: BooleanProperty;

  // ── Playback ─────────────────────────────────────────────────────────────────
  public readonly timer: TimeModel;
  public readonly timeSpeedProperty: EnumerationProperty<TimeSpeed>;

  /** "continuous" (default) vs "stepByDay" whole-day stepping. */
  public readonly animationModeProperty: Property<SunPathsAnimationMode>;

  /** Flash Settings Panel: dragging the Sun changes time of day vs day of year. */
  public readonly sunDragModeProperty: Property<SunDragMode>;

  /** Fractional days accrued in step-by-day mode until a whole day is reached. */
  private stepAccumulatorDays = 0;

  // ── Derived ephemeris ─────────────────────────────────────────────────────────
  public readonly sunRaHoursProperty: TReadOnlyProperty<number>;
  public readonly sunDecDegProperty: TReadOnlyProperty<number>;
  public readonly siderealTimeHoursProperty: TReadOnlyProperty<number>;
  public readonly hourAngleHoursProperty: TReadOnlyProperty<number>;
  public readonly sunAltDegProperty: TReadOnlyProperty<number>;
  public readonly sunAzDegProperty: TReadOnlyProperty<number>;
  public readonly eqnOfTimeMinutesProperty: TReadOnlyProperty<number>;

  public constructor(options: SunPathsModelOptions = {}) {
    // Use the preference property if provided; otherwise fall back to a constant default.
    this.defaultLatitudeProperty =
      options.defaultLatitudeProperty ?? new NumberProperty(DEFAULT_LATITUDE, { range: LATITUDE_RANGE });

    // Seed initial day from the `day` query parameter (default: DEFAULT_DAY_OF_YEAR).
    // reset() returns to this value, so ?day=355 stays at that date after Reset All.
    const initialDay = motionsOfTheSunQueryParameters.day ?? DEFAULT_DAY_OF_YEAR;
    this.dayOfYearProperty = new NumberProperty(initialDay, { range: DAY_OF_YEAR_RANGE });
    this.latitudeProperty = new NumberProperty(this.defaultLatitudeProperty.value, { range: LATITUDE_RANGE });

    this.showDeclinationCircleProperty = new BooleanProperty(true);
    this.showEclipticProperty = new BooleanProperty(true);
    this.showMonthLabelsProperty = new BooleanProperty(false);
    this.showUndersideProperty = new BooleanProperty(true);
    this.showStickfigureProperty = new BooleanProperty(true);
    this.showAnalemmaProperty = new BooleanProperty(false);
    this.loopDayProperty = new BooleanProperty(false);

    this.timer = new TimeModel(false);
    this.timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL);
    this.animationModeProperty = new Property<SunPathsAnimationMode>("continuous");
    this.sunDragModeProperty = new Property<SunDragMode>("timeOfDay");

    // A partial day must not carry across a pause or a mode switch.
    this.timer.isPlayingProperty.lazyLink(() => {
      this.stepAccumulatorDays = 0;
    });
    this.animationModeProperty.lazyLink(() => {
      this.stepAccumulatorDays = 0;
    });

    // Day-of-year sun drag needs the analemma visible to be pedagogically clear
    // (Flash keeps the curve available whenever that drag mode is selected).
    this.sunDragModeProperty.lazyLink((mode) => {
      if (mode === "dayOfYear") {
        this.showAnalemmaProperty.value = true;
      }
    });

    // Sun's RA and Dec — only depend on day (latitude does not affect ephemeris).
    this.sunRaHoursProperty = new DerivedProperty([this.dayOfYearProperty], (day) => getSunPosition(day).raHours);
    this.sunDecDegProperty = new DerivedProperty([this.dayOfYearProperty], (day) => getSunPosition(day).decDeg);

    // GMST used as LST (observer at 0° longitude, matching NAAP convention).
    this.siderealTimeHoursProperty = new DerivedProperty([this.dayOfYearProperty], (day) => getSiderealTimeHours(day));

    this.hourAngleHoursProperty = new DerivedProperty(
      [this.siderealTimeHoursProperty, this.sunRaHoursProperty],
      (lst, ra) => getHourAngleHours(lst, ra),
    );

    this.sunAltDegProperty = new DerivedProperty(
      [this.sunRaHoursProperty, this.sunDecDegProperty, this.latitudeProperty, this.siderealTimeHoursProperty],
      (ra, dec, lat, lst) => equatorialToHorizontal(ra, dec, lat, lst).altDeg,
    );
    this.sunAzDegProperty = new DerivedProperty(
      [this.sunRaHoursProperty, this.sunDecDegProperty, this.latitudeProperty, this.siderealTimeHoursProperty],
      (ra, dec, lat, lst) => equatorialToHorizontal(ra, dec, lat, lst).azDeg,
    );

    this.eqnOfTimeMinutesProperty = new DerivedProperty([this.dayOfYearProperty], (day) => getEqnOfTimeMinutes(day));
  }

  /**
   * Camera interface (D9): Ctrl-drag on the dome advances sidereal time.
   * Equivalent solar day increment = sidereal hours / (24 × SIDEREAL_RATE).
   */
  public advanceSiderealTime(hours: number): void {
    this.dayOfYearProperty.value = wrapDay(this.dayOfYearProperty.value + hours / 24 / SIDEREAL_RATE);
  }

  /** Advance by one solar hour (step-forward button). */
  public stepForward(): void {
    this.dayOfYearProperty.value = wrapDay(this.dayOfYearProperty.value + 1 / 24);
  }

  public step(dt: number): void {
    this.timer.step(dt);
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    const multiplier = timeSpeedMultiplier(this.timeSpeedProperty.value);

    if (this.animationModeProperty.value === "stepByDay") {
      // Step-by-day: accrue elapsed time and advance the DATE by whole days
      // once a full day is reached, holding the time-of-day fixed (adding an
      // integer preserves the fractional part). Loop-day does not apply here.
      this.stepAccumulatorDays += dt * STEP_DAYS_PER_SECOND * multiplier;
      const wholeDays = Math.floor(this.stepAccumulatorDays);
      if (wholeDays >= 1) {
        this.stepAccumulatorDays -= wholeDays;
        this.dayOfYearProperty.value = wrapDay(this.dayOfYearProperty.value + wholeDays);
      }
      return;
    }

    // Continuous: time-of-day flows and the date drifts continuously.
    const daysDelta = (dt * ANIMATION_HOURS_PER_SECOND * multiplier) / 24;
    if (this.loopDayProperty.value) {
      // Integer part (calendar date) stays fixed; only the fraction advances.
      const intDay = Math.floor(this.dayOfYearProperty.value);
      let frac = (this.dayOfYearProperty.value - intDay + daysDelta) % 1;
      if (frac < 0) {
        frac += 1;
      }
      this.dayOfYearProperty.value = intDay + frac;
    } else {
      this.dayOfYearProperty.value = wrapDay(this.dayOfYearProperty.value + daysDelta);
    }
  }

  public reset(): void {
    this.dayOfYearProperty.reset();
    // Restore latitude to the CURRENT preference value, not the query-param initial.
    this.latitudeProperty.value = this.defaultLatitudeProperty.value;
    this.showDeclinationCircleProperty.reset();
    this.showEclipticProperty.reset();
    this.showMonthLabelsProperty.reset();
    this.showUndersideProperty.reset();
    this.showStickfigureProperty.reset();
    this.showAnalemmaProperty.reset();
    this.loopDayProperty.reset();
    this.timer.reset();
    this.timeSpeedProperty.reset();
    this.animationModeProperty.reset();
    this.sunDragModeProperty.reset();
    this.stepAccumulatorDays = 0;
  }
}

MotionsOfTheSunNamespace.register("SunPathsModel", SunPathsModel);
