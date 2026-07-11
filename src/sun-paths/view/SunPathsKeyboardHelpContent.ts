/**
 * SunPathsKeyboardHelpContent.ts
 *
 * Keyboard-help dialog for the Sun Paths screen (Screen 1).
 * Two columns:
 *  - Left:  sky-camera keys + move-Sun keys + slider controls
 *  - Right: time controls + basic actions
 */

import {
  ArrowKeyNode,
  BasicActionsKeyboardHelpSection,
  KeyboardHelpIconFactory,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  SliderControlsKeyboardHelpSection,
  TextKeyNode,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import MotionsOfTheSunHotkeyData from "../../common/MotionsOfTheSunHotkeyData.js";
import { StringManager } from "../../i18n/StringManager.js";

/**
 * SceneryStack's KeyboardHelpIconFactory.fromHotkeyData has no `ctrl` entry in
 * ENGLISH_KEY_TO_KEY_NODE (only shift/alt), so Ctrl+arrow hotkeys need a hand-built icon.
 */
function ctrlLeftRightArrowIcon() {
  const ctrlKey = () => new TextKeyNode("Ctrl");
  return KeyboardHelpIconFactory.iconOrIcon(
    KeyboardHelpIconFactory.iconPlusIcon(ctrlKey(), new ArrowKeyNode("left")),
    KeyboardHelpIconFactory.iconPlusIcon(ctrlKey(), new ArrowKeyNode("right")),
  );
}

export class SunPathsKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const kb = StringManager.getInstance().getKeyboardHelpStrings();

    const skySection = new KeyboardHelpSection(kb.skyStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(MotionsOfTheSunHotkeyData.ROTATE_SKY, {
        labelStringProperty: kb.rotateSkyStringProperty,
        pdomLabelStringProperty: kb.rotateSkyDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(MotionsOfTheSunHotkeyData.ROTATE_ABOUT_ZENITH, {
        labelStringProperty: kb.rotateAboutZenithStringProperty,
        pdomLabelStringProperty: kb.rotateAboutZenithDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(MotionsOfTheSunHotkeyData.ADVANCE_SIDEREAL_TIME, {
        labelStringProperty: kb.advanceSiderealTimeStringProperty,
        pdomLabelStringProperty: kb.advanceSiderealTimeDescriptionStringProperty,
        icon: ctrlLeftRightArrowIcon(),
      }),
    ]);

    const sunSection = new KeyboardHelpSection(kb.moveSunStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(MotionsOfTheSunHotkeyData.MOVE_SUN, {
        labelStringProperty: kb.moveSunStringProperty,
        pdomLabelStringProperty: kb.moveSunDescriptionStringProperty,
      }),
    ]);

    super(
      [skySection, sunSection, new SliderControlsKeyboardHelpSection()],
      [new TimeControlsKeyboardHelpSection(), new BasicActionsKeyboardHelpSection()],
    );
  }
}
