/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BFF_AUTH?: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_SHELL_AUTH_OPEN?: string;
    readonly VITE_SECURE_STORE_PLAINTEXT_RECOVERY?: string;
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_ENABLE_CLOUD_SYNC?: string;
    readonly VITE_ENABLE_KV_PROXY?: string;
    readonly VITE_ENABLE_CALENDAR_TOMBSTONES_CLOUD?: string;
    readonly VITE_HAMI_NOTIFICATION_SERVER_SYNC?: string;
    readonly VITE_URGENT_CLOUD_SYNC?: string;
    readonly VITE_COMMUNITY_DEV_OPEN?: string;
    readonly VITE_VAPID_PUBLIC_KEY?: string;
    readonly VITE_PINECONE_API_KEY?: string;
    readonly VITE_TWILIO_ACCOUNT_SID?: string;
    readonly VITE_SOURCEMAP?: string;
    readonly [key: `VITE_FEATURE_${string}`]: string | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
