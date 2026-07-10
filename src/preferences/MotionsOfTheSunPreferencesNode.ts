/**
 * MotionsOfTheSunPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to MotionsOfTheSunPreferencesModel Properties (whose initial values come from
 * motionsOfTheSunQueryParameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import { StringManager } from "../i18n/StringManager.js";
import MotionsOfTheSunColors from "../MotionsOfTheSunColors.js";
import MotionsOfTheSunNamespace from "../MotionsOfTheSunNamespace.js";
import type { MotionsOfTheSunPreferencesModel } from "./MotionsOfTheSunPreferencesModel.js";

export class MotionsOfTheSunPreferencesNode extends VBox {
  public constructor(preferencesModel: MotionsOfTheSunPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: MotionsOfTheSunColors.textColorProperty,
    });

    const exampleToggleCheckbox = new Checkbox(
      preferencesModel.exampleToggleProperty,
      new Text(prefStrings.exampleToggleStringProperty, {
        font: new PhetFont(14),
        fill: MotionsOfTheSunColors.textColorProperty,
      }),
      {
        checkboxColor: MotionsOfTheSunColors.textColorProperty,
        checkboxColorBackground: MotionsOfTheSunColors.panelBackgroundColorProperty,
        spacing: 8,
        ...(tandem && { tandem: tandem.createTandem("exampleToggleCheckbox") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, exampleToggleCheckbox],
    });
  }
}

MotionsOfTheSunNamespace.register("MotionsOfTheSunPreferencesNode", MotionsOfTheSunPreferencesNode);
