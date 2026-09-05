import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    EXECUTION_HANDLER_CLUSTER_STUBS,
    getExecutionHandlerStubInvocationCountForTests,
    abortExecutionHandlerLiveWait,
    invokeMaybeStubFunctionOrWait,
    isExecutionHandlerStubLeaf,
    publishExecutionLiveHandlerCluster,
    registerExecutionHandlerStubNotifier,
    registerExecutionHandlerStubTimeoutNotifier,
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

    it('submit stubs return { ok: false } when live handler never arrives', async () => {
        const dossier = EXECUTION_HANDLER_CLUSTER_STUBS.dossierFollowupHandlers as Record<
            string,
            (...args: unknown[]) => unknown
        >;
        const submit = dossier.otherPartyTabSubmitHandler({ date: '2026-01-01', content: 'x' });
        expect(submit).toBeInstanceOf(Promise);
        await vi.advanceTimersByTimeAsync(2_500);
        await expect(submit).resolves.toEqual({ ok: false });
    });

    it('cools down toast spam across rapid stub calls', async () => {
        const notifier = vi.fn();
        registerExecutionHandlerStubNotifier(notifier);

        const payment = EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as () => void;
        payment();
        payment();
        payment();

        expect(notifier).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(2_500);
        vi.setSystemTime(new Date('2026-07-16T12:00:06.000Z'));
        payment();
        expect(notifier).toHaveBeenCalledTimes(2);
    });

    it('ينتظر المعالج الحي ثم ينفّذه بنفس الحجج', async () => {
        const live = vi.fn(() => 'done');
        const payment = EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as {
            save?: (...args: unknown[]) => unknown;
        };
        const pending = payment.save?.('arg-1');
        expect(live).not.toHaveBeenCalled();
        publishExecutionLiveHandlerCluster({
            paymentHandlers: { save: live },
        });
        await expect(pending).resolves.toBe('done');
        expect(live).toHaveBeenCalledWith('arg-1');
    });

    it('لا يُظهر توست المهلة إلا إذا لم يصل المعالج الحي', async () => {
        const hit = vi.fn();
        const timeout = vi.fn();
        registerExecutionHandlerStubNotifier(hit);
        registerExecutionHandlerStubTimeoutNotifier(timeout);

        const payment = EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as () => unknown;
        const pending = payment();
        expect(hit).toHaveBeenCalledTimes(1);
        expect(timeout).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(2_500);
        await pending;
        expect(timeout).toHaveBeenCalledTimes(1);
    });

    it('readLive ينتظر دالة خارج الـ cluster ثم يستدعيها', async () => {
        const live = vi.fn(() => 'from-reader');
        let ready = false;
        const pending = invokeMaybeStubFunctionOrWait('persistExecutionMerge', [{ k: 1 }], {
            coalesce: false,
            readLive: () => (ready ? live : undefined),
        });
        ready = true;
        await vi.advanceTimersByTimeAsync(40);
        await expect(pending).resolves.toBe('from-reader');
        expect(live).toHaveBeenCalledWith({ k: 1 });
    });

    it('إلغاء الانتظار عند تبديل الهوية لا يطلق توست المهلة', async () => {
        const timeout = vi.fn();
        registerExecutionHandlerStubTimeoutNotifier(timeout);
        const payment = EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as () => unknown;
        const pending = payment();
        abortExecutionHandlerLiveWait();
        await expect(pending).resolves.toBeDefined();
        expect(timeout).not.toHaveBeenCalled();
    });

    it('بعد abort ضغطة جديدة تنتظر العنقود الحي ولا ترث نتيجة الإلغاء', async () => {
        const timeout = vi.fn();
        registerExecutionHandlerStubTimeoutNotifier(timeout);
        const payment = EXECUTION_HANDLER_CLUSTER_STUBS.paymentHandlers as (arg: string) => unknown;
        const aborted = payment('old');
        abortExecutionHandlerLiveWait();
        await aborted;
        const live = vi.fn(() => 'fresh');
        const pending = payment('new');
        publishExecutionLiveHandlerCluster({
            paymentHandlers: live,
        });
        await expect(pending).resolves.toBe('fresh');
        expect(live).toHaveBeenCalledWith('new');
        expect(timeout).not.toHaveBeenCalled();
    });
});
