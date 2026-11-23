import {
  EmailLinkForm,
  SubjectEngineForm,
  SubjectReadings,
} from "./components/account-actions";
import React, { useEffect, useState } from "react";
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { getStoredBaseUrl } from "./lib/settings";
import { hasAccountSession, signIn, signOut } from "./lib/account-session";
import {
  AccountContext,
  getAccountContext,
  getSubjectProfile,
  profileSnapshot,
  setDefaultSubject,
  SubjectProfile,
} from "./lib/account";
import { ProfileForm } from "./components/profile-form";
import { DashboardSnapshot } from "./lib/types";

function SubjectView({
  baseUrl,
  account,
  subjectId,
}: {
  baseUrl: string;
  account: AccountContext;
  subjectId: string;
}) {
  const [resource, setResource] = useState<SubjectProfile>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    getSubjectProfile(baseUrl, subjectId)
      .then((value) => {
        if (!cancelled) setResource(value);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, subjectId]);
  if (!resource)
    return (
      <List isLoading={!error}>
        <List.EmptyView title={error ?? "Loading server profile"} />
      </List>
    );
  const snapshot: DashboardSnapshot = {
    baseUrl,
    hasCredentials: true,
    cacheState: "empty",
    source: "live",
    profile: profileSnapshot(resource, account),
    workflows: [],
    engines: [],
    readings: [],
    readingStats: [],
    rateLimit: {},
    syncIssues: [],
    timestamps: {},
  };
  return (
    <ProfileForm
      key={`${resource.subject_id}:${resource.revision}`}
      snapshot={snapshot}
      account={account}
      resource={resource}
      baseUrl={baseUrl}
    />
  );
}
export default function AccountCommand() {
  const [context, setContext] = useState<AccountContext>();
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  async function refresh() {
    setLoading(true);
    try {
      const base = await getStoredBaseUrl();
      setBaseUrl(base);
      setContext(
        (await hasAccountSession(base))
          ? await getAccountContext(base)
          : undefined,
      );
      setError(undefined);
    } catch (e) {
      setContext(undefined);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function act(operation: () => Promise<void>) {
    try {
      await operation();
      await refresh();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Account action failed",
        message: String(e),
      });
    }
  }
  const actions = (
    <ActionPanel>
      {!context ? (
        <Action
          title="Sign in in Browser"
          onAction={() => act(() => signIn(baseUrl))}
        />
      ) : (
        <Action
          title="Sign out and Clear Private Cache"
          onAction={() => act(() => signOut(baseUrl))}
        />
      )}
      <Action title="Reload Account Grants" onAction={refresh} />
    </ActionPanel>
  );
  return (
    <List
      isLoading={loading}
      actions={actions}
      navigationTitle="Selemene Account"
    >
      {!context ? (
        <List.Item
          title="Sign in to Selemene"
          subtitle={
            error ?? "Browser verification • guest defaults remain local"
          }
          actions={actions}
        />
      ) : (
        <>
          <List.Section title="Verified Account">
            <List.Item
              title="Change Preferred Email"
              subtitle="Pending until browser verification and fresh sign-in"
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Verify Preferred Email"
                    target={<EmailLinkForm baseUrl={baseUrl} />}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title={context.account.preferred_email}
              subtitle="Verified preferred email"
              actions={actions}
            />
          </List.Section>
          <List.Section title="Allowed Subjects">
            {context.subjects
              .filter((s) => s.can_read)
              .map((subject) => (
                <List.Item
                  key={subject.id}
                  title={subject.display_name}
                  subtitle={`${subject.can_edit ? "Can edit" : "Read only"} • revision ${subject.profile_revision}${context.default_subject_id === subject.id ? " • Default" : ""}`}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Open Server Profile"
                        target={
                          <SubjectView
                            baseUrl={baseUrl}
                            account={context}
                            subjectId={subject.id}
                          />
                        }
                      />
                      <Action.Push
                        title="Read Subject History"
                        target={
                          <SubjectReadings
                            baseUrl={baseUrl}
                            subjectId={subject.id}
                          />
                        }
                      />
                      {subject.can_calculate === true && (
                        <Action.Push
                          title="Calculate for This Subject"
                          target={
                            <SubjectEngineForm
                              baseUrl={baseUrl}
                              subjectId={subject.id}
                            />
                          }
                        />
                      )}
                      <Action
                        title="Set Shared Default Subject"
                        onAction={() =>
                          act(() => setDefaultSubject(baseUrl, subject.id))
                        }
                      />
                      <Action
                        title="Sign out and Clear Private Cache"
                        onAction={() => act(() => signOut(baseUrl))}
                      />
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
          <List.Section title="Allowed Relationships">
            {context.relationships
              .filter((r) => r.can_read)
              .map((r) => (
                <List.Item
                  key={r.id}
                  title={r.label}
                  subtitle="Independent relationship read grant"
                />
              ))}
          </List.Section>
        </>
      )}
      <List.Section title="Separate Operator Mode">
        <List.Item
          title="Access Key"
          subtitle="Managed in the Access Key command; not a verified human sign-in"
        />
      </List.Section>
    </List>
  );
}
