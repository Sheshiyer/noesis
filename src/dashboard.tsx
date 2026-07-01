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
  ReadingsBrowser,
  WorkflowDetailView,
  WorkflowsBrowser,
} from "./components/noesis-browsers";
import { OnboardingForm } from "./components/onboarding-form";
import { ProfileForm } from "./components/profile-form";
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
import { readMenuBarSnapshot } from "./lib/queries";
import { shouldShowSyncError } from "./lib/sync-status";
import { getPulseModePreference } from "./lib/settings";
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
      searchBarPlaceholder="Search remedies, pulse inputs, engines, and flows"
    >
      {showSyncError ? (
        <List.Section title="Sync Status">
          <List.Item
            title="Unable to refresh from Selemene"
            subtitle={error ?? undefined}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            actions={
              <NoesisActionPanel onRefresh={reload} hideDashboardAction />
            }
          />
        </List.Section>
      ) : null}
      {snapshot ? (
        <>
          <List.Section title="Practice">
            <List.Item
              icon={{
                source: Icon.PersonCircle,
                tintColor: getContextQualityColor(contextQuality.status),
              }}
              title={{
                value: "Profile Defaults",
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
                    "# Profile Defaults",
                    "",
                    "Shared birth data and timezone shape every remedy, Daily Witness run, and ritual workflow in this extension.",
                    "",
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
                <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                  <Action.Push
                    title="Edit Profile Defaults"
                    icon={Icon.Pencil}
                    target={<ProfileForm snapshot={snapshot} />}
                  />
                  <Action
                    title="Open Profile Command"
                    icon={Icon.AppWindowList}
                    onAction={() => openCommand("profile")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={Icon.Book}
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
                    onAction={() => openCommand("readings")}
                  />
                </NoesisActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Current Remedy">
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
                      ? Color.Blue
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
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Pulse"
                >
                  <Action
                    title="Run Daily Witness"
                    icon={Icon.Eye}
                    onAction={() => openCommand("daily-witness")}
                  />
                  <Action
                    title="Run Daily Practice"
                    icon={Icon.Play}
                    onAction={() => openCommand("daily-practice")}
                  />
                  {pulseRemedyEngine ? (
                    <Action.Push
                      title="Run Nadabrahman Remedy"
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
                      title="View Nadabrahman Engine"
                      icon={Icon.ArrowRightCircle}
                      target={
                        <EngineDetailView
                          engine={pulseRemedyEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  <Action
                    title="Open Developer Tools"
                    icon={Icon.Hammer}
                    onAction={() => openCommand("developer-tools")}
                  />
                </NoesisActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Pulse Inputs">
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
                            : Color.SecondaryText,
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
                      onRefresh={reload}
                      hideDashboardAction
                      refreshTitle="Refresh Pulse"
                    >
                      {engine ? (
                        <Action.Push
                          title="Run Pulse Engine"
                          icon={Icon.Play}
                          target={
                            <EngineExecutionForm
                              engine={engine}
                              snapshot={snapshot}
                            />
                          }
                        />
                      ) : null}
                      {engine ? (
                        <Action.Push
                          title="View Pulse Engine"
                          icon={Icon.ArrowRightCircle}
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

          <List.Section title="Recommended Now">
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
                        `- Signal: ${item.subtitle}`,
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel
                      onRefresh={reload}
                      hideDashboardAction
                      refreshTitle="Refresh Pulse"
                    >
                      {item.id === "daily-witness" ? (
                        <Action
                          title="Run Daily Witness"
                          icon={Icon.Eye}
                          onAction={() => openCommand("daily-witness")}
                        />
                      ) : null}
                      {item.id === "daily-practice" ? (
                        <Action
                          title="Run Daily Practice"
                          icon={Icon.Play}
                          onAction={() => openCommand("daily-practice")}
                        />
                      ) : null}
                      {item.id === "nadabrahman-remedy" && engine ? (
                        <Action.Push
                          title="Run Nadabrahman Remedy"
                          icon={Icon.Music}
                          target={
                            <EngineExecutionForm
                              engine={engine}
                              snapshot={snapshot}
                            />
                          }
                        />
                      ) : null}
                      {item.id === "source-pulse" && engine ? (
                        <Action.Push
                          title="Run Pulse Engine"
                          icon={Icon.Play}
                          target={
                            <EngineExecutionForm
                              engine={engine}
                              snapshot={snapshot}
                            />
                          }
                        />
                      ) : null}
                      {workflow ? (
                        <Action.Push
                          title="Open Workflow Form"
                          icon={Icon.Network}
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
                        "The full engine catalog remains visible below the guided ritual layer.",
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
                        workflow.description || "Composite ritual workflow.",
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
      return Color.Green;
    case "usable":
      return Color.Yellow;
    case "partial":
    default:
      return Color.Orange;
  }
}

function getRemedyPendingTitle(snapshot: DashboardSnapshot): string {
  if (!snapshot.hasCredentials) {
    return "Reconnect to Derive Remedy";
  }

  return "NadaBrahman Remedy Pending";
}

function getRemedyPendingSummary(
  snapshot: DashboardSnapshot,
  contextQuality: ReturnType<typeof deriveContextQuality>,
): string {
  if (!snapshot.hasCredentials) {
    return "Reconnect the API key so the extension can derive a NadaBrahman remedy from the live pulse cadence.";
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
    return "Reconnect the API key to warm this pulse input.";
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
