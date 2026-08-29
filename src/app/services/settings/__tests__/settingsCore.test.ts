import { describe, expect, it } from 'vitest';
import { migrateLawyerSettings } from '../migrate';
import { normalizeBackgroundPreset } from '../backgroundPresets';
import { parseBusinessBackupFile } from '../businessBackup';
import {
    isNetworkUrlAllowed,
    isLocalOnlyModeEnabled,
    runBypassingLocalOnlyForUrl,
    LOCAL_ONLY_BYPASS_PATHS,
} from '../localOnlyGuard';
import { isCloudSyncBucketEnabled } from '../settingsRuntime';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';

describe('migrateLawyerSettings', () => {
    it('normalizes legacy themeMode light to dark', () => {
        const migrated = migrateLawyerSettings({
            version: 2,
            appearance: { themeMode: 'light', theme: 'gold' },
        });
        expect(migrated.appearance.themeMode).toBe('dark');
    });

    it('normalizes legacy themeMode auto to dark', () => {
        const migrated = migrateLawyerSettings({
            version: 2,
            appearance: { themeMode: 'auto', theme: 'navy' },
        });
        expect(migrated.appearance.themeMode).toBe('dark');
    });

    it('يعطّل المزامنة السحابية عند تفعيل قطع الاتصال المحفوظ', () => {
        const migrated = migrateLawyerSettings({
            version: 2,
            appearance: { theme: 'gold' },
            security: { localOnlyMode: true },
            data: {
                cloudSync: true,
                syncNotes: true,
                syncFiles: true,
                syncExecution: true,
            },
        });
        expect(migrated.security.localOnlyMode).toBe(true);
        expect(migrated.data.cloudSync).toBe(false);
        expect(migrated.data.syncNotes).toBe(false);
        expect(migrated.data.syncFiles).toBe(false);
        expect(migrated.data.syncExecution).toBe(false);
    });
});

describe('normalizeBackgroundPreset', () => {
    it('falls back removed presets to moroccan-zellige', () => {
        expect(normalizeBackgroundPreset('islamic-star')).toBe('moroccan-zellige');
        expect(normalizeBackgroundPreset('paint-wash')).toBe('moroccan-zellige');
    });
});

describe('parseBusinessBackupFile', () => {
    it('parses valid v2 backup payload', () => {
        const parsed = parseBusinessBackupFile(
            JSON.stringify({
                kind: 'hami-business-backup',
                version: 2,
                createdAt: '2026-01-01T00:00:00.000Z',
                items: { lawyer_files: '[]' },
            }),
        );
        expect(parsed.version).toBe(2);
        expect(parsed.keys).toContain('lawyer_files');
        expect(parsed.entries).toEqual([['lawyer_files', '[]']]);
    });

    it('rejects invalid backup kind', () => {
        expect(() => parseBusinessBackupFile(JSON.stringify({ kind: 'other' }))).toThrow();
    });
});

describe('localOnlyGuard', () => {
    it('blocks api routes when local only', () => {
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            security: { ...LAWYER_SETTINGS_V2_DEFAULTS.security, localOnlyMode: true },
        };
        expect(isLocalOnlyModeEnabled(settings)).toBe(true);
        expect(isNetworkUrlAllowed('/api/upload', settings)).toBe(false);
        expect(isNetworkUrlAllowed('https://project.supabase.co/rest/v1/cases', settings)).toBe(false);
        expect(isNetworkUrlAllowed('/assets/chunk.js', settings)).toBe(true);
        expect(isNetworkUrlAllowed('/api/auth/logout', settings)).toBe(true);
        expect(isNetworkUrlAllowed('https://test-project-id.supabase.co/auth/v1/logout', settings)).toBe(
            true,
        );
        expect(isNetworkUrlAllowed('https://test-project-id.supabase.co/auth/v1/token', settings)).toBe(
            true,
        );
        expect(isNetworkUrlAllowed('https://test-project-id.supabase.co/auth/v1/user', settings)).toBe(
            true,
        );
        expect(isNetworkUrlAllowed('mailto:office@example.com', settings)).toBe(true);
        expect(isNetworkUrlAllowed('https://test-project-id.supabase.co/rest/v1/cases', settings)).toBe(
            false,
        );
        expect(isCloudSyncBucketEnabled(settings, 'files')).toBe(false);
    });

    it('يحصر استثناء المسح السحابي في عنوانه ولا يفتح الشبكة لطلبات متزامنة', async () => {
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            security: { ...LAWYER_SETTINGS_V2_DEFAULTS.security, localOnlyMode: true },
        };
        await runBypassingLocalOnlyForUrl('/api/settings/wipe', async () => {
            expect(isNetworkUrlAllowed('/api/settings/wipe', settings)).toBe(true);
            expect(isNetworkUrlAllowed('/api/upload', settings)).toBe(false);
            expect(isLocalOnlyModeEnabled(settings)).toBe(true);
        });
        expect(isNetworkUrlAllowed('/api/settings/wipe', settings)).toBe(false);
    });

    it('يرفض استثناء عنوان خارج القائمة حتى لو طُلب التجاوز', async () => {
        await expect(
            runBypassingLocalOnlyForUrl('https://evil.test/api/settings/wipe', async () => true),
        ).rejects.toMatchObject({ name: 'LocalOnlyNetworkError' });
        await expect(
            runBypassingLocalOnlyForUrl('/api/upload', async () => true),
        ).rejects.toMatchObject({ name: 'LocalOnlyNetworkError' });
        expect(LOCAL_ONLY_BYPASS_PATHS).toEqual(['/api/settings/wipe', '/api/account/delete']);
    });
});

describe('isCloudSyncBucketEnabled', () => {
    it('يحترم أعلام السلات عند تفعيل المزامنة', () => {
        const base = {
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
        expect(isCloudSyncBucketEnabled(base, 'notes')).toBe(true);
        expect(isCloudSyncBucketEnabled(base, 'files')).toBe(false);
        expect(isCloudSyncBucketEnabled(base, 'execution')).toBe(true);
    });
});
