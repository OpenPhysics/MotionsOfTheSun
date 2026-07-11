/**
 * ZodiacKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 *
 * Two columns:
 *  - Left:  SliderControlsKeyboardHelpSection (day-of-year slider)
 *  - Right: TimeControlsKeyboardHelpSection (play/pause/step) + BasicActionsKeyboardHelpSection
 */

import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class ZodiacKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const sliderSection = new SliderControlsKeyboardHelpSection();
    const timeControlsSection = new TimeControlsKeyboardHelpSection();
    const basicSection = new BasicActionsKeyboardHelpSection();
    super([sliderSection], [timeControlsSection, basicSection]);
  }
}
