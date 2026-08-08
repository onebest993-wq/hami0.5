import { describe, expect, it } from 'vitest';
import { resolveCriminalDashboardNestedNav } from '../resolveCriminalDashboardNestedNav';

const base = {
    confirmAction: null,
    cassationResultContext: null,
    cassationAppealModal: null,
    isStageFinalDecisionOpen: false,
    verdictCassationFilingCard: null,
    trialSessionAddModalOpen: false,
    quickFinalizeRequest: null,
    requestMarginModalOpen: false,
    isRequestsModalOpen: false,
    linkedTimelineFromProcedural: null,
    isStatementModalOpen: false,
    isTrialDepositionModalOpen: false,
    isOtherEvidenceFormOpen: false,
    isTrashModalOpen: false,
    isReopenCaseOpen: false,
    isSendToCassationOpen: false,
    isMergeCasesOpen: false,
    isStageCloserOpen: false,
    isLegalEditOpen: false,
    isInvestigationDecisionOpen: false,
    isSeveranceOpen: false,
    isInlineSeveranceFormOpen: false,
    identityEdit: null,
    forfeitureModal: null,
    selectedPartyFilterId: '',
    selectedJourneyBranchId: '',
    selectedNodeFilter: '',
    proceduralNavTarget: null,
    activeTab: 'requests' as const,
};

describe('resolveCriminalDashboardNestedNav', () => {
    it('يعتبر تبويباً غير الطلبات تنقلاً متداخلاً', () => {
        expect(resolveCriminalDashboardNestedNav({ ...base, activeTab: 'statements' })).toBe(true);
    });

    it('يعتبر سلة المهملات المفتوحة تنقلاً متداخلاً', () => {
        expect(resolveCriminalDashboardNestedNav({ ...base, isTrashModalOpen: true })).toBe(true);
    });

    it('لا يعتبر تبويب الطلبات بدون طبقات مفتوحة تنقلاً متداخلاً', () => {
        expect(resolveCriminalDashboardNestedNav(base)).toBe(false);
    });
});
