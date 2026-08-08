import { describe, expect, it, vi } from 'vitest';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from '../../executionHandlerClusterStubs';
import { resolveScopeBagHandler } from '../scopeBagResolveHandler';
import { seizureAssetModalHandlersScopeFragment } from '../scopeBagFragments/executionScopeBagHandlerFragments';

describe('resolveScopeBagHandler', () => {
    it('returns live handler from nested bag before stub', () => {
        const live = vi.fn();
        const stub = EXECUTION_HANDLER_CLUSTER_STUBS.seizureAssetModalHandlers as Record<string, unknown>;
        const resolved = resolveScopeBagHandler(
            [{ focusSeizureMovableInlineCompletion: live }, stub],
            'focusSeizureMovableInlineCompletion',
            'seizureAssetModalHandlers.focusSeizureMovableInlineCompletion',
        );
        resolved('dec-1', 'title');
        expect(live).toHaveBeenCalledWith('dec-1', 'title');
    });

    it('falls back to not-ready handler when key is missing on stub function', () => {
        const stubFn = EXECUTION_HANDLER_CLUSTER_STUBS.seizureAssetModalHandlers;
        const resolved = resolveScopeBagHandler(
            [stubFn],
            'focusSeizureMovableInlineCompletion',
            'seizureAssetModalHandlers.focusSeizureMovableInlineCompletion',
        );
        expect(typeof resolved).toBe('function');
        expect(() => resolved()).not.toThrow();
    });
});

describe('seizureAssetModalHandlersScopeFragment', () => {
    it('provides callable focus handlers when nested source is cluster stub function', () => {
        const fragment = seizureAssetModalHandlersScopeFragment(
            EXECUTION_HANDLER_CLUSTER_STUBS.seizureAssetModalHandlers,
        );
        expect(typeof fragment.focusSeizureMovableInlineCompletion).toBe('function');
        expect(() =>
            (fragment.focusSeizureMovableInlineCompletion as (...args: unknown[]) => unknown)(),
        ).not.toThrow();
    });

    it('prefers top-level live handler over nested stub object', () => {
        const live = vi.fn();
        const fragment = seizureAssetModalHandlersScopeFragment(
            EXECUTION_HANDLER_CLUSTER_STUBS.seizureAssetModalHandlers,
            { focusSeizureMovableInlineCompletion: live },
        );
        (fragment.focusSeizureMovableInlineCompletion as (...args: unknown[]) => unknown)('d1', 't');
        expect(live).toHaveBeenCalledWith('d1', 't');
    });
});
