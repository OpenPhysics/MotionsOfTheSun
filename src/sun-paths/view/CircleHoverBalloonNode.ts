/**
 * CircleHoverBalloonNode.ts
 *
 * Roll-over label balloons for the Sun Paths celestial circles, matching the
 * Flash lab's "Zero Hour / Celestial Equator / Ecliptic / Declination /
 * Analemma" balloons. A shared balloon follows the pointer while the cursor
 * is over a pickable circle stroke.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { TInputListener } from "scenerystack/scenery";
import { Node, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { CONTROL_FONT_SIZE } from "../../MotionsOfTheSunConstants.js";

const PAD_X = 8;
const PAD_Y = 4;
const POINTER_OFFSET = 12;

/**
 * Light speech-bubble style label that sits above the sky overlays. Call
 * {@link attachCircleHoverBalloon} on each circle Path to drive it.
 */
export class CircleHoverBalloonNode extends Node {
  private readonly label: Text;
  private readonly background: Rectangle;

  public constructor() {
    super({ pickable: false, visible: false });

    this.label = new Text("", {
      font: new PhetFont({ size: CONTROL_FONT_SIZE, weight: "bold" }),
      fill: MotionsOfTheSunColors.controlSurfaceTextColorProperty,
    });

    this.background = new Rectangle(0, 0, 10, 10, {
      fill: MotionsOfTheSunColors.controlSurfaceColorProperty,
      stroke: MotionsOfTheSunColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: 4,
    });

    this.children = [this.background, this.label];
  }

  /** Show the balloon near `localPoint` (parent coords) with the given label. */
  public showAt(localX: number, localY: number, text: string): void {
    this.label.string = text;
    const w = this.label.width + 2 * PAD_X;
    const h = this.label.height + 2 * PAD_Y;
    this.background.setRect(0, 0, w, h);
    this.label.centerX = w / 2;
    this.label.centerY = h / 2;
    this.left = localX + POINTER_OFFSET;
    this.bottom = localY - 4;
    this.visible = true;
  }

  public hide(): void {
    this.visible = false;
  }
}

/**
 * Wire mouse enter/move/exit on `target` so the shared `balloon` appears with
 * `labelProperty`'s current value while the pointer is over the circle.
 */
export const attachCircleHoverBalloon = (
  target: Node,
  balloon: CircleHoverBalloonNode,
  balloonParent: Node,
  labelProperty: TReadOnlyProperty<string>,
): void => {
  target.cursor = "help";
  target.pickable = true;

  const listener: TInputListener = {
    enter: (event) => {
      const local = balloonParent.globalToLocalPoint(event.pointer.point);
      balloon.showAt(local.x, local.y, labelProperty.value);
      balloon.moveToFront();
    },
    move: (event) => {
      if (!balloon.visible) {
        return;
      }
      const local = balloonParent.globalToLocalPoint(event.pointer.point);
      balloon.showAt(local.x, local.y, labelProperty.value);
    },
    exit: () => {
      balloon.hide();
    },
  };

  target.addInputListener(listener);
};
