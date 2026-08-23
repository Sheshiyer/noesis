const localStorage = new Map<string, unknown>();

export const LocalStorage = {
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
