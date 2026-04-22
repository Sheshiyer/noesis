import { open } from "@raycast/api";

const COMMAND_PREFIX = "raycast://extensions/sheshiyer/noesis";

export function getCommandHref(commandName: string): string {
  return `${COMMAND_PREFIX}/${commandName}`;
}

export function openCommand(commandName: string): Promise<void> {
  return open(getCommandHref(commandName));
}
