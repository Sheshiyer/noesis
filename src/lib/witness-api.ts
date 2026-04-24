/**
 * Witness API client — talks to the Daily Witness service at 48.tryambakam.space.
 * Separate from Selemene API: no auth required for free tier readings.
 */

import { getPreferenceValues, LocalStorage } from "@raycast/api";

interface WitnessPreferences {
  witnessUrl?: string;
}

// ─── Types ──────────────────────────────────────────────────────────────

export interface WitnessReadingRequest {
  birth_date: string; // YYYY-MM-DD (required)
  birth_time?: string; // HH:MM
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface WitnessDataPoint {
  label: string;
  value: string;
  category: string;
  emphasis: boolean;
}

export interface WitnessEngineReading {
  layer: number;
  engine_id: string;
  engine_role: string;
  raw_data: Record<string, unknown>;
  headline: string;
  data_points: WitnessDataPoint[];
  timestamp: string;
  witness_question?: string;
}

export interface WitnessDecoderState {
  user_hash: string;
  total_visits: number;
  consecutive_days: number;
  last_visit: string;
  first_visit: string;
  max_layer_reached: number;
  finder_gate_shown: boolean;
  graduation_shown: boolean;
  engines_most_viewed: Record<string, number>;
}

export interface WitnessReading {
  id: string;
  date: string;
  birth_date: string;
  primary_engine: string;
  primary_reading: WitnessEngineReading;
  all_readings: Record<string, WitnessEngineReading>;
  max_layer_unlocked: number;
  decoder_state: WitnessDecoderState;
  engines_called: string[];
  total_latency_ms: number;
  cache_stats: Record<string, unknown>;
  engine_health: Record<string, unknown>;
  standalone_version: string;
}

export interface WitnessReadingResponse {
  reading: WitnessReading;
  next_reading_available: string;
  full_platform_url: string;
}

export interface WitnessProductInfo {
  name: string;
  version: string;
  tagline?: string;
  engines: string[];
  endpoints: Record<string, string>;
}

export interface WitnessApiError {
  error: string;
  code: string;
  hint?: string;
}

// ─── Storage ────────────────────────────────────────────────────────────

const WITNESS_URL_KEY = "noesis.witnessUrl";
const DEFAULT_WITNESS_URL = "https://48.tryambakam.space";

export async function getWitnessUrl(): Promise<string> {
  const stored = (
    (await LocalStorage.getItem<string>(WITNESS_URL_KEY)) ?? ""
  ).trim();
  if (stored) return stored.replace(/\/+$/, "");

  const preferences = getPreferenceValues<WitnessPreferences>();
  return (
    preferences.witnessUrl?.trim().replace(/\/+$/, "") ||
    process.env.WITNESS_API_URL?.trim().replace(/\/+$/, "") ||
    DEFAULT_WITNESS_URL
  );
}

export async function setWitnessUrl(url: string): Promise<void> {
  await LocalStorage.setItem(WITNESS_URL_KEY, url.trim().replace(/\/+$/, ""));
}

// ─── API Client ─────────────────────────────────────────────────────────

async function witnessRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = await getWitnessUrl();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorBody: WitnessApiError | undefined;
    try {
      errorBody = (await response.json()) as WitnessApiError;
    } catch {
      // ignore parse errors
    }
    throw new Error(
      errorBody?.error ||
        `Witness API error: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

export async function getProductInfo(): Promise<WitnessProductInfo> {
  return witnessRequest<WitnessProductInfo>("/");
}

export async function getReading(
  request: WitnessReadingRequest,
): Promise<WitnessReadingResponse> {
  return witnessRequest<WitnessReadingResponse>("/reading", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function checkHealth(): Promise<boolean> {
  try {
    const info = await getProductInfo();
    return !!info.name;
  } catch {
    return false;
  }
}
