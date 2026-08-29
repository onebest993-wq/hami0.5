/** وفاة الخصوم + إحلال الورثة + نفقة مستمرة — handlers وeffects */
import { useCallback, useEffect, useMemo, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
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
    type AlimonyBeneficiaryProfile,
} from '@/app/utils/alimonyBeneficiaryDeathUtils';
import { runPartyDeathSave } from './executionDashboardPartyDeathSave';
import { usePartyDeathSubstitutionHandlers } from './usePartyDeathSubstitutionHandlers';

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
    alimonyBeneficiaryProfile,
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
            const base = executionDataRef.current ?? executionData;
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
                persistExecutionMerge({ ...merge, timelineEvents: next });
                executionDataRef.current = mergedFile as ExecutionFile;
                setAlimonyBeneficiaryDeathModalProfile(
                    resolveAlimonyBeneficiaryProfile(mergedFile),
                );
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
    });
    liveFlagsRef.current = {
        creditorDeathMarked,
        debtorDeathMarked,
        heirSubstitutionAllowed,
        creditorSubstitutionRequestStatus,
        debtorSubstitutionRequestStatus,
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

    const handleCreditorDeathMenuAction = useCallback(() => {
        if (ongoingAlimonyClaim) {
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
                handleAlimonyBeneficiaryDeathConfirm(soleInput);
                return;
            }
            showToast('تعذّر تحديد مستحق النفقة المتبقي.', 'warning');
            return;
        }
        if (!heirSubstitutionAllowed) {
            handlePartyDeathSave({ action: 'death_only', deceased_party: 'creditor' });
            return;
        }
        if (!creditorDeathMarked) {
            handlePartyDeathSave({ action: 'death_only', deceased_party: 'creditor' });
            return;
        }
        const openId = findLatestHeirSubstitutionDecisionNeedingEntry(
            decisionsStorageExecutionId,
            'creditor',
        );
        if (openId) {
            setPartyDeathModalParty('creditor');
            setPartyDeathModalDecisionId(openId);
            return;
        }
        const st = creditorSubstitutionRequestStatus;
        if (st === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return;
        }
        if (st === 'approved') {
            showToast('تم إحلال ورثة الدائن مسبقاً.', 'info');
            return;
        }
        handleRequestCreditorSubstitution();
    }, [
        alimonyBeneficiaryProfile?.anyBeneficiaryAlive,
        creditorDeathMarked,
        creditorSubstitutionRequestStatus,
        decisionsStorageExecutionId,
        executionData,
        executionDataRef,
        handleAlimonyBeneficiaryDeathConfirm,
        handlePartyDeathSave,
        handleRequestCreditorSubstitution,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
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
            handlePartyDeathSave({ action: 'death_only', deceased_party: 'debtor' });
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
            setPartyDeathModalParty('debtor');
            setPartyDeathModalDecisionId(openId);
            return;
        }
        const st = substitutionStatus;
        if (st === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return;
        }
        handleRequestDebtorSubstitution();
    }, [
        decisionsStorageExecutionId,
        handlePartyDeathSave,
        handleRequestDebtorSubstitution,
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
        window.addEventListener('hami-open-party-death-modal', openHandler as EventListener);
        return () =>
            window.removeEventListener('hami-open-party-death-modal', openHandler as EventListener);
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
