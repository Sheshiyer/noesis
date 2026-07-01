import React, { useCallback, useEffect, useState } from "react";
import { Icon, MenuBarExtra, Toast, showToast } from "@raycast/api";
import { formatRelativeTime, truncate } from "./lib/formatters";
import { buildMenuBarTitle, buildPulseSubtitle } from "./lib/menu-bar-insights";
import { openCommand } from "./lib/navigation";
import { readMenuBarSnapshot, syncMenuBarSnapshot } from "./lib/queries";
import { getPulseModePreference } from "./lib/settings";
import { MenuBarSnapshot } from "./lib/types";

export default function MenuBar() {
  const [snapshot, setSnapshot] = useState<MenuBarSnapshot | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(async (force = false) => {
    const cached = await readMenuBarSnapshot();
    setSnapshot(cached);

    try {
      const synced = await syncMenuBarSnapshot({ force });
      setSnapshot(synced);
      setError(synced.syncError);
      return synced;
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to refresh Noesis pulse";
      setError(message);
      throw loadError;
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await showToast({
      title: "Refreshing Noesis pulse...",
      style: Toast.Style.Animated,
    });
    try {
      const synced = await load(true);
      const remedy = synced.insights.nadabrahman;
      await showToast({
        title: remedy ? `Refreshed ${remedy.title}` : "Pulse refreshed",
        style: Toast.Style.Success,
      });
    } catch {
      await showToast({
        title: "Pulse refresh failed",
        style: Toast.Style.Failure,
      });
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const dashboard = snapshot?.dashboard ?? null;
  const insights = snapshot?.insights ?? {};
  const pulseMode = getPulseModePreference();
  const title = dashboard
    ? buildMenuBarTitle(dashboard, insights, pulseMode, error)
    : "Pulse";
  const pulseSubtitle = buildPulseSubtitle(insights, pulseMode);
  const remedyTitle =
    insights.nadabrahman?.title ?? getRemedyFallbackTitle(dashboard);
  const remedyWindow = insights.nadabrahman?.subtitle;

  return (
    <MenuBarExtra icon="icon.png" title={title}>
      {!snapshot ? <MenuBarExtra.Item title="Loading Noesis pulse..." /> : null}

      {dashboard &&
      !dashboard.hasCredentials &&
      dashboard.source === "empty" ? (
        <>
          <MenuBarExtra.Item
            title="Connect Selemene Engine API Key"
            icon={Icon.Key}
            onAction={() => openCommand("api-key")}
          />
          <MenuBarExtra.Separator />
        </>
      ) : null}

      <MenuBarExtra.Item
        title={formatMenuBarLine("Current Remedy", remedyTitle, 72)}
        icon={Icon.Music}
      />
      {remedyWindow ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine("Window", remedyWindow, 72)}
        />
      ) : null}

      {pulseSubtitle ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine("Summary", pulseSubtitle, 72)}
          icon={Icon.AlignLeft}
        />
      ) : null}
      {insights.nadabrahman?.fetchedAt ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine(
            "Cached",
            formatRelativeTime(insights.nadabrahman.fetchedAt),
            36,
          )}
        />
      ) : null}

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Why This Remedy" icon={Icon.AlignLeft} />
      <MenuBarExtra.Item
        title={formatMenuBarLine(
          "TCM Organ",
          formatPulseInputLine(
            insights.vedicClock?.title,
            insights.vedicClock?.summary,
            getPulseInputFallback("vedicClock", dashboard),
          ),
          72,
        )}
        icon={Icon.Clock}
      />
      <MenuBarExtra.Item
        title={formatMenuBarLine(
          "Biorhythm",
          formatPulseInputLine(
            insights.biorhythm?.title,
            insights.biorhythm?.summary,
            getPulseInputFallback("biorhythm", dashboard),
          ),
          72,
        )}
        icon={Icon.Heartbeat}
      />
      <MenuBarExtra.Item
        title={formatMenuBarLine(
          "Vimshottari",
          formatPulseInputLine(
            insights.vimshottari?.title,
            insights.vimshottari?.summary,
            getPulseInputFallback("vimshottari", dashboard),
          ),
          72,
        )}
        icon={Icon.Stars}
      />

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Run Daily Witness"
        icon={Icon.Eye}
        onAction={() => openCommand("daily-witness")}
      />
      <MenuBarExtra.Item
        title="Run Daily Practice"
        icon={Icon.Play}
        onAction={() => openCommand("daily-practice")}
      />
      <MenuBarExtra.Item
        title="Refresh Pulse"
        icon={Icon.ArrowClockwise}
        onAction={handleRefresh}
      />
      <MenuBarExtra.Item
        title="Open Dashboard"
        icon={Icon.AppWindow}
        onAction={() => openCommand("dashboard")}
      />

      <MenuBarExtra.Separator />
      {dashboard?.syncError ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine("Fatal", dashboard.syncError, 72)}
          icon={Icon.ExclamationMark}
        />
      ) : null}
      {error ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine("Fatal", error, 72)}
          icon={Icon.ExclamationMark}
        />
      ) : null}
      <MenuBarExtra.Item
        title="Open Developer Tools"
        icon={Icon.Hammer}
        onAction={() => openCommand("developer-tools")}
      />
    </MenuBarExtra>
  );
}

function formatMenuBarLine(
  label: string,
  value: string,
  maxLength = 60,
): string {
  const prefix = `${label} · `;
  return `${prefix}${truncate(value, Math.max(12, maxLength - prefix.length))}`;
}

function formatPulseInputLine(
  title: string | undefined,
  summary: string | undefined,
  fallback: string,
): string {
  return title ?? summary ?? fallback;
}

function getRemedyFallbackTitle(
  snapshot: MenuBarSnapshot["dashboard"] | null,
): string {
  if (!snapshot?.hasCredentials && snapshot?.source === "empty") {
    return "Connect Noesis to derive remedy";
  }

  if (!snapshot?.profile?.birthDate) {
    return "Add profile context for remedy";
  }

  return "Waiting on pulse cadence";
}

function getPulseInputFallback(
  kind: "vedicClock" | "biorhythm" | "vimshottari",
  snapshot: MenuBarSnapshot["dashboard"] | null,
): string {
  if (!snapshot?.hasCredentials && snapshot?.source === "empty") {
    return "Connect Noesis to warm this input";
  }

  if (kind !== "vedicClock" && !snapshot?.profile?.birthDate) {
    return "Add profile context";
  }

  return "Refresh pulse";
}
