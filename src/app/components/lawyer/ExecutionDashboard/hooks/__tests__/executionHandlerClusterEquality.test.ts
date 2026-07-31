import { describe, expect, it } from 'vitest';
import {
    areHandlerClusterValuesEqual,
    hasHandlerClusterDelta,
    mergeDossierFollowupHandlers,
} from '../executionHandlerClusterEquality';

describe('executionHandlerClusterEquality', () => {
    it('compares nested plain objects deeply', () => {
        expect(areHandlerClusterValuesEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(
            true,
        );
        expect(areHandlerClusterValuesEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('detects handler cluster deltas', () => {
        expect(hasHandlerClusterDelta({ x: 1 }, { x: 1 })).toBe(false);
        expect(hasHandlerClusterDelta({ x: 1 }, { x: 2 })).toBe(true);
        expect(hasHandlerClusterDelta({ x: 1 }, { x: 1, y: 2 })).toBe(true);
        expect(hasHandlerClusterDelta({ a: 1 }, { b: 1 })).toBe(true);
    });

    it('Object.is fast-path: identical leaf refs are no-delta', () => {
        const bag = { nested: { n: 1 } };
        const fn = () => undefined;
        expect(
            hasHandlerClusterDelta(
                { bag, onSave: fn },
                { bag, onSave: fn },
            ),
        ).toBe(false);
    });

    it('ignores function identity when comparing handler clusters', () => {
        expect(
            hasHandlerClusterDelta(
                { onSave: () => undefined },
                { onSave: () => undefined },
            ),
        ).toBe(false);
        expect(
            hasHandlerClusterDelta(
                { notesTasksHandlers: { save: () => undefined } },
                { notesTasksHandlers: { save: () => undefined } },
            ),
        ).toBe(false);
    });

    it('detects stub→real function identity change', async () => {
        const { EXECUTION_HANDLER_CLUSTER_STUBS } = await import('../executionHandlerClusterStubs');
        const stub = EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as (...args: unknown[]) => unknown;
        const real = () => undefined;
        expect(hasHandlerClusterDelta({ paymentHandlers: stub }, { paymentHandlers: real })).toBe(true);
        expect(
            areHandlerClusterValuesEqual(
                { save: stub },
                { save: real },
            ),
        ).toBe(false);
    });

    it('merges dossierFollowupHandlers shallowly', () => {
        expect(
            mergeDossierFollowupHandlers(
                { dossierFollowupHandlers: { a: 1 } },
                { dossierFollowupHandlers: { b: 2 } },
            ),
        ).toEqual({ a: 1, b: 2 });
    });
});
