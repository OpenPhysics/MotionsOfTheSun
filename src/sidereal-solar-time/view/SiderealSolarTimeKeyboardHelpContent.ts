/**
 * SiderealSolarTimeKeyboardHelpContent.ts
 *
 * Keyboard-help dialog for Screen 2 (Sidereal & Solar Time).
 * Two columns:
 *  - Left:  orbit-Earth keys + slider controls
 *  - Right: analog-clock hands + time controls + basic actions
 */

import {
  BasicActionsKeyboardHelpSection,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  SliderControlsKeyboardHelpSection,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import MotionsOfTheSunHotkeyData from "../../common/MotionsOfTheSunHotkeyData.js";
import { StringManager } from "../../i18n/StringManager.js";

export class SiderealSolarTimeKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const kb = StringManager.getInstance().getKeyboardHelpStrings();

    const orbitSection = new KeyboardHelpSection(kb.orbitEarthStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(MotionsOfTheSunHotkeyData.ORBIT_EARTH, {
        labelStringProperty: kb.orbitEarthStringProperty,
        pdomLabelStringProperty: kb.orbitEarthDescriptionStringProperty,
      }),
    ]);

    const clockSection = new KeyboardHelpSection(kb.analogClockHandsStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(MotionsOfTheSunHotkeyData.ANALOG_CLOCK_HANDS, {
        labelStringProperty: kb.analogClockHandsStringProperty,
        pdomLabelStringProperty: kb.analogClockHandsDescriptionStringProperty,
      }),
    ]);

    super(
      [orbitSection, new SliderControlsKeyboardHelpSection()],
      [clockSection, new TimeControlsKeyboardHelpSection(), new BasicActionsKeyboardHelpSection()],
    );
  }
}
