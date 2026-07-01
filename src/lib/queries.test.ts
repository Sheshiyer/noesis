import { test, expect, mock, afterAll } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { calculateEngine } from "./api";
import { syncMenuBarInsights } from "./queries";
import { DashboardSnapshot } from "./types";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "noesis-queries-test-"));
process.env.NOESIS_TEST_SUPPORT_PATH = tempDir;

const fakeCalculateEngine = mock(async (_config: unknown, engineId: string) => {
  const results: Record<string, Record<string, unknown>> = {
    "vedic-clock": {
      current_organ: {
        organ: "Liver",
        dosha: "Pitta",
        time_window: "01:00-03:00",
      },
      current_dosha: { dosha: "Pitta" },
      recommendation: {},
      timezone: { offset_minutes: 330 },
      calculated_for: "2026-06-30T00:00:00Z",
    },
    biorhythm: {
      physical: { percentage: 80, phase: "high" },
      emotional: { percentage: 60, phase: "low" },
      intellectual: { percentage: 70, phase: "rising" },
      overall_energy: 70,
    },
    vimshottari: {
      current_period: {
        mahadasha: { planet: "Ju" },
        antardasha: { planet: "Sa" },
        pratyantardasha: { planet: "Ma" },
      },
    },
    nadabrahman: {
      time_recommendation: {
        primary_raga: { raga_name: "Bhairavi" },
      },
      recommendations: [],
    },
  };
  return {
    engineId,
    result: results[engineId] ?? {},
    raw: {},
  };
});

function createDashboard(): DashboardSnapshot {
  return {
    baseUrl: "https://selemene.tryambakam.space",
    hasCredentials: true,
    cacheState: "fresh",
    source: "live",
    profile: {
      id: "u1",
      email: "u1@example.com",
      fullName: "Test User",
      tier: "pro",
      consciousnessLevel: 1,
      experiencePoints: 0,
      birthDate: "1991-08-24",
      birthTime: "03:45",
      timezone: "Asia/Kolkata",
      birthLocation: { latitude: 12.97, longitude: 77.59 },
      preferences: {},
      fetchedAt: "2026-06-30T00:00:00Z",
    },
    workflows: [],
    engines: [],
    readings: [],
    readingStats: [],
    rateLimit: {},
    timestamps: {},
    syncIssues: [],
  };
}

test("syncMenuBarInsights computes all insights when forced", async () => {
  const result = await syncMenuBarInsights({
    dashboard: createDashboard(),
    force: true,
    config: {
      baseUrl: "https://selemene.tryambakam.space",
      apiKey: "nk_test",
    },
    calculateEngine: fakeCalculateEngine as typeof calculateEngine,
  });

  expect(result.insights.vedicClock?.title).toBe("Liver · Pitta");
  expect(result.insights.biorhythm?.title).toBe("Energy 70%");
  expect(result.insights.vimshottari?.title).toBe("Ju > Sa > Ma");
  expect(result.insights.nadabrahman?.title).toBe("Bhairavi");
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});
