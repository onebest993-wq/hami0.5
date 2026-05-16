/**
 * PushNotificationService - خدمة الإشعارات الفورية
 * 
 * الوظيفة:
 * - طلب صلاحية الإشعارات
 * - تسجيل Service Worker
 * - إرسال إشعارات محلية
 * - الاشتراك في Push Notifications
 * 
 * الاستخدام:
 * ```typescript
 * // تهيئة الخدمة
 * await PushNotificationService.initialize();
 * 
 * // إرسال إشعار محلي
 * await PushNotificationService.showNotification({
 *   title: 'ملف جديد',
 *   body: 'تم إضافة ملف تنفيذ جديد',
 *   tag: 'new-execution'
 * });
 * 
 * // فحص الصلاحيات
 * const permission = PushNotificationService.getPermission();
 * ```
 * 
 * @version 1.0.0
 * @date 2026-03-06
 */

import { debug } from '@/app/utils/debug';

// =====================================================
// Types
// =====================================================

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// =====================================================
// PushNotificationService Class
// =====================================================

export class PushNotificationService {
  private static registration: ServiceWorkerRegistration | null = null;
  private static isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  private static permissionStatus: NotificationPermission = 'default';

  /**
   * تهيئة الخدمة
   */
  static async initialize(): Promise<boolean> {
    // ✅ FIX: تعطيل Service Worker في بيئة Figma Make
    // Service Workers لا تعمل بشكل صحيح في iframes
    if (!('Notification' in window)) {
      debug.warn('[PushNotification] Notifications API not supported');
      return false;
    }

    try {
      // ✅ استخدام Notification API مباشرة بدون Service Worker
      debug.log('[PushNotification] ✅ Initialized (without Service Worker)');

      // فحص الصلاحيات
      this.permissionStatus = Notification.permission as NotificationPermission;
      
      return true;
    } catch (error) {
      debug.error('[PushNotification] ❌ Initialization failed:', error);
      return false;
    }
  }

  /**
   * طلب صلاحية الإشعارات
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      debug.warn('[PushNotification] Notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission as NotificationPermission;
      
      debug.log('[PushNotification] Permission:', permission);
      return this.permissionStatus;
    } catch (error) {
      debug.error('[PushNotification] ❌ Permission request failed:', error);
      return 'denied';
    }
  }

  /**
   * فحص صلاحية الإشعارات
   */
  static getPermission(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission as NotificationPermission;
  }

  /**
   * إرسال إشعار محلي
   */
  static async showNotification(options: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      debug.warn('[PushNotification] Cannot show notification - not supported');
      return;
    }

    if (this.getPermission() !== 'granted') {
      debug.warn('[PushNotification] Permission not granted');
      return;
    }

    try {
      // ✅ FIX: استخدام Notification API مباشرة بدون Service Worker
      const notification = new Notification(options.title, {
        body: options.body || '',
        icon: options.icon || '/icon-192.png',
        tag: options.tag || 'default',
        data: options.data || {},
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      // Auto-close بعد 5 ثواني (اختياري)
      setTimeout(() => notification.close(), 5000);
      
      debug.log('[PushNotification] ✅ Notification shown:', options.title);
    } catch (error) {
      debug.error('[PushNotification] ❌ Failed to show notification:', error);
    }
  }

  /**
   * إشعارات مخصصة للنظام القانوني
   */
  static async notifyNewExecution(caseNo: string): Promise<void> {
    await this.showNotification({
      title: '📩 ملف تنفيذ جديد',
      body: `تم إضافة ملف تنفيذ رقم ${caseNo}`,
      tag: 'new-execution',
      data: { type: 'execution', caseNo }
    });
  }

  static async notifyNewLawsuit(caseNo: string): Promise<void> {
    await this.showNotification({
      title: '📩 ملف دعوى جديد',
      body: `تم إضافة ملف دعوى رقم ${caseNo}`,
      tag: 'new-lawsuit',
      data: { type: 'lawsuit', caseNo }
    });
  }

  static async notifyUpdate(fileType: string, caseNo: string): Promise<void> {
    await this.showNotification({
      title: '🔄 تحديث',
      body: `تم تحديث ${fileType} رقم ${caseNo}`,
      tag: 'update',
      data: { type: fileType, caseNo }
    });
  }

  static async notifyDeadline(caseNo: string, deadline: string): Promise<void> {
    await this.showNotification({
      title: '⏰ تذكير بموعد',
      body: `موعد قريب لملف ${caseNo}: ${deadline}`,
      tag: 'deadline',
      data: { type: 'deadline', caseNo, deadline },
      requireInteraction: true,
      vibrate: [200, 100, 200]
    });
  }

  /**
   * مسح جميع الإشعارات
   */
  static async clearNotifications(): Promise<void> {
    if (!this.registration) return;

    try {
      const notifications = await this.registration.getNotifications();
      notifications.forEach(notification => notification.close());
      debug.log('[PushNotification] ✅ All notifications cleared');
    } catch (error) {
      debug.error('[PushNotification] ❌ Failed to clear notifications:', error);
    }
  }

  /**
   * الاشتراك في Push Notifications من Server
   * (يتطلب إعداد VAPID Keys في Supabase)
   */
  static async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      debug.error('[PushNotification] Service Worker not registered');
      return null;
    }

    try {
      // يتطلب VAPID Public Key من Server
      // const applicationServerKey = 'YOUR_VAPID_PUBLIC_KEY';
      
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey: applicationServerKey
      });

      debug.log('[PushNotification] ✅ Subscribed to push:', subscription);
      
      // يمكن إرسال الـ subscription إلى Server هنا
      // await fetch('/api/push/subscribe', {
      //   method: 'POST',
      //   body: JSON.stringify(subscription)
      // });

      return subscription;
    } catch (error) {
      debug.error('[PushNotification] ❌ Push subscription failed:', error);
      return null;
    }
  }

  /**
   * إلغاء الاشتراك في Push Notifications
   */
  static async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        debug.log('[PushNotification] ✅ Unsubscribed from push');
        return true;
      }
      
      return false;
    } catch (error) {
      debug.error('[PushNotification] ❌ Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * فحص حالة الاشتراك
   */
  static async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null;

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      debug.error('[PushNotification] ❌ Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * فحص دعم المتصفح
   */
  static isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * تحديث Service Worker
   */
  static async updateServiceWorker(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
      debug.log('[PushNotification] ✅ Service Worker updated');
    } catch (error) {
      debug.error('[PushNotification] ❌ Update failed:', error);
    }
  }
}
