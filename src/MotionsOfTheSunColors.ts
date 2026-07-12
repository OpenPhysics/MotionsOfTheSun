/**
 * MotionsOfTheSunColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import MotionsOfTheSunColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import MotionsOfTheSunColors from "../../MotionsOfTheSunColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: MotionsOfTheSunColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the MotionsOfTheSunColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import MotionsOfTheSunNamespace from "./MotionsOfTheSunNamespace.js";

const MotionsOfTheSunColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  // ── Sky rendering (from RotatingSky donor) ───────────────────────────────────

  /** Sphere / dome outline circle. */
  sphereOutlineColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "sphereOutline", {
    default: "#9fb3c8",
    projector: "#555555",
  }),

  /** RA/Dec and alt/az graticule lines. */
  gridColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "grid", {
    default: "#4a6078",
    projector: "#bbbbbb",
  }),

  /** The celestial equator great circle. */
  celestialEquatorColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "celestialEquator", {
    default: "#ff8a65",
    projector: "#d84315",
  }),

  /** The ecliptic great circle. */
  eclipticColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "ecliptic", {
    default: "#ffd54f",
    projector: "#f9a825",
  }),

  /** The observer's horizon plane / circle. */
  horizonColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "horizon", {
    default: "#66bb6a",
    projector: "#2e7d32",
  }),

  /** Ground fill below the horizon on the horizon dome. */
  groundColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "ground", {
    default: "#009900",
    projector: "#66bb6a",
  }),

  /**
   * Night-sky fill for the sky view panel. Distinct from the screen
   * background so the FOV reads as a separate viewport.
   */
  skyViewBackgroundColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "skyViewBackground", {
    default: "#050510",
    projector: "#e8f0ff",
  }),

  /** Cardinal-direction and pole labels (N, E, S, W). */
  cardinalLabelColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "cardinalLabel", {
    default: "#ffffff",
    projector: "#1a1a1a",
  }),

  /** Fill of a star dot. */
  starColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "star", {
    default: "#fff59d",
    projector: "#f9a825",
  }),

  /** Star-trail and Sun-path arcs. */
  trailColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "trail", {
    default: "#80d8ff",
    projector: "#0277bd",
  }),

  /** The observer's location marker. */
  observerColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "observer", {
    default: "#ff5252",
    projector: "#c62828",
  }),

  /** The observer stick figure on the horizon ground disk. */
  observerFigureColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "observerFigure", {
    default: "#ffffff",
    projector: "#000000",
  }),

  // ── Sun Paths specific ────────────────────────────────────────────────────────

  /** The Sun disc. */
  sunColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "sun", {
    default: "#ffd54f",
    projector: "#f9a825",
  }),

  /** The Sun's daily path arc (declination circle). Reuses the trail hue. */
  sunPathColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "sunPath", {
    default: "#80d8ff",
    projector: "#0277bd",
  }),

  /** The analemma figure-eight. */
  analemmaColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "analemma", {
    default: "#ff8a65",
    projector: "#bf360c",
  }),

  /** Month labels on the ecliptic. */
  monthLabelColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "monthLabel", {
    default: "#ffffff",
    projector: "#1a1a1a",
  }),

  /** Observer shadow cast on the ground. */
  shadowColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "shadow", {
    default: "rgba(0,0,0,0.45)",
    projector: "rgba(0,0,0,0.35)",
  }),

  // ── Sidereal & Solar Time specific ───────────────────────────────────────────

  /** Earth orbit circle in screen 2. */
  orbitPathColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "orbitPath", {
    default: "#c8c8c8",
    projector: "#888888",
  }),

  /** Earth globe ocean fill in screen 2. */
  earthFillColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "earthFill", {
    default: "#4a7abf",
    projector: "#2c5aa0",
  }),

  /** Earth globe continent (land) fill in screen 2. */
  earthLandColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "earthLand", {
    default: "#5a9e56",
    projector: "#3d7a3a",
  }),

  // ── Sun Paths world map (equirectangular latitude picker) ────────────────────

  /** Ocean / background fill of the flat world map. */
  worldMapOceanColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "worldMapOcean", {
    default: "#2b3a52",
    projector: "#c9d6e3",
  }),

  /** Continent (land) fill of the flat world map. */
  worldMapLandColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "worldMapLand", {
    default: "#8a99a8",
    projector: "#6b7787",
  }),

  /** The draggable latitude marker line and its edge arrows on the world map. */
  worldMapMarkerColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "worldMapMarker", {
    default: "#ffd54f",
    projector: "#c62828",
  }),

  // ── Sun Paths 24-hour clock ──────────────────────────────────────────────────
  // The clock face is a light surface in BOTH profiles (like the NAAP original),
  // so every mark drawn on it (ticks, numerals, hand, hub) uses a dark ink that
  // stays dark in both profiles for correct contrast.

  /** The 24-hour clock face fill (light in both profiles). */
  clockFaceColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "clockFace", {
    default: "#fdfdfd",
    projector: "#fdfdfd",
  }),

  /** Ink drawn on the clock face: ticks, numerals, hand, hub, AM/PM labels. */
  clockInkColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "clockInk", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  /** The clock's time-of-day hand. */
  clockHandColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "clockHand", {
    default: "#c0392b",
    projector: "#c0392b",
  }),

  /** Noon meridian line on the Earth globe. */
  earthMeridianColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "earthMeridian", {
    default: "#ffffff",
    projector: "#000000",
  }),

  /** Highlight color for active time-of-day / season buttons. */
  activeButtonHighlightColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "activeButtonHighlight", {
    default: "#ffe082",
    projector: "#ffd54f",
  }),

  // ── Zodiac strip decorations (from SolarSystemModels donor) ──────────────────

  /** Zodiac strip band background fill. */
  zodiacBandColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacBand", {
    default: "#1e293b",
    projector: "#e8eaf6",
  }),

  /** Zodiac strip outer border stroke. */
  zodiacBorderColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacBorder", {
    default: "#555577",
    projector: "#9999bb",
  }),

  /** Zodiac strip sign-divider lines. */
  zodiacDividerColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacDivider", {
    default: "#444455",
    projector: "#9999bb",
  }),

  /** Zodiac strip sign-name labels. */
  zodiacLabelColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacLabel", {
    default: "#aabbcc",
    projector: "#334455",
  }),

  // ── Zodiac sky scene gradients (scene colors; same hex in both profiles) ──────

  /** Top of the night sky gradient. */
  zodiacSkyNightTopColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacSkyNightTop", {
    default: "#000000",
    projector: "#000000",
  }),

  /** Bottom of the night sky gradient. */
  zodiacSkyNightBottomColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacSkyNightBottom", {
    default: "#303547",
    projector: "#303547",
  }),

  /** Top of the daytime sky gradient. */
  zodiacSkyDayTopColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacSkyDayTop", {
    default: "#7dacf0",
    projector: "#7dacf0",
  }),

  /** Bottom of the daytime sky gradient. */
  zodiacSkyDayBottomColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacSkyDayBottom", {
    default: "#afbcd8",
    projector: "#afbcd8",
  }),

  /** Top of the night horizon gradient. */
  zodiacHorizonNightTopColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacHorizonNightTop", {
    default: "#161f14",
    projector: "#161f14",
  }),

  /** Bottom of the night horizon gradient. */
  zodiacHorizonNightBottomColorProperty: new ProfileColorProperty(
    MotionsOfTheSunNamespace,
    "zodiacHorizonNightBottom",
    {
      default: "#354730",
      projector: "#354730",
    },
  ),

  /** Top of the daytime horizon gradient. */
  zodiacHorizonDayTopColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacHorizonDayTop", {
    default: "#5a7a52",
    projector: "#5a7a52",
  }),

  /** Bottom of the daytime horizon gradient. */
  zodiacHorizonDayBottomColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacHorizonDayBottom", {
    default: "#779768",
    projector: "#779768",
  }),

  /** Ecliptic line in the zodiac sky view. */
  zodiacEclipticColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacEcliptic", {
    default: "#fff0a0",
    projector: "#fff0a0",
  }),

  /** Celestial equator line in the zodiac sky view. */
  zodiacCelestialEquatorColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacCelestialEquator", {
    default: "#8080ff",
    projector: "#8080ff",
  }),

  /** Azimuth/altitude grid lines in the zodiac sky view. */
  zodiacGridColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "zodiacGrid", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Zodiac constellation stick-figure lines. */
  constellationLineColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "constellationLine", {
    default: "#4d6080",
    projector: "#99aacc",
  }),

  /** Zodiac constellation name labels. */
  constellationLabelColorProperty: new ProfileColorProperty(MotionsOfTheSunNamespace, "constellationLabel", {
    default: "#aabbcc",
    projector: "#334455",
  }),
};

export default MotionsOfTheSunColors;
