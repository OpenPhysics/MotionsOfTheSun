/**
 * SiderealSolarTimeScreenView.ts
 *
 * Screen 2 — Sidereal & Solar Time. Laid out to mirror the original Flash
 * simulator (1024 × 618 virtual canvas):
 *
 *  ┌ Solar Time ─┐ ┌ Sidereal Time ┐  │
 *  │  clock + …  │ │   clock + …    │  │      OrbitViewNode
 *  └─────────────┘ └────────────────┘  │   (top-down orbit, right)
 *  ┌ Day of Year ────────────────────┐ │
 *  │  [====== slider ======]          │ │
 *  │  [VE][SS][AE][WS]                │ │
 *  └──────────────────────────────────┘│
 *            [ TimeControlNode ]              [ Reset All ]
 *
 * The two time columns (clock + advance / go-to controls) and the season
 * buttons are built by {@link TimeJumpPanel}; this view arranges them, wires the
 * day-of-year slider, and places the orbit view on the right.
 *
 * A SIMPLE / JULIAN year-length radio toggles TimeMaster.mode; the day-of-year
 * slider is hidden in JULIAN mode (the day-of-year integer is meaningless there).
 *
 * pdomPlayAreaNode.pdomOrder   = [orbitNode, solarClock, siderealClock]
 * pdomControlAreaNode.pdomOrder = [yearMode, slider, ...jumpButtons, timeControl, resetAll]
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { HBox, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { HSlider, RectangularRadioButtonGroup } from "scenerystack/sun";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_RADIO_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/MotionsOfTheSunButtonOptions.js";
import { MOTIONS_OF_THE_SUN_SLIDER_OPTIONS } from "../../common/MotionsOfTheSunControlOptions.js";
import { MotionsOfTheSunPanel } from "../../common/MotionsOfTheSunPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import {
  CONTROL_FONT_SIZE,
  MONTH_START_DOY,
  SCREEN_VIEW_MARGIN,
  SIMPLE_TROPICAL_YEAR,
  VE_DOY_OFFSET,
} from "../../MotionsOfTheSunConstants.js";
import type { SiderealSolarTimeModel } from "../model/SiderealSolarTimeModel.js";
import { OrbitViewNode } from "./OrbitViewNode.js";
import { SiderealSolarTimeScreenSummaryContent } from "./SiderealSolarTimeScreenSummaryContent.js";
import { TimeJumpPanel } from "./TimeJumpPanel.js";

/** Width of the day-of-year slider track (px). */
const DAY_OF_YEAR_SLIDER_WIDTH = 380;

export class SiderealSolarTimeScreenView extends ScreenView {
  public constructor(model: SiderealSolarTimeModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new SiderealSolarTimeScreenSummaryContent(model),
      ...options,
    });

    const strings = StringManager.getInstance().getSiderealSolarTimeStrings();
    const a11y = StringManager.getInstance().getSiderealSolarTimeA11yStrings();
    const monthsShort = StringManager.getInstance().getControls().monthsShort;

    // ── Background ─────────────────────────────────────────────────────────
    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: MotionsOfTheSunColors.backgroundColorProperty,
      pickable: false,
    });
    this.addChild(backgroundRect);

    // ── Left control cluster (two time columns + season buttons) ────────────
    const jumpPanel = new TimeJumpPanel(model);

    const topPanels = new HBox({
      spacing: 10,
      align: "top",
      children: [jumpPanel.solarPanel, jumpPanel.siderealPanel],
      left: SCREEN_VIEW_MARGIN,
      top: SCREEN_VIEW_MARGIN,
    });
    this.addChild(topPanels);

    // ── Day-of-year slider (drives solarTime, preserving time of day) ───────
    const dayOfYearRange = new Range(0, SIMPLE_TROPICAL_YEAR);
    const sliderProperty = new NumberProperty(model.timeMaster.solarDaysSinceVernalEquinoxProperty.value, {
      range: dayOfYearRange,
    });

    // Bidirectional sync. Guard both directions so slider → model → slider
    // cannot re-enter sliderProperty mid-notification (axon asserts on that).
    let syncing = false;
    sliderProperty.lazyLink((newValue) => {
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
      trackSize: { width: DAY_OF_YEAR_SLIDER_WIDTH, height: 4 } as never,
      constrainValue: (v) => Math.round(v),
      majorTickLength: 12,
      accessibleName: a11y.controls.dayOfYearSliderStringProperty,
    });

    // Month-boundary ticks, single-letter labels, in vernal-equinox-relative
    // order (day 0 of the slider = vernal equinox ≈ start of the astronomical
    // year, so the strip reads M A M J J A S O N D J F M like the Flash).
    const monthShortSPs = [
      monthsShort.januaryStringProperty,
      monthsShort.februaryStringProperty,
      monthsShort.marchStringProperty,
      monthsShort.aprilStringProperty,
      monthsShort.mayStringProperty,
      monthsShort.juneStringProperty,
      monthsShort.julyStringProperty,
      monthsShort.augustStringProperty,
      monthsShort.septemberStringProperty,
      monthsShort.octoberStringProperty,
      monthsShort.novemberStringProperty,
      monthsShort.decemberStringProperty,
    ];
    monthShortSPs.forEach((shortSP, m) => {
      const startDoy = MONTH_START_DOY[m] ?? 0;
      const value = (startDoy - VE_DOY_OFFSET + SIMPLE_TROPICAL_YEAR) % SIMPLE_TROPICAL_YEAR;
      const initialLetter = new DerivedProperty([shortSP], (s: string) => s.charAt(0));
      dayOfYearSlider.addMajorTick(
        value,
        new Text(initialLetter, {
          font: new PhetFont(CONTROL_FONT_SIZE - 2),
          fill: MotionsOfTheSunColors.textColorProperty,
        }),
      );
    });

    const dayOfYearPanel = new MotionsOfTheSunPanel(
      new VBox({
        spacing: 10,
        align: "left",
        children: [
          new Text(strings.dayOfYearStringProperty, {
            font: new PhetFont({ size: CONTROL_FONT_SIZE + 1, weight: "bold" }),
            fill: MotionsOfTheSunColors.textColorProperty,
          }),
          dayOfYearSlider,
          jumpPanel.seasonButtons,
        ],
      }),
    );
    dayOfYearPanel.left = SCREEN_VIEW_MARGIN;
    dayOfYearPanel.top = topPanels.bottom + 10;
    this.addChild(dayOfYearPanel);

    // ── Year-length mode radio (Simple 365 d / Julian 365.25 d) ─────────────
    const yearModeRadioLabel = (labelProperty: TReadOnlyProperty<string>): Text =>
      new Text(labelProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: MotionsOfTheSunColors.textColorProperty,
        maxWidth: 150,
      });

    const yearModeRadioGroup = new RectangularRadioButtonGroup(
      model.timeMaster.modeProperty,
      [
        {
          value: "simple" as const,
          createNode: () => yearModeRadioLabel(strings.simpleYearStringProperty),
          options: { accessibleName: strings.simpleYearStringProperty },
        },
        {
          value: "julian" as const,
          createNode: () => yearModeRadioLabel(strings.julianYearStringProperty),
          options: { accessibleName: strings.julianYearStringProperty },
        },
      ],
      {
        orientation: "horizontal",
        spacing: 4,
        radioButtonOptions: {
          ...FLAT_RECTANGULAR_RADIO_BUTTON_OPTIONS,
          baseColor: MotionsOfTheSunColors.controlSurfaceColorProperty,
          xMargin: 8,
          yMargin: 4,
        },
        accessibleName: a11y.controls.yearModeStringProperty,
      },
    );
    const yearModeBox = new VBox({
      spacing: 4,
      align: "left",
      children: [
        new Text(strings.yearModeStringProperty, {
          font: new PhetFont({ size: CONTROL_FONT_SIZE, weight: "bold" }),
          fill: MotionsOfTheSunColors.textColorProperty,
        }),
        yearModeRadioGroup,
      ],
      left: SCREEN_VIEW_MARGIN,
      top: dayOfYearPanel.bottom + 12,
    });
    this.addChild(yearModeBox);

    // Hide the day-of-year slider in JULIAN mode (its integer day is meaningless).
    model.timeMaster.modeProperty.link((mode) => {
      dayOfYearSlider.visible = mode === "simple";
    });

    // ── Orbit view (play area, right) ───────────────────────────────────────
    const orbitNode = new OrbitViewNode(model);
    const orbitAreaLeft = topPanels.right;
    orbitNode.x = (orbitAreaLeft + this.layoutBounds.maxX) / 2;
    orbitNode.y = this.layoutBounds.height * 0.44;
    this.addChild(orbitNode);

    // ── Time control node (bottom-center) ───────────────────────────────────
    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timeSpeedProperty,
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
    timeControl.centerX = orbitNode.x;
    timeControl.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(timeControl);

    // ── Reset All button (bottom-right) ─────────────────────────────────────
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

    // ── PDOM traversal order ─────────────────────────────────────────────────
    this.pdomPlayAreaNode.pdomOrder = [orbitNode, jumpPanel.solarClock, jumpPanel.siderealClock];
    this.pdomControlAreaNode.pdomOrder = [
      yearModeRadioGroup,
      dayOfYearSlider,
      ...jumpPanel.jumpButtons,
      timeControl,
      resetAllButton,
    ];
  }

  public reset(): void {
    // No persistent view-side state
  }

  public override step(_dt: number): void {
    // Reactive properties drive all display; no per-frame imperative updates needed
  }
}
