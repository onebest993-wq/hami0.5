import React from 'react';
import { CheckCircle } from '@/app/components/ui/lucideIcons';
import { LegalEntitySoftProceduresSection } from '@/app/components/lawyer/ExecutionDashboard/components/LegalEntitySoftProceduresSection';
import { CommunicationAwaitingResultCard } from './communicationsTab/CommunicationAwaitingResultCard';
import { CommunicationCreateForm } from './communicationsTab/CommunicationCreateForm';
import { CommunicationLogEntry } from './communicationsTab/CommunicationLogEntry';
import { useCommunicationsTabState } from './communicationsTab/useCommunicationsTabState';
import { isNoResponseConfirmed } from './communicationDecisionModel';
import type { CommunicationsTabProps } from './communicationsTab/communicationsTabTypes';

export type { CommunicationsTabProps } from './communicationsTab/communicationsTabTypes';

export const CommunicationsTab: React.FC<CommunicationsTabProps> = ({
    decisionsStorageExecutionId,
    executionData = null,
    showToast,
    pushTimelineEvent,
    nextTimelineId,
    showSoftFieldProcedures = false,
    showEncroachmentSurveyor = false,
    showSpecificDeliverySurveyor = false,
    inlineActionGateKey = null,
    setInlineActionGateKey,
    onEncroachmentExpenseRecorded,
}) => {
    const state = useCommunicationsTabState({
        decisionsStorageExecutionId,
        executionData,
        showToast,
        pushTimelineEvent,
        nextTimelineId,
    });

    return (
        <div className="space-y-5 p-3 text-right" dir="rtl">
            {showSoftFieldProcedures && setInlineActionGateKey ? (
                <LegalEntitySoftProceduresSection
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    showEncroachmentSurveyor={showEncroachmentSurveyor}
                    showSpecificDeliverySurveyor={showSpecificDeliverySurveyor}
                    onEncroachmentExpenseRecorded={onEncroachmentExpenseRecorded}
                />
            ) : null}

            <CommunicationCreateForm
                targetDirectorate={state.targetDirectorate}
                setTargetDirectorate={state.setTargetDirectorate}
                communicationDetails={state.communicationDetails}
                setCommunicationDetails={state.setCommunicationDetails}
                letterDate={state.letterDate}
                setLetterDate={state.setLetterDate}
                creating={state.creating}
                onCreate={state.handleCreate}
            />

            <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-200 mb-2 px-1">
                    <CheckCircle size={14} />
                    سجل المخاطبات
                    {state.commDecisions.length > 0 ? (
                        <span className="text-[9px] text-slate-500 font-normal">
                            ({state.commDecisions.length})
                        </span>
                    ) : null}
                </h4>
                {state.commDecisions.length === 0 ? (
                    <p className="px-1 text-[10px] text-slate-500">لا توجد مخاطبات في السجل بعد.</p>
                ) : (
                    <div className="space-y-2">
                        {state.commDecisions.map((decision: Record<string, unknown>) => {
                            const decisionId = String(decision?.id || '').trim();
                            const ctx = state.getDisplayContext(decision);
                            const awaitingResult = state.awaitingResultDecisions.some(
                                (d) => String(d?.id || '').trim() === decisionId
                            );

                            if (awaitingResult) {
                                const ui = state.awaitingUiById[decisionId] || {};
                                const draft = state.getDraftForDecision(decisionId, ctx.directorate);
                                return (
                                    <CommunicationAwaitingResultCard
                                        key={decisionId}
                                        decisionId={decisionId}
                                        ctx={ctx}
                                        ui={ui}
                                        draft={draft}
                                        saving={state.saving}
                                        noResponseConfirmed={isNoResponseConfirmed(decision)}
                                        onDraftChange={(nextDraft) =>
                                            state.setResultDraftById((prev) => ({
                                                ...prev,
                                                [decisionId]: nextDraft,
                                            }))
                                        }
                                        onStartNoResponseChoose={() =>
                                            state.setAwaitingUiById((prev) => ({
                                                ...prev,
                                                [decisionId]: {
                                                    ...prev[decisionId],
                                                    noResponseFlow: 'choose',
                                                    responseFormOpen: false,
                                                    confirmDismiss: false,
                                                },
                                            }))
                                        }
                                        onPickNoResponseSameContext={() =>
                                            state.setAwaitingUiById((prev) => ({
                                                ...prev,
                                                [decisionId]: {
                                                    ...prev[decisionId],
                                                    noResponseFlow: 'confirm_same',
                                                },
                                            }))
                                        }
                                        onPickNoResponseEdit={(letterDate, body) =>
                                            state.setAwaitingUiById((prev) => ({
                                                ...prev,
                                                [decisionId]: {
                                                    ...prev[decisionId],
                                                    noResponseFlow: 'edit',
                                                    noResponseEditDate: letterDate,
                                                    noResponseEditBody: body,
                                                },
                                            }))
                                        }
                                        onNoResponseEditDraftChange={(letterDate, body) =>
                                            state.setAwaitingUiById((prev) => ({
                                                ...prev,
                                                [decisionId]: {
                                                    ...prev[decisionId],
                                                    noResponseEditDate: letterDate,
                                                    noResponseEditBody: body,
                                                },
                                            }))
                                        }
                                        onCancelNoResponseFlow={() =>
                                            state.setAwaitingUiById((prev) => ({
                                                ...prev,
                                                [decisionId]: {
                                                    ...prev[decisionId],
                                                    noResponseFlow: undefined,
                                                    noResponseEditDate: undefined,
                                                    noResponseEditBody: undefined,
                                                },
                                            }))
                                        }
                                        onConfirmNoResponseSame={() =>
                                            state.confirmNoResponse(
                                                decisionId,
                                                ctx.directorate,
                                                ctx.letterDate,
                                            )
                                        }
                                        onConfirmNoResponseEdit={(letterDate, body) =>
                                            state.confirmNoResponse(
                                                decisionId,
                                                ctx.directorate,
                                                ctx.letterDate,
                                                { editedLetterDate: letterDate, editedBody: body },
                                            )
                                        }
                                        onToggleResponseForm={() =>
                                            state.setAwaitingUiById((prev) => {
                                                const wasOpen = Boolean(
                                                    prev[decisionId]?.responseFormOpen,
                                                );
                                                return {
                                                    ...prev,
                                                    [decisionId]: {
                                                        ...prev[decisionId],
                                                        responseFormOpen: !wasOpen,
                                                        noResponseFlow: undefined,
                                                        confirmDismiss: false,
                                                    },
                                                };
                                            })
                                        }
                                        onRequestDismissConfirm={() =>
                                            state.setAwaitingUiById((prev) => ({
                                                ...prev,
                                                [decisionId]: {
                                                    ...prev[decisionId],
                                                    confirmDismiss: true,
                                                    responseFormOpen: false,
                                                    noResponseFlow: undefined,
                                                },
                                            }))
                                        }
                                        onCancelDismissConfirm={() =>
                                            state.setAwaitingUiById((prev) => ({
                                                ...prev,
                                                [decisionId]: {
                                                    ...prev[decisionId],
                                                    confirmDismiss: false,
                                                },
                                            }))
                                        }
                                        onDismissFollowup={() => state.dismissFollowup(decisionId)}
                                        onSaveResult={() =>
                                            state.saveCommunicationResult(decisionId, ctx.directorate, draft)
                                        }
                                    />
                                );
                            }

                            return (
                                <CommunicationLogEntry
                                    key={decisionId}
                                    decisionId={decisionId}
                                    ctx={ctx}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
