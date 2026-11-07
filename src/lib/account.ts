import {
  getAccountToken,
  hasAccountSession,
  scopeHash,
  sessionGeneration,
} from "./account-session";
import { getStoredBaseUrl } from "./settings";
import { UserProfileSnapshot, UserProfileUpdate } from "./types";
export interface AccountContext {
  schema: "noesis.account-context.v1";
  account: {
    id: string;
    email: string;
    full_name: string;
    preferred_email: string;
  };
  default_subject_id: string | null;
  subjects: {
    id: string;
    key: string;
    display_name: string;
    can_read: boolean;
    can_edit: boolean;
    profile_revision: number;
  }[];
  relationships: {
    id: string;
    key: string;
    label: string;
    member_subject_ids: string[];
    can_read: boolean;
  }[];
}
export interface SubjectProfile {
  schema: "noesis.subject-profile.v1";
  subject_id: string;
  revision: number;
  profile: {
    full_name: string;
    birth_date: string | null;
    birth_time: string | null;
    birth_location: { lat: number; lng: number; name?: string } | null;
    timezone: string | null;
    preferences: Record<string, unknown>;
    birth_time_confidence: string;
    source_hashes: Record<string, string>;
  };
}
export async function accountRequest<T>(
  baseUrl: string,
  route: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const generation = await sessionGeneration();
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${await getAccountToken(baseUrl)}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (generation !== (await sessionGeneration()))
    throw new Error("Account changed while this request was running. Reload.");
  if (!response.ok)
    throw new Error(
      response.status === 409 || response.status === 412
        ? "Profile changed elsewhere. Reload before saving."
        : `Account request denied or unavailable (${response.status}).`,
    );
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}
export const getAccountContext = (baseUrl: string) =>
  accountRequest<AccountContext>(baseUrl, "/api/v1/users/me/context");
export async function getSubjectProfile(
  baseUrl: string,
  subjectId: string,
): Promise<SubjectProfile> {
  const context = await getAccountContext(baseUrl);
  if (
    !context.subjects.some(
      (subject) => subject.id === subjectId && subject.can_read,
    )
  )
    throw new Error("This subject is no longer readable.");
  return accountRequest(
    baseUrl,
    `/api/v1/subjects/${encodeURIComponent(subjectId)}/profile`,
  );
}
export async function saveSubjectProfile(
  baseUrl: string,
  resource: SubjectProfile,
  update: UserProfileUpdate,
): Promise<SubjectProfile> {
  const context = await getAccountContext(baseUrl);
  if (
    !context.subjects.some(
      (subject) => subject.id === resource.subject_id && subject.can_edit,
    )
  )
    throw new Error("This subject is read-only.");
  return accountRequest(
    baseUrl,
    `/api/v1/subjects/${encodeURIComponent(resource.subject_id)}/profile`,
    "PATCH",
    {
      expected_revision: resource.revision,
      patch: {
        full_name: update.fullName,
        birth_date: update.birthDate ?? null,
        birth_time: update.birthTime ?? null,
        birth_location: update.birthLocation
          ? {
              lat: update.birthLocation.latitude,
              lng: update.birthLocation.longitude,
              name: update.birthLocation.name,
            }
          : null,
        timezone: update.timezone ?? null,
        preferences: update.preferences,
      },
    },
  );
}
export async function setDefaultSubject(
  baseUrl: string,
  subjectId: string,
): Promise<void> {
  const context = await getAccountContext(baseUrl);
  if (
    !context.subjects.some(
      (subject) => subject.id === subjectId && subject.can_read,
    )
  )
    throw new Error("Subject is not readable.");
  await accountRequest(baseUrl, "/api/v1/users/me/context", "PATCH", {
    default_subject_id: subjectId,
  });
}
export function profileSnapshot(
  resource: SubjectProfile,
  context: AccountContext,
): UserProfileSnapshot {
  const p = resource.profile;
  return {
    id: resource.subject_id,
    email: context.account.preferred_email,
    fullName: p.full_name,
    birthDate: p.birth_date ?? undefined,
    birthTime: p.birth_time ?? undefined,
    birthLocation: p.birth_location
      ? {
          latitude: p.birth_location.lat,
          longitude: p.birth_location.lng,
          name: p.birth_location.name,
        }
      : undefined,
    timezone: p.timezone ?? undefined,
    preferences: p.preferences,
    tier: "account",
    consciousnessLevel: 0,
    experiencePoints: 0,
    fetchedAt: new Date().toISOString(),
  };
}
export async function currentAccountScope(): Promise<string | null> {
  const baseUrl = await getStoredBaseUrl();
  if (!(await hasAccountSession(baseUrl))) return null;
  const context = await getAccountContext(baseUrl);
  return scopeHash(
    `${baseUrl}:${context.account.id}:${context.default_subject_id ?? "none"}`,
  );
}
