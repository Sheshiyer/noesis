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
import {
  COLOR_ERROR,
  COLOR_SECONDARY,
  COLOR_WARNING,
  goldIcon,
  emeraldIcon,
  indigoIcon,
  violetIcon,
  mutedIcon,
  redIcon,
} from "./lib/design-tokens";
import { formatRelativeTime, truncate } from "./lib/formatters";
import { buildMenuBarTitle, buildPulseSubtitle } from "./lib/menu-bar-insights";
import { canUseEngineWorkbench } from "./lib/access";
import {
  clearMenuBarLog,
  getMenuBarLogPath,
  logMenuBar,
} from "./lib/menu-bar-log";
import { clearMenuBarCache, loadMenuBarState } from "./lib/menu-bar-state";
import { openCommand } from "./lib/navigation";
import {
  getExecutionRoutePreference,
  getPulseModePreference,
} from "./lib/settings";

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

  const hasBirthData = !!dashboard?.profile?.birthDate;
  const canUseWorkbench = canUseEngineWorkbench(dashboard);
  const routeTarget = getExecutionRoutePreference();
  const nadabrahmanSyncIssue = (state?.syncIssues ?? []).find(
    (issue) => issue.resource === "nadabrahman",
  );

  const noRemedyReason = !insights.nadabrahman
    ? (() => {
        if (!hasBirthData) {
          return { icon: Icon.PersonCircle, tintColor: COLOR_SECONDARY, text: "No birth data in Profile" };
        }
        if (nadabrahmanSyncIssue) {
          return {
            icon: Icon.ExclamationMark,
            tintColor: COLOR_ERROR,
            text: "Last remedy attempt failed – see diagnostics",
          };
        }
        const hasSourcePulses = Boolean(
          insights.vedicClock || insights.biorhythm || insights.vimshottari,
        );
        if (!hasSourcePulses) {
          return { icon: Icon.Clock, tintColor: COLOR_SECONDARY, text: "Waiting for pulse sources" };
        }
        if (canUseWorkbench && routeTarget !== "selemene") {
          const routeLabel =
            routeTarget === "witness" ? "Witness" : routeTarget;
          return {
            icon: Icon.ExclamationMark,
            tintColor: COLOR_WARNING,
            text: `Remedy needs Selemene Direct (current: ${routeLabel})`,
          };
        }
        return {
          icon: Icon.ExclamationMark,
          tintColor: COLOR_ERROR,
          text: "Remedy unavailable – try Refresh Pulse",
        };
      })()
    : null;

  return (
    <MenuBarExtra icon="icon.png" title={title} isLoading={isLoading}>
      {dashboard && !canUseWorkbench && !dashboard.profile ? (
        <>
          <MenuBarExtra.Item
            title="Add Ritual Defaults"
            icon={goldIcon(Icon.PersonCircle)}
            onAction={() => openCommand("profile")}
          />
          <MenuBarExtra.Separator />
        </>
      ) : null}

      <MenuBarExtra.Item
        title={formatLine("Current Remedy", remedyTitle, 72)}
        icon={indigoIcon(Icon.Music)}
      />
      {remedyWindow ? (
        <MenuBarExtra.Item title={formatLine("Window", remedyWindow, 72)} />
      ) : null}
      {!insights.nadabrahman && noRemedyReason ? (
        <MenuBarExtra.Item
          title={formatLine("Status", noRemedyReason.text, 72)}
          icon={{ source: noRemedyReason.icon, tintColor: noRemedyReason.tintColor }}
        />
      ) : null}
      {nadabrahmanSyncIssue && !insights.nadabrahman ? (
        <MenuBarExtra.Item
          title={formatLine("Issue", nadabrahmanSyncIssue.message, 72)}
          icon={{ source: Icon.ExclamationMark, tintColor: COLOR_ERROR }}
        />
      ) : null}
      {pulseSubtitle ? (
        <MenuBarExtra.Item
          title={formatLine("Summary", pulseSubtitle, 72)}
          icon={mutedIcon(Icon.AlignLeft)}
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
            icon={redIcon(Icon.ExclamationMark)}
          />
        </>
      ) : null}

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Refresh Pulse"
        icon={goldIcon(Icon.ArrowClockwise)}
        onAction={handleRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <MenuBarExtra.Item
        title="Open Dashboard"
        icon={indigoIcon(Icon.AppWindow)}
        onAction={() => openCommand("dashboard")}
      />
      <MenuBarExtra.Item
        title="Run Daily Witness"
        icon={emeraldIcon(Icon.Eye)}
        onAction={() => openCommand("daily-witness")}
      />
      {canUseWorkbench ? (
        <>
          <MenuBarExtra.Item
            title="Clear Cache & Reload"
            icon={mutedIcon(Icon.Trash)}
            onAction={handleClearCache}
          />
          <MenuBarExtra.Item
            title="Copy Diagnostics"
            icon={mutedIcon(Icon.Clipboard)}
            onAction={handleCopyDiagnostics}
          />
          <MenuBarExtra.Item
            title="Open Noesis Menu Log"
            icon={mutedIcon(Icon.TextDocument)}
            onAction={() => open(getMenuBarLogPath())}
          />
        </>
      ) : null}
    </MenuBarExtra>
  );
}
