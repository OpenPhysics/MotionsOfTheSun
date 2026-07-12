/**
 * SunNode.ts
 *
 * The draggable Sun disc on the horizon dome.
 *
 * Position
 * ────────
 * Projected from `equatorialToHorizonVector(sunRa, sunDec, lat, lst)`. Hidden
 * when the Sun is on the far hemisphere AND underside is not shown.
 *
 * Drag interaction
 * ────────────────
 * Mode is selected by `model.sunDragModeProperty` (Flash `sunDragMode`):
 *
 *  - "timeOfDay" (D6 default): drag along the declination circle → changes the
 *    fractional part of dayOfYear (time of day), integer day fixed.
 *  - "dayOfYear": drag along the analemma → sets the closest calendar day at
 *    the current mean clock time (Flash `analemmaMC.setClosestDay`).
 *
 * Keyboard
 * ────────
 * timeOfDay: Left/Right = ±15 min.
 * dayOfYear: Left/Right = ∓/+ 1 day (time of day held fixed).
 */

import { Multilink } from "scenerystack/axon";
import { clamp } from "scenerystack/dot";
import { Circle, DragListener, KeyboardListener, Node } from "scenerystack/scenery";
import { equatorialToHorizonVector, hourAngle, normalizeHours, radToDeg } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { DAY_OF_YEAR_RANGE } from "../../MotionsOfTheSunConstants.js";
import type { SunPathsModel } from "../model/SunPathsModel.js";
import { findClosestAnalemmaDay } from "./analemmaClosestDay.js";

const SUN_RADIUS = 8;
const GLOW_RADIUS = 14;
const KEYBOARD_STEP_HOURS = 0.25; // 15 minutes

const YEAR_SPAN = DAY_OF_YEAR_RANGE.max - DAY_OF_YEAR_RANGE.min;
const wrapDay = (day: number): number =>
  ((((day - DAY_OF_YEAR_RANGE.min) % YEAR_SPAN) + YEAR_SPAN) % YEAR_SPAN) + DAY_OF_YEAR_RANGE.min;

export class SunNode extends Node {
  public constructor(projection: SkyProjection, model: SunPathsModel) {
    super({
      tagName: "div",
      focusable: true,
      cursor: "pointer",
    });

    const a11y = StringManager.getInstance().getSunPathsA11yStrings();
    this.accessibleName = a11y.controls.sunDiscStringProperty;

    // Help text switches with drag mode.
    Multilink.multilink([model.sunDragModeProperty], (mode) => {
      this.accessibleHelpText =
        mode === "dayOfYear"
          ? a11y.controls.sunDiscDayOfYearHelpStringProperty
          : a11y.controls.sunDiscHelpStringProperty;
    });

    // Glow
    const glow = new Circle(GLOW_RADIUS, {
      fill: MotionsOfTheSunColors.sunColorProperty,
      opacity: 0.3,
      pickable: false,
    });

    // Sun disc
    const disc = new Circle(SUN_RADIUS, {
      fill: MotionsOfTheSunColors.sunColorProperty,
      stroke: MotionsOfTheSunColors.sunRimColorProperty,
      lineWidth: 1,
      pickable: false,
    });

    this.children = [glow, disc];

    // ── Position update ─────────────────────────────────────────────────────
    Multilink.multilink(
      [
        projection.viewMatrixProperty,
        model.sunRaHoursProperty,
        model.sunDecDegProperty,
        model.latitudeProperty,
        model.siderealTimeHoursProperty,
        model.showUndersideProperty,
      ],
      (_m, ra, dec, lat, lst, showUnderside) => {
        // Use the horizon-vector form (NaN-free at the poles, where the alt/az
        // azimuth is undefined) — matches every other overlay on this dome.
        const worldV = equatorialToHorizonVector(ra, dec, lat, lst);
        const { point, depth } = projection.projectWithDepth(worldV);
        const isFront = depth >= 0;
        this.visible = isFront || showUnderside;
        this.center = point;
        this.opacity = isFront ? 1 : 0.4;
      },
    );

    // ── Drag interaction ─────────────────────────────────────────────────────
    let dragStartHa = 0;

    this.addInputListener(
      new DragListener({
        start: () => {
          dragStartHa = model.hourAngleHoursProperty.value;
        },
        drag: (event) => {
          const parentPoint = this.globalToParentPoint(event.pointer.point);

          if (model.sunDragModeProperty.value === "dayOfYear") {
            const frac = ((model.dayOfYearProperty.value % 1) + 1) % 1;
            const dayInt = findClosestAnalemmaDay(parentPoint, projection, model.latitudeProperty.value, frac);
            const next = dayInt + frac;
            if (Math.abs(model.dayOfYearProperty.value - next) > 1e-9) {
              model.dayOfYearProperty.value = next;
            }
            return;
          }

          // timeOfDay: unproject → new hour angle → update fraction.
          const v = projection.unproject(parentPoint);

          const altRad = Math.asin(clamp(v.z, -1, 1));
          const azRad = Math.atan2(v.y, v.x);
          const altDeg = radToDeg(altRad);
          const azDeg = radToDeg(azRad);

          const lst = model.siderealTimeHoursProperty.value;
          const lat = model.latitudeProperty.value;

          const { raHours: newRa } = (() => {
            const sinDec =
              Math.sin((altDeg * Math.PI) / 180) * Math.sin((lat * Math.PI) / 180) +
              Math.cos((altDeg * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.cos((azDeg * Math.PI) / 180);
            const dec = (Math.asin(clamp(sinDec, -1, 1)) * 180) / Math.PI;
            const cosDec = Math.cos((dec * Math.PI) / 180);
            const sinHa = (-Math.cos((altDeg * Math.PI) / 180) * Math.sin((azDeg * Math.PI) / 180)) / (cosDec || 1e-9);
            const cosHa =
              (Math.sin((altDeg * Math.PI) / 180) - Math.sin((lat * Math.PI) / 180) * sinDec) /
              (Math.cos((lat * Math.PI) / 180) * (cosDec || 1e-9));
            const haHours = (Math.atan2(sinHa, cosHa) * 12) / Math.PI;
            return { raHours: normalizeHours(lst - haHours) };
          })();

          const newHa = hourAngle(newRa, lst);
          const deltaFrac = -(newHa - dragStartHa) / 24;
          dragStartHa = newHa;

          const intDay = Math.floor(model.dayOfYearProperty.value);
          let newFrac = (model.dayOfYearProperty.value - intDay + deltaFrac) % 1;
          if (newFrac < 0) {
            newFrac += 1;
          }
          model.dayOfYearProperty.value = intDay + newFrac;
        },
      }),
    );

    // ── Keyboard interaction ─────────────────────────────────────────────────
    this.addInputListener(
      new KeyboardListener({
        keys: ["arrowLeft", "arrowRight"],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          if (model.sunDragModeProperty.value === "dayOfYear") {
            const delta = keysPressed === "arrowRight" ? 1 : -1;
            const frac = ((model.dayOfYearProperty.value % 1) + 1) % 1;
            const intDay = Math.max(1, Math.floor(model.dayOfYearProperty.value));
            const nextInt = ((((intDay - 1 + delta) % 365) + 365) % 365) + 1;
            model.dayOfYearProperty.value = nextInt + frac;
            return;
          }

          const sign = keysPressed === "arrowLeft" ? 1 : -1;
          const delta = (sign * KEYBOARD_STEP_HOURS) / 24;
          model.dayOfYearProperty.value = wrapDay(model.dayOfYearProperty.value + delta);
        },
      }),
    );
  }
}
