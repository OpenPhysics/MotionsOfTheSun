/**
 * WorldMapNode.ts
 *
 * Flat (equirectangular) world map used as the Sun Paths latitude picker,
 * replacing an earlier stylized-globe latitude picker. Mirrors the NAAP
 * "Motions of the Sun" world map: recognizable continent outlines with a
 * full-width horizontal latitude marker (arrowheads at both edges) that the
 * observer drags up/down to set their latitude. Longitude is irrelevant here,
 * so the marker spans the whole map and only the vertical position matters.
 *
 * Land outlines are the NAAP `Globe.as` `_shoreData` polygons (see
 * `common/EarthShoreData`), projected with lon → x, lat → y. Dateline-crossing
 * edges are split so each land mass fills locally without a wrap-around smear.
 */

import type { NumberProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { DragListener, KeyboardListener, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
import { LATITUDE_RANGE, WORLD_MAP_HEIGHT, WORLD_MAP_WIDTH } from "../../MotionsOfTheSunConstants.js";
import { EARTH_SHORE_POLYGONS, type EarthShorePoint } from "../EarthShoreData.js";

type GeoPoint = { lon: number; lat: number };

const shorePointToGeo = (point: EarthShorePoint): GeoPoint => ({
  lon: Math.atan2(point.y, point.x) * (180 / Math.PI),
  lat: Math.asin(point.z) * (180 / Math.PI),
});

/** Add one land polygon, breaking each subpath where it crosses the antimeridian. */
const addShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
): void => {
  let previousLon: number | null = null;
  let penDown = false;

  for (const point of polygon) {
    const { lon, lat } = shorePointToGeo(point);
    if (previousLon !== null && Math.abs(lon - previousLon) > 180) {
      if (penDown) {
        shape.close();
      }
      penDown = false;
    }
    if (penDown) {
      shape.lineTo(lonToX(lon), latToY(lat));
    } else {
      shape.moveTo(lonToX(lon), latToY(lat));
      penDown = true;
    }
    previousLon = lon;
  }
  if (penDown) {
    shape.close();
  }
};

const buildLandShape = (lonToX: (lon: number) => number, latToY: (lat: number) => number): Shape => {
  const land = new Shape();
  for (const polygon of EARTH_SHORE_POLYGONS) {
    addShorePolygonToShape(land, polygon, lonToX, latToY);
  }
  return land;
};

export type WorldMapNodeOptions = {
  latitudeProperty: NumberProperty;
  accessibleNameProperty: TReadOnlyProperty<string>;
  accessibleHelpTextProperty: TReadOnlyProperty<string>;
};

export class WorldMapNode extends Node {
  public constructor(options: WorldMapNodeOptions) {
    const width = WORLD_MAP_WIDTH;
    const height = WORLD_MAP_HEIGHT;

    const lonToX = (lon: number): number => ((lon + 180) / 360) * width;
    const latToY = (lat: number): number => ((90 - lat) / 180) * height;
    const yToLatitude = (y: number): number =>
      LATITUDE_RANGE.constrainValue(Math.round((90 - (y / height) * 180) * 10) / 10);

    // ── Ocean + continents ────────────────────────────────────────────────────
    const ocean = new Rectangle(0, 0, width, height, {
      fill: MotionsOfTheSunColors.worldMapOceanColorProperty,
      stroke: MotionsOfTheSunColors.textColorProperty,
      lineWidth: 1,
    });

    const land = new Path(buildLandShape(lonToX, latToY), {
      fill: MotionsOfTheSunColors.worldMapLandColorProperty,
      lineWidth: 0,
    });

    // ── Latitude marker: full-width line with inward-pointing arrows at edges ──
    const marker = new Node({ cursor: "ns-resize" });
    const markerLine = new Line(0, 0, width, 0, {
      stroke: MotionsOfTheSunColors.worldMapMarkerColorProperty,
      lineWidth: 2,
    });
    const arrow = 6;
    const leftArrow = new Path(new Shape().moveTo(0, -arrow).lineTo(arrow, 0).lineTo(0, arrow).close(), {
      fill: MotionsOfTheSunColors.worldMapMarkerColorProperty,
    });
    const rightArrow = new Path(
      new Shape()
        .moveTo(width, -arrow)
        .lineTo(width - arrow, 0)
        .lineTo(width, arrow)
        .close(),
      { fill: MotionsOfTheSunColors.worldMapMarkerColorProperty },
    );
    marker.children = [markerLine, leftArrow, rightArrow];

    // Overlay (continents + marker) is clipped to the map so the marker line and
    // arrows never inflate the panel when latitude is near ±90°.
    const overlay = new Node({
      children: [land, marker],
      clipArea: Shape.rect(0, 0, width, height),
    });

    super({
      children: [ocean, overlay],
      tagName: "div",
      focusable: true,
      cursor: "ns-resize",
      accessibleName: options.accessibleNameProperty,
      accessibleHelpText: options.accessibleHelpTextProperty,
    });

    options.latitudeProperty.link((lat) => {
      marker.y = latToY(lat);
    });

    const setLatitudeFromLocalY = (y: number): void => {
      const lat = yToLatitude(y);
      if (options.latitudeProperty.value !== lat) {
        options.latitudeProperty.value = lat;
      }
    };

    // Dragging anywhere on the map moves the marker to the pointer's latitude.
    this.addInputListener(
      new DragListener({
        drag: (event) => {
          setLatitudeFromLocalY(this.globalToLocalPoint(event.pointer.point).y);
        },
      }),
    );

    this.addInputListener(
      new KeyboardListener({
        keys: ["arrowUp", "arrowDown"],
        fire: (_event, keysPressed) => {
          const delta = keysPressed.includes("arrowUp") ? 1 : -1;
          options.latitudeProperty.value = LATITUDE_RANGE.constrainValue(options.latitudeProperty.value + delta);
        },
      }),
    );
  }
}
