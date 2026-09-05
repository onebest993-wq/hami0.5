import { describe, expect, it, vi, beforeEach } from 'vitest';

const isLitePerformanceActive = vi.hoisted(() => vi.fn(() => false));
const bridges = vi.hoisted(() => ({
    prefetchExecutionHandlerClusterDossierSupportBridge: vi.fn(),
    prefetchExecutionHandlerClusterCoerciveHeavyBridge: vi.fn(),
    prefetchExecutionHandlerClusterFollowupAdminSpecialBridge: vi.fn(),
    prefetchExecutionHandlerClusterFollowupDossierControlsBridge: vi.fn(),
    prefetchExecutionHandlerClusterFollowupOtherPartyDebtorBridge: vi.fn(),
    prefetchExecutionHandlerClusterFollowupOtherPartyBridge: vi.fn(),
    prefetchExecutionHandlerClusterLightBridge: vi.fn(),
    prefetchExecutionHandlerClusterSeizureHeavyBridge: vi.fn(),
    prefetchExecutionHandlerClusterPartyDeathBridge: vi.fn(),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => isLitePerformanceActive(),
}));

vi.mock('../executionDashboardHandlerClusterBridgeLazy', () => bridges);

import { prefetchExecutionCoreHandlers } from '../executionCoreHandlersPrefetch';

describe('prefetchExecutionCoreHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isLitePerformanceActive.mockReturnValue(false);
    });

    it('يسخّن جسر الحجز داخل الإضبارة حتى على الوضع الخفيف', () => {
        isLitePerformanceActive.mockReturnValue(true);
        prefetchExecutionCoreHandlers('seizure-requests');
        expect(bridges.prefetchExecutionHandlerClusterSeizureHeavyBridge).toHaveBeenCalledTimes(1);
        expect(bridges.prefetchExecutionHandlerClusterLightBridge).not.toHaveBeenCalled();
    });

    it('يلغي التسخين الخامل على الوضع الخفيف فقط', () => {
        isLitePerformanceActive.mockReturnValue(true);
        prefetchExecutionCoreHandlers('light', { background: true });
        prefetchExecutionCoreHandlers('dossier-support', { background: true });
        expect(bridges.prefetchExecutionHandlerClusterLightBridge).not.toHaveBeenCalled();
        expect(bridges.prefetchExecutionHandlerClusterDossierSupportBridge).not.toHaveBeenCalled();
    });

    it('الخمول على جهاز غير خفيف يحمّل الجسر', () => {
        prefetchExecutionCoreHandlers('light', { background: true });
        expect(bridges.prefetchExecutionHandlerClusterLightBridge).toHaveBeenCalledTimes(1);
    });

    it('نية coercive تحمّل الجسر الثقيل', () => {
        prefetchExecutionCoreHandlers('coercive');
        expect(bridges.prefetchExecutionHandlerClusterCoerciveHeavyBridge).toHaveBeenCalledTimes(1);
    });

    it('followup-other-party يسخّن جسري المدين والدائن', () => {
        prefetchExecutionCoreHandlers('followup-other-party');
        expect(bridges.prefetchExecutionHandlerClusterFollowupOtherPartyDebtorBridge).toHaveBeenCalledTimes(
            1,
        );
        expect(bridges.prefetchExecutionHandlerClusterFollowupOtherPartyBridge).toHaveBeenCalledTimes(1);
    });

    it('party-death يسخّن جسر الوفاة', () => {
        prefetchExecutionCoreHandlers('party-death');
        expect(bridges.prefetchExecutionHandlerClusterPartyDeathBridge).toHaveBeenCalledTimes(1);
    });
});
