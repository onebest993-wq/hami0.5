const DEVICE_ID_KEY = 'hami_device_id';
const COOKIE_MAX_AGE_SEC = 34560000;

let memoryDeviceId: string | null = null;

function generateDeviceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function isDeviceIdShape(value: string): boolean {
  return value.length >= 8 && value.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(value);
}

function readFromStorage(storage: Storage): string | null {
  try {
    const value = storage.getItem(DEVICE_ID_KEY)?.trim() || '';
    return isDeviceIdShape(value) ? value : null;
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

function readDeviceIdCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const [rawKey, ...rest] = part.trim().split('=');
      if (rawKey !== DEVICE_ID_KEY) continue;
      const value = decodeURIComponent(rest.join('=')).trim();
      return isDeviceIdShape(value) ? value : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeDeviceIdCookie(deviceId: string): void {
  if (typeof document === 'undefined') return;
  try {
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${DEVICE_ID_KEY}=${encodeURIComponent(deviceId)}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}

function expireDeviceIdCookie(): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${DEVICE_ID_KEY}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function persistDeviceId(deviceId: string): void {
  memoryDeviceId = deviceId;
  writeToStorage(localStorage, deviceId);
  writeToStorage(sessionStorage, deviceId);
  writeDeviceIdCookie(deviceId);
}

/**
 * معرّف جهاز ثابت عبر إعادة التحميل: ذاكرة → localStorage → sessionStorage → كوكي.
 * بلا ثباته يُعامل المقر كل زيارة كجهاز جديد ويطلب رمز تحقق من جديد.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';

  const existing =
    (memoryDeviceId && isDeviceIdShape(memoryDeviceId) ? memoryDeviceId : null) ??
    readFromStorage(localStorage) ??
    readFromStorage(sessionStorage) ??
    readDeviceIdCookie();
  if (existing) {
    persistDeviceId(existing);
    return existing;
  }

  const deviceId = generateDeviceId();
  persistDeviceId(deviceId);
  return deviceId;
}

/** مسح كل مخازن المعرّف — للمسح الكامل أو الاختبارات. */
export function clearPersistedDeviceId(): void {
  memoryDeviceId = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(DEVICE_ID_KEY);
  } catch {
    /* ignore */
  }
  expireDeviceIdCookie();
}

/** Test-only reset */
export function resetDeviceIdForTests(): void {
  clearPersistedDeviceId();
}
