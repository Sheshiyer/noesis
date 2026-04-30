import {
  DashboardSnapshot,
  EngineExecutionInput,
  PrecisionLevel,
  UserProfileSnapshot,
} from "./types";

export interface DailyWitnessFormValues {
  birthDate: string;
  birthTime: string;
  name: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

export const DEFAULT_DAILY_WITNESS_WORKFLOW_ID = "daily-practice";

export function buildDailyWitnessInitialValues(
  snapshot: DashboardSnapshot | null,
): DailyWitnessFormValues {
  const profile = snapshot?.profile;

  return {
    birthDate: profile?.birthDate ?? "",
    birthTime: normalizeBirthTime(profile?.birthTime),
    name: profile?.fullName ?? "",
    latitude:
      profile?.birthLocation?.latitude !== undefined
        ? String(profile.birthLocation.latitude)
        : "",
    longitude:
      profile?.birthLocation?.longitude !== undefined
        ? String(profile.birthLocation.longitude)
        : "",
    timezone:
      profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function resolveDailyWitnessWorkflowId(
  snapshot: DashboardSnapshot | null,
): string {
  const configured = snapshot?.profile?.preferences.default_workflow;
  return typeof configured === "string" && configured.trim().length > 0
    ? configured.trim()
    : DEFAULT_DAILY_WITNESS_WORKFLOW_ID;
}

export function resolveDailyWitnessWorkflowName(
  snapshot: DashboardSnapshot | null,
  workflowId: string,
): string {
  const workflow = snapshot?.workflows.find((item) => item.id === workflowId);
  return workflow?.name ?? humanizeIdentifier(workflowId);
}

export function toDailyWitnessExecutionInput(
  values: DailyWitnessFormValues,
  snapshot: DashboardSnapshot | null,
  currentTime: string,
): EngineExecutionInput {
  const latitude = parseOptionalNumber(values.latitude, "Latitude", -90, 90);
  const longitude = parseOptionalNumber(
    values.longitude,
    "Longitude",
    -180,
    180,
  );

  if (
    (latitude !== undefined || longitude !== undefined) &&
    (latitude === undefined || longitude === undefined)
  ) {
    throw new Error(
      "Latitude and longitude must both be provided when setting a birth location.",
    );
  }

  if (values.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate)) {
    throw new Error("Birth date must use YYYY-MM-DD.");
  }

  if (values.birthTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(values.birthTime)) {
    throw new Error("Birth time must use HH:MM or HH:MM:SS.");
  }

  const precision = normalizePrecisionPreference(snapshot?.profile);

  return {
    birthData: {
      ...(values.name.trim() ? { name: values.name.trim() } : {}),
      ...(values.birthDate.trim() ? { date: values.birthDate.trim() } : {}),
      ...(values.birthTime.trim() ? { time: values.birthTime.trim() } : {}),
      ...(typeof latitude === "number" ? { latitude } : {}),
      ...(typeof longitude === "number" ? { longitude } : {}),
      ...(values.timezone.trim() ? { timezone: values.timezone.trim() } : {}),
    },
    currentTime,
    ...(precision ? { precision } : {}),
    options: {
      mode: "daily",
    },
  };
}

export function serializeExecutionInput(
  input: EngineExecutionInput,
): Record<string, unknown> {
  return {
    ...(input.birthData &&
    Object.values(input.birthData).some(
      (value) => value !== undefined && value !== "",
    )
      ? {
          birth_data: {
            ...(input.birthData.name ? { name: input.birthData.name } : {}),
            ...(input.birthData.date ? { date: input.birthData.date } : {}),
            ...(input.birthData.time ? { time: input.birthData.time } : {}),
            ...(typeof input.birthData.latitude === "number"
              ? { latitude: input.birthData.latitude }
              : {}),
            ...(typeof input.birthData.longitude === "number"
              ? { longitude: input.birthData.longitude }
              : {}),
            ...(input.birthData.timezone
              ? { timezone: input.birthData.timezone }
              : {}),
          },
        }
      : {}),
    ...(input.currentTime ? { current_time: input.currentTime } : {}),
    ...(input.precision ? { precision: input.precision } : {}),
    ...(input.options && Object.keys(input.options).length > 0
      ? { options: input.options }
      : {}),
  };
}

function normalizePrecisionPreference(
  profile: UserProfileSnapshot | undefined,
): PrecisionLevel | undefined {
  const raw = profile?.preferences.precision;
  if (typeof raw !== "string") {
    return undefined;
  }

  switch (raw.trim().toLowerCase()) {
    case "standard":
      return "Standard";
    case "high":
      return "High";
    case "extreme":
      return "Extreme";
    default:
      return undefined;
  }
}

function parseOptionalNumber(
  raw: string,
  label: string,
  min: number,
  max: number,
): number | undefined {
  const value = raw.trim();
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }

  return parsed;
}

function normalizeBirthTime(value?: string) {
  if (!value) {
    return "";
  }

  return value.replace(/:00$/, "");
}

function humanizeIdentifier(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
