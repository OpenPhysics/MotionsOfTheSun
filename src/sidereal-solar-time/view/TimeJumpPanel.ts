/**
 * TimeJumpPanel.ts
 *
 * Builds the left-hand control cluster for the Sidereal & Solar Time screen,
 * laid out to mirror the original Flash simulator:
 *
 *   ┌ Solar Time ──────┐  ┌ Sidereal Time ───┐
 *   │ description       │  │ description       │
 *   │   (analog clock)  │  │   (analog clock)  │
 *   │ solar days ♈: X   │  │ sidereal days ♈: X│
 *   │ advance by … :    │  │ advance by … :    │
 *   │ [−10][−1][+1][+10]│  │ [−10][−1][+1][+10]│
 *   │ go to:            │  │ go to:            │
 *   │ [midnight][sunrise]  │ [0h][6h]          │
 *   │ [noon][sunset]    │  │ [12h][18h]        │
 *   └───────────────────┘  └───────────────────┘
 *
 * The two panels are exposed via {@link solarPanel} / {@link siderealPanel}, and
 * the four season-jump buttons via {@link seasonButtons} (the ScreenView places
 * those inside the "Day of Year" panel, matching the Flash). Each analog clock
 * is created here so the panel owns its full column; the clocks are re-exposed
 * for pdom ordering.
 *
 * Highlighting: when a time-of-day / season button's `isAt*` property is true the
 * button base color switches to `activeButtonHighlight` (per step 2.4).
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { GridBox, HBox, RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { RectangularPushButton } from "scenerystack/sun";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/MotionsOfTheSunButtonOptions.js";
import { MotionsOfTheSunPanel } from "../../common/MotionsOfTheSunPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { CONTROL_FONT_SIZE, JUMP_ANIMATION_LONG_S, JUMP_ANIMATION_SHORT_S } from "../../MotionsOfTheSunConstants.js";
import type { SiderealSolarTimeModel } from "../model/SiderealSolarTimeModel.js";
import { AnalogClockNode } from "./AnalogClockNode.js";

/** Font for section headings (panel titles). */
const TITLE_FONT = new PhetFont({ size: CONTROL_FONT_SIZE + 2, weight: "bold" });
/** Font for the italic descriptions under each title. */
const DESCRIPTION_FONT = new PhetFont({ size: CONTROL_FONT_SIZE - 1, style: "italic" });
/** Font for small captions ("advance by …", "go to:"). */
const CAPTION_FONT = new PhetFont(CONTROL_FONT_SIZE - 1);
/** Font for the days-since-VE readout. */
const READOUT_FONT = new PhetFont({ size: CONTROL_FONT_SIZE, weight: "bold" });
/** Font for button labels. */
const BUTTON_FONT = new PhetFont(CONTROL_FONT_SIZE);

/** Target content width for each of the two time panels (px). */
const PANEL_CONTENT_WIDTH = 200;
/** Minimum width for the go-to buttons so the 2×2 grid aligns. */
const GO_TO_BUTTON_MIN_WIDTH = 82;
/** Minimum width for the compact advance buttons so the row aligns. */
const ADVANCE_BUTTON_MIN_WIDTH = 38;

/** Create a compact push button whose visible label is locale-independent (e.g. "+1"). */
function makeCompactButton(
  label: string,
  action: () => void,
  accessibleNameProperty: TReadOnlyProperty<string>,
): RectangularPushButton {
  return new RectangularPushButton({
    ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    baseColor: MotionsOfTheSunColors.controlSurfaceColorProperty,
    minWidth: ADVANCE_BUTTON_MIN_WIDTH,
    content: new Text(label, {
      font: BUTTON_FONT,
      fill: MotionsOfTheSunColors.controlSurfaceTextColorProperty,
    }),
    listener: action,
    accessibleName: accessibleNameProperty,
  });
}

/**
 * Create a time-of-day or season jump button with active-state highlighting.
 * When `isAtProperty` is true, the base color switches to `activeButtonHighlight`.
 */
function makeHighlightButton(
  labelProperty: TReadOnlyProperty<string>,
  isAtProperty: TReadOnlyProperty<boolean>,
  action: () => void,
  accessibleNameProperty: TReadOnlyProperty<string>,
  minWidth = 0,
): RectangularPushButton {
  const baseColorProperty = new DerivedProperty(
    [
      isAtProperty,
      MotionsOfTheSunColors.activeButtonHighlightColorProperty,
      MotionsOfTheSunColors.controlSurfaceColorProperty,
    ],
    (isAt, highlight, surface) => (isAt ? highlight : surface),
  );

  return new RectangularPushButton({
    ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    baseColor: baseColorProperty,
    minWidth,
    content: new Text(labelProperty, {
      font: BUTTON_FONT,
      fill: MotionsOfTheSunColors.controlSurfaceTextColorProperty,
      maxWidth: GO_TO_BUTTON_MIN_WIDTH - 12,
    }),
    listener: action,
    accessibleName: accessibleNameProperty,
  });
}

/** Layout four buttons into a 2×2 grid. */
function grid2x2(buttons: RectangularPushButton[]): GridBox {
  return new GridBox({
    xSpacing: 4,
    ySpacing: 4,
    autoColumns: 2,
    children: buttons,
  });
}

export class TimeJumpPanel {
  /** The "Solar Time" column (title, description, clock, advance + go-to controls). */
  public readonly solarPanel: MotionsOfTheSunPanel;
  /** The "Sidereal Time" column. */
  public readonly siderealPanel: MotionsOfTheSunPanel;
  /** The four season-jump buttons in a row, placed by the ScreenView. */
  public readonly seasonButtons: HBox;

  /** Analog clocks (exposed for play-area pdom ordering). */
  public readonly solarClock: AnalogClockNode;
  public readonly siderealClock: AnalogClockNode;

  /** All interactive push buttons, in traversal order, for pdomOrder wiring. */
  public readonly jumpButtons: RectangularPushButton[];

  public constructor(model: SiderealSolarTimeModel) {
    const strings = StringManager.getInstance().getSiderealSolarTimeStrings();
    const a11y = StringManager.getInstance().getSiderealSolarTimeA11yStrings();
    const textFill = MotionsOfTheSunColors.textColorProperty;
    const tm = model.timeMaster;

    // ── Analog clocks ────────────────────────────────────────────────────────
    this.solarClock = new AnalogClockNode({
      timeProperty: tm.solarTimeProperty,
      onHandsDragged: (dayDelta) => tm.incrementSolarTime(dayDelta, 0),
      showAmPmLabels: true,
      accessibleNameProperty: a11y.controls.solarAnalogClockStringProperty,
      accessibleHelpTextProperty: a11y.controls.solarAnalogClockHelpStringProperty,
      amStringProperty: strings.amStringProperty,
      pmStringProperty: strings.pmStringProperty,
    });
    this.siderealClock = new AnalogClockNode({
      timeProperty: tm.siderealTimeProperty,
      onHandsDragged: (dayDelta) => tm.incrementSiderealTime(dayDelta, 0),
      showAmPmLabels: false,
      accessibleNameProperty: a11y.controls.siderealAnalogClockStringProperty,
      accessibleHelpTextProperty: a11y.controls.siderealAnalogClockHelpStringProperty,
    });

    // ── Solar-day increment buttons ──────────────────────────────────────────
    const solarMinus10 = makeCompactButton(
      "−10",
      () => tm.incrementSolarTime(-10, JUMP_ANIMATION_LONG_S),
      strings.minusTenSolarDaysStringProperty,
    );
    const solarMinus1 = makeCompactButton(
      "−1",
      () => tm.incrementSolarTime(-1, JUMP_ANIMATION_SHORT_S),
      strings.minusOneSolarDayStringProperty,
    );
    const solarPlus1 = makeCompactButton(
      "+1",
      () => tm.incrementSolarTime(1, JUMP_ANIMATION_SHORT_S),
      strings.plusOneSolarDayStringProperty,
    );
    const solarPlus10 = makeCompactButton(
      "+10",
      () => tm.incrementSolarTime(10, JUMP_ANIMATION_LONG_S),
      strings.plusTenSolarDaysStringProperty,
    );

    // ── Sidereal-day increment buttons ───────────────────────────────────────
    const siderealMinus10 = makeCompactButton(
      "−10",
      () => tm.incrementSiderealTime(-10, JUMP_ANIMATION_LONG_S),
      strings.minusTenSiderealDaysStringProperty,
    );
    const siderealMinus1 = makeCompactButton(
      "−1",
      () => tm.incrementSiderealTime(-1, JUMP_ANIMATION_SHORT_S),
      strings.minusOneSiderealDayStringProperty,
    );
    const siderealPlus1 = makeCompactButton(
      "+1",
      () => tm.incrementSiderealTime(1, JUMP_ANIMATION_SHORT_S),
      strings.plusOneSiderealDayStringProperty,
    );
    const siderealPlus10 = makeCompactButton(
      "+10",
      () => tm.incrementSiderealTime(10, JUMP_ANIMATION_LONG_S),
      strings.plusTenSiderealDaysStringProperty,
    );

    // ── Solar time-of-day jump buttons ───────────────────────────────────────
    const midnightBtn = makeHighlightButton(
      strings.midnightStringProperty,
      tm.isAtMidnightProperty,
      () => tm.goToSolarTimeOfDay(0, JUMP_ANIMATION_SHORT_S),
      strings.midnightStringProperty,
      GO_TO_BUTTON_MIN_WIDTH,
    );
    const sunriseBtn = makeHighlightButton(
      strings.sunriseStringProperty,
      tm.isAtSunriseProperty,
      () => tm.goToSolarTimeOfDay(0.25, JUMP_ANIMATION_SHORT_S),
      strings.sunriseStringProperty,
      GO_TO_BUTTON_MIN_WIDTH,
    );
    const noonBtn = makeHighlightButton(
      strings.noonStringProperty,
      tm.isAtNoonProperty,
      () => tm.goToSolarTimeOfDay(0.5, JUMP_ANIMATION_SHORT_S),
      strings.noonStringProperty,
      GO_TO_BUTTON_MIN_WIDTH,
    );
    const sunsetBtn = makeHighlightButton(
      strings.sunsetStringProperty,
      tm.isAtSunsetProperty,
      () => tm.goToSolarTimeOfDay(0.75, JUMP_ANIMATION_SHORT_S),
      strings.sunsetStringProperty,
      GO_TO_BUTTON_MIN_WIDTH,
    );

    // ── Sidereal time-of-day jump buttons ────────────────────────────────────
    const sid0hBtn = makeHighlightButton(
      strings.sidereal0hStringProperty,
      tm.isAtSidereal0hProperty,
      () => tm.goToSiderealTimeOfDay(0, JUMP_ANIMATION_SHORT_S),
      strings.sidereal0hStringProperty,
      GO_TO_BUTTON_MIN_WIDTH,
    );
    const sid6hBtn = makeHighlightButton(
      strings.sidereal6hStringProperty,
      tm.isAtSidereal6hProperty,
      () => tm.goToSiderealTimeOfDay(0.25, JUMP_ANIMATION_SHORT_S),
      strings.sidereal6hStringProperty,
      GO_TO_BUTTON_MIN_WIDTH,
    );
    const sid12hBtn = makeHighlightButton(
      strings.sidereal12hStringProperty,
      tm.isAtSidereal12hProperty,
      () => tm.goToSiderealTimeOfDay(0.5, JUMP_ANIMATION_SHORT_S),
      strings.sidereal12hStringProperty,
      GO_TO_BUTTON_MIN_WIDTH,
    );
    const sid18hBtn = makeHighlightButton(
      strings.sidereal18hStringProperty,
      tm.isAtSidereal18hProperty,
      () => tm.goToSiderealTimeOfDay(0.75, JUMP_ANIMATION_SHORT_S),
      strings.sidereal18hStringProperty,
      GO_TO_BUTTON_MIN_WIDTH,
    );

    // ── Days-since-VE readouts ───────────────────────────────────────────────
    const solarDaysReadout = new Text(
      new DerivedProperty(
        [strings.solarDaysSinceStringProperty, tm.solarDaysSinceVernalEquinoxProperty],
        (label, d) => `${label} ${d.toFixed(3)}`,
      ),
      { font: READOUT_FONT, fill: textFill, maxWidth: PANEL_CONTENT_WIDTH },
    );
    const siderealDaysReadout = new Text(
      new DerivedProperty(
        [strings.siderealDaysSinceStringProperty, tm.siderealDaysSinceVernalEquinoxProperty],
        (label, d) => `${label} ${d.toFixed(3)}`,
      ),
      { font: READOUT_FONT, fill: textFill, maxWidth: PANEL_CONTENT_WIDTH },
    );

    // ── Assemble the two time panels ─────────────────────────────────────────
    const caption = (labelProperty: TReadOnlyProperty<string>) =>
      new Text(labelProperty, { font: CAPTION_FONT, fill: textFill, maxWidth: PANEL_CONTENT_WIDTH });
    const description = (labelProperty: TReadOnlyProperty<string>) =>
      new RichText(labelProperty, { font: DESCRIPTION_FONT, fill: textFill, lineWrap: PANEL_CONTENT_WIDTH });

    this.solarPanel = new MotionsOfTheSunPanel(
      new VBox({
        spacing: 6,
        align: "left",
        children: [
          new Text(strings.solarTimeLabelStringProperty, { font: TITLE_FONT, fill: textFill }),
          description(strings.solarTimeDescriptionStringProperty),
          new HBox({ children: [this.solarClock] }),
          solarDaysReadout,
          caption(strings.advanceBySolarDayStringProperty),
          new HBox({ spacing: 4, children: [solarMinus10, solarMinus1, solarPlus1, solarPlus10] }),
          caption(strings.goToStringProperty),
          grid2x2([midnightBtn, sunriseBtn, noonBtn, sunsetBtn]),
        ],
      }),
    );

    this.siderealPanel = new MotionsOfTheSunPanel(
      new VBox({
        spacing: 6,
        align: "left",
        children: [
          new Text(strings.siderealTimeLabelStringProperty, { font: TITLE_FONT, fill: textFill }),
          description(strings.siderealTimeDescriptionStringProperty),
          new HBox({ children: [this.siderealClock] }),
          siderealDaysReadout,
          caption(strings.advanceBySiderealDayStringProperty),
          new HBox({ spacing: 4, children: [siderealMinus10, siderealMinus1, siderealPlus1, siderealPlus10] }),
          caption(strings.goToStringProperty),
          grid2x2([sid0hBtn, sid6hBtn, sid12hBtn, sid18hBtn]),
        ],
      }),
    );

    // ── Season-jump buttons (placed by the ScreenView, inside Day-of-Year) ───
    const veBtn = makeHighlightButton(
      strings.vernalEquinoxStringProperty,
      tm.isAtVernalEquinoxProperty,
      () => tm.goToFractionOfYear(0, JUMP_ANIMATION_LONG_S),
      strings.vernalEquinoxStringProperty,
    );
    const ssBtn = makeHighlightButton(
      strings.summerSolsticeStringProperty,
      tm.isAtSummerSolsticeProperty,
      () => tm.goToFractionOfYear(0.25, JUMP_ANIMATION_LONG_S),
      strings.summerSolsticeStringProperty,
    );
    const aeBtn = makeHighlightButton(
      strings.autumnalEquinoxStringProperty,
      tm.isAtAutumnalEquinoxProperty,
      () => tm.goToFractionOfYear(0.5, JUMP_ANIMATION_LONG_S),
      strings.autumnalEquinoxStringProperty,
    );
    const wsBtn = makeHighlightButton(
      strings.winterSolsticeStringProperty,
      tm.isAtWinterSolsticeProperty,
      () => tm.goToFractionOfYear(0.75, JUMP_ANIMATION_LONG_S),
      strings.winterSolsticeStringProperty,
    );
    this.seasonButtons = new HBox({ spacing: 6, children: [veBtn, ssBtn, aeBtn, wsBtn] });

    // ── Expose all interactive nodes for pdomOrder wiring ────────────────────
    this.jumpButtons = [
      solarMinus10,
      solarMinus1,
      solarPlus1,
      solarPlus10,
      midnightBtn,
      sunriseBtn,
      noonBtn,
      sunsetBtn,
      siderealMinus10,
      siderealMinus1,
      siderealPlus1,
      siderealPlus10,
      sid0hBtn,
      sid6hBtn,
      sid12hBtn,
      sid18hBtn,
      veBtn,
      ssBtn,
      aeBtn,
      wsBtn,
    ];
  }
}
