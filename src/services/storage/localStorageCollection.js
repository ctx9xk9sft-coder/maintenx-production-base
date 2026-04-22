function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function createLocalStorageCollection({ key, version = 1 } = {}) {
  const storageKey = `${key}_v${version}`;

  function readAll() {
    if (!isBrowser()) return [];
    return safeParse(window.localStorage.getItem(storageKey) || "[]", []);
  }

  function writeAll(items) {
    if (!isBrowser()) return items;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
    return items;
  }

  function prepend(item) {
    const items = readAll();
    items.unshift(item);
    writeAll(items);
    return item;
  }

  function replace(items = []) {
    return writeAll(items);
  }

  function clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(storageKey);
  }

  return {
    key: storageKey,
    readAll,
    writeAll,
    prepend,
    replace,
    clear,
  };
}

export default createLocalStorageCollection;
