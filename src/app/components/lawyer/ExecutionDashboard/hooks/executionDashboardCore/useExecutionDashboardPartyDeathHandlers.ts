/** وفاة الخصوم + إحلال الورثة + نفقة مستمرة — handlers وeffects */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { PartyDeathSavePayload } from '@/app/components/lawyer/execution/PartyDeathReportModal';
import {
    findLatestHeirSubstitutionDecisionNeedingEntry,
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildAlimonyBeneficiaryDeathMerge,
    buildSoleSurvivorDeathInput,
    resolveAlimonyBeneficiaryProfile,
    shouldShowAlimonyBeneficiaryDeathPicker,
} from '@/app/utils/alimonyBeneficiaryDeathUtils';
import { runPartyDeathSave } from './executionDashboardPartyDeathSave';
import { usePartyDeathSubstitutionHandlers } from './usePartyDeathSubstitutionHandlers';
import { HAMI_OPEN_PARTY_DEATH_MODAL } from '@/app/utils/partyDeathUiEvents';

export type { UseExecutionDashboardPartyDeathHandlersParams } from './useExecutionDashboardPartyDeathHandlers.types';
import type { UseExecutionDashboardPartyDeathHandlersParams } from './useExecutionDashboardPartyDeathHandlers.types';

export function useExecutionDashboardPartyDeathHandlers({
    executionDataRef,
    executionData,
    executionId,
    claimType,
    creditors,
    debtors,
    decisionsStorageExecutionId,
    decisionsReloadEpoch,
    partyDeathModalParty,
    setPartyDeathModalParty,
    partyDeathModalDecisionId,
    setPartyDeathModalDecisionId,
    setAlimonyBeneficiaryDeathModalProfile,
    setAlimonyBeneficiaryDeathModalOpen,
    lastHeirSubRequestAtRef,
    creditorDeathMarked,
    debtorDeathMarked,
    heirSubstitutionAllowed,
    ongoingAlimonyClaim,
    alimonyBeneficiaryProfile: _alimonyBeneficiaryProfile,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
}: UseExecutionDashboardPartyDeathHandlersParams) {
    const partyDeathSaveDeps = useMemo(
        () => ({
            executionDataRef,
            executionData,
            claimType,
            creditors,
            debtors,
            decisionsStorageExecutionId,
            partyDeathModalDecisionId,
            nextTimelineId,
            persistExecutionMerge,
            patchExecutorDecisionRow,
            showToast,
            setTimelineEvents,
        }),
        [
            executionDataRef,
            executionData,
            claimType,
            creditors,
            debtors,
            decisionsStorageExecutionId,
            partyDeathModalDecisionId,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setTimelineEvents,
        ],
    );

    const handlePartyDeathSave = useCallback(
        (payload: PartyDeathSavePayload): boolean => runPartyDeathSave(payload, partyDeathSaveDeps),
        [partyDeathSaveDeps],
    );

    const handleAlimonyBeneficiaryDeathConfirm = useCallback(
        (input: { wifeDeceased: boolean; childrenDiedCount: number }): boolean => {
            const base = executionDataRef?.current ?? executionData;
            const merge = buildAlimonyBeneficiaryDeathMerge(base, input);
            if (!merge) {
                showToast('تعذّر تطبيق الإبلاغ — راجع بيانات النفقة المستمرة.', 'warning');
                return false;
            }
            const now = new Date().toISOString();
            const parts: string[] = [];
            if (input.wifeDeceased) parts.push('الزوجة');
            if (input.childrenDiedCount > 0) {
                parts.push(
                    input.childrenDiedCount === 1
                        ? 'طفل واحد'
                        : `${input.childrenDiedCount} من الأولاد`,
                );
            }
            const te: TimelineEvent = {
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: 'إبلاغ وفاة مستحقي النفقة',
                description: `تم تسجيل وفاة: ${parts.join(' و')} — وتحديث المركز المالي.${
                    merge.dossier_lifecycle_status === 'finished'
                        ? '\nأُغلقت الإضبارة لوفاة جميع المستحقين.'
                        : ''
                }`,
                type: 'procedure',
                source: 'بطاقة الخصوم',
            };
            setTimelineEvents((prev) => {
                const next = [te, ...prev];
                const mergedFile = {
                    ...(base as Record<string, unknown>),
                    ...merge,
                    timelineEvents: next,
                };
                queueMicrotask(() => {
                    void persistExecutionMerge({ ...merge, timelineEvents: next });
                    if (executionDataRef) {
                        executionDataRef.current = mergedFile as ExecutionFile;
                    }
                    setAlimonyBeneficiaryDeathModalProfile(
                        resolveAlimonyBeneficiaryProfile(mergedFile),
                    );
                });
                return next;
            });
            showToast(
                merge.dossier_lifecycle_status === 'finished'
                    ? 'تم الإبلاغ وإغلاق الإضبارة — لا مستحقين متبقين.'
                    : 'تم الإبلاغ وتحديث مبالغ النفقة في المركز المالي.',
                'success',
            );
            return true;
        },
        [
            executionData,
            executionDataRef,
            nextTimelineId,
            persistExecutionMerge,
            setAlimonyBeneficiaryDeathModalProfile,
            showToast,
            setTimelineEvents,
        ],
    );

    const debtorSubstitutionRequestStatus = useMemo(
        () => getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch],
    );
    const creditorSubstitutionRequestStatus = useMemo(
        () => getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch],
    );

    const liveFlagsRef = useRef({
        creditorDeathMarked,
        debtorDeathMarked,
        heirSubstitutionAllowed,
        creditorSubstitutionRequestStatus,
        debtorSubstitutionRequestStatus,
        ongoingAlimonyClaim,
    });
    liveFlagsRef.current = {
        creditorDeathMarked,
        debtorDeathMarked,
        heirSubstitutionAllowed,
        creditorSubstitutionRequestStatus,
        debtorSubstitutionRequestStatus,
        ongoingAlimonyClaim,
    };

    const { handleRequestDebtorSubstitution, handleRequestCreditorSubstitution } =
        usePartyDeathSubstitutionHandlers({
            executionDataRef,
            executionData,
            claimType,
            creditors,
            debtors,
            decisionsStorageExecutionId,
            lastHeirSubRequestAtRef,
            debtorSubstitutionRequestStatus,
            creditorSubstitutionRequestStatus,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setTimelineEvents,
        });

    const actionsRef = useRef({
        handlePartyDeathSave,
        handleAlimonyBeneficiaryDeathConfirm,
        handleRequestDebtorSubstitution,
        handleRequestCreditorSubstitution,
    });
    actionsRef.current = {
        handlePartyDeathSave,
        handleAlimonyBeneficiaryDeathConfirm,
        handleRequestDebtorSubstitution,
        handleRequestCreditorSubstitution,
    };

    const handleCreditorDeathMenuAction = useCallback(() => {
        const {
            ongoingAlimonyClaim: alimony,
            heirSubstitutionAllowed: substitutionAllowed,
            creditorDeathMarked: deathMarked,
            creditorSubstitutionRequestStatus: substitutionStatus,
        } = liveFlagsRef.current;

        if (alimony) {
            const profileNow = resolveAlimonyBeneficiaryProfile(
                executionDataRef.current ?? executionData,
            );
            if (!profileNow) {
                showToast(
                    'لا تتوفر بيانات مستحقي النفقة في الإضبارة. راجع مبالغ الزوجة/الأولاد عند الإنشاء.',
                    'warning',
                );
                return;
            }
            if (!profileNow.anyBeneficiaryAlive) {
                showToast('جميع مستحقي النفقة مُسجَّلون متوفين.', 'info');
                return;
            }
            if (shouldShowAlimonyBeneficiaryDeathPicker(profileNow)) {
                setAlimonyBeneficiaryDeathModalProfile(profileNow);
                setAlimonyBeneficiaryDeathModalOpen(true);
                return;
            }
            const soleInput = buildSoleSurvivorDeathInput(profileNow);
            if (soleInput) {
                actionsRef.current.handleAlimonyBeneficiaryDeathConfirm(soleInput);
                return;
            }
            showToast('تعذّر تحديد مستحق النفقة المتبقي.', 'warning');
            return;
        }
        if (!substitutionAllowed) {
            actionsRef.current.handlePartyDeathSave({
                action: 'death_only',
                deceased_party: 'creditor',
            });
            return;
        }
        if (!deathMarked) {
            actionsRef.current.handlePartyDeathSave({
                action: 'death_only',
                deceased_party: 'creditor',
            });
            return;
        }
        const openId = findLatestHeirSubstitutionDecisionNeedingEntry(
            decisionsStorageExecutionId,
            'creditor',
        );
        if (openId) {
            if (typeof setPartyDeathModalParty === 'function') {
                setPartyDeathModalParty('creditor');
            }
            if (typeof setPartyDeathModalDecisionId === 'function') {
                setPartyDeathModalDecisionId(openId);
            }
            return;
        }
        const st = substitutionStatus;
        if (st === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return;
        }
        if (st === 'approved' || st === 'alternative') {
            showToast('تم إحلال ورثة الدائن مسبقاً.', 'info');
            return;
        }
        actionsRef.current.handleRequestCreditorSubstitution();
    }, [
        decisionsStorageExecutionId,
        executionData,
        executionDataRef,
        setAlimonyBeneficiaryDeathModalOpen,
        setAlimonyBeneficiaryDeathModalProfile,
        setPartyDeathModalDecisionId,
        setPartyDeathModalParty,
        showToast,
    ]);

    const handleDebtorDeathMenuAction = useCallback(() => {
        const {
            debtorDeathMarked: deathMarked,
            heirSubstitutionAllowed: substitutionAllowed,
            debtorSubstitutionRequestStatus: substitutionStatus,
        } = liveFlagsRef.current;

        if (!deathMarked) {
            actionsRef.current.handlePartyDeathSave({ action: 'death_only', deceased_party: 'debtor' });
            return;
        }
        if (!substitutionAllowed) {
            showToast('تم تسجيل وفاة المدين مسبقاً — لا إجراء إضافي في هذا النوع من المطالبة.', 'info');
            return;
        }
        const openId = findLatestHeirSubstitutionDecisionNeedingEntry(
            decisionsStorageExecutionId,
            'debtor',
        );
        if (openId) {
            if (typeof setPartyDeathModalParty === 'function') {
                setPartyDeathModalParty('debtor');
            }
            if (typeof setPartyDeathModalDecisionId === 'function') {
                setPartyDeathModalDecisionId(openId);
            }
            return;
        }
        const st = substitutionStatus;
        if (st === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return;
        }
        if (st === 'approved' || st === 'alternative') {
            showToast('تم إحلال ورثة المدين مسبقاً.', 'info');
            return;
        }
        actionsRef.current.handleRequestDebtorSubstitution();
    }, [
        decisionsStorageExecutionId,
        setPartyDeathModalDecisionId,
        setPartyDeathModalParty,
        showToast,
    ]);

    useEffect(() => {
        const openHandler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                party?: 'creditor' | 'debtor';
                decisionId?: string;
            }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionData?.id ?? executionId ?? '')) {
                return;
            }
            const p = ce.detail?.party;
            if (p !== 'creditor' && p !== 'debtor') return;
            setPartyDeathModalParty(p);
            const did = String(ce.detail?.decisionId ?? '').trim();
            setPartyDeathModalDecisionId(did || null);
        };
        window.addEventListener(HAMI_OPEN_PARTY_DEATH_MODAL, openHandler as EventListener);
        return () =>
            window.removeEventListener(HAMI_OPEN_PARTY_DEATH_MODAL, openHandler as EventListener);
    }, [executionData?.id, executionId, setPartyDeathModalDecisionId, setPartyDeathModalParty]);

    useEffect(() => {
        if (!partyDeathModalParty) return;
        if (partyDeathModalDecisionId) return;
        const st =
            partyDeathModalParty === 'creditor'
                ? creditorSubstitutionRequestStatus
                : debtorSubstitutionRequestStatus;
        if (st !== 'approved' && st !== 'alternative') return;
        const id = findLatestHeirSubstitutionDecisionNeedingEntry(
            decisionsStorageExecutionId,
            partyDeathModalParty,
        );
        if (id) setPartyDeathModalDecisionId(id);
    }, [
        creditorSubstitutionRequestStatus,
        debtorSubstitutionRequestStatus,
        decisionsStorageExecutionId,
        findLatestHeirSubstitutionDecisionNeedingEntry,
        partyDeathModalDecisionId,
        partyDeathModalParty,
        setPartyDeathModalDecisionId,
    ]);

    return {
        handlePartyDeathSave,
        handleAlimonyBeneficiaryDeathConfirm,
        handleRequestDebtorSubstitution,
        handleRequestCreditorSubstitution,
        handleCreditorDeathMenuAction,
        handleDebtorDeathMenuAction,
        debtorSubstitutionRequestStatus,
        creditorSubstitutionRequestStatus,
    };
}
