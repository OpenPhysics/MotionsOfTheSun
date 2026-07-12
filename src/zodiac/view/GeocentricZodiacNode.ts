/**
 * GeocentricZodiacNode.ts
 *
 * Lab Zodiac Explorer (`zodiac.swf` / ZodiacViewer.as): geocentric celestial
 * sphere with Earth at the center, Sun on the ecliptic rim, zodiac stick-figure
 * constellations, Flash zodiac-band day/night gradient masks, Earth's
 * rotational axis (zodiac016), and drag-to-rotate camera.
 *
 * Flash setup: latitude 66.5° + LST 18h puts the north ecliptic pole at the
 * zenith so the horizon plane coincides with the ecliptic — Sun/Earth azimuth
 * motion is ecliptic longitude. We place those bodies via
 * {@link geocentricSunLongitudeRad} in the equatorial frame used by
 * {@link SkyProjection}.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { DerivedProperty, Multilink } from "scenerystack/axon";
import { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Color, LinearGradient, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { EARTH_SHORE_POLYGONS } from "../../common/EarthShoreData.js";
import { raDecToVector3 } from "../../common/SkyCoordinates.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { attachSkyCameraInteraction } from "../../common/view/attachSkyCameraInteraction.js";
import {
  addFrontHemisphereSphericalPolygon,
  addSplitSmoothPolyline,
  smallCirclePoints,
} from "../../common/view/skyGraphics.js";
import { StringManager } from "../../i18n/StringManager.js";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { CONTROL_FONT_SIZE, OBLIQUITY_DEG, SOLAR_TIME_AT_EPOCH } from "../../MotionsOfTheSunConstants.js";
import {
  calendarDayOfYearFromDaysSinceVE,
  eclipticLongitudeToVector3,
  geocentricGlobeRotationRad,
  geocentricSunLongitudeRad,
  ZODIAC_AXIS_EXTENT,
  ZODIAC_AXIS_LINE_WIDTH,
  ZODIAC_BAND_HALF_ANGLE_DEG,
  ZODIAC_DEFAULT_PHI_DEG,
  ZODIAC_DEFAULT_THETA_DEG,
  ZODIAC_FLASH_EARTH_DISK_SIZE,
  ZODIAC_FLASH_SPHERE_DIAMETER,
  ZODIAC_MAX_VIEWER_ALTITUDE_DEG,
} from "../model/geocentricZodiacMath.js";
import { ZODIAC_FLASH_CONSTELLATIONS } from "../model/ZodiacFlashConstellationsData.js";
import type { ZodiacModel } from "../model/ZodiacModel.js";
import { buildZodiacBandMasks, zodiacBandGradientEndpoints } from "./zodiacBandGraphics.js";

const DEG = Math.PI / 180;
const NCP = new Vector3(0, 0, 1);
const ECLIPTIC_POLE = raDecToVector3(18, 90 - OBLIQUITY_DEG);
const SUN_DISK_RADIUS_PX = 10;
const DASH = [5, 4];
/** Flash `maxViewerAltitude` — applied in {@link SkyProjection.rotateBy}. */
const MAX_ELEVATION_RAD = ZODIAC_MAX_VIEWER_ALTITUDE_DEG * DEG;

/** Flash globe radius as a fraction of the celestial-sphere radius. */
const GLOBE_SCALE = ZODIAC_FLASH_EARTH_DISK_SIZE / ZODIAC_FLASH_SPHERE_DIAMETER;

/** Flash gradient fill alpha ≈ 60/100. */
const BAND_GRADIENT_OPACITY = 0.6;

export type GeocentricZodiacNodeOptions = {
  /** Screen-space diameter of the celestial sphere (px). */
  diameter?: number;
};

/**
 * Rotate a unit-sphere shore point about +Z by `rotationRad` (globe spin).
 */
const rotateAboutZ = (p: { x: number; y: number; z: number }, rotationRad: number): Vector3 => {
  const c = Math.cos(rotationRad);
  const s = Math.sin(rotationRad);
  return new Vector3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
};

export class GeocentricZodiacNode extends Node {
  public readonly projection: SkyProjection;

  public constructor(
    model: ZodiacModel,
    signLabelProperties: ReadonlyMap<string, TReadOnlyProperty<string>>,
    options?: GeocentricZodiacNodeOptions,
  ) {
    super();

    const diameter = options?.diameter ?? 520;
    const radius = diameter / 2;
    const center = new Vector2(radius, radius);

    this.projection = new SkyProjection({
      center,
      radius,
      azimuth: ZODIAC_DEFAULT_THETA_DEG * DEG,
      elevation: -ZODIAC_DEFAULT_PHI_DEG * DEG,
      maxElevation: MAX_ELEVATION_RAD,
    });
    const projection = this.projection;

    const calendarDayProperty = new DerivedProperty(
      [model.timeMaster.solarDaysSinceVernalEquinoxProperty],
      (daysSinceVE) => calendarDayOfYearFromDaysSinceVE(daysSinceVE, SOLAR_TIME_AT_EPOCH),
    );

    const sunLonProperty = new DerivedProperty([calendarDayProperty], geocentricSunLongitudeRad);
    const globeRotationProperty = new DerivedProperty([calendarDayProperty], geocentricGlobeRotationRad);

    // ── Hit target + camera interaction ───────────────────────────────────
    const a11y = StringManager.getInstance().getZodiacA11yStrings();
    const hitTarget = new Rectangle(0, 0, diameter, diameter, {
      fill: "rgba(0,0,0,0)",
      cursor: "pointer",
    });
    attachSkyCameraInteraction(hitTarget, {
      projection,
      sky: {
        advanceSiderealTime: () => undefined,
      },
      accessibleNameProperty: a11y.controls.viewModeStringProperty,
      accessibleHelpTextProperty:
        StringManager.getInstance().getSunPathsA11yStrings().controls.skyViewHelpStringProperty,
    });

    // ── Layers ────────────────────────────────────────────────────────────
    const outline = new Circle(radius, {
      stroke: MotionsOfTheSunColors.sphereOutlineColorProperty,
      lineWidth: 1.5,
      center,
      pickable: false,
    });

    const sphereDiscClip = Shape.circle(center.x, center.y, radius);

    // Flash backSurface / frontSurface: full-sphere gradients masked to the band.
    const bandBackGradient = new Rectangle(0, 0, diameter, diameter, {
      opacity: BAND_GRADIENT_OPACITY,
      pickable: false,
    });
    bandBackGradient.clipArea = sphereDiscClip;

    const bandFrontGradient = new Rectangle(0, 0, diameter, diameter, {
      opacity: BAND_GRADIENT_OPACITY,
      pickable: false,
    });
    bandFrontGradient.clipArea = sphereDiscClip;

    const eclipticFront = new Path(null, {
      stroke: MotionsOfTheSunColors.eclipticColorProperty,
      lineWidth: 1.5,
      pickable: false,
    });
    const eclipticBack = new Path(null, {
      stroke: MotionsOfTheSunColors.eclipticColorProperty,
      lineWidth: 1.5,
      lineDash: DASH,
      opacity: 0.55,
      pickable: false,
    });

    const bandEdgeFront = new Path(null, {
      stroke: MotionsOfTheSunColors.constellationLineColorProperty,
      lineWidth: 1,
      opacity: 0.45,
      pickable: false,
    });
    const bandEdgeBack = new Path(null, {
      stroke: MotionsOfTheSunColors.constellationLineColorProperty,
      lineWidth: 1,
      lineDash: DASH,
      opacity: 0.3,
      pickable: false,
    });

    const equatorFront = new Path(null, {
      stroke: MotionsOfTheSunColors.celestialEquatorColorProperty,
      lineWidth: 1.25,
      pickable: false,
    });
    const equatorBack = new Path(null, {
      stroke: MotionsOfTheSunColors.celestialEquatorColorProperty,
      lineWidth: 1.25,
      lineDash: DASH,
      opacity: 0.55,
      pickable: false,
    });

    const constellationsBack = new Path(null, {
      stroke: MotionsOfTheSunColors.constellationLineColorProperty,
      lineWidth: 1.25,
      opacity: 0.55,
      pickable: false,
    });
    const constellationsFront = new Path(null, {
      stroke: MotionsOfTheSunColors.constellationLineColorProperty,
      lineWidth: 1.25,
      pickable: false,
    });

    // zodiac016 rotational axis (NCP↔SCP through Earth; extent 1.5× Earth radius).
    const axisBack = new Path(null, {
      stroke: MotionsOfTheSunColors.earthAxisColorProperty,
      lineWidth: ZODIAC_AXIS_LINE_WIDTH,
      lineDash: DASH,
      opacity: 0.7,
      pickable: false,
    });
    const axisFront = new Path(null, {
      stroke: MotionsOfTheSunColors.earthAxisColorProperty,
      lineWidth: ZODIAC_AXIS_LINE_WIDTH,
      pickable: false,
    });

    const labelLayer = new Node({ pickable: false });
    const labelNodes: { key: string; text: Text; world: Vector3 }[] = [];
    for (const c of ZODIAC_FLASH_CONSTELLATIONS) {
      const labelProp = signLabelProperties.get(c.key);
      if (!labelProp) {
        continue;
      }
      const text = new Text(labelProp, {
        font: new PhetFont(CONTROL_FONT_SIZE - 1),
        fill: MotionsOfTheSunColors.constellationLabelColorProperty,
        maxWidth: 72,
        visibleProperty: model.constellationLabelsVisibleProperty,
      });
      labelLayer.addChild(text);
      labelNodes.push({
        key: c.key,
        text,
        world: raDecToVector3(c.labelRaHours, c.labelDecDeg),
      });
    }

    const globeRadius = radius * GLOBE_SCALE;
    const ocean = new Circle(globeRadius, {
      fill: MotionsOfTheSunColors.earthFillColorProperty,
      stroke: MotionsOfTheSunColors.sphereOutlineColorProperty,
      lineWidth: 1,
      center,
      pickable: false,
    });
    const landPath = new Path(null, {
      fill: MotionsOfTheSunColors.earthLandColorProperty,
      stroke: MotionsOfTheSunColors.sphereOutlineColorProperty,
      lineWidth: 0.35,
      opacity: 0.95,
      pickable: false,
    });
    const nightShade = new Path(null, {
      fill: MotionsOfTheSunColors.nightShadeColorProperty,
      pickable: false,
    });

    const sunDisc = new Circle(SUN_DISK_RADIUS_PX, {
      fill: MotionsOfTheSunColors.sunColorProperty,
      stroke: MotionsOfTheSunColors.sunRimColorProperty,
      lineWidth: 1,
      pickable: false,
    });

    // Paint order (Flash): band-back → sphere-back → axis-back → globe →
    // axis-front → sphere-front → band-front → sun/labels
    const backLayer = new Node({
      children: [outline, bandBackGradient, bandEdgeBack, equatorBack, eclipticBack, constellationsBack, axisBack],
      pickable: false,
    });
    const globeLayer = new Node({ children: [ocean, landPath, nightShade], pickable: false });
    const frontLayer = new Node({
      children: [
        axisFront,
        equatorFront,
        eclipticFront,
        bandEdgeFront,
        constellationsFront,
        bandFrontGradient,
        labelLayer,
        sunDisc,
      ],
      pickable: false,
    });

    this.children = [hitTarget, backLayer, globeLayer, frontLayer];

    const eclipticPoints = smallCirclePoints(ECLIPTIC_POLE, 90);
    const equatorPoints = smallCirclePoints(NCP, 90);
    const bandNorthPoints = smallCirclePoints(ECLIPTIC_POLE, 90 - ZODIAC_BAND_HALF_ANGLE_DEG);
    const bandSouthPoints = smallCirclePoints(ECLIPTIC_POLE, 90 + ZODIAC_BAND_HALF_ANGLE_DEG);

    const constellationPolylines: Vector3[][] = [];
    for (const c of ZODIAC_FLASH_CONSTELLATIONS) {
      for (const seg of c.path) {
        const start = c.stars[seg.m];
        if (!start) {
          continue;
        }
        const pts: Vector3[] = [new Vector3(start.x, start.y, start.z)];
        for (let k = seg.b; k < seg.e; k++) {
          const s = c.stars[k];
          if (s) {
            pts.push(new Vector3(s.x, s.y, s.z));
          }
        }
        if (pts.length >= 2) {
          constellationPolylines.push(pts);
        }
      }
    }

    const toGlobe = (v: Vector3): Vector2 => {
      const { point } = projection.projectWithDepth(v);
      return center.plus(point.minus(center).timesScalar(GLOBE_SCALE));
    };

    const applyBandGradient = (
      rect: Rectangle,
      dark: Vector2,
      light: Vector2,
      dayColor: Color | string,
      nightColor: Color | string,
    ): void => {
      if (dark.distance(light) < 1) {
        rect.fill = Color.toColor(nightColor);
        return;
      }
      rect.fill = new LinearGradient(dark.x, dark.y, light.x, light.y)
        .addColorStop(0, Color.toColor(nightColor))
        .addColorStop(1, Color.toColor(dayColor));
    };

    Multilink.multilink(
      [
        projection.viewMatrixProperty,
        sunLonProperty,
        globeRotationProperty,
        model.celestialEquatorLabelVisibleProperty,
        MotionsOfTheSunColors.zodiacBandDayColorProperty,
        MotionsOfTheSunColors.zodiacBandNightColorProperty,
      ],
      (_m, sunLon, globeRot, showEquator, dayColor, nightColor) => {
        outline.center = center;
        ocean.center = center;

        // ── Zodiac-band gradient masks (Flash updateZodiacBand + masks) ───
        const { frontMask, backMask } = buildZodiacBandMasks(projection);
        const { dark, light } = zodiacBandGradientEndpoints(projection, sunLon);
        applyBandGradient(bandBackGradient, dark, light, dayColor, nightColor);
        applyBandGradient(bandFrontGradient, dark, light, dayColor, nightColor);
        bandBackGradient.clipArea = backMask;
        bandFrontGradient.clipArea = frontMask;

        const eclipticFrontShape = new Shape();
        const eclipticBackShape = new Shape();
        addSplitSmoothPolyline(projection, eclipticPoints, true, eclipticFrontShape, eclipticBackShape);
        eclipticFront.shape = eclipticFrontShape;
        eclipticBack.shape = eclipticBackShape;

        const equatorFrontShape = new Shape();
        const equatorBackShape = new Shape();
        addSplitSmoothPolyline(projection, equatorPoints, true, equatorFrontShape, equatorBackShape);
        equatorFront.shape = equatorFrontShape;
        equatorBack.shape = equatorBackShape;
        equatorFront.visible = showEquator;
        equatorBack.visible = showEquator;

        const bandEdgeFrontShape = new Shape();
        const bandEdgeBackShape = new Shape();
        addSplitSmoothPolyline(projection, bandNorthPoints, true, bandEdgeFrontShape, bandEdgeBackShape);
        addSplitSmoothPolyline(projection, bandSouthPoints, true, bandEdgeFrontShape, bandEdgeBackShape);
        bandEdgeFront.shape = bandEdgeFrontShape;
        bandEdgeBack.shape = bandEdgeBackShape;

        const constFrontShape = new Shape();
        const constBackShape = new Shape();
        for (const pts of constellationPolylines) {
          addSplitSmoothPolyline(projection, pts, false, constFrontShape, constBackShape);
        }
        constellationsFront.shape = constFrontShape;
        constellationsBack.shape = constBackShape;

        for (const { text, world } of labelNodes) {
          const { point, depth } = projection.projectWithDepth(world);
          text.center = point;
          text.opacity = depth >= 0 ? 1 : 0.35;
        }

        // Earth land (rotated by sidereal spin).
        landPath.clipArea = Shape.circle(center.x, center.y, globeRadius);
        nightShade.clipArea = Shape.circle(center.x, center.y, globeRadius);
        const landShape = new Shape();
        for (const polygon of EARTH_SHORE_POLYGONS) {
          const vertices = polygon.map((p) => rotateAboutZ(p, globeRot));
          addFrontHemisphereSphericalPolygon(projection, vertices, landShape, toGlobe, center, globeRadius);
        }
        landPath.shape = landShape;

        // zodiac016 rotational axis: NCP–SCP through Earth, length 1.5× Earth radius.
        const ncpOnGlobe = toGlobe(NCP);
        const axisDir = ncpOnGlobe.minus(center);
        if (axisDir.magnitude > 1e-6) {
          const unit = axisDir.normalized();
          const northTip = center.plus(unit.timesScalar(globeRadius * ZODIAC_AXIS_EXTENT));
          const southTip = center.minus(unit.timesScalar(globeRadius * ZODIAC_AXIS_EXTENT));
          const ncpFront = projection.isFrontFacing(NCP);
          const axisFrontShape = new Shape();
          const axisBackShape = new Shape();
          // Near hemisphere half is solid; far half is dashed (Flash frontAxis / backAxis).
          if (ncpFront) {
            axisFrontShape.moveToPoint(center).lineToPoint(northTip);
            axisBackShape.moveToPoint(center).lineToPoint(southTip);
          } else {
            axisBackShape.moveToPoint(center).lineToPoint(northTip);
            axisFrontShape.moveToPoint(center).lineToPoint(southTip);
          }
          axisFront.shape = axisFrontShape;
          axisBack.shape = axisBackShape;
        } else {
          axisFront.shape = null;
          axisBack.shape = null;
        }

        // Sun on the ecliptic rim.
        const sunWorld = eclipticLongitudeToVector3(sunLon);
        const sunProj = projection.projectWithDepth(sunWorld);
        sunDisc.center = sunProj.point;
        sunDisc.visible = true;
        sunDisc.opacity = sunProj.depth >= 0 ? 1 : 0.45;

        // Night shade: semicircle opposite the projected sun direction on the globe.
        const sunOnGlobe = toGlobe(sunWorld);
        const sunOffset = sunOnGlobe.minus(center);
        if (sunOffset.magnitude > 1e-6) {
          const angle = Math.atan2(sunOffset.y, sunOffset.x);
          const night = new Shape();
          night.moveTo(center.x, center.y);
          night.arc(center.x, center.y, globeRadius, angle + Math.PI / 2, angle - Math.PI / 2, false);
          night.close();
          nightShade.shape = night;
        } else {
          nightShade.shape = null;
        }
      },
    );
  }

  public reset(): void {
    this.projection.reset();
  }
}
