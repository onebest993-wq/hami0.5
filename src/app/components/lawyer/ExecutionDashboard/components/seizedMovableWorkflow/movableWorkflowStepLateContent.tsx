import React from 'react';
import { readExpertCommitteeSize } from '../../utils/expertCommitteeUtils';
import { normalizeSeizureWorkflowStatus } from '@/app/domain/seizure/seizureWorkflowStatus';
import {
    MOVABLE_WORKFLOW_ACTION_SHELL,
    MOVABLE_WORKFLOW_BTN,
    MOVABLE_WORKFLOW_PATH_HINT,
} from './seizedMovableWorkflowConstants';
import {
    movableWorkflowActionClick,
    movableWorkflowApprovedInlineResume,
    movableWorkflowInlineSaveShell,
} from './seizedMovableWorkflowUiHelpers';
import type { MovableWorkflowStepContentDeps } from './movableWorkflowStepContent.types';

export function buildMovableWorkflowLateStepContent(
    deps: MovableWorkflowStepContentDeps,
    stepIndex: number,
    inline: React.ReactNode,
): React.ReactNode | undefined {
    const {
        m,
        hasPendingSubtype,
        submitSubtype,
        hasAnyPendingForStep,
        expertCommitteeApprovedUnsaved,
        auctionApprovedUnsaved,
        reauctionApprovedUnsaved,
        renderStepPendingMirror,
        dismissedApprovedInlineForStep,
        setDismissedApprovedInlineForStep,
        proceedsDone,
        openTrustDisburseForProceeds,
        renderInlineForStep,
        normStatus,
    } = deps;
    const norm = normalizeSeizureWorkflowStatus(normStatus);

    if (stepIndex === 3 && norm === 'estimation_objected') {
        if (hasPendingSubtype('movable_expert_committee')) {
            return renderStepPendingMirror(3, 'movable_expert_committee');
        }
        if (expertCommitteeApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 3) {
                return movableWorkflowApprovedInlineResume(
                    'تمت الموافقة على لجنة الخبراء — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return movableWorkflowInlineSaveShell(inline);
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() => {
                        const required = readExpertCommitteeSize(m);
                        submitSubtype(
                            'طلب انتداب لجنة خبراء جديدة لتقدير المال المنقول بعد الاعتراض.',
                            'طلب انتداب لجنة خبراء جديدة — مال منقول (قيد البت لدى المنفذ)',
                            'movable_expert_committee',
                            [`عدد الخبراء المطلوب: ${required}`],
                        );
                    })}
                    className={`${MOVABLE_WORKFLOW_BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                >
                    طلب انتداب لجنة خبراء جديدة
                </button>
            </div>
        );
    }

    if (stepIndex === 4 && norm === 'published') {
        const needsPub =
            !String(m.newspaperName || '').trim() || !String(m.publicationDateYmd || '').trim();
        if (!needsPub) return inline;
        return inline;
    }

    if (stepIndex === 5 && norm === 'published') {
        const needsPub =
            !String(m.newspaperName || '').trim() || !String(m.publicationDateYmd || '').trim();
        if (needsPub) return null;
        return inline;
    }

    if (stepIndex === 6 && norm === 'no_bidders') {
        if (hasPendingSubtype('movable_auction_date')) {
            return renderStepPendingMirror(6, 'movable_auction_date');
        }
        if (auctionApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 6) {
                return movableWorkflowApprovedInlineResume(
                    'تمت الموافقة على موعد المزايدة الجديد — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return movableWorkflowInlineSaveShell(inline);
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب تحديد موعد مزايدة جديد (كسر القرار) للمال المنقول.',
                            'طلب تحديد موعد مزايدة جديد — مال منقول (قيد البت لدى المنفذ)',
                            'movable_auction_date',
                        ),
                    )}
                    className={`${MOVABLE_WORKFLOW_BTN} border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15`}
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
                return movableWorkflowApprovedInlineResume(
                    'تمت الموافقة على إعادة المزايدة — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return movableWorkflowInlineSaveShell(renderInlineForStep(7, 'reauction_default'));
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <p className={`${MOVABLE_WORKFLOW_PATH_HINT} text-slate-400`}>اختر أحد الإجراءات التالية</p>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب إحالة قطعية للمال المنقول.',
                            'طلب إحالة قطعية — مال منقول (قيد البت لدى المنفذ)',
                            'movable_final_award',
                            [
                                `المشتري (رسو مزاد): ${String(m.initialAwardBuyerName || '').trim()}`,
                                m.initialAwardAmountIqd != null &&
                                Number.isFinite(Number(m.initialAwardAmountIqd))
                                    ? `مبلغ رسو المزاد: ${Number(m.initialAwardAmountIqd).toLocaleString('ar-IQ')} د.ع`
                                    : '',
                            ].filter(Boolean),
                        ),
                    )}
                    className={`${MOVABLE_WORKFLOW_BTN} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
                >
                    طلب إحالة قطعية
                </button>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب إعادة المزايدة للنكول (تهرب المشتري من الدفع) للمال المنقول.',
                            'طلب إعادة المزايدة للنكول — مال منقول (قيد البت لدى المنفذ)',
                            'movable_reauction_default',
                        ),
                    )}
                    className={`${MOVABLE_WORKFLOW_BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                >
                    طلب إعادة المزايدة للنكول
                </button>
            </div>
        );
    }

    if (stepIndex === 7 && norm === 'sold') {
        if (proceedsDone) {
            return (
                <p className="text-[10px] font-bold text-sky-200/90 text-right">
                    تمت الإحالة القطعية وصرف الحصيلة في السجل المالي.
                </p>
            );
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <p className="text-[10px] font-bold text-sky-200/90 text-right leading-relaxed">
                    تمت الإحالة القطعية — يمكنك نقل حصيلة البيع إلى السجل المالي (الأمانات).
                </p>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(openTrustDisburseForProceeds)}
                    className={`${MOVABLE_WORKFLOW_BTN} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
                >
                    نقل حصيلة البيع — السجل المالي
                </button>
            </div>
        );
    }

    return undefined;
}
