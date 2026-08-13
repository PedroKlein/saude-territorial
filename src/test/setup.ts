import "@testing-library/jest-dom";

/**
 * Node 25 + jsdom v27 in vitest environment no longer provides a working Web
 * Storage API. Zustand's `persist` middleware (used by mapStore, filterStore)
 * crashes with `storage.setItem is not a function` without one. Injecting an
 * in-memory shim unconditionally in the test env — safe because setup runs
 * before any store module evaluates.
 */
if (typeof window !== "undefined") {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
  };
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  Object.defineProperty(window, "sessionStorage", { value: storage, configurable: true });
}
