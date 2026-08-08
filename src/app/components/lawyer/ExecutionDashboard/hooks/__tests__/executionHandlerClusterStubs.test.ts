import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    EXECUTION_HANDLER_CLUSTER_STUBS,
    getExecutionHandlerStubInvocationCountForTests,
    isExecutionHandlerStubLeaf,
    registerExecutionHandlerStubNotifier,
    resetExecutionHandlerStubNotifierForTests,
} from '../executionHandlerClusterStubs';

describe('executionHandlerClusterStubs', () => {
    beforeEach(() => {
        resetExecutionHandlerStubNotifierForTests();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-16T12:00:00.000Z'));
    });

    afterEach(() => {
        resetExecutionHandlerStubNotifierForTests();
        vi.useRealTimers();
    });

    it('marks nested handler leaves as stubs', () => {
        expect(isExecutionHandlerStubLeaf(EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers)).toBe(true);
        expect(
            isExecutionHandlerStubLeaf(
                (EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as { foo?: (...args: unknown[]) => unknown }).foo,
            ),
        ).toBe(true);
    });

    it('exposes dossierFollowupHandlers keys for scopeBagPick', () => {
        const dossier = EXECUTION_HANDLER_CLUSTER_STUBS.dossierFollowupHandlers as Record<string, unknown>;
        expect('handleDossierAction' in dossier).toBe(true);
        expect(typeof dossier.handleDossierAction).toBe('function');
        expect(isExecutionHandlerStubLeaf(dossier.handleDossierAction)).toBe(true);
    });

    it('exposes evictionResidentialGraceHandlers keys via scopeBagPick on handlerLeaf stub', () => {
        const graceStub = EXECUTION_HANDLER_CLUSTER_STUBS.evictionResidentialGraceHandlers;
        expect(typeof graceStub).toBe('function');
        expect(isExecutionHandlerStubLeaf(graceStub)).toBe(true);
        const picked = (graceStub as Record<string, unknown>).openEvictionResidentialGraceModal;
        expect(typeof picked).toBe('function');
        expect(isExecutionHandlerStubLeaf(picked)).toBe(true);
    });

    it('notifies on stub invocation instead of failing silently', () => {
        const notifier = vi.fn();
        registerExecutionHandlerStubNotifier(notifier);

        const payment = EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as (...args: unknown[]) => unknown;
        payment();
        (payment as { save?: () => void }).save?.();

        expect(notifier).toHaveBeenCalled();
        expect(getExecutionHandlerStubInvocationCountForTests()).toBeGreaterThanOrEqual(1);
    });

    it('submit stubs return { ok: false } instead of undefined', () => {
        const dossier = EXECUTION_HANDLER_CLUSTER_STUBS.dossierFollowupHandlers as Record<
            string,
            (...args: unknown[]) => unknown
        >;
        const submit = dossier.otherPartyTabSubmitHandler({ date: '2026-01-01', content: 'x' });
        expect(submit).toEqual({ ok: false });
    });

    it('cools down toast spam across rapid stub calls', () => {
        const notifier = vi.fn();
        registerExecutionHandlerStubNotifier(notifier);

        const payment = EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as () => void;
        payment();
        payment();
        payment();

        expect(notifier).toHaveBeenCalledTimes(1);

        vi.setSystemTime(new Date('2026-07-16T12:00:03.000Z'));
        payment();
        expect(notifier).toHaveBeenCalledTimes(2);
    });
});
