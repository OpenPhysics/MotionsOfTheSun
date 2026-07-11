/**
 * ZodiacScreen.ts
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
import { createZodiacIcon } from "../common/MotionsOfTheSunScreenIcons.js";
import MotionsOfTheSunColors from "../MotionsOfTheSunColors.js";
import { ZodiacModel } from "./model/ZodiacModel.js";
import { ZodiacKeyboardHelpContent } from "./view/ZodiacKeyboardHelpContent.js";
import { ZodiacScreenView } from "./view/ZodiacScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type ZodiacScreenOptions = ScreenOptions & { tandem: Tandem };

export class ZodiacScreen extends Screen<ZodiacModel, ZodiacScreenView> {
  public constructor(options: ZodiacScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new ZodiacModel(),
      // View factory — receives the model instance
      (model) =>
        new ZodiacScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ZodiacScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: MotionsOfTheSunColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ZodiacKeyboardHelpContent(),
          homeScreenIcon: createZodiacIcon(),
          navigationBarIcon: createZodiacIcon(),
        },
        options,
      ),
    );
  }
}
