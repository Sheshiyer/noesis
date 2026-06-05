import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyWitnessInitialValues,
  DEFAULT_DAILY_WITNESS_WORKFLOW_ID,
  resolveDailyWitnessWorkflowId,
  resolveDailyWitnessWorkflowName,
  serializeExecutionInput,
  toDailyWitnessExecutionInput,
} from "./daily-witness";
import { DashboardSnapshot } from "./types";

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

test("resolveDailyWitnessWorkflowId prefers the profile default workflow", () => {
  const snapshot = createSnapshot({
    profile: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Witness User",
      tier: "pro",
      consciousnessLevel: 3,
      experiencePoints: 144,
      preferences: {
        default_workflow: "witness-daily",
      },
      fetchedAt: "2026-05-01T00:00:00Z",
    },
  });

  assert.equal(resolveDailyWitnessWorkflowId(snapshot), "witness-daily");
});

test("resolveDailyWitnessWorkflowId falls back to daily-practice", () => {
  assert.equal(
    resolveDailyWitnessWorkflowId(createSnapshot()),
    DEFAULT_DAILY_WITNESS_WORKFLOW_ID,
  );
});

test("resolveDailyWitnessWorkflowId honors an explicit workflow override", () => {
  assert.equal(
    resolveDailyWitnessWorkflowId(
      createSnapshot({
        profile: {
          id: "user-1",
          email: "user@example.com",
          fullName: "Witness User",
          tier: "pro",
          consciousnessLevel: 3,
          experiencePoints: 144,
          preferences: {
            default_workflow: "custom-flow",
          },
          fetchedAt: "2026-05-01T00:00:00Z",
        },
      }),
      "daily-practice",
    ),
    "daily-practice",
  );
});

test("resolveDailyWitnessWorkflowName prefers cached workflow metadata", () => {
  const snapshot = createSnapshot({
    workflows: [
      {
        id: "daily-practice",
        name: "Daily Practice",
        description: "Reflection workflow",
        engineCount: 2,
        engineIds: ["biorhythm", "numerology"],
      },
    ],
  });

  assert.equal(
    resolveDailyWitnessWorkflowName(snapshot, "daily-practice"),
    "Daily Practice",
  );
  assert.equal(
    resolveDailyWitnessWorkflowName(snapshot, "witness-daily"),
    "Witness Daily",
  );
});

test("buildDailyWitnessInitialValues reuses profile defaults", () => {
  const snapshot = createSnapshot({
    profile: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Witness User",
      tier: "pro",
      consciousnessLevel: 3,
      experiencePoints: 144,
      birthDate: "1991-08-24",
      birthTime: "03:45:00",
      birthLocation: {
        latitude: 12.9716,
        longitude: 77.5946,
        name: "Bengaluru, India",
      },
      timezone: "Asia/Kolkata",
      preferences: {},
      fetchedAt: "2026-05-01T00:00:00Z",
    },
  });

  assert.deepEqual(buildDailyWitnessInitialValues(snapshot), {
    birthDate: "1991-08-24",
    birthTime: "03:45",
    name: "Witness User",
    latitude: "12.9716",
    longitude: "77.5946",
    timezone: "Asia/Kolkata",
  });
});

test("toDailyWitnessExecutionInput builds a workflow-ready daily request", () => {
  const snapshot = createSnapshot({
    profile: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Witness User",
      tier: "pro",
      consciousnessLevel: 3,
      experiencePoints: 144,
      preferences: {
        precision: "high",
      },
      fetchedAt: "2026-05-01T00:00:00Z",
    },
  });

  const input = toDailyWitnessExecutionInput(
    {
      birthDate: "1991-08-24",
      birthTime: "03:45",
      name: "Witness User",
      latitude: "12.9716",
      longitude: "77.5946",
      timezone: "Asia/Kolkata",
    },
    snapshot,
    "2026-05-01T03:30:00Z",
  );

  assert.deepEqual(input, {
    birthData: {
      name: "Witness User",
      date: "1991-08-24",
      time: "03:45",
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: "Asia/Kolkata",
    },
    currentTime: "2026-05-01T03:30:00Z",
    precision: "High",
    options: {
      mode: "daily",
    },
  });

  assert.deepEqual(serializeExecutionInput(input), {
    birth_data: {
      name: "Witness User",
      date: "1991-08-24",
      time: "03:45",
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: "Asia/Kolkata",
    },
    current_time: "2026-05-01T03:30:00Z",
    precision: "High",
    options: {
      mode: "daily",
    },
  });
});

test("toDailyWitnessExecutionInput rejects partial coordinates", () => {
  assert.throws(
    () =>
      toDailyWitnessExecutionInput(
        {
          birthDate: "1991-08-24",
          birthTime: "",
          name: "",
          latitude: "12.9716",
          longitude: "",
          timezone: "Asia/Kolkata",
        },
        createSnapshot(),
        "2026-05-01T03:30:00Z",
      ),
    /Latitude and longitude must both be provided/,
  );
});
