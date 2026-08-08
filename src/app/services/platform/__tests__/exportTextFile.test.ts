import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => false,
}));

vi.mock('@/app/runtime/nativeBridgeReady', () => ({
    whenNativeBridgeReady: vi.fn(async () => undefined),
}));

import { exportTextFile } from '@/app/services/platform/exportTextFile';

describe('exportTextFile', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('يستخدم تنزيل anchor على الويب عند غياب Web Share', async () => {
        const click = vi.fn();
        const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'a') {
                return { click, href: '', download: '', rel: '' } as unknown as HTMLAnchorElement;
            }
            return document.createElement(tag);
        });
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:test'),
            revokeObjectURL: vi.fn(),
        });

        const result = await exportTextFile({
            filename: 'backup.json',
            content: '{"ok":true}',
        });

        expect(result).toBe('downloaded');
        expect(click).toHaveBeenCalledTimes(1);
        createElementSpy.mockRestore();
    });
});
