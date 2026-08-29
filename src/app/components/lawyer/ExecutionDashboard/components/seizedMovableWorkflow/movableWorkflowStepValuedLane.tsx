import React from 'react';
import { normalizeSeizureWorkflowStatus } from '@/app/domain/seizure/seizureWorkflowStatus';
import {
    MOVABLE_WORKFLOW_ACTION_SHELL,
    MOVABLE_WORKFLOW_BTN,
    MOVABLE_WORKFLOW_PATH_HINT,
} from './seizedMovableWorkflowConstants';
import type { MovableWorkflowStep2Lane } from './seizedMovableWorkflowTypes';
import {
    movableWorkflowActionClick,
    movableWorkflowApprovedInlineResume,
    movableWorkflowInlineSaveShell,
} from './seizedMovableWorkflowUiHelpers';
import { SeizureWorkflowPendingFallback } from './seizureWorkflowPendingFallback';
import type { MovableWorkflowStepContentDeps } from './movableWorkflowStepContent.types';

export function buildMovableWorkflowValuedLaneContent(
    deps: MovableWorkflowStepContentDeps,
    inline: React.ReactNode,
): React.ReactNode {
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
        hasPendingSubtype('movable_expert_objection') ||
        Boolean(String(optimisticObjectionDecisionId || '').trim());
    const auctionPending = hasPendingSubtype('movable_auction_date');

    if (auctionPending) {
        const pending = renderStepPendingMirror(2, 'movable_auction_date');
        if (pending) return pending;
    }
    if (auctionApprovedUnsaved) {
        if (dismissedApprovedInlineForStep === 2) {
            return movableWorkflowApprovedInlineResume(
                'تمت الموافقة على موعد المزايدة — أكمل التسجيل',
                () => setDismissedApprovedInlineForStep(null),
            );
        }
        return movableWorkflowInlineSaveShell(inline);
    }
    if (objectionPending) {
        const pending = renderStepPendingMirror(2, 'movable_expert_objection');
        if (pending) return pending;
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <SeizureWorkflowPendingFallback title="طلب الاعتراض على التقدير — قيد البت" />
            </div>
        );
    }

    const laneBtnCls = (lane: MovableWorkflowStep2Lane, tone: string) =>
        `${MOVABLE_WORKFLOW_BTN} ${tone} ${
            step2Lane === lane
                ? 'ring-2 ring-[#E6C673]/70 ring-offset-1 ring-offset-[#05060D]'
                : ''
        }`;

    if (step2Lane === 'auction') {
        return (
            <div key="lane-auction" className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <div className="space-y-2 rounded-2xl border border-[#E6C673]/20 bg-amber-950/15 p-3">
                    <p className={`${MOVABLE_WORKFLOW_PATH_HINT} text-[#E6C673]/90`}>مسار المزايدة</p>
                    <button
                        type="button"
                        onClick={movableWorkflowActionClick(() =>
                            submitSubtype(
                                'طلب تحديد موعد مزايدة علنية للمال المنقول.',
                                'طلب تحديد موعد مزايدة — مال منقول (قيد البت لدى المنفذ)',
                                'movable_auction_date',
                            ),
                        )}
                        className={`${MOVABLE_WORKFLOW_BTN} border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15`}
                    >
                        طلب تحديد موعد مزايدة
                    </button>
                </div>
            </div>
        );
    }

    if (step2Lane === 'objection') {
        return (
            <div key="lane-objection" className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-3">
                    <p className={`${MOVABLE_WORKFLOW_PATH_HINT} text-amber-300/90`}>
                        مسار الاعتراض على التقدير
                    </p>
                    <p className="text-[9px] text-slate-400 text-right leading-relaxed">
                        يُرسل الطلب فوراً — يُبَتّ من قسم «القرارات والطعون».
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={movableWorkflowActionClick(() => submitObjectionRequest('report'))}
                            className={`${MOVABLE_WORKFLOW_BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                        >
                            اعتراض على التقرير
                        </button>
                        <button
                            type="button"
                            onClick={movableWorkflowActionClick(() => submitObjectionRequest('experts'))}
                            className={`${MOVABLE_WORKFLOW_BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                        >
                            اعتراض على الخبراء
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div key={step2Lane ?? 'lane-pick'} className={MOVABLE_WORKFLOW_ACTION_SHELL}>
            <p className={`${MOVABLE_WORKFLOW_PATH_HINT} text-slate-400`}>اختر مسار الإجراء</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                    type="button"
                    data-testid="movable-workflow-lane-auction"
                    onClick={movableWorkflowActionClick(() => setStep2Lane('auction'))}
                    className={laneBtnCls(
                        'auction',
                        'border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15',
                    )}
                >
                    مسار المزايدة
                </button>
                <button
                    type="button"
                    data-testid="movable-workflow-lane-objection"
                    onClick={movableWorkflowActionClick(() => setStep2Lane('objection'))}
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
