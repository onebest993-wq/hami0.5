import { describe, expect, it, vi } from 'vitest';

import { buildExecutionDashboardCoreRuntimeVars } from '../buildExecutionDashboardCoreRuntimeVars';

describe('buildExecutionDashboardCoreRuntimeVars', () => {
    it('keeps followup snapshot fields in runtime vars', () => {
        const goFollowupSectionTabByDelta = vi.fn();
        const effectiveFollowupModalTabs = [{ id: 'correspondences', label: 'المخاطبات' }];
        const handleMemoFollowupClick = vi.fn();
        const handleDossierLifecyclePick = vi.fn();
        const handleDossierLifecycleConfirmDetails = vi.fn();
        const runSpecialFollowupSubmit = vi.fn();

        const runtimeVars = buildExecutionDashboardCoreRuntimeVars({
            goFollowupSectionTabByDelta,
            effectiveFollowupModalTabs,
            unifiedModalTab: 'correspondences',
            closeFollowupModalPersisted: vi.fn(),
            runSpecialFollowupSubmit,
            handleMemoFollowupClick,
            handleDossierLifecyclePick,
            handleDossierLifecycleConfirmDetails,
        });

        expect(runtimeVars.goFollowupSectionTabByDelta).toBe(goFollowupSectionTabByDelta);
        expect(runtimeVars.effectiveFollowupModalTabs).toEqual(effectiveFollowupModalTabs);
        expect(runtimeVars.unifiedModalTab).toBe('correspondences');
        expect(runtimeVars.closeFollowupModalPersisted).toBeTypeOf('function');
        expect(runtimeVars.runSpecialFollowupSubmit).toBe(runSpecialFollowupSubmit);
        expect(runtimeVars.handleMemoFollowupClick).toBe(handleMemoFollowupClick);
        expect(runtimeVars.handleDossierLifecyclePick).toBe(handleDossierLifecyclePick);
        expect(runtimeVars.handleDossierLifecycleConfirmDetails).toBe(
            handleDossierLifecycleConfirmDetails,
        );
    });
});
