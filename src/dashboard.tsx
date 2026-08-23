import React, { useCallback, useEffect, useState } from "react";
import { Action, Icon, List } from "@raycast/api";
import {
  COLOR_ERROR,
  COLOR_INFO,
  COLOR_SUCCESS,
  COLOR_WARNING,
  COLOR_SELECTED,
  COLOR_SECONDARY,
  cosmicHeader,
  sacredSubheader,
  SECTION_DIVIDER,
  goldIcon,
  emeraldIcon,
  indigoIcon,
  violetIcon,
  mutedIcon,
} from "./lib/design-tokens";
import {
  EngineExecutionForm,
  WorkflowExecutionForm,
} from "./components/execution-forms";
import { NoesisActionPanel } from "./components/noesis-actions";
import {
  EngineDetailView,
  EnginesBrowser,
  ReadingsBrowser,
  WorkflowDetailView,
  WorkflowsBrowser,
} from "./components/noesis-browsers";
import { ProfileForm } from "./components/profile-form";
import { canUseEngineWorkbench, getSnapshotAccess } from "./lib/access";
import {
  buildRecommendedNowItems,
  deriveContextQuality,
  findWorkflowById,
  getPulseInputKinds,
  toEngineId,
} from "./lib/dashboard-ritual";
import {
  formatAbsoluteTime,
  formatCompactCount,
  formatCount,
  formatPhaseBadge,
  formatPhaseLabel,
  formatRelativeTime,
  formatTimeUntil,
  getPhaseColor,
} from "./lib/formatters";
import {
  getDashboardEngines,
  getDashboardWorkflows,
} from "./lib/dashboard-catalog";
import {
  getPreferredSourceInsight,
  getPulseModeLabel,
  getSelectedSourcePulseKind,
} from "./lib/menu-bar-insights";
import { openCommand } from "./lib/navigation";
import { readMenuBarSnapshot, syncMenuBarInsights } from "./lib/queries";
import { shouldShowSyncError } from "./lib/sync-status";
import { getPulseModePreference, getStoredConfig } from "./lib/settings";
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

  const handleRefresh = useCallback(
    async (force = false) => {
      const updatedSnapshot = await reload(force);
      if (!updatedSnapshot) {
        return;
      }

      const config = (await getStoredConfig()) ?? {
        baseUrl: updatedSnapshot.baseUrl,
        apiKey: "",
      };

      try {
        const result = await syncMenuBarInsights({
          dashboard: updatedSnapshot,
          force,
          config,
        });
        setMenuBarSnapshot({
          dashboard: updatedSnapshot,
          insights: result.insights,
          syncIssues: result.syncIssues,
          syncError: result.syncError,
        });
      } catch {
        try {
          const cached = await readMenuBarSnapshot();
          setMenuBarSnapshot(cached);
        } catch {
          setMenuBarSnapshot(null);
        }
      }
    },
    [reload],
  );

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

  if (error && !snapshot) {
    return (
      <List navigationTitle="Tryambakam Noesis">
        <List.Item
          title="Unable to load Tryambakam Noesis"
          subtitle={error}
          actions={
            <NoesisActionPanel onRefresh={handleRefresh} hideDashboardAction />
          }
        />
      </List>
    );
  }

  const dashboardEngines = snapshot ? getDashboardEngines(snapshot) : [];
  const dashboardWorkflows = snapshot ? getDashboardWorkflows(snapshot) : [];
  const access = getSnapshotAccess(snapshot);
  const canUseWorkbench = canUseEngineWorkbench(snapshot);
  const pulseMode = getPulseModePreference();
  const selectedSourceKind = getSelectedSourcePulseKind(pulseMode);
  const showSyncError = shouldShowSyncError(error, snapshot);
  const pulseBoardSnapshot = snapshot
    ? (menuBarSnapshot ?? {
        dashboard: snapshot,
        insights: {},
        syncIssues: [],
      })
    : null;
  const insights = pulseBoardSnapshot?.insights ?? {};
  const currentPulse = getPreferredSourceInsight(insights, pulseMode);
  const pulseRemedy = insights.nadabrahman;
  const pulseRemedyEngine = snapshot
    ? snapshot.engines.find((engine) => engine.id === "nadabrahman")
    : undefined;
  const contextQuality = deriveContextQuality(snapshot);
  const recommendedNow =
    snapshot && pulseBoardSnapshot
      ? buildRecommendedNowItems(snapshot, insights, pulseMode)
      : [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Tryambakam Noesis"
      searchBarPlaceholder={
        canUseWorkbench
          ? "Search remedies, pulse inputs, engines, and flows"
          : "Search remedies, pulse inputs, and daily rituals"
      }
    >
      {showSyncError ? (
        <List.Section title={cosmicHeader("Sync Status")}>
          <List.Item
            title="Unable to refresh from Selemene"
            subtitle={error ?? undefined}
            icon={{ source: Icon.ExclamationMark, tintColor: COLOR_ERROR }}
            actions={
              <NoesisActionPanel
                onRefresh={handleRefresh}
                hideDashboardAction
              />
            }
          />
        </List.Section>
      ) : null}
      {snapshot ? (
        <>
          <List.Section title={cosmicHeader("Practice")}>
            <List.Item
              icon={goldIcon(Icon.PersonCircle)}
              title={{
                value: "Ritual Defaults",
                tooltip:
                  snapshot.profile?.fullName ??
                  "Set shared birth data, timezone, and reusable ritual defaults.",
              }}
              keywords={[
                "profile",
                contextQuality.status,
                snapshot.profile?.fullName ?? "",
                snapshot.profile?.email ?? "",
                snapshot.profile?.timezone ?? "",
              ]}
              accessories={[
                {
                  tag: {
                    value: contextQuality.label.toUpperCase(),
                    color: getContextQualityColor(contextQuality.status),
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
                    "# Ritual Defaults",
                    "",
                    "Shared birth data and timezone shape Daily Ritual, Pulse & Remedy, and operator workbench runs when access is connected.",
                    "",
                    SECTION_DIVIDER,
                    "",
                    `- Access Mode: ${access.mode === "admin" ? "Operator" : "Witness"}`,
                    `- Context Quality: ${contextQuality.label}`,
                    `- Context Note: ${contextQuality.summary}`,
                    snapshot.profile
                      ? `- Active operator: ${snapshot.profile.fullName}`
                      : "- No live profile cached yet.",
                    snapshot.profile?.birthDate
                      ? `- Birth date: ${snapshot.profile.birthDate}`
                      : "- Birth date: Missing",
                    snapshot.profile?.birthTime
                      ? `- Birth time: ${snapshot.profile.birthTime}`
                      : "- Birth time: Missing",
                    snapshot.profile?.timezone
                      ? `- Timezone: ${snapshot.profile.timezone}`
                      : "- Timezone: Missing",
                    typeof snapshot.profile?.birthLocation?.latitude ===
                      "number" &&
                    typeof snapshot.profile?.birthLocation?.longitude ===
                      "number"
                      ? `- Coordinates: ${snapshot.profile.birthLocation.latitude}, ${snapshot.profile.birthLocation.longitude}`
                      : "- Coordinates: Missing",
                    contextQuality.missingFields.length > 0
                      ? `- Missing fields: ${contextQuality.missingFields.join(", ")}`
                      : "- Missing fields: None",
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel
                  snapshot={snapshot}
                  onRefresh={handleRefresh}
                  hideDashboardAction
                >
                  <Action.Push
                    title="Edit Ritual Defaults"
                    icon={goldIcon(Icon.Pencil)}
                    target={<ProfileForm snapshot={snapshot} />}
                  />
                  <Action
                    title="Open Profile Command"
                    icon={mutedIcon(Icon.AppWindowList)}
                    onAction={() => openCommand("profile")}
                  />
                </NoesisActionPanel>
              }
            />
            {canUseWorkbench ? (
              <List.Item
                icon={goldIcon(Icon.Book)}
                title={{
                  value: "Reading Archive",
                  tooltip:
                    "Inspect previous readings, witness responses, and stored results.",
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
                      "Return to previous readings, witness responses, and stored ritual outputs from earlier sessions.",
                      "",
                      SECTION_DIVIDER,
                      "",
                      `- ${formatCount(snapshot.readings.length, "recent reading")} in the local history window`,
                      `- Latest sync landed ${formatRelativeTime(snapshot.timestamps.readings)}`,
                    ].join("\n")}
                  />
                }
                actions={
                  <NoesisActionPanel
                    snapshot={snapshot}
                    onRefresh={handleRefresh}
                    hideDashboardAction
                  >
                    <Action.Push
                      title="Open Reading Archive"
                      icon={indigoIcon(Icon.ArrowRightCircle)}
                      target={
                        <ReadingsBrowser
                          initialSnapshot={snapshot}
                          syncOnMount={false}
                        />
                      }
                    />
                    <Action
                      title="Open Readings Command"
                      icon={mutedIcon(Icon.AppWindowList)}
                      onAction={() => openCommand("readings")}
                    />
                  </NoesisActionPanel>
                }
              />
            ) : null}
          </List.Section>

          <List.Section title={cosmicHeader("Current Remedy")}>
            <List.Item
              icon={indigoIcon(Icon.Music)}
              title={{
                value: pulseRemedy?.title ?? getRemedyPendingTitle(snapshot),
                tooltip: [
                  pulseRemedy?.title,
                  pulseRemedy?.subtitle,
                  pulseRemedy?.summary,
                  contextQuality.summary,
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
                    value: pulseRemedy
                      ? "REMEDY"
                      : contextQuality.label.toUpperCase(),
                    color: pulseRemedy
                      ? COLOR_INFO
                      : getContextQualityColor(contextQuality.status),
                  },
                },
                {
                  text: pulseRemedy
                    ? formatTimeUntil(pulseRemedy.refreshAfter)
                    : contextQuality.label,
                  tooltip: pulseRemedy
                    ? `Refreshes in ${formatTimeUntil(pulseRemedy.refreshAfter)}`
                    : contextQuality.summary,
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Current Remedy",
                    "",
                    pulseRemedy
                      ? "NadaBrahman is the primary outcome of the pulse cadence and currently leads the ritual surface."
                      : getRemedyPendingSummary(snapshot, contextQuality),
                    "",
                    SECTION_DIVIDER,
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
                      ? `- Supported by ${getPulseModeLabel(selectedSourceKind)}: ${currentPulse.title}`
                      : `- Supporting source pulse: ${getPulseModeLabel(selectedSourceKind)} pending`,
                    `- Context Quality: ${contextQuality.label}`,
                    `- Context Note: ${contextQuality.summary}`,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                />
              }
              actions={
                <NoesisActionPanel
                  snapshot={snapshot}
                  onRefresh={handleRefresh}
                  hideDashboardAction
                  refreshTitle="Refresh Pulse"
                >
                  <Action
                    title="Run Daily Witness"
                    icon={emeraldIcon(Icon.Eye)}
                    onAction={() => openCommand("daily-witness")}
                  />
                  <Action
                    title="Run Daily Practice"
                    icon={goldIcon(Icon.Play)}
                    onAction={() => openCommand("daily-practice")}
                  />
                  {canUseWorkbench && pulseRemedyEngine ? (
                    <Action.Push
                      title="Run Nadabrahman Remedy"
                      icon={indigoIcon(Icon.Music)}
                      target={
                        <EngineExecutionForm
                          engine={pulseRemedyEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  {canUseWorkbench && pulseRemedyEngine ? (
                    <Action.Push
                      title="View Nadabrahman Engine"
                      icon={indigoIcon(Icon.ArrowRightCircle)}
                      target={
                        <EngineDetailView
                          engine={pulseRemedyEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                </NoesisActionPanel>
              }
            />
          </List.Section>

          <List.Section title={cosmicHeader("Pulse Inputs")}>
            {getPulseInputKinds().map((kind) => {
              const insight = insights[kind];
              const engineId = insight?.engineId ?? toEngineId(kind);
              const engine = snapshot.engines.find(
                (entry) => entry.id === engineId,
              );

              return (
                <List.Item
                  key={kind}
                  icon={{
                    source: getPulseIcon(kind),
                    tintColor: getPulseColor(kind),
                  }}
                  /* Urania 137: pulse colors already mapped via getPulseColor */
                  title={{
                    value:
                      insight?.title ??
                      `${getPulseModeLabel(kind)} Input Pending`,
                    tooltip: [
                      insight?.title,
                      insight?.subtitle,
                      insight?.summary,
                    ]
                      .filter(Boolean)
                      .join("\n"),
                  }}
                  keywords={[
                    kind,
                    getPulseModeLabel(kind),
                    insight?.engineId ?? "",
                    insight?.title ?? "",
                  ]}
                  accessories={[
                    {
                      tag: {
                        value: kind === selectedSourceKind ? "ACTIVE" : "INPUT",
                        color:
                          kind === selectedSourceKind
                            ? getPulseColor(kind)
                            : COLOR_SECONDARY,
                      },
                    },
                    {
                      text: insight
                        ? formatRelativeTime(insight.fetchedAt)
                        : contextQuality.label,
                      tooltip: insight
                        ? `Cached ${formatAbsoluteTime(insight.fetchedAt)}`
                        : getPulseInputPendingSummary(
                            kind,
                            snapshot,
                            contextQuality,
                          ),
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={[
                        `# ${getPulseModeLabel(kind)}`,
                        "",
                        insight
                          ? "This source engine contributes explicit cadence context for the current remedy."
                          : getPulseInputPendingSummary(
                              kind,
                              snapshot,
                              contextQuality,
                            ),
                        "",
                        SECTION_DIVIDER,
                        "",
                        insight?.title
                          ? `- Current signal: ${insight.title}`
                          : null,
                        insight?.subtitle
                          ? `- Supporting detail: ${insight.subtitle}`
                          : null,
                        insight?.summary
                          ? `- Summary: ${insight.summary}`
                          : null,
                        insight?.refreshAfter
                          ? `- Refreshes in: ${formatTimeUntil(insight.refreshAfter)}`
                          : null,
                        `- Context Quality: ${contextQuality.label}`,
                      ]
                        .filter(Boolean)
                        .join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel
                      snapshot={snapshot}
                      onRefresh={handleRefresh}
                      hideDashboardAction
                      refreshTitle="Refresh Pulse"
                    >
                      {canUseWorkbench && engine ? (
                        <Action.Push
                          title="Run Pulse Engine"
                          icon={goldIcon(Icon.Play)}
                          target={
                            <EngineExecutionForm
                              engine={engine}
                              snapshot={snapshot}
                            />
                          }
                        />
                      ) : null}
                      {canUseWorkbench && engine ? (
                        <Action.Push
                          title="View Pulse Engine"
                          icon={indigoIcon(Icon.ArrowRightCircle)}
                          target={
                            <EngineDetailView
                              engine={engine}
                              snapshot={snapshot}
                            />
                          }
                        />
                      ) : null}
                    </NoesisActionPanel>
                  }
                />
              );
            })}
          </List.Section>

          <List.Section title={cosmicHeader("Recommended Now")}>
            {recommendedNow.map((item) => {
              const workflow =
                item.workflowId && snapshot
                  ? findWorkflowById(snapshot, item.workflowId)
                  : undefined;
              const engine =
                item.engineId && snapshot
                  ? snapshot.engines.find((entry) => entry.id === item.engineId)
                  : undefined;

              return (
                <List.Item
                  key={item.id}
                  icon={getRecommendedIcon(item.id)}
                  title={{
                    value: item.title,
                    tooltip: `${item.title}\n${item.subtitle}`,
                  }}
                  keywords={[item.id, item.title, item.subtitle]}
                  accessories={[
                    {
                      text: item.subtitle,
                      tooltip: item.summary,
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={[
                        `# ${item.title}`,
                        "",
                        item.summary,
                        "",
                        SECTION_DIVIDER,
                        "",
                        `- Signal: ${item.subtitle}`,
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel
                      snapshot={snapshot}
                      onRefresh={handleRefresh}
                      hideDashboardAction
                      refreshTitle="Refresh Pulse"
                    >
                      {item.id === "daily-witness" ? (
                        <Action
                          title="Run Daily Witness"
                          icon={emeraldIcon(Icon.Eye)}
                          onAction={() => openCommand("daily-witness")}
                        />
                      ) : null}
                      {item.id === "daily-practice" ? (
                        <Action
                          title="Run Daily Practice"
                          icon={goldIcon(Icon.Play)}
                          onAction={() => openCommand("daily-practice")}
                        />
                      ) : null}
                      {canUseWorkbench &&
                      item.id === "nadabrahman-remedy" &&
                      engine ? (
                        <Action.Push
                          title="Run Nadabrahman Remedy"
                          icon={indigoIcon(Icon.Music)}
                          target={
                            <EngineExecutionForm
                              engine={engine}
                              snapshot={snapshot}
                            />
                          }
                        />
                      ) : null}
                      {canUseWorkbench &&
                      item.id === "source-pulse" &&
                      engine ? (
                        <Action.Push
                          title="Run Pulse Engine"
                          icon={goldIcon(Icon.Play)}
                          target={
                            <EngineExecutionForm
                              engine={engine}
                              snapshot={snapshot}
                            />
                          }
                        />
                      ) : null}
                      {canUseWorkbench && workflow ? (
                        <Action.Push
                          title="Open Workflow Form"
                          icon={violetIcon(Icon.Network)}
                          target={
                            <WorkflowExecutionForm
                              workflow={workflow}
                              snapshot={snapshot}
                            />
                          }
                        />
                      ) : null}
                    </NoesisActionPanel>
                  }
                />
              );
            })}
          </List.Section>

          {dashboardEngines.length ? (
            <List.Section title={cosmicHeader("Engine Library")}>
              {dashboardEngines.map((engine) => (
                <List.Item
                  key={engine.id}
                  icon={{
                    source: Icon.Stars,
                    tintColor: getPhaseColor(engine.requiredPhase),
                  }}
                  /* Urania 137: phase colors already mapped via getPhaseColor */
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
                        SECTION_DIVIDER,
                        "",
                        "The full engine catalog remains visible below the guided ritual layer.",
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel
                      onRefresh={handleRefresh}
                      hideDashboardAction
                    >
                      <Action.Push
                        title="Run Engine"
                        icon={goldIcon(Icon.Play)}
                        target={
                          <EngineExecutionForm
                            engine={engine}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="View Engine"
                        icon={indigoIcon(Icon.ArrowRightCircle)}
                        target={
                          <EngineDetailView
                            engine={engine}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="Browse Engines"
                        icon={mutedIcon(Icon.AppWindowList)}
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
            <List.Section title={cosmicHeader("Flow Library")}>
              {dashboardWorkflows.map((workflow) => (
                <List.Item
                  key={workflow.id}
                  icon={violetIcon(Icon.Network)}
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
                        workflow.description || "Composite ritual workflow.",
                        "",
                        SECTION_DIVIDER,
                        "",
                        "The full workflow catalog remains visible below the guided ritual layer.",
                        "",
                        workflow.engineIds.length
                          ? `Engines: ${workflow.engineIds.join(", ")}`
                          : "Engine list will expand in the dedicated workflow browser.",
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel
                      onRefresh={handleRefresh}
                      hideDashboardAction
                    >
                      <Action.Push
                        title="Run Workflow"
                        icon={goldIcon(Icon.Play)}
                        target={
                          <WorkflowExecutionForm
                            workflow={workflow}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="View Workflow"
                        icon={indigoIcon(Icon.ArrowRightCircle)}
                        target={
                          <WorkflowDetailView
                            workflow={workflow}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="Browse Workflows"
                        icon={mutedIcon(Icon.AppWindowList)}
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

function getContextQualityColor(
  status: ReturnType<typeof deriveContextQuality>["status"],
) {
  switch (status) {
    case "complete":
      return COLOR_SUCCESS;
    case "usable":
      return COLOR_WARNING;
    case "partial":
    default:
      return COLOR_WARNING;
  }
}

function getRemedyPendingTitle(snapshot: DashboardSnapshot): string {
  if (!snapshot.hasCredentials) {
    return "Witness Pulse Pending";
  }

  return "NadaBrahman Remedy Pending";
}

function getRemedyPendingSummary(
  snapshot: DashboardSnapshot,
  contextQuality: ReturnType<typeof deriveContextQuality>,
): string {
  if (!snapshot.hasCredentials) {
    return "Witness mode keeps Daily Ritual and source pulse cadence available. Add an access key when you want operator-grade direct remedy work.";
  }

  return contextQuality.status === "partial"
    ? `Profile context is still partial. ${contextQuality.summary}`
    : "Refresh the pulse cache to derive the current NadaBrahman remedy from the source cadence.";
}

function getPulseInputPendingSummary(
  kind: MenuBarInsightKind,
  snapshot: DashboardSnapshot,
  contextQuality: ReturnType<typeof deriveContextQuality>,
): string {
  if (!snapshot.hasCredentials) {
    return "Witness mode can refresh this source pulse without exposing an access key.";
  }

  if (kind !== "vedicClock" && contextQuality.status === "partial") {
    return `This pulse input depends on stronger profile context. ${contextQuality.summary}`;
  }

  return "Refresh the pulse cache to surface this source input.";
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

function getPulseColor(kind: MenuBarInsightKind): string {
  switch (kind) {
    case "biorhythm":
      return COLOR_SUCCESS;
    case "nadabrahman":
      return COLOR_INFO;
    case "vimshottari":
      return COLOR_WARNING;
    case "vedicClock":
    default:
      return COLOR_WARNING;
  }
}

function getRecommendedIcon(
  id:
    | "daily-witness"
    | "daily-practice"
    | "nadabrahman-remedy"
    | "source-pulse",
): Icon {
  switch (id) {
    case "daily-witness":
      return Icon.Eye;
    case "daily-practice":
      return Icon.Play;
    case "nadabrahman-remedy":
      return Icon.Music;
    case "source-pulse":
    default:
      return Icon.Clock;
  }
}
