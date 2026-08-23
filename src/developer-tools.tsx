import React from "react";
import { Action, Icon, List } from "@raycast/api";
import {
  COLOR_SUCCESS,
  COLOR_WARNING,
  COLOR_SECONDARY,
  cosmicHeader,
  sacredSubheader,
  SECTION_DIVIDER,
  goldIcon,
  emeraldIcon,
  indigoIcon,
  violetIcon,
  mutedIcon,
  redIcon,
} from "./lib/design-tokens";
import { WorkbenchAccessGate } from "./components/access-gate";
import { NoesisActionPanel } from "./components/noesis-actions";
import { canUseEngineWorkbench } from "./lib/access";
import {
  formatAbsoluteTime,
  formatCompactCount,
  formatHostLabel,
  formatRateLimit,
  formatRelativeTime,
  formatUptime,
  formatUsageWindow,
  getCacheColor,
  getHealthColor,
  truncate,
} from "./lib/formatters";
import { openCommand } from "./lib/navigation";
import { getExecutionRoutePreference } from "./lib/settings";
import { useDashboardSnapshot } from "./lib/use-dashboard-snapshot";

export default function DeveloperTools() {
  const { snapshot, isLoading, error, reload } = useDashboardSnapshot();
  const executionRoute = getExecutionRoutePreference();
  const executionRouteLabel =
    executionRoute === "witness" ? "Witness Gateway" : "Selemene Direct";

  if (snapshot && !canUseEngineWorkbench(snapshot)) {
    return (
      <WorkbenchAccessGate
        feature="Developer Tools"
        isLoading={isLoading}
        onRefresh={reload}
      />
    );
  }

  if (error && !snapshot) {
    return (
      <List navigationTitle="Developer Tools">
        <List.Item
          title="Unable to load Developer Tools"
          subtitle={error}
          actions={
            <NoesisActionPanel
              onRefresh={reload}
              hideDashboardAction
              snapshot={snapshot}
            />
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Developer Tools"
      searchBarPlaceholder="Inspect connection, routing, cache, and sync diagnostics"
    >
      {snapshot ? (
        <List.Section title="Developer Tools">
          <List.Item
            icon={{
              source: snapshot.hasCredentials ? Icon.Globe : Icon.Key,
              tintColor: snapshot.syncError
                ? COLOR_WARNING
                : snapshot.health
                  ? getHealthColor(snapshot.health.status)
                  : snapshot.hasCredentials
                    ? COLOR_SUCCESS
                    : COLOR_SECONDARY,
            }}
            title={
              snapshot.hasCredentials
                ? "Connection & Routing"
                : "Offline Connection"
            }
            keywords={[
              snapshot.baseUrl,
              formatHostLabel(snapshot.baseUrl),
              snapshot.health?.status ?? "",
              snapshot.syncError ?? "",
              ...snapshot.syncIssues.map((issue) => issue.resource),
            ]}
            accessories={[
              {
                tag: {
                  value: snapshot.hasCredentials
                    ? (snapshot.health?.status?.toUpperCase() ?? "LIVE")
                    : "OFFLINE",
                  color: snapshot.hasCredentials
                    ? snapshot.health
                      ? getHealthColor(snapshot.health.status)
                      : COLOR_SUCCESS
                    : COLOR_WARNING,
                },
              },
              {
                text: formatHostLabel(snapshot.baseUrl),
                tooltip: snapshot.baseUrl,
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={[
                  cosmicHeader("Connection & Routing"),
                  "",
                  snapshot.hasCredentials
                    ? "Operator sync is active. Profile, catalog, and reading refreshes can pull directly from the current Noesis service."
                    : "No access key is connected. Daily Ritual and Pulse & Remedy can still use local ritual defaults through Witness mode.",
                  "",
                  `- Base URL: \`${snapshot.baseUrl}\``,
                  `- Access: ${snapshot.hasCredentials ? "API key connected" : "Cache only"}`,
                  `- Engine and workflow route: ${executionRouteLabel}`,
                  "",
                  "Note: Witness Gateway does not forward your Selemene key for engine calculations (e.g. current raga remedy).",
                  "For key-protected personal remedies in the tray, use 'Selemene Direct'.",
                  snapshot.health
                    ? `- Service: ${snapshot.health.status}`
                    : "- Service: No live health snapshot cached",
                  snapshot.health
                    ? `- Version: ${snapshot.health.version}`
                    : "- Version: Unknown",
                  snapshot.health
                    ? `- Uptime: ${formatUptime(snapshot.health.uptimeSeconds)}`
                    : "- Uptime: Unknown",
                  snapshot.health
                    ? `- Catalog: ${snapshot.health.enginesLoaded} engines / ${snapshot.health.workflowsLoaded} workflows`
                    : `- Catalog cache: ${snapshot.engines.length} engines / ${snapshot.workflows.length} workflows`,
                  `- Rate limit: ${formatRateLimit(snapshot.rateLimit)}`,
                  snapshot.syncError
                    ? `- Sync issue: ${snapshot.syncError}`
                    : "- Sync issue: None",
                  ...(snapshot.syncIssues.length > 0
                    ? [
                        SECTION_DIVIDER,
                        sacredSubheader("Sync Issues"),
                        "",
                        ...snapshot.syncIssues
                          .slice(0, 6)
                          .map(
                            (issue) =>
                              `- ${issue.resource} (${issue.target}): ${issue.message}`,
                          ),
                      ]
                    : []),
                ].join("\n")}
              />
            }
            actions={
              <NoesisActionPanel
                snapshot={snapshot}
                onRefresh={reload}
                hideDashboardAction
                refreshTitle="Refresh Developer Tools"
              >
                <Action
                  title={
                    snapshot.hasCredentials
                      ? "Edit Access Key"
                      : "Connect Access Key"
                  }
                  icon={goldIcon(Icon.Key)}
                  onAction={() => openCommand("api-key")}
                />
              </NoesisActionPanel>
            }
          />
          <List.Item
            icon={goldIcon(Icon.BarChart)}
            title="Usage & Limits"
            accessories={[
              {
                text: snapshot.usage
                  ? formatCompactCount(snapshot.usage.daily.total, "D")
                  : "--",
                tooltip: snapshot.usage
                  ? `Daily ${snapshot.usage.daily.total}`
                  : "No daily usage window cached yet",
              },
              {
                text: snapshot.usage
                  ? formatCompactCount(snapshot.usage.monthly.total, "M")
                  : "--",
                tooltip: snapshot.usage
                  ? `Monthly ${snapshot.usage.monthly.total}`
                  : "No monthly usage window cached yet",
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={[
                  cosmicHeader("Usage & Limits"),
                  "",
                  snapshot.usage
                    ? "Current request volume and engine distribution from the cached usage window."
                    : "No usage snapshot is cached yet. Refresh after reconnecting if you want current request totals.",
                  "",
                  snapshot.usage
                    ? `- Daily: ${formatUsageWindow(snapshot.usage.daily)}`
                    : "- Daily: Unavailable",
                  snapshot.usage
                    ? `- Monthly: ${formatUsageWindow(snapshot.usage.monthly)}`
                    : "- Monthly: Unavailable",
                  snapshot.usage?.engineBreakdown.length
                    ? `- Active engines: ${snapshot.usage.engineBreakdown
                        .slice(0, 5)
                        .map(
                          (entry) =>
                            `${entry.engineId} (${entry.requestCount})`,
                        )
                        .join(", ")}`
                    : "- Active engines: No cached engine breakdown yet",
                  `- Rate limit: ${formatRateLimit(snapshot.rateLimit)}`,
                ].join("\n")}
              />
            }
            actions={
              <NoesisActionPanel
                snapshot={snapshot}
                onRefresh={reload}
                hideDashboardAction
                refreshTitle="Refresh Developer Tools"
              >
                <Action
                  title="Open Readings"
                  icon={goldIcon(Icon.Book)}
                  onAction={() => openCommand("readings")}
                />
                <Action
                  title="Open Workflows"
                  icon={violetIcon(Icon.Network)}
                  onAction={() => openCommand("workflows")}
                />
              </NoesisActionPanel>
            }
          />
          <List.Item
            icon={{
              source: Icon.Circle,
              tintColor: getCacheColor(snapshot.cacheState),
            }}
            title="Cache & Sync"
            keywords={["sqlite", snapshot.cacheState, "cache", snapshot.source]}
            accessories={[
              {
                tag: {
                  value: snapshot.cacheState.toUpperCase(),
                  color: getCacheColor(snapshot.cacheState),
                },
              },
              {
                text: formatRelativeTime(snapshot.timestamps.lastSyncAt),
                tooltip: snapshot.timestamps.lastSyncAt
                  ? `Last sync ${formatAbsoluteTime(snapshot.timestamps.lastSyncAt)}`
                  : "The cache has not been synchronized yet",
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={[
                  cosmicHeader("Cache & Sync"),
                  "",
                  snapshot.syncError ??
                    "The local sqlite cache is active and serving command data first.",
                  "",
                  `- State: ${snapshot.cacheState.toUpperCase()}`,
                  `- Source: ${snapshot.source.toUpperCase()}`,
                  `- Last sync: ${formatRelativeTime(snapshot.timestamps.lastSyncAt)} (${formatAbsoluteTime(snapshot.timestamps.lastSyncAt)})`,
                  `- Service snapshot: ${formatRelativeTime(snapshot.timestamps.service)}`,
                  `- Profile snapshot: ${formatRelativeTime(snapshot.timestamps.profile)}`,
                  `- Usage snapshot: ${formatRelativeTime(snapshot.timestamps.usage)}`,
                  `- Catalog snapshot: ${formatRelativeTime(snapshot.timestamps.catalog)}`,
                  `- Readings snapshot: ${formatRelativeTime(snapshot.timestamps.readings)}`,
                ].join("\n")}
              />
            }
            actions={
              <NoesisActionPanel
                snapshot={snapshot}
                onRefresh={reload}
                hideDashboardAction
                refreshTitle="Refresh Developer Tools"
              >
                <Action
                  title="Open Dashboard"
                  icon={indigoIcon(Icon.AppWindow)}
                  onAction={() => openCommand("dashboard")}
                />
              </NoesisActionPanel>
            }
          />
          {snapshot.syncIssues.length > 0 ? (
            <List.Item
              icon={redIcon(Icon.ExclamationMark)}
              title="Sync Issues"
              subtitle={truncate(
                snapshot.syncIssues
                  .slice(0, 3)
                  .map((issue) => `${issue.resource}: ${issue.message}`)
                  .join(" · "),
                96,
              )}
              accessories={[
                {
                  text: String(snapshot.syncIssues.length),
                  tooltip: `${snapshot.syncIssues.length} issue(s) cached`,
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    cosmicHeader("Sync Issues"),
                    "",
                    ...snapshot.syncIssues.map(
                      (issue) =>
                        `- ${issue.resource} (${issue.target}): ${issue.message}`,
                    ),
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Developer Tools"
                />
              }
            />
          ) : null}
        </List.Section>
      ) : (
        <List.Section title="Developer Tools">
          <List.Item
            title="Loading diagnostics"
            subtitle="Reading cached Noesis developer tools state"
          />
        </List.Section>
      )}
    </List>
  );
}
