import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { HQ_FOLD_IDS, HQ_FOLD_STORAGE_KEY, useHqFold } from '../useHqFold';

describe('useHqFold', () => {
    beforeEach(() => {
        sessionStorage.removeItem(HQ_FOLD_STORAGE_KEY);
    });

    it('يفتح افتراضياً ويحفظ الطي في الجلسة فقط', () => {
        const { result, unmount } = renderHook(() => useHqFold('accounts'));
        expect(result.current[0]).toBe(true);
        act(() => {
            result.current[1]();
        });
        expect(result.current[0]).toBe(false);
        expect(JSON.parse(sessionStorage.getItem(HQ_FOLD_STORAGE_KEY) || '{}')).toEqual({
            accounts: false,
        });
        unmount();
        const remounted = renderHook(() => useHqFold('accounts'));
        expect(remounted.result.current[0]).toBe(false);
    });

    it('يتجاهل مفاتيح غير معروفة وغير布尔 في التخزين', () => {
        expect(HQ_FOLD_IDS).toContain('accounts');
        expect(HQ_FOLD_IDS).toContain('notify');
        sessionStorage.setItem(
            HQ_FOLD_STORAGE_KEY,
            '{"accounts":"nope","__proto__":{"x":1},"queue":true}',
        );
        const accounts = renderHook(() => useHqFold('accounts', true));
        const queue = renderHook(() => useHqFold('queue', false));
        expect(accounts.result.current[0]).toBe(true);
        expect(queue.result.current[0]).toBe(true);
    });
});
