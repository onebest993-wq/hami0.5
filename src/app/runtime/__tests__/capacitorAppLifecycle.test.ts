import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    consumeNativeBackForTests,
    registerNativeBackHandler,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/capacitorAppLifecycle';

describe('registerNativeBackHandler LIFO stack', () => {
    beforeEach(() => {
        resetNativeBackHandlersForTests();
    });

    it('يستهلك آخر معالج مسجّل أولاً', () => {
        const outer = vi.fn(() => false);
        const inner = vi.fn(() => true);
        registerNativeBackHandler(outer);
        registerNativeBackHandler(inner);

        expect(consumeNativeBackForTests()).toBe(true);
        expect(inner).toHaveBeenCalledTimes(1);
        expect(outer).not.toHaveBeenCalled();
    });

    it('ينتقل للمعالج الأقدم عند فشل الأحدث', () => {
        const outer = vi.fn(() => true);
        const inner = vi.fn(() => false);
        registerNativeBackHandler(outer);
        registerNativeBackHandler(inner);

        expect(consumeNativeBackForTests()).toBe(true);
        expect(inner).toHaveBeenCalledTimes(1);
        expect(outer).toHaveBeenCalledTimes(1);
    });

    it('يُزيل المعالج عند إلغاء التسجيل', () => {
        const handler = vi.fn(() => true);
        const unregister = registerNativeBackHandler(handler);
        unregister();
        expect(consumeNativeBackForTests()).toBe(false);
        expect(handler).not.toHaveBeenCalled();
    });
});
