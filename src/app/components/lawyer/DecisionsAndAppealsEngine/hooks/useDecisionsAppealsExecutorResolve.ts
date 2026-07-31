// @ts-nocheck
import React from 'react';
import { applyDossierSpecialFollowupOutcome } from '@/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome';
import {
    normalizeBaseDossierIdFromDecisionsKey,
} from '../engine/decisionsEngineTypes';
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
                const dossierId =
                    normalizeBaseDossierIdFromDecisionsKey(executionId) || String(executionId || '').trim();
                const subtype = String((row as any).seizureSubtype || '').trim();
                const resolvedSubtype = subtype
                    ? subtype
                    : /عقار/i.test(`${String(row.title || '')}\n${String(row.body || '')}`)
                      ? 'property'
                      : '';
                if (resolvedSubtype === 'property') {
                    const decisionId = String(row.id || '').trim();
                    if (!decisionId) return;
                    if (String((row as any).seizureRequestSavedAt || '').trim()) return;
                    try {
                        window.dispatchEvent(
                            new CustomEvent('hami-open-seized-property-init', {
                                detail: {
                                    executionId: dossierId,
                                    decisionId,
                                    subject: String(row.title || '').trim() || 'طلب حجز عقار',
                                },
                            })
                        );
                    } catch {}
                    dispatchExecutorToast('موافقة المنفذ على وضع إشارة الحجز — أكمل بيانات العقار.', 'success');
                }
                if (
                    resolvedSubtype === 'property_expert' ||
                    resolvedSubtype === 'property_auction' ||
                    resolvedSubtype === 'property_final_award' ||
                    resolvedSubtype === 'property_reauction_default'
                ) {
                    const rawJson = String((row as any).seizurePayloadJson || '').trim();
                    let seizedPropertyId = '';
                    let step: 'experts' | 'auction' | 'award' | 'reauction_default' | '' = '';
                    if (rawJson) {
                        try {
                            const v = JSON.parse(rawJson) as any;
                            seizedPropertyId = String(v?.seizedPropertyId ?? '').trim();
                        } catch {}
                    }
                    const rowId = String(row.id || '').trim();
                    if (!rowId) return;
                    if (String((row as any).seizureRequestSavedAt || '').trim()) return;
                    if (!seizedPropertyId) {
                        dispatchExecutorToast('طلب عقاري بدون ربط seizedPropertyId داخل القرار.');
                        return;
                    }
                    step =
                        resolvedSubtype === 'property_expert'
                            ? 'experts'
                            : resolvedSubtype === 'property_auction'
                              ? 'auction'
                              : resolvedSubtype === 'property_final_award'
                                ? 'award'
                                : 'reauction_default';
                    try {
                        window.dispatchEvent(
                            new CustomEvent('hami-open-seized-property-step', {
                                detail: {
                                    executionId: dossierId,
                                    decisionId: rowId,
                                    seizedPropertyId,
                                    step,
                                },
                            })
                        );
                    } catch {}
                    dispatchExecutorToast('موافقة المنفذ على خطوة عقارية — أكمل بيانات النتيجة.', 'success');
                }
            }

            /** التوجيه الذكي: طلبات تبويب «التحكم في الإضبارة» */
            if (row.requestKind === 'special_followup') {
                applyDossierSpecialFollowupOutcome({
                    executionId,
                    row: row as Record<string, unknown>,
                    resolution,
                });
            }
        },
        [executionId, resolveDecision, reloadFromStorage, setDecisions, setHubNoteById, setDecisionsHubTab]
    );

    return { handleExecutorResolveById };
}
