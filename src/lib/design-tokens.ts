/**
 * Urania 137 Design Tokens
 *
 * Sacred-tech aesthetic for the Noesis Raycast extension.
 * Maps the Urania 137 design system to Raycast's Color.Raw hex values.
 *
 * Reference: /Volumes/madara/2026/Projects/tryambakam-noesis/urania-137/.assets/
 */

import { Color, Icon } from "@raycast/api";

// ─── Core Palette ───────────────────────────────────────────────────────────

export const URANIA_COLORS = {
  /** Primary accent — sacred gold for actions, highlights, active states */
  SACRED_GOLD: "#C5A017",
  /** Deep violet — selected states, accent backgrounds */
  WITNESS_VIOLET: "#2D0050",
  /** Electric indigo — focus states, links, navigation */
  FLOW_INDIGO: "#0B50FB",
  /** Teal-green — success states, secondary actions */
  COHERENCE_EMERALD: "#10B5A7",
  /** Cosmic void — dark theme background reference */
  VOID_BLACK: "#070B1D",
  /** Warm white — light theme background reference */
  PARCHMENT: "#F0EDE3",
  /** Error red — preserved for destructive actions */
  SIGNAL_RED: "#FF4444",
  /** Muted gray — secondary text, inactive states */
  MUTED: "#8B8B8B",
} as const;

// ─── Dynamic Colors (light/dark aware) ──────────────────────────────────────

/** Sacred Gold — slightly brighter in dark theme for contrast */
export const GOLD_DYNAMIC: Color.Dynamic = {
  light: "#B8940F",
  dark: "#D4AF37",
  adjustContrast: true,
};

/** Coherence Emerald — consistent across themes */
export const EMERALD_DYNAMIC: Color.Dynamic = {
  light: "#0E9E91",
  dark: "#10B5A7",
  adjustContrast: true,
};

/** Flow Indigo — slightly brighter in dark theme */
export const INDIGO_DYNAMIC: Color.Dynamic = {
  light: "#0A45D9",
  dark: "#3B7AFF",
  adjustContrast: true,
};

/** Witness Violet — brighter in dark for visibility */
export const VIOLET_DYNAMIC: Color.Dynamic = {
  light: "#2D0050",
  dark: "#6B3FA0",
  adjustContrast: true,
};

/** Signal Red — consistent across themes */
export const RED_DYNAMIC: Color.Dynamic = {
  light: "#DD3333",
  dark: "#FF5555",
  adjustContrast: true,
};

/** Muted text — adapts to theme */
export const MUTED_DYNAMIC: Color.Dynamic = {
  light: "#6B7280",
  dark: "#9CA3AF",
  adjustContrast: true,
};

// ─── Semantic Color Aliases ─────────────────────────────────────────────────

/** Healthy / success / fresh / ready */
export const COLOR_SUCCESS = URANIA_COLORS.COHERENCE_EMERALD;
/** Warning / degraded / stale / caution */
export const COLOR_WARNING = URANIA_COLORS.SACRED_GOLD;
/** Error / critical / failure */
export const COLOR_ERROR = URANIA_COLORS.SIGNAL_RED;
/** Info / focus / navigation / link */
export const COLOR_INFO = URANIA_COLORS.FLOW_INDIGO;
/** Selected / active accent */
export const COLOR_SELECTED = URANIA_COLORS.WITNESS_VIOLET;
/** Primary action / highlight */
export const COLOR_PRIMARY = URANIA_COLORS.SACRED_GOLD;
/** Secondary / muted */
export const COLOR_SECONDARY = URANIA_COLORS.MUTED;

// ─── Node States (orbital constellation metaphor) ───────────────────────────

export const NODE_STATES = {
  /** Default resting state — sacred gold */
  default: URANIA_COLORS.SACRED_GOLD,
  /** Currently active — coherence emerald */
  active: URANIA_COLORS.COHERENCE_EMERALD,
  /** Focused / navigated — flow indigo */
  focus: URANIA_COLORS.FLOW_INDIGO,
  /** Selected / chosen — witness violet */
  selected: URANIA_COLORS.WITNESS_VIOLET,
  /** Disabled / inactive — muted gray */
  inactive: URANIA_COLORS.MUTED,
} as const;

// ─── Icon Tinting ───────────────────────────────────────────────────────────

/** Get tinted icon source for a Raycast icon */
export function tintedIcon(
  icon: Icon,
  tint: string = URANIA_COLORS.SACRED_GOLD,
): { source: Icon; tintColor: string } {
  return { source: icon, tintColor: tint };
}

/** Gold-tinted icon (primary) */
export function goldIcon(icon: Icon) {
  return tintedIcon(icon, URANIA_COLORS.SACRED_GOLD);
}

/** Emerald-tinted icon (success/active) */
export function emeraldIcon(icon: Icon) {
  return tintedIcon(icon, URANIA_COLORS.COHERENCE_EMERALD);
}

/** Indigo-tinted icon (info/focus) */
export function indigoIcon(icon: Icon) {
  return tintedIcon(icon, URANIA_COLORS.FLOW_INDIGO);
}

/** Violet-tinted icon (selected/accent) */
export function violetIcon(icon: Icon) {
  return tintedIcon(icon, URANIA_COLORS.WITNESS_VIOLET);
}

/** Red-tinted icon (error/warning) */
export function redIcon(icon: Icon) {
  return tintedIcon(icon, URANIA_COLORS.SIGNAL_RED);
}

/** Muted icon (secondary/inactive) */
export function mutedIcon(icon: Icon) {
  return tintedIcon(icon, URANIA_COLORS.MUTED);
}

// ─── Sacred Geometry Markdown Helpers ───────────────────────────────────────

/** Section divider with sacred geometry dots */
export const SECTION_DIVIDER = "\n---\n";

/** Cosmic header — NOESIS wordmark style */
export function cosmicHeader(title: string): string {
  return `# ${title.toUpperCase()}`;
}

/** Sacred subheader */
export function sacredSubheader(title: string): string {
  return `## ${title}`;
}

/** Orbital node badge — renders as inline code with color hint */
export function nodeBadge(label: string, state: keyof typeof NODE_STATES = "default"): string {
  return `\`${label}\``;
}

/** Phase indicator badge */
export function phaseBadge(phase: number): string {
  return `\`P${phase}\``;
}

/** Status dot indicator (unicode) */
export function statusDot(color: "gold" | "emerald" | "indigo" | "violet" | "red" | "muted"): string {
  const dots: Record<typeof color, string> = {
    gold: "⭐",     // star
    emerald: "✅",  // check
    indigo: "◆",   // diamond
    violet: "◇",   // open diamond
    red: "❌",      // cross
    muted: "○",    // open circle
  };
  return dots[color];
}

// ─── Typography Constants ───────────────────────────────────────────────────

/** Markdown heading style — all caps for sacred effect */
export const HEADING_STYLE = {
  /** Primary heading — NOESIS style */
  primary: (text: string) => `# ${text.toUpperCase()}`,
  /** Secondary heading */
  secondary: (text: string) => `## ${text}`,
  /** Tertiary heading — all caps */
  tertiary: (text: string) => `### ${text.toUpperCase()}`,
} as const;

// ─── Metadata Label Helpers ─────────────────────────────────────────────────

/** Build a Detail.Metadata.Label with Urania styling */
export function metadataLabel(title: string, icon?: Icon, color?: string) {
  return { title, icon: icon ? { source: icon, tintColor: color || URANIA_COLORS.SACRED_GOLD } : undefined };
}

/** Build a metadata separator */
export function metadataSeparator() {
  return { type: "separator" as const };
}
