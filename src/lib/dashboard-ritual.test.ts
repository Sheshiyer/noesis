import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecommendedNowItems,
  deriveContextQuality,
  getPulseInputKinds,
} from "./dashboard-ritual";
import { DashboardSnapshot, MenuBarInsightSnapshot } from "./types";

function createSnapshot(
  overrides: Partial<DashboardSnapshot> = {},
): DashboardSnapshot {
  return {
    baseUrl: "https://selemene.tryambakam.space",
    hasCredentials: true,
    cacheState: "fresh",
    source: "live",
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

test("deriveContextQuality reports complete when date, time, timezone, and coordinates exist", () => {
  const snapshot = createSnapshot({
    profile: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Witness User",
      tier: "pro",
      consciousnessLevel: 3,
      experiencePoints: 144,
      birthDate: "1991-08-24",
      birthTime: "03:45",
      birthLocation: {
        latitude: 12.9716,
        longitude: 77.5946,
      },
      timezone: "Asia/Kolkata",
      preferences: {},
      fetchedAt: "2026-05-01T00:00:00Z",
    },
  });

  const quality = deriveContextQuality(snapshot);
  assert.equal(quality.status, "complete");
  assert.equal(quality.label, "Complete");
  assert.deepEqual(quality.missingFields, []);
});

test("deriveContextQuality reports usable when only date and timezone exist", () => {
  const snapshot = createSnapshot({
    profile: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Witness User",
      tier: "pro",
      consciousnessLevel: 3,
      experiencePoints: 144,
      birthDate: "1991-08-24",
      timezone: "Asia/Kolkata",
      preferences: {},
      fetchedAt: "2026-05-01T00:00:00Z",
    },
  });

  const quality = deriveContextQuality(snapshot);
  assert.equal(quality.status, "usable");
  assert.equal(quality.label, "Usable");
  assert.deepEqual(quality.missingFields, ["birth time", "coordinates"]);
});

test("deriveContextQuality reports partial when timezone is missing", () => {
  const snapshot = createSnapshot({
    profile: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Witness User",
      tier: "pro",
      consciousnessLevel: 3,
      experiencePoints: 144,
      birthDate: "1991-08-24",
      preferences: {},
      fetchedAt: "2026-05-01T00:00:00Z",
    },
  });

  const quality = deriveContextQuality(snapshot);
  assert.equal(quality.status, "partial");
  assert.equal(quality.label, "Partial");
  assert.deepEqual(quality.missingFields, [
    "birth time",
    "timezone",
    "coordinates",
  ]);
});

test("buildRecommendedNowItems returns the deterministic ritual-first set", () => {
  const snapshot = createSnapshot({
    profile: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Witness User",
      tier: "pro",
      consciousnessLevel: 3,
      experiencePoints: 144,
      birthDate: "1991-08-24",
      timezone: "Asia/Kolkata",
      preferences: {
        default_workflow: "custom-flow",
      },
      fetchedAt: "2026-05-01T00:00:00Z",
    },
    workflows: [
      {
        id: "custom-flow",
        name: "Custom Flow",
        description: "Profile override workflow",
        engineCount: 2,
        engineIds: ["biorhythm", "nadabrahman"],
      },
      {
        id: "daily-practice",
        name: "Daily Practice",
        description: "Daily fallback ritual",
        engineCount: 3,
        engineIds: ["vedic-clock", "biorhythm", "vimshottari"],
      },
    ],
  });

  const insights: Partial<Record<string, MenuBarInsightSnapshot>> = {
    nadabrahman: {
      kind: "nadabrahman",
      engineId: "nadabrahman",
      title: "Shubhapantuvarali",
      summary: "Deep inward remedy for the current cadence.",
      payload: {},
      fetchedAt: "2026-05-01T00:00:00Z",
      refreshAfter: "2026-05-01T02:00:00Z",
    },
    biorhythm: {
      kind: "biorhythm",
      engineId: "biorhythm",
      title: "Energy 72%",
      summary: "Physical 81% · Emotional 68% · Intellectual 67%",
      payload: {},
      fetchedAt: "2026-05-01T00:00:00Z",
      refreshAfter: "2026-05-01T02:00:00Z",
    },
  };

  const items = buildRecommendedNowItems(snapshot, insights, "biorhythm");

  assert.deepEqual(
    items.map((item) => item.id),
    ["daily-witness", "daily-practice", "nadabrahman-remedy", "source-pulse"],
  );
  assert.equal(items[0]?.workflowId, "custom-flow");
  assert.equal(items[1]?.workflowId, "daily-practice");
  assert.equal(items[2]?.engineId, "nadabrahman");
  assert.equal(items[3]?.engineId, "biorhythm");
});

test("getPulseInputKinds preserves the explicit remedy support order", () => {
  assert.deepEqual(getPulseInputKinds(), [
    "vedicClock",
    "biorhythm",
    "vimshottari",
  ]);
});
