import { useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { CommunicationContextPanel } from '../CommunicationContextPanel';
import type { CommunicationDisplayContext } from '../communicationDecisionModel';
import { STATUS_TONE_CLASS } from '../communicationDecisionModel';
import type { CommunicationAwaitingUiState, CommunicationResultDraft } from './communicationsTabTypes';
import {
    CommunicationAwaitingDismissConfirm,
    CommunicationAwaitingNoResponseFlows,
    CommunicationAwaitingResponseForm,
} from './CommunicationAwaitingResultFlows';

export type CommunicationAwaitingResultCardProps = {
    decisionId: string;
    ctx: CommunicationDisplayContext;
    ui: CommunicationAwaitingUiState;
    draft: CommunicationResultDraft;
    saving: boolean;
    noResponseConfirmed?: boolean;
    onDraftChange: (draft: CommunicationResultDraft) => void;
    onStartNoResponseChoose: () => void;
    onPickNoResponseSameContext: () => void;
    onPickNoResponseEdit: (letterDate: string, body: string) => void;
    onNoResponseEditDraftChange: (letterDate: string, body: string) => void;
    onCancelNoResponseFlow: () => void;
    onConfirmNoResponseSame: () => void;
    onConfirmNoResponseEdit: (letterDate: string, body: string) => void;
    onToggleResponseForm: () => void;
    onRequestDismissConfirm: () => void;
    onCancelDismissConfirm: () => void;
    onDismissFollowup: () => void;
    onSaveResult: () => void;
};

export function CommunicationAwaitingResultCard({
    decisionId,
    ctx,
    ui,
    draft,
    saving,
    noResponseConfirmed = false,
    onDraftChange,
    onStartNoResponseChoose,
    onPickNoResponseSameContext,
    onPickNoResponseEdit,
    onNoResponseEditDraftChange,
    onCancelNoResponseFlow,
    onConfirmNoResponseSame,
    onConfirmNoResponseEdit,
    onToggleResponseForm,
    onRequestDismissConfirm,
    onCancelDismissConfirm,
    onDismissFollowup,
    onSaveResult,
}: CommunicationAwaitingResultCardProps) {
    const [expanded, setExpanded] = useState(true);
    const noResponseFlow = ui.noResponseFlow;
    const inSubStep =
        Boolean(ui.responseFormOpen) || Boolean(noResponseFlow) || Boolean(ui.confirmDismiss);

    const handleBackFromSubStep = () => {
        if (ui.responseFormOpen) {
            onToggleResponseForm();
            return;
        }
        if (ui.confirmDismiss) {
            onCancelDismissConfirm();
            return;
        }
        onCancelNoResponseFlow();
    };

    return (
        <div
            key={decisionId}
            className="rounded-xl border border-amber-500/15 bg-white/[0.02] text-right ring-1 ring-white/[0.03]"
        >
            {ui.responseFormOpen ? (
                <CommunicationAwaitingResponseForm
                    draft={draft}
                    saving={saving}
                    onDraftChange={onDraftChange}
                    onSaveResult={onSaveResult}
                    onBack={handleBackFromSubStep}
                />
            ) : null}

            {ui.confirmDismiss ? (
                <CommunicationAwaitingDismissConfirm
                    saving={saving}
                    onDismissFollowup={onDismissFollowup}
                    onCancelDismissConfirm={onCancelDismissConfirm}
                    onBack={handleBackFromSubStep}
                />
            ) : null}

            {noResponseFlow ? (
                <CommunicationAwaitingNoResponseFlows
                    noResponseFlow={noResponseFlow}
                    ctx={ctx}
                    ui={ui}
                    saving={saving}
                    onStartNoResponseChoose={onStartNoResponseChoose}
                    onPickNoResponseSameContext={onPickNoResponseSameContext}
                    onPickNoResponseEdit={onPickNoResponseEdit}
                    onNoResponseEditDraftChange={onNoResponseEditDraftChange}
                    onCancelNoResponseFlow={onCancelNoResponseFlow}
                    onConfirmNoResponseSame={onConfirmNoResponseSame}
                    onConfirmNoResponseEdit={onConfirmNoResponseEdit}
                    onBack={handleBackFromSubStep}
                />
            ) : null}

            {!inSubStep ? (
                <>
                    <button
                        type="button"
                        onClick={() => setExpanded((p) => !p)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-right min-h-[44px] hover:bg-white/[0.03] touch-manipulation transition-colors"
                        aria-expanded={expanded}
                    >
                        <ChevronDown
                            size={16}
                            className={`shrink-0 text-[#E6C673]/70 transition-transform duration-200 ${
                                expanded ? 'rotate-180' : ''
                            }`}
                            aria-hidden
                        />
                        <div className="min-w-0 flex-1 text-right">
                            <p className="truncate text-[12px] font-bold text-slate-50">{ctx.directorate}</p>
                            {ctx.letterDate ? (
                                <p className="truncate text-[10px] text-slate-500">
                                    تاريخ الكتاب: {ctx.letterDate}
                                </p>
                            ) : null}
                        </div>
                        <span
                            className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE_CLASS[ctx.statusTone]}`}
                        >
                            {ctx.statusLabel}
                        </span>
                    </button>

                    {expanded ? (
                        <>
                            <div className="border-t border-white/[0.06] px-3 py-2">
                                <CommunicationContextPanel ctx={ctx} compact showMeta={false} />
                            </div>

                            <div className="border-t border-white/[0.06] px-3 py-2 space-y-1.5">
                                <p className="text-[9px] font-bold text-slate-500">متابعة النتيجة</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={onStartNoResponseChoose}
                                        className="rounded-lg border border-amber-500/25 bg-amber-500/8 py-2 text-[10px] font-bold text-amber-100 disabled:opacity-40 min-h-[36px]"
                                    >
                                        {noResponseConfirmed ? 'تأكيد عدم الورود' : 'لم تُرسل إجابة'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={onToggleResponseForm}
                                        className="rounded-lg border border-emerald-500/25 bg-emerald-500/8 py-2 text-[10px] font-bold text-emerald-100 disabled:opacity-40 min-h-[36px]"
                                    >
                                        وردت إجابة
                                    </button>
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={onRequestDismissConfirm}
                                        className="rounded-lg border border-white/10 bg-white/[0.03] py-2 text-[10px] font-bold text-slate-400 disabled:opacity-40 min-h-[36px]"
                                    >
                                        تجاهل
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
