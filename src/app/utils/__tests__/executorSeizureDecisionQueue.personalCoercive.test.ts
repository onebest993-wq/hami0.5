import { describe, expect, it, beforeEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearDecisionsNamespaceForTests,
    writeExecutorDecisionsArray,
} from '@/app/utils/executionDecisionsNamespace';
import {
    appendPersonalCoerciveByExecutorOrder,
    appendPersonalCoerciveExecutorRequest,
    closePersonalCoerciveSubtypeDecisionCycle,
    closeSeizureSubtypeDecisionCycle,
    getGoverningDossierPresentationRow,
    getGoverningPersonalCoerciveSubtypeRow,
    getGoverningSeizureDecisionBySubtype,
    getPersonalCoerciveSubtypeOutcome,
    hasActivePersonalCoerciveSubtypeCard,
    isExecutorHubRowInactiveForGoverning,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { syncExecutorDecisionResolution } from '@/app/utils/syncExecutorDecisionResolution';
import { isExecutorRequestAppealCycleSupersededFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';

const EXEC_ID = 'exec-personal-coercive-sync-test';

const FINANCIAL_EXEC_DATA = {
    id: EXEC_ID,
    claimType: 'استحصال دين مالي',
    creditors: [{ name: 'دائن', isClient: true }],
    debtors: [{ name: 'مدين' }],
};

function seedArchivedApprovedForcedBringRow(): string {
    const decisionId = 'personal_coercive_archived_1';
    const row = {
        id: decisionId,
        title: 'إحضار جبري',
        body: 'طلب سابق',
        date: '2026-06-01',
        resolvedAt: '2026-06-01T10:00:00.000Z',
        appealStatus: 'final',
        executorOutcome: 'approved',
        status: 'accepted',
        activatedByExecutorOrder: true,
        requestKind: 'personal_coercive',
        personalCoerciveSubtype: 'forced_bring_in',
        isArchived: true,
        appealPhase: null,
    };
    writeExecutorDecisionsArray(EXEC_ID, [row], FINANCIAL_EXEC_DATA);
    return decisionId;
}

describe('personal coercive decision cycle sync', () => {
    beforeEach(() => {
        clearDecisionsNamespaceForTests(EXEC_ID);
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    });

    it('ignores archived approved rows when governing forced_bring_in', () => {
        seedArchivedApprovedForcedBringRow();
        expect(getGoverningPersonalCoerciveSubtypeRow(EXEC_ID, 'forced_bring_in')).toBeNull();
        expect(getPersonalCoerciveSubtypeOutcome(EXEC_ID, 'forced_bring_in')).toEqual({
            pending: false,
            approved: false,
            rejected: false,
            alternative: false,
        });
        expect(hasActivePersonalCoerciveSubtypeCard(EXEC_ID, 'forced_bring_in')).toBe(false);
    });

    it('allows new by-executor-order activation after archived cycle', () => {
        seedArchivedApprovedForcedBringRow();
        const result = appendPersonalCoerciveByExecutorOrder({
            executionId: EXEC_ID,
            subtype: 'forced_bring_in',
            title: 'إحضار جبري بقرار المنفذ',
            body: 'تفعيل جديد',
        });
        expect(result.ok).toBe(true);
        expect(result.decisionId).toBeTruthy();
        const rows = readExecutorDecisionsArray(EXEC_ID);
        expect(rows.length).toBe(2);
        const governing = getGoverningPersonalCoerciveSubtypeRow(EXEC_ID, 'forced_bring_in');
        expect(governing?.id).toBe(result.decisionId);
        expect(getPersonalCoerciveSubtypeOutcome(EXEC_ID, 'forced_bring_in').approved).toBe(true);
    });

    it('treats final cassation affirm on rejected travel_ban as inactive governing row', () => {
        const row = {
            id: 'personal_coercive_travel_final',
            title: 'منع سفر',
            body: 'طلب',
            date: '2026-06-03',
            resolvedAt: '2026-06-03T10:00:00.000Z',
            appealStatus: 'final',
            appealResult: 'تصديق القرار',
            appealMethod: 'tamyeez',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'rejected',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'travel_ban',
            appealPhase: null,
        };
        writeExecutorDecisionsArray(EXEC_ID, [row], FINANCIAL_EXEC_DATA);
        expect(isExecutorRequestAppealCycleSupersededFromRecord(row, [row])).toBe(true);
        expect(getGoverningPersonalCoerciveSubtypeRow(EXEC_ID, 'travel_ban')).toBeNull();
        expect(hasActivePersonalCoerciveSubtypeCard(EXEC_ID, 'travel_ban')).toBe(false);
    });

    it('closes travel_ban request cycle from governing UI after executor approval', () => {
        const row = {
            id: 'personal_coercive_travel_1',
            title: 'منع سفر',
            body: 'طلب',
            date: '2026-06-04',
            resolvedAt: '2026-06-04T10:00:00.000Z',
            appealStatus: 'final',
            noAppealChosen: true,
            executorOutcome: 'approved',
            status: 'accepted',
            appealRequestOrigin: 'creditor_side',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'travel_ban',
            appealPhase: null,
        };
        writeExecutorDecisionsArray(EXEC_ID, [row], FINANCIAL_EXEC_DATA);
        expect(isExecutorHubRowInactiveForGoverning(row, [row])).toBe(true);
        expect(getGoverningPersonalCoerciveSubtypeRow(EXEC_ID, 'travel_ban')).toBeNull();
        expect(hasActivePersonalCoerciveSubtypeCard(EXEC_ID, 'travel_ban')).toBe(false);
        expect(getPersonalCoerciveSubtypeOutcome(EXEC_ID, 'travel_ban')).toEqual({
            pending: false,
            approved: false,
            rejected: false,
            alternative: false,
        });
    });

    it('closes dossier presentation request cycle after executor approval', () => {
        const row = {
            id: 'personal_coercive_dossier_1',
            title: 'عرض الإضبارة',
            body: 'طلب',
            date: '2026-06-04',
            resolvedAt: '2026-06-04T10:00:00.000Z',
            appealStatus: 'final',
            noAppealChosen: true,
            executorOutcome: 'approved',
            status: 'accepted',
            appealRequestOrigin: 'creditor_side',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'executive_dossier_presentation',
            dossierPresentationClosed: true,
            appealPhase: null,
        };
        writeExecutorDecisionsArray(EXEC_ID, [row], FINANCIAL_EXEC_DATA);
        expect(isExecutorHubRowInactiveForGoverning(row, [row])).toBe(true);
        expect(getGoverningDossierPresentationRow(EXEC_ID)).toBeNull();
        expect(hasActivePersonalCoerciveSubtypeCard(EXEC_ID, 'executive_dossier_presentation')).toBe(
            false
        );
    });

    it('syncExecutorDecisionResolution approves pending forced_bring_in from followup panel', () => {
        const submitted = appendPersonalCoerciveExecutorRequest({
            executionId: EXEC_ID,
            subtype: 'forced_bring_in',
            title: 'طلب إحضار جبري',
            body: 'طلب اختبار',
        });
        expect(submitted.ok).toBe(true);
        expect(getPersonalCoerciveSubtypeOutcome(EXEC_ID, 'forced_bring_in').pending).toBe(true);

        const row = getGoverningPersonalCoerciveSubtypeRow(EXEC_ID, 'forced_bring_in');
        const decisionId = String(row?.id ?? submitted.decisionId ?? '').trim();
        expect(decisionId).toBeTruthy();

        const wrongViewId = `${EXEC_ID}__sub__inaba-1`;
        const result = syncExecutorDecisionResolution({
            executionId: wrongViewId,
            decisionId,
            resolution: 'approved',
            row: row ?? undefined,
            suppressNavigatorToast: true,
        });
        expect(result.ok).toBe(true);
        expect(getPersonalCoerciveSubtypeOutcome(EXEC_ID, 'forced_bring_in')).toEqual({
            pending: false,
            approved: true,
            rejected: false,
            alternative: false,
        });
        const stored = readExecutorDecisionsArray(EXEC_ID).find((r) => String(r.id) === decisionId) as {
            executorOutcome?: string;
        };
        expect(stored?.executorOutcome).toBe('approved');
    });

    it('keeps approved forced_bring_in governing for outcome panel after executor approval', () => {
        const row = {
            id: 'personal_coercive_forced_approved',
            title: 'إحضار جبري',
            body: 'طلب',
            date: '2026-06-04',
            resolvedAt: '2026-06-04T12:00:00.000Z',
            appealStatus: 'pending',
            executorOutcome: 'approved',
            status: 'accepted',
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealPhase: null,
        };
        writeExecutorDecisionsArray(EXEC_ID, [row], FINANCIAL_EXEC_DATA);
        expect(isExecutorHubRowInactiveForGoverning(row, [row])).toBe(false);
        expect(getPersonalCoerciveSubtypeOutcome(EXEC_ID, 'forced_bring_in').approved).toBe(true);
        expect(getGoverningPersonalCoerciveSubtypeRow(EXEC_ID, 'forced_bring_in')?.id).toBe(row.id);
    });

    it('closePersonalCoerciveSubtypeDecisionCycle supersedes active approved row', () => {
        const decisionId = 'personal_coercive_active_1';
        const row = {
            id: decisionId,
            title: 'إحضار جبري',
            body: 'طلب قائم',
            date: '2026-06-02',
            resolvedAt: '2026-06-02T10:00:00.000Z',
            appealStatus: 'final',
            executorOutcome: 'approved',
            status: 'accepted',
            activatedByExecutorOrder: true,
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealPhase: null,
        };
        writeExecutorDecisionsArray(EXEC_ID, [row], FINANCIAL_EXEC_DATA);

        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: EXEC_ID,
            subtype: 'forced_bring_in',
        });

        expect(getGoverningPersonalCoerciveSubtypeRow(EXEC_ID, 'forced_bring_in')).toBeNull();
        const stored = readExecutorDecisionsArray(EXEC_ID)[0] as {
            requestCycleSuperseded?: boolean;
            isArchived?: boolean;
        };
        expect(stored.requestCycleSuperseded).toBe(true);
        expect(stored.isArchived).toBeFalsy();

        const next = appendPersonalCoerciveByExecutorOrder({
            executionId: EXEC_ID,
            subtype: 'forced_bring_in',
            title: 'إحضار جبري بقرار المنفذ',
            body: 'دورة جديدة',
        });
        expect(next.ok).toBe(true);
    });

    it('closeSeizureSubtypeDecisionCycle supersedes registered third_party row', () => {
        const decisionId = 'seizure_req_third_party_1';
        const row = {
            id: decisionId,
            title: 'حجز مال المدين لدى الغير',
            body: 'طلب مسجّل',
            date: '2026-06-04',
            resolvedAt: '2026-06-04T10:00:00.000Z',
            appealStatus: 'final',
            executorOutcome: 'approved',
            requestKind: 'seizure',
            seizureSubtype: 'third_party',
            seizureRequestSavedAt: '2026-06-04T11:00:00.000Z',
        };
        writeExecutorDecisionsArray(EXEC_ID, [row], FINANCIAL_EXEC_DATA);

        expect(getGoverningSeizureDecisionBySubtype(EXEC_ID, 'third_party')?.id).toBe(decisionId);

        closeSeizureSubtypeDecisionCycle({
            executionId: EXEC_ID,
            subtype: 'third_party',
        });

        expect(getGoverningSeizureDecisionBySubtype(EXEC_ID, 'third_party')).toBeNull();
        const stored = readExecutorDecisionsArray(EXEC_ID)[0] as {
            requestCycleSuperseded?: boolean;
            isArchived?: boolean;
        };
        expect(stored.requestCycleSuperseded).toBe(true);
        expect(stored.isArchived).toBeFalsy();
    });

    it('supersedes prior settled personal_coercive rows without auto-archiving them', () => {
        SecureStoreService.setItemSync(
            `execution_${EXEC_ID}`,
            JSON.stringify(FINANCIAL_EXEC_DATA)
        );
        const first = appendPersonalCoerciveExecutorRequest({
            executionId: EXEC_ID,
            subtype: 'travel_ban',
            title: 'منع سفر — أول',
            body: 'طلب تجريبي',
        });
        expect(first.ok).toBe(true);

        const rowsAfterFirst = readExecutorDecisionsArray(EXEC_ID, FINANCIAL_EXEC_DATA);
        const firstRow = rowsAfterFirst.find((r) => r.id === first.decisionId);
        expect(firstRow).toBeTruthy();
        (firstRow as { executorOutcome?: string }).executorOutcome = 'approved';
        (firstRow as { resolvedAt?: string }).resolvedAt = '2026-06-10T10:00:00.000Z';
        writeExecutorDecisionsArray(EXEC_ID, rowsAfterFirst, FINANCIAL_EXEC_DATA);

        const second = appendPersonalCoerciveExecutorRequest({
            executionId: EXEC_ID,
            subtype: 'travel_ban',
            title: 'منع سفر — ثاني',
            body: 'طلب لاحق',
        });
        expect(second.ok).toBe(true);

        const rows = readExecutorDecisionsArray(EXEC_ID, FINANCIAL_EXEC_DATA);
        const superseded = rows.find((r) => r.id === first.decisionId) as {
            requestCycleSuperseded?: boolean;
            isArchived?: boolean;
        };
        const pending = rows.find((r) => r.id === second.decisionId) as {
            executorOutcome?: string;
        };
        expect(superseded?.requestCycleSuperseded).toBe(true);
        expect(superseded?.isArchived).toBeFalsy();
        expect(pending?.executorOutcome).toBe('pending');
        expect(rows.length).toBeGreaterThanOrEqual(2);
    });
});
