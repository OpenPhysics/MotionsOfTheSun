/**
 * ObserverFigureNode.ts
 *
 * A stick-figure observer at the dome center with a Flash-style cast shadow
 * on the ground plane (`ShadowMaker` / "Stickfigure Shadow").
 *
 * The upright figure and its shadow share the same limb layout (head, torso,
 * two arms hanging down, two legs) — the original MotionsOfTheSun TypeScript
 * proportions, not the CCNMTL SVG. The shadow is that layout laid flat on
 * z = 0 opposite the Sun and projected through `SkyProjection`.
 *
 * Shadow length / fade follow Flash `ShadowMaker.setSourcePosition`:
 *   length  ≈ height / tan(alt)   (clamped to the ground disk)
 *   opacity = 1 − 1 / (15 × tan(alt))
 */

import { Multilink } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path } from "scenerystack/scenery";
import { degToRad } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";

const BODY_COLOR = MotionsOfTheSunColors.observerFigureColorProperty;
const SHADOW_COLOR = MotionsOfTheSunColors.shadowColorProperty;

/** Flash `ShadowMaker.lengthLimit` — controls altitude fade. */
const LENGTH_LIMIT = 15;

/** Vertical figure height in unit-sphere world coords (person at dome center). */
const FIGURE_HEIGHT = 0.07;

/** Cap so the shadow stays on the ground disk (radius 1). */
const MAX_SHADOW_LEN = 0.55;

/** Flash hides the shadow below ~0.1°. */
const MIN_ALT_DEG = 0.1;

const CAP_SAMPLES = 6;
const ZENITH = new Vector3(0, 0, 1);

/**
 * Shared stick-figure layout in "upright" units: feet at 0, head up positive.
 * Matches the original TypeScript ObserverFigureNode (arms hang down and out).
 *
 *   head center 28, r 4
 *   torso 14 → 24
 *   arms from shoulder 20 → hands at height 15, ± ±6
 *   legs from hip 14 → feet at 0, span ±5
 */
const FIG = {
  height: 32,
  headCenter: 28,
  headR: 4,
  torsoTop: 24,
  shoulder: 20,
  handY: 15,
  armSpan: 6,
  hip: 14,
  footSpan: 5,
} as const;

const at = (dir: Vector3, perp: Vector3, along: number, across: number): Vector3 =>
  dir.timesScalar(along).plus(perp.timesScalar(across));

const appendCapsule = (shape: Shape, projection: SkyProjection, a: Vector3, b: Vector3, halfW: number): void => {
  const along = b.minus(a);
  const len = along.magnitude;
  if (len < 1e-9) {
    return;
  }
  const d = along.timesScalar(1 / len);
  const p = new Vector3(-d.y, d.x, 0);

  shape.moveToPoint(projection.project(a.plus(p.timesScalar(halfW))));
  shape.lineToPoint(projection.project(b.plus(p.timesScalar(halfW))));
  for (let i = 1; i <= CAP_SAMPLES; i++) {
    const ang = -Math.PI / 2 + (i / CAP_SAMPLES) * Math.PI;
    shape.lineToPoint(
      projection.project(b.plus(d.timesScalar(halfW * Math.cos(ang))).plus(p.timesScalar(halfW * Math.sin(ang)))),
    );
  }
  shape.lineToPoint(projection.project(a.plus(p.timesScalar(-halfW))));
  for (let i = 1; i <= CAP_SAMPLES; i++) {
    const ang = Math.PI / 2 + (i / CAP_SAMPLES) * Math.PI;
    shape.lineToPoint(
      projection.project(a.plus(d.timesScalar(halfW * Math.cos(ang))).plus(p.timesScalar(halfW * Math.sin(ang)))),
    );
  }
  shape.close();
};

const appendDisk = (shape: Shape, projection: SkyProjection, center: Vector3, radius: number, samples = 16): void => {
  for (let i = 0; i <= samples; i++) {
    const ang = (i / samples) * Math.PI * 2;
    const screen = projection.project(center.plus(new Vector3(Math.cos(ang) * radius, Math.sin(ang) * radius, 0)));
    if (i === 0) {
      shape.moveToPoint(screen);
    } else {
      shape.lineToPoint(screen);
    }
  }
  shape.close();
};

/** Ground-plane shadow using the same FIG limb layout as the upright figure. */
const buildStickShadowShape = (projection: SkyProjection, dir: Vector3, perp: Vector3, len: number): Shape => {
  const shape = new Shape();
  const s = len / FIG.height;
  const limbW = Math.max(0.0035, Math.min(0.007, len * 0.045));

  const u = (y: number, x = 0): Vector3 => at(dir, perp, y * s, x * s);

  const hip = u(FIG.hip);
  const shoulder = u(FIG.shoulder);
  const neck = u(FIG.torsoTop);
  const head = u(FIG.headCenter);

  // Legs
  appendCapsule(shape, projection, hip, u(0, -FIG.footSpan), limbW);
  appendCapsule(shape, projection, hip, u(0, FIG.footSpan), limbW);
  // Torso
  appendCapsule(shape, projection, hip, neck, limbW * 1.15);
  // Arms hanging down toward the feet (handY < shoulder)
  appendCapsule(shape, projection, shoulder, u(FIG.handY, -FIG.armSpan), limbW);
  appendCapsule(shape, projection, shoulder, u(FIG.handY, FIG.armSpan), limbW);
  // Neck + head
  appendCapsule(shape, projection, neck, head, limbW * 0.85);
  appendDisk(shape, projection, head, FIG.headR * s);

  return shape;
};

export class ObserverFigureNode extends Node {
  public constructor(projection: SkyProjection, model: SunPathsModel) {
    super({ pickable: false });

    // Screen-space figure: feet at local (0,0), −Y is up. Same FIG proportions.
    const head = new Circle(FIG.headR, { fill: BODY_COLOR, centerY: -FIG.headCenter });
    const stroke = { stroke: BODY_COLOR, lineWidth: 1.5, lineCap: "round" as const };
    const torso = new Line(0, -FIG.torsoTop, 0, -FIG.hip, stroke);
    const leftArm = new Line(0, -FIG.shoulder, -FIG.armSpan, -FIG.handY, stroke);
    const rightArm = new Line(0, -FIG.shoulder, FIG.armSpan, -FIG.handY, stroke);
    const leftLeg = new Line(0, -FIG.hip, -FIG.footSpan, 0, stroke);
    const rightLeg = new Line(0, -FIG.hip, FIG.footSpan, 0, stroke);

    const figure = new Node({ children: [head, torso, leftArm, rightArm, leftLeg, rightLeg] });
    const shadowPath = new Path(null, { fill: SHADOW_COLOR });

    this.children = [shadowPath, figure];

    figure.x = projection.center.x;
    figure.y = projection.center.y;

    Multilink.multilink(
      [projection.viewMatrixProperty, model.sunAltDegProperty, model.sunAzDegProperty, model.showStickfigureProperty],
      (_m, alt, az, showFigure) => {
        this.visible = showFigure;
        figure.x = projection.center.x;
        figure.y = projection.center.y;

        if (!showFigure || alt < MIN_ALT_DEG || !projection.isFrontFacing(ZENITH)) {
          shadowPath.shape = null;
          return;
        }

        const altRad = degToRad(alt);
        const tanAlt = Math.tan(altRad);
        if (tanAlt <= 1e-6) {
          shadowPath.shape = null;
          return;
        }

        const opacity = 1 - 1 / (LENGTH_LIMIT * tanAlt);
        if (opacity <= 0) {
          shadowPath.shape = null;
          return;
        }

        const shadowLen = Math.min(MAX_SHADOW_LEN, FIGURE_HEIGHT / tanAlt);
        const shadowAz = degToRad(az + 180);
        const dir = new Vector3(Math.cos(shadowAz), Math.sin(shadowAz), 0);
        const perp = new Vector3(-Math.sin(shadowAz), Math.cos(shadowAz), 0);

        shadowPath.shape = buildStickShadowShape(projection, dir, perp, shadowLen);
        shadowPath.opacity = opacity * 0.85;
      },
    );
  }
}
