/**
 * ZodiacScreenView.ts
 *
 * Screen 3 — Zodiac.
 *
 * Default view is the lab geocentric Zodiac Explorer (`zodiac.swf`): Earth at
 * the center of a celestial sphere, Sun on the ecliptic rim, Flash stick-figure
 * constellations, drag-to-rotate camera, day-of-year slider.
 *
 * Optional "Sky View" keeps the Lambert observer sky from zodiacSimulator.
 *
 * Layout (1024 × 618 virtual canvas):
 *  - GeocentricZodiacNode (default) or ZodiacSkyNode + constellations
 *  - ZodiacSunStrip below the view
 *  - Right-column controls (view mode, time jumps, day slider, labels)
 *  - TimeControlNode + ResetAllButton
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { DerivedProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { HBox, type Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Checkbox, HSlider, RectangularPushButton, RectangularRadioButtonGroup } from "scenerystack/sun";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_RADIO_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/MotionsOfTheSunButtonOptions.js";
import {
  MOTIONS_OF_THE_SUN_CHECKBOX_OPTIONS,
  MOTIONS_OF_THE_SUN_SLIDER_OPTIONS,
} from "../../common/MotionsOfTheSunControlOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import {
  CONTROL_FONT_SIZE,
  SCREEN_VIEW_MARGIN,
  SIMPLE_TROPICAL_YEAR,
  ZODIAC_STRIP_WIDTH,
} from "../../MotionsOfTheSunConstants.js";
import type { ZodiacModel } from "../model/ZodiacModel.js";
import { MONTH_NAMES, SIGN_KEYS } from "../model/ZodiacModel.js";
import { GeocentricZodiacNode } from "./GeocentricZodiacNode.js";
import { ZodiacConstellationsNode } from "./ZodiacConstellationsNode.js";
import { ZodiacScreenSummaryContent } from "./ZodiacScreenSummaryContent.js";
import { ZodiacSkyNode } from "./ZodiacSkyNode.js";
import { ZodiacSunStrip } from "./ZodiacSunStrip.js";

const GEO_DIAMETER = 520;
const GEO_LEFT = 24;
const GEO_TOP = 16;

const SKY_WIDTH = 520;
const SKY_LEFT = GEO_LEFT;
const SKY_TOP = GEO_TOP;

export class ZodiacScreenView extends ScreenView {
  private readonly geocentricNode: GeocentricZodiacNode;

  public constructor(model: ZodiacModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new ZodiacScreenSummaryContent(model),
      ...options,
    });

    const strings = StringManager.getInstance().getZodiacScreenStrings();
    const a11y = StringManager.getInstance().getZodiacA11yStrings();
    const zodiacStrings = StringManager.getInstance().getZodiacStrings();
    const controlStrings = StringManager.getInstance().getControls();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: MotionsOfTheSunColors.backgroundColorProperty,
      pickable: false,
    });
    this.addChild(backgroundRect);

    // ── Sign label properties (Flash keys use "capricornus") ──────────────
    const signLabelMap = new Map<string, TReadOnlyProperty<string>>();
    for (const key of SIGN_KEYS) {
      const propKey = key === "capricorn" ? "capricornStringProperty" : `${key}StringProperty`;
      const prop = (zodiacStrings as Record<string, TReadOnlyProperty<string> | undefined>)[propKey];
      if (prop) {
        signLabelMap.set(key, prop);
      }
    }
    const capricornProp = (zodiacStrings as Record<string, TReadOnlyProperty<string> | undefined>)[
      "capricornStringProperty"
    ];
    if (capricornProp) {
      signLabelMap.set("capricornus", capricornProp);
    }

    // ── Geocentric lab view (default) ─────────────────────────────────────
    this.geocentricNode = new GeocentricZodiacNode(model, signLabelMap, { diameter: GEO_DIAMETER });
    this.geocentricNode.x = GEO_LEFT;
    this.geocentricNode.y = GEO_TOP;
    this.addChild(this.geocentricNode);

    // ── Lambert sky view (optional) ───────────────────────────────────────
    const skyNode = new ZodiacSkyNode(model, SKY_WIDTH);
    skyNode.x = SKY_LEFT;
    skyNode.y = SKY_TOP;
    skyNode.setLabelStrings(
      strings.eclipticLabelStringProperty.value,
      strings.celestialEquatorLabelStringProperty.value,
    );
    this.addChild(skyNode);

    const constellationLabelStrings: Record<string, string> = {};
    for (const key of SIGN_KEYS) {
      const prop = (zodiacStrings as Record<string, { value: string }>)[`${key}StringProperty`];
      if (prop) {
        constellationLabelStrings[key] = prop.value;
      }
    }
    if (capricornProp) {
      constellationLabelStrings["capricornus"] = capricornProp.value;
    }

    const constellationsNode = new ZodiacConstellationsNode(model, SKY_WIDTH, constellationLabelStrings);
    constellationsNode.x = SKY_LEFT;
    constellationsNode.y = SKY_TOP;
    this.addChild(constellationsNode);

    model.viewModeProperty.link((mode) => {
      const isGeocentric = mode === "earthCentered";
      this.geocentricNode.visible = isGeocentric;
      skyNode.visible = !isGeocentric;
      constellationsNode.visible = !isGeocentric;
    });

    // ── Zodiac strip ──────────────────────────────────────────────────────
    const signStringProperties = [
      zodiacStrings.piscesStringProperty,
      zodiacStrings.aquariusStringProperty,
      zodiacStrings.capricornStringProperty,
      zodiacStrings.sagittariusStringProperty,
      zodiacStrings.scorpiusStringProperty,
      zodiacStrings.libraStringProperty,
      zodiacStrings.virgoStringProperty,
      zodiacStrings.leoStringProperty,
      zodiacStrings.cancerStringProperty,
      zodiacStrings.geminiStringProperty,
      zodiacStrings.taurusStringProperty,
      zodiacStrings.ariesStringProperty,
    ] as const;

    const zodiacStrip = new ZodiacSunStrip(signStringProperties, model.sunLongitudeRadProperty);
    zodiacStrip.x = GEO_LEFT + (GEO_DIAMETER - ZODIAC_STRIP_WIDTH) / 2;
    zodiacStrip.top = GEO_TOP + GEO_DIAMETER + 8;
    this.addChild(zodiacStrip);

    // ── Right-column controls ─────────────────────────────────────────────
    const controlsLeft = GEO_LEFT + GEO_DIAMETER + 16;
    const controlsWidth = this.layoutBounds.maxX - controlsLeft - SCREEN_VIEW_MARGIN;
    const textFill = MotionsOfTheSunColors.textColorProperty;
    const font = new PhetFont(CONTROL_FONT_SIZE);

    const makeTimeButton = (labelProperty: TReadOnlyProperty<string>, listener: () => void): RectangularPushButton =>
      new RectangularPushButton({
        ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
        content: new Text(labelProperty, { font, fill: textFill, maxWidth: 80 }),
        listener,
        accessibleName: labelProperty,
      });

    const minus2hButton = makeTimeButton(strings.minusTwoHoursStringProperty, () =>
      model.timeMaster.incrementSolarTime(-2 / 24, 0.7),
    );
    const plus2hButton = makeTimeButton(strings.plusTwoHoursStringProperty, () =>
      model.timeMaster.incrementSolarTime(2 / 24, 0.7),
    );
    const minus6hButton = makeTimeButton(strings.minusSixHoursStringProperty, () =>
      model.timeMaster.incrementSolarTime(-0.25, 1.0),
    );
    const plus6hButton = makeTimeButton(strings.plusSixHoursStringProperty, () =>
      model.timeMaster.incrementSolarTime(0.25, 1.0),
    );
    const minus1monthButton = makeTimeButton(strings.minusOneMonthStringProperty, () =>
      model.timeMaster.incrementSolarTime(-30, 0),
    );
    const plus1monthButton = makeTimeButton(strings.plusOneMonthStringProperty, () =>
      model.timeMaster.incrementSolarTime(30, 0),
    );

    const timeButtonsBox = new VBox({
      spacing: 6,
      align: "center",
      children: [
        new HBox({ spacing: 4, children: [minus2hButton, plus2hButton] }),
        new HBox({ spacing: 4, children: [minus6hButton, plus6hButton] }),
        new HBox({ spacing: 4, children: [minus1monthButton, plus1monthButton] }),
      ],
    });

    const dayOfYearRange = new Range(0, SIMPLE_TROPICAL_YEAR);
    const sliderProperty = new Property(model.timeMaster.solarDaysSinceVernalEquinoxProperty.value);

    let syncing = false;
    sliderProperty.lazyLink((newValue: number) => {
      if (syncing) {
        return;
      }
      syncing = true;
      const delta = newValue - model.timeMaster.solarDaysSinceVernalEquinoxProperty.value;
      model.timeMaster.incrementSolarTime(delta, 0);
      syncing = false;
    });
    model.timeMaster.solarDaysSinceVernalEquinoxProperty.link((d) => {
      if (syncing) {
        return;
      }
      const clamped = Math.min(Math.max(d, 0), SIMPLE_TROPICAL_YEAR);
      if (sliderProperty.value === clamped) {
        return;
      }
      syncing = true;
      sliderProperty.value = clamped;
      syncing = false;
    });

    const dayOfYearSlider = new HSlider(sliderProperty, dayOfYearRange, {
      ...MOTIONS_OF_THE_SUN_SLIDER_OPTIONS,
      trackSize: { width: Math.min(controlsWidth - 8, 180), height: 4 } as never,
      constrainValue: (v: number) => Math.round(v),
      accessibleName: a11y.controls.dayOfYearSliderStringProperty,
    });

    const monthNameProperties: TReadOnlyProperty<string>[] = [
      controlStrings.months.januaryStringProperty,
      controlStrings.months.februaryStringProperty,
      controlStrings.months.marchStringProperty,
      controlStrings.months.aprilStringProperty,
      controlStrings.months.mayStringProperty,
      controlStrings.months.juneStringProperty,
      controlStrings.months.julyStringProperty,
      controlStrings.months.augustStringProperty,
      controlStrings.months.septemberStringProperty,
      controlStrings.months.octoberStringProperty,
      controlStrings.months.novemberStringProperty,
      controlStrings.months.decemberStringProperty,
    ];

    const monthDayStringProperty = new DerivedProperty([model.monthDayProperty], ({ monthIndex, day }) => {
      const monthName = monthNameProperties[monthIndex]?.value ?? MONTH_NAMES[monthIndex] ?? "";
      return `${monthName} ${day}`;
    });

    const monthDayText = new Text(monthDayStringProperty, {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: textFill,
      maxWidth: controlsWidth,
    });

    const makeCheckbox = (
      booleanProperty: (typeof model)["constellationLabelsVisibleProperty"],
      labelProperty: TReadOnlyProperty<string>,
    ): Checkbox =>
      new Checkbox(booleanProperty, new Text(labelProperty, { font, fill: textFill, maxWidth: controlsWidth - 28 }), {
        ...MOTIONS_OF_THE_SUN_CHECKBOX_OPTIONS,
        accessibleName: labelProperty,
      });

    const constellationCheckbox = makeCheckbox(
      model.constellationLabelsVisibleProperty,
      strings.showConstellationLabelsStringProperty,
    );
    const eclipticCheckbox = makeCheckbox(model.eclipticLabelVisibleProperty, strings.showEclipticLabelStringProperty);
    const equatorCheckbox = makeCheckbox(
      model.celestialEquatorLabelVisibleProperty,
      strings.showCelestialEquatorLabelStringProperty,
    );

    const latitudeNoteText = new Text(strings.latitudeNoteStringProperty, {
      font: new PhetFont({ size: 10, style: "italic" }),
      fill: textFill,
      maxWidth: controlsWidth,
    });

    const radioLabel = (labelProperty: TReadOnlyProperty<string>): Text =>
      new Text(labelProperty, { font, fill: textFill, maxWidth: 120 });

    const viewModeRadioGroup = new RectangularRadioButtonGroup(
      model.viewModeProperty,
      [
        {
          value: "earthCentered" as const,
          createNode: () => radioLabel(strings.earthCenteredViewModeStringProperty),
          options: { accessibleName: strings.earthCenteredViewModeStringProperty },
        },
        {
          value: "sky" as const,
          createNode: () => radioLabel(strings.skyViewModeStringProperty),
          options: { accessibleName: strings.skyViewModeStringProperty },
        },
      ],
      {
        orientation: "vertical",
        spacing: 4,
        radioButtonOptions: {
          ...FLAT_RECTANGULAR_RADIO_BUTTON_OPTIONS,
          baseColor: MotionsOfTheSunColors.controlSurfaceColorProperty,
          xMargin: 8,
          yMargin: 4,
        },
        accessibleName: a11y.controls.viewModeStringProperty,
      },
    );

    const rightColumn = new VBox({
      spacing: 10,
      align: "left",
      children: [
        new Text(strings.viewModeStringProperty, {
          font: new PhetFont({ size: CONTROL_FONT_SIZE, weight: "bold" }),
          fill: textFill,
        }),
        viewModeRadioGroup,
        timeButtonsBox,
        new VBox({
          spacing: 4,
          align: "left",
          children: [
            new Text(controlStrings.dayOfYearStringProperty, { font, fill: textFill }),
            dayOfYearSlider,
            monthDayText,
          ],
        }),
        constellationCheckbox,
        eclipticCheckbox,
        equatorCheckbox,
        latitudeNoteText,
      ],
    });
    rightColumn.left = controlsLeft;
    rightColumn.top = GEO_TOP + 8;
    this.addChild(rightColumn);

    // Hide Lambert-only chrome in geocentric mode.
    model.viewModeProperty.link((mode) => {
      const isSky = mode === "sky";
      latitudeNoteText.visible = isSky;
      eclipticCheckbox.visible = isSky;
      // Equator toggle still useful on the geocentric sphere.
    });

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => model.stepForward(),
        },
      },
      tagName: "div",
      accessibleName: a11y.controls.timeControlStringProperty,
    });
    timeControl.centerX = this.layoutBounds.centerX;
    timeControl.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(timeControl);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    this.pdomPlayAreaNode.pdomOrder = [hitTargetForPdom(this.geocentricNode)];
    this.pdomControlAreaNode.pdomOrder = [
      viewModeRadioGroup,
      minus2hButton,
      plus2hButton,
      minus6hButton,
      plus6hButton,
      minus1monthButton,
      plus1monthButton,
      dayOfYearSlider,
      constellationCheckbox,
      eclipticCheckbox,
      equatorCheckbox,
      timeControl,
      resetAllButton,
    ];
  }

  public reset(): void {
    this.geocentricNode.reset();
  }

  public override step(_dt: number): void {
    // Model is stepped by the Joist sim loop via model.step(dt)
  }
}

/** First focusable child of the geocentric node (camera hit target). */
function hitTargetForPdom(node: GeocentricZodiacNode): Node {
  return node.children[0] ?? node;
}
