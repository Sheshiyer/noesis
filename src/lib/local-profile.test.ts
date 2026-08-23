import assert from "node:assert/strict";
import test from "node:test";
import * as raycastApi from "@raycast/api";
import {
  readLocalProfileSnapshot,
  saveLocalProfileSnapshot,
} from "./local-profile";

test("local ritual profile stores Witness-safe defaults without an access key", async () => {
  (raycastApi as { __resetLocalStorage?: () => void }).__resetLocalStorage?.();

  const saved = await saveLocalProfileSnapshot({
    fullName: "Witness User",
    birthDate: "1991-08-24",
    birthTime: "03:45",
    birthLocation: {
      latitude: 12.9716,
      longitude: 77.5946,
      name: "Bengaluru, India",
    },
    timezone: "Asia/Kolkata",
    preferences: {
      default_workflow: "daily-practice",
      precision: "high",
    },
  });
  const loaded = await readLocalProfileSnapshot();

  assert.equal(saved.id, "local-ritual-defaults");
  assert.equal(loaded?.fullName, "Witness User");
  assert.equal(loaded?.tier, "witness");
  assert.equal(loaded?.birthLocation?.name, "Bengaluru, India");
  assert.equal(loaded?.preferences.default_workflow, "daily-practice");
});
