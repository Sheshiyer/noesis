/**
 * Integration test: NadaBrahman engine via Raycast extension formatters
 *
 * Run with:
 *   API_KEY=nk_xxx BASE_URL=http://localhost:8080 npx tsx src/lib/nadabrahman-integration-test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMenuBarInsight,
  buildMenuBarRemedyPlan,
  buildMenuBarTitle,
  buildPulseSubtitle,
} from "./menu-bar-insights";
import { buildEngineResultMarkdown } from "./execution-result-presenter";
import { buildPulseBoardMarkdown } from "./pulse-board-presenter";
import type {
  DashboardSnapshot,
  EngineExecutionResult,
  MenuBarInsightSnapshot,
} from "./types";

const API_KEY = process.env.API_KEY || "";
const BASE_URL = (
  process.env.BASE_URL || "https://selemene.tryambakam.space"
).replace(/\/$/, "");

async function fetchNadabrahman(
  input: Record<string, unknown>,
): Promise<EngineExecutionResult> {
  const res = await fetch(`${BASE_URL}/api/v1/engines/nadabrahman/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const payload = (await res.json()) as Record<string, unknown>;

  return {
    engineId: (payload.engine_id as string) || "nadabrahman",
    result: (payload.result as Record<string, unknown>) || {},
    witnessPrompt: (payload.witness_prompt as string) || undefined,
    witnessLayer:
      (payload.witness_layer as Record<string, unknown>) || undefined,
    consciousnessLevel:
      typeof payload.consciousness_level === "number"
        ? payload.consciousness_level
        : undefined,
    metadata: (payload.metadata as Record<string, unknown>) || {},
    timestamp: (payload.timestamp as string) || undefined,
    raw: payload,
  };
}

function makeDashboardSnapshot(): DashboardSnapshot {
  return {
    baseUrl: BASE_URL,
    hasCredentials: Boolean(API_KEY),
    cacheState: "fresh",
    source: "live",
    health: {
      status: "ok",
      version: "3.1.0",
      uptimeSeconds: 999,
      enginesLoaded: 18,
      workflowsLoaded: 6,
      fetchedAt: new Date().toISOString(),
    },
    profile: {
      id: "test-user",
      email: "test@tryambakam.com",
      fullName: "Test User",
      tier: "enterprise",
      consciousnessLevel: 2,
      experiencePoints: 100,
      birthDate: "1990-06-15",
      birthTime: "14:30:00",
      birthLocation: {
        latitude: 28.6139,
        longitude: 77.209,
        name: "New Delhi",
      },
      timezone: "Asia/Kolkata",
      preferences: {},
      fetchedAt: new Date().toISOString(),
    },
    workflows: [],
    engines: [
      {
        id: "nadabrahman",
        name: "NadaBrahman",
        requiredPhase: 0,
        fetchedAt: new Date().toISOString(),
      },
      {
        id: "vedic-clock",
        name: "Vedic Clock",
        requiredPhase: 0,
        fetchedAt: new Date().toISOString(),
      },
      {
        id: "biorhythm",
        name: "Biorhythm",
        requiredPhase: 0,
        fetchedAt: new Date().toISOString(),
      },
    ],
    readings: [],
    readingStats: [],
    rateLimit: {},
    timestamps: {},
    syncIssues: [],
  };
}

test("full integration: fetch nadabrahman from server and format through Raycast pipeline", async () => {
  if (!API_KEY) {
    console.log(
      "⚠️  Skipping live test — set API_KEY env var to run against a real server",
    );
    return;
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Fetch raw engine result from server (same payload Raycast would get)
  const result = await fetchNadabrahman({
    current_time: nowIso,
    birth_data: {
      date: "1990-06-15",
      time: "14:30:00",
      latitude: 28.6139,
      longitude: 77.209,
      timezone: "Asia/Kolkata",
    },
    options: {
      dosha: "vata",
      rasa: "shanta",
      chakra: "heart",
      consciousness_level: 2,
      mode: "pulse-remedy",
    },
  });

  console.log("\n🎵 NadaBrahman Integration Test Results");
  console.log("========================================");
  console.log("Server:", BASE_URL);
  console.log("Engine:", result.engineId);
  console.log("Calc time:", result.metadata?.calculation_time_ms, "ms");
  console.log("Timestamp:", result.timestamp);

  // 2. Build menu-bar insight (same as Raycast menubar.tsx)
  const insight = buildMenuBarInsight("nadabrahman", result, nowIso, false);
  console.log("\n📊 Menu Bar Insight:");
  console.log("  Title:", insight.title);
  console.log("  Subtitle:", insight.subtitle);
  console.log("  Summary:", insight.summary);
  console.log("  Kind:", insight.kind);
  console.log("  EngineId:", insight.engineId);

  assert.ok(insight.title, "Menu bar title should not be empty");
  assert.ok(insight.summary, "Menu bar summary should not be empty");
  assert.strictEqual(insight.kind, "nadabrahman");
  assert.strictEqual(insight.engineId, "nadabrahman");

  // 3. Build dashboard snapshot and derive menu bar title
  const dashboard = makeDashboardSnapshot();
  const insights: Partial<Record<string, MenuBarInsightSnapshot>> = {
    nadabrahman: insight,
  };
  const menuTitle = buildMenuBarTitle(dashboard, insights, "nadabrahman");
  console.log("\n🧭 Menu Bar Title:", menuTitle);
  assert.ok(menuTitle, "Menu bar title should not be empty");

  const subtitle = buildPulseSubtitle(insights, "nadabrahman");
  console.log("🧭 Menu Bar Subtitle:", subtitle);
  assert.ok(subtitle, "Menu bar subtitle should not be empty");

  // 4. Build remedy plan (same as Raycast queries.ts syncMenuBarSnapshot)
  const remedyPlan = buildMenuBarRemedyPlan(
    dashboard,
    insights,
    now,
    false,
    true,
  );
  console.log(
    "\n📋 Remedy Plan:",
    remedyPlan
      ? {
          kind: remedyPlan.kind,
          engineId: remedyPlan.engineId,
          inputKeys: Object.keys(remedyPlan.input),
        }
      : "undefined",
  );

  // 5. Format engine result markdown (same as Raycast dashboard.tsx detail view)
  const markdown = buildEngineResultMarkdown("NadaBrahman Remedy", result, {
    contextLines: [`Requested at ${nowIso}`],
  });
  console.log("\n📝 Engine Result Markdown (first 800 chars):");
  console.log(markdown.slice(0, 800) + (markdown.length > 800 ? "\n..." : ""));
  assert.ok(
    markdown.includes("NadaBrahman"),
    "Markdown should mention NadaBrahman",
  );

  // 6. Format pulse board markdown (same as Raycast dashboard.tsx pulse section)
  const menuBarSnapshot = {
    dashboard,
    insights,
    syncIssues: [],
  };
  const pulseBoard = buildPulseBoardMarkdown(menuBarSnapshot, "nadabrahman");
  console.log("\n📈 Pulse Board Markdown (first 600 chars):");
  console.log(
    pulseBoard.slice(0, 600) + (pulseBoard.length > 600 ? "\n..." : ""),
  );
  assert.ok(
    pulseBoard.includes("NadaBrahman"),
    "Pulse board should mention NadaBrahman",
  );

  // 7. Verify witness prompt
  console.log("\n🪞 Witness Prompt:");
  console.log(result.witnessPrompt);
  assert.ok(result.witnessPrompt, "Witness prompt should exist");
  assert.ok(
    result.witnessPrompt.includes("?"),
    "Witness prompt should contain questions",
  );

  // 8. Verify raga recommendations exist
  const recs = result.result.recommendations;
  assert.ok(Array.isArray(recs), "Recommendations should be an array");
  assert.ok(recs.length > 0, "Should have at least one recommendation");
  console.log(
    "\n🎶 Top Raga:",
    recs[0].raga_name,
    "(#" + recs[0].raga_number + ")",
  );

  console.log("\n✅ All integration assertions passed");
});
