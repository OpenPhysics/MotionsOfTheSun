/**
 * SiderealSolarTimeScreenSummaryContent.ts
 *
 * The accessible screen summary for Screen 2 (Sidereal & Solar Time).
 * `currentDetailsContent` is a live `PatternStringProperty` that fills the
 * localized pattern with solar days since VE, sidereal days since VE, and
 * a formatted solar clock string.  It updates automatically as the model runs.
 *
 * Pattern (en):
 *   "Earth is {{solarDays}} solar days ({{siderealDays}} sidereal days) past
 *    the vernal equinox; solar time is {{solarClock}}."
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { SiderealSolarTimeModel } from "../model/SiderealSolarTimeModel.js";

export class SiderealSolarTimeScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: SiderealSolarTimeModel) {
    const a11y = StringManager.getInstance().getSiderealSolarTimeA11yStrings();
    const strings = StringManager.getInstance().getSiderealSolarTimeStrings();
    const tm = model.timeMaster;

    // Formatted solar clock: "h:mm AM/PM"
    const solarClockProperty = new DerivedProperty(
      [tm.solarTimeProperty, strings.amStringProperty, strings.pmStringProperty],
      (solar, am, pm) => {
        const frac = ((solar % 1) + 1) % 1;
        const totalHours = frac * 24;
        const hour12Raw = totalHours % 12;
        const hour12 = hour12Raw === 0 ? 12 : Math.floor(hour12Raw);
        const mins = Math.floor((totalHours % 1) * 60);
        const period = totalHours < 12 ? am : pm;
        return `${hour12}:${String(mins).padStart(2, "0")} ${period}`;
      },
    );

    const currentDetails = new PatternStringProperty(
      a11y.currentDetailsStringProperty,
      {
        solarDays: tm.solarDaysSinceVernalEquinoxProperty,
        siderealDays: tm.siderealDaysSinceVernalEquinoxProperty,
        solarClock: solarClockProperty,
      },
      { decimalPlaces: { solarDays: 3, siderealDays: 3, solarClock: null } },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
