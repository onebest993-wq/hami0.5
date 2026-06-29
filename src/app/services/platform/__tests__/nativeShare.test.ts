import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareNative } from '../nativeShare';

describe('shareNative', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('uses navigator.share when available', async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { share, clipboard: undefined });

        await expect(shareNative({ title: 'عنوان', text: 'نص' })).resolves.toBe('shared');
        expect(share).toHaveBeenCalledWith({ title: 'عنوان', text: 'نص', url: undefined });
    });

    it('falls back to clipboard when share is unavailable', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });

        await expect(shareNative({ text: 'بطاقة' })).resolves.toBe('copied');
        expect(writeText).toHaveBeenCalledWith('بطاقة');
    });

    it('returns cancelled when user dismisses web share', async () => {
        const share = vi.fn().mockRejectedValue(Object.assign(new Error('abort'), { name: 'AbortError' }));
        vi.stubGlobal('navigator', { share });

        await expect(shareNative({ text: 'نص' })).resolves.toBe('cancelled');
    });

    it('returns unavailable when no channel exists', async () => {
        vi.stubGlobal('navigator', {});

        await expect(shareNative({ text: 'نص' })).resolves.toBe('unavailable');
    });
});
