import React from 'react';
import type { SeizedProperty } from '@/app/types/execution';
import { readExpertCommitteeSize } from '../../utils/expertCommitteeUtils';
import {
    buildPropertyWorkflowStepHistory,
    executorSubtypesForPropertyWorkflowStep,
    findSeizureDecisionForProperty,
} from '../../utils/propertySeizureWorkflowUtils';
import { normalizeSeizureWorkflowStatus } from '@/app/domain/seizure/seizureWorkflowStatus';
import type { PropertyInlineSectionKey } from '../PropertySeizureInlineSections';
import {
    PROPERTY_WORKFLOW_ACTION_SHELL,
    PROPERTY_WORKFLOW_BTN,
    PROPERTY_WORKFLOW_PATH_HINT,
} from './seizedPropertyWorkflowConstants';
import type { PropertyWorkflowStep2Lane } from './seizedPropertyWorkflowTypes';
import {
    propertyWorkflowActionClick,
    propertyWorkflowApprovedInlineResume,
    propertyWorkflowDoneStepHistoryShell,
    propertyWorkflowInlineSaveShell,
} from './seizedPropertyWorkflowUiHelpers';
import { SeizureWorkflowPendingFallback } from '../seizedMovableWorkflow/seizureWorkflowPendingFallback';

export type PropertyWorkflowStepContentDeps = {
    activeIdx: number;
    decisions: Array<Record<string, unknown>>;
    normStatus: string;
    p: SeizedProperty;
    propertyId: string;
    renderInlineForStep: (stepIndex: number, sectionOverride?: PropertyInlineSectionKey) => React.ReactNode;
    hasPendingSubtype: (subtype: string) => boolean;
    submitSubtype: (
        lead: string,
        requestTitle: string,
        subtype: string,
        extraLines?: string[],
        payloadExtra?: Record<string, unknown>,
    ) => string | null;
    hasAnyPendingForStep: (stepIndex: number) => boolean;
    expertApprovedUnsaved: Record<string, unknown> | null | undefined;
    expertCommitteeApprovedUnsaved: Record<string, unknown> | null | undefined;
    auctionApprovedUnsaved: Record<string, unknown> | null | undefined;
    reauctionApprovedUnsaved: Record<string, unknown> | null | undefined;
    step2Lane: PropertyWorkflowStep2Lane | null;
    setStep2Lane: React.Dispatch<React.SetStateAction<PropertyWorkflowStep2Lane | null>>;
    optimisticObjectionDecisionId: string | null;
    submitObjectionRequest: (objectionKind: 'report' | 'experts') => void;
    renderStepPendingMirror: (stepIndex: number, preferredSubtype?: string) => React.ReactNode;
    dismissedApprovedInlineForStep: number | null;
    setDismissedApprovedInlineForStep: React.Dispatch<React.SetStateAction<number | null>>;
    inlineFocusKey: string | null;
    pendingDecisionId: string | null;
    proceedsDone: boolean;
    openTrustDisburseForProceeds: () => void;
};

export function buildPropertyWorkflowStepContent(
    deps: PropertyWorkflowStepContentDeps,
    stepIndex: number,
): React.ReactNode {
    const {
        activeIdx,
        decisions,
        normStatus,
        p,
        propertyId,
        renderInlineForStep,
        hasPendingSubtype,
        submitSubtype,
        hasAnyPendingForStep,
        expertApprovedUnsaved,
        expertCommitteeApprovedUnsaved,
        auctionApprovedUnsaved,
        reauctionApprovedUnsaved,
        step2Lane,
        setStep2Lane,
        optimisticObjectionDecisionId,
        submitObjectionRequest,
        renderStepPendingMirror,
        dismissedApprovedInlineForStep,
        setDismissedApprovedInlineForStep,
        inlineFocusKey,
        pendingDecisionId,
        proceedsDone,
        openTrustDisburseForProceeds,
    } = deps;

    if (stepIndex > activeIdx) return null;
    if (stepIndex < activeIdx) {
        return propertyWorkflowDoneStepHistoryShell(
            buildPropertyWorkflowStepHistory(stepIndex, p, decisions, propertyId),
        );
    }

    const inline = renderInlineForStep(stepIndex);
    const hasMark = Boolean(String(p.seizureMarkLetterNumber || '').trim());
    const norm = normalizeSeizureWorkflowStatus(normStatus);

    if (stepIndex === 0 && norm === 'seized' && !hasMark) {
        return inline;
    }

    if (stepIndex === 1 && norm === 'seized' && hasMark) {
        if (hasPendingSubtype('property_expert')) {
            const pending = renderStepPendingMirror(1, 'property_expert');
            if (pending) return pending;
        }
        const expertInlineReady =
            expertApprovedUnsaved ||
            (inlineFocusKey === 'experts' && Boolean(String(pendingDecisionId || '').trim()));
        if (expertInlineReady) {
            if (dismissedApprovedInlineForStep === 1) {
                return propertyWorkflowApprovedInlineResume(
                    'تمت الموافقة على انتداب الخبراء — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            const shell = propertyWorkflowInlineSaveShell(inline);
            if (shell) return shell;
        }
        return (
            <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={propertyWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب انتداب خبراء لتقدير العقار.',
                            'طلب انتداب خبراء — عقار (قيد البت لدى المنفذ)',
                            'property_expert',
                        ),
                    )}
                    className={`${PROPERTY_WORKFLOW_BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                >
                    طلب انتداب خبراء للتقدير
                </button>
            </div>
        );
    }

    if (stepIndex === 2 && norm === 'valued') {
        const objectionPending =
            hasPendingSubtype('property_expert_objection') ||
            Boolean(String(optimisticObjectionDecisionId || '').trim());
        const auctionPending = hasPendingSubtype('property_auction');

        if (auctionPending) {
            const pending = renderStepPendingMirror(2, 'property_auction');
            if (pending) return pending;
        }
        if (auctionApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 2) {
                return propertyWorkflowApprovedInlineResume(
                    'تمت الموافقة على موعد المزايدة — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return propertyWorkflowInlineSaveShell(inline);
        }
        if (objectionPending) {
            const pending = renderStepPendingMirror(2, 'property_expert_objection');
            if (pending) return pending;
            return (
                <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                    <SeizureWorkflowPendingFallback title="طلب الاعتراض على التقدير — قيد البت" />
                </div>
            );
        }

        const laneBtnCls = (lane: PropertyWorkflowStep2Lane, tone: string) =>
            `${PROPERTY_WORKFLOW_BTN} ${tone} ${
                step2Lane === lane
                    ? 'ring-2 ring-[#E6C673]/70 ring-offset-1 ring-offset-[#05060D]'
                    : ''
            }`;

        if (step2Lane === 'auction') {
            return (
                <div key="lane-auction" className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                    <div className="space-y-2 rounded-2xl border border-[#E6C673]/20 bg-amber-950/15 p-3">
                        <p className={`${PROPERTY_WORKFLOW_PATH_HINT} text-[#E6C673]/90`}>مسار المزايدة</p>
                        <button
                            type="button"
                            onClick={propertyWorkflowActionClick(() =>
                                submitSubtype(
                                    'طلب تحديد موعد مزايدة علنية للعقار.',
                                    'طلب تحديد موعد مزايدة — عقار (قيد البت لدى المنفذ)',
                                    'property_auction',
                                ),
                            )}
                            className={`${PROPERTY_WORKFLOW_BTN} border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15`}
                        >
                            طلب تحديد موعد مزايدة
                        </button>
                    </div>
                </div>
            );
        }

        if (step2Lane === 'objection') {
            return (
                <div key="lane-objection" className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                    <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-3">
                        <p className={`${PROPERTY_WORKFLOW_PATH_HINT} text-amber-300/90`}>
                            مسار الاعتراض على التقدير
                        </p>
                        <p className="text-[9px] text-slate-400 text-right leading-relaxed">
                            يُرسل الطلب فوراً — يُبَتّ من قسم «القرارات والطعون».
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={propertyWorkflowActionClick(() => submitObjectionRequest('report'))}
                                className={`${PROPERTY_WORKFLOW_BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                            >
                                اعتراض على التقرير
                            </button>
                            <button
                                type="button"
                                onClick={propertyWorkflowActionClick(() => submitObjectionRequest('experts'))}
                                className={`${PROPERTY_WORKFLOW_BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                            >
                                اعتراض على الخبراء
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div key={step2Lane ?? 'lane-pick'} className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                <p className={`${PROPERTY_WORKFLOW_PATH_HINT} text-slate-400`}>اختر مسار الإجراء</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        data-testid="property-workflow-lane-auction"
                        onClick={propertyWorkflowActionClick(() => setStep2Lane('auction'))}
                        className={laneBtnCls(
                            'auction',
                            'border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15',
                        )}
                    >
                        مسار المزايدة
                    </button>
                    <button
                        type="button"
                        data-testid="property-workflow-lane-objection"
                        onClick={propertyWorkflowActionClick(() => setStep2Lane('objection'))}
                        className={laneBtnCls(
                            'objection',
                            'border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15',
                        )}
                    >
                        مسار الاعتراض على التقدير
                    </button>
                </div>
            </div>
        );
    }

    if (stepIndex === 3 && norm === 'estimation_objected') {
        if (hasPendingSubtype('property_expert_committee')) {
            return renderStepPendingMirror(3, 'property_expert_committee');
        }
        if (expertCommitteeApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 3) {
                return propertyWorkflowApprovedInlineResume(
                    'تمت الموافقة على لجنة الخبراء — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return propertyWorkflowInlineSaveShell(inline);
        }
        return (
            <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={propertyWorkflowActionClick(() => {
                        const required = readExpertCommitteeSize(p);
                        submitSubtype(
                            'طلب انتداب لجنة خبراء جديدة لتقدير العقار بعد الاعتراض.',
                            'طلب انتداب لجنة خبراء جديدة — عقار (قيد البت لدى المنفذ)',
                            'property_expert_committee',
                            [`عدد الخبراء المطلوب: ${required}`],
                        );
                    })}
                    className={`${PROPERTY_WORKFLOW_BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                >
                    طلب انتداب لجنة خبراء جديدة
                </button>
            </div>
        );
    }

    if (stepIndex === 4 && norm === 'published') {
        const needsPub =
            !String(p.newspaperName || '').trim() || !String(p.publicationDateYmd || '').trim();
        if (!needsPub) return inline;
        return inline;
    }

    if (stepIndex === 5 && norm === 'published') {
        const needsPub =
            !String(p.newspaperName || '').trim() || !String(p.publicationDateYmd || '').trim();
        if (needsPub) return null;
        return inline;
    }

    if (stepIndex === 6 && norm === 'no_bidders') {
        if (hasPendingSubtype('property_auction')) {
            return renderStepPendingMirror(6, 'property_auction');
        }
        if (auctionApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 6) {
                return propertyWorkflowApprovedInlineResume(
                    'تمت الموافقة على موعد المزايدة الجديد — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return propertyWorkflowInlineSaveShell(inline);
        }
        return (
            <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={propertyWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب تحديد موعد مزايدة جديد (كسر القرار) للعقار.',
                            'طلب تحديد موعد مزايدة جديد — عقار (قيد البت لدى المنفذ)',
                            'property_auction',
                        ),
                    )}
                    className={`${PROPERTY_WORKFLOW_BTN} border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15`}
                >
                    طلب تحديد موعد مزايدة جديد (كسر القرار)
                </button>
            </div>
        );
    }

    if (stepIndex === 7 && norm === 'initial_award') {
        if (hasAnyPendingForStep(7)) {
            return renderStepPendingMirror(7);
        }
        if (reauctionApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 7) {
                return propertyWorkflowApprovedInlineResume(
                    'تمت الموافقة على إعادة المزايدة — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return propertyWorkflowInlineSaveShell(renderInlineForStep(7, 'reauction_default'));
        }
        return (
            <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                <p className={`${PROPERTY_WORKFLOW_PATH_HINT} text-slate-400`}>اختر أحد الإجراءات التالية</p>
                <button
                    type="button"
                    onClick={propertyWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب إحالة قطعية للعقار.',
                            'طلب إحالة قطعية — عقار (قيد البت لدى المنفذ)',
                            'property_final_award',
                            [
                                `المشتري (رسو مزاد): ${String(p.initialAwardBuyerName || '').trim()}`,
                                p.initialAwardAmountIqd != null &&
                                Number.isFinite(Number(p.initialAwardAmountIqd))
                                    ? `مبلغ رسو المزاد: ${Number(p.initialAwardAmountIqd).toLocaleString('ar-IQ')} د.ع`
                                    : '',
                            ].filter(Boolean),
                        ),
                    )}
                    className={`${PROPERTY_WORKFLOW_BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                >
                    طلب إحالة قطعية
                </button>
                <button
                    type="button"
                    onClick={propertyWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب إعادة المزايدة للنكول (تهرب المشتري من الدفع) للعقار.',
                            'طلب إعادة المزايدة للنكول — عقار (قيد البت لدى المنفذ)',
                            'property_reauction_default',
                        ),
                    )}
                    className={`${PROPERTY_WORKFLOW_BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                >
                    طلب إعادة المزايدة للنكول
                </button>
            </div>
        );
    }

    if (stepIndex === 7 && norm === 'sold') {
        if (proceedsDone) {
            return (
                <p className="text-[10px] font-bold text-emerald-200/90 text-right">
                    تمت الإحالة القطعية وصرف الحصيلة في السجل المالي.
                </p>
            );
        }
        return (
            <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                <p className="text-[10px] font-bold text-emerald-200/90 text-right leading-relaxed">
                    تمت الإحالة القطعية — يمكنك نقل حصيلة البيع إلى السجل المالي (الأمانات).
                </p>
                <button
                    type="button"
                    onClick={propertyWorkflowActionClick(openTrustDisburseForProceeds)}
                    className={`${PROPERTY_WORKFLOW_BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                >
                    نقل حصيلة البيع — السجل المالي
                </button>
            </div>
        );
    }

    return inline;
}

export function resolvePropertyWorkflowPendingRowForStep(
    decisions: Array<Record<string, unknown>>,
    propertyId: string,
    stepIndex: number,
    optimisticObjectionDecisionId: string | null,
    preferredSubtype?: string,
    optimisticPendingBySubtype?: Record<string, string>,
): Record<string, unknown> | null {
    if (preferredSubtype) {
        const row = findSeizureDecisionForProperty(decisions, preferredSubtype, propertyId, {
            pendingOnly: true,
        });
        if (row) return row;
        const optimisticId = String(optimisticPendingBySubtype?.[preferredSubtype] || '').trim();
        if (optimisticId) {
            return {
                id: optimisticId,
                title: preferredSubtype === 'property_expert'
                    ? 'طلب انتداب خبراء — عقار (قيد البت لدى المنفذ)'
                    : 'طلب حجز — عقار (قيد البت لدى المنفذ)',
                executorOutcome: 'pending',
                requestKind: 'seizure',
                seizureSubtype: preferredSubtype,
            } as Record<string, unknown>;
        }
        if (
            preferredSubtype === 'property_expert_objection' &&
            String(optimisticObjectionDecisionId || '').trim()
        ) {
            const oid = String(optimisticObjectionDecisionId || '').trim();
            return (
                decisions.find((r) => String(r?.id || '').trim() === oid) ||
                ({
                    id: oid,
                    title: 'طلب الاعتراض على التقدير — عقار (قيد البت لدى المنفذ)',
                    executorOutcome: 'pending',
                    requestKind: 'seizure',
                    seizureSubtype: preferredSubtype,
                } as Record<string, unknown>)
            );
        }
        return null;
    }
    for (const st of executorSubtypesForPropertyWorkflowStep(stepIndex)) {
        const row = findSeizureDecisionForProperty(decisions, st, propertyId, {
            pendingOnly: true,
        });
        if (row) return row;
    }
    return null;
}
