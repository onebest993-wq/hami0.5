import { describe, expect, it } from 'vitest';
import {
    formatRelativeTimeAr,
    resolveCloudSyncStatusMessage,
} from '@/app/services/cloudSync/cloudSyncStatusDisplay';

const base = {
    localOnlyMode: false,
    cloudSyncEnabled: true,
    anyBucketEnabled: true,
    cloudBuildEnabled: true,
    signedIn: true,
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null as number | null,
    lastError: null as string | null,
};

describe('cloudSyncStatusDisplay', () => {
    it('formatRelativeTimeAr returns الآن for recent sync', () => {
        const now = Date.now();
        expect(formatRelativeTimeAr(now - 20_000, now)).toBe('الآن');
    });

    it('resolveCloudSyncStatusMessage — local only', () => {
        const msg = resolveCloudSyncStatusMessage({ ...base, localOnlyMode: true });
        expect(msg.text).toContain('قطع الاتصال');
        expect(msg.canSyncNow).toBe(false);
    });

    it('resolveCloudSyncStatusMessage — cloud sync off', () => {
        const msg = resolveCloudSyncStatusMessage({ ...base, cloudSyncEnabled: false });
        expect(msg.text).toContain('معطّلة');
    });

    it('resolveCloudSyncStatusMessage — build flag off', () => {
        const msg = resolveCloudSyncStatusMessage({ ...base, cloudBuildEnabled: false });
        expect(msg.text).toContain('غير متاحة');
    });

    it('resolveCloudSyncStatusMessage — syncing', () => {
        const msg = resolveCloudSyncStatusMessage({ ...base, isSyncing: true });
        expect(msg.text).toBe('جاري المزامنة...');
    });

    it('resolveCloudSyncStatusMessage — last success', () => {
        const now = new Date('2026-06-24T12:00:00Z');
        const msg = resolveCloudSyncStatusMessage({
            ...base,
            lastSyncTime: now.getTime() - 3 * 60_000,
            now,
        });
        expect(msg.text).toContain('آخر مزامنة');
        expect(msg.text).toContain('3 دقيقة');
        expect(msg.canSyncNow).toBe(true);
    });

    it('resolveCloudSyncStatusMessage — error', () => {
        const msg = resolveCloudSyncStatusMessage({ ...base, lastError: 'auth timeout' });
        expect(msg.text).toContain('فشلت');
        expect(msg.canSyncNow).toBe(true);
    });
});
