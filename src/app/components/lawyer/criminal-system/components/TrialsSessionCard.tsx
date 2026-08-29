import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { TrialSession } from '../trialSessionsEngine';
import {
    formatTrialSessionIsoDate,
    trialSessionPresenceBadge,
    trialSessionStatusLabel,
} from '../trialSessionsEngine';
import { resolveLinkedTrialPreparatoryDecision } from '../trialSessionPreparatoryDecisionEngine';
import { TrialSessionPreparatoryAppealBlock } from './TrialSessionPreparatoryAppealBlock';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import { getPendingCassationAppealForResult } from '../judicialDecisionsEngine';

export type TrialsSessionCardProps = {
    session: TrialSession;
    isCurrent: boolean;
    isPostRemand: boolean;
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

export function TrialsSessionCard({
    session,
    isCurrent,
    isPostRemand,
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
}: TrialsSessionCardProps) {
    const presenceBadge = trialSessionPresenceBadge(
        session.presenceStatus,
        session.sessionNumber,
    );
    const linkedPrepDecision = resolveLinkedTrialPreparatoryDecision(
        session,
        judicialDecisions,
    );
    const pendingAppeal = linkedPrepDecision
        ? getPendingCassationAppealForResult(linkedPrepDecision)
        : null;
    const isPresent = session.presenceStatus === 'present';
    const verdict = session.verdict;

    return (
        <div className="relative mr-6 space-y-0">
            <span className="absolute -right-[1.65rem] top-4 h-3 w-3 rounded-full border-2 border-[#E6C673] bg-slate-900" />
            <div
                className={`rounded-xl border bg-slate-800/40 p-3 space-y-2 ${
                    isCurrent
                        ? 'border-[#E6C673]/55 ring-1 ring-[#E6C673]/25'
                        : 'border-slate-700/80'
                }`}
            >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-white font-black text-sm">
                        الجلسة رقم {session.sessionNumber}
                    </span>
                    <span
                        className="text-white/45 text-[11px] font-bold unicode-bidi-plaintext tabular-nums"
                        dir="ltr"
                    >
                        {formatTrialSessionIsoDate(session.date)}
                    </span>
                    {isCurrent ? (
                        <span className="rounded-full border border-sky-400/45 bg-sky-500/12 px-2 py-0.5 text-[9px] font-black text-sky-100">
                            جلسة المرافعة الحالية
                        </span>
                    ) : null}
                    {isPostRemand ? (
                        <span className="rounded-full border border-rose-400/40 bg-rose-950/25 px-2 py-0.5 text-[9px] font-black text-rose-100">
                            مرافعة ما بعد التمييز
                        </span>
                    ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${
                            isPresent
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                        }`}
                    >
                        [{presenceBadge}]
                    </span>
                    <span className="rounded-full border border-slate-600/50 bg-slate-900/50 px-2 py-0.5 text-[9px] font-black text-white/65">
                        {trialSessionStatusLabel(session.status)}
                    </span>
                    {verdict ? (
                        <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${
                                verdict.outcome === 'conviction'
                                    ? 'border-red-500/40 bg-red-500/10 text-red-200'
                                    : verdict.outcome === 'acquittal'
                                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                      : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'
                            }`}
                        >
                            {verdict.outcome === 'conviction'
                                ? '🔴 إدانة'
                                : verdict.outcome === 'acquittal'
                                  ? '🟢 براءة'
                                  : '🟡 إفراج'}
                        </span>
                    ) : null}
                </div>

                {session.preparatoryDecision ? (
                    <div className="rounded-lg border border-violet-500/30 bg-gradient-to-l from-violet-950/30 to-violet-950/10 p-2.5 space-y-1.5 border-r-[3px] border-r-violet-400/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/35 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black text-violet-100">
                            قرار إعدادي
                            <span className="text-violet-300/60">·</span>
                            جلسة {session.preparatoryDecision.sessionNumber ?? session.sessionNumber}
                        </div>
                        <div className="text-violet-100 text-[11px] font-black leading-snug">
                            {session.preparatoryDecision.title}
                        </div>
                        <p className="text-white/75 text-[11px] whitespace-normal break-words leading-snug">
                            {session.preparatoryDecision.details}
                        </p>
                        {session.preparatoryDecision.isBlockingSuit ? (
                            <span className="inline-flex rounded-full border border-amber-500/35 bg-amber-950/25 px-2 py-0.5 text-[9px] font-black text-amber-100">
                                يوقف سير الدعوى
                            </span>
                        ) : null}
                        {linkedPrepDecision ? (
                            <TrialSessionPreparatoryAppealBlock
                                decision={linkedPrepDecision}
                                caseStage={caseStage}
                                readOnly={readOnly}
                                userRole={userRole}
                                onCassationAppeal={() =>
                                    onCassationAppeal(linkedPrepDecision)
                                }
                                onInterventionCassation={() =>
                                    onInterventionCassation(linkedPrepDecision)
                                }
                                onCassationCorrection={() =>
                                    onCassationCorrection(linkedPrepDecision)
                                }
                                onDeclareJudgmentFinal={() =>
                                    onDeclareJudgmentFinal(linkedPrepDecision)
                                }
                                onRecordAppealResult={
                                    pendingAppeal
                                        ? () => onRecordAppealResult(linkedPrepDecision)
                                        : undefined
                                }
                            />
                        ) : null}
                    </div>
                ) : null}

                {isCurrent && !readOnly && !session.preparatoryDecision && !dossierConcluded ? (
                    <button
                        type="button"
                        onClick={onOpenPreparatoryForCurrent}
                        className="rounded-lg border border-violet-500/40 bg-violet-950/25 px-2.5 py-1.5 text-[10px] font-black text-violet-100 hover:bg-violet-950/40 transition w-full text-right"
                    >
                        ⚖️ تسجيل قرار إعدادي لهذه الجلسة
                    </button>
                ) : null}

                {session.sessionNotes ? (
                    <p className="text-white/80 text-xs whitespace-normal break-words leading-snug">
                        <span className="text-white/45 font-black">محضر المرافعة: </span>
                        {session.sessionNotes}
                    </p>
                ) : null}

                {session.witnessesAndExperts?.length ? (
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 space-y-2">
                        <div className="text-white/60 text-[11px] font-black">الشهود والخبراء</div>
                        {session.witnessesAndExperts.map((w, i) => (
                            <div key={`${session.id}-w-${i}`} className="text-sm">
                                <span className="text-[#E6C673] font-bold">
                                    {w.type === 'expert' ? 'خبير' : 'شاهد'}: {w.name}
                                </span>
                                {w.summary ? (
                                    <span className="text-white/70"> — {w.summary}</span>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}

                {session.status === 'postponed' &&
                (session.preparationNote ||
                    session.postponementReason ||
                    session.nextSessionDate) ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-2.5 py-2 space-y-1 text-[11px]">
                        {session.nextSessionDate ? (
                            <div className="flex flex-wrap items-center gap-1.5 font-bold text-amber-100">
                                <span className="text-amber-200/75">التالي:</span>
                                <span
                                    dir="ltr"
                                    className="unicode-bidi-plaintext tabular-nums text-amber-50"
                                >
                                    {formatTrialSessionIsoDate(session.nextSessionDate)}
                                </span>
                            </div>
                        ) : null}
                        {session.postponementReason ? (
                            <p className="text-white/65 font-bold leading-snug">
                                <span className="text-white/45">سبب التأجيل: </span>
                                {session.postponementReason}
                            </p>
                        ) : null}
                        {session.preparationNote ? (
                            <p className="text-amber-100/90 font-bold leading-snug">
                                <span className="text-amber-200/60">واجب تحضيري: </span>
                                {session.preparationNote}
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
