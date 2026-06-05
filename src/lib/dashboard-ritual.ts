import {
  getPreferredSourceInsight,
  getPulseModeLabel,
  getSelectedSourcePulseKind,
} from "./menu-bar-insights";
import {
  DashboardSnapshot,
  MenuBarInsightKind,
  MenuBarInsightSnapshot,
  PulseModeKind,
  SourcePulseModeKind,
  WorkflowSummary,
} from "./types";
import { DEFAULT_DAILY_WITNESS_WORKFLOW_ID } from "./daily-witness";

export type ContextQualityStatus = "complete" | "usable" | "partial";

export interface ContextQuality {
  status: ContextQualityStatus;
  label: string;
  summary: string;
  missingFields: string[];
}

export interface RecommendedNowItem {
  id:
    | "daily-witness"
    | "daily-practice"
    | "nadabrahman-remedy"
    | "source-pulse";
  title: string;
  subtitle: string;
  summary: string;
  workflowId?: string;
  engineId?: string;
  sourceKind?: SourcePulseModeKind;
}

export function deriveContextQuality(
  snapshot: DashboardSnapshot | null,
): ContextQuality {
  const profile = snapshot?.profile;
  const hasBirthDate = Boolean(profile?.birthDate?.trim());
  const hasBirthTime = Boolean(profile?.birthTime?.trim());
  const hasTimezone = Boolean(profile?.timezone?.trim());
  const hasCoordinates =
    typeof profile?.birthLocation?.latitude === "number" &&
    typeof profile?.birthLocation?.longitude === "number";
  const missingFields = [
    !hasBirthDate ? "birth date" : null,
    !hasBirthTime ? "birth time" : null,
    !hasTimezone ? "timezone" : null,
    !hasCoordinates ? "coordinates" : null,
  ].filter(Boolean) as string[];

  if (hasBirthDate && hasBirthTime && hasTimezone && hasCoordinates) {
    return {
      status: "complete",
      label: "Complete",
      summary:
        "Birth date, birth time, timezone, and coordinates are all ready for precise ritual context.",
      missingFields,
    };
  }

  if (hasBirthDate && hasTimezone) {
    return {
      status: "usable",
      label: "Usable",
      summary:
        "Birth date and timezone are ready. Add birth time and coordinates for more precise remedy guidance.",
      missingFields,
    };
  }

  return {
    status: "partial",
    label: "Partial",
    summary: hasBirthDate
      ? "Add timezone first, then complete birth time and coordinates to strengthen ritual context."
      : "Add birth date and timezone to move from a partial context to a usable ritual context.",
    missingFields,
  };
}

export function buildRecommendedNowItems(
  snapshot: DashboardSnapshot,
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  preferredKind: PulseModeKind,
): RecommendedNowItem[] {
  const contextQuality = deriveContextQuality(snapshot);
  const dailyWitnessWorkflow = resolveDailyWitnessWorkflow(snapshot);
  const dailyPracticeWorkflow = findWorkflowById(
    snapshot,
    DEFAULT_DAILY_WITNESS_WORKFLOW_ID,
  );
  const sourceKind = getSelectedSourcePulseKind(preferredKind);
  const sourceInsight = getPreferredSourceInsight(insights, preferredKind);
  const remedyInsight = insights.nadabrahman;

  return [
    {
      id: "daily-witness",
      title: "Daily Witness",
      subtitle: `${dailyWitnessWorkflow.name} · ${contextQuality.label}`,
      summary:
        "One-tap ritual run from your shared defaults, with editing kept as a secondary path.",
      workflowId: dailyWitnessWorkflow.id,
    },
    {
      id: "daily-practice",
      title: "Daily Practice",
      subtitle: dailyPracticeWorkflow
        ? `${dailyPracticeWorkflow.name} · ${dailyPracticeWorkflow.engineCount} engine(s)`
        : "Default workflow · Check workflow catalog",
      summary: dailyPracticeWorkflow
        ? dailyPracticeWorkflow.description || "Default guided daily workflow."
        : "The default daily practice workflow is not cached yet, but it remains the fallback ritual target.",
      workflowId: DEFAULT_DAILY_WITNESS_WORKFLOW_ID,
    },
    {
      id: "nadabrahman-remedy",
      title: "NadaBrahman Remedy",
      subtitle:
        remedyInsight?.title ??
        `Waiting on ${getPulseModeLabel(sourceKind)} cadence`,
      summary:
        remedyInsight?.summary ??
        "Run or refresh the pulse cadence to derive the current remedy.",
      engineId: "nadabrahman",
    },
    {
      id: "source-pulse",
      title: getPulseModeLabel(sourceKind),
      subtitle:
        sourceInsight?.title ?? `${getPulseModeLabel(sourceKind)} input`,
      summary:
        sourceInsight?.summary ??
        "Source pulse input supporting the current remedy and ritual guidance.",
      engineId: sourceInsight?.engineId ?? toEngineId(sourceKind),
      sourceKind,
    },
  ];
}

export function getPulseInputKinds(): SourcePulseModeKind[] {
  return ["vedicClock", "biorhythm", "vimshottari"];
}

export function resolveDailyWitnessWorkflow(
  snapshot: DashboardSnapshot,
): WorkflowSummary {
  const configured = snapshot.profile?.preferences.default_workflow;
  const configuredId =
    typeof configured === "string" && configured.trim().length > 0
      ? configured.trim()
      : DEFAULT_DAILY_WITNESS_WORKFLOW_ID;

  return (
    findWorkflowById(snapshot, configuredId) ?? {
      id: configuredId,
      name: humanizeIdentifier(configuredId),
      description: "Configured Daily Witness workflow.",
      engineCount: 0,
      engineIds: [],
    }
  );
}

export function findWorkflowById(
  snapshot: DashboardSnapshot,
  workflowId: string,
): WorkflowSummary | undefined {
  return snapshot.workflows.find((workflow) => workflow.id === workflowId);
}

export function toEngineId(kind: SourcePulseModeKind): string {
  switch (kind) {
    case "biorhythm":
      return "biorhythm";
    case "vimshottari":
      return "vimshottari";
    case "vedicClock":
    default:
      return "vedic-clock";
  }
}

function humanizeIdentifier(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
