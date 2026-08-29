import { describe, expect, it } from 'vitest';
import { resolveGlobalSearchSheetKeyboardStyle } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayLayout';

describe('globalSearchOverlayLayout', () => {
    it('يرفع ورقة البحث فوق IME بـ marginBottom فقط', () => {
        expect(resolveGlobalSearchSheetKeyboardStyle(0)).toEqual({});
        expect(resolveGlobalSearchSheetKeyboardStyle(280)).toEqual({ marginBottom: 280 });
    });
});
