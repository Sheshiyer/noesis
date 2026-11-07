import { afterEach, expect, test } from "bun:test";
import { LocalStorage, OAuth } from "@raycast/api";
import { getAccountToken, scopeHash, signOut } from "./account-session";
import {
  accountRequest,
  verifiedEmailURL,
  calculateForSubject,
  subjectReadings,
  getSubjectProfile,
  saveSubjectProfile,
  SubjectProfile,
} from "./account";
import { calculateEngine, SelemeneApiClient, updateUserProfile } from "./api";
const base = "https://identity.example.test";
const originalFetch = globalThis.fetch;
const pkce = new OAuth.PKCEClient({
  providerId: `selemene-${scopeHash(base)}`,
  providerName: "test",
  redirectMethod: OAuth.RedirectMethod.Web,
});
afterEach(async () => {
  globalThis.fetch = originalFetch;
  await pkce.removeTokens();
  await LocalStorage.removeItem("noesis.sessionOrigin");
  await LocalStorage.removeItem("noesis.sessionGeneration");
});
async function session(expired = false) {
  await LocalStorage.setItem("noesis.sessionOrigin", base);
  await LocalStorage.setItem("noesis.sessionGeneration", "one");
  await pkce.setTokens({
    access_token: "access",
    refresh_token: "refresh",
    expires_in: expired ? -1 : 3600,
  });
}
const resource = {
  subject_id: "subject-other",
  revision: 3,
  profile: {},
} as SubjectProfile;
test("concurrent callers rotate a refresh token exactly once", async () => {
  await session(true);
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 30));
    return Response.json({
      access_token: "rotated",
      refresh_token: "next",
      expires_in: 3600,
      token_type: "Bearer",
    });
  }) as typeof fetch;
  expect(
    await Promise.all([getAccountToken(base), getAccountToken(base)]),
  ).toEqual(["rotated", "rotated"]);
  expect(calls).toBe(1);
});
test("read-only subject cannot PATCH even if a form supplies a resource", async () => {
  await session();
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return Response.json({
      subjects: [{ id: "subject-other", can_read: true, can_edit: false }],
    });
  }) as typeof fetch;
  await expect(
    saveSubjectProfile(base, resource, { fullName: "Changed" }),
  ).rejects.toThrow("read-only");
  expect(calls).toBe(1);
});
test("revoked grant prevents the profile request", async () => {
  await session();
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return Response.json({ subjects: [] });
  }) as typeof fetch;
  await expect(getSubjectProfile(base, "subject-other")).rejects.toThrow(
    "no longer readable",
  );
  expect(calls).toBe(1);
});
test("in-flight response is rejected after account switch", async () => {
  await session();
  globalThis.fetch = (async () => {
    await LocalStorage.setItem("noesis.sessionGeneration", "two");
    return Response.json({ secret: true });
  }) as typeof fetch;
  await expect(
    accountRequest(base, "/api/v1/users/me/context"),
  ).rejects.toThrow("Account changed");
});
test("profile conflicts require reload instead of overwriting", async () => {
  await session();
  globalThis.fetch = (async (url) =>
    String(url).endsWith("/context")
      ? Response.json({ subjects: [{ id: "subject-other", can_edit: true }] })
      : Response.json({}, { status: 409 })) as typeof fetch;
  await expect(
    saveSubjectProfile(base, resource, { fullName: "Changed" }),
  ).rejects.toThrow("Reload");
});
test("human calculations do not leak into the operator calculation route", async () => {
  let called = false;
  await expect(
    calculateEngine(
      { baseUrl: base, apiKey: "", authMode: "account" },
      "biorhythm",
      {},
      (async () => {
        called = true;
        return Response.json({});
      }) as typeof fetch,
    ),
  ).rejects.toThrow("Open Account");
  expect(called).toBe(false);
});
test("API client obtains a fresh bearer for each request", async () => {
  let calls = 0;
  const headers: string[] = [];
  const api = new SelemeneApiClient(
    {
      baseUrl: base,
      apiKey: "",
      getAccessToken: async () => `token-${++calls}`,
    },
    (async (_url, init) => {
      headers.push(new Headers(init?.headers).get("Authorization") ?? "");
      return Response.json({});
    }) as typeof fetch,
  );
  await api.getStatus();
  await api.getStatus();
  expect(headers).toEqual(["Bearer token-1", "Bearer token-2"]);
});
test("legacy profile PATCH cannot set identity email", async () => {
  let body: Record<string, unknown> = {};
  await updateUserProfile(
    { baseUrl: base, apiKey: "operator" },
    { email: "unverified@example.test" },
    (async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({
        id: "id",
        email: "verified@example.test",
        full_name: "Name",
      });
    }) as typeof fetch,
  );
  expect(body).not.toHaveProperty("email");
});
test("sign-out revokes before clearing tokens and account drafts", async () => {
  await session();
  await LocalStorage.setItem("noesis.account.example.draft", "private");
  globalThis.fetch = (async (url, init) => {
    expect(String(url)).toEndWith("/sessions/revoke");
    expect(JSON.parse(String(init?.body))).toEqual({
      client_id: "noesis-raycast",
      refresh_token: "refresh",
    });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  await signOut(base);
  expect(await pkce.getTokens()).toBeUndefined();
  expect(await LocalStorage.getItem("noesis.account.example.draft")).toBeNull();
});

test("email verification rejects off-origin and wrong-path redirects", () => {
  expect(
    verifiedEmailURL(base, "/api/v1/account/email-links/begin?challenge=test"),
  ).toBe(`${base}/api/v1/account/email-links/begin?challenge=test`);
  expect(
    verifiedEmailURL(base, "/api/v1/account/email-links/verify?challenge=test"),
  ).toBe(`${base}/api/v1/account/email-links/verify?challenge=test`);
  for (const url of [
    "https://evil.test/api/v1/account/email-links/verify?challenge=x",
    "https://evil.test/api/v1/account/email-links/begin?challenge=x",
    "/api/v1/account/email-links/begin",
    "//evil.test/path",
    "/api/v1/sessions/authorize?challenge=x",
    "/api/v1/account/email-links/verify",
  ])
    expect(() => verifiedEmailURL(base, url)).toThrow("Invalid email");
});
test("subject engine sends accepted revision and explicit options only", async () => {
  await session();
  let body: Record<string, unknown> = {};
  globalThis.fetch = (async (url, init) => {
    if (String(url).endsWith("/context"))
      return Response.json({
        subjects: [
          { id: resource.subject_id, can_read: true, can_calculate: true },
        ],
      });
    body = JSON.parse(String(init?.body));
    expect(String(url)).toEndWith(
      `/subjects/${resource.subject_id}/engines/tarot/calculate`,
    );
    return Response.json({
      id: "run",
      subject_id: resource.subject_id,
      profile_revision: resource.revision,
    });
  }) as typeof fetch;
  await calculateForSubject(base, resource, "tarot", {
    question: "What can I notice?",
  });
  expect(body).toEqual({
    expected_revision: 3,
    options: { question: "What can I notice?" },
  });
  await expect(
    calculateForSubject(base, resource, "tarot", { birth_data: {} }),
  ).rejects.toThrow("override");
});
test("read access does not imply calculation access", async () => {
  await session();
  globalThis.fetch = (async () =>
    Response.json({
      subjects: [{ id: resource.subject_id, can_read: true, can_edit: true }],
    })) as typeof fetch;
  await expect(
    calculateForSubject(base, resource, "tarot", {}),
  ).rejects.toThrow("no calculation grant");
});
test("history refuses a result from another subject", async () => {
  await session();
  globalThis.fetch = (async () =>
    Response.json({
      readings: [{ id: "run", subject_id: "wrong" }],
    })) as typeof fetch;
  await expect(subjectReadings(base, resource.subject_id)).rejects.toThrow(
    "unexpected subject",
  );
});
