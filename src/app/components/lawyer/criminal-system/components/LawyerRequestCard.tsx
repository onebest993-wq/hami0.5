import React from 'react';
import { Gavel, Trash2 } from 'lucide-react';
import type { LawyerRequest } from '../criminalStore';
import type { CriminalActionParty } from '../criminalStageUtils';
import { formatLawyerRequestStatusLabel } from '../criminalStageUtils';
import { LawyerRequestUxBlock } from './LawyerRequestUxAddons';
import { RequestProceduralLinkStrip } from './RequestProceduralLinkStrip';
import type { ProceduralLinkReference, ProceduralNavTarget } from '../proceduralContainersEngine';
import type { JourneyNode } from '@/app/types/criminal';
import { isLawyerRequestPending } from '../lawyerRequestStatusMachine';
import { LAWYER_REQUEST_CARD_THEME } from '../decisionsLedgerVisuals';
import { JourneyStageBadge } from './JourneyStageBadge';

export type LawyerRequestCardProps = {
    request: LawyerRequest;
    parties: CriminalActionParty[];
    stageJourney?: JourneyNode[];
    readOnly?: boolean;
    onRecordJudgeMargin?: (request: LawyerRequest) => void;
    onMoveToTrash?: (request: LawyerRequest) => void;
    onAddRequestMargin?: (requestId: string, text: string) => void;
    onToggleRequestStar?: (requestId: string) => void;
    proceduralRefsForRequest?: (requestId: string) => ProceduralLinkReference[];
    onNavigateProcedural?: (target: ProceduralNavTarget) => void;
};

export const LawyerRequestCard = ({
    request,
    parties,
    stageJourney,
    readOnly,
    onRecordJudgeMargin,
    onMoveToTrash,
    onAddRequestMargin,
    onToggleRequestStar,
    proceduralRefsForRequest,
    onNavigateProcedural,
}: LawyerRequestCardProps) => {
    const partiesText = (Array.isArray(request.defendantIds) ? request.defendantIds : [])
        .map((rid) => parties.find((p) => p.id === rid))
        .filter(Boolean)
        .map((p) => String(p!.fullName ?? '').trim())
        .filter(Boolean)
        .join(' • ');
    const canRecordJudgeMargin = Boolean(onRecordJudgeMargin) && isLawyerRequestPending(request);
    const showFooter = !readOnly && (canRecordJudgeMargin || onMoveToTrash);

    return (
        <div
            className={`rounded-xl border p-4 transition-colors ${LAWYER_REQUEST_CARD_THEME.background} ${LAWYER_REQUEST_CARD_THEME.border} ${LAWYER_REQUEST_CARD_THEME.glow} hover:brightness-[1.03]`}
        >
            <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold whitespace-normal break-words ${LAWYER_REQUEST_CARD_THEME.chipBg} ${LAWYER_REQUEST_CARD_THEME.chipText}`}
                    >
                        طلب من المحامي
                    </span>
                    <span className="inline-block rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-black text-white/85">
                        {formatLawyerRequestStatusLabel(request.status)}
                    </span>
                    {stageJourney?.length ? (
                        <JourneyStageBadge
                            stageJourney={stageJourney}
                            item={{
                                requestDate: request.requestDate,
                                proceduralNodeId: request.proceduralNodeId,
                            }}
                        />
                    ) : null}
                </div>
                <div className="text-white/90 font-black text-sm whitespace-normal break-words">
                    <span dir="ltr" className="inline-block unicode-bidi-plaintext tabular-nums">
                        {request.requestDate}
                    </span>
                    <span aria-hidden> • </span>
                    {request.type}
                </div>
            </div>

            <div className="mt-3 space-y-2">
                {partiesText ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
                        <div className="min-w-0 text-white/95 text-[12px] font-black whitespace-normal break-words">
                            {partiesText}
                        </div>
                    </div>
                ) : null}
                {request.lawyerNote ? (
                    <p className="text-white/80 text-sm whitespace-normal break-words leading-relaxed">
                        {request.lawyerNote}
                    </p>
                ) : null}
                <LawyerRequestUxBlock
                    request={request}
                    readOnly={readOnly}
                    onAddMargin={onAddRequestMargin ? (text) => onAddRequestMargin(request.id, text) : undefined}
                    onToggleStar={onToggleRequestStar ? () => onToggleRequestStar(request.id) : undefined}
                />
                {proceduralRefsForRequest && onNavigateProcedural ? (
                    <RequestProceduralLinkStrip
                        references={proceduralRefsForRequest(request.id)}
                        onNavigate={onNavigateProcedural}
                    />
                ) : null}
            </div>

            {showFooter ? (
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                    {canRecordJudgeMargin ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRecordJudgeMargin?.(request);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6C673]/50 bg-[#E6C673]/15 px-3 py-1.5 text-[11px] font-black text-[#E6C673] hover:bg-[#E6C673]/25 transition whitespace-normal break-words"
                        >
                            <Gavel className="w-4 h-4" aria-hidden />
                            <span>هامش القاضي الختامي</span>
                        </button>
                    ) : null}
                    {onMoveToTrash ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveToTrash(request);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-black text-red-200/90 hover:bg-red-500/15 transition"
                            title="نقل إلى سلة المهملات"
                        >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden />
                            <span>سلة المهملات</span>
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
