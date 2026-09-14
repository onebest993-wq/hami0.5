import { shouldShowGuarantorRequestInSeizureTab } from '@/app/domain/execution/followup/hiddenFollowupRequestsUtils';
import type { ExecutionFile } from '@/app/types/execution';
import type { FollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';

export type FollowupSeizureSpecialization = {
    hideAllGuarantorPresence: boolean;
    isFinancialDebtCollection: boolean;
    showFinancialGuarantorRequestOnly: boolean;
    hideFollowupSeizureRequestsTab: boolean;
};

export type SettlementGuarantorGateSlice = {
    settlementBreachTriggeredAt: string | null | undefined;
    pendingSettlement: unknown;
};

export type SeizureMatrixSeizureTabSlice = {
    hideSeizureTab: boolean;
    ruleId?: string;
};

/**
 * هل تُعرَض حجوزُ الكفيل في تبويب «طلبات الحجز»؟ تقرؤه قائمةُ الطلبات المخفية
 * (`shouldBuriedGuarantorSeizure`) فتُخفيها حين يكون صحيحاً — **فجوابُه من البوّابة التي
 * يرسم بها التبويبُ كتلةَ الكفيل نفسِها** (`useSeizureRequestsTabModel`)، لا من نسخةٍ عنها.
 * كانت هنا نسخةٌ طابقتها حرفاً، ثمّ أُطفئت البوّابةُ في `f2fdef53` وبقيت النسخةُ تقول «معروضة»
 * للمدين غير الموظّف — فلم تُبلَغ حجوزُه من أيّ باب.
 */
export function computeShowGuarantorInSeizureFollowupTab(input: {
    activeDebtorIsDeceased: boolean;
    activeDebtorIsEmployee: boolean;
    viewExecutionData: ExecutionFile | null | undefined;
    followupSpecialization: Pick<
        FollowupSeizureSpecialization,
        'hideAllGuarantorPresence' | 'isFinancialDebtCollection' | 'showFinancialGuarantorRequestOnly'
    >;
    remainingBalanceForSeizure: number;
    settlementGuarantorGate: SettlementGuarantorGateSlice;
}): boolean {
    const {
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        viewExecutionData,
        followupSpecialization,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
    } = input;

    return shouldShowGuarantorRequestInSeizureTab(
        {
            hideAllGuarantorPresence: followupSpecialization.hideAllGuarantorPresence,
            isFinancialDebtCollection: followupSpecialization.isFinancialDebtCollection,
            showFinancialGuarantorRequestOnly: followupSpecialization.showFinancialGuarantorRequestOnly,
        } as Parameters<typeof shouldShowGuarantorRequestInSeizureTab>[0],
        {
            executionData: viewExecutionData,
            financialCenterTotalIqd: remainingBalanceForSeizure,
            settlementBreachTriggeredAt: settlementGuarantorGate.settlementBreachTriggeredAt,
            ledgerPendingSettlement: settlementGuarantorGate.pendingSettlement,
            activeDebtorIsDeceased,
            activeDebtorIsEmployee,
        },
    );
}

/** تبويبات مسموحة عند تقييد المحضر (كيان قانوني / وكيل مدين) — ديناميكي حسب أعلام التخصيص */
export function buildRestrictedFollowupTabIds(input: {
    specialization: Pick<
        FollowupSpecializationVisibility,
        'hideFollowupCoerciveTab' | 'hideFollowupSeizureRequestsTab' | 'hidePersonalCoerciveFollowupTab'
    >;
    showPersonalCoerciveFollowupTab: boolean;
}): Set<string> {
    const ids = new Set<string>(['correspondences', 'admin', 'dossier_controls', 'other_party']);
    if (!input.specialization.hideFollowupCoerciveTab) {
        ids.add('coercive');
    }
    if (!input.specialization.hideFollowupSeizureRequestsTab) {
        ids.add('seizure_requests');
    }
    if (
        input.showPersonalCoerciveFollowupTab &&
        !input.specialization.hidePersonalCoerciveFollowupTab
    ) {
        ids.add('personal');
    }
    return ids;
}

export function filterSeizureFromFollowupSectionTabOrder(
    followupSectionTabOrder: readonly string[],
    hideSeizureTab: boolean,
    hideFollowupSeizureRequestsTab: boolean,
): readonly string[] {
    return followupSectionTabOrder.filter(
        (tabId) =>
            tabId !== 'seizure_requests' || (!hideSeizureTab && !hideFollowupSeizureRequestsTab),
    );
}

export function filterSeizureFromFollowupModalTabs<T extends { id: string }>(
    followupModalTabs: readonly T[],
    hideSeizureTab: boolean,
    hideFollowupSeizureRequestsTab: boolean,
    followupTabsRestricted: boolean,
    restrictedFollowupTabIds: ReadonlySet<string>,
): T[] {
    return followupModalTabs.filter((tab) => {
        if (followupTabsRestricted && !restrictedFollowupTabIds.has(tab.id)) {
            return false;
        }
        return tab.id !== 'seizure_requests' || (!hideSeizureTab && !hideFollowupSeizureRequestsTab);
    });
}

export function canOpenSeizureRequestsTab(
    seizureMatrix: SeizureMatrixSeizureTabSlice,
    hideFollowupSeizureRequestsTab: boolean,
): boolean {
    return !seizureMatrix.hideSeizureTab && !hideFollowupSeizureRequestsTab;
}

export function resolveOpenSeizureRequestsTabBlockedMessage(
    hideFollowupSeizureRequestsTab: boolean,
    seizureMatrix: SeizureMatrixSeizureTabSlice,
): string {
    if (hideFollowupSeizureRequestsTab) {
        return 'تبويب الحجز غير متاح في مطالبات المشاهدة والاستصحاب';
    }
    if (seizureMatrix.ruleId === 'rule_0_government') {
        return 'المدين جهة حكومية — الحجز معطّل (حصانة الدولة)';
    }
    return 'لا يوجد رصيد متبٍّ — تبويب الحجز غير متاح';
}
