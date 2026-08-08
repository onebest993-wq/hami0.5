import { describe, expect, it } from 'vitest';
import {
    GLOBAL_SEARCH_RESULTS_MAX_HEIGHT,
    resolveGlobalSearchSheetStyle,
} from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayLayout';

describe('globalSearchOverlayLayout', () => {
    it('يُبقي ارتفاع النتائج ثابتاً', () => {
        expect(GLOBAL_SEARCH_RESULTS_MAX_HEIGHT).toBe('min(calc(92dvh - 220px), 680px)');
    });

    it('يرفع الورقة بـ marginBottom فقط — بلا padding داخلي', () => {
        expect(resolveGlobalSearchSheetStyle(0)).toEqual({});
        expect(resolveGlobalSearchSheetStyle(280)).toEqual({
            marginBottom: 280,
            maxHeight:
                'min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 280px))',
        });
    });
});
