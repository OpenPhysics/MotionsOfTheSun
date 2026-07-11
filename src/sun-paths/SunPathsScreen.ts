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
import type { TReadOnlyProperty } from "scenerystack/axon";
import { optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createSunPathsIcon } from "../common/MotionsOfTheSunScreenIcons.js";
import MotionsOfTheSunColors from "../MotionsOfTheSunColors.js";
import { SunPathsModel } from "./model/SunPathsModel.js";
import { SunPathsKeyboardHelpContent } from "./view/SunPathsKeyboardHelpContent.js";
import { SunPathsScreenView } from "./view/SunPathsScreenView.js";

type SunPathsScreenSelfOptions = {
  /** Seeds the initial (and reset) observer latitude from Preferences. */
  defaultLatitudeProperty?: TReadOnlyProperty<number> | undefined;
};

// Require tandem to be explicit — accidental omission would break PhET-iO.
type SunPathsScreenOptions = SunPathsScreenSelfOptions & ScreenOptions & { tandem: Tandem };

export class SunPathsScreen extends Screen<SunPathsModel, SunPathsScreenView> {
  public constructor(options: SunPathsScreenOptions) {
    const defaultLatitudeProperty = options.defaultLatitudeProperty;
    super(
      // Model factory — called once when the screen is first shown
      () => new SunPathsModel({ defaultLatitudeProperty }),
      // View factory — receives the model instance
      (model) =>
        new SunPathsScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<SunPathsScreenOptions, SunPathsScreenSelfOptions, ScreenOptions>()(
        {
          defaultLatitudeProperty: undefined,
          backgroundColorProperty: MotionsOfTheSunColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new SunPathsKeyboardHelpContent(),
          homeScreenIcon: createSunPathsIcon(),
          navigationBarIcon: createSunPathsIcon(),
        },
        options,
      ),
    );
  }
}
