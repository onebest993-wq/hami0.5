import { describe, expect, it } from 'vitest';
import { buildPhoneBodySecondaryScope } from '../buildPhoneBodySecondaryScope';

describe('buildPhoneBodySecondaryScope', () => {
    it('picks only secondary-section keys from phone body scope bag', () => {
        const scope = buildPhoneBodySecondaryScope({
            dockPinnedNotes: [{ id: 'n1' }],
            mergedTimelineEvents: [],
            showToast: () => undefined,
            unusedPhoneBodyKey: 'drop-me',
        });

        expect(scope.dockPinnedNotes).toEqual([{ id: 'n1' }]);
        expect((scope as Record<string, unknown>).unusedPhoneBodyKey).toBeUndefined();
    });
});
