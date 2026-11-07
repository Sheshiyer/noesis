import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import {
  calculateForSubject,
  getAccountContext,
  getSubjectProfile,
  startEmailLink,
  SubjectReading,
  subjectReading,
  subjectReadings,
} from "../lib/account";
import { signIn } from "../lib/account-session";
import { getStoredConfig } from "../lib/settings";
import { SelemeneApiClient, toEngineExecutionResult } from "../lib/api";
import { buildEngineResultMarkdown } from "../lib/execution-result-presenter";

export function EmailLinkForm({ baseUrl }: { baseUrl: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState<string>();
  async function submit() {
    setBusy(true);
    try {
      if (pending) {
        await signIn(baseUrl);
        const context = await getAccountContext(baseUrl);
        if (
          context.account.preferred_email.toLowerCase() !==
          email.trim().toLowerCase()
        )
          throw new Error(
            "The requested email is not yet the verified preferred email. Complete browser verification, then sign in again.",
          );
        setVerified(context.account.preferred_email);
      } else {
        const url = await startEmailLink(baseUrl, email.trim());
        setPending(true);
        await open(url);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Email Verification",
        message: String(error),
      });
    } finally {
      setBusy(false);
    }
  }
  if (verified)
    return (
      <Detail
        markdown={`# Preferred email verified\n\n${verified}\n\nRead back from your Selemene account after fresh sign-in.`}
      />
    );
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              pending ? "Sign in Again and Verify" : "Start Email Verification"
            }
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          pending
            ? "Pending browser verification. Your old preferred email remains active until verification succeeds. Then sign in again to read back the result. This is not a profile save."
            : "Verify a new preferred email through the identity provider. Verification preserves your account UUID and ends existing sessions."
        }
      />
      {pending ? (
        <Form.Description title="Pending Email" text={email} />
      ) : (
        <Form.TextField
          id="email"
          title="New Preferred Email"
          value={email}
          onChange={setEmail}
        />
      )}
    </Form>
  );
}
function Result({ row }: { row: SubjectReading }) {
  const result = row.result
    ? toEngineExecutionResult(row.result, {
        target: "selemene",
        label: "Subject-scoped Selemene",
        baseUrl: "",
      })
    : null;
  return (
    <Detail
      markdown={
        result
          ? `${buildEngineResultMarkdown(row.engine_id ?? result.engineId, result)}\n\n---\nSubject: ${row.subject_id}\n\nProfile revision: ${row.profile_revision}\n\nActor account: ${row.actor_account_id}`
          : "No result returned."
      }
    />
  );
}
export function SubjectEngineForm({
  baseUrl,
  subjectId,
}: {
  baseUrl: string;
  subjectId: string;
}) {
  const [engine, setEngine] = useState("");
  const [engines, setEngines] = useState<string[]>([]);
  const [options, setOptions] = useState("{}");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubjectReading>();
  useEffect(() => {
    getStoredConfig()
      .then(async (config) => {
        if (config?.authMode === "account") {
          const status = await new SelemeneApiClient(config, fetch).getStatus();
          setEngines(status.engines);
        }
      })
      .catch(() => {});
  }, []);
  async function run() {
    setBusy(true);
    try {
      const values: unknown = JSON.parse(options);
      if (!values || typeof values !== "object" || Array.isArray(values))
        throw new Error(
          "Options must be a JSON object containing your explicit engine inputs.",
        );
      const profile = await getSubjectProfile(baseUrl, subjectId);
      setResult(
        await calculateForSubject(
          baseUrl,
          profile,
          engine,
          values as Record<string, unknown>,
          time || undefined,
        ),
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Calculation Failed",
        message: String(error),
      });
    } finally {
      setBusy(false);
    }
  }
  if (result) return <Result row={result} />;
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Calculate for This Subject"
            onSubmit={run}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Birth inputs come from this subject’s accepted server profile. Enter only the chosen engine’s explicit question, cast, assessment, consent or other required options. Missing inputs remain missing; server availability and permission checks apply." />
      {engines.length ? (
        <Form.Dropdown
          id="engine"
          title="Engine"
          value={engine}
          onChange={setEngine}
        >
          <Form.Dropdown.Item value="" title="Choose an Engine" />
          {engines.map((id) => (
            <Form.Dropdown.Item key={id} value={id} title={id} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="engine"
          title="Engine ID"
          value={engine}
          onChange={setEngine}
        />
      )}
      <Form.TextArea
        id="options"
        title="Explicit Engine Options (JSON)"
        value={options}
        onChange={setOptions}
      />
      <Form.TextField
        id="time"
        title="Calculation Time (Optional)"
        placeholder="ISO timestamp; blank uses server current time"
        value={time}
        onChange={setTime}
      />
    </Form>
  );
}
function ReadingDetail({
  baseUrl,
  subjectId,
  id,
}: {
  baseUrl: string;
  subjectId: string;
  id: string;
}) {
  const [row, setRow] = useState<SubjectReading>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    subjectReading(baseUrl, subjectId, id)
      .then(setRow)
      .catch((e) => setError(String(e)));
  }, [baseUrl, subjectId, id]);
  return row ? (
    <Result row={row} />
  ) : (
    <Detail isLoading={!error} markdown={error ?? "Loading reading"} />
  );
}
export function SubjectReadings({
  baseUrl,
  subjectId,
}: {
  baseUrl: string;
  subjectId: string;
}) {
  const [rows, setRows] = useState<SubjectReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  useEffect(() => {
    subjectReadings(baseUrl, subjectId)
      .then(setRows)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [baseUrl, subjectId]);
  return (
    <List isLoading={loading}>
      <List.EmptyView title={error ?? "No readings for this subject"} />
      {rows.map((row) => (
        <List.Item
          key={row.id}
          title={row.engine_id ?? "Reading"}
          subtitle={`${row.created_at ?? ""} · revision ${row.profile_revision}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Reading"
                target={
                  <ReadingDetail
                    baseUrl={baseUrl}
                    subjectId={subjectId}
                    id={row.id}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
