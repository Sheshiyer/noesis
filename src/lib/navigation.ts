import { open } from "@raycast/api";
import manifest from "../../package.json";

const COMMAND_PREFIX = `raycast://extensions/${manifest.author}/${manifest.name}`;

export function getCommandHref(commandName: string): string {
  return `${COMMAND_PREFIX}/${commandName}`;
}

export function openCommand(commandName: string): Promise<void> {
  return open(getCommandHref(commandName));
}
