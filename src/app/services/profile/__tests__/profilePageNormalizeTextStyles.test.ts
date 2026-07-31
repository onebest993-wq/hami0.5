import { describe, expect, it } from 'vitest';
import {
    mergeBlockTextStyles,
    normalizeBlockTextStyle,
    normalizeProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';

describe('normalizeBlockTextStyle / lineStyles', () => {
    it('يبقي {} فارغاً ولا يملأه بـ tajawal/base', () => {
        expect(normalizeBlockTextStyle({})).toEqual({});
    });

    it('يمرّر الحقول الموجودة فقط في الترقية الجزئية', () => {
        const next = normalizeBlockTextStyle({ color: '#E6C673', fontFamily: 'literary' });
        expect(next).toEqual({ color: '#E6C673', fontFamily: 'literary' });
        expect(next?.fontSize).toBeUndefined();
    });

    it('mergeBlockTextStyles لا يمسح اللون بـ undefined', () => {
        const merged = mergeBlockTextStyles(
            { color: '#E6C673', fontFamily: 'literary', fontSize: 'lg' },
            { color: undefined, fontWeight: 'bold' },
        );
        expect(merged.color).toBe('#E6C673');
        expect(merged.fontWeight).toBe('bold');
        expect(merged.fontFamily).toBe('literary');
    });

    it('يحافظ على فهارس lineStyles عند وجود placeholders فارغة', () => {
        const next = normalizeProfilePageCustomization({
            customBlocks: [
                {
                    id: 'b1',
                    kind: 'text',
                    title: 'نص',
                    body: 'سطر1\nسطر2\nسطر3',
                    bodyStyle: { fontFamily: 'literary', fontSize: 'lg', color: '#ffffff' },
                    lineStyles: [{}, {}, { color: '#E6C673' }],
                },
            ],
        });
        const block = next.customBlocks[0]!;
        expect(block.lineStyles).toHaveLength(3);
        expect(block.lineStyles?.[0]).toEqual({});
        expect(block.lineStyles?.[1]).toEqual({});
        expect(block.lineStyles?.[2]?.color).toBe('#E6C673');
        expect(block.lineStyles?.[2]?.fontFamily).toBeUndefined();
    });
});
