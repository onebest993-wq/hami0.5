import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { AddTrialSessionInput, TrialSession } from '../trialSessionsEngine';
import {
    findCurrentPendingTrialSession,
    filterTrialSessionsForDisplay,
    isTrialDossierConcluded,
    normalizeTrialSessions,
    resolveTrialPresenceFieldConfig,
    sortTrialSessionsAsc,
    sortTrialSessionsDesc,
    suggestNextSessionNumber,
    todayIsoDate,
} from '../trialSessionsEngine';
import { useCriminalStore } from '../criminalStore';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import { TrialHearingDateHint } from './TrialHearingDateHint';
import { TrialsTabHeader } from './TrialsTabHeader';
import { TrialsSessionList } from './TrialsSessionList';
import { TrialsAddSessionModal } from './TrialsAddSessionModal';
import { TrialsPostponeModal } from './TrialsPostponeModal';

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
    /** موعد المحاكمة المسجّل كتلميح — يُعرض بدل جلسة وهمية */
    scheduledHearingDate?: string | null;
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
    currentAccusationArticle: _currentAccusationArticle,
    crimeType: _crimeType,
    onError,
    embedded = false,
    addModalOpen,
    onAddModalOpenChange,
    remandPivotDate = null,
    scheduledHearingDate = null,
}: TrialsTabProps) => {
    const scheduledDate = String(scheduledHearingDate ?? '').trim();
    const effectiveSessions = useMemo(
        () => filterTrialSessionsForDisplay(sessions, scheduledDate),
        [sessions, scheduledDate],
    );
    const sorted = useMemo(() => sortTrialSessionsAsc(effectiveSessions), [effectiveSessions]);
    const displaySessions = useMemo(() => sortTrialSessionsDesc(effectiveSessions), [effectiveSessions]);
    const currentPending = useMemo(() => findCurrentPendingTrialSession(sorted), [sorted]);
    const dossierConcluded = isTrialDossierConcluded(sorted);
    const showScheduledHearingHint = Boolean(scheduledDate) && displaySessions.length === 0;

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

    return (
        <div
            key={`criminal-tab-trials-${caseId}`}
            className={
                embedded
                    ? 'flex flex-col w-full gap-4'
                    : 'flex flex-col p-4 max-w-5xl mx-auto w-full gap-4'
            }
        >
            {!embedded ? (
                <TrialsTabHeader
                    readOnly={readOnly}
                    dossierConcluded={dossierConcluded}
                    onAddSessionClick={() => setIsAddOpen(true)}
                />
            ) : null}

            {showScheduledHearingHint ? (
                <TrialHearingDateHint hearingDate={scheduledDate} />
            ) : null}

            <TrialsSessionList
                displaySessions={displaySessions}
                sorted={sorted}
                currentPendingId={currentPending?.id}
                remandPivotDate={remandPivotDate}
                caseStage={caseStage}
                judicialDecisions={judicialDecisions}
                readOnly={readOnly}
                userRole={userRole}
                dossierConcluded={dossierConcluded}
                onOpenPreparatoryForCurrent={() => {
                    setIsAddOpen(true);
                    setShowPreparatoryInline(true);
                }}
                onCassationAppeal={onCassationAppeal}
                onInterventionCassation={onInterventionCassation}
                onCassationCorrection={onCassationCorrection}
                onDeclareJudgmentFinal={onDeclareJudgmentFinal}
                onRecordAppealResult={onRecordAppealResult}
            />

            {isAddOpen ? (
                <TrialsAddSessionModal
                    isEditingPendingSession={isEditingPendingSession}
                    addDate={addDate}
                    setAddDate={setAddDate}
                    addSessionNumber={addSessionNumber}
                    setAddSessionNumber={setAddSessionNumber}
                    addPresence={addPresence}
                    setAddPresence={setAddPresence}
                    addNotes={addNotes}
                    setAddNotes={setAddNotes}
                    presenceField={presenceField}
                    showPreparatoryInline={showPreparatoryInline}
                    setShowPreparatoryInline={setShowPreparatoryInline}
                    prepTitle={prepTitle}
                    setPrepTitle={setPrepTitle}
                    prepDetails={prepDetails}
                    setPrepDetails={setPrepDetails}
                    isBlockingSuit={isBlockingSuit}
                    setIsBlockingSuit={setIsBlockingSuit}
                    readOnly={readOnly}
                    dossierConcluded={dossierConcluded}
                    onClose={closeAddModal}
                    onPreparatoryToggle={handleModalPreparatoryClick}
                    onSubmitPreparatory={submitPreparatoryDecision}
                    onPostpone={handleModalPostpone}
                    onFinalDecision={handleModalFinalDecisionClick}
                />
            ) : null}

            {postponeSessionId && postponeSession ? (
                <TrialsPostponeModal
                    postponeSession={postponeSession}
                    nextDate={nextDate}
                    setNextDate={setNextDate}
                    postponeReason={postponeReason}
                    setPostponeReason={setPostponeReason}
                    prepNote={prepNote}
                    setPrepNote={setPrepNote}
                    onClose={() => setPostponeSessionId(null)}
                    onConfirm={submitPostpone}
                />
            ) : null}
        </div>
    );
};
