import { DashboardSnapshot, EngineSummary, WorkflowSummary } from "./types";

export function getDashboardEngines(
  snapshot: DashboardSnapshot,
): EngineSummary[] {
  const engineScores = new Map<string, number>();

  for (const stat of snapshot.readingStats) {
    engineScores.set(stat.engineId, stat.count);
  }

  for (const entry of snapshot.usage?.engineBreakdown ?? []) {
    engineScores.set(
      entry.engineId,
      (engineScores.get(entry.engineId) ?? 0) + entry.requestCount,
    );
  }

  return [...snapshot.engines].sort((left, right) => {
    const scoreDelta =
      (engineScores.get(right.id) ?? 0) - (engineScores.get(left.id) ?? 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const phaseDelta = left.requiredPhase - right.requiredPhase;
    if (phaseDelta !== 0) {
      return phaseDelta;
    }

    return left.name.localeCompare(right.name);
  });
}

export function getDashboardWorkflows(
  snapshot: DashboardSnapshot,
): WorkflowSummary[] {
  return [...snapshot.workflows].sort((left, right) => {
    const spanDelta = right.engineCount - left.engineCount;
    if (spanDelta !== 0) {
      return spanDelta;
    }

    return left.name.localeCompare(right.name);
  });
}
