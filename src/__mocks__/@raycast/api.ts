const localStorage = new Map<string, unknown>();

export const LocalStorage = {
  allItems: async () => Object.fromEntries(localStorage),
  getItem: async <T>(key: string): Promise<T | null> =>
    localStorage.has(key) ? (localStorage.get(key) as T) : null,
  setItem: async (key: string, value: unknown) => {
    localStorage.set(key, value);
  },
  removeItem: async (key: string) => {
    localStorage.delete(key);
  },
};

export function __resetLocalStorage() {
  localStorage.clear();
}

export function getPreferenceValues<T>(): T {
  return {} as T;
}

export const environment = {
  supportPath: process.env.NOESIS_TEST_SUPPORT_PATH ?? "/tmp/noesis-test",
};

export const Icon = {} as Record<string, unknown>;
export const Color = {} as Record<string, unknown>;
export const List = {} as Record<string, unknown>;
export const MenuBarExtra = {} as Record<string, unknown>;
export const Action = {} as Record<string, unknown>;
export const ActionPanel = {} as Record<string, unknown>;
export const Form = {} as Record<string, unknown>;
export const Alert = {} as Record<string, unknown>;
export const Toast = {} as Record<string, unknown>;
export function confirmAlert() {
  return Promise.resolve(true);
}
export function showToast() {
  return Promise.resolve();
}
export function openExtensionPreferences() {}
export function open() {}

type MockToken = {
  accessToken: string;
  refreshToken?: string;
  isExpired: () => boolean;
};
const tokenStores = new Map<string, MockToken>();
export const OAuth = {
  RedirectMethod: { Web: "web" },
  PKCEClient: class {
    id: string;
    constructor(options: { providerId: string }) {
      this.id = options.providerId;
    }
    async getTokens() {
      return tokenStores.get(this.id);
    }
    async setTokens(token: {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    }) {
      tokenStores.set(this.id, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        isExpired: () => token.expires_in < 0,
      });
    }
    async removeTokens() {
      tokenStores.delete(this.id);
    }
  },
};
