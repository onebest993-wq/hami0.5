import { describe, expect, it } from 'vitest';
import {
    isAllowedBusinessBackupKey,
    validateBusinessBackupImport,
    MAX_BACKUP_IMPORT_KEYS,
} from '@/app/services/settings/businessBackupSecurity';
import { STORAGE_KEYS } from '@/app/utils/constants';

describe('businessBackupSecurity', () => {
    it('يسمح بمفاتيح التطبيق المعروفة', () => {
        expect(isAllowedBusinessBackupKey(STORAGE_KEYS.LAWYER_FILES)).toBe(true);
        expect(isAllowedBusinessBackupKey('hami:urgentActions:v1:abc')).toBe(true);
    });

    it('يرفض مفاتيح غريبة', () => {
        expect(isAllowedBusinessBackupKey('__proto__')).toBe(false);
        expect(isAllowedBusinessBackupKey('evil:payload')).toBe(false);
    });

    it('يرفض مفاتيح الإعدادات والمظهر — لا تُستورد عبر نسخة الأعمال', () => {
        expect(isAllowedBusinessBackupKey(STORAGE_KEYS.LAWYER_SETTINGS)).toBe(false);
        expect(isAllowedBusinessBackupKey('lawyer_theme')).toBe(false);
        expect(isAllowedBusinessBackupKey('lawyer_shape')).toBe(false);
        expect(isAllowedBusinessBackupKey('lawyer_wallpaper')).toBe(false);
    });

    it('يسمح بملفات المحامي فقط من lawyer_*', () => {
        expect(isAllowedBusinessBackupKey(STORAGE_KEYS.LAWYER_FILES)).toBe(true);
        expect(isAllowedBusinessBackupKey(STORAGE_KEYS.LAWYER_NOTES)).toBe(true);
        expect(isAllowedBusinessBackupKey('lawyer_settings')).toBe(false);
    });

    it('يرفض استيراداً يتجاوز عدد المفاتيح', () => {
        const entries = Array.from({ length: MAX_BACKUP_IMPORT_KEYS + 1 }, (_, i) => [
            `hami_notes_vault_${i}`,
            '[]',
        ]) as Array<[string, string]>;
        const result = validateBusinessBackupImport(entries);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toContain('يتجاوز');
    });

    it('يقبل نسخة صالحة صغيرة', () => {
        const result = validateBusinessBackupImport([
            [STORAGE_KEYS.LAWYER_FILES, '[]'],
            [STORAGE_KEYS.LAWYER_NOTES, '[]'],
        ]);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.keyCount).toBe(2);
    });
});
