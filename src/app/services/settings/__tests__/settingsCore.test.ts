import { describe, expect, it } from 'vitest';
import { migrateLawyerSettings } from '../migrate';
import { normalizeBackgroundPreset } from '../backgroundPresets';
import { parseBusinessBackupFile } from '../businessBackup';
import { isNetworkUrlAllowed, isLocalOnlyModeEnabled } from '../localOnlyGuard';
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
        expect(isNetworkUrlAllowed('/assets/chunk.js', settings)).toBe(true);
        expect(isCloudSyncBucketEnabled(settings, 'files')).toBe(false);
    });
});
