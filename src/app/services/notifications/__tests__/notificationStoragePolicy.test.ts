import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
    isShellNotificationSupabaseEnabled,
    isShellNotificationKvCacheEnabled,
    shouldPurgeKvBlobAfterBackfill,
    shellNotificationPrimaryStore,
} from '@/app/services/notifications/notificationStoragePolicy';

describe('notificationStoragePolicy', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
        delete process.env.SHELL_NOTIFICATIONS_SUPABASE;
        delete process.env.SHELL_NOTIFICATIONS_KV_CACHE;
        delete process.env.SHELL_NOTIFICATIONS_PURGE_KV_AFTER_BACKFILL;
        vi.stubGlobal('window', undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('Supabase مفعّل افتراضياً عند تهيئة service role', () => {
        expect(isShellNotificationSupabaseEnabled()).toBe(true);
        expect(shellNotificationPrimaryStore()).toBe('supabase');
    });

    it('KV cache معطّل افتراضياً عند Supabase', () => {
        expect(isShellNotificationKvCacheEnabled()).toBe(false);
    });

    it('SHELL_NOTIFICATIONS_KV_CACHE=true يفعّل dual-write', () => {
        vi.stubEnv('SHELL_NOTIFICATIONS_KV_CACHE', 'true');
        expect(isShellNotificationKvCacheEnabled()).toBe(true);
    });

    it('SHELL_NOTIFICATIONS_SUPABASE=false → KV primary', () => {
        vi.stubEnv('SHELL_NOTIFICATIONS_SUPABASE', 'false');
        expect(isShellNotificationSupabaseEnabled()).toBe(false);
        expect(shellNotificationPrimaryStore()).toBe('kv');
        expect(isShellNotificationKvCacheEnabled()).toBe(true);
    });

    it('purge flag', () => {
        expect(shouldPurgeKvBlobAfterBackfill()).toBe(false);
        vi.stubEnv('SHELL_NOTIFICATIONS_PURGE_KV_AFTER_BACKFILL', 'true');
        expect(shouldPurgeKvBlobAfterBackfill()).toBe(true);
    });
});
