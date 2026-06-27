/**
 * useCloudSync - Hook للمزامنة التلقائية مع السحابة
 * 
 * الوظيفة:
 * - مزامنة البيانات بين localStorage والسحابة (Supabase)
 * - حل التعارضات تلقائياً (Last Write Wins)
 * - إعادة المحاولة عند فشل الاتصال
 * - دعم Offline Mode مع Queue
 * 
 * الاستخدام:
 * ```typescript
 * const { isSyncing, lastSyncTime, syncNow, syncStatus } = useCloudSync({
 *   localKey: 'lawyer-execution-files',
 *   syncInterval: 30000, // 30 ثانية
 *   enabled: true
 * });
 * ```
 * 
 * @version 1.0.0
 * @date 2026-03-06
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseService } from '@/app/services/SupabaseService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { debug } from '@/app/utils/debug';
import SecureStoreService from '@/app/services/SecureStoreService';
import { isLocalOnlyModeEnabled } from '@/app/services/settings/localOnlyGuard';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { isCloudPollingPausedByRealtime } from '@/app/services/realtimeSyncGate';
import { isBenignSecureFetchError } from '@/app/services/secureFetchErrors';
import {
    mapLocalKeyToCloudSyncBucket,
    useCloudSyncStatusStore,
} from '@/app/services/cloudSync/cloudSyncStatusStore';

// =====================================================
// Types
// =====================================================

export interface CloudSyncOptions {
  localKey: string;                  // مفتاح localStorage
  syncInterval?: number;             // الفترة الزمنية للمزامنة (بالميلي ثانية)
  enabled?: boolean;                 // تفعيل/تعطيل المزامنة
  onSyncSuccess?: () => void;        // callback عند النجاح
  onSyncError?: (error: Error) => void; // callback عند الفشل
}

export interface CloudSyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
  pendingChanges: number;
  isOnline: boolean;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * دمج البيانات مع حل التعارضات (Last Write Wins)
 */
type SyncItem = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function idOf(item: unknown): string | null {
  if (!isRecord(item)) return null;
  const id = item.id;
  if (typeof id === 'string') return id;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  return null;
}

function updatedAtMsOf(item: unknown): number {
  if (!isRecord(item)) return 0;
  const v = item.updatedAt;
  if (typeof v !== 'string') return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

function normalizeArray(input: unknown): SyncItem[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is SyncItem => isRecord(x) && idOf(x) !== null);
}

function mergeWithConflictResolution(
  cloudDataRaw: unknown,
  localDataRaw: unknown,
): { merged: SyncItem[]; conflictsResolved: number } {
  const cloudData = normalizeArray(cloudDataRaw);
  const localData = normalizeArray(localDataRaw);

  const map = new Map<string, SyncItem>();
  let conflictsResolved = 0;
  
  // إضافة بيانات السحابة أولاً
  cloudData.forEach((item) => {
    const id = idOf(item);
    if (!id) return;
    map.set(id, item);
  });
  
  // دمج البيانات المحلية
  localData.forEach((localItem) => {
    const id = idOf(localItem);
    if (!id) return;
    const cloudItem = map.get(id);
    
    if (!cloudItem) {
      // عنصر جديد محلياً
      map.set(id, localItem);
    } else {
      // تعارض: اختر الأحدث
      const localTime = updatedAtMsOf(localItem);
      const cloudTime = updatedAtMsOf(cloudItem);
      
      if (localTime > cloudTime) {
        map.set(id, localItem);
        conflictsResolved++;
        debug.log(`[CloudSync] تم حل تعارض: ${id} (المحلي أحدث)`);
      }
    }
  });
  
  return {
    merged: Array.from(map.values()),
    conflictsResolved
  };
}

/**
 * التحقق من الاتصال بالإنترنت
 */
function checkOnlineStatus(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

type SyncBucket = 'execution' | 'lawsuit' | 'notes' | 'unsupported';

function resolveSyncBucket(localKey: string): SyncBucket {
  const key = localKey.trim();
  const executionKeys = new Set([
    EXECUTION_FILES_STORAGE_KEY,
    'lawyer_execution_files',
    'hami-execution-files',
    'execution_files',
  ]);
  if (executionKeys.has(key)) return 'execution';
  if (key === STORAGE_KEYS.LAWYER_FILES || key.includes('lawyer_files')) return 'lawsuit';
  if (key.includes('lawsuit')) return 'lawsuit';
  if (key.includes('notes')) return 'notes';
  if (key.includes('execution')) return 'execution';
  return 'unsupported';
}

// =====================================================
// useCloudSync Hook
// =====================================================

export function useCloudSync(options: CloudSyncOptions): CloudSyncState & {
  syncNow: () => Promise<void>;
  clearPendingChanges: () => void;
} {
  const {
    localKey,
    syncInterval = 30000, // افتراضي: 30 ثانية
    enabled = true,
    onSyncSuccess,
    onSyncError
  } = options;
  
  // State
  const [state, setState] = useState<CloudSyncState>({
    isSyncing: false,
    lastSyncTime: null,
    syncStatus: 'idle',
    syncError: null,
    pendingChanges: 0,
    isOnline: checkOnlineStatus()
  });
  
  // Refs
  const isMountedRef = useRef(true);
  const isSyncingRef = useRef(false); // حماية من التكرار دون إعادة إنشاء performSync
  const disabledLoggedRef = useRef(false);
  const callbacksRef = useRef({ onSyncSuccess, onSyncError });
  callbacksRef.current = { onSyncSuccess, onSyncError };
  const syncBucketId = mapLocalKeyToCloudSyncBucket(localKey);
  const lastSyncTimeMs = state.lastSyncTime?.getTime() ?? null;
  const lastReportKeyRef = useRef('');

  useEffect(() => {
    if (!syncBucketId) return;
    const reportKey = JSON.stringify({
      isSyncing: state.isSyncing,
      lastSyncTimeMs,
      syncStatus: state.syncStatus,
      syncError: state.syncError,
      isOnline: state.isOnline,
    });
    if (reportKey === lastReportKeyRef.current) return;
    lastReportKeyRef.current = reportKey;
    useCloudSyncStatusStore.getState().reportBucket(syncBucketId, {
      isSyncing: state.isSyncing,
      lastSyncTime: lastSyncTimeMs,
      syncStatus: state.syncStatus,
      syncError: state.syncError,
    });
    useCloudSyncStatusStore.getState().setOnline(state.isOnline);
  }, [syncBucketId, state.isSyncing, lastSyncTimeMs, state.syncStatus, state.syncError, state.isOnline]);

  function errorMessageOf(err: unknown): string {
    if (err instanceof Error) return err.message || 'حدث خطأ غير متوقع';
    if (typeof err === 'string' && err.trim()) return err;
    return 'حدث خطأ غير متوقع';
  }
  
  /**
   * دالة المزامنة الرئيسية - مستقرة (لا تعتمد على callbacks أو state للتشغيل)
   */
  const performSync = useCallback(async () => {
    if (!enabled) return;
    if (isCloudPollingPausedByRealtime()) {
      debug.log('[CloudSync] تخطي المزامنة — Realtime نشط');
      return;
    }
    if (isLocalOnlyModeEnabled()) return;
    const cloudNetworkEnabled = import.meta.env.VITE_ENABLE_CLOUD_SYNC === 'true';
    if (!cloudNetworkEnabled) {
      if (import.meta.env.DEV && !disabledLoggedRef.current) {
        disabledLoggedRef.current = true;
        debug.log('[CloudSync] مزامنة السحابة غير مفعلة في هذا الإصدار');
      }
      return;
    }
    if (!checkOnlineStatus()) {
      debug.log('[CloudSync] المزامنة معطلة أو لا يوجد اتصال');
      return;
    }
    
    if (isSyncingRef.current) return; // تخطي صامت - لا حاجة لسجلات متكررة
    
    let hasUser = false;
    try {
      const authTimeoutMs = 8_000;
      hasUser = await Promise.race([
        SupabaseService.checkUserAuth(),
        new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('auth timeout')), authTimeoutMs);
        }),
      ]);
    } catch {
      return;
    }
    if (!hasUser) return;
    
    isSyncingRef.current = true;
    try {
      await SecureStoreService.ensurePersistedReady();

      setState(prev => ({
        ...prev,
        isSyncing: true,
        syncStatus: 'syncing',
        syncError: null
      }));
      
      debug.log(`[CloudSync] بدء المزامنة لـ ${localKey}...`);
      
      // تحديد نوع البيانات بناءً على المفتاح
      let cloudDataRaw: unknown = [];
      let localDataRaw: unknown = [];
      
      const bucket = resolveSyncBucket(localKey);
      if (bucket === 'execution') {
        // ملفات التنفيذ
        cloudDataRaw = await SupabaseService.getExecutionFiles();
        localDataRaw = (await persistenceRepository.loadAsync(localKey)) ?? [];
      } else if (bucket === 'lawsuit') {
        // ملفات الدعاوى — محلي فقط (لا شبكة، لا دمج ثقيل يجمّد الواجهة)
        localDataRaw = (await persistenceRepository.loadAsync(localKey)) ?? [];
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            syncStatus: 'success',
            lastSyncTime: new Date(),
            pendingChanges: 0,
          }));
        }
        callbacksRef.current?.onSyncSuccess?.();
        return;
      } else if (bucket === 'notes') {
        // الملاحظات
        cloudDataRaw = await SupabaseService.getGlobalNotes();
        localDataRaw = (await persistenceRepository.loadAsync(localKey)) ?? [];
      } else {
        debug.warn(`[CloudSync] نوع غير مدعوم: ${localKey}`);
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            syncStatus: 'idle',
            syncError: null,
          }));
        }
        return;
      }
      
      // دمج البيانات
      const { merged, conflictsResolved } = mergeWithConflictResolution(cloudDataRaw, localDataRaw);

      const mergedItems = normalizeArray(merged);
      const localItems = normalizeArray(localDataRaw);
      const cloudItems = normalizeArray(cloudDataRaw);

      // لا نُ persist مصفوفة فارغة فوق بيانات غير محمّلة أو مفقودة
      if (mergedItems.length === 0 && localItems.length === 0 && cloudItems.length === 0) {
        debug.log(`[CloudSync] تخطي الحفظ — لا بيانات في ${localKey}`);
      } else {
        persistenceRepository.save(localKey, merged);
      }
      
      // تحديث الحالة
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'success',
          lastSyncTime: new Date(),
          pendingChanges: 0
        }));
      }
      
      debug.log(`[CloudSync] ✅ المزامنة مكتملة:`, {
        cloudItems: cloudItems.length,
        localItems: localItems.length,
        mergedItems: mergedItems.length,
        conflictsResolved,
      });
      
      callbacksRef.current?.onSyncSuccess?.();
      
    } catch (error: unknown) {
      if (isBenignSecureFetchError(error)) {
        debug.warn('[CloudSync] sync skipped (offline/unavailable):', error);
      } else {
        debug.error('[CloudSync] فشلت المزامنة:', error);
      }
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'error',
          syncError: errorMessageOf(error)
        }));
      }
      
      callbacksRef.current?.onSyncError?.(error instanceof Error ? error : new Error(errorMessageOf(error)));
    } finally {
      isSyncingRef.current = false;
    }
  }, [enabled, localKey]);
  
  /**
   * مزامنة فورية (يدوياً)
   */
  const syncNow = useCallback(async () => {
    debug.log('[CloudSync] مزامنة يدوية مطلوبة');
    await performSync();
  }, [performSync]);
  
  /**
   * مسح التغييرات المعلقة
   */
  const clearPendingChanges = useCallback(() => {
    setState(prev => ({ ...prev, pendingChanges: 0 }));
  }, []);
  
  // =====================================================
  // Effects
  // =====================================================
  
  /**
   * تفعيل المزامنة التلقائية
   */
  useEffect(() => {
    if (!enabled) {
      if (!disabledLoggedRef.current) {
        disabledLoggedRef.current = true;
        debug.log('[CloudSync] في انتظار تسجيل الدخول لتفعيل المزامنة');
      }
      return;
    }
    disabledLoggedRef.current = false;
    if (typeof window === 'undefined') return;

    // تأجيل المزامنة الأولى حتى يكتمل رسم الواجهة (يمنع تجمّد/شريط التحميل عند Refresh)
    let initialTimer: number | null = null;
    let idleId: number | null = null;
    let initialStarted = false;
    const runInitialSyncOnce = () => {
      if (initialStarted) return;
      initialStarted = true;
      if (idleId !== null && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId);
      }
      if (initialTimer !== null) window.clearTimeout(initialTimer);
      void performSync();
    };

    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(runInitialSyncOnce, { timeout: 6_000 });
    }
    initialTimer = window.setTimeout(runInitialSyncOnce, 4_000);

    return () => {
      if (initialTimer !== null) window.clearTimeout(initialTimer);
      if (idleId !== null && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId);
      }
    };
  }, [enabled, performSync]);

  useVisibilityAwareInterval(() => {
    if (isCloudPollingPausedByRealtime()) return;
    void performSync();
  }, syncInterval, enabled);
  
  /**
   * مراقبة حالة الاتصال بالإنترنت
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      debug.log('[CloudSync] الاتصال بالإنترنت مستعاد');
      setState(prev => ({ ...prev, isOnline: true }));
      performSync(); // مزامنة فورية عند استعادة الاتصال
    };
    
    const handleOffline = () => {
      debug.log('[CloudSync] فقدان الاتصال بالإنترنت');
      setState(prev => ({ ...prev, isOnline: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync]);
  
  /**
   * Cleanup عند unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // =====================================================
  // Return
  // =====================================================
  
  return {
    ...state,
    syncNow,
    clearPendingChanges
  };
}

// =====================================================
// Export SupabaseService للاستخدام المباشر
// =====================================================

export { SupabaseService };
