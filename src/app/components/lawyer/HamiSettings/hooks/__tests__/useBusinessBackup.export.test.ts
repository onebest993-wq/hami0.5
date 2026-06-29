import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const confirm = vi.fn();
const prompt = vi.fn();
const buildPayload = vi.fn();
const encrypt = vi.fn();

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: (...args: unknown[]) => confirm(...args),
        prompt: (...args: unknown[]) => prompt(...args),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/app/services/settings/businessBackup', () => ({
    buildBusinessBackupPayload: (...args: unknown[]) => buildPayload(...args),
    encryptBusinessBackupText: (...args: unknown[]) => encrypt(...args),
    decryptBusinessBackupText: vi.fn(),
    importBusinessBackupEntries: vi.fn(),
    parseBusinessBackupFile: vi.fn(),
    EMPTY_BACKUP_PREVIEW: { isLoading: false, keys: 0, bytes: 0, counts: {} },
}));

vi.mock('@/app/services/settings/verifySensitiveSettingsAction', () => ({
    verifySensitiveSettingsAction: vi.fn(() => Promise.resolve(true)),
}));

import { useBusinessBackup } from '@/app/components/lawyer/HamiSettings/hooks/useBusinessBackup';

describe('useBusinessBackup — export', () => {
    let createElementSpy: ReturnType<typeof vi.spyOn> | undefined;
    const anchorClick = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        buildPayload.mockResolvedValue({
            payload: { kind: 'hami-business-backup', version: 2 },
            keys: 2,
            bytes: 100,
            counts: {},
        });
        encrypt.mockResolvedValue({ kind: 'hami-business-backup-encrypted' });
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:test'),
            revokeObjectURL: vi.fn(),
        });
    });

    afterEach(() => {
        createElementSpy?.mockRestore();
        createElementSpy = undefined;
    });

    function stubDownloadAnchor() {
        anchorClick.mockClear();
        const original = document.createElement.bind(document);
        createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'a') {
                return { click: anchorClick, href: '', download: '' } as unknown as HTMLAnchorElement;
            }
            return original(tag);
        });
    }

    it('يرفض التصدير بدون كلمة مرور', async () => {
        confirm.mockResolvedValueOnce(true);
        prompt.mockResolvedValueOnce('');

        const { result } = renderHook(() => useBusinessBackup());
        stubDownloadAnchor();

        await act(async () => {
            await result.current.exportBusinessBackup();
        });

        expect(encrypt).not.toHaveBeenCalled();
        expect(anchorClick).not.toHaveBeenCalled();
    });

    it('يصدّر نسخة محمية عند إدخال كلمة مرور صالحة', async () => {
        confirm.mockResolvedValueOnce(true);
        prompt.mockResolvedValueOnce('secret12');

        const { result } = renderHook(() => useBusinessBackup());
        stubDownloadAnchor();

        await act(async () => {
            await result.current.exportBusinessBackup();
        });

        expect(encrypt).toHaveBeenCalledTimes(1);
        expect(anchorClick).toHaveBeenCalledTimes(1);
    });

    it('لا يصدّر عند إلغاء تأكيد التصدير', async () => {
        confirm.mockResolvedValueOnce(false);

        const { result } = renderHook(() => useBusinessBackup());
        stubDownloadAnchor();

        await act(async () => {
            await result.current.exportBusinessBackup();
        });

        expect(prompt).not.toHaveBeenCalled();
        expect(buildPayload).not.toHaveBeenCalled();
    });
});
