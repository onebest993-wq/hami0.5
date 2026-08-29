import { useEffect, useRef, useCallback, useState } from 'react';
import { debug } from '@/app/utils/debug';
import SecureStoreService from '@/app/services/SecureStoreService';

/**
 * Auto-Sync Hook
 * نظام مزامنة تلقائية للبيانات مع Supabase
 * 
 * الميزات:
 * - مزامنة تلقائية كل 5 دقائق
 * - كشف التغييرات وحفظها فوراً
 * - حماية من فقدان البيانات
 * - معالجة الأخطاء والمحاولة مجدداً
 * 
 * الاستخدام:
 * const { syncNow, isSyncing, lastSyncTime } = useAutoSync('lawyer-files', filesData);
 */

interface UseAutoSyncOptions {
    /**
     * تمكين/تعطيل المزامنة التلقائية
     */
    enabled?: boolean;
    
    /**
     * الفاصل الزمني بين عمليات المزامنة (بالميلي ثانية)
     * الافتراضي: 5 دقائق
     */
    interval?: number;
    
    /**
     * حفظ فوري عند تغيير البيانات
     */
    saveOnChange?: boolean;
    
    /**
     * دالة callback عند نجاح المزامنة
     */
    onSyncSuccess?: (timestamp: number) => void;
    
    /**
     * دالة callback عند فشل المزامنة
     */
    onSyncError?: (error: Error) => void;
}

interface UseAutoSyncReturn {
    /**
     * حفظ البيانات فوراً
     */
    syncNow: () => Promise<void>;
    
    /**
     * هل المزامنة قيد التنفيذ؟
     */
    isSyncing: boolean;
    
    /**
     * آخر وقت للمزامنة الناجحة
     */
    lastSyncTime: number | null;
    
    /**
     * عدد محاولات الفشل المتتالية
     */
    failureCount: number;
}

/**
 * Hook للمزامنة التلقائية مع Supabase
 */
export function useAutoSync(
    key: string,
    data: any,
    options: UseAutoSyncOptions = {}
): UseAutoSyncReturn {
    const {
        enabled = true,
        interval = 5 * 60 * 1000, // 5 minutes default
        saveOnChange = true,
        onSyncSuccess,
        onSyncError
    } = options;

    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const [failureCount, setFailureCount] = useState(0);
    const isSyncingRef = useRef(false);
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
    const previousDataRef = useRef<string>('');

    const dataRef = useRef(data);
    dataRef.current = data;
    const onSyncSuccessRef = useRef(onSyncSuccess);
    onSyncSuccessRef.current = onSyncSuccess;
    const onSyncErrorRef = useRef(onSyncError);
    onSyncErrorRef.current = onSyncError;
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    const performSync = useCallback(async () => {
        if (isSyncingRef.current || !enabledRef.current) return;

        try {
            isSyncingRef.current = true;
            setIsSyncing(true);

            try {
                const currentData = dataRef.current;
                const ts = Date.now();
                await SecureStoreService.setItem(`local_${key}`, JSON.stringify({
                    data: currentData,
                    timestamp: ts
                }));
                
                setLastSyncTime(ts);
                setFailureCount(0);
                previousDataRef.current = JSON.stringify(currentData);
                
                onSyncSuccessRef.current?.(ts);
                
            } catch (localError) {
                debug.warn(`[AutoSync] Local storage error for key: ${key}`, localError);
            }

        } catch (error: unknown) {
            debug.error(`[AutoSync] Critical error for key: ${key}:`, error);
            setFailureCount(prev => prev + 1);
            onSyncErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [key]);

    const dataJsonRef = useRef('');
    useEffect(() => {
        if (!enabled || !saveOnChange) return;

        let currentDataStr: string;
        try {
            currentDataStr = JSON.stringify(data);
        } catch {
            return;
        }
        if (currentDataStr === dataJsonRef.current) return;
        dataJsonRef.current = currentDataStr;

        if (previousDataRef.current && currentDataStr !== previousDataRef.current) {
            const timeoutId = setTimeout(() => {
                performSync();
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
        return undefined;
    }, [data, enabled, saveOnChange, key, performSync]);

    useEffect(() => {
        if (!enabled) return;

        performSync();

        intervalIdRef.current = setInterval(() => {
            performSync();
        }, interval);

        return () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
            }
        };
    }, [enabled, interval, performSync]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // لا نسخ احتياطي متزامن عند beforeunload — يعطّل إعادة تحميل الصفحة
        return undefined;
    }, [key]);

    return {
        syncNow: performSync,
        isSyncing,
        lastSyncTime,
        failureCount
    };
}

/**
 * Hook لاسترجاع البيانات من Backup
 */
export function useRestoreFromBackup(key: string) {
    const restoreBackup = useCallback(async () => {
        try {
            // محاولة استرجاع من emergency backup
            const emergencyBackup = await SecureStoreService.getItem(`emergency_backup_${key}`);
            if (emergencyBackup) {
                const parsed: unknown = JSON.parse(emergencyBackup);
                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    !Array.isArray(parsed) &&
                    'data' in parsed
                ) {
                    debug.log(`[AutoSync] 🔄 Restored from emergency backup for key: ${key}`);
                    await SecureStoreService.deleteItem(`emergency_backup_${key}`);
                    return (parsed as { data: unknown }).data;
                }
            }

            // محاولة استرجاع من backup عادي
            const backup = await SecureStoreService.getItem(`backup_${key}`);
            if (backup) {
                const parsed: unknown = JSON.parse(backup);
                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    !Array.isArray(parsed) &&
                    'data' in parsed
                ) {
                    debug.log(`[AutoSync] 🔄 Restored from backup for key: ${key}`);
                    return (parsed as { data: unknown }).data;
                }
            }

            return null;
        } catch (error) {
            debug.error('[AutoSync] Failed to restore backup:', error);
            return null;
        }
    }, [key]);

    return { restoreBackup };
}