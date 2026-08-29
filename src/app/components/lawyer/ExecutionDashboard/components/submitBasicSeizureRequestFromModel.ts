import React from 'react';
import {
    appendPendingExecutorSeizureDecision,
    type SeizureRequestSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isSalarySeizureLaneOccupied } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import { buildSeizureRegistryDraftPatch } from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureRegistryBridge';
import {
    buildPendingSeizureDraftAsset,
    mergeSeizureDraftPatch,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export function submitBasicSeizureRequestFromModel(input: {
    resolvedExecutionId: string;
    executionData: ExecutionFile | null | undefined;
    activeDebtorIsDeceased: boolean;
    nextTimelineId: () => string;
    persistExecutionMerge?: ((patch: Record<string, unknown>) => unknown) | undefined;
    pushTimelineEvent: (event: TimelineEvent) => void;
    showToast: (message: string, type?: string) => void;
    args: {
        actionType: 'salary' | 'property' | 'vehicle' | 'third_party';
        title: string;
        body: string;
        subtype: SeizureRequestSubtype;
    };
}): string | null {
    const {
        resolvedExecutionId: exId,
        executionData,
        activeDebtorIsDeceased,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast,
        args,
    } = input;
    if (!exId) return null;
    if (
        args.actionType === 'salary' &&
        isSalarySeizureLaneOccupied({
            seizedAssets: executionData?.seizedAssets,
            seizureDraftsByDecisionId: executionData?.seizureDraftsByDecisionId as
                | Record<string, import('@/app/types/execution').SeizedAsset>
                | undefined,
        })
    ) {
        showToast('يوجد حجز راتب نشط أو طلب قيد البت — لا يمكن التكرار قبل فك الحجز.', 'warning');
        return null;
    }
    const decisionId = appendPendingExecutorSeizureDecision({
        executionId: exId,
        requestTitle: `${args.title} — قيد البت لدى المنفذ`,
        requestBody: args.body,
        seizureSubtype: args.subtype,
    });
    if (!decisionId) {
        showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
        return null;
    }
    const nowIso = new Date().toISOString();
    pushTimelineEvent({
        id: nextTimelineId(),
        type: 'decision',
        title: `📋 ${args.title} — قيد البت`,
        description: args.body,
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        source: 'التنفيذ والمحجوزات',
        metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
    });
    showToast('تم إنشاء الطلب — قرار المنفذ يظهر هنا مباشرة.', 'success');
    if (persistExecutionMerge && decisionId) {
        if (args.actionType === 'third_party') {
            const draftPatch = buildSeizureRegistryDraftPatch(
                executionData as Record<string, unknown> | null | undefined,
                decisionId,
                'third_party',
                { title: args.title },
            );
            if (draftPatch) persistExecutionMerge(draftPatch);
        } else {
            const uiActionType =
                args.actionType === 'vehicle' ? 'vehicle' : args.actionType === 'salary' ? 'salary' : 'property';
            const draft = buildPendingSeizureDraftAsset({
                decisionId,
                actionType: uiActionType,
                activeDebtorIsDeceased,
            });
            const nextDrafts = mergeSeizureDraftPatch(
                executionData?.seizureDraftsByDecisionId as
                    | Record<string, import('@/app/types/execution').SeizedAsset>
                    | undefined,
                decisionId,
                draft,
            );
            persistExecutionMerge({ seizureDraftsByDecisionId: nextDrafts });
        }
    }
    return decisionId;
}
