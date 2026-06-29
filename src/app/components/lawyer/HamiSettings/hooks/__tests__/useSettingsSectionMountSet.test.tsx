import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSettingsSectionMountSet } from '../useSettingsSectionMountSet';

describe('useSettingsSectionMountSet', () => {
    it('يُبقي الأقسام المُزارَة mounted بعد مغادرتها', () => {
        const { result, rerender } = renderHook(({ section }) => useSettingsSectionMountSet(section), {
            initialProps: { section: 'appearance' as const },
        });

        expect(result.current.has('appearance')).toBe(true);
        expect(result.current.size).toBe(1);

        rerender({ section: 'data' });
        expect(result.current.has('data')).toBe(true);
        expect(result.current.has('appearance')).toBe(true);
        expect(result.current.size).toBe(2);

        rerender({ section: 'security' });
        expect(result.current.has('security')).toBe(true);
        expect(result.current.has('appearance')).toBe(true);
        expect(result.current.size).toBe(3);
    });
});
