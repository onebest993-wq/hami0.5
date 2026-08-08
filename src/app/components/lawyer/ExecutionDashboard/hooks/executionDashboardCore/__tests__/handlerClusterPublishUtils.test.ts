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
});
