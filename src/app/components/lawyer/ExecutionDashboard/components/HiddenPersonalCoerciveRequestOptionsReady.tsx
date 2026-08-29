import React from 'react';
import type { InlineActionGateKey } from '../types';
import {
    appendPersonalCoerciveExecutorRequest,
    dispatchDecisionsReload,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildHiddenPersonalCoerciveSteps,
    HiddenPersonalCoerciveRequestViews,
} from './HiddenPersonalCoerciveRequestViews';
import {
    listHiddenPersonalCoerciveCatalog,
    resolveHiddenPersonalCoerciveRequests,
    type HiddenFollowupVisibilityInput,
    type HiddenPersonalCoerciveRequestKey,
} from './hiddenFollowupRequestsUtils';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { ExecutionDomainContext } from '@/app/utils/executionDomainIsolation';
import {
    HIDDEN_FOLLOWUP_PENDING_REASON,
    resolveHiddenFollowupLockedReason,
} from './hiddenFollowup/shared';

export interface HiddenPersonalCoerciveRequestOptionsProps {
    executionId: string;
    flags: HiddenFollowupVisibilityInput;
    domainContext?: ExecutionDomainContext | null;
    /** عند التضمين من قائمة موحّدة — يُعرض لوحة التفاصيل فقط */
    embeddedSelectedKey?: HiddenPersonalCoerciveRequestKey;
    decisions: Record<string, unknown>[];
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
    kasabRelaxedGates?: boolean;
    forcedSummonAllowed?: boolean;
    forcedSummonLockReason?: string;
    onOpenSummonsCenter?: () => void;
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean; decisionId?: string; decisionsTab?: 'current' | 'previous' | 'appeals' }
    ) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    onOpenDecisions: (opts?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
    appealPerspective?: AppealUiPerspective;
}

export const HiddenPersonalCoerciveRequestOptionsReady: React.FC<HiddenPersonalCoerciveRequestOptionsProps> = ({
    executionId,
    flags,
    domainContext = null,
    embeddedSelectedKey,
    decisions,
    coerciveUiLocked,
    isHistoricalMode,
    activeDebtorKey = '',
    primaryDebtorKey = '',
    kasabRelaxedGates = false,
    forcedSummonAllowed = false,
    forcedSummonLockReason = '',
    onOpenSummonsCenter,
    showToast,
    persistExecutionMerge,
    onOpenDecisions,
    appealPerspective = 'creditor_agent',
}) => {
    const exId = String(executionId || '').trim();
    const catalog = React.useMemo(
        () => listHiddenPersonalCoerciveCatalog(flags, domainContext),
        [flags, domainContext]
    );
    const resolved = React.useMemo(
        () => resolveHiddenPersonalCoerciveRequests(flags, decisions),
        [flags, decisions]
    );
    const [selectedKey, setSelectedKey] = React.useState<HiddenPersonalCoerciveRequestKey | null>(
        embeddedSelectedKey ?? null
    );
    const [inlineGateKey, setInlineGateKey] = React.useState<InlineActionGateKey | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (embeddedSelectedKey) {
            setSelectedKey(embeddedSelectedKey);
        }
    }, [embeddedSelectedKey]);

    const effectiveKey = embeddedSelectedKey ?? selectedKey;
    const selectedCatalog = catalog.find((x) => x.key === effectiveKey) ?? null;
    const selectedResolved = resolved.find((x) => x.key === effectiveKey) ?? null;

    const governingRow = React.useMemo(() => {
        if (!selectedCatalog?.subtype) return null;
        return getGoverningPersonalCoerciveSubtypeRowFromDecisions(decisions, selectedCatalog.subtype);
    }, [decisions, selectedCatalog?.subtype]);

    const submitDisabledReason = React.useMemo(() => {
        if (!selectedCatalog?.subtype || !selectedCatalog.submitTitle) {
            return 'يُتابَع بعد موافقة المنفذ على عرض الإضبارة.';
        }
        const locked = resolveHiddenFollowupLockedReason(isHistoricalMode, coerciveUiLocked);
        if (locked) return locked;
        const status = selectedResolved?.status;
        if (status === 'pending') return HIDDEN_FOLLOWUP_PENDING_REASON;
        if (status === 'approved') return 'الطلب موافق عليه — تابع الإكمال من القرارات.';
        return '';
    }, [
        coerciveUiLocked,
        isHistoricalMode,
        selectedCatalog,
        selectedResolved?.status,
    ]);

    const runSubmit = React.useCallback(
        async (subtype: PersonalCoerciveSubtype, title: string, body: string) => {
            if (!exId || isHistoricalMode || coerciveUiLocked) return;
            setSubmitting(true);
            try {
                const submitted = appendPersonalCoerciveExecutorRequest({
                    executionId: exId,
                    subtype,
                    title,
                    body,
                    debtorKey: activeDebtorKey,
                    primaryDebtorKey,
                });
                if (!submitted.ok || !submitted.decisionId) {
                    showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
                        decisionsLink: true,
                    });
                    return;
                }
                if (subtype === 'forced_bring_in') {
                    persistExecutionMerge({
                        forced_bring_in_personal_outcome: null,
                        forced_bring_in_personal_followup_logged: false,
                    });
                }
                if (subtype === 'travel_ban') {
                    persistExecutionMerge({ travel_ban_withdrawn_at: null });
                }
                if (subtype === 'executive_dossier_presentation') {
                    persistExecutionMerge({
                        executive_dossier_phase: null,
                        executive_detention_judge_outcome: null,
                        executive_detention_judge_eligible_decision_id: null,
                    });
                }
                dispatchDecisionsReload();
                showToast('تم حفظ الطلب وتحويله إلى مركز القرارات بانتظار موافقة المنفذ.', 'success', {
                    decisionsLink: true,
                    decisionId: submitted.decisionId,
                    decisionsTab: 'previous',
                });
            } finally {
                setSubmitting(false);
                setInlineGateKey(null);
            }
        },
        [
            activeDebtorKey,
            coerciveUiLocked,
            exId,
            isHistoricalMode,
            persistExecutionMerge,
            primaryDebtorKey,
            showToast,
        ]
    );

    const steps = React.useMemo(
        () =>
            buildHiddenPersonalCoerciveSteps({
                governingRow: governingRow as Record<string, unknown> | null,
                selectedCatalog: selectedCatalog as never,
                appealPerspective,
                exId,
                onOpenDecisions,
            }),
        [appealPerspective, exId, governingRow, onOpenDecisions, selectedCatalog],
    );

    if (catalog.length === 0) return null;
    if (!selectedCatalog) return null;

    return (
        <HiddenPersonalCoerciveRequestViews
            catalog={catalog}
            resolved={resolved}
            selectedCatalog={selectedCatalog}
            selectedResolved={selectedResolved}
            selectedKey={selectedKey}
            setSelectedKey={setSelectedKey}
            embeddedSelectedKey={embeddedSelectedKey}
            effectiveKey={effectiveKey}
            governingRow={governingRow as Record<string, unknown> | null}
            steps={steps}
            submitDisabledReason={submitDisabledReason}
            submitting={submitting}
            showToast={showToast}
            setInlineGateKey={setInlineGateKey}
            inlineGateKey={inlineGateKey}
            runSubmit={runSubmit}
        />
    );
};
