import { OAuth, LocalStorage, environment } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const CLIENT_ID = "noesis-raycast";
const SESSION_ORIGIN = "noesis.sessionOrigin";
export function scopeHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
function client(baseUrl: string) {
  return new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Selemene",
    providerId: `selemene-${scopeHash(baseUrl)}`,
  });
}
// Commands and the menu bar run in different processes. A promise alone cannot
// serialize rotating refresh tokens across them. Fail closed on an orphaned lock.
export async function withSessionLock<T>(
  baseUrl: string,
  operation: () => Promise<T>,
): Promise<T> {
  await fs.mkdir(environment.supportPath, { recursive: true });
  const lock = path.join(
    environment.supportPath,
    `session-${scopeHash(baseUrl)}.lock`,
  );
  const deadline = Date.now() + 15000;
  let acquired = false;
  while (!acquired) {
    try {
      await fs.mkdir(lock);
      acquired = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() >= deadline)
        throw new Error(
          "Account session is busy. Retry after the other command finishes.",
        );
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  try {
    return await operation();
  } finally {
    await fs.rmdir(lock);
  }
}
async function tokenRequest(
  baseUrl: string,
  body: Record<string, string>,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(`${baseUrl}/api/v1/sessions/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, ...body }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(
      `Account token exchange failed (${response.status}). Sign in again if the session expired.`,
    );
  const result = (await response.json()) as OAuth.TokenResponse & {
    token_type: string;
  };
  if (
    !result.access_token ||
    !result.refresh_token ||
    result.token_type !== "Bearer" ||
    !result.expires_in
  )
    throw new Error("Invalid account token response");
  return result;
}
export async function hasAccountSession(baseUrl: string): Promise<boolean> {
  return (
    (await LocalStorage.getItem<string>(SESSION_ORIGIN)) === baseUrl &&
    Boolean(await client(baseUrl).getTokens())
  );
}
export async function signIn(baseUrl: string): Promise<void> {
  const previousOrigin = await LocalStorage.getItem<string>(SESSION_ORIGIN);
  if (previousOrigin) await signOut(previousOrigin);
  if (new URL(baseUrl).protocol !== "https:")
    throw new Error("Account sign-in requires HTTPS.");
  const pkce = client(baseUrl);
  const request = await pkce.authorizationRequest({
    endpoint: `${baseUrl}/api/v1/sessions/authorize`,
    clientId: CLIENT_ID,
    scope: "",
  });
  const response = await pkce.authorize(request);
  await withSessionLock(baseUrl, async () => {
    await pkce.setTokens(
      await tokenRequest(baseUrl, {
        grant_type: "authorization_code",
        code: response.authorizationCode,
        code_verifier: request.codeVerifier,
        redirect_uri: request.redirectURI,
      }),
    );
    await LocalStorage.setItem(SESSION_ORIGIN, baseUrl);
    await LocalStorage.setItem("noesis.sessionGeneration", randomUUID());
  });
}
export async function getAccountToken(baseUrl: string): Promise<string> {
  return withSessionLock(baseUrl, async () => {
    if ((await LocalStorage.getItem<string>(SESSION_ORIGIN)) !== baseUrl)
      throw new Error("Account session changed. Sign in again.");
    const pkce = client(baseUrl);
    const tokens = await pkce.getTokens();
    if (!tokens) throw new Error("Sign in to your Selemene account.");
    if (!tokens.isExpired()) return tokens.accessToken;
    if (!tokens.refreshToken)
      throw new Error("Sign in again to renew your account session.");
    const refreshed = await tokenRequest(baseUrl, {
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    });
    await pkce.setTokens(refreshed);
    return refreshed.access_token;
  });
}
export async function signOut(baseUrl: string): Promise<void> {
  await withSessionLock(baseUrl, async () => {
    const pkce = client(baseUrl);
    const tokens = await pkce.getTokens();
    // Retain the credential on network failure so revocation can be retried.
    if (tokens?.refreshToken) {
      const response = await fetch(`${baseUrl}/api/v1/sessions/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          refresh_token: tokens.refreshToken,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok)
        throw new Error("Sign-out revocation failed. Retry while connected.");
    }
    await pkce.removeTokens();
    await LocalStorage.removeItem(SESSION_ORIGIN);
    await LocalStorage.removeItem("noesis.sessionGeneration");
    const items = await LocalStorage.allItems();
    await Promise.all(
      Object.keys(items)
        .filter((key) => key.startsWith("noesis.account."))
        .map((key) => LocalStorage.removeItem(key)),
    );
    const files = await fs.readdir(environment.supportPath);
    await Promise.all(
      files
        .filter((file) => file.startsWith("noesis-account-"))
        .map((file) =>
          fs.rm(path.join(environment.supportPath, file), { force: true }),
        ),
    );
  });
}

export async function sessionGeneration() {
  return await LocalStorage.getItem<string>("noesis.sessionGeneration");
}
