import {
  DashboardSnapshot,
  EngineExecutionInput,
  EngineExecutionResult,
  MenuBarInsightKind,
  MenuBarInsightSnapshot,
  PrecisionLevel,
  PulseModeKind,
  SourcePulseModeKind,
  UserProfileSnapshot,
} from "./types";
import { formatTimeUntil } from "./formatters";

export const PERSONAL_INSIGHT_REFRESH_MS = 2 * 60 * 60 * 1000;
const MENU_BAR_SOURCE_FALLBACK_ORDER: SourcePulseModeKind[] = [
  "vedicClock",
  "vimshottari",
  "biorhythm",
];
const SOURCE_PULSE_KINDS: SourcePulseModeKind[] = [
  "vedicClock",
  "biorhythm",
  "vimshottari",
];
const MENU_BAR_TITLE_MAX_LENGTH = 28;
const MENU_BAR_SUBTITLE_MAX_LENGTH = 72;

export interface MenuBarInsightPlan {
  kind: MenuBarInsightKind;
  engineId: string;
  input: EngineExecutionInput;
  refreshAfterOverride?: string;
}

const MENU_BAR_ENGINE_IDS: Record<MenuBarInsightKind, string> = {
  vedicClock: "vedic-clock",
  biorhythm: "biorhythm",
  vimshottari: "vimshottari",
  nadabrahman: "nadabrahman",
};

export function mapMenuBarInsights(
  insights: MenuBarInsightSnapshot[],
): Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>> {
  return insights.reduce<
    Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>
  >((accumulator, insight) => {
    accumulator[insight.kind] = insight;
    return accumulator;
  }, {});
}

export function buildMenuBarInsightPlans(
  dashboard: DashboardSnapshot,
  currentInsights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  now: Date = new Date(),
  force = false,
): MenuBarInsightPlan[] {
  const plans: MenuBarInsightPlan[] = [];
  const nowIso = now.toISOString();

  if (force || shouldRefreshInsight(currentInsights.vedicClock, now)) {
    plans.push({
      kind: "vedicClock",
      engineId: MENU_BAR_ENGINE_IDS.vedicClock,
      input: {
        currentTime: nowIso,
        options: {
          timezone_offset: -now.getTimezoneOffset(),
        },
      },
    });
  }

  if (dashboard.profile?.birthDate) {
    const birthData = toBirthData(dashboard.profile);

    if (force || shouldRefreshInsight(currentInsights.biorhythm, now)) {
      plans.push({
        kind: "biorhythm",
        engineId: MENU_BAR_ENGINE_IDS.biorhythm,
        input: {
          currentTime: nowIso,
          birthData,
        },
      });
    }

    if (force || shouldRefreshInsight(currentInsights.vimshottari, now)) {
      plans.push({
        kind: "vimshottari",
        engineId: MENU_BAR_ENGINE_IDS.vimshottari,
        input: {
          currentTime: nowIso,
          birthData,
        },
      });
    }
  }

  return plans;
}

export function buildMenuBarRemedyPlan(
  dashboard: DashboardSnapshot,
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  now: Date = new Date(),
  force = false,
  sourceUpdated = false,
): MenuBarInsightPlan | undefined {
  if (!dashboard.profile?.birthDate) {
    return undefined;
  }

  const cadence = buildPulseCadenceContext(insights, now.toISOString());
  if (!cadence) {
    return undefined;
  }

  if (
    !force &&
    !sourceUpdated &&
    !shouldRefreshInsight(insights.nadabrahman, now)
  ) {
    return undefined;
  }

  return {
    kind: "nadabrahman",
    engineId: MENU_BAR_ENGINE_IDS.nadabrahman,
    input: {
      birthData: toBirthData(dashboard.profile),
      currentTime: now.toISOString(),
      precision: normalizePrecisionPreference(dashboard.profile) ?? "Standard",
      options: {
        mode: "pulse-remedy",
        pulse_cadence: cadence,
      },
    },
    refreshAfterOverride: getCadenceRefreshAfter(insights, now.toISOString()),
  };
}

export function buildMenuBarInsight(
  kind: MenuBarInsightKind,
  result: EngineExecutionResult,
  fetchedAt: string,
  includeRawPayloads = false,
  refreshAfterOverride?: string,
): MenuBarInsightSnapshot {
  switch (kind) {
    case "vedicClock":
      return buildVedicClockInsight(result, fetchedAt, includeRawPayloads);
    case "biorhythm":
      return buildBiorhythmInsight(result, fetchedAt, includeRawPayloads);
    case "vimshottari":
      return buildVimshottariInsight(result, fetchedAt, includeRawPayloads);
    case "nadabrahman":
      return buildNadabrahmanInsight(
        result,
        fetchedAt,
        includeRawPayloads,
        refreshAfterOverride,
      );
    default:
      return {
        kind,
        engineId: result.engineId,
        title: result.engineId,
        summary: "Insight available",
        payload: buildInsightPayload(result, includeRawPayloads),
        fetchedAt,
        refreshAfter: addMilliseconds(fetchedAt, PERSONAL_INSIGHT_REFRESH_MS),
      };
  }
}

export function buildMenuBarTitle(
  dashboard: DashboardSnapshot,
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  preferredKind: PulseModeKind,
  syncError?: string,
): string {
  const remedyInsight = insights.nadabrahman;
  if (remedyInsight?.title) {
    return formatInsightTitle(remedyInsight.kind, remedyInsight.title);
  }

  const preferredSourceInsight = getPreferredSourceInsight(
    insights,
    preferredKind,
  );
  if (preferredSourceInsight) {
    return formatInsightTitle(
      preferredSourceInsight.kind,
      preferredSourceInsight.title,
    );
  }

  if (!dashboard.hasCredentials && dashboard.source === "empty") {
    return "Setup";
  }

  if (syncError) {
    return "Pulse";
  }

  if (dashboard.hasCredentials) {
    return "Pulse";
  }

  return "Pulse";
}

export function buildPulseSubtitle(
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  preferredKind: PulseModeKind = "nadabrahman",
  now: Date = new Date(),
): string {
  const summary = insights.nadabrahman?.summary
    ? insights.nadabrahman.summary
    : (getPreferredSourceInsight(insights, preferredKind)?.summary ?? "");
  const nextRefresh = getEarliestRefreshAfter(insights, now);
  const countdown = nextRefresh
    ? `refreshes in ${formatTimeUntil(nextRefresh, now)}`
    : "";

  return shortenText(
    [summary, countdown].filter(Boolean).join(" · "),
    MENU_BAR_SUBTITLE_MAX_LENGTH,
  );
}

export function getPulseModeLabel(kind: MenuBarInsightKind): string {
  switch (kind) {
    case "biorhythm":
      return "Biorhythm";
    case "nadabrahman":
      return "NadaBrahman";
    case "vimshottari":
      return "Vimshottari";
    case "vedicClock":
    default:
      return "TCM Organ";
  }
}

function getEarliestRefreshAfter(
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  now: Date,
): string | undefined {
  const refreshTimes = Object.values(insights)
    .map((insight) => (insight ? Date.parse(insight.refreshAfter) : Number.NaN))
    .filter(
      (value) => Number.isFinite(value) && value > now.getTime(),
    ) as number[];

  if (refreshTimes.length === 0) {
    return undefined;
  }

  return new Date(Math.min(...refreshTimes)).toISOString();
}

function shouldRefreshInsight(
  insight: MenuBarInsightSnapshot | undefined,
  now: Date,
): boolean {
  if (!insight) {
    return true;
  }

  const refreshAt = Date.parse(insight.refreshAfter);
  return Number.isNaN(refreshAt) || refreshAt <= now.getTime();
}

function toBirthData(
  profile: UserProfileSnapshot,
): NonNullable<EngineExecutionInput["birthData"]> {
  return {
    ...(profile.fullName ? { name: profile.fullName } : {}),
    ...(profile.birthDate ? { date: profile.birthDate } : {}),
    ...(profile.birthTime ? { time: profile.birthTime } : {}),
    ...(profile.birthLocation?.latitude !== undefined
      ? { latitude: profile.birthLocation.latitude }
      : {}),
    ...(profile.birthLocation?.longitude !== undefined
      ? { longitude: profile.birthLocation.longitude }
      : {}),
    ...(profile.timezone ? { timezone: profile.timezone } : {}),
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

function buildVedicClockInsight(
  result: EngineExecutionResult,
  fetchedAt: string,
  includeRawPayloads: boolean,
): MenuBarInsightSnapshot {
  const payload = asRecord(result.result);
  const currentOrgan = asRecord(payload.current_organ);
  const currentDosha = asRecord(payload.current_dosha);
  const recommendation = asRecord(payload.recommendation);
  const organ = readString(currentOrgan, "organ") ?? "TCM Pulse";
  const dosha = readString(currentDosha, "dosha");
  const timeWindow = readString(currentOrgan, "time_window");
  const element = readString(currentOrgan, "element");
  const peakEnergy = readString(currentOrgan, "peak_energy");
  const activities = readStringArray(currentOrgan.recommended_activities).slice(
    0,
    2,
  );
  const activitySummary = activities.length
    ? activities.join(", ")
    : readString(recommendation, "time_window");
  const title = dosha ? `${organ} · ${dosha}` : organ;
  const subtitle =
    [timeWindow, element].filter(Boolean).join(" · ") || undefined;
  const summary = peakEnergy ?? activitySummary ?? "Current organ window ready";

  return {
    kind: "vedicClock",
    engineId: result.engineId,
    title,
    subtitle,
    summary,
    payload: buildInsightPayload(result, includeRawPayloads),
    fetchedAt,
    refreshAfter: computeNextOrganRefreshAt(payload, fetchedAt),
  };
}

function buildBiorhythmInsight(
  result: EngineExecutionResult,
  fetchedAt: string,
  includeRawPayloads: boolean,
): MenuBarInsightSnapshot {
  const payload = asRecord(result.result);
  const physical = summarizeCycle("Physical", asRecord(payload.physical));
  const emotional = summarizeCycle("Emotional", asRecord(payload.emotional));
  const intellectual = summarizeCycle(
    "Intellectual",
    asRecord(payload.intellectual),
  );
  const cycles = [physical, emotional, intellectual].filter(
    (cycle): cycle is CycleSummary => cycle !== null,
  );
  const dominant = cycles.sort(
    (left, right) => (right.percentage ?? 0) - (left.percentage ?? 0),
  )[0];
  const overallEnergy = readNumber(payload, "overall_energy");
  const title =
    typeof overallEnergy === "number"
      ? `Energy ${Math.round(overallEnergy)}%`
      : "Biorhythm";
  const subtitle = dominant
    ? `${dominant.label} ${dominant.phase ?? "Active"} ${formatPercent(dominant.percentage)}`
    : undefined;
  const summary =
    cycles
      .map((cycle) => `${cycle.label} ${formatPercent(cycle.percentage)}`)
      .join(" · ") || "Biorhythm cached";

  return {
    kind: "biorhythm",
    engineId: result.engineId,
    title,
    subtitle,
    summary,
    payload: buildInsightPayload(result, includeRawPayloads),
    fetchedAt,
    refreshAfter: addMilliseconds(fetchedAt, PERSONAL_INSIGHT_REFRESH_MS),
  };
}

function buildVimshottariInsight(
  result: EngineExecutionResult,
  fetchedAt: string,
  includeRawPayloads: boolean,
): MenuBarInsightSnapshot {
  const payload = asRecord(result.result);
  const currentPeriod = asRecord(payload.current_period);
  const mahadasha = readString(asRecord(currentPeriod.mahadasha), "planet");
  const antardasha = readString(asRecord(currentPeriod.antardasha), "planet");
  const pratyantardasha = readString(
    asRecord(currentPeriod.pratyantardasha),
    "planet",
  );
  const title =
    [mahadasha, antardasha, pratyantardasha].filter(Boolean).join(" > ") ||
    "Vimshottari";
  const nextTransition = readUpcomingTransition(payload.upcoming_transitions);
  const subtitle = nextTransition
    ? `Next ${nextTransition.level.toLowerCase()} in ${nextTransition.daysUntil}d`
    : (readString(
        asRecord(payload.period_enrichment),
        "combined_description",
      ) ?? undefined);
  const summary = [
    mahadasha ? `Maha ${mahadasha}` : null,
    antardasha ? `Antar ${antardasha}` : null,
    pratyantardasha ? `Praty ${pratyantardasha}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    kind: "vimshottari",
    engineId: result.engineId,
    title,
    subtitle,
    summary: summary || "Current dasha map cached",
    payload: buildInsightPayload(result, includeRawPayloads),
    fetchedAt,
    refreshAfter: addMilliseconds(fetchedAt, PERSONAL_INSIGHT_REFRESH_MS),
  };
}

function buildNadabrahmanInsight(
  result: EngineExecutionResult,
  fetchedAt: string,
  includeRawPayloads: boolean,
  refreshAfterOverride?: string,
): MenuBarInsightSnapshot {
  const payload = asRecord(result.result);
  const timeRecommendation = asRecord(payload.time_recommendation);
  const primaryRaga = asRecord(timeRecommendation.primary_raga);
  const topRecommendation = getTopRecommendation(payload.recommendations);
  const title =
    readString(primaryRaga, "raga_name") ??
    readString(topRecommendation, "raga_name") ??
    "NadaBrahman";
  const subtitle =
    [
      readString(timeRecommendation, "prahar_name"),
      readString(timeRecommendation, "time_range"),
    ]
      .filter(Boolean)
      .join(" · ") || undefined;
  const mood = readString(topRecommendation, "mood");
  const qualities = readStringArray(
    topRecommendation.therapeutic_qualities,
  ).map((quality) => humanizeKey(quality));
  const summary =
    [
      mood ? humanizeKey(mood) : null,
      qualities.length > 0 ? qualities.slice(0, 3).join(", ") : null,
      !mood && qualities.length === 0
        ? (readString(topRecommendation, "reason") ??
          readString(primaryRaga, "reason") ??
          "Nada remedy cached")
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Nada remedy cached";

  return {
    kind: "nadabrahman",
    engineId: result.engineId,
    title,
    subtitle,
    summary,
    payload: buildInsightPayload(result, includeRawPayloads),
    fetchedAt,
    refreshAfter:
      refreshAfterOverride ??
      addMilliseconds(fetchedAt, PERSONAL_INSIGHT_REFRESH_MS),
  };
}

function buildInsightPayload(
  result: EngineExecutionResult,
  includeRawPayloads: boolean,
): Record<string, unknown> {
  if (includeRawPayloads) {
    return result.raw;
  }

  return {
    engine_id: result.engineId,
    result: result.result,
    metadata: result.metadata,
    ...(result.timestamp ? { timestamp: result.timestamp } : {}),
  };
}

function computeNextOrganRefreshAt(
  payload: Record<string, unknown>,
  fallbackIso: string,
): string {
  const calculatedFor = readString(payload, "calculated_for") ?? fallbackIso;
  const timezone = asRecord(payload.timezone);
  const offsetMinutes = readNumber(timezone, "offset_minutes") ?? 0;
  const calculated = new Date(calculatedFor);

  if (Number.isNaN(calculated.getTime())) {
    return addMilliseconds(fallbackIso, 60 * 60 * 1000);
  }

  const local = new Date(calculated.getTime() + offsetMinutes * 60_000);
  const hour = local.getUTCHours();
  const minute = local.getUTCMinutes();
  const second = local.getUTCSeconds();
  const millisecond = local.getUTCMilliseconds();
  const nextHour = hour % 2 === 0 ? hour + 1 : hour + 2;
  const nextBoundaryLocal = new Date(
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
      nextHour,
      0,
      0,
      0,
    ),
  );

  if (minute === 0 && second === 0 && millisecond === 0 && hour % 2 === 1) {
    nextBoundaryLocal.setUTCHours(nextBoundaryLocal.getUTCHours() + 2);
  }

  return new Date(
    nextBoundaryLocal.getTime() - offsetMinutes * 60_000,
  ).toISOString();
}

function compactDashaTitle(title: string): string {
  const compact = title
    .split(" > ")
    .map((part) => part.slice(0, 3))
    .join("/");
  return compact.length > 18 ? compact.slice(0, 18) : compact;
}

export function getPreferredInsight(
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  preferredKind: PulseModeKind,
): MenuBarInsightSnapshot | undefined {
  if (insights.nadabrahman?.title) {
    return insights.nadabrahman;
  }

  return getPreferredSourceInsight(insights, preferredKind);
}

export function getPreferredSourceInsight(
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  preferredKind: PulseModeKind,
): MenuBarInsightSnapshot | undefined {
  const order = [
    getSelectedSourcePulseKind(preferredKind),
    ...MENU_BAR_SOURCE_FALLBACK_ORDER.filter(
      (kind) => kind !== getSelectedSourcePulseKind(preferredKind),
    ),
  ];

  for (const kind of order) {
    const insight = insights[kind];
    if (insight?.title) {
      return insight;
    }
  }

  return undefined;
}

export function getSelectedSourcePulseKind(
  preferredKind: PulseModeKind,
): SourcePulseModeKind {
  return preferredKind === "nadabrahman" ? "vedicClock" : preferredKind;
}

function formatInsightTitle(kind: MenuBarInsightKind, title: string): string {
  const formatted = kind === "vimshottari" ? compactDashaTitle(title) : title;
  return shortenText(formatted, MENU_BAR_TITLE_MAX_LENGTH);
}

function buildPulseCadenceContext(
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  generatedAt: string,
): Record<string, unknown> | undefined {
  const vedicClock = insights.vedicClock;
  const biorhythm = insights.biorhythm;
  const vimshottari = insights.vimshottari;

  if (!vedicClock || !biorhythm || !vimshottari) {
    return undefined;
  }

  return {
    generated_at: generatedAt,
    source_engines: SOURCE_PULSE_KINDS.map((kind) => MENU_BAR_ENGINE_IDS[kind]),
    vedic_clock: {
      title: vedicClock.title,
      subtitle: vedicClock.subtitle,
      summary: vedicClock.summary,
      fetched_at: vedicClock.fetchedAt,
      refresh_after: vedicClock.refreshAfter,
      result: pickVedicClockCadenceResult(vedicClock.payload),
    },
    biorhythm: {
      title: biorhythm.title,
      subtitle: biorhythm.subtitle,
      summary: biorhythm.summary,
      fetched_at: biorhythm.fetchedAt,
      refresh_after: biorhythm.refreshAfter,
      result: pickBiorhythmCadenceResult(biorhythm.payload),
    },
    vimshottari: {
      title: vimshottari.title,
      subtitle: vimshottari.subtitle,
      summary: vimshottari.summary,
      fetched_at: vimshottari.fetchedAt,
      refresh_after: vimshottari.refreshAfter,
      result: pickVimshottariCadenceResult(vimshottari.payload),
    },
  };
}

function getCadenceRefreshAfter(
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>,
  fallbackIso: string,
): string {
  const refreshTimes = SOURCE_PULSE_KINDS.map(
    (kind) => insights[kind]?.refreshAfter,
  )
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value) => Number.isFinite(value)) as number[];

  if (refreshTimes.length === 0) {
    return addMilliseconds(fallbackIso, PERSONAL_INSIGHT_REFRESH_MS);
  }

  return new Date(Math.min(...refreshTimes)).toISOString();
}

function pickVedicClockCadenceResult(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const result = extractInsightResult(payload);
  return compactRecord({
    current_organ: asRecord(result.current_organ),
    current_dosha: asRecord(result.current_dosha),
    recommendation: asRecord(result.recommendation),
    synthesis: readString(result, "synthesis"),
    calculated_for: readString(result, "calculated_for"),
    timezone: asRecord(result.timezone),
  });
}

function pickBiorhythmCadenceResult(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const result = extractInsightResult(payload);
  return compactRecord({
    overall_energy: readNumber(result, "overall_energy"),
    physical: asRecord(result.physical),
    emotional: asRecord(result.emotional),
    intellectual: asRecord(result.intellectual),
    intuitive: asRecord(result.intuitive),
  });
}

function pickVimshottariCadenceResult(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const result = extractInsightResult(payload);
  return compactRecord({
    current_period: asRecord(result.current_period),
    upcoming_transitions: Array.isArray(result.upcoming_transitions)
      ? result.upcoming_transitions.slice(0, 2)
      : undefined,
    period_enrichment: asRecord(result.period_enrichment),
  });
}

function extractInsightResult(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return asRecord(payload.result);
}

function shortenText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function addMilliseconds(isoTimestamp: string, milliseconds: number): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return new Date(Date.now() + milliseconds).toISOString();
  }

  return new Date(date.getTime() + milliseconds).toISOString();
}

interface CycleSummary {
  label: string;
  percentage?: number;
  phase?: string;
}

function summarizeCycle(
  label: string,
  cycle: Record<string, unknown>,
): CycleSummary | null {
  if (Object.keys(cycle).length === 0) {
    return null;
  }

  return {
    label,
    percentage: readNumber(cycle, "percentage") ?? undefined,
    phase: readString(cycle, "phase") ?? undefined,
  };
}

function getTopRecommendation(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value) || value.length === 0) {
    return {};
  }

  const recommendations = value
    .map((entry) => asRecord(entry))
    .filter((entry) => Object.keys(entry).length > 0);
  if (recommendations.length === 0) {
    return {};
  }

  return recommendations.sort(
    (left, right) =>
      (readNumber(right, "score") ?? 0) - (readNumber(left, "score") ?? 0),
  )[0]!;
}

function readUpcomingTransition(
  value: unknown,
): { level: string; daysUntil: number; toPlanet?: string } | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const transition = asRecord(value[0]);
  const level = readString(transition, "type") ?? "Transition";
  const daysUntil = readNumber(transition, "days_until");
  const toPlanet = readString(transition, "to_planet");

  if (typeof daysUntil !== "number") {
    return null;
  }

  return { level, daysUntil, toPlanet };
}

function formatPercent(value: number | undefined): string {
  return typeof value === "number" ? `${Math.round(value)}%` : "--";
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );
}

function compactRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      if (typeof value === "object") {
        return Object.keys(asRecord(value)).length > 0;
      }

      return true;
    }),
  );
}

function humanizeKey(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
