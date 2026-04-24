import React, { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import {
  getReading,
  WitnessReadingRequest,
  WitnessReadingResponse,
  WitnessReading,
  WitnessEngineReading,
} from "./lib/witness-api";
import { useDashboardSnapshot } from "./lib/use-dashboard-snapshot";
import { DashboardSnapshot } from "./lib/types";

// ─── Types ──────────────────────────────────────────────────────────────

interface WitnessFormValues {
  birthDate: string;
  birthTime: string;
  name: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function buildInitialValues(
  snapshot: DashboardSnapshot | null,
): WitnessFormValues {
  const profile = snapshot?.profile;
  return {
    birthDate: profile?.birthDate ?? "",
    birthTime: profile?.birthTime ?? "",
    name: profile?.fullName ?? "",
    latitude: String(profile?.birthLocation?.latitude ?? ""),
    longitude: String(profile?.birthLocation?.longitude ?? ""),
    timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

const ENGINE_ICONS: Record<string, string> = {
  panchanga: "🪷",
  biorhythm: "🫀",
  "vedic-clock": "⏳",
  numerology: "🔢",
};

function narrativeLabel(ds: { consecutive_days: number; total_visits: number }): string {
  if (ds.consecutive_days >= 30) return "🎓 Graduate";
  if (ds.consecutive_days >= 14) return "🗝️ Finder";
  if (ds.consecutive_days >= 7) return "🔥 Devoted";
  if (ds.total_visits > 1) return "🔄 Returning";
  return "🌱 Newcomer";
}

function buildReadingMarkdown(resp: WitnessReadingResponse): string {
  const r = resp.reading;
  const ds = r.decoder_state;
  const lines: string[] = [];

  // Header
  lines.push(`# Daily Witness — ${r.date}`);
  lines.push("");
  lines.push(
    `> ${ENGINE_ICONS[r.primary_engine] ?? "🔮"} Engine of the Day: **${r.primary_engine}** · ${narrativeLabel(ds)} · ${ds.consecutive_days} day streak`,
  );
  lines.push("");

  // Decoder progress
  const maxLayer = r.max_layer_unlocked;
  const progress = Array.from({ length: 5 }, (_, i) =>
    i < maxLayer ? "▓" : "░",
  ).join("");
  lines.push(
    `**Decoder** ${progress} Layer ${maxLayer}/5 · ${ds.total_visits} visits`,
  );
  lines.push("---");
  lines.push("");

  // Primary reading
  const pr = r.primary_reading;
  lines.push(`## ${ENGINE_ICONS[pr.engine_id] ?? "🔮"} ${pr.engine_id} — ${pr.headline}`);
  lines.push("");

  // Data points table
  const emphasized = pr.data_points.filter((dp) => dp.emphasis);
  const secondary = pr.data_points.filter((dp) => !dp.emphasis);

  if (emphasized.length) {
    for (const dp of emphasized) {
      lines.push(`- **${dp.label}**: ${dp.value}`);
    }
    lines.push("");
  }
  if (secondary.length) {
    for (const dp of secondary) {
      lines.push(`- ${dp.label}: ${dp.value}`);
    }
    lines.push("");
  }

  // Witness question (if Layer 2 unlocked)
  if (pr.witness_question) {
    lines.push("### 🔮 Witness Question");
    lines.push("");
    lines.push(`> *${pr.witness_question}*`);
    lines.push("");
  }

  // Other engines
  const others = Object.entries(r.all_readings).filter(
    ([eid]) => eid !== r.primary_engine,
  );
  if (others.length) {
    lines.push("---");
    lines.push("## Other Engines");
    lines.push("");
    for (const [eid, eng] of others) {
      const icon = ENGINE_ICONS[eid] ?? "🔮";
      lines.push(`### ${icon} ${eid}`);
      lines.push(`**${eng.headline}**`);
      lines.push("");
      for (const dp of eng.data_points.filter((d) => d.emphasis)) {
        lines.push(`- **${dp.label}**: ${dp.value}`);
      }
      if (eng.witness_question) {
        lines.push(`> *${eng.witness_question}*`);
      }
      lines.push("");
    }
  }

  // Footer
  lines.push("---");
  lines.push(
    `*Generated in ${r.total_latency_ms}ms · ${r.engines_called.length} engines · ${new Date().toLocaleTimeString()}*`,
  );

  return lines.join("\n");
}

// ─── Reading Result View ────────────────────────────────────────────────

function ReadingResultView({
  response,
  onBack,
}: {
  response: WitnessReadingResponse;
  onBack: () => void;
}) {
  const markdown = useMemo(() => buildReadingMarkdown(response), [response]);
  const r = response.reading;
  const ds = r.decoder_state;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Date"
            text={r.date}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label
            title="Primary Engine"
            text={r.primary_engine}
            icon={Icon.Compass}
          />
          <Detail.Metadata.TagList title="Decoder State">
            <Detail.Metadata.TagList.Item
              text={`Layer ${r.max_layer_unlocked}`}
              color={
                r.max_layer_unlocked >= 3
                  ? Color.Green
                  : r.max_layer_unlocked >= 2
                    ? Color.Yellow
                    : Color.SecondaryText
              }
            />
            <Detail.Metadata.TagList.Item
              text={`${ds.consecutive_days}d streak`}
              color={
                ds.consecutive_days >= 7
                  ? Color.Green
                  : Color.SecondaryText
              }
            />
            <Detail.Metadata.TagList.Item
              text={narrativeLabel(ds)}
              color={Color.Purple}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Engines"
            text={r.engines_called.join(", ")}
            icon={Icon.Bolt}
          />
          <Detail.Metadata.Label
            title="Latency"
            text={`${r.total_latency_ms}ms`}
            icon={Icon.Clock}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Total Visits"
            text={String(ds.total_visits)}
          />
          <Detail.Metadata.Label
            title="First Visit"
            text={ds.first_visit}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
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
          <Action
            title="New Reading"
            icon={Icon.RotateAntiClockwise}
            onAction={onBack}
          />
        </ActionPanel>
      }
    />
  );
}

// ─── Main Form ──────────────────────────────────────────────────────────

export default function DailyWitness() {
  const { snapshot, isLoading } = useDashboardSnapshot();
  const initial = useMemo(() => buildInitialValues(snapshot), [snapshot]);

  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [birthTime, setBirthTime] = useState(initial.birthTime);
  const [name, setName] = useState(initial.name);
  const [latitude, setLatitude] = useState(initial.latitude);
  const [longitude, setLongitude] = useState(initial.longitude);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<WitnessReadingResponse | null>(null);

  // Auto-fill from profile when snapshot loads
  useEffect(() => {
    if (snapshot?.profile) {
      const vals = buildInitialValues(snapshot);
      if (!birthDate) setBirthDate(vals.birthDate);
      if (!birthTime) setBirthTime(vals.birthTime);
      if (!name) setName(vals.name);
      if (!latitude) setLatitude(vals.latitude);
      if (!longitude) setLongitude(vals.longitude);
    }
  }, [snapshot]);

  if (response) {
    return (
      <ReadingResultView response={response} onBack={() => setResponse(null)} />
    );
  }

  const handleSubmit = async () => {
    if (!birthDate) {
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

    try {
      const request: WitnessReadingRequest = {
        birth_date: birthDate.trim(),
      };
      if (birthTime.trim()) request.birth_time = birthTime.trim().slice(0, 5);
      if (name.trim()) request.name = name.trim();
      if (latitude.trim()) request.latitude = parseFloat(latitude);
      if (longitude.trim()) request.longitude = parseFloat(longitude);
      if (timezone.trim()) request.timezone = timezone.trim();

      const result = await getReading(request);
      setResponse(result);

      const r = result.reading;
      toast.style = Toast.Style.Success;
      toast.title = "Reading received";
      toast.message = `${r.primary_engine} · Layer ${r.max_layer_unlocked} · ${r.total_latency_ms}ms`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Reading failed";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Get Daily Witness"
            icon={Icon.Eye}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Daily Witness"
        text="Receive your daily consciousness reading with somatic witness questions."
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
        info="Used for numerology engine calculations"
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
