import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import { HIDDEN_GUARANTOR_CATALOG } from '@/app/domain/execution/followup/hiddenFollowupRequestCatalogs';
import { applyFollowupSpecializationOverlays } from '@/app/utils/applyFollowupSpecializationOverlays';
import { shouldShowEarnerExecutiveDetentionFromFinancialCenter } from '@/app/utils/earnerPersonalCoerciveFinancialGate';
import { resolveExecutionDomainContext } from '@/app/utils/executionDomainIsolation';
import { resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import { computeShowGuarantorInSeizureFollowupTab } from '../../hooks/executionDashboardCore/executionDashboardFollowupSeizureTabs';
import type { ExecutionFollowupModalPortalController } from '../../hooks/useExecutionFollowupModalPortalController';
import { ExecutionFollowupModalAdminRequestsPanel } from '../ExecutionFollowupModalAdminRequestsPanel';
import { ExecutionFollowupModalMidPanels } from '../ExecutionFollowupModalMidPanels';
import { RequestsTab } from '../RequestsTab';
import { SeizureRequestsTab } from '../SeizureRequestsTab';

/**
 * **حجوزُ الكفيل الثلاثة بعد اعتماده — أيبلغها المحامي من محضر المتابعة؟**
 *
 * لها في المحضر بابان، وكلٌّ منهما يُغلق حين يُظنّ أنّ الآخر مفتوح:
 *   ١) **الطلبات المخفية** في تبويب «الطلبات»: `shouldBuriedGuarantorSeizure` تُدرجها ما لم
 *      يكن علَمُ `showGuarantorInSeizureTab` صحيحاً — والعلَمُ في التطبيق من
 *      `computeShowGuarantorInSeizureFollowupTab`.
 *   ٢) **كتلةُ الكفيل في تبويب «طلبات الحجز»**: `SeizureRequestsTabReady` ترسمها بشرط
 *      `shouldShowGuarantorRequestInSeizureTab`، وفيها أزرارُ الحجز الثلاثة.
 *
 * **ولا يُحاكى هنا أيٌّ من البابين:** تُبنى الأعلام بدوالّ الإنتاج نفسها، وتُرسم اللوحتان
 * الحقيقيتان اللتان يرسمهما المحضر. وسببُ ذلك أنّ اختبارين قائمين يرى كلٌّ منهما باباً لا
 * يراه المحامي: عُدّةُ `resolveFollowupHiddenActions` تحسب العلَم بدالّة الباب الثاني لا
 * بدالّة التطبيق، و`seizureRequestsTab.test.tsx` يُحاكي بوّابةَ الباب الثاني بـ`true`.
 *
 * **والتوكيد: لكلّ حجزٍ بابٌ واحدٌ بالضبط.** صفرٌ = لا يُبلَغ؛ واثنان = معروضٌ مرّتين، وهو ما
 * وُضع شرطُ العلَم في الباب الأوّل ليمنعه.
 */

type GuarantorSeizureKind = 'salary' | 'property' | 'movable';

const KINDS: readonly GuarantorSeizureKind[] = ['salary', 'property', 'movable'];

/** نصُّ زرّ كلّ حجزٍ في قائمة الطلبات المخفية — من الكتالوج الذي ترسمه */
const HIDDEN_REQUEST_LABEL: Record<GuarantorSeizureKind, string> = {
    salary: catalogShortLabel('guarantor_seizure_salary'),
    property: catalogShortLabel('guarantor_seizure_property'),
    movable: catalogShortLabel('guarantor_seizure_movable'),
};

/** نصُّ زرّ كلّ حجزٍ في كتلة الكفيل بتبويب الحجز (`SeizureRequestsTabGuarantorSeizureActions`) */
const SEIZURE_TAB_LABEL: Record<GuarantorSeizureKind, string> = {
    salary: 'حجز راتب الكفيل',
    property: 'حجز عقار الكفيل',
    movable: 'حجز منقولات الكفيل',
};

const EXECUTION_ID = 'exec-guarantor-reach';
const REMAINING_IQD = 4_000_000;
const SETTLEMENT_GATE = { settlementBreachTriggeredAt: '2026-01-01', pendingSettlement: null };

function catalogShortLabel(key: string): string {
    const item = HIDDEN_GUARANTOR_CATALOG.find((entry) => entry.key === key);
    if (!item) throw new Error(`guarantor catalog has no ${key}`);
    return item.shortLabel;
}

function buildApprovedGuarantorDossier(isEmployee: boolean): ExecutionFile {
    return {
        id: EXECUTION_ID,
        claimType: 'استحصال دين مالي',
        debtors: [{ id: 'debtor-1', name: 'مدين', isEmployee }],
        guarantor_followup: {
            executor_approved: true,
            details_saved: true,
            channel: 'financial',
            guarantor_name: 'كفيل',
            guarantor_workplace: 'جهة العمل',
        },
    } as unknown as ExecutionFile;
}

/** أعلامُ المحضر بسلسلة الإنتاج: سياقُ العزل ← بوابة الكاسب ← علَمُ الكفيل في تبويب الحجز */
function buildFollowupController(isEmployee: boolean) {
    const viewExecutionData = buildApprovedGuarantorDossier(isEmployee);
    const executionDomainContext = resolveExecutionDomainContext(
        viewExecutionData as unknown as Record<string, unknown>,
        EXECUTION_ID,
    );
    const spec = applyFollowupSpecializationOverlays(executionDomainContext.flags, {
        isEmployee,
        financialCenterTotalIqd: REMAINING_IQD,
        activeDebtorIsDeceased: false,
    });
    const showGuarantorInSeizureFollowupTab = computeShowGuarantorInSeizureFollowupTab({
        activeDebtorIsDeceased: false,
        activeDebtorIsEmployee: isEmployee,
        viewExecutionData,
        followupSpecialization: spec,
        remainingBalanceForSeizure: REMAINING_IQD,
        settlementGuarantorGate: SETTLEMENT_GATE,
    });
    const seizureMatrix = resolveSeizureMatrixFromExecution({
        remainingBalanceIqd: REMAINING_IQD,
        executionData: viewExecutionData,
        activeDebtorIsEmployee: isEmployee,
    });

    const c = {
        TabRequests: RequestsTab,
        TabSeizureRequests: SeizureRequestsTab,
        TabOtherParty: () => null,
        panelsToRender: new Set(['admin', 'seizure_requests']),
        activeFollowupDebtorKey: 'debtor-1',
        primaryDebtorKeyResolved: 'debtor-1',
        assignmentWorkspaceCtx: { activeDebtorKey: 'debtor-1' },
        executionId: EXECUTION_ID,
        decisionsStorageExecutionId: EXECUTION_ID,
        viewExecutionData,
        claimType: 'استحصال دين مالي',
        executionDomainContext,
        spec,
        showGuarantorInSeizureFollowupTab,
        showPersonalCoerciveFollowupTab: !spec.hidePersonalCoerciveFollowupTab,
        personalTabLockedForEmployee: isEmployee && !spec.hidePersonalCoerciveFollowupTab,
        hideExecutiveDetentionJudgeCard: !shouldShowEarnerExecutiveDetentionFromFinancialCenter({
            isEmployee,
            financialCenterTotalIqd: REMAINING_IQD,
        }),
        seizureMatrix,
        remainingBalanceForSeizure: REMAINING_IQD,
        settlementGuarantorGate: SETTLEMENT_GATE,
        activeDebtorIsDeceased: false,
        activeDebtorIsEmployee: isEmployee,
        activeDebtorIsLegalEntity: false,
        hideCoerciveTabsForDebtorAgent: false,
        isRepresentingDebtor: false,
        isPersonalStatusExecutionClaim: false,
        isAlimonyClaimType: false,
        isHistoricalMode: false,
        coerciveUiLocked: false,
        executionCoerciveButtonDisabled: false,
        appealPerspective: 'creditor_agent',
        forcedSummoningAnalysis: { canForceSummon: false, lockReasonAr: '' },
        inlineActionGateKey: null,
        setInlineActionGateKey: vi.fn(),
        seizureDetailCompletion: null,
        specialRequestTemplatePick: '',
        setSpecialRequestTemplatePick: vi.fn(),
        specialRequestDate: '',
        setSpecialRequestDate: vi.fn(),
        specialRequestContent: '',
        setSpecialRequestContent: vi.fn(),
        specialRequestManualTitle: '',
        setSpecialRequestManualTitle: vi.fn(),
        handleSpecialFollowupSubmit: vi.fn(),
        handleGuarantorRequestFromFollowup: vi.fn(),
        requestGuarantorSeizure: vi.fn(),
        requestFollowupSeizureDecision: vi.fn(),
        handleCoerciveAction: vi.fn(),
        saveCoerciveAction: vi.fn(),
        persistExecutionMerge: vi.fn(),
        persistGuarantorFollowupDetails: vi.fn(),
        pushTimelineEvent: vi.fn(),
        nextTimelineId: () => 'timeline-1',
        getLocalTodayYmd: () => '2026-09-14',
        openDecisionsModalWithBoot: vi.fn(),
        openOtherPartyAppealsModal: vi.fn(),
        otherPartyCreditorMirrorProps: null,
        otherPartyTabSubmitHandler: vi.fn(),
        creditorOtherPartyTrackHandlers: undefined,
        showToast: vi.fn(),
    } as unknown as ExecutionFollowupModalPortalController;

    return { c, showGuarantorInSeizureFollowupTab };
}

/** الباب الأوّل: تبويب «الطلبات» ← «الطلبات المخفية» ← أزرار الكتالوج */
async function kindsOfferedByHiddenRequests(
    c: ExecutionFollowupModalPortalController,
): Promise<GuarantorSeizureKind[]> {
    const view = render(
        <ExecutionFollowupModalAdminRequestsPanel c={{ ...c, activePanelKey: 'admin' }} />,
    );
    try {
        const toggle = view.queryByRole('button', { name: /الطلبات المخفية/ });
        if (!toggle) return [];
        fireEvent.click(toggle);
        await view.findByText('اختر نوع الطلب — تظهر تفاصيله بعد الضغط', undefined, {
            timeout: 10_000,
        });
        return KINDS.filter(
            (kind) => view.queryByRole('button', { name: HIDDEN_REQUEST_LABEL[kind] }) !== null,
        );
    } finally {
        view.unmount();
    }
}

/** الباب الثاني: تبويب «طلبات الحجز» ← كتلة الكفيل ← أزرار الحجز */
function kindsOfferedBySeizureTab(c: ExecutionFollowupModalPortalController): GuarantorSeizureKind[] {
    const view = render(
        <ExecutionFollowupModalMidPanels c={{ ...c, activePanelKey: 'seizure_requests' }} />,
    );
    try {
        return KINDS.filter((kind) => {
            const button = view.queryByRole('button', { name: SEIZURE_TAB_LABEL[kind] });
            return button instanceof HTMLButtonElement && !button.disabled;
        });
    } finally {
        view.unmount();
    }
}

describe('guarantor seizures after the guarantor is approved — reachable from the follow-up modal', () => {
    it.each([
        { debtor: 'employee debtor', isEmployee: true },
        { debtor: 'non-employee (kasib) debtor', isEmployee: false },
    ])(
        '$debtor: salary, property and movable seizures are each offered by exactly one door',
        async ({ isEmployee }) => {
            const { c, showGuarantorInSeizureFollowupTab } = buildFollowupController(isEmployee);

            const fromHiddenRequests = await kindsOfferedByHiddenRequests(c);
            const fromSeizureTab = kindsOfferedBySeizureTab(c);

            const doorsPerKind = Object.fromEntries(
                KINDS.map((kind) => [
                    kind,
                    Number(fromHiddenRequests.includes(kind)) + Number(fromSeizureTab.includes(kind)),
                ]),
            );
            expect(
                doorsPerKind,
                `showGuarantorInSeizureFollowupTab=${String(showGuarantorInSeizureFollowupTab)} · ` +
                    `hidden requests=[${fromHiddenRequests.join(',')}] · seizure tab=[${fromSeizureTab.join(',')}]`,
            ).toEqual({ salary: 1, property: 1, movable: 1 });
        },
    );
});
