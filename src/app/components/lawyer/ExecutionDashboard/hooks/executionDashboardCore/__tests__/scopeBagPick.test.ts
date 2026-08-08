import { describe, expect, it } from 'vitest';
import {
    EXECUTION_HANDLER_CLUSTER_STUBS,
    isExecutionHandlerStubLeaf,
} from '../../executionHandlerClusterStubs';
import { scopeBagPick } from '../scopeBagPick';

describe('scopeBagPick', () => {
    it('flattens handlerLeaf group stubs into callable scope keys', () => {
        const picked = scopeBagPick(
            EXECUTION_HANDLER_CLUSTER_STUBS.evictionResidentialGraceHandlers as Record<string, unknown>,
            ['openEvictionResidentialGraceModal', 'completeEvictionResidentialGrace'],
        );

        expect(typeof picked.openEvictionResidentialGraceModal).toBe('function');
        expect(typeof picked.completeEvictionResidentialGrace).toBe('function');
        expect(isExecutionHandlerStubLeaf(picked.openEvictionResidentialGraceModal)).toBe(true);
    });

    it('keeps ordinary object pick behavior', () => {
        const source = { a: 1, b: 2 };
        expect(scopeBagPick(source, ['a', 'c'])).toEqual({ a: 1 });
    });
});
