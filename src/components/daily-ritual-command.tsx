import React, { useEffect, useMemo, useState } from "react";
import {
  Action,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import {
  cosmicHeader,
  sacredSubheader,
  SECTION_DIVIDER,
  goldIcon,
  emeraldIcon,
  indigoIcon,
  violetIcon,
  mutedIcon,
} from "../lib/design-tokens";
import { executeWorkflow } from "../lib/api";
import {
  buildDailyWitnessInitialValues,
  DailyWitnessFormValues,
  resolveDailyWitnessWorkflowId,
  resolveDailyWitnessWorkflowName,
  serializeExecutionInput,
  toDailyWitnessExecutionInput,
} from "../lib/daily-witness";
import {
  buildRitualLoadingMarkdown,
  buildRitualProcessingMessages,
  getRitualProcessingTitle,
} from "../lib/daily-ritual-copy";
import { deriveContextQuality } from "../lib/dashboard-ritual";
import {
  buildWorkflowResultMarkdown,
  listStructuredKeys,
  summarizeWorkflowSubject,
} from "../lib/execution-result-presenter";
import { formatAbsoluteTime, formatCalculationTime } from "../lib/formatters";
import { openCommand } from "../lib/navigation";
import { syncDashboardSnapshot } from "../lib/queries";
import { getStoredBaseUrl, getStoredConfig } from "../lib/settings";
import { WorkflowExecutionResult } from "../lib/types";
import { useDashboardSnapshot } from "../lib/use-dashboard-snapshot";
import { NoesisActionPanel } from "./noesis-actions";
import { canUseEngineWorkbench, getSnapshotAccess } from "../lib/access";

interface DailyRitualCommandProps {
  commandTitle: string;
  forcedWorkflowId?: string;
  primaryIcon?: Icon;
}

interface DailyWitnessResultState {
  workflowId: string;
  workflowName: string;
  requestJson: string;
  requestPayload: Record<string, unknown>;
  result: WorkflowExecutionResult;
}

interface DailyWitnessFailureState {
  workflowId: string;
  workflowName: string;
  message: string;
  occurredAt: string;
  requestJson?: string;
}

export function DailyRitualCommand({
  commandTitle,
  forcedWorkflowId,
  primaryIcon = Icon.Play,
}: DailyRitualCommandProps) {
  const { snapshot, isLoading, reload } = useDashboardSnapshot();
  const initial = useMemo(
    () => buildDailyWitnessInitialValues(snapshot),
    [snapshot],
  );
  const contextQuality = deriveContextQuality(snapshot);
  const executionRoute = getSnapshotAccess(snapshot).effectiveExecutionRoute;
  const executionRouteLabel =
    executionRoute === "witness" ? "Witness Gateway" : "Selemene Direct";

  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [birthTime, setBirthTime] = useState(initial.birthTime);
  const [name, setName] = useState(initial.name);
  const [latitude, setLatitude] = useState(initial.latitude);
  const [longitude, setLongitude] = useState(initial.longitude);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [isEditingInputs, setIsEditingInputs] = useState(false);
  const [response, setResponse] = useState<DailyWitnessResultState | null>(
    null,
  );
  const [failure, setFailure] = useState<DailyWitnessFailureState | null>(null);

  useEffect(() => {
    if (snapshot?.profile) {
      const values = buildDailyWitnessInitialValues(snapshot);
      if (!birthDate) setBirthDate(values.birthDate);
      if (!birthTime) setBirthTime(values.birthTime);
      if (!name) setName(values.name);
      if (!latitude) setLatitude(values.latitude);
      if (!longitude) setLongitude(values.longitude);
      if (!timezone) setTimezone(values.timezone);
    }
  }, [snapshot, birthDate, birthTime, name, latitude, longitude, timezone]);

  const currentValues: DailyWitnessFormValues = {
    birthDate,
    birthTime,
    name,
    latitude,
    longitude,
    timezone,
  };
  const workflowId = resolveDailyWitnessWorkflowId(snapshot, forcedWorkflowId);
  const workflowName = resolveDailyWitnessWorkflowName(snapshot, workflowId);
  const processingMessages = useMemo(
    () => buildRitualProcessingMessages(workflowName),
    [workflowName],
  );
  const currentLoadingMessage =
    processingMessages[
      Math.min(loadingStepIndex, processingMessages.length - 1)
    ] ??
    processingMessages[0] ??
    "Receiving signal.";
  const runActionTitle = isSubmitting
    ? getRitualProcessingTitle(commandTitle)
    : `Run ${commandTitle}`;

  const runWitness = async () => {
    if (!birthDate.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Birth date required",
        message: "Enter your birth date in YYYY-MM-DD format",
      });
      setIsEditingInputs(true);
      return;
    }

    setIsSubmitting(true);
    setLoadingStepIndex(0);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: getRitualProcessingTitle(commandTitle),
      message: processingMessages[0],
    });
    let loadingIndex = 0;
    const loadingTicker =
      processingMessages.length > 1
        ? setInterval(() => {
            loadingIndex = Math.min(
              loadingIndex + 1,
              processingMessages.length - 1,
            );
            setLoadingStepIndex(loadingIndex);
            toast.message = processingMessages[loadingIndex];
          }, 1600)
        : undefined;

    let requestJson: string | undefined;

    try {
      const config = await resolveExecutionConfig();
      const requestInput = toDailyWitnessExecutionInput(
        currentValues,
        snapshot,
        new Date().toISOString(),
      );
      const requestPayload = serializeExecutionInput(requestInput);
      requestJson = JSON.stringify(requestPayload, null, 2);

      setResponse(null);
      setFailure(null);

      const result = await executeWorkflow(config, workflowId, requestInput);
      if (config.apiKey.trim()) {
        await syncDashboardSnapshot({ force: true });
      }

      setResponse({
        workflowId,
        workflowName,
        requestJson,
        requestPayload,
        result,
      });
      setIsEditingInputs(false);

      toast.style = Toast.Style.Success;
      toast.title = `${commandTitle} received`;
      toast.message = `${workflowName} · ${Object.keys(result.engineOutputs).length} outputs · ${formatCalculationTime(result.totalTimeMs)}`;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown witness execution error";

      setFailure({
        workflowId,
        workflowName,
        message,
        occurredAt: new Date().toISOString(),
        requestJson,
      });

      toast.style = Toast.Style.Failure;
      toast.title = `${commandTitle} failed`;
      toast.message = message;
    } finally {
      if (loadingTicker) {
        clearInterval(loadingTicker);
      }
      setLoadingStepIndex(0);
      setIsSubmitting(false);
    }
  };

  if (response) {
    return (
      <WorkflowResultView
        commandTitle={commandTitle}
        response={response}
        snapshot={snapshot}
        onBack={() => {
          setResponse(null);
          setIsEditingInputs(false);
        }}
        onRetry={() => void runWitness()}
      />
    );
  }

  if (failure) {
    return (
      <FailureResultView
        commandTitle={commandTitle}
        failure={failure}
        snapshot={snapshot}
        onBack={() => {
          setFailure(null);
          setIsEditingInputs(false);
        }}
        onRetry={() => void runWitness()}
      />
    );
  }

  if (isSubmitting) {
    return (
      <LoadingResultView
        commandTitle={commandTitle}
        workflowId={workflowId}
        workflowName={workflowName}
        executionRouteLabel={executionRouteLabel}
        contextQualityLabel={contextQuality.label}
        currentValues={currentValues}
        currentMessage={currentLoadingMessage}
        messages={processingMessages}
      />
    );
  }

  if (isEditingInputs) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <NoesisActionPanel
            snapshot={snapshot}
            onRefresh={reload}
            hideDashboardAction
            refreshTitle="Refresh Ritual Defaults"
          >
            <Action.SubmitForm
              title={runActionTitle}
              icon={primaryIcon}
              onSubmit={() => void runWitness()}
            />
            <Action
              title="Back to Overview"
              icon={mutedIcon(Icon.ArrowLeft)}
              onAction={() => setIsEditingInputs(false)}
            />
          </NoesisActionPanel>
        }
      >
        <Form.Description
          title={commandTitle}
          text={`Workflow: ${workflowName} (${workflowId})\nRoute: ${executionRouteLabel}\nContext Quality: ${contextQuality.label}`}
        />
        <Form.TextField
          id="birthDate"
          title="Birth Date"
          placeholder="1990-06-15"
          value={birthDate}
          onChange={setBirthDate}
          info="Required. Format: YYYY-MM-DD"
        />
        <Form.TextField
          id="birthTime"
          title="Birth Time"
          placeholder="14:30"
          value={birthTime}
          onChange={setBirthTime}
          info="Optional but recommended. Format: HH:MM (24h)"
        />
        <Form.TextField
          id="name"
          title="Name"
          placeholder="Your name"
          value={name}
          onChange={setName}
          info="Used when the workflow includes name-aware engine context"
        />
        <Form.Separator />
        <Form.TextField
          id="latitude"
          title="Latitude"
          placeholder="12.9716"
          value={latitude}
          onChange={setLatitude}
        />
        <Form.TextField
          id="longitude"
          title="Longitude"
          placeholder="77.5946"
          value={longitude}
          onChange={setLongitude}
        />
        <Form.TextField
          id="timezone"
          title="Timezone"
          placeholder="Asia/Kolkata"
          value={timezone}
          onChange={setTimezone}
        />
      </Form>
    );
  }

  return (
    <Detail
      navigationTitle={commandTitle}
      markdown={buildOverviewMarkdown({
        commandTitle,
        workflowId,
        workflowName,
        executionRouteLabel,
        contextQuality,
        values: currentValues,
      })}
      metadata={buildOverviewMetadata({
        workflowId,
        workflowName,
        executionRouteLabel,
        contextQuality,
        values: currentValues,
      })}
      actions={
        <NoesisActionPanel
          snapshot={snapshot}
          onRefresh={reload}
          refreshTitle="Refresh Ritual Defaults"
        >
          <Action
            title={runActionTitle}
            icon={primaryIcon}
            onAction={() => void runWitness()}
          />
          <Action
            title="Edit Inputs"
            icon={goldIcon(Icon.Pencil)}
            onAction={() => setIsEditingInputs(true)}
          />
          <Action
            title="Open Profile"
            icon={goldIcon(Icon.PersonCircle)}
            onAction={() => openCommand("profile")}
          />
        </NoesisActionPanel>
      }
    />
  );
}

function WorkflowResultView({
  commandTitle,
  response,
  snapshot,
  onBack,
  onRetry,
}: {
  commandTitle: string;
  response: DailyWitnessResultState;
  snapshot: Parameters<typeof canUseEngineWorkbench>[0];
  onBack: () => void;
  onRetry: () => void;
}) {
  const markdown = useMemo(
    () =>
      buildWorkflowResultMarkdown(
        response.workflowName,
        response.result,
        response.requestPayload,
      ),
    [response],
  );

  const canUseWorkbench = canUseEngineWorkbench(snapshot);

  return (
    <Detail
      navigationTitle={commandTitle}
      markdown={markdown}
      metadata={buildWorkflowMetadata(response)}
      actions={
        <NoesisActionPanel hideDashboardAction snapshot={snapshot}>
          <Action title="Edit Inputs" icon={goldIcon(Icon.Pencil)} onAction={onBack} />
          <Action
            title={`Run ${commandTitle} Again`}
            icon={goldIcon(Icon.RotateClockwise)}
            onAction={onRetry}
          />
          {canUseWorkbench ? (
            <Action
              title="Open Readings"
              icon={goldIcon(Icon.Book)}
              onAction={() => openCommand("readings")}
            />
          ) : null}
          <Action
            title="Copy Reading"
            icon={mutedIcon(Icon.Clipboard)}
            onAction={async () => {
              await Clipboard.copy(markdown);
              await showToast({
                style: Toast.Style.Success,
                title: "Reading copied",
              });
            }}
          />
          {canUseWorkbench ? (
            <>
              <Action.CopyToClipboard
                title="Copy Request JSON"
                icon={mutedIcon(Icon.Document)}
                content={response.requestJson}
              />
              <Action.CopyToClipboard
                title="Copy Raw Result JSON"
                icon={mutedIcon(Icon.Clipboard)}
                content={JSON.stringify(response.result.raw, null, 2)}
              />
            </>
          ) : null}
        </NoesisActionPanel>
      }
    />
  );
}

function LoadingResultView({
  commandTitle,
  workflowId,
  workflowName,
  executionRouteLabel,
  contextQualityLabel,
  currentValues,
  currentMessage,
  messages,
}: {
  commandTitle: string;
  workflowId: string;
  workflowName: string;
  executionRouteLabel: string;
  contextQualityLabel: string;
  currentValues: DailyWitnessFormValues;
  currentMessage: string;
  messages: string[];
}) {
  const parsedLatitude = currentValues.latitude.trim()
    ? Number.parseFloat(currentValues.latitude)
    : undefined;
  const parsedLongitude = currentValues.longitude.trim()
    ? Number.parseFloat(currentValues.longitude)
    : undefined;
  const subjectSummary = summarizeWorkflowSubject({
    name: currentValues.name.trim() || undefined,
    birth_date: currentValues.birthDate.trim() || undefined,
    birth_time: currentValues.birthTime.trim() || undefined,
    timezone: currentValues.timezone.trim() || undefined,
    latitude:
      typeof parsedLatitude === "number" && Number.isFinite(parsedLatitude)
        ? parsedLatitude
        : undefined,
    longitude:
      typeof parsedLongitude === "number" && Number.isFinite(parsedLongitude)
        ? parsedLongitude
        : undefined,
  });

  return (
    <Detail
      navigationTitle={commandTitle}
      markdown={buildRitualLoadingMarkdown({
        commandTitle,
        workflowId,
        workflowName,
        routeLabel: executionRouteLabel,
        contextQualityLabel,
        currentMessage,
        messages,
        subjectSummary,
      })}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Workflow" text={workflowName} />
          <Detail.Metadata.Label title="Workflow ID" text={workflowId} />
          <Detail.Metadata.Label title="Route" text={executionRouteLabel} />
          <Detail.Metadata.Label
            title="Context Quality"
            text={contextQualityLabel}
          />
          {subjectSummary ? (
            <Detail.Metadata.Label title="Subject" text={subjectSummary} />
          ) : null}
          <Detail.Metadata.Label title="Current Step" text={currentMessage} />
        </Detail.Metadata>
      }
    />
  );
}

function FailureResultView({
  commandTitle,
  failure,
  snapshot,
  onBack,
  onRetry,
}: {
  commandTitle: string;
  failure: DailyWitnessFailureState;
  snapshot: Parameters<typeof canUseEngineWorkbench>[0];
  onBack: () => void;
  onRetry: () => void;
}) {
  const canUseWorkbench = canUseEngineWorkbench(snapshot);

  return (
    <Detail
      navigationTitle={commandTitle}
      markdown={buildFailureMarkdown(commandTitle, failure)}
      metadata={buildFailureMetadata(failure)}
      actions={
        <NoesisActionPanel hideDashboardAction snapshot={snapshot}>
          <Action title="Edit Inputs" icon={goldIcon(Icon.Pencil)} onAction={onBack} />
          <Action
            title={`Retry ${commandTitle}`}
            icon={goldIcon(Icon.RotateClockwise)}
            onAction={onRetry}
          />
          <Action.CopyToClipboard
            title="Copy Error"
            icon={mutedIcon(Icon.Clipboard)}
            content={failure.message}
          />
          {canUseWorkbench && failure.requestJson ? (
            <Action.CopyToClipboard
              title="Copy Request JSON"
              icon={mutedIcon(Icon.Document)}
              content={failure.requestJson}
            />
          ) : null}
        </NoesisActionPanel>
      }
    />
  );
}

async function resolveExecutionConfig() {
  const storedConfig = await getStoredConfig();
  if (storedConfig) {
    return storedConfig;
  }

  return {
    baseUrl: await getStoredBaseUrl(),
    apiKey: "",
  };
}

function buildWorkflowMetadata(response: DailyWitnessResultState) {
  const result = response.result;
  const outputEngines = Object.keys(result.engineOutputs).slice(0, 6);
  const synthesisKeys = listStructuredKeys(result.synthesis);
  const subjectSummary = summarizeWorkflowSubject(result.subject, 120);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Workflow" text={response.workflowName} />
      <Detail.Metadata.Label title="Workflow ID" text={response.workflowId} />
      {result.readingId ? (
        <Detail.Metadata.Label title="Reading ID" text={result.readingId} />
      ) : null}
      <Detail.Metadata.Label
        title="Engine Outputs"
        text={String(Object.keys(result.engineOutputs).length)}
      />
      <Detail.Metadata.Label
        title="Total Time"
        text={formatCalculationTime(result.totalTimeMs)}
      />
      {result.route ? (
        <Detail.Metadata.Label title="Route" text={result.route.label} />
      ) : null}
      {result.timestamp ? (
        <Detail.Metadata.Label
          title="Timestamp"
          text={formatAbsoluteTime(result.timestamp)}
        />
      ) : null}
      {subjectSummary ? (
        <Detail.Metadata.Label title="Subject" text={subjectSummary} />
      ) : null}
      {outputEngines.length ? (
        <Detail.Metadata.Label
          title="Output Engines"
          text={outputEngines.join(", ")}
        />
      ) : null}
      {synthesisKeys.length ? (
        <Detail.Metadata.Label
          title="Synthesis Keys"
          text={synthesisKeys.join(", ")}
        />
      ) : null}
    </Detail.Metadata>
  );
}

function buildOverviewMarkdown({
  commandTitle,
  workflowId,
  workflowName,
  executionRouteLabel,
  contextQuality,
  values,
}: {
  commandTitle: string;
  workflowId: string;
  workflowName: string;
  executionRouteLabel: string;
  contextQuality: ReturnType<typeof deriveContextQuality>;
  values: DailyWitnessFormValues;
}) {
  return [
    cosmicHeader(commandTitle),
    "",
    "One-tap ritual flow first. Shared defaults resolve the workflow and route up front, while manual input edits stay available behind Edit Inputs.",
    "",
    sacredSubheader("Ready to Run"),
    "",
    `- Workflow: ${workflowName}`,
    `- Workflow ID: ${workflowId}`,
    `- Route: ${executionRouteLabel}`,
    `- Context Quality: ${contextQuality.label}`,
    `- Context Note: ${contextQuality.summary}`,
    "",
    SECTION_DIVIDER,
    "",
    sacredSubheader("Ritual Defaults"),
    "",
    values.name ? `- Name: ${values.name}` : "- Name: Not set",
    values.birthDate
      ? `- Birth Date: ${values.birthDate}`
      : "- Birth Date: Required before execution",
    values.birthTime
      ? `- Birth Time: ${values.birthTime}`
      : "- Birth Time: Optional but recommended",
    values.timezone ? `- Timezone: ${values.timezone}` : "- Timezone: Missing",
    values.latitude && values.longitude
      ? `- Coordinates: ${values.latitude}, ${values.longitude}`
      : "- Coordinates: Optional until you want complete context quality",
  ].join("\n");
}

function buildOverviewMetadata({
  workflowId,
  workflowName,
  executionRouteLabel,
  contextQuality,
  values,
}: {
  workflowId: string;
  workflowName: string;
  executionRouteLabel: string;
  contextQuality: ReturnType<typeof deriveContextQuality>;
  values: DailyWitnessFormValues;
}) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Workflow" text={workflowName} />
      <Detail.Metadata.Label title="Workflow ID" text={workflowId} />
      <Detail.Metadata.Label title="Route" text={executionRouteLabel} />
      <Detail.Metadata.TagList title="Context Quality">
        <Detail.Metadata.TagList.Item text={contextQuality.label} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label
        title="Birth Date"
        text={values.birthDate || "Missing"}
      />
      <Detail.Metadata.Label
        title="Birth Time"
        text={values.birthTime || "Optional"}
      />
      <Detail.Metadata.Label
        title="Timezone"
        text={values.timezone || "Missing"}
      />
      <Detail.Metadata.Label
        title="Coordinates"
        text={
          values.latitude && values.longitude
            ? `${values.latitude}, ${values.longitude}`
            : "Optional"
        }
      />
    </Detail.Metadata>
  );
}

function buildFailureMarkdown(
  commandTitle: string,
  failure: DailyWitnessFailureState,
) {
  return [
    cosmicHeader(`${commandTitle} Failed`),
    "",
    `Workflow: ${failure.workflowName}`,
    "",
    failure.message,
    "",
    failure.requestJson
      ? [sacredSubheader("Request Payload"), "", "```json", failure.requestJson, "```"].join(
          "\n",
        )
      : [
          sacredSubheader("Request Payload"),
          "",
          "The request did not reach the API because local validation failed before submission.",
        ].join("\n"),
  ].join("\n");
}

function buildFailureMetadata(failure: DailyWitnessFailureState) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Status" text="Failed" />
      <Detail.Metadata.Label title="Workflow" text={failure.workflowName} />
      <Detail.Metadata.Label title="Workflow ID" text={failure.workflowId} />
      <Detail.Metadata.Label
        title="Occurred"
        text={formatAbsoluteTime(failure.occurredAt)}
      />
    </Detail.Metadata>
  );
}
