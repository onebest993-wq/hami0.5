import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { AddTrialSessionInput, TrialSession } from '../trialSessionsEngine';
import {
    findCurrentPendingTrialSession,
    formatTrialSessionIsoDate,
    isTrialDossierConcluded,
    isTrialSessionPostCassationRemand,
    normalizeTrialSessions,
    resolveTrialPresenceFieldConfig,
    sanitizeTrialSessionIsoDateInput,
    sortTrialSessionsAsc,
    sortTrialSessionsDesc,
    suggestNextSessionNumber,
    todayIsoDate,
    trialSessionPresenceBadge,
    trialSessionStatusLabel,
} from '../trialSessionsEngine';
import { resolveLinkedTrialPreparatoryDecision } from '../trialSessionPreparatoryDecisionEngine';
import { TrialSessionPreparatoryAppealBlock } from './TrialSessionPreparatoryAppealBlock';
import { useCriminalStore } from '../criminalStore';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import { getPendingCassationAppealForResult } from '../judicialDecisionsEngine';

export type TrialsTabProps = {
    caseId: string;
    caseStage: CaseStage;
    sessions: TrialSession[];
    judicialDecisions?: JudicialDecision[];
    readOnly?: boolean;
    userRole?: CriminalCaseUserRole;
    onAddSession: (payload: AddTrialSessionInput) => string | null;
    onUpdateSession?: (sessionId: string, payload: AddTrialSessionInput) => string | null;
    onDocumentPreparatoryDecision: (input: {
        sessionId?: string;
        session: AddTrialSessionInput;
        preparatory: { title: string; details: string; isBlockingSuit: boolean };
    }) => string | null;
    onPostpone: (
        sessionId: string,
        nextDate: string,
        reason: string,
        prepNote: string,
    ) => string | null;
    /** فتح مودال إصدار القرار الختامي الكامل (StageFinalDecisionModal) بعد حفظ الجلسة. */
    onOpenStageFinalDecision?: (sessionId: string) => void;
    onCassationAppeal: (decision: JudicialDecision) => void;
    onInterventionCassation: (decision: JudicialDecision) => void;
    onCassationCorrection: (decision: JudicialDecision) => void;
    onDeclareJudgmentFinal: (decision: JudicialDecision) => void;
    onRecordAppealResult: (decision: JudicialDecision) => void;
    currentAccusationArticle: string;
    crimeType?: string;
    onError?: (message: string) => void;
    embedded?: boolean;
    addModalOpen?: boolean;
    onAddModalOpenChange?: (open: boolean) => void;
    /** تاريخ نقض التمييز وإعادة الأوراق — لتمييز جلسات الجولة الثانية. */
    remandPivotDate?: string | null;
};

export const TrialsTab = ({
    caseId,
    caseStage,
    sessions,
    judicialDecisions = [],
    readOnly,
    userRole,
    onAddSession,
    onUpdateSession,
    onDocumentPreparatoryDecision,
    onPostpone,
    onOpenStageFinalDecision,
    onCassationAppeal,
    onInterventionCassation,
    onCassationCorrection,
    onDeclareJudgmentFinal,
    onRecordAppealResult,
    currentAccusationArticle,
    crimeType,
    onError,
    embedded = false,
    addModalOpen,
    onAddModalOpenChange,
    remandPivotDate = null,
}: TrialsTabProps) => {
    const sorted = useMemo(() => sortTrialSessionsAsc(sessions), [sessions]);
    const displaySessions = useMemo(() => sortTrialSessionsDesc(sessions), [sessions]);
    const currentPending = useMemo(() => findCurrentPendingTrialSession(sorted), [sorted]);
    const dossierConcluded = isTrialDossierConcluded(sorted);

    const [isAddOpenInternal, setIsAddOpenInternal] = useState(false);
    const isAddOpen = addModalOpen ?? isAddOpenInternal;
    const setIsAddOpen = (open: boolean) => {
        if (onAddModalOpenChange) onAddModalOpenChange(open);
        else setIsAddOpenInternal(open);
    };
    const [showPreparatoryInline, setShowPreparatoryInline] = useState(false);
    const [postponeSessionId, setPostponeSessionId] = useState<string | null>(null);

    const [addDate, setAddDate] = useState('');
    const [addSessionNumber, setAddSessionNumber] = useState('');
    const [addPresence, setAddPresence] = useState<'present' | 'absent'>('present');
    const [addNotes, setAddNotes] = useState('');
    const [prepTitle, setPrepTitle] = useState('');
    const [prepDetails, setPrepDetails] = useState('');
    const [isBlockingSuit, setIsBlockingSuit] = useState(false);

    const presenceField = useMemo(
        () => resolveTrialPresenceFieldConfig(addSessionNumber),
        [addSessionNumber],
    );

    const [nextDate, setNextDate] = useState('');
    const [postponeReason, setPostponeReason] = useState('');
    const [prepNote, setPrepNote] = useState('');

    const activeModalSessionIdRef = useRef<string | null>(null);
    const isEditingPendingSession = Boolean(currentPending);

    useEffect(() => {
        if (!isAddOpen) {
            setShowPreparatoryInline(false);
            setPrepTitle('');
            setPrepDetails('');
            setIsBlockingSuit(false);
            activeModalSessionIdRef.current = null;
            return;
        }
        activeModalSessionIdRef.current = currentPending?.id ?? null;
        if (currentPending) {
            setAddDate(currentPending.date);
            setAddSessionNumber(currentPending.sessionNumber);
            setAddPresence(currentPending.presenceStatus);
            setAddNotes(currentPending.sessionNotes ?? '');
        } else {
            setAddDate(todayIsoDate());
            setAddSessionNumber(suggestNextSessionNumber(sessions));
            setAddPresence('present');
            setAddNotes('');
        }
    }, [isAddOpen, currentPending?.id, sessions]);

    useEffect(() => {
        if (!postponeSessionId) return;
        setNextDate('');
        setPostponeReason('');
        setPrepNote('');
    }, [postponeSessionId]);

    useEffect(() => {
        if (dossierConcluded) {
            setShowPreparatoryInline(false);
        }
    }, [dossierConcluded]);

    const reportError = (msg: string) => {
        if (onError) onError(msg);
    };

    const buildSessionPayload = (): AddTrialSessionInput => ({
        date: addDate,
        sessionNumber: addSessionNumber,
        presenceStatus: addPresence,
        sessionNotes: addNotes,
    });

    const ensureSessionIdForAction = (): string | null => {
        const payload = buildSessionPayload();
        const boundId = activeModalSessionIdRef.current;
        if (boundId) {
            if (onUpdateSession) {
                const updateErr = onUpdateSession(boundId, payload);
                if (updateErr) {
                    reportError(updateErr);
                    return null;
                }
            }
            return boundId;
        }
        if (currentPending) {
            activeModalSessionIdRef.current = currentPending.id;
            if (onUpdateSession) {
                const updateErr = onUpdateSession(currentPending.id, payload);
                if (updateErr) {
                    reportError(updateErr);
                    return null;
                }
            }
            return currentPending.id;
        }
        const addErr = onAddSession(payload);
        if (addErr) {
            reportError(addErr);
            return null;
        }
        const fresh = normalizeTrialSessions(useCriminalStore.getState().casesById[caseId]?.trials);
        const pending = findCurrentPendingTrialSession(fresh);
        if (!pending) {
            reportError('تعذّر تهيئة الجلسة — تحقق من تاريخ ورقم الجلسة.');
            return null;
        }
        activeModalSessionIdRef.current = pending.id;
        return pending.id;
    };

    const submitPostpone = () => {
        if (!postponeSessionId) return;
        const err = onPostpone(postponeSessionId, nextDate, postponeReason, prepNote);
        if (err) {
            reportError(err);
            return;
        }
        setPostponeSessionId(null);
    };

    const handleModalPostpone = () => {
        const sessionId = ensureSessionIdForAction();
        if (!sessionId) return;
        setIsAddOpen(false);
        setShowPreparatoryInline(false);
        setPostponeSessionId(sessionId);
    };

    const handleModalFinalDecisionClick = () => {
        const sessionId = ensureSessionIdForAction();
        if (!sessionId) return;
        if (!onOpenStageFinalDecision) {
            reportError('تعذّر فتح نموذج القرار الختامي.');
            return;
        }
        setShowPreparatoryInline(false);
        setIsAddOpen(false);
        onOpenStageFinalDecision(sessionId);
    };

    const handleModalPreparatoryClick = () => {
        setShowPreparatoryInline((prev) => !prev);
    };

    const submitPreparatoryDecision = () => {
        const sessionId = ensureSessionIdForAction();
        if (!sessionId) return;
        const err = onDocumentPreparatoryDecision({
            sessionId,
            session: buildSessionPayload(),
            preparatory: {
                title: prepTitle,
                details: prepDetails,
                isBlockingSuit,
            },
        });
        if (err) {
            reportError(err);
            return;
        }
        setShowPreparatoryInline(false);
        setIsAddOpen(false);
        setPrepTitle('');
        setPrepDetails('');
        setIsBlockingSuit(false);
    };

    const closeAddModal = () => {
        setIsAddOpen(false);
        setShowPreparatoryInline(false);
    };

    const postponeSession = sorted.find((s) => s.id === postponeSessionId);
    const editingPostRemand =
        Boolean(remandPivotDate) &&
        (currentPending
            ? isTrialSessionPostCassationRemand(currentPending, remandPivotDate, sorted)
            : true);

    return (
        <div
            key={`criminal-tab-trials-${caseId}`}
            className={
                embedded
                    ? 'flex flex-col w-full gap-4'
                    : 'flex flex-col p-6 max-w-5xl mx-auto w-full gap-6'
            }
        >
            {!embedded ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-white font-black text-base">المحاكمات</div>
                        <p className="text-white/50 text-xs mt-0.5">
                            سجل رسمي للمرافعات والأحكام — مستقل عن مسارات الساندبوكس
                        </p>
                    </div>
                    {!readOnly && !dossierConcluded ? (
                        <button
                            type="button"
                            onClick={() => setIsAddOpen(true)}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] px-4 py-2.5 text-sm font-black hover:brightness-110 transition"
                        >
                            ➕ إضافة جلسة مرافعة جديدة
                        </button>
                    ) : null}
                </div>
            ) : null}

            {displaySessions.length === 0 ? null : (
                <div className="relative pr-4 border-r-2 border-[#E6C673]/35 space-y-4">
                    {displaySessions.map((session, displayIndex) => {
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
                        const isCurrent = currentPending?.id === session.id;
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
                                            onClick={() => {
                                                setIsAddOpen(true);
                                                setShowPreparatoryInline(true);
                                            }}
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
                            </React.Fragment>
                        );
                    })}
                </div>
            )}


            {isAddOpen ? (
                <div className="fixed inset-0 z-[235] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                            <div className="text-white font-black text-sm">
                                {isEditingPendingSession ? 'جلسة المرافعة الحالية' : 'جلسة مرافعة جديدة'}
                            </div>
                            <button type="button" onClick={closeAddModal} className="text-white/60 text-xs font-bold">
                                إغلاق
                            </button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-white/60 text-xs mb-1">تاريخ الجلسة</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white unicode-bidi-plaintext"
                                        dir="ltr"
                                        value={addDate}
                                        onChange={(e) =>
                                            setAddDate(sanitizeTrialSessionIsoDateInput(e.target.value))
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/60 text-xs mb-1">رقم الجلسة</label>
                                    <input
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white tabular-nums disabled:opacity-80 disabled:cursor-not-allowed"
                                        value={addSessionNumber}
                                        readOnly={!isEditingPendingSession}
                                        onChange={(e) => setAddSessionNumber(e.target.value.replace(/\D/g, ''))}
                                        title={
                                            isEditingPendingSession
                                                ? undefined
                                                : 'يُحسب تلقائياً حسب تسلسل الجلسات المسجّلة'
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-white/60 text-xs mb-1">{presenceField.label}</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                    value={addPresence}
                                    onChange={(e) =>
                                        setAddPresence(e.target.value === 'absent' ? 'absent' : 'present')
                                    }
                                >
                                    {presenceField.options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {!showPreparatoryInline && !readOnly && !dossierConcluded ? (
                                <button
                                    type="button"
                                    onClick={handleModalPreparatoryClick}
                                    className="w-full rounded-xl border border-violet-500/35 bg-violet-950/20 px-3 py-2 text-[11px] font-black text-violet-100 hover:bg-violet-950/35 transition text-right"
                                >
                                    ⚖️ تسجيل قرار إعدادي (اختياري)
                                </button>
                            ) : null}
                            {showPreparatoryInline ? (
                                <div className="rounded-xl border border-violet-500/35 bg-violet-950/20 p-3 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-violet-100 text-[11px] font-black">
                                            قرار إعدادي — الجلسة رقم {addSessionNumber || '—'}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowPreparatoryInline(false)}
                                            className="text-[10px] font-bold text-white/45 hover:text-white/70"
                                        >
                                            إخفاء
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-white/60 text-xs mb-1">
                                            اسم القرار الإعدادي / الأمر
                                        </label>
                                        <input
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                            value={prepTitle}
                                            onChange={(e) => setPrepTitle(e.target.value)}
                                            placeholder="مثال: تأجيل نظر الدعوى لطلب مستند"
                                        />
                                    </div>
                                    <div
                                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 space-y-1.5"
                                        role="group"
                                        aria-label="هل القرار يترتب عليه منع أو وقف في سير الدعوى؟"
                                    >
                                        <span className="block text-[10px] font-bold text-white/75">
                                            هل القرار يترتب عليه منع أو وقف في سير الدعوى؟
                                        </span>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <button
                                                type="button"
                                                role="radio"
                                                aria-checked={isBlockingSuit}
                                                onClick={() => setIsBlockingSuit(true)}
                                                className={`rounded-lg border px-2.5 py-1 text-[10px] font-black transition ${
                                                    isBlockingSuit
                                                        ? 'border-[#E6C673]/55 bg-[#E6C673]/15 text-[#E6C673]'
                                                        : 'border-white/15 bg-white/[0.04] text-white/60'
                                                }`}
                                            >
                                                نعم
                                            </button>
                                            <button
                                                type="button"
                                                role="radio"
                                                aria-checked={!isBlockingSuit}
                                                onClick={() => setIsBlockingSuit(false)}
                                                className={`rounded-lg border px-2.5 py-1 text-[10px] font-black transition ${
                                                    !isBlockingSuit
                                                        ? 'border-slate-500/45 bg-slate-700/35 text-slate-200'
                                                        : 'border-white/15 bg-white/[0.04] text-white/60'
                                                }`}
                                            >
                                                لا
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-white/60 text-xs mb-1">
                                            تفاصيل ووقائع القرار
                                        </label>
                                        <textarea
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white min-h-[72px] resize-none"
                                            value={prepDetails}
                                            onChange={(e) => setPrepDetails(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={submitPreparatoryDecision}
                                            className="rounded-xl bg-violet-600/85 px-4 py-2 text-[11px] font-black text-white hover:bg-violet-600 transition"
                                        >
                                            حفظ الجلسة وتوثيق القرار
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                            <div>
                                <label className="block text-white/60 text-xs mb-1">محضر المرافعة / ما جرى</label>
                                <textarea
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white min-h-[88px] resize-none"
                                    value={addNotes}
                                    onChange={(e) => setAddNotes(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleModalPostpone}
                                    className="rounded-xl border border-amber-500/35 bg-amber-950/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-950/35 transition"
                                >
                                    تأجيل المحاكمة
                                </button>
                                <button
                                    type="button"
                                    onClick={handleModalFinalDecisionClick}
                                    className="rounded-xl border border-[#d4af37]/55 bg-[#d4af37]/15 px-4 py-2 text-[11px] font-black text-[#d4af37] hover:bg-[#d4af37]/25 transition"
                                >
                                    إصدار القرار الختامي
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {postponeSessionId && postponeSession ? (
                <div className="fixed inset-0 z-[236] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden">
                    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl">
                        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                            <div className="text-white font-black text-sm">
                                تأجيل الجلسة {postponeSession.sessionNumber}
                            </div>
                            <button
                                type="button"
                                onClick={() => setPostponeSessionId(null)}
                                className="text-white/60 text-xs font-bold"
                            >
                                إغلاق
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <input
                                type="date"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white unicode-bidi-plaintext"
                                dir="ltr"
                                value={nextDate}
                                onChange={(e) =>
                                    setNextDate(sanitizeTrialSessionIsoDateInput(e.target.value))
                                }
                            />
                            <textarea
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white min-h-[72px] resize-none"
                                placeholder="سبب التأجيل"
                                value={postponeReason}
                                onChange={(e) => setPostponeReason(e.target.value)}
                            />
                            <textarea
                                className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-amber-50 min-h-[72px] resize-none"
                                placeholder="الواجب التحضيري للمحامي"
                                value={prepNote}
                                onChange={(e) => setPrepNote(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setPostponeSessionId(null)}
                                    className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-white/70"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={submitPostpone}
                                    className="rounded-xl bg-amber-600/80 px-4 py-2 text-sm font-black text-white"
                                >
                                    تأكيد التأجيل
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
