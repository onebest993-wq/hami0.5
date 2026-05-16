/**
 * useRealtime - Hook للتحديثات الفورية
 * 
 * الوظيفة:
 * - الاشتراك في التحديثات الفورية من Supabase
 * - إشعارات بصرية عند التحديثات
 * - تحديث State تلقائياً
 * 
 * الاستخدام:
 * ```typescript
 * const { isConnected, lastUpdate } = useRealtime({
 *   userId: user.id,
 *   onExecutionUpdate: (payload) => {
 *     // تحديث القائمة
 *     if (payload.eventType === 'INSERT') {
 *       SmartToast.info('📩 ملف تنفيذ جديد');
 *     }
 *   },
 *   enabled: true
 * });
 * ```
 * 
 * @version 1.0.0
 * @date 2026-03-06
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeService, RealtimeCallback } from '@/app/services/RealtimeService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';

// =====================================================
// Types
// =====================================================

export interface UseRealtimeOptions {
  userId: string;
  enabled?: boolean;
  showToasts?: boolean;
  onExecutionUpdate?: RealtimeCallback;
  onLawsuitUpdate?: RealtimeCallback;
  onNoteUpdate?: RealtimeCallback;
}

export interface UseRealtimeState {
  isConnected: boolean;
  lastUpdate: Date | null;
  updateCount: number;
}

// =====================================================
// useRealtime Hook
// =====================================================

export function useRealtime(options: UseRealtimeOptions): UseRealtimeState {
  const {
    userId,
    enabled = true,
    showToasts = true,
    onExecutionUpdate,
    onLawsuitUpdate,
    onNoteUpdate
  } = options;

  const [state, setState] = useState<UseRealtimeState>({
    isConnected: false,
    lastUpdate: null,
    updateCount: 0
  });

  const subscriptionsRef = useRef<string[]>([]);
  const callbacksRef = useRef({ onExecutionUpdate, onLawsuitUpdate, onNoteUpdate, showToasts });
  callbacksRef.current = { onExecutionUpdate, onLawsuitUpdate, onNoteUpdate, showToasts };

  // =====================================================
  // Stable wrapped callbacks (read from ref to avoid effect re-runs)
  // =====================================================

  const wrappedExecutionCallback = useCallback<RealtimeCallback>((payload) => {
    const { onExecutionUpdate: cb, showToasts: st } = callbacksRef.current;
    setState(prev => ({ ...prev, lastUpdate: new Date(), updateCount: prev.updateCount + 1 }));
    if (st) {
      if (payload.eventType === 'INSERT') SmartToast.info('📩 ملف تنفيذ جديد تمت إضافته');
      else if (payload.eventType === 'UPDATE') SmartToast.info('🔄 تم تحديث ملف تنفيذ');
      else if (payload.eventType === 'DELETE') SmartToast.warning('🗑️ تم حذف ملف تنفيذ');
    }
    cb?.(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wrappedLawsuitCallback = useCallback<RealtimeCallback>((payload) => {
    const { onLawsuitUpdate: cb, showToasts: st } = callbacksRef.current;
    setState(prev => ({ ...prev, lastUpdate: new Date(), updateCount: prev.updateCount + 1 }));
    if (st) {
      if (payload.eventType === 'INSERT') SmartToast.info('📩 ملف دعوى جديد تمت إضافته');
      else if (payload.eventType === 'UPDATE') SmartToast.info('🔄 تم تحديث ملف دعوى');
      else if (payload.eventType === 'DELETE') SmartToast.warning('🗑️ تم حذف ملف دعوى');
    }
    cb?.(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wrappedNoteCallback = useCallback<RealtimeCallback>((payload) => {
    const { onNoteUpdate: cb, showToasts: st } = callbacksRef.current;
    setState(prev => ({ ...prev, lastUpdate: new Date(), updateCount: prev.updateCount + 1 }));
    if (st) {
      if (payload.eventType === 'INSERT') SmartToast.info('📝 ملاحظة جديدة تمت إضافتها');
      else if (payload.eventType === 'UPDATE') SmartToast.info('🔄 تم تحديث ملاحظة');
      else if (payload.eventType === 'DELETE') SmartToast.warning('🗑️ تم حذف ملاحظة');
    }
    cb?.(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // Effects
  // =====================================================

  /**
   * الاشتراك في التحديثات - deps: enabled, userId فقط (callbacks عبر ref)
   */
  useEffect(() => {
    if (!enabled || !userId) {
      debug.log('[useRealtime] التحديثات الفورية معطلة');
      setState(prev => ({ ...prev, isConnected: false }));
      return;
    }

    debug.log('[useRealtime] بدء الاشتراك في التحديثات الفورية...');

    const opts = callbacksRef.current;
    const subs = RealtimeService.subscribeToAll(userId, {
      onExecutionUpdate: opts.onExecutionUpdate ? wrappedExecutionCallback : undefined,
      onLawsuitUpdate: opts.onLawsuitUpdate ? wrappedLawsuitCallback : undefined,
      onNoteUpdate: opts.onNoteUpdate ? wrappedNoteCallback : undefined
    });

    subscriptionsRef.current = subs;
    const hasActiveChannel = subs.some((subId) => RealtimeService.isActiveSubscription(subId));
    setState(prev => ({ ...prev, isConnected: hasActiveChannel }));

    debug.log(`[useRealtime] ✅ تم الاشتراك في ${subs.length} قناة`);

    return () => {
      debug.log('[useRealtime] إلغاء الاشتراكات...');
      subscriptionsRef.current.forEach(subId => RealtimeService.unsubscribe(subId));
      subscriptionsRef.current = [];
      // لا نستدعي setState هنا - المكوّن سيفكك فوراً
    };
  }, [enabled, userId, wrappedExecutionCallback, wrappedLawsuitCallback, wrappedNoteCallback]);

  // =====================================================
  // Return
  // =====================================================

  return state;
}