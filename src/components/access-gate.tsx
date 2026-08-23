import React from "react";
import { Action, Icon, List } from "@raycast/api";
import {
  COLOR_SELECTED,
  COLOR_WARNING,
  cosmicHeader,
  sacredSubheader,
  SECTION_DIVIDER,
} from "../lib/design-tokens";
import { buildWorkbenchGateMarkdown } from "../lib/access";
import { openCommand } from "../lib/navigation";
import { NoesisActionPanel } from "./noesis-actions";

export function WorkbenchAccessGate({
  feature = "Engine Workbench",
  isLoading = false,
  onRefresh,
}: {
  feature?: string;
  isLoading?: boolean;
  onRefresh?: (force?: boolean) => Promise<unknown> | unknown;
}) {
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Tryambakam Noesis"
    >
      <List.Item
        icon={{ source: Icon.Key, tintColor: COLOR_SELECTED }}
        title={cosmicHeader(`${feature} Requires Operator Access`)}
        subtitle={sacredSubheader("Daily Ritual and Pulse & Remedy remain available in Witness mode")}
        detail={
          <List.Item.Detail
            markdown={`${SECTION_DIVIDER}\n\n${buildWorkbenchGateMarkdown(feature)}\n\n${SECTION_DIVIDER}`}
          />
        }
        actions={
          <NoesisActionPanel
            onRefresh={onRefresh}
            hideDashboardAction
            showAccessKeyAction
            showWorkbenchActions={false}
          >
            <Action
              title="Open Dashboard"
              icon={{ source: Icon.AppWindow, tintColor: COLOR_WARNING }}
              onAction={() => openCommand("dashboard")}
            />
            <Action
              title="Run Daily Witness"
              icon={Icon.Eye}
              onAction={() => openCommand("daily-witness")}
            />
            <Action
              title="Add Access Key"
              icon={{ source: Icon.Key, tintColor: COLOR_SELECTED }}
              onAction={() => openCommand("api-key")}
            />
          </NoesisActionPanel>
        }
      />
    </List>
  );
}
