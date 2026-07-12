/**
 * SiderealSolarTimeModel.ts
 *
 * Top-level model for the Sidereal & Solar Time screen (Screen 2).
 *
 * Composes:
 *  - `timeMaster` — manages solar/sidereal time with eased jumps (TimeMaster)
 *  - `timer`      — play/pause + elapsed time (TimeModel)
 *  - `timeSpeedProperty` — SLOW / NORMAL / FAST multiplier
 *
 * Continuous play advances solarTime at `SOLAR_DAYS_PER_SECOND × multiplier`
 * solar days per real second.  Starting an eased jump (duration > 0) pauses
 * the timer automatically.
 *
 * The SIMPLE (365 d) / JULIAN (365.25 d) year mode is exposed via a radio group
 * in the view, bound directly to `timeMaster.modeProperty` (updates D7).
 */

import { EnumerationProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { TimeSpeed } from "scenerystack/scenery-phet";
import { TimeMaster } from "../../common/model/TimeMaster.js";
import { TimeModel, timeSpeedMultiplier } from "../../common/TimeModel.js";
import { SOLAR_DAYS_PER_SECOND } from "../../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../../MotionsOfTheSunNamespace.js";

export class SiderealSolarTimeModel implements TModel {
  /** Manages solar/sidereal time, eased jumps, and isAt* derived properties. */
  public readonly timeMaster: TimeMaster;

  /** Play/pause + elapsed time; bind to TimeControlNode. */
  public readonly timer: TimeModel;

  /** Playback speed; SLOW = 0.25×, NORMAL = 1×, FAST = 4×. */
  public readonly timeSpeedProperty: EnumerationProperty<TimeSpeed>;

  public constructor() {
    this.timeMaster = new TimeMaster();
    this.timer = new TimeModel(false); // starts paused
    this.timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL);

    // When an eased jump starts, pause continuous playback so the two
    // advancement paths do not fight each other.
    this.timeMaster.isAnimatingProperty.lazyLink((isAnimating) => {
      if (isAnimating) {
        this.timer.isPlayingProperty.value = false;
      }
    });
  }

  /**
   * Advance the simulation by one solar hour (1/24 day) as an instant jump.
   * Bound to the TimeControlNode's step-forward button.
   */
  public stepForward(): void {
    this.timeMaster.incrementSolarTime(1 / 24, 0);
  }

  /**
   * Steps the model forward by dt seconds.
   * Called every animation frame by the Sim framework.
   */
  public step(dt: number): void {
    this.timer.step(dt);
    this.timeMaster.step(dt);

    if (this.timer.isPlayingProperty.value && !this.timeMaster.isAnimatingProperty.value) {
      const multiplier = timeSpeedMultiplier(this.timeSpeedProperty.value);
      this.timeMaster.incrementSolarTime(dt * SOLAR_DAYS_PER_SECOND * multiplier);
    }
  }

  /**
   * Resets all model state to initial values.
   * Called when the user presses the Reset All button.
   */
  public reset(): void {
    this.timeMaster.reset();
    this.timer.reset();
    this.timeSpeedProperty.reset();
  }
}

MotionsOfTheSunNamespace.register("SiderealSolarTimeModel", SiderealSolarTimeModel);
