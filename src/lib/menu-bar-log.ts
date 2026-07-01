import fs from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";

const LOG_FILE = path.join(
  environment.supportPath ?? "/tmp",
  "noesis-menubar.log",
);

let ensured = false;

function ensureLogDir(): void {
  if (ensured) return;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  } catch {
    // ignore
  }
  ensured = true;
}

export function logMenuBar(message: string, data?: unknown): void {
  ensureLogDir();
  const line = `${new Date().toISOString()} ${message}${data !== undefined ? ` ${JSON.stringify(data)}` : ""}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // ignore
  }
}

export function clearMenuBarLog(): void {
  ensureLogDir();
  try {
    fs.writeFileSync(LOG_FILE, "");
  } catch {
    // ignore
  }
}

export function getMenuBarLogPath(): string {
  return LOG_FILE;
}
