/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. It triggers the full bootstrap chain:
 *
 *   brand.ts → splash.ts → assert.ts → init.ts
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first — triggers: init.ts → assert.ts → splash.ts → brand.ts
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { StringManager } from "./i18n/StringManager.js";
import MotionsOfTheSunColors from "./MotionsOfTheSunColors.js";
import { MotionsOfTheSunPreferencesModel } from "./preferences/MotionsOfTheSunPreferencesModel.js";
import { MotionsOfTheSunPreferencesNode } from "./preferences/MotionsOfTheSunPreferencesNode.js";
import { SiderealSolarTimeScreen } from "./sidereal-solar-time/SiderealSolarTimeScreen.js";
import { SunPathsScreen } from "./sun-paths/SunPathsScreen.js";
import { ZodiacScreen } from "./zodiac/ZodiacScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();
  const screenNames = stringManager.getScreenNames();

  // Simulation-specific preferences; initial values come from motionsOfTheSunQueryParameters.
  const simPreferences = new MotionsOfTheSunPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  // Screen name Properties update automatically when the locale changes.
  const screens = [
    new SunPathsScreen({
      name: screenNames.sunPathsStringProperty,
      tandem: Tandem.ROOT.createTandem("sunPathsScreen"),
      backgroundColorProperty: MotionsOfTheSunColors.backgroundColorProperty,
    }),
    new SiderealSolarTimeScreen({
      name: screenNames.siderealSolarTimeStringProperty,
      tandem: Tandem.ROOT.createTandem("siderealSolarTimeScreen"),
      backgroundColorProperty: MotionsOfTheSunColors.backgroundColorProperty,
    }),
    new ZodiacScreen({
      name: screenNames.zodiacStringProperty,
      tandem: Tandem.ROOT.createTandem("zodiacScreen"),
      backgroundColorProperty: MotionsOfTheSunColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new MotionsOfTheSunPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    credits: {
      leadDesign: "NAAP / OpenPhysics",
      softwareDevelopment: "OpenPhysics",
      team: "OpenPhysics",
      qualityAssurance: "OpenPhysics",
    },
  });

  sim.start();
});
