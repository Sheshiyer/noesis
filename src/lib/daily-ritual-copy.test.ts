import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRitualLoadingMarkdown,
  buildRitualProcessingMessages,
  getRitualProcessingTitle,
} from "./daily-ritual-copy";

test("getRitualProcessingTitle uses the receiving language for in-flight runs", () => {
  assert.equal(
    getRitualProcessingTitle("Daily Witness"),
    "Receiving Daily Witness…",
  );
});

test("buildRitualProcessingMessages uses Noesis vocabulary without banned filler", () => {
  const messages = buildRitualProcessingMessages("Daily Practice");

  assert.deepEqual(messages, [
    "Triangulating the witness prompt.",
    "Daily Practice is checking engine coherence.",
    "Running field cartography across the reading.",
    "Arbitrating the pattern into one readable signal.",
    "Letting the structure settle before language.",
  ]);

  for (const banned of [
    "journey",
    "path",
    "healing",
    "manifesting",
    "optimization",
    "hacks",
    "productivity",
  ]) {
    assert.equal(
      messages.some((message) =>
        message.toLowerCase().includes(banned.toLowerCase()),
      ),
      false,
    );
  }
});

test("buildRitualLoadingMarkdown builds a dedicated loading screen", () => {
  const messages = buildRitualProcessingMessages("Daily Practice");
  const markdown = buildRitualLoadingMarkdown({
    commandTitle: "Daily Witness",
    workflowId: "daily-practice",
    workflowName: "Daily Practice",
    routeLabel: "Witness Gateway",
    contextQualityLabel: "Complete",
    currentMessage: messages[2]!,
    messages,
    subjectSummary: "1991-08-13 at 13:31 · Asia/Calcutta · 12.9716, 77.5946",
  });

  assert.match(markdown, /# Receiving Daily Witness…/);
  assert.match(
    markdown,
    /Daily Practice is resolving the current pattern through Witness Gateway\./,
  );
  assert.match(markdown, /## Current Step/);
  assert.match(markdown, /## Signal Path/);
  assert.match(
    markdown,
    /\*\*Running field cartography across the reading\.\*\*/,
  );
  assert.match(markdown, /## Context/);
  assert.match(markdown, /- Workflow: Daily Practice \(daily-practice\)/);
  assert.match(
    markdown,
    /- Subject: 1991-08-13 at 13:31 · Asia\/Calcutta · 12\.9716, 77\.5946/,
  );
});
