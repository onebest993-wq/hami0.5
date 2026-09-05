import { describe, expect, it } from 'vitest';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionHandlerClusterStubs';
import {
    handlerBagKeyFingerprint,
    mergeHandlerClusterPatch,
} from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/handlerClusterPublishUtils';

describe('handlerClusterPublishUtils', () => {
    it('handlerBagKeyFingerprint يتجاهل تغيّر مراجع الدوال', () => {
        const bagA = { save: () => undefined, open: () => undefined };
        const bagB = { save: () => undefined, open: () => undefined };
        expect(handlerBagKeyFingerprint(bagA)).toEqual(handlerBagKeyFingerprint(bagB));
    });

    it('mergeHandlerClusterPatch لا يُعيد كائناً جديداً عند نفس المراجع', () => {
        const handler = () => undefined;
        const current = { followupSeizureHandlers: { save: handler } };
        const next = { followupSeizureHandlers: { save: handler } };
        expect(mergeHandlerClusterPatch(current, next)).toBe(current);
    });

    it('mergeHandlerClusterPatch ignores handler function identity churn', () => {
        const current = { notesTasksHandlers: { save: () => 'a' } };
        const next = { notesTasksHandlers: { save: () => 'b' } };
        expect(mergeHandlerClusterPatch(current, next)).toBe(current);
    });

    it('mergeHandlerClusterPatch replaces stub leaves with live handlers', () => {
        const stubSave = EXECUTION_HANDLER_CLUSTER_STUBS.dossierFollowupHandlers as Record<
            string,
            unknown
        >;
        const live = () => 'live';
        const current = {
            dossierFollowupHandlers: { handleDossierAction: stubSave.handleDossierAction },
        };
        const next = { dossierFollowupHandlers: { handleDossierAction: live } };
        const merged = mergeHandlerClusterPatch(current, next);
        expect(merged).not.toBe(current);
        expect((merged.dossierFollowupHandlers as { handleDossierAction: unknown }).handleDossierAction).toBe(
            live,
        );
    });

    it('mergeHandlerClusterPatch merges newly added handler keys', () => {
        const save = () => undefined;
        const current = { notesTasksHandlers: { save } };
        const next = { notesTasksHandlers: { save, open: () => undefined } };
        const merged = mergeHandlerClusterPatch(current, next);
        expect(merged).not.toBe(current);
        expect(Object.keys(merged.notesTasksHandlers as object).sort()).toEqual(['open', 'save']);
    });
});
