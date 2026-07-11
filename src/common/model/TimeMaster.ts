/**
 * TimeMaster.ts
 *
 * Manages solar and sidereal time with optional cubic ease-in-out animation.
 * Transcribed from `NAAP/flash-animations/flashdev2/siderealSolarTime/TimeMaster.as`
 * with design decision D4: animated jumps are implemented as cubic ease-in-out
 * inside `step(dt)` (no Flash Timer / CubicEaser dependency).
 *
 * ── Time conventions ─────────────────────────────────────────────────────────
 *  - `solarTime` = decimal days since an arbitrary epoch; integers = midnight;
 *    epoch (solarTime = 0.5) is defined as solar noon on the vernal equinox
 *    (SOLAR_TIME_AT_EPOCH = 0.5 day).
 *  - `siderealTime` = (solar − 0.5) × siderealPerSolar (decimal sidereal-days);
 *    positive = east of the default meridian.
 *  - All durations passed to mutators are in real seconds (not Flash milliseconds).
 *
 * ── Modes ────────────────────────────────────────────────────────────────────
 *  - SIMPLE ("simple"): tropicalYear = 365 d exactly, siderealPerSolar = 366/365.
 *  - JULIAN ("julian"): tropicalYear = 365.25 d, siderealPerSolar = 366.25/365.25.
 *  Changing mode resets solarTime to 0.5.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { BooleanProperty, DerivedProperty, NumberProperty, Property } from "scenerystack/axon";
import {
  JULIAN_TROPICAL_YEAR,
  SIMPLE_TROPICAL_YEAR,
  SOLAR_TIME_AT_EPOCH,
  TIME_EQUALITY_TOLERANCE,
} from "../../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../../MotionsOfTheSunNamespace.js";

/** Supported time-computation modes. */
export type TimeMasterMode = "simple" | "julian";

/** Internal animation state, populated when an eased jump is in progress. */
type AnimState = {
  start: number;
  target: number;
  duration: number;
  elapsed: number;
};

/** Cubic ease-in-out: maps u ∈ [0, 1] → [0, 1] per D4. */
const easeInOutCubic = (u: number): number => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

/**
 * Finds the next time value that has the given fractional part, strictly after
 * `currentTime`. Transcribed from `getNextTimeWithFraction` in Main.as.
 *
 * `fraction` is normalised to [0, 1). If `currentTime` is already within 1e-8
 * of the target fraction, the result is advanced by one full unit (one day for
 * solar/sidereal time-of-day calls; one year-unit for year-fraction calls).
 */
const getNextTimeWithFraction = (currentTime: number, fraction: number): number => {
  const f = ((fraction % 1) + 1) % 1;
  const currInt = Math.floor(currentTime);
  const currFrac = currentTime - currInt;
  const int = f - currFrac < 1e-8 ? currInt + 1 : currInt;
  return int + f;
};

export class TimeMaster {
  // ── Public observable state ─────────────────────────────────────────────────

  /**
   * Current displayed solar time in decimal days.
   * Integers = midnight; 0.5 = solar noon on the vernal equinox.
   * Updated every `step(dt)` call during animations.
   */
  public readonly solarTimeProperty: NumberProperty;

  /** Current mode: "simple" (365-day year) or "julian" (365.25-day year). */
  public readonly modeProperty: Property<TimeMasterMode>;

  /** True while an eased animation is running. */
  public readonly isAnimatingProperty: BooleanProperty;

  // ── Derived properties ───────────────────────────────────────────────────────

  /** Sidereal time in decimal sidereal-days: (solar − 0.5) × siderealPerSolar. */
  public readonly siderealTimeProperty: TReadOnlyProperty<number>;

  /** Solar days elapsed since the most recent vernal equinox, in [0, tropicalYear). */
  public readonly solarDaysSinceVernalEquinoxProperty: TReadOnlyProperty<number>;

  /** Sidereal days elapsed since the most recent vernal equinox. */
  public readonly siderealDaysSinceVernalEquinoxProperty: TReadOnlyProperty<number>;

  // ── isAt* DerivedProperties (solar time-of-day) ─────────────────────────────

  /** True when solar time-of-day fraction ≈ 0 (midnight). */
  public readonly isAtMidnightProperty: TReadOnlyProperty<boolean>;
  /** True when solar time-of-day fraction ≈ 0.25 (nominal sunrise). */
  public readonly isAtSunriseProperty: TReadOnlyProperty<boolean>;
  /** True when solar time-of-day fraction ≈ 0.5 (solar noon). */
  public readonly isAtNoonProperty: TReadOnlyProperty<boolean>;
  /** True when solar time-of-day fraction ≈ 0.75 (nominal sunset). */
  public readonly isAtSunsetProperty: TReadOnlyProperty<boolean>;

  // ── isAt* DerivedProperties (sidereal time-of-day) ──────────────────────────

  /** True when sidereal time-of-day fraction ≈ 0 (0h). */
  public readonly isAtSidereal0hProperty: TReadOnlyProperty<boolean>;
  /** True when sidereal time-of-day fraction ≈ 0.25 (6h). */
  public readonly isAtSidereal6hProperty: TReadOnlyProperty<boolean>;
  /** True when sidereal time-of-day fraction ≈ 0.5 (12h). */
  public readonly isAtSidereal12hProperty: TReadOnlyProperty<boolean>;
  /** True when sidereal time-of-day fraction ≈ 0.75 (18h). */
  public readonly isAtSidereal18hProperty: TReadOnlyProperty<boolean>;

  // ── isAt* DerivedProperties (seasons) ───────────────────────────────────────

  /** True when solarDaysSinceVE ≈ 0 or ≈ tropicalYear (vernal equinox). */
  public readonly isAtVernalEquinoxProperty: TReadOnlyProperty<boolean>;
  /** True when solarDaysSinceVE ≈ 0.25 × tropicalYear (summer solstice). */
  public readonly isAtSummerSolsticeProperty: TReadOnlyProperty<boolean>;
  /** True when solarDaysSinceVE ≈ 0.50 × tropicalYear (autumnal equinox). */
  public readonly isAtAutumnalEquinoxProperty: TReadOnlyProperty<boolean>;
  /** True when solarDaysSinceVE ≈ 0.75 × tropicalYear (winter solstice). */
  public readonly isAtWinterSolsticeProperty: TReadOnlyProperty<boolean>;

  // ── Internal animation state ─────────────────────────────────────────────────

  /**
   * Target solar time for the current (or most recently started) animation.
   * Equals `solarTimeProperty.value` when no animation is running.
   * Used by `incrementSolarTime` so button presses stack onto the pending target.
   */
  private _animTarget: number;

  /** Live animation state; null when idle. */
  private _anim: AnimState | null = null;

  // ── Constructor ──────────────────────────────────────────────────────────────

  public constructor() {
    this.solarTimeProperty = new NumberProperty(SOLAR_TIME_AT_EPOCH);
    this.modeProperty = new Property<TimeMasterMode>("simple");
    this.isAnimatingProperty = new BooleanProperty(false);
    this._animTarget = SOLAR_TIME_AT_EPOCH;

    // ── Derived: sidereal and season counters ───────────────────────────────

    this.siderealTimeProperty = new DerivedProperty([this.solarTimeProperty, this.modeProperty], (solar, mode) => {
      const sps = this._siderealPerSolarForMode(mode);
      return (solar - SOLAR_TIME_AT_EPOCH) * sps;
    });

    this.solarDaysSinceVernalEquinoxProperty = new DerivedProperty(
      [this.solarTimeProperty, this.modeProperty],
      (solar, mode) => {
        const Y = mode === "simple" ? SIMPLE_TROPICAL_YEAR : JULIAN_TROPICAL_YEAR;
        return (((solar - SOLAR_TIME_AT_EPOCH) % Y) + Y) % Y;
      },
    );

    this.siderealDaysSinceVernalEquinoxProperty = new DerivedProperty(
      [this.solarDaysSinceVernalEquinoxProperty, this.modeProperty],
      (solarDaysSinceVE, mode) => {
        const sps = this._siderealPerSolarForMode(mode);
        return solarDaysSinceVE * sps;
      },
    );

    // ── Derived: solar time-of-day isAt* ───────────────────────────────────

    const solarFracProperty = new DerivedProperty([this.solarTimeProperty], (solar) => ((solar % 1) + 1) % 1);

    this.isAtMidnightProperty = new DerivedProperty(
      [solarFracProperty],
      (f) => timesAreEqual(f, 0) || timesAreEqual(f - 1, 0),
    );
    this.isAtSunriseProperty = new DerivedProperty([solarFracProperty], (f) => timesAreEqual(f, 0.25));
    this.isAtNoonProperty = new DerivedProperty([solarFracProperty], (f) => timesAreEqual(f, 0.5));
    this.isAtSunsetProperty = new DerivedProperty([solarFracProperty], (f) => timesAreEqual(f, 0.75));

    // ── Derived: sidereal time-of-day isAt* ────────────────────────────────

    const siderealFracProperty = new DerivedProperty([this.siderealTimeProperty], (sid) => ((sid % 1) + 1) % 1);

    this.isAtSidereal0hProperty = new DerivedProperty(
      [siderealFracProperty],
      (f) => timesAreEqual(f, 0) || timesAreEqual(f - 1, 0),
    );
    this.isAtSidereal6hProperty = new DerivedProperty([siderealFracProperty], (f) => timesAreEqual(f, 0.25));
    this.isAtSidereal12hProperty = new DerivedProperty([siderealFracProperty], (f) => timesAreEqual(f, 0.5));
    this.isAtSidereal18hProperty = new DerivedProperty([siderealFracProperty], (f) => timesAreEqual(f, 0.75));

    // ── Derived: season isAt* ───────────────────────────────────────────────

    this.isAtVernalEquinoxProperty = new DerivedProperty(
      [this.solarDaysSinceVernalEquinoxProperty, this.modeProperty],
      (daysVE, mode) => {
        const Y = mode === "simple" ? SIMPLE_TROPICAL_YEAR : JULIAN_TROPICAL_YEAR;
        return timesAreEqual(daysVE, 0) || timesAreEqual(daysVE - Y, 0);
      },
    );

    this.isAtSummerSolsticeProperty = new DerivedProperty(
      [this.solarDaysSinceVernalEquinoxProperty, this.modeProperty],
      (daysVE, mode) => {
        const Y = mode === "simple" ? SIMPLE_TROPICAL_YEAR : JULIAN_TROPICAL_YEAR;
        return timesAreEqual(daysVE, 0.25 * Y);
      },
    );

    this.isAtAutumnalEquinoxProperty = new DerivedProperty(
      [this.solarDaysSinceVernalEquinoxProperty, this.modeProperty],
      (daysVE, mode) => {
        const Y = mode === "simple" ? SIMPLE_TROPICAL_YEAR : JULIAN_TROPICAL_YEAR;
        return timesAreEqual(daysVE, 0.5 * Y);
      },
    );

    this.isAtWinterSolsticeProperty = new DerivedProperty(
      [this.solarDaysSinceVernalEquinoxProperty, this.modeProperty],
      (daysVE, mode) => {
        const Y = mode === "simple" ? SIMPLE_TROPICAL_YEAR : JULIAN_TROPICAL_YEAR;
        return timesAreEqual(daysVE, 0.75 * Y);
      },
    );

    // ── Mode change listener: reset time and cancel animation ───────────────

    this.modeProperty.lazyLink(() => {
      this._cancelAnimation();
      this._setDisplayedSolarTime(SOLAR_TIME_AT_EPOCH);
    });
  }

  // ── Public read-only helpers ─────────────────────────────────────────────────

  /** Tropical year length in solar days for the current mode. */
  public get tropicalYear(): number {
    return this.modeProperty.value === "simple" ? SIMPLE_TROPICAL_YEAR : JULIAN_TROPICAL_YEAR;
  }

  /** Sidereal days per solar day for the current mode. */
  public get siderealPerSolar(): number {
    return this._siderealPerSolarForMode(this.modeProperty.value);
  }

  // ── Public conversion helpers ────────────────────────────────────────────────

  /** Solar time → sidereal time in decimal days. */
  public getSiderealTimeForSolarTime(solar: number): number {
    return (solar - SOLAR_TIME_AT_EPOCH) * this.siderealPerSolar;
  }

  /** Sidereal time → solar time in decimal days. */
  public getSolarTimeForSiderealTime(sidereal: number): number {
    return sidereal / this.siderealPerSolar + SOLAR_TIME_AT_EPOCH;
  }

  // ── Public mutators ───────────────────────────────────────────────────────────

  /**
   * Set solar time to `target`.
   * - `durationSeconds = 0` (default): instant jump, cancels any ongoing animation.
   * - `durationSeconds > 0`: starts a cubic ease-in-out animation from the current
   *   *displayed* value to `target`. If an animation is already running, it retargets
   *   from the current displayed value.
   */
  public setSolarTime(target: number, durationSeconds = 0): void {
    this._animTarget = target;

    if (durationSeconds <= 0) {
      this._cancelAnimation();
      this._setDisplayedSolarTime(target);
    } else {
      const start = this.solarTimeProperty.value;
      this._anim = { start, target, duration: durationSeconds, elapsed: 0 };
      this.isAnimatingProperty.value = true;
    }
  }

  /**
   * Increment solar time by `solarDays` from the current *target* (not current
   * displayed value), so rapid button presses stack correctly.
   */
  public incrementSolarTime(solarDays: number, durationSeconds = 0): void {
    this.setSolarTime(this._animTarget + solarDays, durationSeconds);
  }

  /**
   * Increment sidereal time by `siderealDays` sidereal days.
   * Converts to solar days via the current siderealPerSolar ratio.
   */
  public incrementSiderealTime(siderealDays: number, durationSeconds = 0): void {
    this.setSolarTime(this._animTarget + siderealDays / this.siderealPerSolar, durationSeconds);
  }

  /**
   * Animate to the next occurrence of the given solar time-of-day fraction
   * (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset).
   * Always moves forward; if already at the target fraction, advances one full day.
   */
  public goToSolarTimeOfDay(fractionOfDay: number, durationSeconds = 0): void {
    const current = this.solarTimeProperty.value;
    const t = getNextTimeWithFraction(current, fractionOfDay);
    if (!timesAreEqual(this._animTarget, t)) {
      this.setSolarTime(t, durationSeconds);
    }
  }

  /**
   * Animate to the next occurrence of the given sidereal time-of-day fraction.
   * Converts to solar time before delegating to `setSolarTime`.
   */
  public goToSiderealTimeOfDay(fractionOfDay: number, durationSeconds = 0): void {
    const currentSidereal = this.siderealTimeProperty.value;
    const tSidereal = getNextTimeWithFraction(currentSidereal, fractionOfDay);
    const tSolar = this.getSolarTimeForSiderealTime(tSidereal);
    if (!timesAreEqual(this._animTarget, tSolar)) {
      this.setSolarTime(tSolar, durationSeconds);
    }
  }

  /**
   * Animate to the next occurrence of the given year-fraction (0 = VE, 0.25 = SS, …).
   * Works in the (solar − 0.5) / tropicalYear unit, then maps back to solarTime.
   * Always moves forward; if already at the target fraction, advances one full year.
   */
  public goToFractionOfYear(fractionOfYear: number, durationSeconds = 0): void {
    const current = this.solarTimeProperty.value;
    const Y = this.tropicalYear;
    const tUnit = (current - SOLAR_TIME_AT_EPOCH) / Y;
    const nextUnit = getNextTimeWithFraction(tUnit, fractionOfYear);
    const tSolar = SOLAR_TIME_AT_EPOCH + nextUnit * Y;
    if (!timesAreEqual(this._animTarget, tSolar)) {
      this.setSolarTime(tSolar, durationSeconds);
    }
  }

  // ── step / reset ─────────────────────────────────────────────────────────────

  /**
   * Advance the animation by `dt` real seconds.
   * Call this from the enclosing model's `step(dt)`.
   */
  public step(dt: number): void {
    if (this._anim === null) {
      return;
    }

    this._anim.elapsed += dt;

    if (this._anim.elapsed >= this._anim.duration) {
      // Animation complete — snap exactly to target.
      const target = this._anim.target;
      this._cancelAnimation();
      this._setDisplayedSolarTime(target);
    } else {
      const u = this._anim.elapsed / this._anim.duration;
      const solar = this._anim.start + (this._anim.target - this._anim.start) * easeInOutCubic(u);
      this._setDisplayedSolarTime(solar);
    }
  }

  /**
   * Reset to SIMPLE mode, solarTime = 0.5, cancel any animation.
   */
  public reset(): void {
    this._cancelAnimation();
    // Setting mode triggers the lazyLink which resets solarTime.
    if (this.modeProperty.value === "simple") {
      // Already in simple mode — manually reset time.
      this._setDisplayedSolarTime(SOLAR_TIME_AT_EPOCH);
    } else {
      this.modeProperty.value = "simple";
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _siderealPerSolarForMode(mode: TimeMasterMode): number {
    const Y = mode === "simple" ? SIMPLE_TROPICAL_YEAR : JULIAN_TROPICAL_YEAR;
    return (Y + 1) / Y;
  }

  private _setDisplayedSolarTime(solar: number): void {
    this.solarTimeProperty.value = solar;
    this._animTarget = solar;
  }

  private _cancelAnimation(): void {
    if (this._anim !== null) {
      this._anim = null;
      this.isAnimatingProperty.value = false;
    }
  }
}

MotionsOfTheSunNamespace.register("TimeMaster", TimeMaster);

/** Tolerance-based equality for time values (1e-6 days ≈ 0.1 second). */
export const timesAreEqual = (a: number, b: number): boolean => Math.abs(a - b) < TIME_EQUALITY_TOLERANCE;
