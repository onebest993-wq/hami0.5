import { describe, expect, it } from 'vitest';
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
        const current = { seizureAssetModalHandlers: { save: handler } };
        const next = { seizureAssetModalHandlers: { save: handler } };
        expect(mergeHandlerClusterPatch(current, next)).toBe(current);
    });

    it('mergeHandlerClusterPatch ignores handler function identity churn', () => {
        const current = { notesTasksHandlers: { save: () => 'a' } };
        const next = { notesTasksHandlers: { save: () => 'b' } };
        expect(mergeHandlerClusterPatch(current, next)).toBe(current);
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
