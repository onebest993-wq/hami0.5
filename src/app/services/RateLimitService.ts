/**
 * Rate Limiting Service
 * حماية من هجمات DDoS والطلبات المفرطة
 * @version 2.0.0 — with IndexedDB persistence
 */

const DB_NAME = 'HamiRateLimitDB';
const DB_VERSION = 1;
const STORE_NAME = 'rateLimitEntries';

const _warn = (...a: unknown[]) => { if (import.meta.env.DEV) console.warn(...a); };
const _log = (...a: unknown[]) => { if (import.meta.env.DEV) console.log(...a); };

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

interface PersistedEntry {
  key: string;
  entry: RateLimitEntry;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    } catch {
      resolve(null);
    }
  });
}

async function persistToDB(key: string, entry: RateLimitEntry): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, entry, updatedAt: Date.now() } satisfies PersistedEntry);
    tx.commit();
  } catch {
    /* best effort */
  } finally {
    db.close();
  }
}

async function bulkLoadFromDB(): Promise<Map<string, RateLimitEntry>> {
  const map = new Map<string, RateLimitEntry>();
  const db = await openDB();
  if (!db) return map;
  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all = await new Promise<PersistedEntry[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as PersistedEntry[]);
      req.onerror = () => reject(req.error);
    });
    const now = Date.now();
    for (const item of all) {
      if (item.entry.resetTime > now) {
        map.set(item.key, item.entry);
      }
    }
  } catch {
    /* best effort */
  } finally {
    db.close();
  }
  return map;
}

async function removeFromDB(key: string): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.commit();
  } catch {
    /* best effort */
  } finally {
    db.close();
  }
}

async function clearAllFromDB(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.commit();
  } catch {
    /* best effort */
  } finally {
    db.close();
  }
}

class RateLimitService {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();
  private persisted = false;

  async initialize(): Promise<void> {
    if (this.persisted) return;
    try {
      const loaded = await bulkLoadFromDB();
      if (loaded.size > 0) {
        this.limits = loaded;
        _log(`[RateLimit] Loaded ${loaded.size} persisted entries`);
      }
      this.persisted = true;
    } catch {
      this.persisted = true;
    }
  }

  configure(operation: string, config: RateLimitConfig): void {
    this.configs.set(operation, config);
  }

  check(operation: string, identifier: string): boolean {
    const config = this.configs.get(operation);
    if (!config) return true;

    const key = `${operation}:${identifier}`;
    const now = Date.now();
    let entry = this.limits.get(key);

    if (entry?.blocked && entry.blockUntil && now < entry.blockUntil) {
      return false;
    }

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        blocked: false,
      };
      this.limits.set(key, entry);
      void persistToDB(key, entry);
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
      entry.blocked = true;
      entry.blockUntil = now + (config.blockDurationMs || config.windowMs * 2);
      _warn(`[RateLimit] Blocked: ${key} (${entry.count} requests)`);
      void persistToDB(key, entry);
      return false;
    }

    void persistToDB(key, entry);
    return true;
  }

  reset(operation: string, identifier: string): void {
    const key = `${operation}:${identifier}`;
    this.limits.delete(key);
    void removeFromDB(key);
  }

  getStatus(operation: string, identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } | null {
    const config = this.configs.get(operation);
    if (!config) return null;

    const key = `${operation}:${identifier}`;
    const entry = this.limits.get(key);

    if (!entry) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
      };
    }

    return {
      allowed: !entry.blocked,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime && (!entry.blocked || (entry.blockUntil && now > entry.blockUntil))) {
        this.limits.delete(key);
        keysToDelete.push(key);
      }
    }
    if (keysToDelete.length > 0) {
      const db = await openDB();
      if (db) {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          for (const k of keysToDelete) store.delete(k);
          tx.commit();
        } catch {
          /* best effort */
        } finally {
          db.close();
        }
      }
    }
  }

  async clearAllPersisted(): Promise<void> {
    this.limits.clear();
    await clearAllFromDB();
  }
}

export const rateLimitService = new RateLimitService();

rateLimitService.configure('api', {
  maxRequests: 100,
  windowMs: 60 * 1000,
  blockDurationMs: 5 * 60 * 1000,
});

rateLimitService.configure('auth', {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 30 * 60 * 1000,
});

rateLimitService.configure('file-upload', {
  maxRequests: 10,
  windowMs: 60 * 1000,
  blockDurationMs: 10 * 60 * 1000,
});

if (typeof window !== 'undefined') {
  rateLimitService.initialize().catch(() => { /* best effort */ });

  const w = window as unknown as {
    __hamiRateLimitCleanupInterval?: ReturnType<typeof setInterval>;
  };
  if (w.__hamiRateLimitCleanupInterval) {
    clearInterval(w.__hamiRateLimitCleanupInterval);
  }
  w.__hamiRateLimitCleanupInterval = setInterval(() => rateLimitService.cleanup(), 5 * 60 * 1000);
  const cleanup = () => {
    if (w.__hamiRateLimitCleanupInterval) {
      clearInterval(w.__hamiRateLimitCleanupInterval);
      w.__hamiRateLimitCleanupInterval = undefined;
    }
  };
  window.addEventListener('pagehide', cleanup, { once: true });
  import.meta.hot?.dispose(() => cleanup());
}

export default rateLimitService;
