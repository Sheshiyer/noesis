import { DashboardSnapshot } from "./types";

export function shouldShowSyncError(
  error: string | null | undefined,
  snapshot: DashboardSnapshot | null,
): boolean {
  return Boolean(error && snapshot && snapshot.source !== "live");
}
