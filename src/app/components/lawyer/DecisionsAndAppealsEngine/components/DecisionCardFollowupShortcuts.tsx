import React from 'react';
import type { Decision } from '../types';

export type DecisionCardFollowupShortcutsProps = {
    decision: Decision;
    executionId: string | undefined;
    btnPrimaryWFull: string;
    canOpenHeirsEntry: boolean;
    heirsParty: 'creditor' | 'debtor' | null;
    seizureCompletionReady: boolean;
    seizureCompletionBusy: boolean;
    seizureCompletionLabel: string;
    runSeizureCompletion: () => void;
    guarantorShortcutReady: boolean;
    trustDisburseShortcutReady: boolean;
    evictionScheduleReady: boolean;
    evictionGraceReady: boolean;
    evictionPoliceReady: boolean;
    personalStatusCourtCoerciveBlocked: boolean;
};

export function DecisionCardFollowupShortcuts({
    decision,
    executionId,
    btnPrimaryWFull,
    canOpenHeirsEntry,
    heirsParty,
    seizureCompletionReady,
    seizureCompletionBusy,
    seizureCompletionLabel,
    runSeizureCompletion,
    guarantorShortcutReady,
    trustDisburseShortcutReady,
    evictionScheduleReady,
    evictionGraceReady,
    evictionPoliceReady,
    personalStatusCourtCoerciveBlocked,
}: DecisionCardFollowupShortcutsProps) {
                    <div className="space-y-2">
                        {canOpenHeirsEntry && heirsParty ? (
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        window.dispatchEvent(
                                            new CustomEvent('hami-open-party-death-modal', {
                                                detail: { executionId, party: heirsParty, decisionId: decision.id },
                                            })
                                        );
                                    } catch {}
                                }}
                                className={btnPrimaryWFull}
                            >
                                فتح بيانات الورثة
                            </button>
                        ) : null}
                        {seizureCompletionReady ? (
                            <button
                                type="button"
                                disabled={seizureCompletionBusy}
                                onClick={runSeizureCompletion}
                                className={btnPrimaryWFull}
                            >
                                {seizureCompletionLabel}
                            </button>
                        ) : null}
                        {guarantorShortcutReady ? (
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        window.dispatchEvent(
                                            new CustomEvent('hami-open-guarantor-details', {
                                                detail: { executionId, decisionId: decision.id },
                                            })
                                        );
                                    } catch {}
                                }}
                                className={btnPrimaryWFull}
                            >
                                فتح بيانات الكفيل
                            </button>
                        ) : null}
                        {trustDisburseShortcutReady ? (
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        window.dispatchEvent(
                                            new CustomEvent('hami-open-financial-hub-ledger', {
                                                detail: { executionId, mode: 'disburse' },
                                            })
                                        );
                                    } catch {}
                                }}
                                className={btnPrimaryWFull}
                            >
                                فتح تنفيذ الصرف
                            </button>
                        ) : null}
                        {(evictionScheduleReady || evictionGraceReady || evictionPoliceReady) &&
                        !personalStatusCourtCoerciveBlocked ? (
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        window.dispatchEvent(
                                            new CustomEvent('hami-open-execution-coercive-tab', {
                                                detail: { executionId, decisionId: decision.id },
                                            })
                                        );
                                    } catch {}
                                }}
                                className={btnPrimaryWFull}
                            >
                                فتح الإجراءات الجبرية
                            </button>
                        ) : null}

                    </div>
}
