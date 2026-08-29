import React from 'react';
import {
    DECISIONS_RELOAD_EVENT,
    dispatchDecisionsReload,
} from '@/app/utils/executorSeizureDecisionQueue';
import { readSeizureWorkflowLiveDecisions } from './seizureWorkflowLiveDecisions';
import { createSeizureWorkflowEngine } from './seizureWorkflowEngine';
import {
    executorSubtypesForWorkflowStatus,
    executorSubtypesForWorkflowStep,
    filterRelevantPendingDecisions,
    workflowActiveStepIndex,
} from './seizureWorkflowDecisionQueries';
import { normalizeSeizureWorkflowStatus } from './seizureWorkflowStatus';
import {
    readSeizureWorkflowOptimisticPending,
    writeSeizureWorkflowOptimisticPending,
} from './seizureWorkflowOptimisticPendingSession';
import type { SeizureAssetKind, SeizureEntityBase, SeizureWorkflowDossierInput } from './seizureWorkflowTypes';

export type SeizureAssetWorkflowPanelCoreInput = {
    assetKind: SeizureAssetKind;
    entity: SeizureEntityBase;
    entityId: string;
    /** حالة المسار من الأب — تُستخدم فقط إن لم تُحدَّث entity.status بعد الحفظ الفوري */
    workflowStatus?: string;
    decisions: Array<Record<string, unknown>>;
    decisionsReloadEpoch?: number;
    dossierInput: SeizureWorkflowDossierInput;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    inlineUpdatedEventNames?: string[];
    inlineFocusEventName?: string;
};

/**
 * نواة موحّدة لحالة لوحة دورة الحجز — dossier، optimistic، focus، outcome.
 * واجهات المنقول/العقار تبقى رقيقة فوق هذا الـ hook.
 */
export function useSeizureAssetWorkflowPanelCore(input: SeizureAssetWorkflowPanelCoreInput) {
    const entityId = String(input.entityId || '').trim();
    const engine = React.useMemo(
        () =>
            createSeizureWorkflowEngine({
                assetKind: input.assetKind,
                dossierInput: input.dossierInput,
            }),
        [
            input.assetKind,
            input.dossierInput.decisionsStorageExecutionId,
            input.dossierInput.executionId,
            input.dossierInput.executionDataId,
            input.dossierInput.executionData,
        ],
    );

    const dossierId = React.useMemo(() => engine.resolveDossierId(), [engine]);
    const normStatus = normalizeSeizureWorkflowStatus(
        String(input.entity.status || input.workflowStatus || 'seized').trim() || 'seized',
    );

    const [inlineLiveTick, setInlineLiveTick] = React.useState(0);
    const [decisionsLiveTick, setDecisionsLiveTick] = React.useState(0);
    const inlineEvents = input.inlineUpdatedEventNames ?? [
        input.assetKind === 'movable' ? 'hami-seized-movable-inline-updated' : 'hami-seized-property-inline-updated',
        input.assetKind === 'movable' ? 'hami-seized-movable-init-saved' : 'hami-seized-property-init-saved',
    ];
    const focusEvent =
        input.inlineFocusEventName ??
        (input.assetKind === 'movable' ? 'hami-movable-inline-focus' : 'hami-property-inline-focus');
    const focusEntityKey = engine.inlineFocusEntityKey();

    const workflowDecisions = React.useMemo(
        () => readSeizureWorkflowLiveDecisions(input.dossierInput, input.decisions),
        [
            input.dossierInput.decisionsStorageExecutionId,
            input.dossierInput.executionId,
            input.dossierInput.executionDataId,
            input.dossierInput.executionData,
            input.decisions,
            input.decisionsReloadEpoch,
            inlineLiveTick,
            decisionsLiveTick,
        ],
    );

    React.useEffect(() => {
        const bump = () => setDecisionsLiveTick((t) => t + 1);
        window.addEventListener(DECISIONS_RELOAD_EVENT, bump);
        return () => window.removeEventListener(DECISIONS_RELOAD_EVENT, bump);
    }, []);

    React.useEffect(() => {
        const onInline = (e: Event) => {
            const ce = e as CustomEvent<Record<string, string>>;
            if (String(ce.detail?.[focusEntityKey] || '').trim() !== entityId) return;
            setInlineLiveTick((t) => t + 1);
        };
        for (const name of inlineEvents) {
            window.addEventListener(name, onInline as EventListener);
        }
        return () => {
            for (const name of inlineEvents) {
                window.removeEventListener(name, onInline as EventListener);
            }
        };
    }, [entityId, inlineEvents, focusEntityKey]);

    const activeIdx = workflowActiveStepIndex(normStatus, input.entity);

    const relevantPendingRows = React.useMemo(() => {
        const allowed = executorSubtypesForWorkflowStatus(engine.plugin, normStatus, input.entity);
        return filterRelevantPendingDecisions(
            workflowDecisions,
            engine.plugin,
            input.entity,
            entityId,
            allowed,
        );
    }, [workflowDecisions, input.entity, entityId, normStatus, engine.plugin, input.decisionsReloadEpoch]);

    const [workflowExpanded, setWorkflowExpanded] = React.useState(
        () => relevantPendingRows.length > 0 || activeIdx >= 0,
    );

    React.useEffect(() => {
        if (relevantPendingRows.length > 0) setWorkflowExpanded(true);
    }, [relevantPendingRows.length]);

    const [inlineFocusKey, setInlineFocusKey] = React.useState<string | null>(null);
    const [pendingDecisionId, setPendingDecisionId] = React.useState<string | null>(null);
    const [optimisticPendingBySubtype, setOptimisticPendingBySubtype] = React.useState<
        Record<string, string>
    >(() => readSeizureWorkflowOptimisticPending(input.assetKind, entityId));
    const [optimisticObjectionDecisionId, setOptimisticObjectionDecisionId] = React.useState<
        string | null
    >(null);

    React.useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                step?: string;
                decisionId?: string;
                [key: string]: string | undefined;
            }>;
            if (String(ce.detail?.[focusEntityKey] || '').trim() !== entityId) return;
            setWorkflowExpanded(true);
            setInlineFocusKey(String(ce.detail?.step || 'experts').trim());
            setPendingDecisionId(String(ce.detail?.decisionId || '').trim() || null);
        };
        window.addEventListener(focusEvent, handler as EventListener);
        return () => window.removeEventListener(focusEvent, handler as EventListener);
    }, [entityId, focusEvent, focusEntityKey]);

    React.useEffect(() => {
        setOptimisticPendingBySubtype((prev) => {
            if (!Object.keys(prev).length) return prev;
            const next: Record<string, string> = { ...prev };
            let changed = false;
            for (const subtype of Object.keys(next)) {
                const optId = String(next[subtype] || '').trim();
                if (!optId) {
                    delete next[subtype];
                    changed = true;
                    continue;
                }
                const synced = workflowDecisions.some(
                    (row) => String((row as { id?: string }).id || '').trim() === optId,
                );
                if (synced) {
                    delete next[subtype];
                    changed = true;
                }
            }
            if (changed) {
                writeSeizureWorkflowOptimisticPending(input.assetKind, entityId, next);
                return next;
            }
            return prev;
        });
    }, [workflowDecisions, entityId, input.decisionsReloadEpoch, input.assetKind]);

    React.useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                decisionId?: string;
                outcome?: string;
            }>;
            const evId = String(ce.detail?.executionId || '').trim();
            if (evId && evId !== dossierId) return;
            const did = String(ce.detail?.decisionId || '').trim();
            if (!did) return;
            setOptimisticPendingBySubtype((prev) => {
                const next = { ...prev };
                let changed = false;
                for (const subtype of Object.keys(next)) {
                    if (String(next[subtype] || '').trim() === did) {
                        delete next[subtype];
                        changed = true;
                    }
                }
                if (changed) {
                    writeSeizureWorkflowOptimisticPending(input.assetKind, entityId, next);
                    return next;
                }
                return prev;
            });
            if (String(ce.detail?.outcome || '') === 'approved') {
                setOptimisticObjectionDecisionId((prev) =>
                    String(prev || '').trim() === did ? null : prev,
                );
            }
        };
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () =>
            window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [dossierId, input.assetKind, entityId]);

    const submitSubtype = React.useCallback(
        (
            lead: string,
            requestTitle: string,
            subtype: string,
            extraLines?: string[],
            payloadExtra?: Record<string, unknown>,
        ): string | null => {
            if (!engine.isValidDossier(dossierId)) {
                input.showToast('تعذر ربط الطلب بملف التنفيذ. أعد فتح المحضر.', 'warning');
                return null;
            }
            const body = [
                engine.plugin.seizureRequestBody(input.entity, lead),
                ...(extraLines || []).filter(Boolean),
            ].join('\n');
            const result = engine.submitPendingRequest({
                entityId,
                subtype,
                requestTitle,
                requestBody: body,
                payloadExtra,
                decisions: workflowDecisions,
                dossierId,
            });
            if (result.error === 'conflict') {
                const conflictSubtype = String(result.conflictSubtype || subtype).trim();
                input.showToast(
                    `لا يمكن إرسال هذا الطلب: يوجد «${engine.conflictLabel(conflictSubtype)}» قيد البت لدى المنفذ. اسحب الطلب السابق أولاً.`,
                    'warning',
                );
                return null;
            }
            if (result.error === 'duplicate' || !result.ok) {
                input.showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                return null;
            }
            const did = result.decisionId;
            if (!did) return null;
            setOptimisticPendingBySubtype((prev) => {
                const next = { ...prev, [subtype]: did };
                writeSeizureWorkflowOptimisticPending(input.assetKind, entityId, next);
                return next;
            });
            setWorkflowExpanded(true);
            setDecisionsLiveTick((t) => t + 1);
            dispatchDecisionsReload();
            input.showToast('تم إرسال الطلب — قرار المنفذ يظهر أدناه.', 'success');
            return did;
        },
        [engine, dossierId, input.entity, entityId, workflowDecisions, input.showToast, input.assetKind],
    );

    const hasPendingSubtype = React.useCallback(
        (subtype: string) => {
            const st = String(subtype || '').trim();
            if (String(optimisticPendingBySubtype[st] || '').trim()) return true;
            return Boolean(
                engine.findDecision(workflowDecisions, st, entityId, { pendingOnly: true }),
            );
        },
        [engine, workflowDecisions, entityId, optimisticPendingBySubtype, input.decisionsReloadEpoch],
    );

    const hasAnyPendingForStep = React.useCallback(
        (stepIndex: number) =>
            executorSubtypesForWorkflowStep(engine.plugin, stepIndex).some((subtype) =>
                hasPendingSubtype(subtype),
            ),
        [engine.plugin, hasPendingSubtype],
    );

    const handleWithdrawPendingForStep = React.useCallback(
        (stepIndex: number) => {
            const subtypes = executorSubtypesForWorkflowStep(engine.plugin, stepIndex);
            const withdrawn = engine.withdrawPendingForStep(
                dossierId,
                workflowDecisions,
                entityId,
                stepIndex,
                subtypes,
            );
            if (withdrawn > 0) {
                writeSeizureWorkflowOptimisticPending(input.assetKind, entityId, {});
                setOptimisticPendingBySubtype({});
                setOptimisticObjectionDecisionId(null);
                setDecisionsLiveTick((t) => t + 1);
                input.showToast('تم سحب الطلب المعلّق لدى المنفذ.', 'success');
                return true;
            }
            input.showToast('لا يوجد طلب معلّق لسحبه.', 'info');
            return false;
        },
        [engine, dossierId, workflowDecisions, entityId, input.showToast, input.assetKind],
    );

    const hasWithdrawablePending =
        relevantPendingRows.length > 0 ||
        Boolean(String(optimisticObjectionDecisionId || '').trim()) ||
        Object.keys(optimisticPendingBySubtype).length > 0;

    return {
        engine,
        dossierId,
        normStatus,
        inlineLiveTick,
        workflowDecisions,
        activeIdx,
        relevantPendingRows,
        workflowExpanded,
        setWorkflowExpanded,
        inlineFocusKey,
        setInlineFocusKey,
        pendingDecisionId,
        setPendingDecisionId,
        optimisticPendingBySubtype,
        setOptimisticPendingBySubtype,
        optimisticObjectionDecisionId,
        setOptimisticObjectionDecisionId,
        submitSubtype,
        hasPendingSubtype,
        hasAnyPendingForStep,
        handleWithdrawPendingForStep,
        hasWithdrawablePending,
        executorSubtypesForStep: (stepIndex: number) =>
            executorSubtypesForWorkflowStep(engine.plugin, stepIndex),
    };
}
