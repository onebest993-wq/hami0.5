/** Gate lazy load of execution-core-handlers chunk */
import { readHandlerClusterContextValue } from './executionDashboardCore/handlerClusterContextShared';

export type ExecutionHandlerClusterGateInput = {
    /** إضبارة تنفيذ مفتوحة — تسخّن جسور الحجز دون انتظار فتح محضر/سجل */
    hasOpenExecutionDossier?: boolean;
    /** إضبارة إخلاء — شارات المدين (مهلة إخلاء، شرطة، كسر) تحتاج جسور جبري */
    isEvictionExecutionModule?: boolean;
    showUnifiedExecutionModal: boolean;
    showUnifiedSummonsModal: boolean;
    unifiedModalTab?: string | null;
    showUnifiedSeizureLogModal: boolean;
    showCoerciveModal: boolean;
    showAppointmentModal: boolean;
    showSeizedAssetsModal: boolean;
    showPaymentModal: boolean;
    showNotificationModal: boolean;
    showNotesModal: boolean;
    showCoerciveActionForm: string | null;
    showEditDossierMetaModal: boolean;
    editPartyTarget?: unknown;
    partyDeathModalParty: 'creditor' | 'debtor' | null;
    dossierLifecyclePanelOpen: boolean;
    isHeaderExpanded: boolean;
};

export type ExecutionHandlerClusterHeavyMode = 'none' | 'followup' | 'seizure' | 'coercive';
export type ExecutionHandlerClusterFollowupMode =
    | 'none'
    | 'admin-special'
    | 'dossier-controls'
    | 'other-party';
export type ExecutionHandlerClusterSeizureMode = 'none' | 'requests' | 'log';

export function shouldLoadExecutionHandlerClusterLight(input: ExecutionHandlerClusterGateInput): boolean {
    return Boolean(input.showAppointmentModal || input.showPaymentModal || input.showNotesModal);
}

export function shouldLoadExecutionHandlerClusterHeavy(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterHeavyMode(input) !== 'none';
}

export function shouldLoadExecutionHandlerClusterFollowupHeavy(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterHeavyMode(input) === 'followup';
}

export function shouldLoadExecutionHandlerClusterFollowupAdminSpecial(
    input: ExecutionHandlerClusterGateInput,
): boolean {
    // سخّن جسر نماذج الطلبات طوال فتح المحضر — كما أدوات الإضبارة وطلبات الحجز
    if (input.showUnifiedExecutionModal) return true;
    return resolveExecutionHandlerClusterFollowupMode(input) === 'admin-special';
}

export function shouldLoadExecutionHandlerClusterFollowupDossierControls(
    input: ExecutionHandlerClusterGateInput,
): boolean {
    // سخّن جسر أدوات الإضبارة طوال فتح المحضر — كما طلبات الحجز
    if (input.showUnifiedExecutionModal) return true;
    return resolveExecutionHandlerClusterFollowupMode(input) === 'dossier-controls';
}

export function shouldLoadExecutionHandlerClusterFollowupOtherParty(
    input: ExecutionHandlerClusterGateInput,
): boolean {
    // سخّن جسر تحركات الطرف الآخر طوال فتح المحضر
    if (input.showUnifiedExecutionModal) return true;
    return resolveExecutionHandlerClusterFollowupMode(input) === 'other-party';
}

export function shouldLoadExecutionHandlerClusterSeizureHeavy(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterSeizureMode(input) !== 'none';
}

export function shouldLoadExecutionHandlerClusterSeizureRequests(
    input: ExecutionHandlerClusterGateInput,
): boolean {
    return resolveExecutionHandlerClusterSeizureMode(input) === 'requests';
}

export function shouldLoadExecutionHandlerClusterSeizureLog(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterSeizureMode(input) === 'log';
}

export function shouldLoadExecutionHandlerClusterCoerciveHeavy(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterHeavyMode(input) === 'coercive';
}

export function shouldLoadExecutionHandlerClusterDossierSupport(input: ExecutionHandlerClusterGateInput): boolean {
    // توسيع الهيدر أو فتح تعديل طرف — حمّل الدعم قبل أن يضغط المستخدم على stub
    return Boolean(
        input.showEditDossierMetaModal ||
            input.isHeaderExpanded ||
            input.editPartyTarget != null,
    );
}

export function resolveExecutionHandlerClusterFollowupMode(
    input: ExecutionHandlerClusterGateInput,
): ExecutionHandlerClusterFollowupMode {
    if (resolveExecutionHandlerClusterHeavyMode(input) !== 'followup') {
        return 'none';
    }

    const activeFollowupTab = String(input.unifiedModalTab || '').trim();
    if (activeFollowupTab === 'admin' || activeFollowupTab === 'special') {
        return 'admin-special';
    }

    if (activeFollowupTab === 'dossier_controls') {
        return 'dossier-controls';
    }

    if (activeFollowupTab === 'other_party') {
        return 'other-party';
    }

    return 'none';
}

export function resolveExecutionHandlerClusterHeavyMode(
    input: ExecutionHandlerClusterGateInput,
): ExecutionHandlerClusterHeavyMode {
    if (input.hasOpenExecutionDossier && input.isEvictionExecutionModule) {
        return 'coercive';
    }

    if (
        input.showCoerciveModal ||
        input.showCoerciveActionForm ||
        input.showNotificationModal ||
        input.showUnifiedSummonsModal ||
        Boolean(input.partyDeathModalParty)
    ) {
        return 'coercive';
    }

    // سجل الحجز وحده (بدون محضر مفتوح)
    if (input.showUnifiedSeizureLogModal && !input.showUnifiedExecutionModal) {
        return 'seizure';
    }

    if (!input.showUnifiedExecutionModal) {
        return 'none';
    }

    const activeFollowupTab = String(input.unifiedModalTab || '').trim();

    if (!activeFollowupTab || activeFollowupTab === 'seizure_requests') {
        return 'seizure';
    }

    if (activeFollowupTab === 'coercive' || activeFollowupTab === 'personal') {
        return 'coercive';
    }

    if (
        activeFollowupTab === 'dossier_controls' ||
        activeFollowupTab === 'other_party' ||
        activeFollowupTab === 'admin' ||
        activeFollowupTab === 'special'
    ) {
        return 'followup';
    }

    if (activeFollowupTab === 'correspondences') {
        return 'none';
    }

    return 'none';
}

export function resolveExecutionHandlerClusterSeizureMode(
    input: ExecutionHandlerClusterGateInput,
): ExecutionHandlerClusterSeizureMode {
    if (input.showUnifiedSeizureLogModal) {
        return 'log';
    }

    // أبقِ جسور طلبات الحجز حيّة طوال فتح المحضر — إلغاؤها عند تبديل التبويب
    // يعيد Suspense باردة عند العودة لـ «طلبات الحجز».
    if (input.showUnifiedExecutionModal) {
        return 'requests';
    }

    if (input.hasOpenExecutionDossier) {
        return 'requests';
    }

    return 'none';
}

export function shouldLoadExecutionHandlerCluster(input: ExecutionHandlerClusterGateInput): boolean {
    return shouldLoadExecutionHandlerClusterLight(input) || shouldLoadExecutionHandlerClusterHeavy(input);
}

/**
 * جسر تكليف الموظف بالحضور — input الجسور هو bag-of-bags (core/orchestrators)،
 * لذا الأعلام تُقرأ من الحقائب الداخلية عبر readHandlerClusterContextValue.
 * (كان الوصول المباشر input.employeeAssignmentTabEnabled يعيد undefined دائماً
 * فلا يُحمَّل الجسر أبداً وتبقى معالجات التكليف stubs.)
 */
export function shouldLoadExecutionEmployeeAssignmentBridge(
    loadCoerciveHeavyHandlerCluster: boolean,
    coerciveHeavyHandlerClusterInput: object,
): boolean {
    if (!loadCoerciveHeavyHandlerCluster) return false;
    return Boolean(
        readHandlerClusterContextValue(coerciveHeavyHandlerClusterInput, 'activeDebtorIsEmployee') ||
            readHandlerClusterContextValue(coerciveHeavyHandlerClusterInput, 'employeeAssignmentTabEnabled') ||
            readHandlerClusterContextValue(
                coerciveHeavyHandlerClusterInput,
                'resolvedEmployeeSummonsAssignment',
            ) ||
            readHandlerClusterContextValue(
                coerciveHeavyHandlerClusterInput,
                'employeeForcedBringAwaitingPersonalOutcome',
            ),
    );
}

/** مفتاح إعادة mount للجسور — لا يتضمن epoch القرارات (يُبقي المعالجات الحية بعد الموافقة) */
export function buildExecutionHandlerClusterMountKey(p: {
    executionId: string | undefined;
    activeTabId?: string;
    activeFollowupDebtorKey: string | undefined;
}): string {
    return [p.executionId ?? '', p.activeFollowupDebtorKey ?? '', p.activeTabId ?? ''].join(':');
}
