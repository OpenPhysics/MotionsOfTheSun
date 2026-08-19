/**
 * attachDayTimeMirrors.ts
 *
 * Bidirectional integer-day and time-of-day NumberProperty mirrors of the
 * model's decimal dayOfYear (integer part = calendar day, fraction = time / 24).
 *
 * A single syncing flag blocks axon reentry: setting time to 24 h advances
 * dayOfYear to the next midnight, and the reverse link would otherwise set
 * timeProperty to 0 while it is still notifying (fuzz ?ea). After that write
 * settles, a microtask pulls the mirrors so time wraps to 0 without reentry.
 */

import type { NumberProperty } from "scenerystack/axon";

export function attachDayTimeMirrors(
  dayOfYearProperty: NumberProperty,
  dayProperty: NumberProperty,
  timeProperty: NumberProperty,
): void {
  let syncing = false;

  const pullFromModel = (day: number): void => {
    if (syncing) {
      return;
    }
    syncing = true;
    try {
      const newInt = dayProperty.range.constrainValue(Math.floor(day));
      if (dayProperty.value !== newInt) {
        dayProperty.value = newInt;
      }
      const newTime = timeProperty.range.constrainValue((day % 1) * 24);
      if (Math.abs(timeProperty.value - newTime) > 1e-6) {
        timeProperty.value = newTime;
      }
    } finally {
      syncing = false;
    }
  };

  dayOfYearProperty.link(pullFromModel);

  dayProperty.lazyLink((day) => {
    if (syncing) {
      return;
    }
    syncing = true;
    try {
      const frac = dayOfYearProperty.value % 1;
      const newDay = dayOfYearProperty.range.constrainValue(day + frac);
      if (Math.abs(dayOfYearProperty.value - newDay) > 1e-9) {
        dayOfYearProperty.value = newDay;
      }
    } finally {
      syncing = false;
    }
    queueMicrotask(() => pullFromModel(dayOfYearProperty.value));
  });

  timeProperty.lazyLink((time) => {
    if (syncing) {
      return;
    }
    syncing = true;
    try {
      const intDay = Math.floor(dayOfYearProperty.value);
      const newDay = dayOfYearProperty.range.constrainValue(intDay + time / 24);
      if (Math.abs(dayOfYearProperty.value - newDay) > 1e-9) {
        dayOfYearProperty.value = newDay;
      }
    } finally {
      syncing = false;
    }
    queueMicrotask(() => pullFromModel(dayOfYearProperty.value));
  });
}
