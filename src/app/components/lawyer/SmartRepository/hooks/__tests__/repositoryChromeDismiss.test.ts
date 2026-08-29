import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    dismissAllRepositoryChrome,
    dismissTopRepositoryChrome,
    registerRepositoryChromeDismiss,
    resetRepositoryChromeDismissStackForTests,
} from '../repositoryChromeDismiss';

describe('repositoryChromeDismiss', () => {
    beforeEach(() => {
        resetRepositoryChromeDismissStackForTests();
    });

    it('يعيد false عند عدم وجود طبقات', () => {
        expect(dismissTopRepositoryChrome()).toBe(false);
    });

    it('يغلق الأعلى أولاً ويُبقي الأدنى', () => {
        const lower = vi.fn(() => true);
        const upper = vi.fn(() => true);
        registerRepositoryChromeDismiss(lower);
        registerRepositoryChromeDismiss(upper);

        expect(dismissTopRepositoryChrome()).toBe(true);
        expect(upper).toHaveBeenCalledTimes(1);
        expect(lower).not.toHaveBeenCalled();

        expect(dismissTopRepositoryChrome()).toBe(true);
        expect(lower).toHaveBeenCalledTimes(1);
    });

    it('يتجاوز طبقة أعادت false ثم يزيل الناجحة', () => {
        const skipped = vi.fn(() => false);
        const next = vi.fn(() => true);
        registerRepositoryChromeDismiss(next);
        registerRepositoryChromeDismiss(skipped);

        expect(dismissTopRepositoryChrome()).toBe(true);
        expect(skipped).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('يلغي التسجيل فلا تُستدعى بعد الإزالة', () => {
        const dismiss = vi.fn(() => true);
        const unreg = registerRepositoryChromeDismiss(dismiss);
        unreg();
        expect(dismissTopRepositoryChrome()).toBe(false);
        expect(dismiss).not.toHaveBeenCalled();
    });

    it('dismissAll يستدعي كل الطبقات من الأعلى', () => {
        const a = vi.fn(() => true);
        const b = vi.fn(() => true);
        registerRepositoryChromeDismiss(a);
        registerRepositoryChromeDismiss(b);
        dismissAllRepositoryChrome();
        expect(b).toHaveBeenCalledTimes(1);
        expect(a).toHaveBeenCalledTimes(1);
        expect(b.mock.invocationCallOrder[0]).toBeLessThan(a.mock.invocationCallOrder[0]);
    });
});
