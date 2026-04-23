/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Selemene Engine Base URL - Optional fallback API URL when onboarding has not stored one yet. */
  "baseUrl": string,
  /** Pulse Title Mode - Choose which current insight the menu bar title should prioritize. */
  "pulseMode": "vedicClock" | "biorhythm" | "vimshottari"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `dashboard` command */
  export type Dashboard = ExtensionPreferences & {}
  /** Preferences accessible in the `engines` command */
  export type Engines = ExtensionPreferences & {}
  /** Preferences accessible in the `workflows` command */
  export type Workflows = ExtensionPreferences & {}
  /** Preferences accessible in the `readings` command */
  export type Readings = ExtensionPreferences & {}
  /** Preferences accessible in the `profile` command */
  export type Profile = ExtensionPreferences & {}
  /** Preferences accessible in the `api-key` command */
  export type ApiKey = ExtensionPreferences & {}
  /** Preferences accessible in the `menubar` command */
  export type Menubar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `dashboard` command */
  export type Dashboard = {}
  /** Arguments passed to the `engines` command */
  export type Engines = {}
  /** Arguments passed to the `workflows` command */
  export type Workflows = {}
  /** Arguments passed to the `readings` command */
  export type Readings = {}
  /** Arguments passed to the `profile` command */
  export type Profile = {}
  /** Arguments passed to the `api-key` command */
  export type ApiKey = {}
  /** Arguments passed to the `menubar` command */
  export type Menubar = {}
}

