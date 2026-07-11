/**
 * SiderealSolarTimeScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * For multi-screen simulations, duplicate this file (e.g. IntroScreen.ts,
 * LabScreen.ts) and add each screen to the screens array in src/main.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createSiderealSolarTimeIcon } from "../common/MotionsOfTheSunScreenIcons.js";
import MotionsOfTheSunColors from "../MotionsOfTheSunColors.js";
import { SiderealSolarTimeModel } from "./model/SiderealSolarTimeModel.js";
import { SiderealSolarTimeKeyboardHelpContent } from "./view/SiderealSolarTimeKeyboardHelpContent.js";
import { SiderealSolarTimeScreenView } from "./view/SiderealSolarTimeScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type SiderealSolarTimeScreenOptions = ScreenOptions & { tandem: Tandem };

export class SiderealSolarTimeScreen extends Screen<SiderealSolarTimeModel, SiderealSolarTimeScreenView> {
  public constructor(options: SiderealSolarTimeScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new SiderealSolarTimeModel(),
      // View factory — receives the model instance
      (model) =>
        new SiderealSolarTimeScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<SiderealSolarTimeScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: MotionsOfTheSunColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new SiderealSolarTimeKeyboardHelpContent(),
          homeScreenIcon: createSiderealSolarTimeIcon(),
          navigationBarIcon: createSiderealSolarTimeIcon(),
        },
        options,
      ),
    );
  }
}
