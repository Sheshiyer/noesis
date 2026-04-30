/**
 * Witness gateway helpers for the shared Raycast execution path.
 */

import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { JsonRequestError, requestJson } from "./http";
import { SelemenePreferences } from "./types";
import { trimTrailingSlash } from "./urls";

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

export function getConfiguredWitnessUrl(): string {
  const preferences = getPreferenceValues<SelemenePreferences>();
  return (
    trimTrailingSlash(preferences.witnessUrl ?? "") ||
    trimTrailingSlash(process.env.WITNESS_API_URL ?? "") ||
    DEFAULT_WITNESS_URL
  );
}

export async function getWitnessUrl(): Promise<string> {
  const stored = (
    (await LocalStorage.getItem<string>(WITNESS_URL_KEY)) ?? ""
  ).trim();
  if (stored) return trimTrailingSlash(stored);
  return getConfiguredWitnessUrl();
}

export async function setWitnessUrl(url: string): Promise<void> {
  await LocalStorage.setItem(WITNESS_URL_KEY, trimTrailingSlash(url));
}

// ─── API Client ─────────────────────────────────────────────────────────

async function witnessRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    const response = await requestJson<T>({
      target: "witness",
      baseUrl: await getWitnessUrl(),
      path,
      method: options.method ?? "GET",
      headers: options.headers,
      body: typeof options.body === "string" ? options.body : undefined,
    });
    return response.payload;
  } catch (error) {
    if (!(error instanceof JsonRequestError)) {
      throw error instanceof Error ? error : new Error("Unknown Witness error");
    }

    switch (error.kind) {
      case "timeout":
        throw new Error(
          "Witness API request timed out. Try again in a moment.",
        );
      case "network":
        throw new Error(error.message);
      case "parse":
        throw new Error(
          "Witness API returned an unreadable response. Check the gateway for malformed JSON.",
        );
      case "http":
      default: {
        const payload = toWitnessApiError(error.payload);
        throw new Error(
          payload.error ||
            `Witness API error: ${error.status ?? 500}${error.bodyText ? ` ${truncateBodyText(error.bodyText)}` : ""}`,
        );
      }
    }
  }
}

export async function getProductInfo(): Promise<WitnessProductInfo> {
  return witnessRequest<WitnessProductInfo>("/");
}

export async function checkHealth(): Promise<boolean> {
  try {
    const info = await getProductInfo();
    return !!info.name;
  } catch {
    return false;
  }
}

function toWitnessApiError(value: unknown): WitnessApiError {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as WitnessApiError)
    : { error: "", code: "" };
}

function truncateBodyText(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
}
