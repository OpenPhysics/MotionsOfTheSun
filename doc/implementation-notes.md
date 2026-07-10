# Implementation Notes - Motions of the Sun

## Architecture Overview

A three-screen SceneryStack sim porting the NAAP "Motions of the Sun" lab
(astroUNL `naap/motion3`). Currently a framework scaffold: each screen shows a placeholder
label and a Reset All button; the models are empty coordinators.

### High-Level Architecture

```
main.ts
  ├─ SunPathsScreen           (Screen<SunPathsModel, SunPathsScreenView>)                     src/sun-paths/
  ├─ SiderealSolarTimeScreen  (Screen<SiderealSolarTimeModel, SiderealSolarTimeScreenView>)   src/sidereal-solar-time/
  └─ ZodiacScreen             (Screen<ZodiacModel, ZodiacScreenView>)                         src/zodiac/

Each screen folder:
  <Prefix>Screen.ts
  model/<Prefix>Model.ts
  view/<Prefix>ScreenView.ts            visuals, screenSummaryContent + pdomOrder
  view/<Prefix>ScreenSummaryContent.ts  PDOM overview (a11y.<screenKey> strings)
  view/<Prefix>KeyboardHelpContent.ts   keyboard help dialog

src/common/
  ├─ MotionsOfTheSunPanel.ts          pre-themed panel
  ├─ MotionsOfTheSunButtonOptions.ts  flat button/combo-box option bundles
  └─ TimeModel.ts                     composable play/pause + elapsed time

src/preferences/
  ├─ MotionsOfTheSunPreferencesModel  sim-specific pref state
  ├─ MotionsOfTheSunPreferencesNode   pref UI shown in Preferences → Simulation
  └─ motionsOfTheSunQueryParameters   query-parameter declarations
```

Data flows Model → View through AXON `Property` objects. The view observes
properties via `.link()` or `.lazyLink()` and updates reactively.

## Porting map (NAAP → screens)

| Screen | NAAP animation (published) | flashdev2 source (decompile target) |
|---|---|---|
| Sun Paths | `sunmotions.swf` | `sunMotions/sunMotions068-C.swf` (lab shipped 068) |
| Sidereal and Solar Time | `siderealSolarTime.swf` | `siderealSolarTime/siderealSolarTime.swf` |
| Zodiac | `zodiac.swf` | `zodiac/zodiac017.swf` |

`npm run decompile` extracts the ActionScript for all three (see `scripts/decompile-flash.ts`);
`--all` adds supporting demos (`sunPathSimulator`, `sunPathDiagram003`, `sunPathComponent002`,
`siderealTimeAndHourAngleDemo004-B`). The lab's small *Meridional Altitude* calculator
(`meridional_calculator.swf`, no flashdev2 source) is expected to fold into the Sun Paths
screen rather than get its own screen.

Sibling-sim code to reuse:
- `RotatingSky/` — horizon diagram and 2D orthographic `SkyProjection` (Sun Paths screen).
- `SolarSystemModels/` — `ZodiacConstellationNode` / `ZodiacStripBackground` /
  `ZodiacConstellationsData` (Zodiac screen).

## Model Components

Each `*Model.ts` is an empty coordinator with documented hooks for `step(dt)` and
`reset()`. Compose `src/common/TimeModel.ts` into a screen model for play/pause +
elapsed-time behavior (all three screens animate over time).

## View Components

Each `*ScreenView.ts` demonstrates layout using `layoutBounds`, background fill from
`MotionsOfTheSunColors.ts`, and a `ResetAllButton` wired to `model.reset()`.
All control panels should use `MotionsOfTheSunPanel` so projector-mode switching
is automatic.

### Color Scheme

`MotionsOfTheSunColors.ts` defines `ProfileColorProperty` instances for "default" (dark)
and "projector" (light) profiles. SceneryStack switches profiles automatically when the
user toggles Projector Mode in Preferences.

## Known gaps / TODOs

- All three models and views are placeholders — port the NAAP behavior per the map above.
- pdomOrder TODO comments in each `*ScreenView` — add interactive nodes as they are created.
- Home-screen icons: each screen currently uses the SceneryStack default `ScreenIcon`.
- `public/icons/icon.svg` is still the template icon — replace and run `npm run icons`.
- No dispose() calls yet — add them once Properties gain external listeners.
