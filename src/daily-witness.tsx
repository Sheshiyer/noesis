import React from "react";
import { Icon } from "@raycast/api";
import { DailyRitualCommand } from "./components/daily-ritual-command";

export default function DailyWitness() {
  return (
    <DailyRitualCommand commandTitle="Daily Witness" primaryIcon={Icon.Eye} />
  );
}
