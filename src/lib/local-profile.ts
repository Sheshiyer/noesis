import { LocalStorage } from "@raycast/api";
import { UserProfileSnapshot, UserProfileUpdate } from "./types";

const LOCAL_PROFILE_STORAGE_KEY = "noesis.localRitualProfile";
const LOCAL_PROFILE_ID = "local-ritual-defaults";

export async function readLocalProfileSnapshot(): Promise<
  UserProfileSnapshot | undefined
> {
  const raw = await LocalStorage.getItem<string>(LOCAL_PROFILE_STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as UserProfileSnapshot;
  } catch {
    await LocalStorage.removeItem(LOCAL_PROFILE_STORAGE_KEY);
    return undefined;
  }
}

export async function saveLocalProfileSnapshot(
  update: UserProfileUpdate,
  previous?: UserProfileSnapshot,
): Promise<UserProfileSnapshot> {
  const now = new Date().toISOString();
  const profile: UserProfileSnapshot = {
    id: previous?.id ?? LOCAL_PROFILE_ID,
    email: update.email ?? previous?.email ?? "",
    fullName: update.fullName ?? previous?.fullName ?? "",
    tier: previous?.tier ?? "witness",
    consciousnessLevel: previous?.consciousnessLevel ?? 0,
    experiencePoints: previous?.experiencePoints ?? 0,
    birthDate: update.birthDate,
    birthTime: update.birthTime,
    birthLocation: update.birthLocation,
    timezone: update.timezone,
    preferences: update.preferences ?? previous?.preferences ?? {},
    fetchedAt: now,
  };

  await LocalStorage.setItem(
    LOCAL_PROFILE_STORAGE_KEY,
    JSON.stringify(profile),
  );
  return profile;
}

export async function clearLocalProfileSnapshot(): Promise<void> {
  await LocalStorage.removeItem(LOCAL_PROFILE_STORAGE_KEY);
}
