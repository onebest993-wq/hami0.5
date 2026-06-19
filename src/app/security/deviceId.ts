const DEVICE_ID_KEY = 'hami_device_id';

let memoryDeviceId: string | null = null;

function generateDeviceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function readFromStorage(storage: Storage): string | null {
  try {
    const value = storage.getItem(DEVICE_ID_KEY);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function writeToStorage(storage: Storage, deviceId: string): boolean {
  try {
    storage.setItem(DEVICE_ID_KEY, deviceId);
    return true;
  } catch {
    return false;
  }
}

/** معرّف جهاز ثابت — localStorage → sessionStorage → ذاكرة الجلسة */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';

  const existing =
    readFromStorage(localStorage) ??
    readFromStorage(sessionStorage) ??
    memoryDeviceId;
  if (existing) return existing;

  const deviceId = generateDeviceId();
  if (writeToStorage(localStorage, deviceId)) return deviceId;
  if (writeToStorage(sessionStorage, deviceId)) return deviceId;
  memoryDeviceId = deviceId;
  return deviceId;
}

/** Test-only reset */
export function resetDeviceIdForTests(): void {
  memoryDeviceId = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
    sessionStorage.removeItem(DEVICE_ID_KEY);
  } catch {
    /* ignore */
  }
}
