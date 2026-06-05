import React from "react";
import { Icon } from "@raycast/api";
import { DailyRitualCommand } from "./components/daily-ritual-command";
import { DEFAULT_DAILY_WITNESS_WORKFLOW_ID } from "./lib/daily-witness";

export default function DailyPractice() {
  return (
    <DailyRitualCommand
      commandTitle="Daily Practice"
      forcedWorkflowId={DEFAULT_DAILY_WITNESS_WORKFLOW_ID}
      primaryIcon={Icon.Play}
    />
  );
}
