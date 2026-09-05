import { describe, expect, it } from 'vitest';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';
import {
    mergeRemoteLawyerSettingsPreservingDeviceLock,
    sealCloudSyncedAppData,
    sealCloudSyncedLawyerSettings,
} from '../sealCloudSyncedPreferences';

describe('sealCloudSyncedPreferences', () => {
    it('ينزع شريحة الأمان وأعلام المزامنة وصورة الخلفية من لقطة الإعدادات', () => {
        const sealed = sealCloudSyncedLawyerSettings({
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            security: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.security,
                localOnlyMode: false,
                biometricLock: false,
                screenshotDeterrent: false,
            },
            data: {
                autoSave: true,
                cloudSync: true,
                syncNotes: true,
                syncFiles: true,
                syncExecution: true,
            },
            appearance: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                wallpaper: 'data:image/png;base64,aaa',
            },
        });
        expect(sealed).not.toBeNull();
        expect(sealed?.security).toBeUndefined();
        expect(sealed?.data).toEqual({ autoSave: true });
        expect((sealed?.appearance as { wallpaper?: string }).wallpaper).toBeUndefined();
        expect((sealed?.appearance as { theme?: string }).theme).toBe(
            LAWYER_SETTINGS_V2_DEFAULTS.appearance.theme,
        );
    });

    it('يرفض تطبيق قاطع بعيد فوق قفل الجهاز المحلي', () => {
        const local = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            security: { ...LAWYER_SETTINGS_V2_DEFAULTS.security, localOnlyMode: true },
            data: {
                autoSave: true,
                cloudSync: false,
                syncNotes: false,
                syncFiles: false,
                syncExecution: false,
            },
        };
        const remote = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            security: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.security,
                localOnlyMode: false,
                biometricLock: false,
            },
            data: {
                autoSave: false,
                cloudSync: true,
                syncNotes: true,
                syncFiles: true,
                syncExecution: true,
            },
            appearance: { ...LAWYER_SETTINGS_V2_DEFAULTS.appearance, theme: 'navy' as const },
        };
        const merged = mergeRemoteLawyerSettingsPreservingDeviceLock(remote, local) as typeof local;
        expect(merged.security.localOnlyMode).toBe(true);
        expect(merged.security.biometricLock).toBe(local.security.biometricLock);
        expect(merged.data.cloudSync).toBe(false);
        expect(merged.data.syncNotes).toBe(false);
        expect(merged.data.autoSave).toBe(false);
        expect(merged.appearance.theme).toBe('navy');
    });

    it('يختم كيس app_data دون إسقاط المفاتيح الأخرى', () => {
        const sealed = sealCloudSyncedAppData({
            lawyer_settings: {
                security: { localOnlyMode: false },
                data: { cloudSync: true, autoSave: true },
            },
            lawyer_theme: 'gold',
            syncedAt: 1,
        });
        expect(sealed).toMatchObject({
            lawyer_theme: 'gold',
            syncedAt: 1,
            lawyer_settings: { data: { autoSave: true } },
        });
        expect((sealed?.lawyer_settings as { security?: unknown }).security).toBeUndefined();
        expect(
            (sealed?.lawyer_settings as { data?: { cloudSync?: boolean } }).data?.cloudSync,
        ).toBeUndefined();
    });
});
