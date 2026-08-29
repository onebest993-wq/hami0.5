import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    VisitationScheduleBundle,
    VisitationScheduleConfig,
    VisitationSessionStatus,
} from '@/app/types/visitationSchedule';
import { createEmptyVisitationScheduleDraft } from '@/app/components/lawyer/ExecutionCreationView/components/VisitationScheduleSetupSection';
import { useExecutionSectionConfirm } from '@/app/components/lawyer/execution/useExecutionSectionConfirm';
import {
    buildVisitationScheduleBundle,
    findNearestScheduledSession,
    findNextVisitationSessionAfter,
    formatDateCompactAr,
    formatVisitationSessionDateAr,
    getVisitationDocumentationActions,
    openVisitationBreachMemoPrint,
    isVisitationSessionDocumented,
    syncRollingCalendarSessions,
} from '@/app/utils/visitationScheduleEngine';
import type { VisitationScheduleModuleProps, WorkspaceTab } from './visitationScheduleModuleTypes';
import {
    bundleIsReady,
    partyDisplayName,
    readBundle,
    sessionsSignature,
} from './visitationScheduleModuleUtils';
import { toastAfterExecutionPersist } from '@/app/components/lawyer/ExecutionDashboard/helpers/toastAfterExecutionPersist';
import {
    consumeOpenExecutionVisitationWorkspaceRequest,
    HAMI_OPEN_EXECUTION_VISITATION_WORKSPACE,
} from '@/app/runtime/executionVisitationOpenIntent';

export function useVisitationScheduleModuleState({
    executionData,
    visitChildNames,
    fileNumber,
    todayYmd,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    showToast,
}: VisitationScheduleModuleProps) {
    const visitationSchedule = (
        executionData as { visitationSchedule?: VisitationScheduleBundle } | undefined
    )?.visitationSchedule;
    const storedSessionsSig = sessionsSignature(
        Array.isArray(visitationSchedule?.sessions) ? visitationSchedule.sessions : [],
    );
    const stored = useMemo(
        () => readBundle(executionData),
        [executionData, visitationSchedule?.config, storedSessionsSig],
    );
    const sessions = stored?.sessions ?? [];
    const config = stored?.config;
    const sessionsSig = useMemo(() => sessionsSignature(sessions), [sessions]);
    const ready = bundleIsReady(stored);

    const creditorName = partyDisplayName(executionData?.creditors?.[0] as { name?: string });
    const debtorName = partyDisplayName(executionData?.debtors?.[0] as { name?: string });

    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('appointment');
    const [showFollowing, setShowFollowing] = useState(false);
    const [setupDraft, setSetupDraft] = useState<Partial<VisitationScheduleConfig>>(() =>
        createEmptyVisitationScheduleDraft(Boolean(executionData?.includesSleepover)),
    );

    const openWorkspace = useCallback(
        (tab: WorkspaceTab = ready ? 'appointment' : 'setup') => {
            setWorkspaceTab(tab);
            setWorkspaceOpen(true);
        },
        [ready],
    );

    const requestCloseWorkspace = useCallback(() => {
        setWorkspaceOpen(false);
        setShowFollowing(false);
    }, []);

    const executionFileId = String(executionData?.id ?? '').trim();

    useEffect(() => {
        if (!executionFileId) return;
        const tryOpenFromCalendar = () => {
            if (!consumeOpenExecutionVisitationWorkspaceRequest(executionFileId)) return;
            openWorkspace(ready ? 'appointment' : 'setup');
        };
        tryOpenFromCalendar();
        window.addEventListener(HAMI_OPEN_EXECUTION_VISITATION_WORKSPACE, tryOpenFromCalendar);
        return () => {
            window.removeEventListener(HAMI_OPEN_EXECUTION_VISITATION_WORKSPACE, tryOpenFromCalendar);
        };
    }, [executionFileId, ready, openWorkspace]);

    useEffect(() => {
        if (!workspaceOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') requestCloseWorkspace();
        };
        window.addEventListener('keydown', onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [workspaceOpen, requestCloseWorkspace]);

    const { confirm: confirmInSection, dialog: sectionConfirmDialog } = useExecutionSectionConfirm();

    const regenerateFromConfig = useCallback(
        (sourceConfig: VisitationScheduleConfig) => {
            const built = buildVisitationScheduleBundle(sourceConfig);
            if ('error' in built) {
                showToast(built.error, 'warning');
                return false;
            }
            persistExecutionMerge({ visitationSchedule: built.bundle });
            return true;
        },
        [persistExecutionMerge, showToast],
    );

    const autoRegenerateAttemptedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!config || sessions.length > 0) return;
        const configKey = JSON.stringify(config);
        if (autoRegenerateAttemptedRef.current === configKey) return;
        autoRegenerateAttemptedRef.current = configKey;
        regenerateFromConfig(config);
    }, [config, sessions.length, regenerateFromConfig]);

    const handleGenerateSchedule = useCallback(() => {
        const built = buildVisitationScheduleBundle(setupDraft as VisitationScheduleConfig);
        if ('error' in built) {
            showToast(built.error, 'warning');
            return;
        }
        const persisted = persistExecutionMerge({ visitationSchedule: built.bundle });
        if (
            !toastAfterExecutionPersist(
                persisted,
                showToast,
                'تم توليد جدول المواعيد بنجاح.',
            )
        ) {
            return;
        }
        setWorkspaceTab('appointment');
    }, [setupDraft, persistExecutionMerge, showToast]);

    const lastRolledSignatureRef = useRef<string | null>(null);

    useEffect(() => {
        if (!config) return;
        const rolled = syncRollingCalendarSessions(config, sessions, todayYmd);
        const nextSig = sessionsSignature(rolled);
        if (nextSig === sessionsSig) {
            lastRolledSignatureRef.current = sessionsSig;
            return;
        }
        if (lastRolledSignatureRef.current === nextSig) return;
        lastRolledSignatureRef.current = nextSig;
        persistExecutionMerge({ visitationSchedule: { config, sessions: rolled } });
    }, [config, sessions, sessionsSig, todayYmd, persistExecutionMerge]);

    const nearestSession = useMemo(
        () => findNearestScheduledSession(sessions, todayYmd),
        [sessions, todayYmd],
    );

    const followingSession = useMemo(() => {
        if (!nearestSession) return null;
        return findNextVisitationSessionAfter(sessions, nearestSession.date);
    }, [sessions, nearestSession]);

    const canToggleFollowing = Boolean(
        followingSession && followingSession.id !== nearestSession?.id,
    );

    const displayedSession =
        showFollowing && followingSession ? followingSession : nearestSession;

    const displayedTitle =
        showFollowing && followingSession ? 'الموعد التالي' : 'أقرب موعد';

    const docActions = useMemo(
        () => (config ? getVisitationDocumentationActions(config.decisionMode) : null),
        [config],
    );

    const canDocument =
        Boolean(nearestSession) &&
        !showFollowing &&
        displayedSession?.id === nearestSession?.id &&
        nearestSession!.status === 'scheduled' &&
        nearestSession!.date <= todayYmd;

    const scheduledCount = useMemo(
        () => sessions.filter((s) => s.status === 'scheduled').length,
        [sessions],
    );

    const documentedCount = useMemo(
        () => sessions.filter((s) => isVisitationSessionDocumented(s)).length,
        [sessions],
    );

    const scheduleHint = useMemo(() => {
        if (!ready) {
            return config ? '' : 'أكمل إعداد الجدول ثم اضغط «توليد الجدول»';
        }
        if (nearestSession) {
            return `أقرب موعد: ${formatDateCompactAr(nearestSession.date)}`;
        }
        return 'لا توجد مواعيد مجدولة في النافذة الحالية';
    }, [ready, config, nearestSession]);

    const updateSessionStatus = useCallback(
        (sessionId: string, status: VisitationSessionStatus) => {
            if (!config || !stored || !docActions) return;
            const nextSessions = sessions.map((s) =>
                s.id === sessionId
                    ? {
                          ...s,
                          status,
                          defaultParty: status === 'default_party_two' ? ('second' as const) : s.defaultParty,
                          documentedAt: new Date().toISOString(),
                      }
                    : s,
            );
            let merged = nextSessions;
            const rolled = syncRollingCalendarSessions(config, merged, todayYmd);
            if (sessionsSignature(rolled) !== sessionsSignature(merged)) merged = rolled;

            const persisted = persistExecutionMerge({
                visitationSchedule: { config, sessions: merged },
            });
            if (persisted === false) {
                showToast('تعذّر حفظ حالة الموعد — أعد المحاولة', 'error');
                return;
            }
            setShowFollowing(false);

            const session = merged.find((s) => s.id === sessionId);
            if (!session) return;

            const timestamp = new Date().toISOString();

            if (status === 'completed') {
                showToast(docActions.successToast, 'success');
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'procedure',
                    title: docActions.timelineSuccessTitle,
                    description: `${docActions.statusSuccessShort} — ${formatVisitationSessionDateAr(session)}.`,
                    date: session.date,
                    timestamp,
                    source: 'جدول التنفيذ والمتابعة',
                });
                return;
            }

            const absentLabel = `المدين${debtorName ? `: ${debtorName}` : ''}`;
            openVisitationBreachMemoPrint({
                session,
                config,
                absentPartyLabel: absentLabel,
                creditorName,
                debtorName,
                childNames: visitChildNames,
                fileNumber,
            });

            pushTimelineEvent({
                id: nextTimelineId(),
                type: 'procedure',
                title: docActions.timelineAbsenceTitle,
                description: `${docActions.statusAbsenceShort} — ${absentLabel} — ${formatVisitationSessionDateAr(session)}.`,
                date: session.date,
                timestamp,
                source: 'جدول التنفيذ والمتابعة',
            });
            showToast(docActions.absenceToast, 'success');
        },
        [
            config,
            stored,
            sessions,
            docActions,
            persistExecutionMerge,
            showToast,
            pushTimelineEvent,
            nextTimelineId,
            creditorName,
            debtorName,
            visitChildNames,
            fileNumber,
            todayYmd,
        ],
    );

    const handleDocumentSuccess = useCallback(() => {
        if (!nearestSession || !docActions) return;
        void confirmInSection(docActions.confirmSuccess).then((accepted) => {
            if (accepted) updateSessionStatus(nearestSession.id, 'completed');
        });
    }, [nearestSession, docActions, updateSessionStatus, confirmInSection]);

    const handleDocumentAbsence = useCallback(() => {
        if (!nearestSession || !docActions) return;
        void confirmInSection(docActions.confirmAbsence).then((accepted) => {
            if (accepted) updateSessionStatus(nearestSession.id, 'default_party_two');
        });
    }, [nearestSession, docActions, updateSessionStatus, confirmInSection]);

    return {
        ready,
        visitChildNames,
        scheduledCount,
        documentedCount,
        scheduleHint,
        openWorkspace,
        workspaceOpen,
        requestCloseWorkspace,
        workspaceTab,
        setWorkspaceTab,
        sectionConfirmDialog,
        config,
        setupDraft,
        setSetupDraft,
        handleGenerateSchedule,
        sessions,
        todayYmd,
        displayedSession,
        displayedTitle,
        showFollowing,
        setShowFollowing,
        canDocument,
        docActions,
        canToggleFollowing,
        handleDocumentSuccess,
        handleDocumentAbsence,
    };
}

export type VisitationScheduleModuleState = ReturnType<typeof useVisitationScheduleModuleState>;
