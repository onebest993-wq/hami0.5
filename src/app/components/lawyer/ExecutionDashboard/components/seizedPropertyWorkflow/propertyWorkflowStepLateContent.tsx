import React from 'react';
import { readExpertCommitteeSize } from '../../utils/expertCommitteeUtils';
import { normalizeSeizureWorkflowStatus } from '@/app/domain/seizure/seizureWorkflowStatus';
import {
    PROPERTY_WORKFLOW_ACTION_SHELL,
    PROPERTY_WORKFLOW_BTN,
    PROPERTY_WORKFLOW_PATH_HINT,
} from './seizedPropertyWorkflowConstants';
import {
    propertyWorkflowActionClick,
    propertyWorkflowApprovedInlineResume,
    propertyWorkflowInlineSaveShell,
} from './seizedPropertyWorkflowUiHelpers';
import type { PropertyWorkflowStepContentDeps } from './propertyWorkflowStepContent.types';

export function buildPropertyWorkflowLateStepContent(
    deps: PropertyWorkflowStepContentDeps,
    stepIndex: number,
    inline: React.ReactNode,
): React.ReactNode | undefined {
    const {
        p,
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


    return undefined;
}
