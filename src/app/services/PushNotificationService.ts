/**
 * PushNotificationService — صلاحيات + Service Worker + إشعارات ويب محلية.
 */
import { debug } from '@/app/utils/debug';
import { HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT } from '@/app/services/notifications/notificationOsTapEvents';
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export class PushNotificationService {
  private static registration: ServiceWorkerRegistration | null = null;
  private static registerInFlight: Promise<ServiceWorkerRegistration | null> | null = null;
  private static isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  private static permissionStatus: NotificationPermission = 'default';
  /** يمنع تكرار تحذير/محاولة الاشتراك عندما SW غير متاح */
  private static pushSubscribeBlocked = false;

  private static blockPushSubscribe(reason: 'dev' | 'no-sw' | 'no-vapid'): null {
    if (this.pushSubscribeBlocked) return null;
    this.pushSubscribeBlocked = true;
    if (reason === 'dev') {
      debug.log('[PushNotification] Push subscription disabled in development (no Service Worker)');
      return null;
    }
    if (reason === 'no-vapid') {
      debug.log('[PushNotification] Push subscription skipped — VITE_VAPID_PUBLIC_KEY not set');
      return null;
    }
    debug.log('[PushNotification] Push subscription unavailable — using local notifications only');
    return null;
  }

  static hasServiceWorkerRegistration(): boolean {
    return this.registration !== null;
  }

  /**
   * يستعير التسجيل الوحيد من `appServiceWorker` بدل إنشاء واحد موازٍ.
   *
   * `register()` بنفس النص والنطاق ليست بلا أثر: تُعيد ضبط `updateViaCache` على
   * قيمة النداء الأخير. فتسجيلٌ ثانٍ بلا `'none'` كان يُعيد سياسة التحديث إلى
   * الافتراضي، أي أن `sw.js` يُقرأ من ذاكرة HTTP ويتأخّر انتشار أي إصلاح.
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (this.registration) return this.registration;
    if (this.registerInFlight) return this.registerInFlight;

    this.registerInFlight = (async () => {
      try {
        const { registerAppServiceWorker } = await import('@/app/runtime/appServiceWorker');
        const reg = await registerAppServiceWorker();
        this.registration = reg;
        return reg;
      } catch (error) {
        debug.warn('[PushNotification] Service Worker registration failed:', error);
        return null;
      } finally {
        this.registerInFlight = null;
      }
    })();

    return this.registerInFlight;
  }

  /**
   * تهيئة الخدمة
   */
  static async initialize(): Promise<boolean> {
    if (!('Notification' in window)) {
      debug.warn('[PushNotification] Notifications API not supported');
      return false;
    }

    try {
      this.permissionStatus = Notification.permission as NotificationPermission;
      const reg = await this.registerServiceWorker();
      if (reg) {
        debug.log('[PushNotification] ✅ Initialized (with Service Worker)');
      } else {
        debug.log('[PushNotification] ✅ Initialized (without Service Worker)');
      }
      return true;
    } catch (error) {
      debug.error('[PushNotification] ❌ Initialization failed:', error);
      return false;
    }
  }

  /**
   * طلب صلاحية الإشعارات — يُستدعى فقط من إيماءة مستخدم (زر/تبديل في الإعدادات).
   * استدعاء تلقائي عند التحميل يُطلق [Violation] في Chrome.
   */
  static async requestPermission(options?: { fromUserGesture?: boolean }): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      debug.warn('[PushNotification] Notifications not supported');
      return 'denied';
    }

    const current = Notification.permission as NotificationPermission;
    if (current !== 'default') {
      this.permissionStatus = current;
      return current;
    }

    if (!options?.fromUserGesture) {
      debug.log('[PushNotification] Permission prompt skipped — requires user gesture');
      return 'default';
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
      const notification = new Notification(options.title, {
        body: options.body || '',
        icon: options.icon || '/icon-192.png',
        tag: options.tag || 'default',
        data: options.data || {},
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      notification.onclick = () => {
        try {
          window.focus();
        } catch {
          /* ignore */
        }
        window.dispatchEvent(
          new CustomEvent(HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT, {
            detail: { data: options.data || {} },
          }),
        );
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);

      debug.log('[PushNotification] ✅ Notification shown:', options.title);
    } catch (error) {
      debug.error('[PushNotification] ❌ Failed to show notification:', error);
    }
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
    if (this.pushSubscribeBlocked) return null;
    if (import.meta.env.DEV) {
      return this.blockPushSubscribe('dev');
    }

    if (!this.registration) {
      await this.registerServiceWorker();
    }

    if (!this.registration) {
      return this.blockPushSubscribe('no-sw');
    }

    try {
      const existing = await this.registration.pushManager.getSubscription();
      if (existing) return existing;

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!vapidPublicKey?.trim()) {
        return this.blockPushSubscribe('no-vapid');
      }

      const rawKey = urlBase64ToUint8Array(vapidPublicKey.trim());
      const key = new Uint8Array(rawKey);

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });

      debug.log('[PushNotification] ✅ Subscribed to push');
      return subscription;
    } catch (error) {
      debug.warn('[PushNotification] Push subscription failed:', error);
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
