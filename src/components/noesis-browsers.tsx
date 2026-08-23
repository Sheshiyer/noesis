import React from "react";
import { Action, Detail, Icon, List } from "@raycast/api";
import {
  COLOR_ERROR,
  COLOR_INFO,
  COLOR_SUCCESS,
  COLOR_WARNING,
  COLOR_SELECTED,
  cosmicHeader,
  sacredSubheader,
  SECTION_DIVIDER,
  goldIcon,
  emeraldIcon,
  indigoIcon,
  violetIcon,
  mutedIcon,
} from "../lib/design-tokens";
import { EngineExecutionForm, WorkflowExecutionForm } from "./execution-forms";
import { NoesisActionPanel } from "./noesis-actions";
import { WorkbenchAccessGate } from "./access-gate";
import { canUseEngineWorkbench } from "../lib/access";
import {
  formatAbsoluteTime,
  formatCalculationTime,
  formatCompactCount,
  formatCount,
  formatPhaseBadge,
  formatPhaseLabel,
  formatRelativeTime,
  getPhaseColor,
  truncate,
} from "../lib/formatters";
import {
  buildReadingResultMarkdown,
  getReadingRequestJson,
  getReadingStructuredKeys,
  hasReadingRequestContext,
} from "../lib/execution-result-presenter";
import { openCommand } from "../lib/navigation";
import { useDashboardSnapshot } from "../lib/use-dashboard-snapshot";
import {
  DashboardSnapshot,
  EngineSummary,
  ReadingSummary,
  WorkflowSummary,
} from "../lib/types";

interface BrowserProps {
  initialSnapshot?: DashboardSnapshot | null;
  syncOnMount?: boolean;
}

interface ReadingsBrowserProps extends BrowserProps {
  engineFilter?: string;
  workflowFilter?: string;
}

export function EnginesBrowser(props: BrowserProps) {
  const { snapshot, isLoading, error, reload } = useResolvedSnapshot(props);

  if (snapshot && !canUseEngineWorkbench(snapshot)) {
    return (
      <WorkbenchAccessGate
        feature="Engine Workbench"
        isLoading={isLoading}
        onRefresh={reload}
      />
    );
  }

  if (error && !snapshot) {
    return (
      <BrowserErrorList
        title="Unable to load engines"
        message={error}
        onRefresh={reload}
      />
    );
  }

  const engines = snapshot?.engines ?? [];
  const sections = groupEnginesByPhase(engines);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Tryambakam Engines"
      searchBarPlaceholder="Browse cached engines"
    >
      {!engines.length ? (
        <List.EmptyView
          title="No engines cached yet"
          description="Refresh the Selemene Engine snapshot or reconnect the API key to load the engine catalog."
          actions={
            <NoesisActionPanel
              onRefresh={reload}
              refreshTitle="Refresh Engines"
            />
          }
        />
      ) : null}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((engine) => {
            const readingCount = getEngineReadingCount(snapshot, engine.id);
            const recentReading = snapshot?.readings.find(
              (reading) => reading.engineId === engine.id,
            );

            return (
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
                    text: formatCompactCount(readingCount, "R"),
                    tooltip: `${readingCount} cached readings`,
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={buildEngineMarkdown(engine, snapshot)}
                    metadata={buildEngineMetadata(engine, snapshot)}
                  />
                }
                actions={
                  <NoesisActionPanel
                    snapshot={snapshot}
                    onRefresh={reload}
                    refreshTitle="Refresh Engines"
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
                      icon={goldIcon(Icon.ArrowRightCircle)}
                      target={
                        <EngineDetailView engine={engine} snapshot={snapshot} />
                      }
                    />
                    <Action.Push
                      title="View Engine Readings"
                      icon={goldIcon(Icon.Book)}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      target={
                        <ReadingsBrowser
                          initialSnapshot={snapshot}
                          syncOnMount={false}
                          engineFilter={engine.id}
                        />
                      }
                    />
                    <Action.CopyToClipboard
                      title="Copy Engine Identifier"
                      icon={mutedIcon(Icon.Clipboard)}
                      content={engine.id}
                    />
                    {recentReading ? (
                      <Action.Push
                        title="Open Latest Reading"
                        icon={indigoIcon(Icon.Clock)}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                        target={
                          <ReadingDetailView
                            reading={recentReading}
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
      ))}
    </List>
  );
}

export function WorkflowsBrowser(props: BrowserProps) {
  const { snapshot, isLoading, error, reload } = useResolvedSnapshot(props);

  if (snapshot && !canUseEngineWorkbench(snapshot)) {
    return (
      <WorkbenchAccessGate
        feature="Workflow Workbench"
        isLoading={isLoading}
        onRefresh={reload}
      />
    );
  }

  if (error && !snapshot) {
    return (
      <BrowserErrorList
        title="Unable to load workflows"
        message={error}
        onRefresh={reload}
      />
    );
  }

  const workflows = snapshot?.workflows ?? [];
  const sections = groupWorkflows(workflows);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Tryambakam Workflows"
      searchBarPlaceholder="Browse cached workflows"
    >
      {!workflows.length ? (
        <List.EmptyView
          title="No workflows cached yet"
          description="Refresh the Selemene Engine snapshot or reconnect the API key to load workflow metadata."
          actions={
            <NoesisActionPanel
              onRefresh={reload}
              refreshTitle="Refresh Workflows"
            />
          }
        />
      ) : null}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((workflow) => {
            const readingCount = getWorkflowReadingCount(snapshot, workflow.id);
            const recentReading = snapshot?.readings.find(
              (reading) => reading.workflowId === workflow.id,
            );

            return (
              <List.Item
                key={workflow.id}
                icon={{
                  source: Icon.Network,
                  tintColor: getWorkflowColor(workflow.engineCount),
                }}
                title={{
                  value: workflow.name,
                  tooltip: `${workflow.name}\n${workflow.id}${workflow.description ? `\n\n${workflow.description}` : ""}`,
                }}
                keywords={[workflow.id, ...workflow.engineIds]}
                accessories={[
                  {
                    text: formatCompactCount(workflow.engineCount, "E"),
                    tooltip: `${workflow.engineCount} engines in this workflow`,
                  },
                  {
                    text: formatCompactCount(readingCount, "R"),
                    tooltip: `${readingCount} cached readings`,
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={buildWorkflowMarkdown(workflow, snapshot)}
                    metadata={buildWorkflowMetadata(workflow, snapshot)}
                  />
                }
                actions={
                  <NoesisActionPanel
                    snapshot={snapshot}
                    onRefresh={reload}
                    refreshTitle="Refresh Workflows"
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
                      icon={goldIcon(Icon.ArrowRightCircle)}
                      target={
                        <WorkflowDetailView
                          workflow={workflow}
                          snapshot={snapshot}
                        />
                      }
                    />
                    <Action.Push
                      title="View Workflow Readings"
                      icon={goldIcon(Icon.Book)}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      target={
                        <ReadingsBrowser
                          initialSnapshot={snapshot}
                          syncOnMount={false}
                          workflowFilter={workflow.id}
                        />
                      }
                    />
                    <Action.CopyToClipboard
                      title="Copy Workflow Identifier"
                      icon={mutedIcon(Icon.Clipboard)}
                      content={workflow.id}
                    />
                    {recentReading ? (
                      <Action.Push
                        title="Open Latest Reading"
                        icon={indigoIcon(Icon.Clock)}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                        target={
                          <ReadingDetailView
                            reading={recentReading}
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
      ))}
    </List>
  );
}

export function ReadingsBrowser(props: ReadingsBrowserProps) {
  const { snapshot, isLoading, error, reload } = useResolvedSnapshot(props);

  if (snapshot && !canUseEngineWorkbench(snapshot)) {
    return (
      <WorkbenchAccessGate
        feature="Reading Archive"
        isLoading={isLoading}
        onRefresh={reload}
      />
    );
  }

  if (error && !snapshot) {
    return (
      <BrowserErrorList
        title="Unable to load readings"
        message={error}
        onRefresh={reload}
      />
    );
  }

  const readings = (snapshot?.readings ?? []).filter((reading) => {
    if (props.engineFilter && reading.engineId !== props.engineFilter) {
      return false;
    }

    if (props.workflowFilter && reading.workflowId !== props.workflowFilter) {
      return false;
    }

    return true;
  });
  const sections = groupReadingsByRecency(readings);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Tryambakam Readings"
      searchBarPlaceholder="Browse cached readings"
    >
      {!readings.length ? (
        <List.EmptyView
          title="No readings match this view yet"
          description="Run a new reading or refresh the snapshot to pull recent history into Raycast."
          actions={
            <NoesisActionPanel
              onRefresh={reload}
              refreshTitle="Refresh Readings"
            />
          }
        />
      ) : null}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((reading) => (
            <List.Item
              key={reading.id}
              icon={getReadingIcon(reading)}
              title={{
                value: truncate(reading.witnessPrompt, 72) || reading.engineId,
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
                {
                  text: formatCalculationTime(reading.calculationTimeMs),
                  tooltip: "Calculation time",
                },
                {
                  text: formatRelativeTime(reading.createdAt),
                  tooltip: formatAbsoluteTime(reading.createdAt),
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={buildReadingMarkdown(reading)}
                  metadata={buildReadingMetadata(reading, snapshot)}
                />
              }
              actions={
                <NoesisActionPanel
                  snapshot={snapshot}
                  onRefresh={reload}
                  refreshTitle="Refresh Readings"
                >
                  <Action.Push
                    title="Open Reading"
                    icon={goldIcon(Icon.Book)}
                    target={
                      <ReadingDetailView
                        reading={reading}
                        snapshot={snapshot}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Reading Identifier"
                    icon={mutedIcon(Icon.Clipboard)}
                    content={reading.id}
                  />
                  {hasReadingRequestContext(reading) ? (
                    <Action.CopyToClipboard
                      title="Copy Request Payload"
                      icon={mutedIcon(Icon.Document)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      content={getReadingRequestJson(reading) ?? "{}"}
                    />
                  ) : null}
                  <Action.CopyToClipboard
                    title="Copy Raw Reading JSON"
                    icon={mutedIcon(Icon.Document)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    content={safeStringify(reading.payload)}
                  />
                  <Action.Push
                    title="Open Engines"
                    icon={goldIcon(Icon.Stars)}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
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
      ))}
    </List>
  );
}

export function EngineDetailView({
  engine,
  snapshot,
}: {
  engine: EngineSummary;
  snapshot: DashboardSnapshot | null;
}) {
  return (
    <Detail
      navigationTitle={engine.name}
      markdown={buildEngineMarkdown(engine, snapshot, true)}
      metadata={buildEngineMetadata(engine, snapshot)}
      actions={
        <NoesisActionPanel>
          <Action.Push
            title="Run Engine"
            icon={goldIcon(Icon.Play)}
            target={<EngineExecutionForm engine={engine} snapshot={snapshot} />}
          />
          <Action.Push
            title="View Engine Readings"
            icon={goldIcon(Icon.Book)}
            target={
              <ReadingsBrowser
                initialSnapshot={snapshot}
                syncOnMount={false}
                engineFilter={engine.id}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Engine Identifier"
            icon={mutedIcon(Icon.Clipboard)}
            content={engine.id}
          />
          <Action
            title="Open Engines Command"
            icon={indigoIcon(Icon.AppWindowList)}
            onAction={() => openCommand("engines")}
          />
        </NoesisActionPanel>
      }
    />
  );
}

export function WorkflowDetailView({
  workflow,
  snapshot,
}: {
  workflow: WorkflowSummary;
  snapshot: DashboardSnapshot | null;
}) {
  return (
    <Detail
      navigationTitle={workflow.name}
      markdown={buildWorkflowMarkdown(workflow, snapshot, true)}
      metadata={buildWorkflowMetadata(workflow, snapshot)}
      actions={
        <NoesisActionPanel>
          <Action.Push
            title="Run Workflow"
            icon={goldIcon(Icon.Play)}
            target={
              <WorkflowExecutionForm workflow={workflow} snapshot={snapshot} />
            }
          />
          <Action.Push
            title="View Workflow Readings"
            icon={goldIcon(Icon.Book)}
            target={
              <ReadingsBrowser
                initialSnapshot={snapshot}
                syncOnMount={false}
                workflowFilter={workflow.id}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Workflow Identifier"
            icon={mutedIcon(Icon.Clipboard)}
            content={workflow.id}
          />
          <Action
            title="Open Workflows Command"
            icon={indigoIcon(Icon.AppWindowList)}
            onAction={() => openCommand("workflows")}
          />
        </NoesisActionPanel>
      }
    />
  );
}

export function ReadingDetailView({
  reading,
  snapshot,
}: {
  reading: ReadingSummary;
  snapshot: DashboardSnapshot | null;
}) {
  return (
    <Detail
      navigationTitle={truncate(reading.witnessPrompt, 42) || reading.engineId}
      markdown={buildReadingMarkdown(reading, true)}
      metadata={buildReadingMetadata(reading, snapshot)}
      actions={
        <NoesisActionPanel>
          <Action.CopyToClipboard
            title="Copy Reading Identifier"
            icon={mutedIcon(Icon.Clipboard)}
            content={reading.id}
          />
          <Action.CopyToClipboard
            title="Copy Witness Prompt"
            icon={mutedIcon(Icon.Document)}
            content={reading.witnessPrompt || reading.engineId}
          />
          {hasReadingRequestContext(reading) ? (
            <Action.CopyToClipboard
              title="Copy Request Payload"
              icon={mutedIcon(Icon.Document)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              content={getReadingRequestJson(reading) ?? "{}"}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Raw Reading JSON"
            icon={mutedIcon(Icon.Document)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            content={safeStringify(reading.payload)}
          />
          <Action.Push
            title="Open Readings Command"
            icon={indigoIcon(Icon.AppWindowList)}
            target={
              <ReadingsBrowser initialSnapshot={snapshot} syncOnMount={false} />
            }
          />
        </NoesisActionPanel>
      }
    />
  );
}

function useResolvedSnapshot(props: BrowserProps) {
  return useDashboardSnapshot({
    initialSnapshot: props.initialSnapshot ?? null,
    syncOnMount: props.syncOnMount ?? props.initialSnapshot === undefined,
  });
}

function BrowserErrorList({
  title,
  message,
  onRefresh,
}: {
  title: string;
  message: string;
  onRefresh: (force?: boolean) => Promise<unknown> | unknown;
}) {
  return (
    <List navigationTitle="Tryambakam Noesis">
      <List.Item
        icon={{ source: Icon.XMarkCircle, tintColor: COLOR_ERROR }}
        title={title}
        subtitle={message}
        actions={<NoesisActionPanel onRefresh={onRefresh} />}
      />
    </List>
  );
}

function buildEngineMarkdown(
  engine: EngineSummary,
  snapshot: DashboardSnapshot | null,
  expanded = false,
): string {
  const readingCount = getEngineReadingCount(snapshot, engine.id);
  const recentReading = snapshot?.readings.find(
    (reading) => reading.engineId === engine.id,
  );

  return [
    cosmicHeader(engine.name),
    "",
    `\`${engine.id}\``,
    "",
    `${formatPhaseLabel(engine.requiredPhase)} engine in the cached Selemene catalog.`,
    "",
    sacredSubheader("Snapshot"),
    "",
    `- ${formatCount(readingCount, "cached reading")}`,
    `- Last catalog touch: ${formatRelativeTime(engine.fetchedAt)}`,
    recentReading
      ? `- Most recent reading: ${formatRelativeTime(recentReading.createdAt)}`
      : "- No cached reading in the recent snapshot",
    ...buildSnapshotStatusLines(snapshot),
    "",
    recentReading
      ? [
          sacredSubheader("Latest Witness Prompt"),
          "",
          truncate(recentReading.witnessPrompt, expanded ? 420 : 240) ||
            "_No witness prompt stored for this reading._",
        ].join("\n")
      : [
          sacredSubheader("Next Surface"),
          "",
          "Fresh reading execution now lives on this surface. Use the primary Run Engine action to post directly to Selemene and then refresh cached readings.",
        ].join("\n"),
  ].join("\n");
}

function buildWorkflowMarkdown(
  workflow: WorkflowSummary,
  snapshot: DashboardSnapshot | null,
  expanded = false,
): string {
  const readingCount = getWorkflowReadingCount(snapshot, workflow.id);

  return [
    cosmicHeader(workflow.name),
    "",
    `\`${workflow.id}\``,
    "",
    workflow.description || "Cached workflow metadata from Selemene.",
    "",
    sacredSubheader("Composition"),
    "",
    `- ${workflow.engineCount} engines in this workflow`,
    `- ${formatCount(readingCount, "cached reading")} tied to this workflow in the current history window`,
    workflow.engineIds.length
      ? `- Engine chain: ${workflow.engineIds.join(", ")}`
      : "- Engine chain metadata is not cached yet",
    ...buildSnapshotStatusLines(snapshot),
    "",
    expanded && workflow.engineIds.length
      ? [
          sacredSubheader("Engine IDs"),
          "",
          "```text",
          workflow.engineIds.join("\n"),
          "```",
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildReadingMarkdown(
  reading: ReadingSummary,
  expanded = false,
): string {
  return buildReadingResultMarkdown(reading, expanded);
}

function buildEngineMetadata(
  engine: EngineSummary,
  snapshot: DashboardSnapshot | null,
) {
  const readingCount = getEngineReadingCount(snapshot, engine.id);
  const recentReading = snapshot?.readings.find(
    (reading) => reading.engineId === engine.id,
  );

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Engine ID" text={engine.id} />
      <List.Item.Detail.Metadata.Label
        title="Required Phase"
        text={formatPhaseLabel(engine.requiredPhase)}
      />
      <List.Item.Detail.Metadata.Label
        title="Cached Readings"
        text={formatCount(readingCount, "reading")}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Catalog Synced"
        text={formatRelativeTime(engine.fetchedAt)}
      />
      <List.Item.Detail.Metadata.Label
        title="Catalog Synced At"
        text={formatAbsoluteTime(engine.fetchedAt)}
      />
      {snapshot ? (
        <List.Item.Detail.Metadata.Label
          title="Cache State"
          text={snapshot.cacheState.toUpperCase()}
        />
      ) : null}
      {snapshot?.syncIssues[0] ? (
        <List.Item.Detail.Metadata.Label
          title="Snapshot Issue"
          text={snapshot.syncIssues[0].resource}
        />
      ) : null}
      {recentReading ? (
        <List.Item.Detail.Metadata.Label
          title="Latest Reading"
          text={formatRelativeTime(recentReading.createdAt)}
        />
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

function buildWorkflowMetadata(
  workflow: WorkflowSummary,
  snapshot: DashboardSnapshot | null,
) {
  const readingCount = getWorkflowReadingCount(snapshot, workflow.id);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Workflow ID" text={workflow.id} />
      <List.Item.Detail.Metadata.Label
        title="Engine Count"
        text={String(workflow.engineCount)}
      />
      <List.Item.Detail.Metadata.Label
        title="Cached Readings"
        text={formatCount(readingCount, "reading")}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Catalog Synced"
        text={formatRelativeTime(workflow.fetchedAt)}
      />
      <List.Item.Detail.Metadata.Label
        title="Catalog Synced At"
        text={formatAbsoluteTime(workflow.fetchedAt)}
      />
      {snapshot ? (
        <List.Item.Detail.Metadata.Label
          title="Cache State"
          text={snapshot.cacheState.toUpperCase()}
        />
      ) : null}
      {snapshot?.syncIssues[0] ? (
        <List.Item.Detail.Metadata.Label
          title="Snapshot Issue"
          text={snapshot.syncIssues[0].resource}
        />
      ) : null}
      {workflow.engineIds.length ? (
        <List.Item.Detail.Metadata.Label
          title="Engine IDs"
          text={workflow.engineIds.join(", ")}
        />
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

function buildReadingMetadata(
  reading: ReadingSummary,
  snapshot?: DashboardSnapshot | null,
) {
  const resultKeys = getReadingStructuredKeys(reading);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Reading ID" text={reading.id} />
      <List.Item.Detail.Metadata.Label title="Engine" text={reading.engineId} />
      {reading.workflowId ? (
        <List.Item.Detail.Metadata.Label
          title="Workflow"
          text={reading.workflowId}
        />
      ) : null}
      <List.Item.Detail.Metadata.Label
        title="Consciousness"
        text={String(reading.consciousnessLevel)}
      />
      <List.Item.Detail.Metadata.Label
        title="Calculation Time"
        text={formatCalculationTime(reading.calculationTimeMs)}
      />
      {resultKeys.length ? (
        <List.Item.Detail.Metadata.Label
          title="Result Keys"
          text={resultKeys.join(", ")}
        />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Created"
        text={formatRelativeTime(reading.createdAt)}
      />
      <List.Item.Detail.Metadata.Label
        title="Created At"
        text={formatAbsoluteTime(reading.createdAt)}
      />
      {snapshot ? (
        <List.Item.Detail.Metadata.Label
          title="Cache State"
          text={snapshot.cacheState.toUpperCase()}
        />
      ) : null}
      {snapshot?.syncIssues[0] ? (
        <List.Item.Detail.Metadata.Label
          title="Snapshot Issue"
          text={snapshot.syncIssues[0].resource}
        />
      ) : null}
      <List.Item.Detail.Metadata.Label
        title="Input Hash"
        text={reading.inputHash}
      />
    </List.Item.Detail.Metadata>
  );
}

function buildSnapshotStatusLines(
  snapshot: DashboardSnapshot | null,
): string[] {
  if (!snapshot) {
    return [];
  }

  const lines = [
    `- Cache state: ${snapshot.cacheState.toUpperCase()}`,
    snapshot.timestamps.lastSyncAt
      ? `- Last dashboard sync: ${formatRelativeTime(snapshot.timestamps.lastSyncAt)}`
      : "- Last dashboard sync: Not synced yet",
  ];

  if (snapshot.syncIssues.length === 0) {
    lines.push("- Sync issues: none");
    return lines;
  }

  lines.push(`- Sync issues: ${snapshot.syncIssues.length}`);
  snapshot.syncIssues.slice(0, 2).forEach((issue) => {
    lines.push(`- ${issue.resource}: ${issue.message}`);
  });

  return lines;
}

function getEngineReadingCount(
  snapshot: DashboardSnapshot | null,
  engineId: string,
): number {
  return (
    snapshot?.readingStats.find((entry) => entry.engineId === engineId)
      ?.count ?? 0
  );
}

function getWorkflowReadingCount(
  snapshot: DashboardSnapshot | null,
  workflowId: string,
): number {
  return (
    snapshot?.readings.filter((reading) => reading.workflowId === workflowId)
      .length ?? 0
  );
}

function groupEnginesByPhase(engines: EngineSummary[]) {
  const groups = new Map<number, EngineSummary[]>();

  for (const engine of engines) {
    const existing = groups.get(engine.requiredPhase) ?? [];
    existing.push(engine);
    groups.set(engine.requiredPhase, existing);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .map(([phase, items]) => ({
      title: formatPhaseLabel(phase),
      items,
    }));
}

function groupWorkflows(workflows: WorkflowSummary[]) {
  const grouped = new Map<string, WorkflowSummary[]>();

  for (const workflow of workflows) {
    const key =
      workflow.engineCount <= 1
        ? "Focused"
        : workflow.engineCount <= 3
          ? "Composite"
          : "Orchestration";
    const current = grouped.get(key) ?? [];
    current.push(workflow);
    grouped.set(key, current);
  }

  return ["Focused", "Composite", "Orchestration"]
    .filter((title) => grouped.has(title))
    .map((title) => ({
      title,
      items: grouped.get(title) ?? [],
    }));
}

function groupReadingsByRecency(readings: ReadingSummary[]) {
  const groups = new Map<string, ReadingSummary[]>();

  for (const reading of readings) {
    const title = getReadingSectionTitle(reading.createdAt);
    const current = groups.get(title) ?? [];
    current.push(reading);
    groups.set(title, current);
  }

  return ["Today", "This Week", "Archive"]
    .filter((title) => groups.has(title))
    .map((title) => ({
      title,
      items: groups.get(title) ?? [],
    }));
}

function getReadingSectionTitle(createdAt: string): string {
  const parsed = Date.parse(createdAt);
  if (Number.isNaN(parsed)) {
    return "Archive";
  }

  const diffDays = (Date.now() - parsed) / (1000 * 60 * 60 * 24);

  if (diffDays < 1) {
    return "Today";
  }

  if (diffDays < 7) {
    return "This Week";
  }

  return "Archive";
}

function getWorkflowColor(engineCount: number) {
  if (engineCount <= 1) {
    return COLOR_INFO;
  }

  if (engineCount <= 3) {
    return COLOR_WARNING;
  }

  return COLOR_SELECTED;
}

function getReadingIcon(reading: ReadingSummary) {
  return reading.workflowId
    ? { source: Icon.Network, tintColor: COLOR_INFO }
    : { source: Icon.Book, tintColor: COLOR_SUCCESS };
}

function safeStringify(value: unknown, maxLength = 2000): string {
  const content = JSON.stringify(value, null, 2) ?? "null";
  return content.length > maxLength
    ? `${content.slice(0, maxLength - 1)}…`
    : content;
}
