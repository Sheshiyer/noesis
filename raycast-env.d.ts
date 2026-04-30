/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Selemene Engine API Key - Secure password preference for the Selemene Engine key. Preferred over legacy local storage. */
  "apiKey"?: string,
  /** Selemene Engine Base URL - Optional fallback API URL when onboarding has not stored one yet. */
  "baseUrl": string,
  /** Daily Witness API URL - Trusted Witness gateway URL used only when the execution route preference is set to Witness. */
  "witnessUrl": string,
  /** Execution Route - Choose where engine and workflow runs execute: directly against Selemene or through the Witness gateway. */
  "executionRoute": "witness" | "selemene",
  /** Reading History Cache - Maximum number of reading rows to keep in the local SQLite cache. */
  "readingHistoryLimit": "25" | "50" | "100",
  /** Store Raw Payloads - Keep full raw result JSON in the local cache for debugging. When off, Raycast stores only minimized payloads. */
  "cacheRawPayloads": boolean,
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
  /** Preferences accessible in the `daily-witness` command */
  export type DailyWitness = ExtensionPreferences & {}
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
  /** Arguments passed to the `daily-witness` command */
  export type DailyWitness = {}
  /** Arguments passed to the `menubar` command */
  export type Menubar = {}
}

