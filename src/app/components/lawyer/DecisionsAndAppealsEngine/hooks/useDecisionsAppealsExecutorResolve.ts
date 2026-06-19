import React from 'react';
import { applyDossierSpecialFollowupOutcome } from '@/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome';
import type { Decision } from '../types';
import {
    normalizeBaseDossierIdFromDecisionsKey,
    dispatchHeirSubstitutionOutcomeIfAny,
} from '../engine/decisionsEngineTypes';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsExecutorResolve(params: DecisionsAppealsMutationsCoreParams) {
    const {
        executionId,
        decisions,
        resolveDecision,
        hubNoteById,
        setHubNoteById,
        setDecisionsHubTab,
        reloadFromStorage,
    } = params;

    const handleExecutorResolveById = React.useCallback(
        (id: string, resolution: 'approved' | 'rejected') => {
            const row = decisions.find((d) => d.id === id);
            if (!row) return;
            resolveDecision({
                row,
                resolution,
                executorNote: hubNoteById[id],
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
                const dispatchToast = (msg: string, type: 'success' | 'warning' | 'info' = 'success') => {
                    try {
                        window.dispatchEvent(new CustomEvent('hami-toast', { detail: { message: msg, type } }));
                    } catch {}
                };
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
                    dispatchToast('موافقة المنفذ على وضع إشارة الحجز — أكمل بيانات العقار.', 'success');
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
                        dispatchToast('طلب عقاري بدون ربط seizedPropertyId داخل القرار.', 'warning');
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
                    dispatchToast('موافقة المنفذ على خطوة عقارية — أكمل بيانات النتيجة.', 'success');
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
        [decisions, executionId, hubNoteById, resolveDecision, reloadFromStorage]
    );

    return { handleExecutorResolveById };
}
