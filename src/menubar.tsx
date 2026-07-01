import React, { useCallback, useState } from "react";
import {
  Clipboard,
  Icon,
  MenuBarExtra,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { formatRelativeTime, truncate } from "./lib/formatters";
import { buildMenuBarTitle, buildPulseSubtitle } from "./lib/menu-bar-insights";
import {
  clearMenuBarLog,
  getMenuBarLogPath,
  logMenuBar,
} from "./lib/menu-bar-log";
import { clearMenuBarCache, loadMenuBarState } from "./lib/menu-bar-state";
import { openCommand } from "./lib/navigation";
import { getPulseModePreference } from "./lib/settings";

function formatLine(
  label: string,
  value: string | undefined,
  max: number,
): string {
  if (!value) return label;
  return `${label}: ${truncate(value, max - label.length - 2)}`;
}

export default function MenuBar() {
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    data: state,
    isLoading,
    error: loadError,
  } = useCachedPromise(
    async ({ key }: { key: number }) => {
      clearMenuBarLog();
      logMenuBar(`load triggered by key ${key}`);
      const result = await loadMenuBarState({ force: false });
      for (const line of result.logs) {
        logMenuBar(line);
      }
      if (result.loadError) {
        logMenuBar(`loadError: ${result.loadError}`);
      }
      return result;
    },
    [{ key: refreshKey }],
    { keepPreviousData: true },
  );

  const handleRefresh = useCallback(async () => {
    await showToast({
      title: "Refreshing Noesis pulse...",
      style: Toast.Style.Animated,
    });
    try {
      clearMenuBarLog();
      const result = await loadMenuBarState({ force: true });
      for (const line of result.logs) {
        logMenuBar(line);
      }
      if (result.loadError) {
        logMenuBar(`loadError: ${result.loadError}`);
        await showToast({
          title: result.loadError,
          style: Toast.Style.Failure,
        });
      } else if (result.syncError) {
        await showToast({
          title: `Refresh failed: ${result.syncError}`,
          style: Toast.Style.Failure,
        });
      } else {
        await showToast({
          title: state?.insights.nadabrahman
            ? `Refreshed ${state.insights.nadabrahman.title}`
            : "Pulse refreshed",
          style: Toast.Style.Success,
        });
      }
      setRefreshKey((k) => k + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logMenuBar(`handleRefresh error: ${message}`);
      await showToast({
        title: message,
        style: Toast.Style.Failure,
      });
    }
  }, [state?.insights.nadabrahman]);

  const handleClearCache = useCallback(async () => {
    clearMenuBarCache();
    setRefreshKey((k) => k + 1);
    await showToast({
      title: "Cache cleared",
      style: Toast.Style.Success,
    });
  }, []);

  const handleCopyDiagnostics = useCallback(async () => {
    const remedy = state?.insights.nadabrahman;
    const lines = [
      `configFound: ${state?.configFound ?? false}`,
      `loadError: ${state?.loadError ?? loadError?.message ?? "none"}`,
      `syncError: ${state?.syncError ?? "none"}`,
      `dashboardSource: ${state?.dashboard.source ?? "unknown"}`,
      `dashboardCacheState: ${state?.dashboard.cacheState ?? "unknown"}`,
      `insightsCount: ${state ? Object.keys(state.insights).length : 0}`,
      `remedyFetchedAt: ${remedy?.fetchedAt ?? "none"}`,
      `remedyRefreshAfter: ${remedy?.refreshAfter ?? "none"}`,
      `logPath: ${getMenuBarLogPath()}`,
    ];
    await Clipboard.copy(lines.join("\n"));
    await showToast({
      title: "Diagnostics copied",
      style: Toast.Style.Success,
    });
  }, [state, loadError]);

  const dashboard = state?.dashboard;
  const insights = state?.insights ?? {};
  const pulseMode = getPulseModePreference();
  const error = state?.loadError ?? loadError?.message ?? state?.syncError;
  const title = dashboard
    ? buildMenuBarTitle(dashboard, insights, pulseMode, error)
    : "Pulse";
  const pulseSubtitle = buildPulseSubtitle(insights, pulseMode);
  const remedyTitle = insights.nadabrahman?.title ?? "No remedy";
  const remedyWindow = insights.nadabrahman?.subtitle;

  return (
    <MenuBarExtra icon="icon.png" title={title} isLoading={isLoading}>
      {dashboard &&
      !dashboard.hasCredentials &&
      dashboard.source === "empty" ? (
        <>
          <MenuBarExtra.Item
            title="Connect Selemene Engine API Key"
            icon={Icon.Key}
            onAction={() => openCommand("api-key")}
          />
          <MenuBarExtra.Separator />
        </>
      ) : null}

      <MenuBarExtra.Item
        title={formatLine("Current Remedy", remedyTitle, 72)}
        icon={Icon.Music}
      />
      {remedyWindow ? (
        <MenuBarExtra.Item title={formatLine("Window", remedyWindow, 72)} />
      ) : null}
      {pulseSubtitle ? (
        <MenuBarExtra.Item
          title={formatLine("Summary", pulseSubtitle, 72)}
          icon={Icon.AlignLeft}
        />
      ) : null}
      {insights.nadabrahman?.fetchedAt ? (
        <MenuBarExtra.Item
          title={formatLine(
            "Cached",
            formatRelativeTime(insights.nadabrahman.fetchedAt),
            36,
          )}
        />
      ) : null}

      {error ? (
        <>
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title={formatLine("Error", error, 72)}
            icon={Icon.ExclamationMark}
          />
        </>
      ) : null}

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Refresh Pulse"
        icon={Icon.ArrowClockwise}
        onAction={handleRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <MenuBarExtra.Item
        title="Clear Cache & Reload"
        icon={Icon.Trash}
        onAction={handleClearCache}
      />
      <MenuBarExtra.Item
        title="Copy Diagnostics"
        icon={Icon.Clipboard}
        onAction={handleCopyDiagnostics}
      />
      <MenuBarExtra.Item
        title="Open Dashboard"
        icon={Icon.AppWindow}
        onAction={() => openCommand("dashboard")}
      />
      <MenuBarExtra.Item
        title="Open Noesis Menu Log"
        icon={Icon.TextDocument}
        onAction={() => open(getMenuBarLogPath())}
      />
    </MenuBarExtra>
  );
}
