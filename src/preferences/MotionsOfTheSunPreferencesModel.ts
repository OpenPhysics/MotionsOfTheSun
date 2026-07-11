/**
 * MotionsOfTheSunPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. The default observer latitude takes its initial value from the
 * `latitude` query parameter; the Sun Paths screen seeds (and, on Reset All,
 * restores) its latitude from this Property.
 */

import { NumberProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import { LATITUDE_RANGE } from "../MotionsOfTheSunConstants.js";
import MotionsOfTheSunNamespace from "../MotionsOfTheSunNamespace.js";
import motionsOfTheSunQueryParameters from "./motionsOfTheSunQueryParameters.js";

export class MotionsOfTheSunPreferencesModel {
  /** Default observer latitude (deg); initial value from the `latitude` query parameter. */
  public readonly defaultLatitudeProperty: NumberProperty;

  public constructor(tandem?: Tandem) {
    this.defaultLatitudeProperty = new NumberProperty(motionsOfTheSunQueryParameters.latitude, {
      range: LATITUDE_RANGE,
      ...(tandem && { tandem: tandem.createTandem("defaultLatitudeProperty") }),
    });
  }

  public reset(): void {
    this.defaultLatitudeProperty.reset();
  }
}

MotionsOfTheSunNamespace.register("MotionsOfTheSunPreferencesModel", MotionsOfTheSunPreferencesModel);
