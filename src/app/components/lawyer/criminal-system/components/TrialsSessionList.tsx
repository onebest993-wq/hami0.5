import React from 'react';
import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { TrialSession } from '../trialSessionsEngine';
import { isTrialSessionPostCassationRemand } from '../trialSessionsEngine';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import { TrialsSessionCard } from './TrialsSessionCard';

export type TrialsSessionListProps = {
    displaySessions: TrialSession[];
    sorted: TrialSession[];
    currentPendingId?: string;
    remandPivotDate?: string | null;
    caseStage: CaseStage;
    judicialDecisions: JudicialDecision[];
    readOnly?: boolean;
    userRole?: CriminalCaseUserRole;
    dossierConcluded: boolean;
    onOpenPreparatoryForCurrent: () => void;
    onCassationAppeal: (decision: JudicialDecision) => void;
    onInterventionCassation: (decision: JudicialDecision) => void;
    onCassationCorrection: (decision: JudicialDecision) => void;
    onDeclareJudgmentFinal: (decision: JudicialDecision) => void;
    onRecordAppealResult: (decision: JudicialDecision) => void;
};

export function TrialsSessionList({
    displaySessions,
    sorted,
    currentPendingId,
    remandPivotDate = null,
    caseStage,
    judicialDecisions,
    readOnly,
    userRole,
    dossierConcluded,
    onOpenPreparatoryForCurrent,
    onCassationAppeal,
    onInterventionCassation,
    onCassationCorrection,
    onDeclareJudgmentFinal,
    onRecordAppealResult,
}: TrialsSessionListProps) {
    if (displaySessions.length === 0) return null;

    return (
        <div className="relative pr-4 border-r-2 border-[#E6C673]/35 space-y-4">
            {displaySessions.map((session, displayIndex) => {
                const isCurrent = currentPendingId === session.id;
                const isPostRemand = isTrialSessionPostCassationRemand(
                    session,
                    remandPivotDate,
                    sorted,
                );
                const prevSession = displayIndex > 0 ? displaySessions[displayIndex - 1] : null;
                const prevPostRemand = prevSession
                    ? isTrialSessionPostCassationRemand(prevSession, remandPivotDate, sorted)
                    : false;
                const showRemandDivider = Boolean(remandPivotDate) && isPostRemand && !prevPostRemand;

                return (
                    <React.Fragment key={session.id}>
                        {showRemandDivider ? (
                            <div
                                className="mr-6 my-1 flex items-center gap-2"
                                role="separator"
                                aria-label="بداية جلسات ما بعد إعادة الأوراق"
                            >
                                <div className="h-px flex-1 bg-rose-400/45" />
                                <span className="shrink-0 rounded-full border border-rose-400/40 bg-rose-950/30 px-2.5 py-0.5 text-[9px] font-black text-rose-100">
                                    ↩ بعد إعادة الأوراق من التمييز
                                </span>
                                <div className="h-px flex-1 bg-rose-400/45" />
                            </div>
                        ) : null}
                        <TrialsSessionCard
                            session={session}
                            isCurrent={isCurrent}
                            isPostRemand={isPostRemand}
                            caseStage={caseStage}
                            judicialDecisions={judicialDecisions}
                            readOnly={readOnly}
                            userRole={userRole}
                            dossierConcluded={dossierConcluded}
                            onOpenPreparatoryForCurrent={onOpenPreparatoryForCurrent}
                            onCassationAppeal={onCassationAppeal}
                            onInterventionCassation={onInterventionCassation}
                            onCassationCorrection={onCassationCorrection}
                            onDeclareJudgmentFinal={onDeclareJudgmentFinal}
                            onRecordAppealResult={onRecordAppealResult}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    );
}
