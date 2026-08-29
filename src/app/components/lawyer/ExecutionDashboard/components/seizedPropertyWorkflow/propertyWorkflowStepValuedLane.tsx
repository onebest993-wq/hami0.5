import React from 'react';
import { normalizeSeizureWorkflowStatus } from '@/app/domain/seizure/seizureWorkflowStatus';
import {
    PROPERTY_WORKFLOW_ACTION_SHELL,
    PROPERTY_WORKFLOW_BTN,
    PROPERTY_WORKFLOW_PATH_HINT,
} from './seizedPropertyWorkflowConstants';
import type { PropertyWorkflowStep2Lane } from './seizedPropertyWorkflowTypes';
import {
    propertyWorkflowActionClick,
    propertyWorkflowApprovedInlineResume,
    propertyWorkflowInlineSaveShell,
} from './seizedPropertyWorkflowUiHelpers';
import { SeizureWorkflowPendingFallback } from '../seizedMovableWorkflow/seizureWorkflowPendingFallback';
import type { PropertyWorkflowStepContentDeps } from './propertyWorkflowStepContent.types';

export function buildPropertyWorkflowValuedLaneContent(
    deps: PropertyWorkflowStepContentDeps,
    inline: React.ReactNode,
): React.ReactNode | null {
    const {
        hasPendingSubtype,
        submitSubtype,
        auctionApprovedUnsaved,
        step2Lane,
        setStep2Lane,
        optimisticObjectionDecisionId,
        submitObjectionRequest,
        renderStepPendingMirror,
        dismissedApprovedInlineForStep,
        setDismissedApprovedInlineForStep,
        normStatus,
    } = deps;
    const norm = normalizeSeizureWorkflowStatus(normStatus);
    if (norm !== 'valued') return null;
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
