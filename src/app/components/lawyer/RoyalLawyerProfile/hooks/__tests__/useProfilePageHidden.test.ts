import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfilePageHidden } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfilePageHidden';

describe('useProfilePageHidden', () => {
    it('يعكس document.hidden', () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        const { result } = renderHook(() => useProfilePageHidden());
        expect(result.current).toBe(false);
    });
});
