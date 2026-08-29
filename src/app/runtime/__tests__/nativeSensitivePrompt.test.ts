import { afterEach, describe, expect, it } from 'vitest';
import {
    isNativeSensitivePromptActive,
    resetNativeSensitivePromptForTests,
    withNativeSensitivePrompt,
} from '@/app/runtime/nativeSensitivePrompt';

describe('nativeSensitivePrompt', () => {
    afterEach(() => {
        resetNativeSensitivePromptForTests();
    });

    it('يرفع العمق أثناء الإجراء ويُسقطه بعده', async () => {
        expect(isNativeSensitivePromptActive()).toBe(false);
        await withNativeSensitivePrompt(async () => {
            expect(isNativeSensitivePromptActive()).toBe(true);
            return true;
        });
        expect(isNativeSensitivePromptActive()).toBe(false);
    });

    it('يُسقط العمق حتى عند الخطأ', async () => {
        await expect(
            withNativeSensitivePrompt(async () => {
                throw new Error('fail');
            }),
        ).rejects.toThrow('fail');
        expect(isNativeSensitivePromptActive()).toBe(false);
    });
});
