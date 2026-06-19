import React from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
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
                persistDecisionsToStorage(next);
                queueMicrotask(() => dispatchDecisionsReload());
                return next;
            });
        },
        [persistDecisionsToStorage]
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
            persistDecisionsToStorage(next);
            queueMicrotask(() => dispatchDecisionsReload());
            return next;
        });
    }, [persistDecisionsToStorage]);

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
            persistDecisionsToStorage(next);
            queueMicrotask(() => dispatchDecisionsReload());
            const archived = next.find((d) => d.id === id);
            if (archived) {
                applyPersonalCoerciveAppealClosure({
                    executionId,
                    row: archived as unknown as Record<string, unknown>,
                    allDecisions: next as unknown as Record<string, unknown>[],
                    forceClose: true,
                });
                applyEvictionAppealClosure({
                    executionId,
                    row: archived as unknown as Record<string, unknown>,
                    allDecisions: next as unknown as Record<string, unknown>[],
                    forceClose: true,
                });
            }
            queueMicrotask(() => setDecisionsHubTab('archive'));
            return next;
        });
    }, [executionId, persistDecisionsToStorage]);

    const handleAddDecision = () => {
        if (!newTitle.trim() || !newDate) {
            SmartToast.error('يرجى تعبئة العنوان والتاريخ على الأقل');
            return;
        }
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
        };
        
        const updated = [newDecision, ...decisions];
        setDecisions(updated);
        persistDecisionsToStorage(updated);
        dispatchDecisionsReload();
        
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
