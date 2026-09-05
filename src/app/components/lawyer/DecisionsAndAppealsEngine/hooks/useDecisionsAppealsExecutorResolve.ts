import React from 'react';
import { applyDossierSpecialFollowupOutcome } from '@/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export type ExecutorResolveOptions = {
    executorNote?: string;
    requireReasoning?: boolean;
};

function dispatchExecutorToast(message: string, type: 'success' | 'warning' | 'info' = 'warning'): void {
    try {
        window.dispatchEvent(new CustomEvent('hami-toast', { detail: { message, type } }));
    } catch {
        /* ignore */
    }
}

export function useDecisionsAppealsExecutorResolve(params: DecisionsAppealsMutationsCoreParams) {
    const {
        executionId,
        decisions,
        setDecisions,
        resolveDecision,
        hubNoteById,
        setHubNoteById,
        setDecisionsHubTab,
        reloadFromStorage,
    } = params;

    const hubNoteByIdRef = React.useRef(hubNoteById);
    hubNoteByIdRef.current = hubNoteById;

    const decisionsRef = React.useRef(decisions);
    decisionsRef.current = decisions;

    const handleExecutorResolveById = React.useCallback(
        (id: string, resolution: 'approved' | 'rejected', options?: ExecutorResolveOptions) => {
            const row = decisionsRef.current.find((d) => d.id === id);
            if (!row) return;

            const note = String(options?.executorNote ?? hubNoteByIdRef.current[id] ?? '').trim();
            if (options?.requireReasoning && !note) {
                dispatchExecutorToast('اكتب تسبيب المنفذ قبل الإرسال');
                return;
            }

            const resolvedAt = new Date().toISOString();
            setDecisions((prev) =>
                prev.map((d) =>
                    String(d.id) === id
                        ? {
                              ...d,
                              executorOutcome: resolution,
                              executorNote: note || undefined,
                              status: resolution === 'approved' ? 'accepted' : 'rejected',
                              resolvedAt,
                          }
                        : d
                )
            );

            resolveDecision({
                row,
                resolution,
                executorNote: note,
            });

            queueMicrotask(() => reloadFromStorage());
            setHubNoteById((p) => {
                const n = { ...p };
                delete n[id];
                return n;
            });
            if (resolution === 'approved') {
                queueMicrotask(() => setDecisionsHubTab('previous'));
            }
            if (resolution === 'approved' && row.requestKind === 'seizure') {
                // طلبات الحجز تبقى صفوفاً في المركز فقط — بلا فتح سجل/إكمال مسار
                return;
            }

            /** التوجيه الذكي: طلبات تبويب «التحكم في الإضبارة» */
            if (row.requestKind === 'special_followup') {
                applyDossierSpecialFollowupOutcome({
                    executionId,
                    row: row as unknown as Record<string, unknown>,
                    resolution,
                });
            }
        },
        [executionId, resolveDecision, reloadFromStorage, setDecisions, setHubNoteById, setDecisionsHubTab]
    );

    return { handleExecutorResolveById };
}
