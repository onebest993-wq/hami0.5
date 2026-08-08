import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHomeHubSecretaryNudgesSettled } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubSecretaryNudgesSettled';
import type { SparkNudge } from '@/app/spark/types';

function nudge(id: string): SparkNudge {
    return {
        id,
        kind: 'home.procedural_attention',
        title: id,
        targetFileId: id,
    } as SparkNudge;
}

describe('useHomeHubSecretaryNudgesSettled', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يُجمّع دفعات سريعة في تحديث واحد', () => {
        const { result, rerender } = renderHook(
            ({ items }) => useHomeHubSecretaryNudgesSettled(items),
            { initialProps: { items: [nudge('a'), nudge('b')] } },
        );

        expect(result.current).toHaveLength(2);

        rerender({ items: [nudge('a'), nudge('b'), nudge('c')] });
        expect(result.current).toHaveLength(2);

        act(() => {
            vi.advanceTimersByTime(120);
        });

        expect(result.current).toHaveLength(3);
    });
});
