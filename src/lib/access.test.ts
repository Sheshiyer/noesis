import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAccessContext,
  canUseEngineWorkbench,
  getSnapshotAccess,
} from "./access";
import { getEffectiveExecutionRoute } from "./settings";
import { DashboardSnapshot } from "./types";

function createSnapshot(
  overrides: Partial<DashboardSnapshot> = {},
): DashboardSnapshot {
  return {
    baseUrl: "https://48.tryambakam.space",
    hasCredentials: false,
    cacheState: "empty",
    source: "empty",
    workflows: [],
    engines: [],
    readings: [],
    readingStats: [],
    rateLimit: {},
    timestamps: {},
    syncIssues: [],
    ...overrides,
  };
}

test("buildAccessContext gives Witness users Daily Ritual and Ambient Companion only", () => {
  const access = buildAccessContext({
    apiKeyStorageMode: "none",
    requestedExecutionRoute: "selemene",
  });

  assert.equal(access.mode, "witness");
  assert.equal(access.hasAccessKey, false);
  assert.equal(access.effectiveExecutionRoute, "selemene");
  assert.equal(access.canUseDailyRitual, true);
  assert.equal(access.canUseAmbientCompanion, true);
  assert.equal(access.canUseEngineWorkbench, false);
});

test("buildAccessContext gives API-key users all three lanes", () => {
  const access = buildAccessContext({
    apiKeyStorageMode: "preference",
    requestedExecutionRoute: "selemene",
  });

  assert.equal(access.mode, "admin");
  assert.equal(access.hasAccessKey, true);
  assert.equal(access.effectiveExecutionRoute, "selemene");
  assert.equal(access.canUseDailyRitual, true);
  assert.equal(access.canUseAmbientCompanion, true);
  assert.equal(access.canUseEngineWorkbench, true);
});

test("getEffectiveExecutionRoute never silently changes the requested route", () => {
  assert.equal(getEffectiveExecutionRoute("selemene", false), "selemene");
  assert.equal(getEffectiveExecutionRoute("selemene", true), "selemene");
  assert.equal(getEffectiveExecutionRoute("witness", false), "witness");
});

test("snapshot access falls back to credential state for older cached snapshots", () => {
  assert.equal(canUseEngineWorkbench(createSnapshot()), false);
  assert.equal(
    getSnapshotAccess(createSnapshot({ hasCredentials: true })).mode,
    "admin",
  );
});
