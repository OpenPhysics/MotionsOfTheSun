/**
 * SunPathsScreen.ts
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
import MotionsOfTheSunColors from "../MotionsOfTheSunColors.js";
import { SunPathsModel } from "./model/SunPathsModel.js";
import { SunPathsKeyboardHelpContent } from "./view/SunPathsKeyboardHelpContent.js";
import { SunPathsScreenView } from "./view/SunPathsScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type SunPathsScreenOptions = ScreenOptions & { tandem: Tandem };

export class SunPathsScreen extends Screen<SunPathsModel, SunPathsScreenView> {
  public constructor(options: SunPathsScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new SunPathsModel(),
      // View factory — receives the model instance
      (model) =>
        new SunPathsScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<SunPathsScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: MotionsOfTheSunColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new SunPathsKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
