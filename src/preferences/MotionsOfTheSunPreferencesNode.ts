/**
 * MotionsOfTheSunPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Lets the user choose
 * the default observer latitude that the Sun Paths screen starts from (and
 * returns to on Reset All). The control is bound to MotionsOfTheSunPreferencesModel,
 * whose initial value comes from the `latitude` query parameter.
 */

import { Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont } from "scenerystack/scenery-phet";
import type { Tandem } from "scenerystack/tandem";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../common/MotionsOfTheSunButtonOptions.js";
import { StringManager } from "../i18n/StringManager.js";
import MotionsOfTheSunColors from "../MotionsOfTheSunColors.js";
import { LATITUDE_RANGE } from "../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../MotionsOfTheSunNamespace.js";
import type { MotionsOfTheSunPreferencesModel } from "./MotionsOfTheSunPreferencesModel.js";

/** Preferences dialog sits on a light background; use the control-surface text color. */
const PREF_TEXT_FILL = MotionsOfTheSunColors.controlSurfaceTextColorProperty;

export class MotionsOfTheSunPreferencesNode extends VBox {
  public constructor(preferencesModel: MotionsOfTheSunPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: PREF_TEXT_FILL,
    });

    const latitudeControl = new NumberControl(
      prefStrings.defaultLatitudeStringProperty,
      preferencesModel.defaultLatitudeProperty,
      LATITUDE_RANGE,
      {
        delta: 1,
        numberDisplayOptions: {
          decimalPlaces: 0,
          valuePattern: "{{value}}°",
        },
        titleNodeOptions: {
          font: new PhetFont(14),
          fill: PREF_TEXT_FILL,
          maxWidth: 220,
        },
        arrowButtonOptions: { ...FLAT_RECTANGULAR_BUTTON_OPTIONS, scale: 0.75 },
        layoutFunction: NumberControl.createLayoutFunction4({ sliderPadding: 5 }),
        ...(tandem && { tandem: tandem.createTandem("defaultLatitudeControl") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, latitudeControl],
    });
  }
}

MotionsOfTheSunNamespace.register("MotionsOfTheSunPreferencesNode", MotionsOfTheSunPreferencesNode);
