import { describe, expect, it } from 'vitest';
import { buildHubTileAriaLabel } from '@/app/components/lawyer/dashboard/commandHub/buildHubTileAriaLabel';

describe('buildHubTileAriaLabel', () => {
    it('يُبقي التسمية الافتراضية عند غياب العدّاد', () => {
        expect(buildHubTileAriaLabel('دعاوى', 'فتح الأرشيف')).toBe('دعاوى — فتح الأرشيف');
    });

    it('يُضيف عدّاد المتابعات الإجرائية للوصولية فقط', () => {
        expect(buildHubTileAriaLabel('تنفيذ', 'فتح مخزن الإضابير التنفيذية', 3)).toBe(
            'تنفيذ — 3 متابعات إجرائية — فتح مخزن الإضابير التنفيذية',
        );
        expect(buildHubTileAriaLabel('دعاوى', 'فتح الأرشيف', 1)).toBe(
            'دعاوى — متابعة إجرائية واحدة — فتح الأرشيف',
        );
    });
});
