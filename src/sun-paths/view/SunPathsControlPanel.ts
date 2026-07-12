/**
 * SunPathsControlPanel.ts
 *
 * Builds the right-side controls for the Sun Paths screen, grouped into three
 * titled panels that mirror the NAAP "Motions of the Sun" reference layout
 * (the fourth reference group, "Information", is the separate {@link SunReadoutPanel}):
 *
 *  - **Time and Location** — latitude NumberControl + world map, day-of-year
 *    NumberControl (with Month Day subtitle) + calendar strip, time-of-day
 *    NumberControl (0–24 h) + 24-hour clock.
 *  - **Animation Controls** — animation-mode radio (Continuous / Step by Day)
 *    + loop-day checkbox (loop-day is disabled while stepping by day).
 *  - **General Settings** — six display-option checkboxes (declination circle,
 *    ecliptic, month labels, underside, stick figure, analemma).
 *
 * This class is a builder, not a Node: it exposes the three panels so the
 * ScreenView can arrange them across the right rail. (Analemma is grouped with
 * the other display toggles under General Settings rather than under the
 * reference's Information/Advanced sub-panel, keeping all "show …" toggles together.)
 */

import type { BooleanProperty, TReadOnlyProperty } from "scenerystack/axon";
import { DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { type Node, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, RectangularRadioButtonGroup } from "scenerystack/sun";
import { FLAT_RECTANGULAR_RADIO_BUTTON_OPTIONS } from "../../common/MotionsOfTheSunButtonOptions.js";
import {
  MOTIONS_OF_THE_SUN_CHECKBOX_OPTIONS,
  MOTIONS_OF_THE_SUN_NUMBER_CONTROL_OPTIONS,
} from "../../common/MotionsOfTheSunControlOptions.js";
import { MotionsOfTheSunPanel } from "../../common/MotionsOfTheSunPanel.js";
import { WorldMapNode } from "../../common/view/WorldMapNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import {
  CONTROL_FONT_SIZE,
  DEFAULT_DAY_OF_YEAR,
  LATITUDE_RANGE,
  MONTH_START_DOY,
  PANEL_CONTENT_SPACING,
  PANEL_TITLE_FONT_SIZE,
} from "../../MotionsOfTheSunConstants.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";
import { CalendarStripNode } from "./CalendarStripNode.js";
import { SunClockNode } from "./SunClockNode.js";

/** Flash 0-based integer DOY (Jan 1 = 0 … Dec 31 = 364). */
const DAY_RANGE = new Range(0, 364);
const TIME_RANGE = new Range(0, 24);

/** Map 0-based DOY offset to month index 0–11. */
const findMonthIndex = (doy0: number): number => {
  for (let i = 0; i < 12; i++) {
    if ((MONTH_START_DOY[i] ?? 0) <= doy0 && (i === 11 || doy0 < (MONTH_START_DOY[i + 1] ?? 366))) {
      return i;
    }
  }
  return 11;
};

/** Wrap a bold title + content children in a themed panel. */
const titledPanel = (titleProperty: TReadOnlyProperty<string>, children: Node[]): MotionsOfTheSunPanel => {
  const title = new Text(titleProperty, {
    font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
    fill: MotionsOfTheSunColors.textColorProperty,
  });
  return new MotionsOfTheSunPanel(
    new VBox({ align: "left", spacing: PANEL_CONTENT_SPACING, children: [title, ...children] }),
  );
};

export class SunPathsControlPanel {
  public readonly timeAndLocationPanel: MotionsOfTheSunPanel;
  public readonly animationControlsPanel: MotionsOfTheSunPanel;
  public readonly generalSettingsPanel: MotionsOfTheSunPanel;

  public constructor(model: SunPathsModel) {
    const strings = StringManager.getInstance().getSunPathsStrings();
    const controls = StringManager.getInstance().getControls();
    const a11y = StringManager.getInstance().getSunPathsA11yStrings();
    const monthSPs = [
      controls.months.januaryStringProperty,
      controls.months.februaryStringProperty,
      controls.months.marchStringProperty,
      controls.months.aprilStringProperty,
      controls.months.mayStringProperty,
      controls.months.juneStringProperty,
      controls.months.julyStringProperty,
      controls.months.augustStringProperty,
      controls.months.septemberStringProperty,
      controls.months.octoberStringProperty,
      controls.months.novemberStringProperty,
      controls.months.decemberStringProperty,
    ];
    const monthShortSPs = [
      controls.monthsShort.januaryStringProperty,
      controls.monthsShort.februaryStringProperty,
      controls.monthsShort.marchStringProperty,
      controls.monthsShort.aprilStringProperty,
      controls.monthsShort.mayStringProperty,
      controls.monthsShort.juneStringProperty,
      controls.monthsShort.julyStringProperty,
      controls.monthsShort.augustStringProperty,
      controls.monthsShort.septemberStringProperty,
      controls.monthsShort.octoberStringProperty,
      controls.monthsShort.novemberStringProperty,
      controls.monthsShort.decemberStringProperty,
    ];

    // ── Latitude control ────────────────────────────────────────────────────
    const latitudeControl = new NumberControl(controls.latitudeStringProperty, model.latitudeProperty, LATITUDE_RANGE, {
      ...MOTIONS_OF_THE_SUN_NUMBER_CONTROL_OPTIONS,
      delta: 1,
      numberDisplayOptions: {
        decimalPlaces: 1,
        valuePattern: "{{value}}°",
      },
      titleNodeOptions: {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: MotionsOfTheSunColors.textColorProperty,
        maxWidth: 160,
      },
      accessibleName: controls.latitudeStringProperty,
    });

    // ── Day-of-year control (Flash 0-based integer DOY) ─────────────────────
    const dayProperty = new NumberProperty(Math.max(0, Math.floor(DEFAULT_DAY_OF_YEAR)), { range: DAY_RANGE });

    // Bidirectional sync: integer part of dayOfYear ↔ dayProperty
    model.dayOfYearProperty.link((day) => {
      const newInt = Math.max(0, Math.min(364, Math.floor(day)));
      if (dayProperty.value !== newInt) {
        dayProperty.value = newInt;
      }
    });
    dayProperty.lazyLink((day) => {
      const frac = model.dayOfYearProperty.value % 1;
      const newDay = day + frac;
      if (Math.abs(model.dayOfYearProperty.value - newDay) > 1e-9) {
        model.dayOfYearProperty.value = newDay;
      }
    });

    // Month-Day subtitle: reads string property values each time dayOfYear changes.
    const monthDayProperty = new DerivedProperty([model.dayOfYearProperty], (day) => {
      const doy0 = Math.max(0, Math.floor(day));
      const mi = findMonthIndex(doy0);
      const dayNum = doy0 - (MONTH_START_DOY[mi] ?? 0) + 1;
      return `${monthSPs[mi]?.value ?? ""} ${dayNum}`;
    });

    const dayControl = new NumberControl(controls.dayOfYearStringProperty, dayProperty, DAY_RANGE, {
      ...MOTIONS_OF_THE_SUN_NUMBER_CONTROL_OPTIONS,
      delta: 1,
      numberDisplayOptions: {
        decimalPlaces: 0,
        valuePattern: "{{value}}",
      },
      titleNodeOptions: {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: MotionsOfTheSunColors.textColorProperty,
        maxWidth: 160,
      },
      accessibleName: controls.dayOfYearStringProperty,
    });

    const monthDayText = new Text(monthDayProperty, {
      font: new PhetFont(CONTROL_FONT_SIZE - 1),
      fill: MotionsOfTheSunColors.textColorProperty,
    });

    // ── Time-of-day control ─────────────────────────────────────────────────
    const timeProperty = new NumberProperty((DEFAULT_DAY_OF_YEAR % 1) * 24, { range: TIME_RANGE });

    model.dayOfYearProperty.link((day) => {
      const newTime = Math.max(0, Math.min(24, (day % 1) * 24));
      if (Math.abs(timeProperty.value - newTime) > 1e-6) {
        timeProperty.value = newTime;
      }
    });
    timeProperty.lazyLink((time) => {
      const intDay = Math.floor(model.dayOfYearProperty.value);
      const newDay = intDay + time / 24;
      if (Math.abs(model.dayOfYearProperty.value - newDay) > 1e-9) {
        model.dayOfYearProperty.value = newDay;
      }
    });

    const timeControl = new NumberControl(controls.timeOfDayStringProperty, timeProperty, TIME_RANGE, {
      ...MOTIONS_OF_THE_SUN_NUMBER_CONTROL_OPTIONS,
      delta: 0.25,
      numberDisplayOptions: {
        decimalPlaces: 2,
        valuePattern: "{{value}} h",
      },
      titleNodeOptions: {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: MotionsOfTheSunColors.textColorProperty,
        maxWidth: 160,
      },
      accessibleName: controls.timeOfDayStringProperty,
    });

    // ── World map latitude picker (Phase 7.3) ────────────────────────────────
    const worldMap = new WorldMapNode({
      latitudeProperty: model.latitudeProperty,
      accessibleNameProperty: a11y.controls.worldMapStringProperty,
      accessibleHelpTextProperty: a11y.controls.worldMapHelpStringProperty,
    });

    // ── 24-hour time-of-day clock (hour + minute hands, Flash Time Of Day Clock)
    const sunClock = new SunClockNode({
      dayOfYearProperty: model.dayOfYearProperty,
      accessibleNameProperty: a11y.controls.clockStringProperty,
      accessibleHelpTextProperty: a11y.controls.clockHelpStringProperty,
      amStringProperty: strings.clockAmStringProperty,
      pmStringProperty: strings.clockPmStringProperty,
    });

    // ── Calendar strip (Phase 7.2) ───────────────────────────────────────────
    const calendarStrip = new CalendarStripNode({
      dayOfYearProperty: model.dayOfYearProperty,
      monthAbbreviationProperties: monthShortSPs,
      accessibleNameProperty: a11y.controls.calendarStripStringProperty,
      accessibleHelpTextProperty: a11y.controls.calendarStripHelpStringProperty,
    });

    // ── Display checkboxes ───────────────────────────────────────────────────
    const checkbox = (prop: BooleanProperty, label: TReadOnlyProperty<string>): Checkbox =>
      new Checkbox(
        prop,
        new Text(label, {
          font: new PhetFont(CONTROL_FONT_SIZE),
          fill: MotionsOfTheSunColors.textColorProperty,
          maxWidth: 180,
        }),
        { ...MOTIONS_OF_THE_SUN_CHECKBOX_OPTIONS, accessibleName: label },
      );

    // ── Animation-mode radio (Continuous / Step by Day) ──────────────────────
    const radioLabel = (labelProperty: TReadOnlyProperty<string>): Text =>
      new Text(labelProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: MotionsOfTheSunColors.textColorProperty,
        maxWidth: 130,
      });

    // Non-bold sub-label above the radios (the panel title carries the bold heading).
    const animationModeLabel = new Text(strings.animationModeStringProperty, {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: MotionsOfTheSunColors.textColorProperty,
    });

    const animationModeRadioGroup = new RectangularRadioButtonGroup(
      model.animationModeProperty,
      [
        {
          value: "continuous" as const,
          createNode: () => radioLabel(strings.continuousStringProperty),
          options: { accessibleName: strings.continuousStringProperty },
        },
        {
          value: "stepByDay" as const,
          createNode: () => radioLabel(strings.stepByDayStringProperty),
          options: { accessibleName: strings.stepByDayStringProperty },
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
        accessibleName: a11y.controls.animationModeStringProperty,
      },
    );

    // Loop-day only applies to continuous playback (matches the Flash rule that
    // disables the loop-day checkbox while stepping by day).
    const loopDayEnabledProperty = new DerivedProperty([model.animationModeProperty], (mode) => mode === "continuous");
    const loopDayCheckbox = new Checkbox(
      model.loopDayProperty,
      new Text(strings.loopDayStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: MotionsOfTheSunColors.textColorProperty,
        maxWidth: 180,
      }),
      {
        ...MOTIONS_OF_THE_SUN_CHECKBOX_OPTIONS,
        accessibleName: strings.loopDayStringProperty,
        enabledProperty: loopDayEnabledProperty,
      },
    );

    // ── Sun-drag mode radio (time of day / day of year) — Flash Settings Panel
    const sunDragModeLabel = new Text(strings.sunDragModeStringProperty, {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: MotionsOfTheSunColors.textColorProperty,
      maxWidth: 200,
    });
    const sunDragModeRadioGroup = new RectangularRadioButtonGroup(
      model.sunDragModeProperty,
      [
        {
          value: "timeOfDay" as const,
          createNode: () => radioLabel(strings.sunDragTimeOfDayStringProperty),
          options: { accessibleName: strings.sunDragTimeOfDayStringProperty },
        },
        {
          value: "dayOfYear" as const,
          createNode: () => radioLabel(strings.sunDragDayOfYearStringProperty),
          options: { accessibleName: strings.sunDragDayOfYearStringProperty },
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
        accessibleName: a11y.controls.sunDragModeStringProperty,
      },
    );

    // ── Assemble the three titled panels ─────────────────────────────────────
    this.timeAndLocationPanel = titledPanel(strings.timeAndLocationTitleStringProperty, [
      latitudeControl,
      worldMap,
      dayControl,
      monthDayText,
      calendarStrip,
      timeControl,
      sunClock,
    ]);

    this.animationControlsPanel = titledPanel(strings.animationControlsTitleStringProperty, [
      animationModeLabel,
      animationModeRadioGroup,
      loopDayCheckbox,
    ]);

    this.generalSettingsPanel = titledPanel(strings.generalSettingsTitleStringProperty, [
      checkbox(model.showDeclinationCircleProperty, strings.showDeclinationCircleStringProperty),
      checkbox(model.showEclipticProperty, strings.showEclipticStringProperty),
      checkbox(model.showMonthLabelsProperty, strings.showMonthLabelsStringProperty),
      checkbox(model.showUndersideProperty, strings.showUndersideStringProperty),
      checkbox(model.showStickfigureProperty, strings.showStickfigureStringProperty),
      checkbox(model.showAnalemmaProperty, strings.showAnalemmaStringProperty),
      sunDragModeLabel,
      sunDragModeRadioGroup,
    ]);
  }
}
