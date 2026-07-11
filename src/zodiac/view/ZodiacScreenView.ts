/**
 * ZodiacScreenView.ts
 *
 * Screen 3 — Zodiac.
 *
 * Layout (1024 × 618 virtual canvas):
 *  - ZodiacSkyNode         — sky view, left-center, clips to width × 0.54·width
 *  - ZodiacConstellationsNode — constellation polylines, on top of sky
 *  - ZodiacSunStrip        — zodiac strip below the sky view
 *  - Time-adjustment buttons (−2h, +2h, −6h, +6h, −1 month, +1 month)
 *  - Day-of-year HSlider   — same wiring as Screen 2
 *  - Month-day readout
 *  - Three label checkboxes
 *  - Latitude note
 *  - TimeControlNode       — bottom-center
 *  - ResetAllButton        — bottom-right
 *
 * pdomPlayAreaNode.pdomOrder  = [] (sky non-interactive)
 * pdomControlAreaNode.pdomOrder = [time buttons ×6, slider, checkboxes ×3, timeControl, resetAll]
 *
 * Source: NAAP/flash-animations/flashdev2/zodiacSimulator/Main.as lines 75–116.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { DerivedProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { HBox, Rectangle, Text, VBox } from "scenerystack/scenery";
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
import { EarthCenteredZodiacNode } from "./EarthCenteredZodiacNode.js";
import { viewHeight, viewOffset } from "./lambertProjection.js";
import { ZodiacConstellationsNode } from "./ZodiacConstellationsNode.js";
import { ZodiacScreenSummaryContent } from "./ZodiacScreenSummaryContent.js";
import { ZodiacSkyNode } from "./ZodiacSkyNode.js";
import { ZodiacSunStrip } from "./ZodiacSunStrip.js";

// Sky view width — fill most of the available left portion
const SKY_WIDTH = 620;
const SKY_HEIGHT = viewHeight(SKY_WIDTH);
const SKY_OFFSET = viewOffset(SKY_WIDTH);
const SKY_LEFT = 10;
const SKY_TOP = 10;

export class ZodiacScreenView extends ScreenView {
  public constructor(model: ZodiacModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new ZodiacScreenSummaryContent(model),
      ...options,
    });

    const strings = StringManager.getInstance().getZodiacScreenStrings();
    const a11y = StringManager.getInstance().getZodiacA11yStrings();
    const zodiacStrings = StringManager.getInstance().getZodiacStrings();
    const controlStrings = StringManager.getInstance().getControls();

    // ── Background ────────────────────────────────────────────────────────
    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: MotionsOfTheSunColors.backgroundColorProperty,
      pickable: false,
    });
    this.addChild(backgroundRect);

    // ── Sky view ──────────────────────────────────────────────────────────
    const skyNode = new ZodiacSkyNode(model, SKY_WIDTH);
    skyNode.x = SKY_LEFT;
    skyNode.y = SKY_TOP;
    skyNode.setLabelStrings(
      strings.eclipticLabelStringProperty.value,
      strings.celestialEquatorLabelStringProperty.value,
    );
    this.addChild(skyNode);

    // ── Constellation overlays ────────────────────────────────────────────
    // Build a map from constellation name to localized label string
    const constellationLabelStrings: Record<string, string> = {};
    for (const key of SIGN_KEYS) {
      const prop = (zodiacStrings as Record<string, { value: string }>)[`${key}StringProperty`];
      if (prop) {
        constellationLabelStrings[key] = prop.value;
      }
    }
    // Also map "capricornus"→capricorn string, "scorpius"→scorpius string
    const capricornProp = (zodiacStrings as Record<string, { value: string }>)["capricornStringProperty"];
    if (capricornProp) {
      constellationLabelStrings["capricornus"] = capricornProp.value;
    }

    const constellationsNode = new ZodiacConstellationsNode(model, SKY_WIDTH, constellationLabelStrings);
    constellationsNode.x = SKY_LEFT;
    constellationsNode.y = SKY_TOP;
    this.addChild(constellationsNode);

    // ── Earth-centered view (Phase 8) ─────────────────────────────────────
    const signLabelProperties: TReadOnlyProperty<string>[] = SIGN_KEYS.map((key) => {
      const propKey = key === "capricorn" ? "capricornStringProperty" : `${key}StringProperty`;
      const prop = (zodiacStrings as Record<string, TReadOnlyProperty<string> | undefined>)[propKey];
      return prop ?? zodiacStrings.ariesStringProperty;
    });
    const earthCenteredNode = new EarthCenteredZodiacNode(model, signLabelProperties);
    earthCenteredNode.x = SKY_LEFT + SKY_WIDTH / 2;
    earthCenteredNode.y = SKY_TOP + SKY_OFFSET;
    this.addChild(earthCenteredNode);

    // Toggle visibility between sky and earth-centered modes
    model.viewModeProperty.link((mode) => {
      const isSky = mode === "sky";
      skyNode.visible = isSky;
      constellationsNode.visible = isSky;
      earthCenteredNode.visible = !isSky;
    });

    // ── Zodiac strip below the sky view ──────────────────────────────────
    // Sign order: Pisces → Aries (rightward), matching lonToX convention
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
    zodiacStrip.x = SKY_LEFT + (SKY_WIDTH - ZODIAC_STRIP_WIDTH) / 2;
    zodiacStrip.top = SKY_TOP + SKY_HEIGHT + 6;
    this.addChild(zodiacStrip);

    // ── Right-column controls ─────────────────────────────────────────────
    const controlsLeft = SKY_LEFT + SKY_WIDTH + 16;
    const controlsWidth = this.layoutBounds.maxX - controlsLeft - SCREEN_VIEW_MARGIN;
    const textFill = MotionsOfTheSunColors.textColorProperty;
    const font = new PhetFont(CONTROL_FONT_SIZE);

    // Helper: make a flat time-adjustment button with accessible name matching the label
    const makeTimeButton = (labelProperty: TReadOnlyProperty<string>, listener: () => void): RectangularPushButton =>
      new RectangularPushButton({
        ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
        content: new Text(labelProperty, { font, fill: textFill, maxWidth: 80 }),
        listener,
        accessibleName: labelProperty,
      });

    // −2h / +2h buttons (Main.as line ~80: delta = 2/24, duration = 0.7 s)
    const minus2hButton = makeTimeButton(strings.minusTwoHoursStringProperty, () =>
      model.timeMaster.incrementSolarTime(-2 / 24, 0.7),
    );
    const plus2hButton = makeTimeButton(strings.plusTwoHoursStringProperty, () =>
      model.timeMaster.incrementSolarTime(2 / 24, 0.7),
    );

    // −6h / +6h buttons (Main.as: delta = 6/24 = 0.25, duration = 1.0 s)
    const minus6hButton = makeTimeButton(strings.minusSixHoursStringProperty, () =>
      model.timeMaster.incrementSolarTime(-0.25, 1.0),
    );
    const plus6hButton = makeTimeButton(strings.plusSixHoursStringProperty, () =>
      model.timeMaster.incrementSolarTime(0.25, 1.0),
    );

    // −1 month / +1 month buttons (Main.as: delta = ±30 days, instant)
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

    // ── Day-of-year slider ───────────────────────────────────────────────
    const dayOfYearRange = new Range(0, SIMPLE_TROPICAL_YEAR);
    const sliderProperty = new Property(model.timeMaster.solarDaysSinceVernalEquinoxProperty.value);

    // Bidirectional sync. Guard both directions so slider → model → slider
    // cannot re-enter sliderProperty mid-notification (axon asserts on that).
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

    // ── Month-day readout ─────────────────────────────────────────────────
    // Month name string properties (localized). We read their values inside the
    // derivation; not reactive to mid-session language switch (acceptable).
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

    // ── Label checkboxes ──────────────────────────────────────────────────
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

    // ── Latitude note text ────────────────────────────────────────────────
    const latitudeNoteText = new Text(strings.latitudeNoteStringProperty, {
      font: new PhetFont({ size: 10, style: "italic" }),
      fill: textFill,
      maxWidth: controlsWidth,
    });

    // ── View-mode radio (Phase 8) ─────────────────────────────────────────
    const radioLabel = (labelProperty: TReadOnlyProperty<string>): Text =>
      new Text(labelProperty, { font, fill: textFill, maxWidth: 120 });

    const viewModeRadioGroup = new RectangularRadioButtonGroup(
      model.viewModeProperty,
      [
        {
          value: "sky" as const,
          createNode: () => radioLabel(strings.skyViewModeStringProperty),
          options: { accessibleName: strings.skyViewModeStringProperty },
        },
        {
          value: "earthCentered" as const,
          createNode: () => radioLabel(strings.earthCenteredViewModeStringProperty),
          options: { accessibleName: strings.earthCenteredViewModeStringProperty },
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

    // ── Right column VBox ─────────────────────────────────────────────────
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
    rightColumn.top = SKY_TOP + 8;
    this.addChild(rightColumn);

    // ── TimeControlNode (bottom-center) ──────────────────────────────────
    // ZodiacModel plays at a fixed rate (no speed multiplier), so TimeControlNode
    // shows only play/pause/step (no speed radio buttons).
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

    // ── Reset All button (bottom-right) ──────────────────────────────────
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

    // ── Accessibility: pdom order ─────────────────────────────────────────
    // Sky is non-interactive, so play area is empty.
    this.pdomPlayAreaNode.pdomOrder = [];
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

  /**
   * Resets view-side state.
   */
  public reset(): void {
    // no view-side state to reset
  }

  /**
   * Steps the view forward for animation.
   */
  public override step(_dt: number): void {
    // Model is stepped by the Joist sim loop via model.step(dt)
  }
}
