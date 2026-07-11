/**
 * ZodiacSkyNode.ts
 *
 * Lambert azimuthal equal-area sky view for the Zodiac screen. Renders:
 *  - Sky gradient (night ↔ day interpolated by twilightIntensity)
 *  - Ground gradient below the horizon polygon
 *  - Az/Alt grid (24 semi-meridians, 5 altitude parallels) — static in horizon frame
 *  - Celestial equator (dynamic; depends on siderealTimeRad)
 *  - Ecliptic (dynamic; depends on siderealTimeRad)
 *  - Sun disc at (sunRa, sunDec) projected via lambertProjection
 *  - S / E / W direction labels at fixed horizon positions
 *  - Optional "Ecliptic" and "Celestial Equator" labels near those curves
 *
 * Coordinate note: the projection origin is at (width/2, viewOffset(width)) within
 * the clipped rectangle. All lambertProjection.ts functions return (x, y) relative
 * to that origin. We translate children by (width/2, viewOffset(width)) so the
 * origin maps to the correct screen position.
 *
 * Source: NAAP/flash-animations/flashdev2/zodiacSimulator/ZodiacSkyView.as
 *   lines 324–593 (drawing routines) and 638–686 (sun/twilight).
 */

import { Multilink } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, Color, LinearGradient, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import type { ZodiacModel } from "../model/ZodiacModel.js";
import {
  getAltitudeFromCelestial,
  projectCelestial,
  projectHorizon,
  viewHeight,
  viewOffset,
  ySouth,
} from "./lambertProjection.js";

// ── Drawing constants from ZodiacSkyView.as ──────────────────────────────────

const OBLIQUITY_RAD: number = 23.44 * (Math.PI / 180);
const SIN_OBLIQUITY: number = Math.sin(OBLIQUITY_RAD);
const COS_OBLIQUITY: number = Math.cos(OBLIQUITY_RAD);

const GRID_ALPHA_NORMAL: number = 0.09;
const EQUATOR_ALPHA: number = 0.5;
const ECLIPTIC_ALPHA: number = 0.5;
const ECLIPTIC_THICKNESS: number = 2;
const EQUATOR_THICKNESS: number = 2;
const GRID_THICKNESS: number = 1;

// ── Color helpers ─────────────────────────────────────────────────────────────

/**
 * Interpolate between two hex colors by twilight factor u ∈ [0,1].
 * Transcribed from ZodiacSkyView.getInterpolatedColor.
 */
function interpolateColor(c0: string, c1: string, u: number): string {
  const a = Color.toColor(c0);
  const b = Color.toColor(c1);
  const r = Math.round(a.r + u * (b.r - a.r));
  const g = Math.round(a.g + u * (b.g - a.g));
  const bl = Math.round(a.b + u * (b.b - a.b));
  return `rgb(${r},${g},${bl})`;
}

// Fixed sky/ground colors from ZodiacSkyView.as (same in default and projector profiles)
const SKY_NIGHT_TOP = "#000000";
const SKY_NIGHT_BOTTOM = "#303547";
const SKY_DAY_TOP = "#7dacf0";
const SKY_DAY_BOTTOM = "#afbcd8";
const HORIZON_NIGHT_TOP = "#161f14";
const HORIZON_NIGHT_BOTTOM = "#354730";
const HORIZON_DAY_TOP = "#5a7a52";
const HORIZON_DAY_BOTTOM = "#779768";

export class ZodiacSkyNode extends Node {
  /** x offset of projection origin from left edge of clip area. */
  public readonly originX: number;
  /** y offset of projection origin from top edge of clip area. */
  public readonly originY: number;

  // ── Layers (z-order bottom to top) ─────────────────────────────────────────
  private readonly skyRect: Rectangle;
  private readonly groundRect: Rectangle;
  private readonly gridPath: Path;
  private readonly equatorPath: Path;
  private readonly eclipticPath: Path;
  private readonly horizonPath: Path;
  private readonly sunDisc: Circle;
  private readonly eclipticLabel: Text;
  private readonly celestialEquatorLabel: Text;
  private readonly directionLabels: Node;

  public constructor(model: ZodiacModel, widthPx: number) {
    super();

    const W = widthPx;
    const H = viewHeight(W);
    const offset = viewOffset(W);

    this.originX = W / 2;
    this.originY = offset;

    // ── Clip area ───────────────────────────────────────────────────────────
    this.clipArea = Shape.rectangle(0, 0, W, H);

    // ── Sky gradient background ─────────────────────────────────────────────
    this.skyRect = new Rectangle(0, 0, W, H, { pickable: false });
    this.addChild(this.skyRect);

    // ── Ground gradient (below ySouth) ──────────────────────────────────────
    const yS = ySouth(W);
    const groundY = this.originY + yS; // canvas y of south horizon
    const groundH = H - groundY;
    this.groundRect = new Rectangle(0, groundY, W, Math.max(0, groundH), { pickable: false });
    this.addChild(this.groundRect);

    // ── Static horizon outline for visual separation ────────────────────────
    this.horizonPath = new Path(this._buildHorizonShape(W, yS), {
      fill: "rgba(0,0,0,0)",
      stroke: "rgba(255,255,255,0.15)",
      lineWidth: 1,
      pickable: false,
    });
    this.addChild(this.horizonPath);

    // ── Grid (static in horizon frame — drawn once) ─────────────────────────
    this.gridPath = new Path(this._buildGridShape(W, offset), {
      stroke: `rgba(255,255,255,${GRID_ALPHA_NORMAL})`,
      lineWidth: GRID_THICKNESS,
      pickable: false,
    });
    this.addChild(this.gridPath);

    // ── Celestial equator (dynamic) ─────────────────────────────────────────
    this.equatorPath = new Path(null, {
      stroke: MotionsOfTheSunColors.zodiacCelestialEquatorColorProperty,
      lineWidth: EQUATOR_THICKNESS,
      opacity: EQUATOR_ALPHA,
      pickable: false,
    });
    this.addChild(this.equatorPath);

    // ── Ecliptic (dynamic) ──────────────────────────────────────────────────
    this.eclipticPath = new Path(null, {
      stroke: MotionsOfTheSunColors.zodiacEclipticColorProperty,
      lineWidth: ECLIPTIC_THICKNESS,
      opacity: ECLIPTIC_ALPHA,
      pickable: false,
    });
    this.addChild(this.eclipticPath);

    // ── Sun disc ─────────────────────────────────────────────────────────────
    this.sunDisc = new Circle(10, {
      fill: MotionsOfTheSunColors.sunColorProperty,
      pickable: false,
    });
    this.addChild(this.sunDisc);

    // ── Optional curve labels ────────────────────────────────────────────────
    this.eclipticLabel = new Text("", {
      font: new PhetFont({ size: 11, style: "italic" }),
      fill: MotionsOfTheSunColors.zodiacEclipticColorProperty,
      pickable: false,
    });
    this.celestialEquatorLabel = new Text("", {
      font: new PhetFont({ size: 11, style: "italic" }),
      fill: MotionsOfTheSunColors.zodiacCelestialEquatorColorProperty,
      pickable: false,
    });
    this.addChild(this.eclipticLabel);
    this.addChild(this.celestialEquatorLabel);

    // ── S / E / W direction labels ───────────────────────────────────────────
    this.directionLabels = this._buildDirectionLabels(W, offset);
    this.addChild(this.directionLabels);

    // ── Reactivity: update on model changes ─────────────────────────────────
    model.twilightIntensityProperty.link((intensity) => {
      this._updateSky(W, H, intensity);
      this._updateGround(W, groundY, Math.max(0, groundH), intensity);
    });

    Multilink.multilink(
      [model.siderealTimeRadProperty, model.sunLongitudeRadProperty, model.sunRaRadProperty, model.sunDecRadProperty],
      (lst, _sunLon, sunRa, sunDec) => {
        this._updateEquator(W, offset, lst);
        this._updateEcliptic(W, offset, lst);
        this._updateSun(W, offset, sunRa, sunDec, lst);
        this._updateCurveLabels(W, offset, lst);
      },
    );

    // Bind label visibility to model toggle properties
    model.eclipticLabelVisibleProperty.link((v) => {
      this.eclipticLabel.visible = v;
    });
    model.celestialEquatorLabelVisibleProperty.link((v) => {
      this.celestialEquatorLabel.visible = v;
    });
  }

  // ── Private drawing helpers ────────────────────────────────────────────────

  /** Build the static horizon outline shape in canvas coords. */
  private _buildHorizonShape(W: number, _yS: number): Shape {
    const shape = new Shape();
    const N = 128;
    let first = true;
    for (let i = 0; i <= N; i++) {
      const az = (i / N) * 2 * Math.PI;
      const pt = projectHorizon(az, 0, W);
      if (!pt) {
        continue;
      }
      const cx = this.originX + pt.x;
      const cy = this.originY + pt.y;
      if (first) {
        shape.moveTo(cx, cy);
        first = false;
      } else {
        shape.lineTo(cx, cy);
      }
    }
    shape.close();
    return shape;
  }

  /** Build the static az/alt grid shape in canvas coords. */
  private _buildGridShape(W: number, offset: number): Shape {
    const shape = new Shape();
    const N_MERIDIANS = 24;
    const N_AZ_SAMPLES = 128;
    const N_PARALLELS = 5;
    const N_ALT_SAMPLES = 128;

    // ── Azimuth semi-meridians (alt = −π/2 → π/2) ────────────────────────
    for (let i = 0; i < N_MERIDIANS; i++) {
      const az = (i / N_MERIDIANS) * 2 * Math.PI;
      // Central meridian (i === N_MERIDIANS/2) would ideally be drawn at a higher
      // opacity (GRID_ALPHA_CENTRAL), but since all meridians share one Path, we use
      // a single alpha (GRID_ALPHA_NORMAL) for simplicity.
      let first = true;
      for (let j = 0; j <= N_AZ_SAMPLES; j++) {
        const alt = -Math.PI / 2 + (j / N_AZ_SAMPLES) * Math.PI;
        const pt = projectHorizon(az, alt, W);
        if (!pt) {
          first = true;
          continue;
        }
        const cx = this.originX + pt.x;
        const cy = offset + pt.y;
        if (first) {
          shape.moveTo(cx, cy);
          first = false;
        } else {
          shape.lineTo(cx, cy);
        }
      }
    }

    // ── Altitude parallels (az = 0 → 2π) ─────────────────────────────────
    const altStep = Math.PI / (N_PARALLELS + 1); // 5 parallels between 0 and 90°
    for (let i = 1; i <= N_PARALLELS; i++) {
      const alt = i * altStep; // positive altitudes only (above horizon)
      let first = true;
      for (let j = 0; j <= N_ALT_SAMPLES; j++) {
        const az = (j / N_ALT_SAMPLES) * 2 * Math.PI;
        const pt = projectHorizon(az, alt, W);
        if (!pt) {
          first = true;
          continue;
        }
        const cx = this.originX + pt.x;
        const cy = offset + pt.y;
        if (first) {
          shape.moveTo(cx, cy);
          first = false;
        } else {
          shape.lineTo(cx, cy);
        }
      }
    }

    return shape;
  }

  private _updateSky(_W: number, H: number, u: number): void {
    const topColor = interpolateColor(SKY_NIGHT_TOP, SKY_DAY_TOP, u);
    const bottomColor = interpolateColor(SKY_NIGHT_BOTTOM, SKY_DAY_BOTTOM, u);
    this.skyRect.fill = new LinearGradient(0, 0, 0, H).addColorStop(0, topColor).addColorStop(1, bottomColor);
  }

  private _updateGround(_W: number, groundY: number, groundH: number, u: number): void {
    if (groundH <= 0) {
      return;
    }
    const topColor = interpolateColor(HORIZON_NIGHT_TOP, HORIZON_DAY_TOP, u);
    const bottomColor = interpolateColor(HORIZON_NIGHT_BOTTOM, HORIZON_DAY_BOTTOM, u);
    this.groundRect.fill = new LinearGradient(0, groundY, 0, groundY + groundH)
      .addColorStop(0, topColor)
      .addColorStop(1, bottomColor);
  }

  private _updateEquator(W: number, offset: number, lst: number): void {
    const shape = new Shape();
    const N = 200;
    let first = true;
    for (let i = 0; i <= N; i++) {
      const ra = (i / N) * 2 * Math.PI;
      const pt = projectCelestial(ra, 0, lst, W);
      if (!pt) {
        first = true;
        continue;
      }
      const cx = this.originX + pt.x;
      const cy = offset + pt.y;
      if (first) {
        shape.moveTo(cx, cy);
        first = false;
      } else {
        shape.lineTo(cx, cy);
      }
    }
    this.equatorPath.shape = shape;
  }

  private _updateEcliptic(W: number, offset: number, lst: number): void {
    const shape = new Shape();
    const N = 200;
    let first = true;
    for (let i = 0; i <= N; i++) {
      const lon = (i / N) * 2 * Math.PI;
      const sl = Math.sin(lon);
      const cl = Math.cos(lon);
      const dec = Math.asin(sl * SIN_OBLIQUITY);
      const ra = Math.atan2(sl * COS_OBLIQUITY, cl);
      const pt = projectCelestial(ra, dec, lst, W);
      if (!pt) {
        first = true;
        continue;
      }
      const cx = this.originX + pt.x;
      const cy = offset + pt.y;
      if (first) {
        shape.moveTo(cx, cy);
        first = false;
      } else {
        shape.lineTo(cx, cy);
      }
    }
    this.eclipticPath.shape = shape;
  }

  private _updateSun(W: number, offset: number, sunRa: number, sunDec: number, lst: number): void {
    const pt = projectCelestial(sunRa, sunDec, lst, W);
    if (pt) {
      this.sunDisc.visible = true;
      this.sunDisc.centerX = this.originX + pt.x;
      this.sunDisc.centerY = offset + pt.y;
    } else {
      this.sunDisc.visible = false;
    }
  }

  private _updateCurveLabels(W: number, offset: number, lst: number): void {
    // Celestial equator label: near ra = lst - 0.6, dec ≈ 0.04
    const eqRa = lst - 0.6;
    const eqPt = projectCelestial(eqRa, 0.04, lst, W);
    if (eqPt && this.eclipticLabel.visible === false) {
      // don't bother updating if not visible
    }
    if (eqPt) {
      this.celestialEquatorLabel.x = this.originX + eqPt.x;
      this.celestialEquatorLabel.y = offset + eqPt.y;
    }

    // Ecliptic label: near ra = lst + 0.6, dec ≈ 0.06 + sin(ecliptic inclination) approx
    const eclRa = lst + 0.6;
    const eclDec = 0.06 + ((23.5 * Math.PI) / 180) * Math.sin(lst + 0.6);
    const eclPt = projectCelestial(eclRa, eclDec, lst, W);
    if (eclPt) {
      this.eclipticLabel.x = this.originX + eclPt.x;
      this.eclipticLabel.y = offset + eclPt.y;
    }
  }

  /** Build the S / E / W direction labels at fixed horizon positions. */
  private _buildDirectionLabels(W: number, offset: number): Node {
    const container = new Node({ pickable: false });
    const font = new PhetFont({ size: 13, weight: "bold" });

    const addLabel = (text: string, az: number, altExtraY: number): void => {
      const alt = 5 * (Math.PI / 180); // 5° above horizon
      const pt = projectHorizon(az, alt, W);
      if (!pt) {
        return;
      }
      const label = new Text(text, {
        font,
        fill: MotionsOfTheSunColors.cardinalLabelColorProperty,
        centerX: this.originX + pt.x,
        centerY: offset + pt.y + altExtraY,
      });
      container.addChild(label);
    };

    addLabel("S", Math.PI, 30); // south horizon, nudged down like Flash
    addLabel("E", Math.PI / 2, 40); // east horizon, nudged down
    addLabel("W", (3 * Math.PI) / 2, 40); // west horizon, nudged down

    return container;
  }

  /**
   * Set the string properties for the curve labels.
   * Called from ZodiacScreenView after StringManager is available.
   */
  public setLabelStrings(eclipticStr: string, equatorStr: string): void {
    this.eclipticLabel.string = eclipticStr;
    this.celestialEquatorLabel.string = equatorStr;
  }

  /**
   * Sun altitude at the projection's fixed latitude (41° N), computed from
   * the Flash formula for determining visibility/twilight.
   */
  public getSunAltitude(sunRa: number, sunDec: number, lst: number): number {
    return getAltitudeFromCelestial(sunRa, sunDec, lst);
  }
}
