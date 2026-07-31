import { describe, expect, it, vi } from 'vitest';
import { buildDebtorCardRowModel } from '../buildDebtorCardRowModel';
import type { Debtor } from '@/app/types/execution';

function baseInput(overrides: Record<string, unknown> = {}) {
    const debtor = {
        id: 'd1',
        name: 'مدين اختبار',
    } as Debtor;

    return {
        raw: debtor,
        loopIdx: 0,
        applyPartyOverlay: (party: Record<string, unknown>) => party,
        multiDebtorMode: false,
        showExtraDebtors: false,
        safeDebtorWorkspaceEntries: [],
        safeEffectiveDebtors: [debtor],
        getExecutionPartyDisplayName: () => ({
            displayName: 'مدين اختبار',
            showDeceasedGlyph: false,
        }),
        buildPartyHeirsRows: () => [],
        executionData: { id: 'e1', debtors: [debtor] } as never,
        decisionsStorageExecutionId: 'e1',
        debtorBrowserTabsMode: false,
        isDebtorRowEmployee: () => false,
        debtorEmploymentToggleMenuLabel: () => 'تبديل',
        principalDebtAmount: 0,
        parsedLawyerFees: 0,
        claimType: 'دين',
        isNonFinancialClaim: false,
        debtorSummonsProfile: {},
        getDebtorSummonsProfile: () => ({}),
        isRepresentingDebtor: false,
        viewExecutionData: null,
        primaryDebtorKeyResolved: 'd1',
        isEvictionExecutionModule: false,
        debtorAttendedVoluntarily: false,
        voluntaryAttendanceCount: 0,
        noticeVoluntaryPeriodEndOptimistic: false,
        voluntaryEndOptimistic: false,
        getPublicationNoticeForDebtorKey: () => null,
        publicationNoticeDeadlineYmd: (ymd: string) => ymd,
        isAssignmentDeadlinePassed: () => false,
        daysRemainingUntilDeadline: () => 0,
        getEmployeeAssignmentForDebtorKey: () => null,
        computeTaklifDeadlineYmd: (ymd: string) => ymd,
        getPersonalCoerciveSubtypeOutcome: () => ({ pending: false, approved: false }),
        executionId: 'e1',
        primaryMemoNoticeBadge: { id: 'memo' },
        primaryDebtorAbsenceBadge: null,
        getDebtorSummonsMarkerForKey: () => null,
        forcedPathAttendanceSecured: false,
        debtorForcedToAttend: false,
        ...overrides,
    };
}

describe('buildDebtorCardRowModel', () => {
    it('يعيد null عند إخفاء المدينين الإضافيين', () => {
        const d0 = { id: 'd0', name: 'أ' } as Debtor;
        const d1 = { id: 'd1', name: 'ب' } as Debtor;
        const d2 = { id: 'd2', name: 'ج' } as Debtor;
        const result = buildDebtorCardRowModel(
            baseInput({
                raw: d2,
                loopIdx: 2,
                multiDebtorMode: false,
                showExtraDebtors: false,
                safeEffectiveDebtors: [d0, d1, d2],
            }) as never,
        );
        expect(result).toBeNull();
    });

    it('يحل debtorKey للمدين الأساسي من المعرّف', () => {
        const result = buildDebtorCardRowModel(baseInput() as never);
        expect(result).not.toBeNull();
        expect(result!.isPrimary).toBe(true);
        expect(result!.debtorKey).toBe('d1');
    });

    it('يمسح شارات الإخطار عند تمثيل المدين', () => {
        const result = buildDebtorCardRowModel(
            baseInput({
                isRepresentingDebtor: true,
                primaryMemoNoticeBadge: { id: 'memo' },
                getDebtorSummonsMarkerForKey: () => ({ date: '2026-01-01', purpose: 'تبليغ' }),
            }) as never,
        );
        expect(result).not.toBeNull();
        expect(result!.rowMemoNoticeBadge).toBeNull();
        expect(result!.rowShowSummonsBadge).toBe(false);
        expect(result!.rowRegularTablighBadge).toBeNull();
        expect(result!.showDebtorNotificationPanel).toBe(false);
    });

    it('يمرّر applyPartyOverlay على بيانات المدين', () => {
        const applyPartyOverlay = vi.fn((party: Record<string, unknown>) => ({
            ...party,
            name: 'مغطى',
        }));
        const result = buildDebtorCardRowModel(baseInput({ applyPartyOverlay }) as never);
        expect(applyPartyOverlay).toHaveBeenCalled();
        expect(result!.d.name).toBe('مغطى');
    });
});
