import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  confirmAlert,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { normalizeBaseUrl, validateSelemeneCredentials } from "../lib/api";
import { syncDashboardSnapshot } from "../lib/queries";
import {
  clearStoredConfig,
  DEFAULT_BASE_URL,
  getStoredApiKey,
  getStoredBaseUrl,
  saveStoredConfig,
} from "../lib/settings";

interface OnboardingValues {
  baseUrl: string;
  apiKey: string;
}

interface OnboardingFormProps {
  onSaved?: () => Promise<void> | void;
}

export function OnboardingForm(props: OnboardingFormProps) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState("");
  const [existingApiKey, setExistingApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [savedBaseUrl, savedApiKey] = await Promise.all([
        getStoredBaseUrl(),
        getStoredApiKey(),
      ]);
      setBaseUrl(savedBaseUrl);
      setExistingApiKey(savedApiKey);
      setIsLoading(false);
    };

    load();
  }, []);

  const handleSubmit = async (values: OnboardingValues) => {
    const resolvedApiKey = values.apiKey.trim() || existingApiKey;
    const resolvedBaseUrl = normalizeBaseUrl(
      values.baseUrl.trim() || DEFAULT_BASE_URL,
    );

    if (!resolvedApiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API key required",
        message: "Paste a Selemene Engine API key to complete onboarding.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await validateSelemeneCredentials({
        baseUrl: resolvedBaseUrl,
        apiKey: resolvedApiKey,
      });
      await saveStoredConfig({
        baseUrl: resolvedBaseUrl,
        apiKey: resolvedApiKey,
      });
      await syncDashboardSnapshot({
        force: true,
        configOverride: { baseUrl: resolvedBaseUrl, apiKey: resolvedApiKey },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Selemene Engine connected",
        message: "Local cache warmed and ready.",
      });

      setExistingApiKey(resolvedApiKey);
      setApiKey("");

      if (props.onSaved) {
        await props.onSaved();
      } else {
        await open("raycast://extensions/sheshiyer/noesis/dashboard");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Onboarding failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to validate the Selemene Engine API key.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    const confirmed = await confirmAlert({
      title: "Clear saved Selemene Engine key?",
      message:
        "The local cache stays on disk, but live sync will stop until you reconnect.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Clear Key",
      },
    });

    if (!confirmed) {
      return;
    }

    await clearStoredConfig();
    setExistingApiKey("");
    setApiKey("");

    await showToast({
      style: Toast.Style.Success,
      title: "Saved key cleared",
    });
  };

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Validate and Save"
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
          {existingApiKey ? (
            <Action
              title="Clear Saved Key"
              icon={Icon.Trash}
              onAction={handleClear}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Onboarding"
        text="Connect Tryambakam Noesis to the Selemene Engine. The API key is saved in Raycast local storage; cached profile, workflows, usage, and readings live in local SQLite for fast retrieval."
      />
      <Form.TextField
        id="baseUrl"
        title="Base URL"
        info="Production defaults to https://selemene.tryambakam.space"
        value={baseUrl}
        onChange={setBaseUrl}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        info="Enter a new key to replace the saved one."
        placeholder={
          existingApiKey
            ? "Saved key present. Paste a new one to rotate it."
            : "nk_..."
        }
        value={apiKey}
        onChange={setApiKey}
      />
      {existingApiKey ? (
        <Form.Description
          title="Saved Key"
          text="A key is already stored locally. Leaving the API key field blank keeps the current key and only updates the base URL."
        />
      ) : null}
    </Form>
  );
}
