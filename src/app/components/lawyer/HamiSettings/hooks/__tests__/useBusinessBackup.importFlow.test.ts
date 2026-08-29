import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const prompt = vi.fn();
const warning = vi.fn();
const success = vi.fn();
const parseBusinessBackupFile = vi.fn();
const decryptBusinessBackupText = vi.fn();
const importBusinessBackupEntries = vi.fn();
const validateBusinessBackupImport = vi.fn();

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: vi.fn(),
        prompt: (...args: unknown[]) => prompt(...args),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: (...args: unknown[]) => success(...args),
        warning: (...args: unknown[]) => warning(...args),
        info: vi.fn(),
    },
}));

vi.mock('@/app/services/settings/businessBackup', () => ({
    buildBusinessBackupPayload: vi.fn(),
    encryptBusinessBackupText: vi.fn(),
    decryptBusinessBackupText: (...args: unknown[]) => decryptBusinessBackupText(...args),
    importBusinessBackupEntries: (...args: unknown[]) => importBusinessBackupEntries(...args),
    parseBusinessBackupFile: (...args: unknown[]) => parseBusinessBackupFile(...args),
    EMPTY_BACKUP_PREVIEW: { isLoading: false, keys: 0, bytes: 0, counts: {} },
}));

vi.mock('@/app/services/settings/businessBackupSecurity', () => ({
    validateBusinessBackupImport: (...args: unknown[]) => validateBusinessBackupImport(...args),
    validateBackupPassword: (password: string) => {
        const trimmed = String(password ?? '').trim();
        if (!trimmed) return { ok: false, reason: 'empty' };
        if (trimmed.length < 12) return { ok: false, reason: 'too_short' };
        return { ok: true };
    },
    BACKUP_PASSWORD_MIN_LENGTH: 12,
    BACKUP_PASSWORD_MAX_LENGTH: 1024,
    MAX_BACKUP_FILE_BYTES: 25_000_000,
    MAX_BACKUP_PLAINTEXT_BYTES: 18_000_000,
}));

vi.mock('@/app/services/settings/verifySensitiveSettingsAction', () => ({
    verifySensitiveSettingsAction: vi.fn(() => Promise.resolve(true)),
    mintSensitiveConfirmChallenge: (base: string) => ({
        confirmPhrase: `${base}-TEST`,
        promptMessage: `اكتب «${base}-TEST»`,
    }),
}));

import { useBusinessBackup } from '@/app/components/lawyer/HamiSettings/hooks/useBusinessBackup';

describe('useBusinessBackup — import flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        validateBusinessBackupImport.mockReturnValue({ ok: true, keyCount: 1 });
        parseBusinessBackupFile.mockReturnValue({
            version: 2,
            createdAt: '2026-07-15T00:00:00.000Z',
            selection: { includeNotes: true },
            range: { from: '', to: '' },
            counts: { notes: 2 },
            keys: 1,
            entries: [['hami_notes_vault_a', '[]']],
            vaultBlobs: [],
        });
        importBusinessBackupEntries.mockResolvedValue(undefined);
    });

    it('يرفض ملفاً يتجاوز الحجم المسموح', async () => {
        const { result } = renderHook(() => useBusinessBackup());

        await act(async () => {
            await result.current.prepareBusinessImport({
                size: 25_000_001,
                name: 'huge.json',
                text: async () => '',
            } as File);
        });

        expect(warning).toHaveBeenCalledWith('ملف النسخة كبير جداً');
        expect(result.current.pendingBusinessImport).toBeNull();
    });

    it('يرفض النسخة المشفرة إذا كانت كلمة المرور خاطئة', async () => {
        prompt.mockResolvedValueOnce('wrong-pass');
        decryptBusinessBackupText.mockRejectedValueOnce(new Error('bad password'));

        const encryptedFile = {
            size: 120,
            name: 'backup.protected.json',
            text: async () =>
                JSON.stringify({
                    kind: 'hami-business-backup-encrypted',
                    version: 1,
                    ciphertext: '...',
                }),
        } as File;

        const { result } = renderHook(() => useBusinessBackup());

        await act(async () => {
            await result.current.prepareBusinessImport(encryptedFile);
        });

        expect(warning).toHaveBeenCalledWith('كلمة المرور غير صحيحة أو الملف تالف');
        expect(result.current.pendingBusinessImport).toBeNull();
    });

    it('يرفض النسخة إذا فشلت المراجعة الأمنية للمفاتيح', async () => {
        validateBusinessBackupImport.mockReturnValueOnce({
            ok: false,
            reason: 'النسخة تحتوي مفاتيح غير مسموحة',
        });

        const { result } = renderHook(() => useBusinessBackup());

        await act(async () => {
            await result.current.prepareBusinessImport({
                size: 120,
                name: 'backup.json',
                text: async () => JSON.stringify({ kind: 'hami-business-backup', version: 2 }),
            } as File);
        });

        expect(warning).toHaveBeenCalledWith('النسخة تحتوي مفاتيح غير مسموحة');
        expect(result.current.pendingBusinessImport).toBeNull();
    });

    it('يجهّز معاينة الاستيراد عند نجاح التحليل والتحقق', async () => {
        const { result } = renderHook(() => useBusinessBackup());

        await act(async () => {
            await result.current.prepareBusinessImport({
                size: 120,
                name: 'backup.json',
                text: async () => JSON.stringify({ kind: 'hami-business-backup', version: 2 }),
            } as File);
        });

        expect(result.current.pendingBusinessImport).toMatchObject({
            fileName: 'backup.json',
            version: 2,
            keys: 1,
        });
    });

    it('ينفّذ الاستيراد الفعلي ويعرض نجاحاً', async () => {
        const { result } = renderHook(() => useBusinessBackup());

        await act(async () => {
            await result.current.importBusinessBackup([['hami_notes_vault_a', '[]']]);
        });

        expect(importBusinessBackupEntries).toHaveBeenCalledWith(
            [['hami_notes_vault_a', '[]']],
            [],
        );
        expect(success).toHaveBeenCalledWith('تم استيراد البيانات');
    });
});
