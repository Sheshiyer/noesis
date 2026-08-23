import React from "react";
import {
  Action,
  ActionPanel,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import {
  goldIcon,
  emeraldIcon,
  indigoIcon,
  mutedIcon,
} from "../lib/design-tokens";
import { openCommand } from "../lib/navigation";
import { canUseEngineWorkbench } from "../lib/access";
import { DashboardSnapshot } from "../lib/types";

interface NoesisActionPanelProps {
  children?: React.ReactNode;
  onRefresh?: (force?: boolean) => Promise<unknown> | unknown;
  refreshTitle?: string;
  hideDashboardAction?: boolean;
  snapshot?: DashboardSnapshot | null;
  showAccessKeyAction?: boolean;
  showWorkbenchActions?: boolean;
}

export function NoesisActionPanel({
  children,
  onRefresh,
  refreshTitle = "Refresh Snapshot",
  hideDashboardAction = false,
  snapshot,
  showAccessKeyAction = false,
  showWorkbenchActions,
}: NoesisActionPanelProps) {
  const canShowWorkbenchActions =
    showWorkbenchActions ??
    (snapshot === undefined || canUseEngineWorkbench(snapshot));

  return (
    <ActionPanel>
      {children}
      <ActionPanel.Section>
        {onRefresh ? (
          <Action
            title={refreshTitle}
            icon={emeraldIcon(Icon.ArrowClockwise)}
            onAction={() => onRefresh(true)}
          />
        ) : null}
        {!hideDashboardAction ? (
          <Action
            title="Open Dashboard"
            icon={goldIcon(Icon.AppWindow)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => openCommand("dashboard")}
          />
        ) : null}
        {canShowWorkbenchActions ? (
          <Action
            title="Open Developer Tools"
            icon={indigoIcon(Icon.Hammer)}
            onAction={() => openCommand("developer-tools")}
          />
        ) : null}
        {canShowWorkbenchActions || showAccessKeyAction ? (
          <Action
            title={
              canShowWorkbenchActions ? "Edit Access Key" : "Add Access Key"
            }
            icon={goldIcon(Icon.Key)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => openCommand("api-key")}
          />
        ) : null}
        <Action
          title="Open Extension Preferences"
          icon={mutedIcon(Icon.Gear)}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
