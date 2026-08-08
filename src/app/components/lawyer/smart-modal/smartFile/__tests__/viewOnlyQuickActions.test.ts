import { describe, expect, it } from 'vitest';
import { resolveViewOnlyQuickActionIds } from '../viewOnlyQuickActions';

describe('resolveViewOnlyQuickActionIds', () => {
    it('returns only action ids that have timeline content', () => {
        const ids = resolveViewOnlyQuickActionIds([
            { id: '1', type: 'note', date: '2026-01-01', title: 'ملاحظة' },
            { id: '2', type: 'appointment', date: '2026-01-02', title: 'موعد' },
        ]);
        expect(ids).toEqual(['appointment', 'note']);
    });

    it('ignores deleted events', () => {
        const ids = resolveViewOnlyQuickActionIds([
            { id: '1', type: 'document', date: '2026-01-01', title: 'مستند', isDeleted: true },
        ]);
        expect(ids).toEqual([]);
    });
});
