import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInViewOnce } from '../useInViewOnce';

describe('useInViewOnce', () => {
    it('يعتبر العنصر ظاهراً عند تخطي المراقبة', () => {
        const { result } = renderHook(() => useInViewOnce(true, '240px 0px'));
        expect(result.current.inView).toBe(true);
    });
});
