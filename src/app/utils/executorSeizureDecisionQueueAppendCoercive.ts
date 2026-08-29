/**
 * Personal-coercive / detention append helpers for the executor decision queue.
 */

import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    type PersonalCoerciveSubtype,
    assertDomainGate,
    buildPersonalCoerciveSubtypeMatcher,
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    isExecutiveDossierPresentationSubtype,
    isExecutorHubRowSuperseded,
    newExecutorDecisionId,
    persistExecutorDecisionsArray,
    readActiveExecutorDecisionsForMutate,
    supersedePriorExecutorHubRows,
    supersedeRejectedFinalExecutorHubRows,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import {
    getGoverningPersonalCoerciveSubtypeRow,
    isPersonalCoerciveSubtypeRowPending,
} from '@/app/utils/executorSeizureDecisionQueueRead';

export function appendPersonalCoerciveExecutorRequest(input: {
    executionId: string | undefined;
    subtype: PersonalCoerciveSubtype;
    title: string;
    body: string;
    /** ذمة مقسومة: مفتاح المدين المستهدف (اختياري للتوافق مع الطلبات القديمة) */
    debtorKey?: string;
    /** مفتاح المدين الأساسي (لتفسير الطلبات القديمة غير المقيّدة بمفتاح) */
    primaryDebtorKey?: string;
    encryptedPayloadJson?: string;
}): { ok: boolean; decisionId?: string } {
    if (
        !assertDomainGate(input.executionId, 'personal_coercive', {
            personalCoerciveSubtype: input.subtype,
        })
    ) {
        return { ok: false };
    }
    const normalizeDebtorKey = (v: unknown): string =>
        String(v ?? '').trim();
    const targetDebtorKey = normalizeDebtorKey(input.debtorKey);
    const primaryDebtorKey = normalizeDebtorKey(input.primaryDebtorKey);
    const rowMatchesDebtorScope = (row: Record<string, unknown>): boolean => {
        if (!targetDebtorKey) return true;
        const rowDebtorKey = normalizeDebtorKey(
            (row as { personalCoerciveDebtorKey?: string }).personalCoerciveDebtorKey
        );
        if (rowDebtorKey) return rowDebtorKey === targetDebtorKey;
        return Boolean(primaryDebtorKey) && targetDebtorKey === primaryDebtorKey;
    };
    try {
        let arr = readActiveExecutorDecisionsForMutate(input.executionId);
        const matchesPersonalCoerciveScope = (x: Record<string, unknown>) => {
            if (String(x.requestKind || '') !== 'personal_coercive') return false;
            if (!rowMatchesDebtorScope(x)) return false;
            const sub = String(x.personalCoerciveSubtype || '');
            if (sub === input.subtype) return true;
            if (
                (input.subtype === 'executive_detention' ||
                    input.subtype === 'executive_dossier_presentation') &&
                (sub === 'executive_detention_judge' ||
                    sub === 'executive_detention' ||
                    sub === 'executive_dossier_presentation')
            ) {
                return (
                    sub === 'executive_detention_judge' ||
                    isExecutiveDossierPresentationSubtype(sub)
                );
            }
            return false;
        };
        arr = supersedePriorExecutorHubRows(arr, matchesPersonalCoerciveScope);
        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;
        const dup = arr.some(
            (x) =>
                isPending(x) &&
                x.requestKind === 'personal_coercive' &&
                x.personalCoerciveSubtype === input.subtype &&
                rowMatchesDebtorScope(x)
        );
        if (dup) {
            const existing = arr.find(
                (x) =>
                    isPending(x) &&
                    x.requestKind === 'personal_coercive' &&
                    x.personalCoerciveSubtype === input.subtype &&
                    rowMatchesDebtorScope(x)
            ) as { id?: string } | undefined;
            const existingId = String(existing?.id ?? '').trim();
            if (existingId) {
                dispatchDecisionsReload();
                return { ok: true, decisionId: existingId };
            }
            dispatchDecisionsReload();
            return { ok: false };
        }
        const decisionId = newExecutorDecisionId('personal_coercive');
        const row = {
            id: decisionId,
            title: input.title,
            body: input.body,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'personal_coercive' as const,
            appealRequestOrigin: 'creditor_side' as const,
            personalCoerciveSubtype: input.subtype,
            ...(targetDebtorKey ? { personalCoerciveDebtorKey: targetDebtorKey } : {}),
            ...(String(input.encryptedPayloadJson || '').trim()
                ? { encryptedPayloadJson: input.encryptedPayloadJson }
                : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

/** تسجيل قرار قاضي البداءة بالحبس — صف مستقل عن موافقة المنفذ على عرض الإضبارة */
export function appendExecutiveDetentionJudgeDecision(input: {
    executionId: string | undefined;
    parentExecutorDecisionId: string;
    outcome: 'approved' | 'rejected';
    rejectionReason?: string;
    debtorKey?: string;
}): { ok: boolean; decisionId?: string } {
    const executionId = input.executionId;
    const parentId = String(input.parentExecutorDecisionId || '').trim();
    if (!executionId || !parentId) return { ok: false };

    const normalizeDebtorKey = (v: unknown): string => String(v ?? '').trim();
    const targetDebtorKey = normalizeDebtorKey(input.debtorKey);

    try {
        let arr = readActiveExecutorDecisionsForMutate(executionId);
        const now = new Date().toISOString();
        arr = arr.map((row) => {
            if (String(row.personalCoerciveSubtype || '') !== 'executive_detention_judge') {
                return row;
            }
            if (
                String((row as { parentExecutorDecisionId?: string }).parentExecutorDecisionId || '') !==
                parentId
            ) {
                return row;
            }
            if (isExecutorHubRowSuperseded(row)) return row;
            return {
                ...row,
                requestCycleSuperseded: true,
                requestCycleSupersededAt: now,
                isArchived: true,
            };
        });

        const existing = arr.find(
            (row) =>
                String(row.personalCoerciveSubtype || '') === 'executive_detention_judge' &&
                String((row as { parentExecutorDecisionId?: string }).parentExecutorDecisionId || '') ===
                    parentId &&
                !isExecutorHubRowSuperseded(row)
        ) as { id?: string } | undefined;
        if (existing) {
            dispatchDecisionsReload();
            return { ok: true, decisionId: String(existing.id || '').trim() || undefined };
        }

        const today = getLocalTodayYmd();
        const decisionId = newExecutorDecisionId('personal_coercive');
        const outcome = input.outcome;
        const reason = String(input.rejectionReason || '').trim();
        const row = {
            id: decisionId,
            title:
                outcome === 'approved'
                    ? 'قرار قاضي البداءة — الموافقة على حبس المدين'
                    : 'قرار قاضي البداءة — رفض حبس المدين',
            body:
                outcome === 'rejected' && reason
                    ? `سبب الرفض: ${reason}`
                    : outcome === 'approved'
                      ? 'وافق قاضي البداءة على حبس المدين التنفيذي بعد عرض الإضبارة.'
                      : 'رفض قاضي البداءة طلب حبس المدين التنفيذي.',
            date: today,
            resolvedAt: now,
            appealStatus: 'pending' as const,
            executorOutcome: outcome,
            status: outcome === 'approved' ? 'accepted' : 'rejected',
            requestKind: 'personal_coercive' as const,
            personalCoerciveSubtype: 'executive_detention_judge' as const,
            parentExecutorDecisionId: parentId,
            appealRequestOrigin: 'creditor_side' as const,
            appealBaseBranch: outcome === 'approved' ? 'after_approval' : 'after_rejection',
            cassationOnlyAppeal: true,
            executiveDetentionJudgeOutcome: outcome,
            appealPhase: null,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            noAppealChosen: false,
            ...(targetDebtorKey ? { personalCoerciveDebtorKey: targetDebtorKey } : {}),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

export function appendPersonalCoerciveByExecutorOrder(input: {
    executionId: string | undefined;
    subtype: PersonalCoerciveSubtype;
    title: string;
    body: string;
    debtorKey?: string;
    primaryDebtorKey?: string;
}): { ok: boolean; decisionId?: string } {
    if (
        !assertDomainGate(input.executionId, 'personal_coercive', {
            personalCoerciveSubtype: input.subtype,
        })
    ) {
        return { ok: false };
    }
    const governing = getGoverningPersonalCoerciveSubtypeRow(input.executionId, input.subtype, {
        debtorKey: input.debtorKey,
        primaryDebtorKey: input.primaryDebtorKey,
    });
    if (governing && isPersonalCoerciveSubtypeRowPending(governing)) {
        dispatchDecisionsReload();
        return { ok: false };
    }

    const normalizeDebtorKey = (v: unknown): string => String(v ?? '').trim();
    const targetDebtorKey = normalizeDebtorKey(input.debtorKey);
    const matches = buildPersonalCoerciveSubtypeMatcher(input);
    try {
        let arr = readActiveExecutorDecisionsForMutate(input.executionId);
        arr = supersedePriorExecutorHubRows(arr, matches);
        arr = supersedeRejectedFinalExecutorHubRows(arr, matches);
        const nowIso = new Date().toISOString();
        const today = getLocalTodayYmd();
        const decisionId = newExecutorDecisionId('personal_coercive');
        const row = {
            id: decisionId,
            title: input.title,
            body: input.body,
            date: today,
            resolvedAt: nowIso,
            appealStatus: 'pending' as const,
            executorOutcome: 'approved' as const,
            status: 'accepted' as const,
            appealBaseBranch: 'after_approval' as const,
            appealRequestOrigin: 'executor_side' as const,
            activatedByExecutorOrder: true,
            requestKind: 'personal_coercive' as const,
            personalCoerciveSubtype: input.subtype,
            appealPhase: null,
            ...(targetDebtorKey ? { personalCoerciveDebtorKey: targetDebtorKey } : {}),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}
