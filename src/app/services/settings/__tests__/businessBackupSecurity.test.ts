import { describe, expect, it } from 'vitest';
import {
    BACKUP_KDF_MAX_ITERATIONS,
    BACKUP_PASSWORD_MAX_LENGTH,
    isAllowedBusinessBackupKey,
    validateBackupPassword,
    validateBusinessBackupImport,
    MAX_BACKUP_IMPORT_KEYS,
} from '@/app/services/settings/businessBackupSecurity';
import {
    decryptBusinessBackupText,
    encryptBusinessBackupText,
} from '@/app/services/settings/businessBackup';
import { STORAGE_KEYS } from '@/app/utils/constants';

describe('businessBackupSecurity', () => {
    it('يسمح بمفاتيح التطبيق المعروفة', () => {
        expect(isAllowedBusinessBackupKey(STORAGE_KEYS.LAWYER_FILES)).toBe(true);
        expect(isAllowedBusinessBackupKey('hami:urgentActions:v1:abc')).toBe(true);
        expect(isAllowedBusinessBackupKey('execution_exec-1_documents')).toBe(true);
        expect(isAllowedBusinessBackupKey('executionFiles:user-1')).toBe(true);
        expect(isAllowedBusinessBackupKey('lawyer_files_active')).toBe(true);
        expect(isAllowedBusinessBackupKey('hami:smartvault:docs:v1')).toBe(true);
        expect(isAllowedBusinessBackupKey('hami:repository:rooms:v1:user-1')).toBe(true);
        expect(isAllowedBusinessBackupKey('hami:smartvault:custom-categories:v1:user-1')).toBe(true);
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

    it('يرفض كلمات المرور المفرطة وسجلات JSON المكررة أو التالفة', () => {
        expect(validateBackupPassword('x'.repeat(BACKUP_PASSWORD_MAX_LENGTH + 1))).toEqual({
            ok: false,
            reason: 'too_long',
        });
        expect(validateBusinessBackupImport([
            [STORAGE_KEYS.LAWYER_NOTES, '[]'],
            [STORAGE_KEYS.LAWYER_NOTES, '[]'],
        ]).ok).toBe(false);
        expect(validateBusinessBackupImport([
            [STORAGE_KEYS.LAWYER_NOTES, 'not-json'],
        ]).ok).toBe(false);
    });

    it('يفك نسخة AES-GCM صحيحة ويرفض معامل KDF عدائياً قبل الاشتقاق', async () => {
        const password = 'correct horse battery';
        const encrypted = await encryptBusinessBackupText('{"safe":true}', password);
        await expect(decryptBusinessBackupText(encrypted, password)).resolves.toBe('{"safe":true}');
        await expect(
            decryptBusinessBackupText(
                {
                    ...encrypted,
                    kdf: {
                        ...encrypted.kdf,
                        iterations: BACKUP_KDF_MAX_ITERATIONS + 1,
                    },
                },
                password,
            ),
        ).rejects.toThrow('iterations');
    });
});
