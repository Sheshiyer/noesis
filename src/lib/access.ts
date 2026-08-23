import {
  AccessContext,
  ApiKeyStorageMode,
  DashboardSnapshot,
  ExecutionRouteTarget,
} from "./types";
import {
  getApiKeyStorageMode,
  getEffectiveExecutionRoute,
  getExecutionRoutePreference,
} from "./settings";

const WITNESS_ACCESS: AccessContext = {
  mode: "witness",
  hasAccessKey: false,
  apiKeyStorageMode: "none",
  requestedExecutionRoute: "witness",
  effectiveExecutionRoute: "witness",
  canUseDailyRitual: true,
  canUseAmbientCompanion: true,
  canUseEngineWorkbench: false,
};

export function buildAccessContext({
  apiKeyStorageMode,
  requestedExecutionRoute = "witness",
}: {
  apiKeyStorageMode: ApiKeyStorageMode;
  requestedExecutionRoute?: ExecutionRouteTarget;
}): AccessContext {
  const hasAccessKey = apiKeyStorageMode !== "none";
  return {
    mode: hasAccessKey ? "admin" : "witness",
    hasAccessKey,
    apiKeyStorageMode,
    requestedExecutionRoute,
    effectiveExecutionRoute: getEffectiveExecutionRoute(
      requestedExecutionRoute,
      hasAccessKey,
    ),
    canUseDailyRitual: true,
    canUseAmbientCompanion: true,
    canUseEngineWorkbench: hasAccessKey,
  };
}

export async function resolveAccessContext(): Promise<AccessContext> {
  return buildAccessContext({
    apiKeyStorageMode: await getApiKeyStorageMode(),
    requestedExecutionRoute: getExecutionRoutePreference(),
  });
}

export function getSnapshotAccess(
  snapshot: DashboardSnapshot | null | undefined,
): AccessContext {
  return (
    snapshot?.access ?? {
      ...WITNESS_ACCESS,
      hasAccessKey: Boolean(snapshot?.hasCredentials),
      mode: snapshot?.hasCredentials ? "admin" : "witness",
      canUseEngineWorkbench: Boolean(snapshot?.hasCredentials),
      effectiveExecutionRoute: getEffectiveExecutionRoute(
        getExecutionRoutePreference(),
        Boolean(snapshot?.hasCredentials),
      ),
      requestedExecutionRoute: getExecutionRoutePreference(),
    }
  );
}

export function canUseEngineWorkbench(
  snapshot: DashboardSnapshot | null | undefined,
): boolean {
  return getSnapshotAccess(snapshot).canUseEngineWorkbench;
}

export function getAccessModeLabel(access: AccessContext): string {
  return access.mode === "admin" ? "Operator" : "Witness";
}

export function buildWorkbenchGateMarkdown(feature = "Engine Workbench") {
  return [
    `# ${feature}`,
    "",
    "Witness mode keeps Daily Ritual and Pulse & Remedy available without an access key.",
    "",
    "Add a Tryambakam Noesis access key to unlock operator workbench surfaces: direct engine runs, workflow execution, reading history, raw payload tools, cache inspection, and route diagnostics.",
  ].join("\n");
}
