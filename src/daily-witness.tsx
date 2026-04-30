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
import { executeWorkflow } from "./lib/api";
import {
  buildDailyWitnessInitialValues,
  DailyWitnessFormValues,
  resolveDailyWitnessWorkflowId,
  resolveDailyWitnessWorkflowName,
  serializeExecutionInput,
  toDailyWitnessExecutionInput,
} from "./lib/daily-witness";
import {
  buildWorkflowResultMarkdown,
  listStructuredKeys,
} from "./lib/execution-result-presenter";
import {
  formatAbsoluteTime,
  formatCalculationTime,
} from "./lib/formatters";
import { openCommand } from "./lib/navigation";
import { syncDashboardSnapshot } from "./lib/queries";
import {
  getExecutionRoutePreference,
  getStoredBaseUrl,
  getStoredConfig,
} from "./lib/settings";
import { WorkflowExecutionResult } from "./lib/types";
import { useDashboardSnapshot } from "./lib/use-dashboard-snapshot";
import { NoesisActionPanel } from "./components/noesis-actions";

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

function WorkflowResultView({
  response,
  onBack,
  onRetry,
}: {
  response: DailyWitnessResultState;
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

  return (
    <Detail
      navigationTitle="Daily Witness"
      markdown={markdown}
      metadata={buildWorkflowMetadata(response)}
      actions={
        <NoesisActionPanel hideDashboardAction>
          <Action title="Edit Inputs" icon={Icon.Pencil} onAction={onBack} />
          <Action
            title="Run Again"
            icon={Icon.RotateClockwise}
            onAction={onRetry}
          />
          <Action
            title="Open Readings"
            icon={Icon.Book}
            onAction={() => openCommand("readings")}
          />
          <Action
            title="Copy Reading"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(markdown);
              await showToast({
                style: Toast.Style.Success,
                title: "Reading copied",
              });
            }}
          />
          <Action.CopyToClipboard
            title="Copy Request JSON"
            icon={Icon.Document}
            content={response.requestJson}
          />
          <Action.CopyToClipboard
            title="Copy Raw Result JSON"
            icon={Icon.Clipboard}
            content={JSON.stringify(response.result.raw, null, 2)}
          />
        </NoesisActionPanel>
      }
    />
  );
}

function FailureResultView({
  failure,
  onBack,
  onRetry,
}: {
  failure: DailyWitnessFailureState;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <Detail
      navigationTitle="Daily Witness"
      markdown={buildFailureMarkdown(failure)}
      metadata={buildFailureMetadata(failure)}
      actions={
        <NoesisActionPanel hideDashboardAction>
          <Action title="Edit Inputs" icon={Icon.Pencil} onAction={onBack} />
          <Action
            title="Retry Run"
            icon={Icon.RotateClockwise}
            onAction={onRetry}
          />
          <Action.CopyToClipboard
            title="Copy Error"
            icon={Icon.Clipboard}
            content={failure.message}
          />
          {failure.requestJson ? (
            <Action.CopyToClipboard
              title="Copy Request JSON"
              icon={Icon.Document}
              content={failure.requestJson}
            />
          ) : null}
        </NoesisActionPanel>
      }
    />
  );
}

export default function DailyWitness() {
  const { snapshot, isLoading } = useDashboardSnapshot();
  const initial = useMemo(
    () => buildDailyWitnessInitialValues(snapshot),
    [snapshot],
  );

  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [birthTime, setBirthTime] = useState(initial.birthTime);
  const [name, setName] = useState(initial.name);
  const [latitude, setLatitude] = useState(initial.latitude);
  const [longitude, setLongitude] = useState(initial.longitude);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<DailyWitnessResultState | null>(
    null,
  );
  const [failure, setFailure] = useState<DailyWitnessFailureState | null>(
    null,
  );

  useEffect(() => {
    if (snapshot?.profile) {
      const values = buildDailyWitnessInitialValues(snapshot);
      if (!birthDate) setBirthDate(values.birthDate);
      if (!birthTime) setBirthTime(values.birthTime);
      if (!name) setName(values.name);
      if (!latitude) setLatitude(values.latitude);
      if (!longitude) setLongitude(values.longitude);
    }
  }, [snapshot]);

  const currentValues: DailyWitnessFormValues = {
    birthDate,
    birthTime,
    name,
    latitude,
    longitude,
    timezone,
  };

  const runWitness = async () => {
    if (!birthDate.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Birth date required",
        message: "Enter your birth date in YYYY-MM-DD format",
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Consulting the witness…",
    });

    const workflowId = resolveDailyWitnessWorkflowId(snapshot);
    const workflowName = resolveDailyWitnessWorkflowName(snapshot, workflowId);
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

      toast.style = Toast.Style.Success;
      toast.title = "Reading received";
      toast.message = `${workflowName} · ${Object.keys(result.engineOutputs).length} outputs · ${formatCalculationTime(result.totalTimeMs)}`;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown witness execution error";

      setFailure({
        workflowId,
        workflowName,
        message,
        occurredAt: new Date().toISOString(),
        requestJson,
      });

      toast.style = Toast.Style.Failure;
      toast.title = "Reading failed";
      toast.message = message;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (response) {
    return (
      <WorkflowResultView
        response={response}
        onBack={() => setResponse(null)}
        onRetry={() => void runWitness()}
      />
    );
  }

  if (failure) {
    return (
      <FailureResultView
        failure={failure}
        onBack={() => setFailure(null)}
        onRetry={() => void runWitness()}
      />
    );
  }

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        <NoesisActionPanel hideDashboardAction>
          <Action.SubmitForm
            title="Get Daily Witness"
            icon={Icon.Eye}
            onSubmit={() => void runWitness()}
          />
        </NoesisActionPanel>
      }
    >
      <Form.Description
        title="Daily Witness"
        text="Run the shared witness workflow and return the dyad-backed response instead of the legacy /reading surface."
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
        info="Used when the witness workflow includes name-aware engine context"
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

async function resolveExecutionConfig() {
  const storedConfig = await getStoredConfig();
  if (storedConfig) {
    return storedConfig;
  }

  if (getExecutionRoutePreference() !== "witness") {
    throw new Error(
      "Daily Witness now runs through workflow execution. Add an API key or switch Execution Route to Witness.",
    );
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

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Workflow" text={response.workflowName} />
      <Detail.Metadata.Label title="Workflow ID" text={response.workflowId} />
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

function buildFailureMarkdown(failure: DailyWitnessFailureState) {
  return [
    "# Daily Witness Failed",
    "",
    `Workflow: ${failure.workflowName}`,
    "",
    failure.message,
    "",
    failure.requestJson
      ? ["## Request Payload", "", "```json", failure.requestJson, "```"].join(
          "\n",
        )
      : [
          "## Request Payload",
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
