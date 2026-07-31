/**
 * Storage Cache Layer
 * طبقة تخزين مؤقت لتحسين أداء LocalStorage (بدون تأثير على التصميم)
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import {
  applyExecutionDossierBlobSet,
  isExecutionDossierMainBlobKey,
  readExecutionDossierBlob,
  registerExecutionBlobCacheTouch,
} from '@/app/utils/executionDossierBlobPersistence';
import { executionDossierIdFromStorageKey } from '@/app/utils/executionStorageKeys';

function readExecutionDossierCacheValue(key: string): Record<string, unknown> | null {
  if (!isExecutionDossierMainBlobKey(key)) return null;
  const dossierId = executionDossierIdFromStorageKey(key);
  if (!dossierId) return null;
  const blob = readExecutionDossierBlob(dossierId);
  return blob && typeof blob === 'object' ? blob : null;
}

function executionDossierValueExistsInStorage(key: string): boolean {
  return readExecutionDossierCacheValue(key) != null;
}

interface CacheEntry {
  value: any;
  timestamp: number;
}

class StorageCacheClass {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 دقائق
  private isEnabled: boolean = true;

  /**
   * تفعيل/تعطيل الـ Cache
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cache.clear();
    }
  }

  /**
   * قراءة من الـ Cache أو LocalStorage
   */
  get(key: string): any | null {
    if (!this.isEnabled) {
      return this.readFromLocalStorage(key);
    }

    const cached = this.cache.get(key);

    if (cached) {
      if (Date.now() - cached.timestamp > this.TTL) {
        this.cache.delete(key);
        return this.get(key);
      }
      // إن حُذف المفتاح من SecureStore مباشرةً — لا نُرجع قيمة قديمة من الذاكرة
      try {
        const stillExists = isExecutionDossierMainBlobKey(key)
          ? executionDossierValueExistsInStorage(key)
          : SecureStoreService.getItemSync(key) !== null;
        if (!stillExists) {
          this.cache.delete(key);
          return null;
        }
      } catch {
        this.cache.delete(key);
        return null;
      }
      return cached.value;
    }

    const value = this.readFromLocalStorage(key);
    if (value !== null) {
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
      });
    }
    return value;
  }

  /**
   * تحديث الذاكرة المؤقتة فقط — بعد كتابة SecureStore مباشرة
   */
  touchCacheEntry(key: string, value: any): void {
    if (!this.isEnabled) return;
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * الكتابة إلى الـ Cache و LocalStorage
   */
  set(key: string, value: any): void {
    if (applyExecutionDossierBlobSet(key, value, (k, v) => this.touchCacheEntry(k, v))) {
      return;
    }
    // الكتابة إلى localStorage
    try {
      SecureStoreService.setItemSync(key, JSON.stringify(value));
    } catch (e) {
      console.error('[StorageCache] فشل الحفظ في localStorage:', e);
      return;
    }

    // الكتابة إلى الـ Cache
    if (this.isEnabled) {
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });
    }
  }

  /**
   * حذف من الـ Cache و LocalStorage
   */
  remove(key: string): void {
    this.cache.delete(key);
    try {
      SecureStoreService.deleteItemSync(key);
    } catch (e) {
      console.error('[StorageCache] فشل الحذف من localStorage:', e);
    }
  }

  /**
   * إلغاء صلاحية key معين من الـ Cache فقط
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * مسح الـ Cache بالكامل (بدون تأثير على localStorage)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * مسح الـ Cache و LocalStorage
   */
  clearAll(): void {
    this.cache.clear();
    try {
      const appKeyPrefixes = ['hami_', 'hami:', 'lawyer_', 'execution_', 'lawsuit_', 'client_', 'notes_', 'cache_'];
      const keys = SecureStoreService.listKeysSync();
      keys.forEach((k) => {
        if (appKeyPrefixes.some((p) => k.startsWith(p))) {
          SecureStoreService.deleteItemSync(k);
        }
      });
    } catch (e) {
      console.error('[StorageCache] فشل مسح localStorage:', e);
    }
  }

  /**
   * الحصول على حجم الـ Cache
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * الحصول على إحصائيات الـ Cache
   */
  getStats(): {
    cacheSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;

    this.cache.forEach((entry) => {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (newestTimestamp === null || entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    });

    return {
      cacheSize: this.cache.size,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp
    };
  }

  /**
   * قراءة من LocalStorage مع معالجة الأخطاء
   */
  private readFromLocalStorage(key: string): any | null {
    try {
      const dossierBlob = readExecutionDossierCacheValue(key);
      if (dossierBlob) return dossierBlob;

      const value = SecureStoreService.getItemSync(key);
      if (value === null) return null;

      try {
        return JSON.parse(value);
      } catch {
        // إذا لم يكن JSON، أرجع النص كما هو
        return value;
      }
    } catch (e) {
      console.error('[StorageCache] فشل القراءة من localStorage:', e);
      return null;
    }
  }

  /**
   * تنظيف الـ entries القديمة
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        removed++;
      }
    });

    if (removed > 0 && import.meta.env.DEV) {
      console.log(`🧹 [StorageCache] تم تنظيف ${removed} إدخال قديم`);
    }

    return removed;
  }
}

// Singleton Instance
export const storageCache = new StorageCacheClass();

registerExecutionBlobCacheTouch((key, value) => storageCache.touchCacheEntry(key, value));

if (typeof window !== 'undefined') {
  const w = window as unknown as {
    __hamiStorageCacheCleanupInterval?: number;
  };
  if (w.__hamiStorageCacheCleanupInterval) {
    clearInterval(w.__hamiStorageCacheCleanupInterval);
  }
  w.__hamiStorageCacheCleanupInterval = window.setInterval(() => storageCache.cleanup(), 10 * 60 * 1000);
  const cleanup = () => {
    if (w.__hamiStorageCacheCleanupInterval) {
      clearInterval(w.__hamiStorageCacheCleanupInterval);
      w.__hamiStorageCacheCleanupInterval = undefined;
    }
  };
  window.addEventListener('pagehide', cleanup, { once: true });
  import.meta.hot?.dispose(() => cleanup());
}

/**
 * Helper Functions للاستخدام المباشر
 */

export const getCachedItem = (key: string): any | null => {
  return storageCache.get(key);
};

export const setCachedItem = (key: string, value: any): void => {
  storageCache.set(key, value);
};

export const removeCachedItem = (key: string): void => {
  storageCache.remove(key);
};

export const invalidateCache = (key: string): void => {
  storageCache.invalidate(key);
};
