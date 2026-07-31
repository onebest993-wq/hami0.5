import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHomeHubPanelMount } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubPanelMount';

describe('useHomeHubPanelMount', () => {
    it('يبقى false حتى أول تفعيل', () => {
        const { result, rerender } = renderHook(({ active }) => useHomeHubPanelMount(active), {
            initialProps: { active: false },
        });
        expect(result.current).toBe(false);
        rerender({ active: true });
        expect(result.current).toBe(true);
        rerender({ active: false });
        expect(result.current).toBe(true);
    });

    it('true فوراً عند تفعيل أولي', () => {
        const { result } = renderHook(() => useHomeHubPanelMount(true));
        expect(result.current).toBe(true);
    });

    it('true فوراً عند eager حتى لو اللوحة غير نشطة', () => {
        const { result } = renderHook(() => useHomeHubPanelMount(false, true));
        expect(result.current).toBe(true);
    });
});
