import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettingsState } from '../types';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';
import { isCloudSyncBucketEnabled, isLiveCloudSyncBucketEnabled } from '../cloudSyncBucket';

const mocks = vi.hoisted(() => ({
    snap: null as AppSettingsState | null,
}));

vi.mock('../settingsSnapshot', () => ({
    getLawyerSettingsSnapshot: () => mocks.snap,
}));

function syncedSettings(): AppSettingsState {
    return {
        ...LAWYER_SETTINGS_V2_DEFAULTS,
        security: { ...LAWYER_SETTINGS_V2_DEFAULTS.security, localOnlyMode: false },
        data: {
            ...LAWYER_SETTINGS_V2_DEFAULTS.data,
            cloudSync: true,
            syncNotes: true,
            syncFiles: false,
            syncExecution: true,
        },
    };
}

describe('isLiveCloudSyncBucketEnabled', () => {
    beforeEach(() => {
        mocks.snap = syncedSettings();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('الإعدادات وحدها لا تفتح الشبكة بلا بيئة المزامنة', () => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'false');
        expect(isCloudSyncBucketEnabled(syncedSettings(), 'execution')).toBe(true);
        expect(isLiveCloudSyncBucketEnabled('execution')).toBe(false);
        expect(isLiveCloudSyncBucketEnabled('notes')).toBe(false);
    });

    it('يفتح السلة الحيّة مع البيئة والإعدادات', () => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        expect(isLiveCloudSyncBucketEnabled('execution')).toBe(true);
        expect(isLiveCloudSyncBucketEnabled('notes')).toBe(true);
        expect(isLiveCloudSyncBucketEnabled('files')).toBe(false);
    });
});
