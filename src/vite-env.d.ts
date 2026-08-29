/// <reference types="vite/client" />

declare module 'virtual:hami-critical-native-android';

interface ImportMetaEnv {
    readonly VITE_BFF_AUTH?: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_SHELL_AUTH_OPEN?: string;
    readonly VITE_SECURE_STORE_PLAINTEXT_RECOVERY?: string;
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_ENABLE_SENTRY?: string;
    readonly VITE_PDF_MINIMAL_ASSETS?: string;
    readonly VITE_BUILD_NATIVE?: string;
    readonly VITE_NATIVE_NOTIFICATION_SHEET?: string;
    readonly VITE_ENABLE_CLOUD_SYNC?: string;
    readonly VITE_APP_SUPPORT_EMAIL?: string;
    readonly VITE_SUPPORT_WHATSAPP?: string;
    readonly VITE_ADMIN_MASTER_EMAIL?: string;
    readonly VITE_ENABLE_KV_PROXY?: string;
    readonly VITE_ENABLE_CALENDAR_TOMBSTONES_CLOUD?: string;
    readonly VITE_HAMI_NOTIFICATION_SERVER_SYNC?: string;
    readonly VITE_URGENT_CLOUD_SYNC?: string;
    readonly VITE_COMMUNITY_DEV_OPEN?: string;
    readonly VITE_VAPID_PUBLIC_KEY?: string;
    readonly VITE_SOURCEMAP?: string;
    readonly [key: `VITE_FEATURE_${string}`]: string | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

/**
 * هوية البناء — تُحقن عبر `define` في vite.config.mts من scripts/app-release-identity.mjs.
 * ثوابت لا متغيّرات بيئة: تُستبدل نصّاً وقت البناء فلا وجود لها في وقت التشغيل.
 */
declare const __HAMI_APP_VERSION__: string;
declare const __HAMI_APP_RELEASE__: string;
declare const __HAMI_BUILD_ID__: string;
declare const __HAMI_BUILD_TIME__: string;
declare const __HAMI_CLIENT_PRODUCT__: 'hq' | 'lawyer';
