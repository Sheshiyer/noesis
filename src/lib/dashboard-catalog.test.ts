import assert from "node:assert/strict";
import test from "node:test";
import {
  getDashboardEngines,
  getDashboardWorkflows,
} from "./dashboard-catalog";
import { DashboardSnapshot } from "./types";

function createSnapshot(
  overrides: Partial<DashboardSnapshot> = {},
): DashboardSnapshot {
  return {
    baseUrl: "https://48.tryambakam.space",
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

test("getDashboardEngines keeps the full catalog while ordering active engines first", () => {
  const snapshot = createSnapshot({
    engines: [
      { id: "panchanga", name: "Panchanga", requiredPhase: 0 },
      { id: "biorhythm", name: "Biorhythm", requiredPhase: 0 },
      { id: "vedic-clock", name: "Vedic Clock", requiredPhase: 2 },
      { id: "numerology", name: "Numerology", requiredPhase: 1 },
      { id: "tarot", name: "Tarot", requiredPhase: 0 },
      { id: "human-design", name: "Human Design", requiredPhase: 1 },
    ],
    readingStats: [
      { engineId: "vedic-clock", count: 3 },
      { engineId: "tarot", count: 1 },
    ],
    usage: {
      userId: "user-1",
      daily: { total: 5, success: 5, failure: 0 },
      monthly: { total: 30, success: 30, failure: 0 },
      engineBreakdown: [
        { engineId: "biorhythm", requestCount: 9 },
        { engineId: "panchanga", requestCount: 4 },
      ],
      fetchedAt: "2026-05-01T00:00:00Z",
    },
  });

  const engines = getDashboardEngines(snapshot);

  assert.equal(engines.length, 6);
  assert.deepEqual(
    engines.map((engine) => engine.id),
    [
      "biorhythm",
      "panchanga",
      "vedic-clock",
      "tarot",
      "human-design",
      "numerology",
    ],
  );
});

test("getDashboardWorkflows keeps the full catalog while ordering larger flows first", () => {
  const snapshot = createSnapshot({
    workflows: [
      {
        id: "single-checkin",
        name: "Single Check-In",
        description: "Focused",
        engineCount: 1,
        engineIds: ["panchanga"],
      },
      {
        id: "daily-practice",
        name: "Daily Practice",
        description: "Composite",
        engineCount: 3,
        engineIds: ["biorhythm", "vedic-clock", "panchanga"],
      },
      {
        id: "full-portrait",
        name: "Full Portrait",
        description: "Orchestration",
        engineCount: 6,
        engineIds: ["a", "b", "c", "d", "e", "f"],
      },
      {
        id: "deep-dive",
        name: "Deep Dive",
        description: "Composite",
        engineCount: 3,
        engineIds: ["numerology", "tarot", "human-design"],
      },
    ],
  });

  const workflows = getDashboardWorkflows(snapshot);

  assert.equal(workflows.length, 4);
  assert.deepEqual(
    workflows.map((workflow) => workflow.id),
    ["full-portrait", "daily-practice", "deep-dive", "single-checkin"],
  );
});
