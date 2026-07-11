/**
 * EclipticOnHorizonNode.ts
 *
 * Draws the ecliptic great circle on the horizon dome and optionally places
 * localized month-name labels at each month's approximate Sun position.
 *
 * Ecliptic sampling: λ ∈ [0°, 360°) in 2° steps.
 *   dec = asin( sin λ · sin ε )
 *   ra  = atan2( sin λ · cos ε, cos λ )     (ε = 23.44°, D2)
 * Each point → `equatorialToHorizonVector(raHours, decDeg, lat, lst)` → projected.
 * The far half is drawn dashed.
 *
 * Month labels: for i = 0…11, day = MONTH_START_DOY[i]+1 gives the Sun's
 * approximate position for that calendar month. The label is placed at that
 * projected position, nudged ~8 px radially outward from the dome center.
 */

import { Multilink } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { degToRad, equatorialToHorizonVector, radToDeg } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { getSunPosition } from "../../common/SunEphemeris.js";
import { addSplitSmoothPolyline } from "../../common/view/skyGraphics.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { CONTROL_FONT_SIZE, MONTH_START_DOY, OBLIQUITY_DEG } from "../../MotionsOfTheSunConstants.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";

const ECLIPTIC_STEP_DEG = 2;
const MONTH_LABEL_NUDGE = 8; // px outward from dome center

/** Convert ecliptic longitude λ (radians) to equatorial horizon vector. */
const eclipticToHorizonVector = (lambdaRad: number, latDeg: number, lstHours: number): Vector3 => {
  const eps = degToRad(OBLIQUITY_DEG);
  const sinLambda = Math.sin(lambdaRad);
  const cosLambda = Math.cos(lambdaRad);
  const decRad = Math.asin(Math.max(-1, Math.min(1, sinLambda * Math.sin(eps))));
  const decDeg = radToDeg(decRad);
  const raRad = Math.atan2(sinLambda * Math.cos(eps), cosLambda);
  const raHours = (((raRad * (12 / Math.PI)) % 24) + 24) % 24;
  return equatorialToHorizonVector(raHours, decDeg, latDeg, lstHours);
};

/** Sample the ecliptic as a closed loop of horizon-frame unit vectors. */
const sampleEcliptic = (latDeg: number, lstHours: number): Vector3[] => {
  const points: Vector3[] = [];
  for (let lambdaDeg = 0; lambdaDeg < 360; lambdaDeg += ECLIPTIC_STEP_DEG) {
    points.push(eclipticToHorizonVector(degToRad(lambdaDeg), latDeg, lstHours));
  }
  return points;
};

export class EclipticOnHorizonNode extends Node {
  /** Front stroke — used for roll-over balloon hit testing. */
  public readonly hoverTarget: Path;

  public constructor(projection: SkyProjection, model: SunPathsModel) {
    super();

    const frontPath = new Path(null, {
      stroke: MotionsOfTheSunColors.eclipticColorProperty,
      lineWidth: 1.5,
    });
    this.hoverTarget = frontPath;
    const backPath = new Path(null, {
      stroke: MotionsOfTheSunColors.eclipticColorProperty,
      lineWidth: 1.5,
      lineDash: [5, 4],
      opacity: 0.55,
      pickable: false,
    });

    // Month labels
    const controls = StringManager.getInstance().getControls();
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
    ] as const;

    const labelNodes: Text[] = monthSPs.map(
      (sp) =>
        new Text(sp, {
          font: new PhetFont(CONTROL_FONT_SIZE - 1),
          fill: MotionsOfTheSunColors.monthLabelColorProperty,
          pickable: false,
        }),
    );
    const labelsNode = new Node({ children: labelNodes });

    this.children = [backPath, frontPath, labelsNode];

    const updateEcliptic: () => void = () => {
      const lat = model.latitudeProperty.value;
      const lst = model.siderealTimeHoursProperty.value;
      const points = sampleEcliptic(lat, lst);

      const front = new Shape();
      const back = new Shape();
      addSplitSmoothPolyline(projection, points, true, front, back);
      frontPath.shape = front;
      backPath.shape = back;
    };

    const updateLabels: () => void = () => {
      const lat = model.latitudeProperty.value;
      const lst = model.siderealTimeHoursProperty.value;
      for (let i = 0; i < 12; i++) {
        const doy = (MONTH_START_DOY[i] ?? 0) + 1;
        const { raHours, decDeg } = getSunPosition(doy);
        const v = equatorialToHorizonVector(raHours, decDeg, lat, lst);
        const { point, depth } = projection.projectWithDepth(v);
        const labelNode = labelNodes[i];
        if (labelNode) {
          if (depth >= 0) {
            const away = point.minus(projection.center);
            const offset = away.magnitude > 0 ? away.normalized().timesScalar(MONTH_LABEL_NUDGE) : away;
            labelNode.center = point.plus(offset);
            labelNode.visible = true;
          } else {
            labelNode.visible = false;
          }
        }
      }
    };

    Multilink.multilink(
      [projection.viewMatrixProperty, model.latitudeProperty, model.siderealTimeHoursProperty],
      () => {
        updateEcliptic();
        updateLabels();
      },
    );

    model.showEclipticProperty.link((visible) => {
      frontPath.visible = visible;
      backPath.visible = visible;
    });

    model.showMonthLabelsProperty.link((visible) => {
      labelsNode.visible = visible;
    });
  }
}
