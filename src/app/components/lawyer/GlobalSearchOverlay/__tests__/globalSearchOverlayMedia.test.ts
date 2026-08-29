import { describe, expect, it } from 'vitest';
import { GLOBAL_SEARCH_CARD_MEDIA_QUERY } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayMedia';

describe('globalSearchOverlayMedia', () => {
    it('يعرّف استعلام بطاقة اللوحي بارتفاع أدنى (لا عرض 640 وحده)', () => {
        expect(GLOBAL_SEARCH_CARD_MEDIA_QUERY).toContain('min-width: 768px');
        expect(GLOBAL_SEARCH_CARD_MEDIA_QUERY).toContain('min-height: 560px');
        expect(GLOBAL_SEARCH_CARD_MEDIA_QUERY).not.toContain('min-width: 640px');
    });
});
