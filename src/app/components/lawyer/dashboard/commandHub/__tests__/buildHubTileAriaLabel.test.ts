import { describe, expect, it } from 'vitest';
import { buildHubTileAriaLabel } from '@/app/components/lawyer/dashboard/commandHub/buildHubTileAriaLabel';

describe('buildHubTileAriaLabel', () => {
    it('يركب تسمية البلاطة مع الإجراء', () => {
        expect(buildHubTileAriaLabel('دعاوى', 'فتح الأرشيف')).toBe('دعاوى — فتح الأرشيف');
        expect(buildHubTileAriaLabel('تنفيذ', 'فتح مخزن الإضابير التنفيذية')).toBe(
            'تنفيذ — فتح مخزن الإضابير التنفيذية',
        );
    });
});
