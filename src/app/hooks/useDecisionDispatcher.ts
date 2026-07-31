import { useCallback } from 'react';
import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';
import { stripPendingLabelsFromExecutorSubject } from '@/app/utils/executorDecisionTitles';
import {
    inferExecutorDispatcherRoute,
    isGuarantorRequestDecisionRow,
    patchExecutorDecisionRowReliable,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    applyPersonalCoerciveExecutorOutcome,
    buildPersonalCoerciveExecutionMerge,
} from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import {
    buildExecutionMergeForCreditorHeirSubstitutionApproval,
    buildExecutionMergeForCreditorPartyDeath,
    parseCreditorPartyDeathPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    handleExecutorApproval,
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
    type ExecutorApprovalActions,
} from '@/app/utils/executorApprovalWorkflow';
import {
    buildResidentialGraceEarlyEndApprovalMerge,
    dispatchResidentialGraceCleared,
} from '@/app/utils/residentialEvictionGrace';

function cleanSeizureTypePendingSuffix(t: string): string {
    return t
        .replace(/\s*\(\s*قيد\s*البت\s*\)\s*/gi, '')
        .replace(/\s*قيد\s*البت\s*/gi, '')
        .trim();
}

function baseSeizureLabelFromType(tRaw: string): string {
    const t = cleanSeizureTypePendingSuffix(tRaw);
    if (/راتب|خُمس|خمس/i.test(t) || /حجز راتب/i.test(t)) return 'طلب حجز راتب';
    if (/منقول|مركبة|مال منقول/i.test(t)) return 'طلب حجز مال منقول';
    if (/عقار/i.test(t)) return 'طلب حجز عقار';
    return t || tRaw;
}

function coerciveKeyForSeizureDraft(asset: Pick<SeizedAsset, 'type'>): 'salary' | 'property' | 'vehicle' | null {
    const t = String(asset.type || '');
    if (/راتب|خُمس|خمس|حجز راتب/i.test(t)) return 'salary';
    if (/عقار/i.test(t)) return 'property';
    if (/منقول|مركبة|مال منقول/i.test(t)) return 'vehicle';
    return null;
}

export type ExecutorResolutionKind = 'approved' | 'rejected' | 'alternative';

export type AlternativeLegalActionId =
    | 'inventory_only'
    | 'defer_execution'
    | 'police_escort'
    | 'salary_garnishment_instead'
    | 'field_visit_reschedule'
    | 'other';

export const ALTERNATIVE_LEGAL_ACTION_LABELS: Record<AlternativeLegalActionId, string> = {
    inventory_only: 'إجراء مقتصر على محضر جرد أثاث',
    defer_execution: 'تأجيل مؤقت للتنفيذ الميداني',
    police_escort: 'طلب تعزيز قوة إجرائية (شرطة)',
    salary_garnishment_instead: 'تحويل المسار إلى حجز راتب بدلاً من الطلب الأصلي',
    field_visit_reschedule: 'إعادة جدولة الموعد الميداني',
    other: 'إجراء آخر (يُفصَّل في المحضر)',
};

/** صف قرار يُمرَّر لمسار المنفذ — بدون فهرس نصي حتى يقبل `Decision` من الواجهة */
export interface DecisionRowInput {
    id?: string;
    title?: string;
    body?: string;
    date?: string;
    requestKind?: string;
    evictionWorkflowKey?: string;
    creditorPartyDeathPayloadJson?: string;
}

/**
 * وسيط قرارات منفذ العدل: يحدّث التخزين المحلي، يحقن السجل الزمني (محضر المتابعة)،
 * ويطبّق آثاراً جانبية على ملف التنفيذ حسب نوع الطلب.
 */
export function useDecisionDispatcher(params: {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    seizedAssets: SeizedAsset[];
    /** مسودات حجز قبل موافقة المنفذ — مفتاحها معرّف صف القرار */
    seizureDraftsByDecisionId?: Record<string, SeizedAsset>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimeline: (e: TimelineEvent, opts?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    /** لقطة إضبارة عند تسجيل قرار المنفذ في السجل */
    getTimelineSnapshot?: () => unknown;
    /** مزامنة حالة المحجوزات في الواجهة بعد الدمج */
    syncSeizedAssets?: (assets: SeizedAsset[]) => void;
    syncSeizureDrafts?: (drafts: Record<string, SeizedAsset>) => void;
    syncActiveCoerciveActions?: (actions: string[]) => void;
    evictionExecutorWorkflow?: { dossierId: string; actions: ExecutorApprovalActions };
}) {
    const resolveDecision = useCallback(
        (input: {
            row: DecisionRowInput;
            resolution: ExecutorResolutionKind;
            executorNote?: string;
            alternativeActionId?: AlternativeLegalActionId;
        }) => {
            const id = String(input.row.id ?? '');
            if (!id) return;

            const today = getLocalTodayYmd();
            const ts = new Date().toISOString();
            const noteTrim = (input.executorNote || '').trim();
            const route = inferExecutorDispatcherRoute(input.row as Record<string, unknown>);
            const titleBase = String(input.row.title || 'طلب للمنفذ');
            const titleClean = stripPendingLabelsFromExecutorSubject(titleBase);

            const patchRow: Record<string, unknown> = {
                executorOutcome:
                    input.resolution === 'alternative'
                        ? 'alternative'
                        : input.resolution === 'approved'
                          ? 'approved'
                          : 'rejected',
                executorNote: noteTrim || undefined,
                resolvedAt: ts,
            };

            /** بعد الموافقة أو البديل: يبقى الطعن ممكناً للطرف المقابل ضمن المهلة (4/8 أيام) */
            if (input.resolution === 'approved' || input.resolution === 'alternative') {
                patchRow.appealStatus = 'pending';
                patchRow.appealBaseBranch = 'after_approval';
            } else if (input.resolution === 'rejected') {
                patchRow.appealStatus = 'pending';
                patchRow.appealBaseBranch = 'after_rejection';
                patchRow.date = today;
            } else {
                patchRow.appealStatus = 'pending';
            }

            if (input.resolution === 'approved' || input.resolution === 'alternative') {
                patchRow.status = 'accepted';
            } else {
                patchRow.status = 'rejected';
            }
            patchRow.appealPhase = null;

            const pcSubtypeEarly = String(
                (input.row as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || ''
            ).trim();
            if (
                String(input.row.requestKind || '') === 'personal_coercive' &&
                (pcSubtypeEarly === 'executive_detention' ||
                    pcSubtypeEarly === 'executive_dossier_presentation') &&
                input.resolution === 'approved'
            ) {
                patchRow.appealStatus = 'final';
                patchRow.noAppealChosen = true;
                patchRow.executorDetentionHandedToJudge = true;
            }

            if (input.resolution === 'alternative') {
                const aid = (input.alternativeActionId ?? 'other') as AlternativeLegalActionId;
                patchRow.alternativeActionId = aid;
                patchRow.alternativeActionLabel =
                    noteTrim && aid === 'other'
                        ? 'قرار بديل'
                        : ALTERNATIVE_LEGAL_ACTION_LABELS[aid];
            }

            patchExecutorDecisionRowReliable(params.executionId, id, patchRow);

            const trimmedBody = String(input.row.body || '').trim();
            let timelineTitle = '';
            let timelineDescription: string | undefined;
            if (input.resolution === 'approved') {
                timelineTitle = `✅ موافقة المنفذ: ${titleClean || titleBase}`;
                timelineDescription = noteTrim ? noteTrim : undefined;
            } else if (input.resolution === 'rejected') {
                timelineTitle = `❌ رفض الطلب: ${titleClean || titleBase}`;
                timelineDescription = noteTrim ? noteTrim : undefined;
            } else {
                const altLabel =
                    input.alternativeActionId != null
                        ? ALTERNATIVE_LEGAL_ACTION_LABELS[input.alternativeActionId]
                        : '—';
                timelineTitle = `🔄 قرار بديل: ${titleClean || titleBase}`;
                timelineDescription = [noteTrim || undefined, `البديل: ${altLabel}`]
                    .filter(Boolean)
                    .join('\n');
            }

            const snap = params.getTimelineSnapshot?.();
            params.pushTimeline({
                id: params.nextTimelineId(),
                date: today,
                timestamp: ts,
                title: timelineTitle,
                description: timelineDescription,
                type: 'decision',
                source: 'القرارات والطعون',
                metadata: {
                    timelineThreadKey: `executor_decision:${id}`,
                    decisionRowId: id,
                    originalRequestBody: trimmedBody ? trimmedBody.slice(0, 8000) : undefined,
                    executorResolution: input.resolution,
                },
                ...(snap !== undefined ? { snapshot: snap } : {}),
            });

            const merge: Record<string, unknown> = {};

            if (input.resolution === 'approved') {
                if (route === 'Notification') {
                    merge.executor_coercive_unlock = true;
                }
                if (route === 'BreakLocks') {
                    const placeholder: SeizedAsset = {
                        id: `inv_${id}_${Date.now()}`,
                        type: 'movable',
                        description: 'محضر جرد أثاث — مسودة (بعد كسر الأقفال)',
                        status: 'pending',
                        seizureDate: today,
                        notes: 'أُنشئ تلقائياً بعد موافقة المنفذ على طلب كسر الأقفال/الجرد الميداني',
                        details: { origin: 'break_locks_approved', decisionId: id },
                    };
                    const nextAssets = [...params.seizedAssets, placeholder];
                    merge.seizedAssets = nextAssets;
                    params.syncSeizedAssets?.(nextAssets);
                }
                if (isGuarantorRequestDecisionRow(input.row as Record<string, unknown>)) {
                    const prevGf = params.executionData?.guarantor_followup;
                    merge.hasGuarantor = true;
                    merge.guarantor_followup = {
                        executor_approved: true,
                        channel: 'financial',
                        details_saved: false,
                        guarantor_name: prevGf?.guarantor_name,
                        guarantor_workplace: prevGf?.guarantor_workplace,
                        guarantor_salary_iqd: prevGf?.guarantor_salary_iqd ?? null,
                        guarantor_deduction_iqd: prevGf?.guarantor_deduction_iqd ?? null,
                        creditor_notation_registered: prevGf?.creditor_notation_registered === true,
                    };
                    const debtors = params.executionData?.debtors;
                    if (Array.isArray(debtors) && debtors.length > 0 && debtors[0]) {
                        merge.debtors = [
                            { ...debtors[0], hasGuarantor: true },
                            ...debtors.slice(1),
                        ];
                    }
                    const creditors = params.executionData?.creditors;
                    if (Array.isArray(creditors) && creditors.length > 0 && creditors[0]) {
                        merge.creditors = [
                            { ...creditors[0], guarantorExecutionNotation: true },
                            ...creditors.slice(1),
                        ];
                    }
                }

                if (input.row.requestKind === 'creditor_party_death') {
                    const row = input.row as DecisionRowInput;
                    const explicit = String(row.creditorPartyDeathPayloadJson || '').trim();
                    const body = String(row.body || '').trim();
                    const title = String(row.title || '').trim();
                    const id = String(row.id || '').trim();
                    const deathTitleLikely =
                        /وفاة\s*الدائن|إبلاغ\s*وفاة\s*الدائن|إحلال\s*الورثة\s*محل\s*الدائن|دون\s*ورثة/i.test(
                            title
                        );
                    const deathIdLikely = /^creditor_death_req_/i.test(id);
                    const raw = explicit || (deathTitleLikely || deathIdLikely ? body : '');
                    const parsed = raw ? parseCreditorPartyDeathPayload(raw) : null;
                    if (parsed) {
                        const incomingHeirs = parsed.heir_names.filter((s) => /\S/.test(String(s)));
                        if (parsed.action === 'heir_substitution' && incomingHeirs.length === 0) {
                            Object.assign(
                                merge,
                                buildExecutionMergeForCreditorHeirSubstitutionApproval(
                                    params.executionData,
                                    parsed.creditorNameSnapshot
                                )
                            );
                        } else {
                            Object.assign(
                                merge,
                                buildExecutionMergeForCreditorPartyDeath(params.executionData, parsed)
                            );
                        }
                    }
                }

                if (route === 'SalaryGarnishment') {
                    merge.salary_garnishment_installment_schedule = {
                        executionDecisionId: id,
                        monthlyAmountIqd: undefined,
                        startDate: today,
                        notes: noteTrim || 'مبدئي — أكمل بيانات الجدول من إدارة الأموال والمصاريف',
                        createdAt: ts,
                    };
                    try {
                        window.dispatchEvent(
                            new CustomEvent('hami-garnishment-schedule-init', {
                                detail: { executionId: params.executionId, decisionId: id },
                            })
                        );
                    } catch {
                        /* ignore */
                    }
                }

                if (
                    params.evictionExecutorWorkflow &&
                    input.row.requestKind === 'eviction_procedure'
                ) {
                    const branch = inferExecutorApprovalDecisionType({
                        title: String(input.row.title || ''),
                        requestKind: input.row.requestKind,
                        evictionWorkflowKey: input.row.evictionWorkflowKey as
                            | EvictionExecutorWorkflowKey
                            | undefined,
                    });
                    if (branch === 'Residential Grace Early End') {
                        Object.assign(
                            merge,
                            buildResidentialGraceEarlyEndApprovalMerge(params.executionData)
                        );
                        dispatchResidentialGraceCleared(String(params.executionId || ''));
                    }
                    if (branch !== 'other') {
                        handleExecutorApproval(
                            branch,
                            params.evictionExecutorWorkflow.dossierId,
                            id,
                            params.evictionExecutorWorkflow.actions,
                            { requestTitle: titleBase }
                        );
                    }
                }
            }

            if (input.resolution === 'alternative') {
                const taskId = `alt_dec_${Date.now()}`;
                const label =
                    noteTrim && (input.alternativeActionId ?? 'other') === 'other'
                        ? 'قرار بديل'
                        : input.alternativeActionId
                          ? ALTERNATIVE_LEGAL_ACTION_LABELS[input.alternativeActionId]
                          : 'إجراء بديل';
                const pending = params.executionData?.caseTasksPending ?? [];
                merge.caseTasksPending = [
                    ...pending,
                    {
                        id: taskId,
                        title: `متابعة قرار بديل: ${label}`,
                        body: `بُدِّل المسار عن الطلب «${titleClean || titleBase}».${noteTrim ? `\n\nنص القرار:\n${noteTrim}` : ''}`,
                        dueDate: today,
                        createdAt: ts,
                    },
                ];
            }

            if (String(input.row.requestKind || '') === 'seizure') {
                const drafts: Record<string, SeizedAsset> = {
                    ...(params.seizureDraftsByDecisionId || {}),
                };
                const draft = drafts[id];

                const bumpCoerciveForDraft = (asset: SeizedAsset) => {
                    const key = coerciveKeyForSeizureDraft(asset);
                    if (!key) return;
                    const prev = params.executionData?.activeCoerciveActions ?? [];
                    const ac = Array.isArray(prev) ? [...prev] : [];
                    if (!ac.includes(key)) {
                        ac.push(key);
                        merge.activeCoerciveActions = ac;
                        params.syncActiveCoerciveActions?.(ac);
                    }
                };

                if (input.resolution === 'approved' && draft) {
                    const baseType = baseSeizureLabelFromType(String(draft.type));
                    const promoted: SeizedAsset = {
                        ...draft,
                        type: `${baseType} — موافقة المنفذ`,
                        status: 'seized',
                        seizureDate: draft.seizureDate || today,
                    };
                    delete drafts[id];
                    const nextAssets = [...params.seizedAssets, promoted];
                    merge.seizedAssets = nextAssets;
                    merge.seizureDraftsByDecisionId = drafts;
                    params.syncSeizedAssets?.(nextAssets);
                    params.syncSeizureDrafts?.(drafts);
                    bumpCoerciveForDraft(draft);
                } else if (draft && (input.resolution === 'rejected' || input.resolution === 'alternative')) {
                    delete drafts[id];
                    merge.seizureDraftsByDecisionId = drafts;
                    params.syncSeizureDrafts?.(drafts);
                }

                const skipLegacyMap = input.resolution === 'approved' && Boolean(draft);
                if (!skipLegacyMap) {
                    const nextAssets = params.seizedAssets.map((asset) => {
                        const link = asset.details?.decisionRowId;
                        if (!link || String(link) !== id) return asset;
                        const t = String(asset.type);
                        const baseType = baseSeizureLabelFromType(t);
                        if (input.resolution === 'approved') {
                            return {
                                ...asset,
                                type: `${baseType} — موافقة المنفذ`,
                                status: 'seized',
                                seizureDate: asset.seizureDate || today,
                            };
                        }
                        if (input.resolution === 'rejected') {
                            return {
                                ...asset,
                                type: `${baseType} — رفض الطلب`,
                                status: 'pending',
                            };
                        }
                        return {
                            ...asset,
                            type: `${baseType} — قرار بديل`,
                            status: 'pending',
                        };
                    });
                    const changed = nextAssets.some((a, i) => a !== params.seizedAssets[i]);
                    if (changed) {
                        merge.seizedAssets = nextAssets;
                        params.syncSeizedAssets?.(nextAssets);
                    }
                }
            }

            if (String(input.row.requestKind || '') === 'personal_coercive') {
                const pcSubtype = String(
                    (input.row as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || ''
                ).trim() as PersonalCoerciveSubtype;
                if (pcSubtype) {
                    const pcMerge = buildPersonalCoerciveExecutionMerge({
                        subtype: pcSubtype,
                        resolution: input.resolution,
                        decisionId: id,
                    });
                    Object.assign(merge, pcMerge);
                    applyPersonalCoerciveExecutorOutcome({
                        executionId: params.executionId,
                        subtype: pcSubtype,
                        resolution: input.resolution,
                        decisionId: id,
                    });
                }
            }

            if (Object.keys(merge).length > 0) {
                params.persistExecutionMerge(merge);
            }

            try {
                const rk = String(input.row.requestKind || '');
                const requestKindForEvent =
                    rk ||
                    (isGuarantorRequestDecisionRow(input.row as Record<string, unknown>)
                        ? 'guarantor_request'
                        : undefined);
                const pcSubtype = String(
                    (input.row as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || ''
                ).trim();
                window.dispatchEvent(
                    new CustomEvent('hami-execution-decision-outcome', {
                        detail: {
                            executionId: params.executionId,
                            decisionId: id,
                            requestKind: requestKindForEvent,
                            outcome: patchRow.executorOutcome,
                            dispatcherRoute: route,
                            resolution: input.resolution,
                            ...(pcSubtype ? { personalCoerciveSubtype: pcSubtype } : {}),
                        },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [
            params.executionId,
            params.executionData,
            params.evictionExecutorWorkflow,
            params.persistExecutionMerge,
            params.pushTimeline,
            params.nextTimelineId,
            params.seizedAssets,
            params.seizureDraftsByDecisionId,
            params.syncSeizedAssets,
            params.syncSeizureDrafts,
            params.syncActiveCoerciveActions,
            params.getTimelineSnapshot,
        ]
    );

    return { resolveDecision, alternativeLabels: ALTERNATIVE_LEGAL_ACTION_LABELS };
}
