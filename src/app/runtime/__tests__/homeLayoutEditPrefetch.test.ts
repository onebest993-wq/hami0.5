import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { prefetchHomeLayoutEditModules } from '@/app/runtime/homeLayoutEditPrefetch';

describe('prefetchHomeLayoutEditModules', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('لا يرمي عند الاستدعاء في بيئة النافذة', () => {
        expect(() => prefetchHomeLayoutEditModules()).not.toThrow();
    });
});
