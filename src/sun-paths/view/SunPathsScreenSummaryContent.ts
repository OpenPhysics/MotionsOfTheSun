/**
 * SunPathsScreenSummaryContent.ts
 *
 * Accessible screen summary for the Sun Paths screen (Screen 1).
 * `currentDetailsContent` is a live `PatternStringProperty` that fills the
 * localized pattern with the current day of year, latitude, altitude, and
 * azimuth. It updates automatically as the model runs.
 *
 * Pattern (en):
 *   "It is day {{day}} of the year at latitude {{latitude}} degrees.
 *    The Sun is at altitude {{altitude}} degrees, azimuth {{azimuth}} degrees."
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";

export class SunPathsScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: SunPathsModel) {
    const a11y = StringManager.getInstance().getSunPathsA11yStrings();

    // Integer Flash DOY for readability (e.g. "146" for May 27).
    const dayProperty = new DerivedProperty([model.dayOfYearProperty], (day) => Math.max(0, Math.floor(day)));

    const currentDetails = new PatternStringProperty(
      a11y.currentDetailsStringProperty,
      {
        day: dayProperty,
        latitude: model.latitudeProperty,
        altitude: model.sunAltDegProperty,
        azimuth: model.sunAzDegProperty,
      },
      {
        decimalPlaces: {
          day: 0,
          latitude: 1,
          altitude: 1,
          azimuth: 1,
        },
      },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
