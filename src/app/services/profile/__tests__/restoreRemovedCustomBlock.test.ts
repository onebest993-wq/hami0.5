import { describe, expect, it } from 'vitest';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageDefaults';
import { restoreRemovedCustomBlock } from '@/app/services/profile/restoreRemovedCustomBlock';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageTypes';

function textBlock(id: string, body: string): ProfileCustomBlock {
    return {
        id,
        kind: 'text',
        title: id,
        shape: 'rounded',
        width: 'full',
        minHeightPx: 120,
        body,
        order: 0,
    };
}

describe('restoreRemovedCustomBlock', () => {
    it('يعيد الكتلة المحذوفة ويحافظ على تعديلات المسودة الحالية', () => {
        const a = textBlock('a', 'A');
        const b = textBlock('b', 'B');
        const base = defaultProfilePageCustomization();
        const previous = {
            ...base,
            customBlocks: [a, b],
            appearance: { ...base.appearance, accentColor: 'gold' as const },
        };
        const current = {
            ...base,
            customBlocks: [{ ...b, body: 'B-edited' }],
            appearance: { ...base.appearance, accentColor: 'emerald' as const },
        };

        const restored = restoreRemovedCustomBlock(current, previous, 'a');
        expect(restored.appearance.accentColor).toBe('emerald');
        expect(restored.customBlocks.map((block) => block.id)).toEqual(['a', 'b']);
        expect(restored.customBlocks[1]?.body).toBe('B-edited');
    });

    it('لا يضاعف الكتلة إن وُجدت مسبقاً', () => {
        const a = textBlock('a', 'A');
        const current = {
            ...defaultProfilePageCustomization(),
            customBlocks: [a],
        };
        expect(restoreRemovedCustomBlock(current, current, 'a')).toBe(current);
    });
});
