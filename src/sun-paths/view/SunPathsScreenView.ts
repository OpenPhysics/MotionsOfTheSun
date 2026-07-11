/**
 * SunPathsScreenView.ts
 *
 * Top-level view for the Sun Paths screen (Screen 1).
 *
 * Layout (1024 × 618 virtual px)
 * ─────────────────────────────
 *  Left area   — SunPathsSkyNode (horizon dome + overlays + Sun)
 *  Right area  — SunPathsControlPanel (latitude, day, time, toggles) and
 *                SunReadoutPanel (7-row ephemeris readout)
 *  Bottom-center — TimeControlNode (play/pause/step)
 *  Bottom-right  — ResetAllButton
 */

import { Vector2 } from "scenerystack/dot";
import { Rectangle, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/MotionsOfTheSunButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import {
  RESET_ALL_BUTTON_BOTTOM_MARGIN,
  SCREEN_VIEW_MARGIN,
  SPHERE_RADIUS,
  VIEW_READOUT_GAP,
} from "../../MotionsOfTheSunConstants.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";
import { SunPathsControlPanel } from "./SunPathsControlPanel.js";
import { SunPathsScreenSummaryContent } from "./SunPathsScreenSummaryContent.js";
import { SunPathsSkyNode } from "./SunPathsSkyNode.js";
import { SunReadoutPanel } from "./SunReadoutPanel.js";

/** Reserve below dome for optional readout. */
const READOUT_RESERVE = 36 + VIEW_READOUT_GAP;

/** Compute the dome center and effective radius fitting in the available left area. */
const computeDomeFit = (
  leftBound: number,
  rightBound: number,
  topBound: number,
  bottomBound: number,
): { center: Vector2; radius: number } => {
  const availW = rightBound - leftBound;
  const availH = bottomBound - topBound;
  const radius = Math.min(availW / 2, (availH - READOUT_RESERVE) / 2, SPHERE_RADIUS) * 0.96;
  const centerX = leftBound + availW / 2;
  const centerY = topBound + radius;
  return { center: new Vector2(centerX, centerY), radius };
};

export class SunPathsScreenView extends ScreenView {
  private readonly skyNode: SunPathsSkyNode;

  public constructor(model: SunPathsModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new SunPathsScreenSummaryContent(model),
      ...options,
    });

    // ── Background ─────────────────────────────────────────────────────────────
    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: MotionsOfTheSunColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    // ── Control panels (right rail, two columns) ───────────────────────────────
    // The tall "Time and Location" panel anchors the far-right column; the three
    // shorter groups ("Animation Controls", "General Settings", "Information")
    // stack in a second column to its left. This mirrors the NAAP reference
    // grouping while fitting the right rail's height.
    const controls = new SunPathsControlPanel(model);
    const readoutPanel = new SunReadoutPanel(model);

    const timeAndLocationPanel = controls.timeAndLocationPanel;
    timeAndLocationPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    timeAndLocationPanel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(timeAndLocationPanel);

    const rightStack = new VBox({
      align: "right",
      spacing: SCREEN_VIEW_MARGIN,
      children: [controls.animationControlsPanel, controls.generalSettingsPanel, readoutPanel],
    });
    rightStack.right = timeAndLocationPanel.left - SCREEN_VIEW_MARGIN;
    rightStack.top = timeAndLocationPanel.top;
    this.addChild(rightStack);

    // ── Horizon dome (left of the panels) ─────────────────────────────────────
    const playRight = rightStack.left - SCREEN_VIEW_MARGIN;
    const playLeft = this.layoutBounds.minX + SCREEN_VIEW_MARGIN;
    const playTop = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    const playBottom = this.layoutBounds.maxY - RESET_ALL_BUTTON_BOTTOM_MARGIN - 60;

    const { center } = computeDomeFit(playLeft, playRight, playTop, playBottom);
    this.skyNode = new SunPathsSkyNode(model, center);
    this.addChild(this.skyNode);

    // ── Time control (bottom-center of play area) ──────────────────────────────
    const a11y = StringManager.getInstance().getSunPathsA11yStrings();
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
    timeControl.centerX = (playLeft + playRight) / 2;
    timeControl.bottom = this.layoutBounds.maxY - RESET_ALL_BUTTON_BOTTOM_MARGIN;
    this.addChild(timeControl);

    // ── Reset All ──────────────────────────────────────────────────────────────
    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - RESET_ALL_BUTTON_BOTTOM_MARGIN,
    });
    this.addChild(resetAllButton);

    // ── PDOM order ────────────────────────────────────────────────────────────
    this.pdomPlayAreaNode.pdomOrder = [this.skyNode.hitRect, this.skyNode.sunNode];
    this.pdomControlAreaNode.pdomOrder = [
      timeAndLocationPanel,
      controls.animationControlsPanel,
      controls.generalSettingsPanel,
      readoutPanel,
      timeControl,
      resetAllButton,
    ];
  }

  public reset(): void {
    this.skyNode.reset();
  }

  public override step(_dt: number): void {
    // Model.step drives property changes; view nodes react via Property / Multilink.
  }
}
