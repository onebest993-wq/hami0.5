/**
 * RealtimeService - خدمة التحديثات الفورية عبر Supabase Realtime
 * 
 * الوظيفة:
 * - الاستماع للتحديثات الفورية من قاعدة البيانات
 * - إشعارات عند إضافة/تحديث/حذف سجلات
 * - دعم متعدد القنوات (Execution Files, Lawsuit Files, Notes)
 * 
 * الاستخدام:
 * ```typescript
 * // الاشتراك في التحديثات
 * const subscription = RealtimeService.subscribeToExecutionFiles(
 *   userId,
 *   (payload) => {
 *     console.log('تحديث جديد:', payload);
 *   }
 * );
 * 
 * // إلغاء الاشتراك
 * RealtimeService.unsubscribe(subscription);
 * ```
 * 
 * @version 1.0.0
 * @date 2026-03-06
 */

import { supabase } from '@/app/lib/supabase-client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { debug } from '@/app/utils/debug';
import {
  notifyRealtimeChannelClosed,
  notifyRealtimeChannelSubscribed,
} from '@/app/services/realtimeSyncGate';

// =====================================================
// Types
// =====================================================

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimePayload<T = any> {
  eventType: RealtimeEventType;
  new: T | null;
  old: T | null;
  table: string;
  schema: string;
  commitTimestamp: string;
}

export type RealtimeCallback<T = any> = (payload: RealtimePayload<T>) => void;

export interface SubscriptionOptions {
  event?: RealtimeEventType;
  filter?: string;
}

// =====================================================
// RealtimeService Class
// =====================================================

export class RealtimeService {
  private static channels = new Map<string, RealtimeChannel>();
  private static subscriptionCount = 0;

  /**
   * الاشتراك في تحديثات ملفات التنفيذ
   */
  static subscribeToExecutionFiles(
    userId: string,
    callback: RealtimeCallback,
    options: SubscriptionOptions = {}
  ): string {
    // ✅ FIX: تعطيل Realtime لأن جدول execution_files غير موجود
    // النظام يعمل بـ LocalStorage حالياً
    const channelId = `execution-files-${userId}-${++this.subscriptionCount}`;
    debug.log('[RealtimeService] ملفات التنفيذ: التحديث الفوري غير مفعّل (وضع محلي)');
    
    // إرجاع subscription ID وهمي
    return channelId;
  }

  /**
   * الاشتراك في تحديثات ملفات الدعاوى
   */
  static subscribeToLawsuitFiles(
    userId: string,
    callback: RealtimeCallback,
    options: SubscriptionOptions = {}
  ): string {
    const channelId = `lawsuit-files-${userId}-${++this.subscriptionCount}`;
    
    debug.log('[RealtimeService] الاشتراك في ملفات الدعاوى:', channelId);

    // إزالة أي قناة سابقة بنفس الاسم لمنع التعارض
    const existing = this.channels.get(channelId);
    if (existing) {
      supabase.removeChannel(existing);
      this.channels.delete(channelId);
    }

    try {
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: options.event || '*',
            schema: 'public',
            table: 'lawsuit_files',
            filter: `user_id=eq.${userId}`
          },
          (payload: any) => {
            debug.log('[RealtimeService] تحديث ملف دعوى:', payload);
            
            callback({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: payload.table,
              schema: payload.schema,
              commitTimestamp: payload.commit_timestamp
            });
          }
        )
        .subscribe((status) => {
          debug.log('[RealtimeService] حالة الاشتراك:', status);

          if (status === 'SUBSCRIBED') {
            notifyRealtimeChannelSubscribed();
            debug.log('[RealtimeService] ✅ تم الاشتراك بنجاح في ملفات الدعاوى');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            notifyRealtimeChannelClosed();
          }
        });

      this.channels.set(channelId, channel);
    } catch {
      debug.warn('[RealtimeService] subscribe lawsuit skipped:', channelId);
    }
    return channelId;
  }

  /**
   * الاشتراك في تحديثات الملاحظات
   */
  static subscribeToGlobalNotes(
    userId: string,
    callback: RealtimeCallback,
    options: SubscriptionOptions = {}
  ): string {
    const channelId = `global-notes-${userId}-${++this.subscriptionCount}`;
    
    debug.log('[RealtimeService] الاشتراك في الملاحظات:', channelId);

    // إزالة أي قناة سابقة بنفس الاسم لمنع التعارض
    const existing = this.channels.get(channelId);
    if (existing) {
      supabase.removeChannel(existing);
      this.channels.delete(channelId);
    }

    try {
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: options.event || '*',
            schema: 'public',
            table: 'global_notes',
            filter: `user_id=eq.${userId}`
          },
          (payload: any) => {
            debug.log('[RealtimeService] تحديث ملاحظة:', payload);
            
            callback({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: payload.table,
              schema: payload.schema,
              commitTimestamp: payload.commit_timestamp
            });
          }
        )
        .subscribe((status) => {
          debug.log('[RealtimeService] حالة الاشتراك:', status);

          if (status === 'SUBSCRIBED') {
            notifyRealtimeChannelSubscribed();
            debug.log('[RealtimeService] ✅ تم الاشتراك بنجاح في الملاحظات');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            notifyRealtimeChannelClosed();
          }
        });

      this.channels.set(channelId, channel);
    } catch {
      debug.warn('[RealtimeService] subscribe notes skipped:', channelId);
    }
    return channelId;
  }

  /**
   * الاشتراك في جميع التحديثات (All Tables)
   */
  static subscribeToAll(
    userId: string,
    callbacks: {
      onExecutionUpdate?: RealtimeCallback;
      onLawsuitUpdate?: RealtimeCallback;
      onNoteUpdate?: RealtimeCallback;
    }
  ): string[] {
    const subscriptions: string[] = [];

    if (callbacks.onExecutionUpdate) {
      subscriptions.push(
        this.subscribeToExecutionFiles(userId, callbacks.onExecutionUpdate)
      );
    }

    if (callbacks.onLawsuitUpdate) {
      subscriptions.push(
        this.subscribeToLawsuitFiles(userId, callbacks.onLawsuitUpdate)
      );
    }

    if (callbacks.onNoteUpdate) {
      subscriptions.push(
        this.subscribeToGlobalNotes(userId, callbacks.onNoteUpdate)
      );
    }

    debug.log('[RealtimeService] ✅ تم الاشتراك في جميع التحديثات:', subscriptions.length);
    return subscriptions;
  }

  /**
   * إلغاء اشتراك واحد
   */
  static async unsubscribe(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    
    if (channel) {
      await supabase.removeChannel(channel);
      this.channels.delete(channelId);
      notifyRealtimeChannelClosed();
      debug.log('[RealtimeService] ✅ تم إلغاء الاشتراك:', channelId);
    } else if (channelId.startsWith('execution-files-')) {
      // execution-files channels are phantom (LocalStorage mode)
    } else {
      debug.warn('[RealtimeService] ⚠️ القناة غير موجودة:', channelId);
    }
  }

  /**
   * إلغاء جميع الاشتراكات
   */
  static async unsubscribeAll(): Promise<void> {
    debug.log('[RealtimeService] إلغاء جميع الاشتراكات...');
    
    for (const channel of this.channels.values()) {
      await supabase.removeChannel(channel);
    }
    
    this.channels.clear();
    debug.log('[RealtimeService] ✅ تم إلغاء جميع الاشتراكات');
  }

  /**
   * الحصول على عدد الاشتراكات النشطة
   */
  static getActiveSubscriptionsCount(): number {
    return this.channels.size;
  }

  /**
   * التحقق إن كان الاشتراك فعلياً بقناة Realtime نشطة
   * ملاحظة: بعض الاشتراكات (مثل execution حالياً) تكون وهمية عند العمل بوضع LocalStorage
   */
  static isActiveSubscription(channelId: string): boolean {
    return this.channels.has(channelId);
  }

  /**
   * التحقق من حالة الاتصال Realtime
   */
  static getStatus(): 'connected' | 'connecting' | 'disconnected' {
    // Supabase Realtime status is managed internally
    // We can check if we have active channels
    return this.channels.size > 0 ? 'connected' : 'disconnected';
  }
}