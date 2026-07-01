import { test, expect } from "bun:test";
import { shouldShowSyncError } from "./sync-status";
import { DashboardSnapshot } from "./types";

function createSnapshot(source: DashboardSnapshot["source"]): DashboardSnapshot {
  return {
    baseUrl: "https://selemene.tryambakam.space",
    hasCredentials: true,
    cacheState: "stale",
    source,
    workflows: [],
    engines: [],
    readings: [],
    readingStats: [],
    rateLimit: {},
    timestamps: {},
    syncIssues: [],
  };
}

test("shows sync error when error exists and source is not live", () => {
  expect(shouldShowSyncError("auth failed", createSnapshot("cache"))).toBe(true);
  expect(shouldShowSyncError("auth failed", createSnapshot("empty"))).toBe(true);
});

test("hides sync error when there is no error or source is live", () => {
  expect(shouldShowSyncError(null, createSnapshot("cache"))).toBe(false);
  expect(shouldShowSyncError("auth failed", createSnapshot("live"))).toBe(false);
  expect(shouldShowSyncError("auth failed", null)).toBe(false);
});
