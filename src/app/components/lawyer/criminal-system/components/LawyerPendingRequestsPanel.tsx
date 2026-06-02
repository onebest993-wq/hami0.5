import React from 'react';
import type { LawyerRequest } from '../criminalStore';
import type { CriminalActionParty } from '../criminalStageUtils';
import type { ProceduralLinkReference, ProceduralNavTarget } from '../proceduralContainersEngine';
import type { JourneyNode } from '@/app/types/criminal';
import { isLawyerRequestPending } from '../lawyerRequestStatusMachine';
import { sortLawyerRequestsNewestFirst } from '../lawyerMotionFeedEngine';
import { LawyerRequestCard } from './LawyerRequestCard';

export type LawyerRequestsListMode = 'pending_only' | 'all';

export type LawyerPendingRequestsPanelProps = {
    requests: LawyerRequest[];
    listMode?: LawyerRequestsListMode;
    stageJourney?: JourneyNode[];
    parties: CriminalActionParty[];
    readOnly?: boolean;
    onRecordJudgeMargin: (request: LawyerRequest) => void;
    onMoveToTrash?: (request: LawyerRequest) => void;
    onAddRequestMargin: (requestId: string, text: string) => void;
    onToggleRequestStar: (requestId: string) => void;
    proceduralRefsForRequest?: (requestId: string) => ProceduralLinkReference[];
    onNavigateProcedural?: (target: ProceduralNavTarget) => void;
};

export const LawyerPendingRequestsPanel = ({
    requests,
    listMode = 'pending_only',
    stageJourney,
    parties,
    readOnly,
    onRecordJudgeMargin,
    onMoveToTrash,
    onAddRequestMargin,
    onToggleRequestStar,
    proceduralRefsForRequest,
    onNavigateProcedural,
}: LawyerPendingRequestsPanelProps) => {
    const displayed = sortLawyerRequestsNewestFirst(
        listMode === 'all' ? requests : requests.filter((r) => isLawyerRequestPending(r)),
    );
    if (!displayed.length) {
        if (listMode === 'all') {
            return (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white/70 text-xs font-bold print:hidden">
                    لا توجد طلبات محامٍ في المرحلة المحددة — جرّب توسيع فلتر «تحقيق / محاكمة» أعلاه.
                </div>
            );
        }
        return null;
    }

    return (
        <div className="space-y-3 print:hidden" dir="rtl">
            <div className="text-white/70 text-xs font-black whitespace-normal break-words">
                {listMode === 'all' ? 'طلبات المحامي' : 'طلبات قيد النظر — بانتظار هامش القاضي'}
            </div>
            <div className="grid grid-cols-1 gap-3">
                {displayed.map((req) => (
                    <LawyerRequestCard
                        key={req.id}
                        request={req}
                        parties={parties}
                        stageJourney={stageJourney}
                        readOnly={readOnly}
                        onRecordJudgeMargin={onRecordJudgeMargin}
                        onMoveToTrash={onMoveToTrash}
                        onAddRequestMargin={onAddRequestMargin}
                        onToggleRequestStar={onToggleRequestStar}
                        proceduralRefsForRequest={proceduralRefsForRequest}
                        onNavigateProcedural={onNavigateProcedural}
                    />
                ))}
            </div>
        </div>
    );
};
