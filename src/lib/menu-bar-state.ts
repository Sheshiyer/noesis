import {
  DashboardSnapshot,
  MenuBarInsightKind,
  MenuBarInsightSnapshot,
  SyncIssue,
} from "./types";
import { getStoredConfig, DEFAULT_BASE_URL } from "./settings";
import {
  getCacheDatabasePath,
  syncDashboardSnapshot,
  syncMenuBarInsights,
} from "./queries";
import { mapMenuBarInsights } from "./menu-bar-insights";
import { createNoesisCacheRepository } from "./cache";
import { getReadingHistoryLimitPreference } from "./settings";

export interface MenuBarState {
  dashboard: DashboardSnapshot;
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>;
  syncIssues: SyncIssue[];
  syncError?: string;
  configFound: boolean;
  loadError?: string;
  logs: string[];
}

async function getCacheRepository() {
  return createNoesisCacheRepository(await getCacheDatabasePath(), {
    readingHistoryLimit: getReadingHistoryLimitPreference(),
  });
}

export async function loadMenuBarState(
  options: {
    force?: boolean;
  } = {},
): Promise<MenuBarState> {
  const logs: string[] = [];
  const log = (message: string, data?: unknown) => {
    const line =
      data !== undefined ? `${message} ${JSON.stringify(data)}` : message;
    logs.push(`${new Date().toISOString()} ${line}`);
  };

  try {
    log("loadMenuBarState start", { force: options.force });
    const storedConfig = await getStoredConfig();
    log("config loaded", { found: Boolean(storedConfig) });

    const dashboard = await syncDashboardSnapshot({
      force: options.force ?? false,
    });
    log("dashboard synced", {
      source: dashboard.source,
      cacheState: dashboard.cacheState,
      hasCredentials: dashboard.hasCredentials,
      hasBirthDate: Boolean(dashboard.profile?.birthDate),
    });

    let insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>> =
      {};
    let syncIssues: SyncIssue[] = [];
    let syncError: string | undefined;

    const config = storedConfig ?? {
      baseUrl: dashboard.baseUrl,
      apiKey: "",
    };

    if (dashboard.access?.canUseAmbientCompanion ?? true) {
      const result = await syncMenuBarInsights({
        dashboard,
        force: options.force ?? false,
        config,
      });
      insights = result.insights;
      syncIssues = result.syncIssues;
      syncError = result.syncError;
      log("insights synced", {
        count: Object.keys(insights).length,
        errors: syncIssues.length,
        remedyFetchedAt: insights.nadabrahman?.fetchedAt,
      });
    } else {
      log("skipping insights sync", {
        hasConfig: Boolean(storedConfig),
        hasBirthDate: Boolean(dashboard.profile?.birthDate),
      });
      insights = mapMenuBarInsights(
        (await getCacheRepository()).readMenuBarInsights(),
      );
    }

    return {
      dashboard,
      insights,
      syncIssues,
      syncError,
      configFound: Boolean(storedConfig),
      logs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("loadMenuBarState error", message);
    return {
      dashboard: {
        baseUrl: DEFAULT_BASE_URL,
        hasCredentials: false,
        cacheState: "empty",
        source: "empty",
        health: undefined,
        profile: undefined,
        usage: undefined,
        workflows: [],
        engines: [],
        readings: [],
        readingStats: [],
        rateLimit: {},
        syncIssues: [],
        timestamps: {},
      },
      insights: {},
      syncIssues: [],
      configFound: false,
      loadError: message,
      logs,
    };
  }
}

export async function clearMenuBarCache(): Promise<void> {
  (await getCacheRepository()).clearAll();
}
