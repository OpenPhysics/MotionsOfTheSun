/**
 * ZodiacScreenSummaryContent.ts
 *
 * Accessible screen summary for the Zodiac screen (Screen 3).
 *
 * `currentDetailsContent` is a live `PatternStringProperty` that fills the
 * localized pattern from `a11y.zodiac.currentDetails`:
 *   "The Sun is in {{sign}} on {{month}} {{day}}. It is {{clockTime}} local solar time."
 *
 * All tokens are updated whenever the model state changes so that a screen-
 * reader user always hears the current date and solar time.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ZodiacModel } from "../model/ZodiacModel.js";
import { MONTH_NAMES, SIGN_KEYS } from "../model/ZodiacModel.js";

export class ZodiacScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: ZodiacModel) {
    const a11y = StringManager.getInstance().getZodiacA11yStrings();
    const zodiacStrings = StringManager.getInstance().getZodiacStrings();
    const controlStrings = StringManager.getInstance().getControls();

    // ── Live sign string ──────────────────────────────────────────────────
    // Read zodiac sign name string properties once (not reactive to language change; acceptable)
    const signValueProperties: TReadOnlyProperty<string>[] = SIGN_KEYS.map(
      (key) =>
        (zodiacStrings as Record<string, TReadOnlyProperty<string>>)[`${key}StringProperty`] ??
        ({ value: key } as TReadOnlyProperty<string>),
    );

    const signStringProperty = new DerivedProperty([model.sunSignIndexProperty], (idx) => {
      return signValueProperties[idx]?.value ?? SIGN_KEYS[idx] ?? "";
    });

    // ── Live month name string ────────────────────────────────────────────
    const monthNameProperties: TReadOnlyProperty<string>[] = [
      controlStrings.months.januaryStringProperty,
      controlStrings.months.februaryStringProperty,
      controlStrings.months.marchStringProperty,
      controlStrings.months.aprilStringProperty,
      controlStrings.months.mayStringProperty,
      controlStrings.months.juneStringProperty,
      controlStrings.months.julyStringProperty,
      controlStrings.months.augustStringProperty,
      controlStrings.months.septemberStringProperty,
      controlStrings.months.octoberStringProperty,
      controlStrings.months.novemberStringProperty,
      controlStrings.months.decemberStringProperty,
    ];

    const monthStringProperty = new DerivedProperty([model.monthDayProperty], ({ monthIndex }) => {
      return monthNameProperties[monthIndex]?.value ?? MONTH_NAMES[monthIndex] ?? "";
    });

    const dayNumberProperty = new DerivedProperty([model.monthDayProperty], ({ day }) => day);

    // ── Live PatternStringProperty ────────────────────────────────────────
    const currentDetails = new PatternStringProperty(a11y.currentDetailsStringProperty, {
      sign: signStringProperty,
      month: monthStringProperty,
      day: dayNumberProperty,
      clockTime: model.solarClockStringProperty,
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
