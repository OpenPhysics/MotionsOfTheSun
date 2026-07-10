/**
 * MotionsOfTheSunPanel.ts
 *
 * A pre-themed Panel that automatically uses MotionsOfTheSunColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { MotionsOfTheSunPanel } from "../../common/MotionsOfTheSunPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new MotionsOfTheSunPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new MotionsOfTheSunPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new MotionsOfTheSunPanel(content, { fill: "transparent" });
 */

import type { Node } from "scenerystack/scenery";
import type { PanelOptions } from "scenerystack/sun";
import { Panel } from "scenerystack/sun";
import MotionsOfTheSunColors from "../MotionsOfTheSunColors.js";
import { PANEL_CORNER_RADIUS } from "../MotionsOfTheSunConstants.js";

export class MotionsOfTheSunPanel extends Panel {
  public constructor(content: Node, providedOptions?: PanelOptions) {
    super(content, {
      fill: MotionsOfTheSunColors.panelBackgroundColorProperty,
      stroke: MotionsOfTheSunColors.panelBorderColorProperty,
      cornerRadius: PANEL_CORNER_RADIUS,
      xMargin: 12,
      yMargin: 10,
      ...providedOptions,
    });
  }
}
