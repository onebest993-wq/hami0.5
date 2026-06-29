import React from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { resolveActiveDecisionsNamespaceSlug } from '@/app/utils/executionDecisionsNamespace';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import type { Decision } from '../types';
import { newEventId } from '../utils';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsRowMutations(params: DecisionsAppealsMutationsCoreParams) {
    const {
        decisions,
        setDecisions,
        persistDecisionsToStorage,
        onTimelineUpdate,
        getMilestoneTimelineSnapshot,
        setDecisionsHubTab,
        executionId,
        getEffectiveExecutionData,
        resolveWritableExecutionId,
        newTitle,
        newBody,
        newDate,
        resetAddDecisionForm,
        setShowAddModal,
    } = params;

    const patchDecisionRow = React.useCallback(
        (decisionId: string, patch: Partial<Decision>) => {
            setDecisions((prev) => {
                const next = prev.map((d) => (d.id === decisionId ? { ...d, ...patch } : d));
                return persistDecisionsToStorage(next) ?? next;
            });
        },
        [persistDecisionsToStorage, setDecisions]
    );

    const logAppealTimeline = React.useCallback(
        (title: string, description?: string) => {
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title,
                description: [description, `التوقيت: ${when}`].filter(Boolean).join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
        },
        [onTimelineUpdate]
    );

    const handleDeleteDecision = React.useCallback((id: string) => {
        setDecisions((prev) => {
            const next = prev.filter((d) => d.id !== id);
            return persistDecisionsToStorage(next, { removedIds: [id] }) ?? next;
        });
    }, [persistDecisionsToStorage, setDecisions]);

    const handleArchiveDecision = React.useCallback((id: string) => {
        setDecisions((prev) => {
            const now = new Date().toISOString();
            const next = prev.map((d) =>
                d.id === id
                    ? {
                          ...d,
                          isArchived: true,
                          requestCycleSuperseded: true,
                          requestCycleSupersededAt: now,
                      }
                    : d
            );
            const synced = persistDecisionsToStorage(next) ?? next;
            const archived = synced.find((d) => d.id === id);
            if (archived) {
                applyPersonalCoerciveAppealClosure({
                    executionId,
                    row: archived as unknown as Record<string, unknown>,
                    allDecisions: synced as unknown as Record<string, unknown>[],
                    forceClose: true,
                });
                applyEvictionAppealClosure({
                    executionId,
                    row: archived as unknown as Record<string, unknown>,
                    allDecisions: synced as unknown as Record<string, unknown>[],
                    forceClose: true,
                });
            }
            queueMicrotask(() => setDecisionsHubTab('archive'));
            return synced;
        });
    }, [executionId, persistDecisionsToStorage, setDecisions, setDecisionsHubTab]);

    const handleAddDecision = () => {
        if (!newTitle.trim() || !newDate) {
            SmartToast.error('يرجى تعبئة العنوان والتاريخ على الأقل');
            return;
        }
        const executionData = getEffectiveExecutionData();
        const persistId =
            resolveWritableExecutionId() ??
            resolveDecisionsStorageExecutionId(executionId, executionData);
        if (!persistId || persistId === 'default') {
            SmartToast.error('تعذّر حفظ القرار — لم يُحدَّد ملف التنفيذ بعد');
            return;
        }
        const domainNamespace = resolveActiveDecisionsNamespaceSlug(persistId, executionData);
        const newDecision: Decision = {
            id: (globalThis as any).crypto?.randomUUID?.() ? (globalThis as any).crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            title: newTitle,
            body: newBody,
            date: newDate,
            manualExecutorLedgerEntry: true,
            executorDecisionStatusFlag: 1,
            appealStatus: 'pending',
            appealPhase: null,
            appealWorkflowState: 'NONE',
            domainNamespace,
        };

        const updated = [newDecision, ...decisions];
        let merged = persistDecisionsToStorage(updated);
        if (!merged) {
            merged = persistDecisionsToStorage(updated);
        }
        if (!merged) {
            SmartToast.error('تعذّر حفظ القرار — أعد فتح الإضبارة وحاول مجدداً');
            return;
        }
        setDecisions(merged);

        const now = new Date().toISOString();
        const milestoneSnap = getMilestoneTimelineSnapshot?.();
        onTimelineUpdate({
            id: newEventId(),
            date: newDate,
            timestamp: now,
            title: `إضافة قرار منفذ العدل: ${newTitle}`,
            description: `تاريخ القرار: ${new Date(newDate).toLocaleDateString('ar-EG')}${newBody.trim() ? `\n${newBody.trim()}` : ''}`,
            type: 'decision',
            source: 'القرارات والطعون',
            ...(milestoneSnap !== undefined ? { snapshot: milestoneSnap } : {}),
        });
        
        resetAddDecisionForm();
        setShowAddModal(false);
        setDecisionsHubTab('previous');
    };

    return {
        patchDecisionRow,
        logAppealTimeline,
        handleDeleteDecision,
        handleArchiveDecision,
        handleAddDecision,
    };
}
