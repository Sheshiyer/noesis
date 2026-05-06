import React, { useEffect, useState } from "react";
import { Action, Color, Icon, List } from "@raycast/api";
import {
  EngineExecutionForm,
  WorkflowExecutionForm,
} from "./components/execution-forms";
import { NoesisActionPanel } from "./components/noesis-actions";
import {
  EngineDetailView,
  EnginesBrowser,
  ReadingDetailView,
  ReadingsBrowser,
  WorkflowDetailView,
  WorkflowsBrowser,
} from "./components/noesis-browsers";
import { OnboardingForm } from "./components/onboarding-form";
import { ProfileForm } from "./components/profile-form";
import {
  formatAbsoluteTime,
  formatCompactCount,
  formatCount,
  formatHostLabel,
  formatPhaseBadge,
  formatPhaseLabel,
  formatRateLimit,
  formatReadingSubtitle,
  formatRelativeTime,
  formatTimeUntil,
  formatUptime,
  formatUsageWindow,
  getCacheColor,
  getHealthColor,
  getPhaseColor,
  truncate,
} from "./lib/formatters";
import {
  getDashboardEngines,
  getDashboardWorkflows,
} from "./lib/dashboard-catalog";
import {
  getPreferredInsight,
  getPulseModeLabel,
} from "./lib/menu-bar-insights";
import { openCommand } from "./lib/navigation";
import { buildPulseBoardMarkdown } from "./lib/pulse-board-presenter";
import { readMenuBarSnapshot } from "./lib/queries";
import {
  getExecutionRoutePreference,
  getPulseModePreference,
} from "./lib/settings";
import { useDashboardSnapshot } from "./lib/use-dashboard-snapshot";
import {
  DashboardSnapshot,
  MenuBarInsightKind,
  MenuBarSnapshot,
} from "./lib/types";

export default function Dashboard() {
  const { snapshot, isLoading, error, reload } = useDashboardSnapshot();
  const [menuBarSnapshot, setMenuBarSnapshot] =
    useState<MenuBarSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!snapshot) {
      setMenuBarSnapshot(null);
      return;
    }

    void readMenuBarSnapshot()
      .then((nextSnapshot) => {
        if (!cancelled) {
          setMenuBarSnapshot(nextSnapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMenuBarSnapshot(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    snapshot?.timestamps.lastSyncAt,
    snapshot?.timestamps.profile,
    snapshot?.timestamps.readings,
  ]);

  if (snapshot && !snapshot.hasCredentials && snapshot.source === "empty") {
    return <OnboardingForm onSaved={() => reload(true)} />;
  }

  if (error && !snapshot) {
    return (
      <List navigationTitle="Tryambakam Noesis">
        <List.Item
          title="Unable to load Tryambakam Noesis"
          subtitle={error}
          actions={<NoesisActionPanel onRefresh={reload} hideDashboardAction />}
        />
      </List>
    );
  }

  const dashboardEngines = snapshot ? getDashboardEngines(snapshot) : [];
  const dashboardWorkflows = snapshot ? getDashboardWorkflows(snapshot) : [];
  const recentReadings = snapshot?.readings.slice(0, 6) ?? [];
  const totalReadingCount =
    snapshot?.readingStats.reduce((sum, entry) => sum + entry.count, 0) ?? 0;
  const maxWorkflowSpan = snapshot
    ? Math.max(...snapshot.workflows.map((workflow) => workflow.engineCount), 0)
    : 0;
  const pulseMode = getPulseModePreference();
  const executionRoute = getExecutionRoutePreference();
  const executionRouteLabel =
    executionRoute === "witness" ? "Witness Gateway" : "Selemene Direct";
  const pulseModeLabel = getPulseModeLabel(pulseMode);
  const pulseBoardSnapshot = snapshot
    ? (menuBarSnapshot ?? {
        dashboard: snapshot,
        insights: {},
        syncIssues: [],
      })
    : null;
  const currentPulse = getPreferredInsight(
    pulseBoardSnapshot?.insights ?? {},
    pulseMode,
  );
  const pulseRemedy = pulseBoardSnapshot?.insights.nadabrahman;
  const pulseKind = currentPulse?.kind ?? pulseMode;
  const pulseTitle =
    currentPulse?.title ?? getPulsePendingTitle(pulseModeLabel, snapshot);
  const pulseDetailSummary =
    pulseRemedy?.summary ??
    currentPulse?.summary ??
    getPulsePendingSummary(pulseModeLabel, snapshot);
  const pulseEngine =
    snapshot && currentPulse
      ? snapshot.engines.find((engine) => engine.id === currentPulse.engineId)
      : undefined;
  const pulseRemedyEngine = snapshot
    ? snapshot.engines.find((engine) => engine.id === "nadabrahman")
    : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Tryambakam Noesis"
      searchBarPlaceholder="Search pulse, flows, engines, and readings"
    >
      {snapshot ? (
        <>
          <List.Section title="Practice">
            <List.Item
              icon={{
                source: Icon.PersonCircle,
                tintColor: snapshot.profile ? Color.Blue : Color.Orange,
              }}
              title={{
                value: "Your Profile",
                tooltip:
                  snapshot.profile?.fullName ??
                  "Set shared birth data, timezone, and reusable witness defaults.",
              }}
              keywords={[
                "profile",
                snapshot.profile?.fullName ?? "",
                snapshot.profile?.email ?? "",
                snapshot.profile?.timezone ?? "",
              ]}
              accessories={[
                {
                  tag: {
                    value: snapshot.profile ? "READY" : "SETUP",
                    color: snapshot.profile ? Color.Green : Color.Orange,
                  },
                },
                {
                  text: snapshot.profile?.timezone ?? "No TZ",
                  tooltip:
                    snapshot.profile?.timezone ?? "Timezone not configured",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Your Profile",
                    "",
                    "Keep your birth data and timezone ready so every reading starts from the same witness context.",
                    "",
                    snapshot.profile
                      ? `- Active operator: ${snapshot.profile.fullName}`
                      : "- No live profile cached yet. Onboarding or a refresh will pull it in once authenticated.",
                    snapshot.profile?.tier
                      ? `- Access tier: ${snapshot.profile.tier}`
                      : "- Access tier unknown",
                    snapshot.profile?.birthDate
                      ? `- Birth date: ${snapshot.profile.birthDate}`
                      : "- Birth date not set",
                    snapshot.profile?.timezone
                      ? `- Timezone: ${snapshot.profile.timezone}`
                      : "- Timezone not set",
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                  <Action.Push
                    title="Edit Profile Defaults"
                    icon={Icon.Pencil}
                    target={<ProfileForm snapshot={snapshot} />}
                  />
                  <Action
                    title="Open Profile Command"
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                    onAction={() => openCommand("profile")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={Icon.Stars}
              title={{
                value: "Explore Engines",
                tooltip:
                  "Run individual Selemene engines and inspect phase coverage.",
              }}
              keywords={["engines", "console", "catalog", "phases"]}
              accessories={[
                {
                  text: formatCompactCount(snapshot.engines.length, "E"),
                  tooltip: `${snapshot.engines.length} engines cached locally`,
                },
                {
                  text: formatCompactCount(totalReadingCount, "R"),
                  tooltip: `${totalReadingCount} cached readings across engine history`,
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Explore Engines",
                    "",
                    "Browse the full engine library, run individual readings, and inspect past outputs without leaving the extension.",
                    "",
                    `- ${formatCount(snapshot.engines.length, "engine")} in the current cache`,
                    `- ${formatCount(totalReadingCount, "reading")} represented across engine stats`,
                    "",
                    "Inside the engine console, Enter opens the execution form instead of refreshing the dashboard.",
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                  <Action.Push
                    title="Open Engine Library"
                    icon={Icon.ArrowRightCircle}
                    target={
                      <EnginesBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                  <Action
                    title="Open Engines Command"
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => openCommand("engines")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={Icon.Network}
              title={{
                value: "Guided Flows",
                tooltip:
                  "Inspect composite orchestration chains and launch multi-engine readings.",
              }}
              keywords={["workflows", "studio", "chains", "orchestration"]}
              accessories={[
                {
                  text: formatCompactCount(snapshot.workflows.length, "W"),
                  tooltip: `${snapshot.workflows.length} workflows cached locally`,
                },
                {
                  text: maxWorkflowSpan
                    ? formatCompactCount(maxWorkflowSpan, "E")
                    : "--",
                  tooltip: maxWorkflowSpan
                    ? `Largest workflow spans ${maxWorkflowSpan} engines`
                    : "No workflow span cached yet",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Guided Flows",
                    "",
                    "Move through curated multi-engine practices when you want a fuller reading rather than a single engine pass.",
                    "",
                    `- ${formatCount(snapshot.workflows.length, "workflow")} cached locally`,
                    `- Largest workflow spans ${maxWorkflowSpan} engines`,
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                  <Action.Push
                    title="Open Guided Flows"
                    icon={Icon.ArrowRightCircle}
                    target={
                      <WorkflowsBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                  <Action
                    title="Open Workflows Command"
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd"], key: "w" }}
                    onAction={() => openCommand("workflows")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={Icon.Book}
              title={{
                value: "Reading Archive",
                tooltip:
                  "Inspect recent witness prompts, payloads, and cached outcomes.",
              }}
              keywords={["readings", "archive", "history", "results"]}
              accessories={[
                {
                  text: formatCompactCount(snapshot.readings.length, "R"),
                  tooltip: `${snapshot.readings.length} recent readings in local history`,
                },
                {
                  text: formatRelativeTime(snapshot.timestamps.readings),
                  tooltip: `Latest sync ${formatAbsoluteTime(snapshot.timestamps.readings)}`,
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Reading Archive",
                    "",
                    "Return to previous readings, witness responses, and stored results from earlier sessions.",
                    "",
                    `- ${formatCount(snapshot.readings.length, "recent reading")} in the local history window`,
                    `- Latest sync landed ${formatRelativeTime(snapshot.timestamps.readings)}`,
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                  <Action.Push
                    title="Open Reading Archive"
                    icon={Icon.ArrowRightCircle}
                    target={
                      <ReadingsBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                  <Action
                    title="Open Readings Command"
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => openCommand("readings")}
                  />
                </NoesisActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Pulse">
            <List.Item
              icon={{
                source: getPulseIcon(pulseKind),
                tintColor: getPulseColor(pulseKind),
              }}
              title={{
                value: pulseTitle,
                tooltip: [
                  pulseModeLabel,
                  pulseTitle,
                  currentPulse?.subtitle,
                  pulseRemedy?.title,
                  pulseDetailSummary,
                ]
                  .filter(Boolean)
                  .join("\n"),
              }}
              keywords={[
                pulseModeLabel,
                currentPulse?.engineId ?? "",
                pulseRemedy?.engineId ?? "",
                pulseTitle,
                pulseRemedy?.title ?? "",
                pulseDetailSummary,
              ]}
              accessories={[
                {
                  tag: {
                    value: pulseModeLabel,
                    color: getPulseColor(pulseKind),
                  },
                },
                {
                  text: currentPulse
                    ? formatTimeUntil(currentPulse.refreshAfter)
                    : snapshot.profile?.birthDate || pulseMode === "vedicClock"
                      ? "Sync"
                      : "Profile",
                  tooltip: currentPulse
                    ? `Refreshes in ${formatTimeUntil(currentPulse.refreshAfter)}`
                    : snapshot.profile?.birthDate || pulseMode === "vedicClock"
                      ? "Refresh the pulse cache to surface the current title."
                      : "Add birth data in Profile to unlock this pulse mode.",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={buildPulseBoardMarkdown(
                    pulseBoardSnapshot,
                    pulseMode,
                  )}
                />
              }
              actions={
                <NoesisActionPanel
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Pulse"
                >
                  {pulseEngine ? (
                    <Action.Push
                      title="Run Pulse Engine"
                      icon={Icon.Play}
                      target={
                        <EngineExecutionForm
                          engine={pulseEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  {pulseEngine ? (
                    <Action.Push
                      title="View Pulse Engine"
                      icon={Icon.ArrowRightCircle}
                      target={
                        <EngineDetailView
                          engine={pulseEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  {pulseRemedyEngine ? (
                    <Action.Push
                      title="Run Nada Brahman Remedy"
                      icon={Icon.Music}
                      target={
                        <EngineExecutionForm
                          engine={pulseRemedyEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  {pulseRemedyEngine ? (
                    <Action.Push
                      title="View Nada Brahman Engine"
                      icon={Icon.ArrowRightCircle}
                      target={
                        <EngineDetailView
                          engine={pulseRemedyEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  {!pulseEngine ? (
                    <Action.Push
                      title="Edit Profile"
                      icon={Icon.Pencil}
                      target={<ProfileForm snapshot={snapshot} />}
                    />
                  ) : null}
                  <Action.Push
                    title="Browse Engines"
                    icon={Icon.AppWindowList}
                    target={
                      <EnginesBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={{
                source: Icon.Music,
                tintColor: Color.Blue,
              }}
              title={{
                value: pulseRemedy?.title ?? getRemedyPendingTitle(snapshot),
                tooltip: [
                  pulseRemedy?.title,
                  pulseRemedy?.subtitle,
                  pulseRemedy?.summary,
                ]
                  .filter(Boolean)
                  .join("\n"),
              }}
              keywords={[
                "nadabrahman",
                "remedy",
                pulseRemedy?.title ?? "",
                pulseRemedy?.summary ?? "",
              ]}
              accessories={[
                {
                  tag: {
                    value: "REMEDY",
                    color: Color.Blue,
                  },
                },
                {
                  text: pulseRemedy
                    ? formatTimeUntil(pulseRemedy.refreshAfter)
                    : snapshot.profile?.birthDate
                      ? "Sync"
                      : "Profile",
                  tooltip: pulseRemedy
                    ? `Refreshes in ${formatTimeUntil(pulseRemedy.refreshAfter)}`
                    : snapshot.profile?.birthDate
                      ? "Refresh the pulse cache to derive the latest remedy."
                      : "Add birth data in Profile to unlock the derived remedy.",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# NadaBrahman Remedy",
                    "",
                    pulseRemedy
                      ? "Derived from the current pulse cadence to give you the raga or sonic direction most aligned with this moment."
                      : getRemedyPendingSummary(snapshot),
                    "",
                    pulseRemedy?.title
                      ? `- Current raga: ${pulseRemedy.title}`
                      : null,
                    pulseRemedy?.subtitle
                      ? `- Listening window: ${pulseRemedy.subtitle}`
                      : null,
                    pulseRemedy?.summary
                      ? `- Remedy note: ${pulseRemedy.summary}`
                      : null,
                    currentPulse?.title
                      ? `- Derived from: ${pulseModeLabel} · ${currentPulse.title}`
                      : null,
                    pulseRemedy?.fetchedAt
                      ? `- Cached: ${formatRelativeTime(pulseRemedy.fetchedAt)} (${formatAbsoluteTime(pulseRemedy.fetchedAt)})`
                      : null,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                />
              }
              actions={
                <NoesisActionPanel
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Pulse"
                >
                  {pulseRemedyEngine ? (
                    <Action.Push
                      title="Run Nada Brahman Remedy"
                      icon={Icon.Play}
                      target={
                        <EngineExecutionForm
                          engine={pulseRemedyEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  {pulseRemedyEngine ? (
                    <Action.Push
                      title="View Nada Brahman Engine"
                      icon={Icon.ArrowRightCircle}
                      target={
                        <EngineDetailView
                          engine={pulseRemedyEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  {!pulseRemedyEngine ? (
                    <Action.Push
                      title="Edit Profile"
                      icon={Icon.Pencil}
                      target={<ProfileForm snapshot={snapshot} />}
                    />
                  ) : null}
                </NoesisActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Developer Tools">
            <List.Item
              icon={{
                source: snapshot.hasCredentials ? Icon.Globe : Icon.Key,
                tintColor: snapshot.syncError
                  ? Color.Orange
                  : snapshot.health
                    ? getHealthColor(snapshot.health.status)
                    : snapshot.hasCredentials
                      ? Color.Green
                      : Color.SecondaryText,
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
                        : Color.Green
                      : Color.Orange,
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
                    "# Connection & Routing",
                    "",
                    snapshot.hasCredentials
                      ? "Live sync is active. Profile, catalog, and reading refreshes can pull directly from the Selemene Engine."
                      : "No live key is connected. The dashboard is operating from the local cache until the API Key command reconnects the engine.",
                    "",
                    `- Base URL: \`${snapshot.baseUrl}\``,
                    `- Access: ${snapshot.hasCredentials ? "API key connected" : "Cache only"}`,
                    `- Engine/workflow route: ${executionRouteLabel}`,
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
                          "",
                          "## Sync Issues",
                          "",
                          ...snapshot.syncIssues
                            .slice(0, 4)
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
                    icon={Icon.Key}
                    onAction={() => openCommand("api-key")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={Icon.BarChart}
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
                    "# Usage & Limits",
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
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Developer Tools"
                >
                  <Action.Push
                    title="Browse Readings"
                    icon={Icon.Book}
                    target={
                      <ReadingsBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                  <Action.Push
                    title="Browse Workflows"
                    icon={Icon.Network}
                    target={
                      <WorkflowsBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
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
              keywords={[
                "sqlite",
                snapshot.cacheState,
                "cache",
                snapshot.source,
              ]}
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
                    "# Cache & Sync",
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
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Developer Tools"
                />
              }
            />
          </List.Section>

          {dashboardEngines.length ? (
            <List.Section title="Engine Library">
              {dashboardEngines.map((engine) => (
                <List.Item
                  key={engine.id}
                  icon={{
                    source: Icon.Stars,
                    tintColor: getPhaseColor(engine.requiredPhase),
                  }}
                  title={{
                    value: engine.name,
                    tooltip: `${engine.name}\n${engine.id}`,
                  }}
                  keywords={[
                    engine.id,
                    engine.name,
                    formatPhaseLabel(engine.requiredPhase),
                  ]}
                  accessories={[
                    {
                      tag: {
                        value: formatPhaseBadge(engine.requiredPhase),
                        color: getPhaseColor(engine.requiredPhase),
                      },
                      tooltip: formatPhaseLabel(engine.requiredPhase),
                    },
                    {
                      text: formatCompactCount(
                        getReadingCount(snapshot, engine.id),
                        "R",
                      ),
                      tooltip: `${getReadingCount(snapshot, engine.id)} cached readings`,
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={[
                        `# ${engine.name}`,
                        "",
                        `\`${engine.id}\``,
                        "",
                        `${formatCount(getReadingCount(snapshot, engine.id), "cached reading")} in the current dashboard snapshot.`,
                        "",
                        "This main dashboard section now shows the full cached engine catalog. Enter opens the execution form, with engine detail still available as a secondary action.",
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                      <Action.Push
                        title="Run Engine"
                        icon={Icon.Play}
                        target={
                          <EngineExecutionForm
                            engine={engine}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="View Engine"
                        icon={Icon.ArrowRightCircle}
                        target={
                          <EngineDetailView
                            engine={engine}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="Browse Engines"
                        icon={Icon.AppWindowList}
                        target={
                          <EnginesBrowser
                            initialSnapshot={snapshot}
                            syncOnMount={false}
                          />
                        }
                      />
                    </NoesisActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}

          {dashboardWorkflows.length ? (
            <List.Section title="Flow Library">
              {dashboardWorkflows.map((workflow) => (
                <List.Item
                  key={workflow.id}
                  icon={Icon.Network}
                  title={{
                    value: workflow.name,
                    tooltip: `${workflow.name}\n${workflow.id}${workflow.description ? `\n\n${workflow.description}` : ""}`,
                  }}
                  keywords={[workflow.id, ...workflow.engineIds]}
                  accessories={[
                    {
                      text: formatCompactCount(workflow.engineCount, "E"),
                      tooltip: `${workflow.engineCount} engines`,
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={[
                        `# ${workflow.name}`,
                        "",
                        workflow.description || "Composite Selemene workflow.",
                        "",
                        "This main dashboard section now shows the full cached workflow catalog.",
                        "",
                        workflow.engineIds.length
                          ? `Engines: ${workflow.engineIds.join(", ")}`
                          : "Engine list will expand in the dedicated workflow browser.",
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                      <Action.Push
                        title="Run Workflow"
                        icon={Icon.Play}
                        target={
                          <WorkflowExecutionForm
                            workflow={workflow}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="View Workflow"
                        icon={Icon.ArrowRightCircle}
                        target={
                          <WorkflowDetailView
                            workflow={workflow}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="Browse Workflows"
                        icon={Icon.AppWindowList}
                        target={
                          <WorkflowsBrowser
                            initialSnapshot={snapshot}
                            syncOnMount={false}
                          />
                        }
                      />
                    </NoesisActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}

          {recentReadings.length ? (
            <List.Section title="Recent Readings">
              {recentReadings.map((reading) => (
                <List.Item
                  key={reading.id}
                  icon={reading.workflowId ? Icon.Network : Icon.Book}
                  title={{
                    value:
                      truncate(reading.witnessPrompt, 72) || reading.engineId,
                    tooltip: [
                      reading.engineId,
                      reading.workflowId,
                      reading.witnessPrompt,
                    ]
                      .filter(Boolean)
                      .join("\n"),
                  }}
                  keywords={[
                    reading.engineId,
                    reading.workflowId ?? "",
                    reading.id,
                  ]}
                  accessories={[
                    { text: formatRelativeTime(reading.createdAt) },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={[
                        `# ${truncate(reading.witnessPrompt, 56) || reading.engineId}`,
                        "",
                        `${formatReadingSubtitle(reading.engineId, reading.workflowId)}`,
                        "",
                        truncate(reading.witnessPrompt, 240) ||
                          "_No witness prompt stored._",
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                      <Action.Push
                        title="Open Reading"
                        icon={Icon.Book}
                        target={
                          <ReadingDetailView
                            reading={reading}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="Browse Readings"
                        icon={Icon.AppWindowList}
                        target={
                          <ReadingsBrowser
                            initialSnapshot={snapshot}
                            syncOnMount={false}
                          />
                        }
                      />
                    </NoesisActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : null}
    </List>
  );
}

function getReadingCount(snapshot: DashboardSnapshot, engineId: string) {
  return (
    snapshot.readingStats.find((entry) => entry.engineId === engineId)?.count ??
    0
  );
}

function getPulsePendingTitle(
  pulseModeLabel: string,
  snapshot: DashboardSnapshot | null | undefined,
): string {
  if (!snapshot?.hasCredentials) {
    return "Reconnect to Warm Pulse";
  }

  if (pulseModeLabel !== "TCM Organ" && !snapshot.profile?.birthDate) {
    return `${pulseModeLabel} Needs Profile`;
  }

  return pulseModeLabel === "TCM Organ"
    ? "Current TCM Organ"
    : `${pulseModeLabel} Pending`;
}

function getPulsePendingSummary(
  pulseModeLabel: string,
  snapshot: DashboardSnapshot | null | undefined,
): string {
  if (!snapshot?.hasCredentials) {
    return "Reconnect the API key to refresh live pulse data from the Selemene Engine.";
  }

  if (pulseModeLabel !== "TCM Organ" && !snapshot.profile?.birthDate) {
    return `Add birth data and timezone in Profile to unlock ${pulseModeLabel.toLowerCase()} pulse.`;
  }

  return "Refresh the pulse cache to surface the current reading.";
}

function getRemedyPendingTitle(
  snapshot: DashboardSnapshot | null | undefined,
): string {
  if (!snapshot?.hasCredentials) {
    return "Reconnect to Derive Remedy";
  }

  if (!snapshot.profile?.birthDate) {
    return "Remedy Needs Profile";
  }

  return "NadaBrahman Remedy Pending";
}

function getRemedyPendingSummary(
  snapshot: DashboardSnapshot | null | undefined,
): string {
  if (!snapshot?.hasCredentials) {
    return "Reconnect the API key so the extension can derive a NadaBrahman remedy from the live pulse cadence.";
  }

  if (!snapshot.profile?.birthDate) {
    return "Add birth data and timezone in Profile to unlock the derived NadaBrahman remedy.";
  }

  return "Refresh the pulse cache to derive the current NadaBrahman remedy from the source pulse cadence.";
}

function getPulseIcon(kind: MenuBarInsightKind): Icon {
  switch (kind) {
    case "biorhythm":
      return Icon.Heartbeat;
    case "nadabrahman":
      return Icon.Music;
    case "vimshottari":
      return Icon.Stars;
    case "vedicClock":
    default:
      return Icon.Clock;
  }
}

function getPulseColor(kind: MenuBarInsightKind): Color {
  switch (kind) {
    case "biorhythm":
      return Color.Green;
    case "nadabrahman":
      return Color.Blue;
    case "vimshottari":
      return Color.Orange;
    case "vedicClock":
    default:
      return Color.Yellow;
  }
}
