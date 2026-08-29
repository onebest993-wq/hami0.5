/**
 * useCloudSync - Hook للمزامنة التلقائية مع السحابة
 * 
 * الوظيفة:
 * - مطابقة البيانات المحلية والسحابة (Supabase)
 * - حل التعارضات تلقائياً (Last Write Wins)
 * - إعادة المحاولة دورياً وعند عودة الاتصال
 * - التوقف الصريح أثناء انقطاع الشبكة أو وضع العمل المحلي
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
import { debug } from '@/app/utils/debug';
import { isLocalOnlyModeEnabled } from '@/app/services/settings/localOnlyGuard';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { isCloudPollingPausedByRealtime } from '@/app/services/realtimeSyncGate';
import {
  performCloudSyncBucket,
  resolveSyncBucket,
} from '@/app/services/cloudSyncEngine';
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
 * التحقق من الاتصال بالإنترنت
 */
function checkOnlineStatus(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
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
  const performSync = useCallback(async (explicit: boolean = false) => {
    if (!enabled) return;
    if (!explicit && isCloudPollingPausedByRealtime()) {
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
    if (resolveSyncBucket(localKey) === 'unsupported') {
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
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    try {
      setState(prev => ({
        ...prev,
        isSyncing: true,
        syncStatus: 'syncing',
        syncError: null
      }));

      const result = await performCloudSyncBucket(localKey, {
        allowWhenRealtimeActive: explicit,
      });
      if (result.skipped) {
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
      if (!result.ok) {
        throw result.error ?? new Error('cloud sync failed');
      }

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          syncStatus: 'success',
          lastSyncTime: new Date(),
          pendingChanges: 0
        }));
      }
      callbacksRef.current?.onSyncSuccess?.();
    } catch (error: unknown) {
      debug.error('[CloudSync] فشلت المزامنة:', error);
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
    await performSync(true);
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
      void performSync(true);
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
      void performSync(true); // مطابقة صريحة للكتابات المحلية المؤجلة بعد عودة الاتصال
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
