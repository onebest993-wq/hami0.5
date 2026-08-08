import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronUp, CheckCircle, Clock, MapPin, UserX, Users, X } from '@/app/components/ui/lucideIcons';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type {
    VisitationScheduleBundle,
    VisitationScheduleConfig,
    VisitationSession,
    VisitationSessionStatus,
} from '@/app/types/visitationSchedule';
import {
    VisitationScheduleSetupSection,
    createEmptyVisitationScheduleDraft,
} from '@/app/components/lawyer/ExecutionCreationView/components/VisitationScheduleSetupSection';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import { VisitationCalendarPanel } from './VisitationCalendarPanel';
import {
    buildVisitationScheduleBundle,
    findNearestScheduledSession,
    findNextVisitationSessionAfter,
    formatCountdownAr,
    formatDateCompactAr,
    formatDateLongAr,
    formatVisitationSessionDateAr,
    getVisitationDocumentationActions,
    openVisitationBreachMemoPrint,
    isVisitationSessionDocumented,
    sessionCalendarLabel,
    syncRollingCalendarSessions,
    summarizeVisitationAppointment,
} from '@/app/utils/visitationScheduleEngine';

export interface VisitationScheduleModuleProps {
    executionData: ExecutionFile | null | undefined;
    visitChildNames: string[];
    fileNumber?: string;
    todayYmd: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

type WorkspaceTab = 'appointment' | 'calendar' | 'setup';

const WORKSPACE_Z = EXEC_MODAL_Z.nestedOverFollowUpPortal;

const CHILD_CHIP_COLORS = [
    'bg-[#E6C673]/15 border-[#E6C673]/35 text-[#E6C673]',
    'bg-white/5 border-white/15 text-slate-200',
    'bg-amber-500/10 border-amber-500/30 text-amber-100',
];

function partyDisplayName(row: { name?: string; fullName?: string } | undefined): string {
    return String(row?.name || row?.fullName || '').trim();
}

function readBundle(data: ExecutionFile | null | undefined): VisitationScheduleBundle | null {
    const raw = (data as { visitationSchedule?: VisitationScheduleBundle } | undefined)?.visitationSchedule;
    if (!raw?.config) return null;
    return {
        config: raw.config,
        sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    };
}

function bundleIsReady(bundle: VisitationScheduleBundle | null): bundle is VisitationScheduleBundle {
    return Boolean(bundle?.config && bundle.sessions.length > 0);
}

function sessionsSignature(list: VisitationSession[]): string {
    return list.map((s) => `${s.id}:${s.status}:${s.documentedAt ?? ''}`).join('|');
}

function VisitationLauncherCard({
    ready,
    visitChildNames,
    scheduledCount,
    documentedCount,
    scheduleHint,
    onOpen,
}: {
    ready: boolean;
    visitChildNames: string[];
    scheduledCount: number;
    documentedCount: number;
    scheduleHint: string;
    onOpen: (tab?: WorkspaceTab) => void;
}) {
    const childPreview =
        visitChildNames.length > 0
            ? `${visitChildNames.slice(0, 2).join('، ')}${
                  visitChildNames.length > 2 ? ` +${visitChildNames.length - 2}` : ''
              }`
            : null;

    return (
        <button
            type="button"
            data-testid="visitation-schedule-launcher"
            onClick={() => onOpen(ready ? 'appointment' : 'setup')}
            className="mx-3 mt-2 w-[calc(100%-1.5rem)] rounded-xl border border-[#E6C673]/20 bg-[#0B1120]/75 px-3 py-2.5 text-right ring-1 ring-white/[0.03] transition-colors hover:border-[#E6C673]/35 hover:bg-[#E6C673]/8 touch-manipulation"
            dir="rtl"
        >
            <div className="flex items-center gap-2 flex-row-reverse">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673]">
                    <Users size={15} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-tight text-[#E6C673]">
                        جدول التنفيذ والمتابعة
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{scheduleHint}</p>
                    {childPreview ? (
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{childPreview}</p>
                    ) : null}
                </div>
                <ChevronLeft size={16} className="shrink-0 text-[#E6C673]/50 rotate-180" aria-hidden />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 flex-row-reverse text-[9px]">
                {ready ? (
                    <>
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-bold text-slate-300">
                            {scheduledCount} موعد
                        </span>
                        {documentedCount > 0 ? (
                            <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-200/90">
                                {documentedCount} موثّق
                            </span>
                        ) : null}
                    </>
                ) : (
                    <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-100">
                        إعداد الجدول
                    </span>
                )}
            </div>
        </button>
    );
}

function VisitationWorkspaceSheet({
    open,
    onClose,
    ready,
    activeTab,
    onTabChange,
    children,
}: {
    open: boolean;
    onClose: () => void;
    ready: boolean;
    activeTab: WorkspaceTab;
    onTabChange: (tab: WorkspaceTab) => void;
    children: React.ReactNode;
}) {
    if (!open || typeof document === 'undefined') return null;

    const tabs: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = ready
        ? [
              { id: 'appointment', label: 'الموعد', icon: <Clock size={14} /> },
              { id: 'calendar', label: 'التقويم', icon: <CalendarDays size={14} /> },
          ]
        : [{ id: 'setup', label: 'إعداد الجدول', icon: <CalendarDays size={14} /> }];

    return createPortal(
        <div
            className={`fixed inset-0 flex flex-col ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: WORKSPACE_Z }}
            role="dialog"
            aria-modal="true"
            aria-label="جدول التنفيذ والمتابعة"
            data-testid="visitation-schedule-workspace"
            onClick={onClose}
        >
            <div
                className="mt-auto flex h-[min(96dvh,100%)] w-full max-w-lg flex-col self-center overflow-hidden rounded-t-3xl border border-[#E6C673]/25 bg-[#0B1120] shadow-2xl sm:my-auto sm:h-[min(92dvh,820px)] sm:rounded-3xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0A0F1C]/95 px-3 py-3 backdrop-blur-md flex-row-reverse">
                    <button
                        type="button"
                        data-testid="visitation-schedule-close"
                        onClick={onClose}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 touch-manipulation"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <div className="min-w-0 flex-1 text-right">
                        <p className="text-sm font-bold text-[#E6C673]">جدول التنفيذ والمتابعة</p>
                        <p className="text-[10px] text-slate-500">الموعد · التوثيق · التقويم</p>
                    </div>
                </div>

                {tabs.length > 1 ? (
                    <div className="flex shrink-0 gap-2 border-b border-white/[0.06] bg-[#0A0F1C]/60 px-3 py-2 flex-row-reverse">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                data-testid={`visitation-tab-${tab.id}`}
                                onClick={() => onTabChange(tab.id)}
                                className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-bold transition-colors touch-manipulation ${
                                    activeTab === tab.id
                                        ? 'border-[#E6C673]/40 bg-[#E6C673]/12 text-[#E6C673]'
                                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}

export const VisitationScheduleModule: React.FC<VisitationScheduleModuleProps> = ({
    executionData,
    visitChildNames,
    fileNumber,
    todayYmd,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    showToast,
}) => {
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
        persistExecutionMerge({ visitationSchedule: built.bundle });
        showToast('تم توليد جدول المواعيد بنجاح.', 'success');
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
            return config
                ? 'جاري توليد المواعيد من الإعدادات المحفوظة…'
                : 'أكمل إعداد الجدول ثم اضغط «توليد الجدول»';
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

            persistExecutionMerge({ visitationSchedule: { config, sessions: merged } });
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
        if (!window.confirm(docActions.confirmSuccess)) return;
        updateSessionStatus(nearestSession.id, 'completed');
    }, [nearestSession, docActions, updateSessionStatus]);

    const handleDocumentAbsence = useCallback(() => {
        if (!nearestSession || !docActions) return;
        if (!window.confirm(docActions.confirmAbsence)) return;
        updateSessionStatus(nearestSession.id, 'default_party_two');
    }, [nearestSession, docActions, updateSessionStatus]);

    const workspaceContent = useMemo(() => {
        if (!ready || workspaceTab === 'setup') {
            return (
                <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-300 text-right">إعداد جدول المواعيد</p>
                    {!config ? (
                        <VisitationScheduleSetupSection
                            draft={setupDraft}
                            onChange={setSetupDraft}
                            showGenerateButton
                            onGenerate={handleGenerateSchedule}
                            generateButtonLabel="توليد الجدول"
                        />
                    ) : (
                        <p className="text-xs text-slate-500 text-right">
                            جاري توليد المواعيد من إعدادات الجدول المحفوظة…
                        </p>
                    )}
                </div>
            );
        }

        if (workspaceTab === 'calendar' && config) {
            return (
                <VisitationCalendarPanel
                    config={config}
                    sessions={sessions}
                    todayYmd={todayYmd}
                />
            );
        }

        return (
            <div className="space-y-3">
                {visitChildNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                        {visitChildNames.map((name, i) => (
                            <span
                                key={`${name}-${i}`}
                                className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                                    CHILD_CHIP_COLORS[i % CHILD_CHIP_COLORS.length]
                                }`}
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                ) : null}

                {displayedSession && config ? (
                    <>
                        <AppointmentBlock
                            title={displayedTitle}
                            session={displayedSession}
                            config={config}
                            todayYmd={todayYmd}
                            tone={showFollowing ? 'next' : 'current'}
                            countdown={
                                showFollowing
                                    ? formatCountdownAr(todayYmd, displayedSession.date)
                                    : undefined
                            }
                            statusLabel={
                                isVisitationSessionDocumented(displayedSession)
                                    ? sessionCalendarLabel(
                                          displayedSession,
                                          config.decisionMode,
                                          todayYmd,
                                      )
                                    : undefined
                            }
                        >
                            {canDocument && docActions && (
                                <div className="space-y-2 pt-1">
                                    <p className="text-[9px] font-bold text-amber-200/80 text-right">
                                        توثيق الموعد المستحق
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            data-testid="visitation-document-success"
                                            onClick={handleDocumentSuccess}
                                            className="group flex flex-row-reverse items-center gap-3 rounded-xl border border-emerald-500/35 bg-gradient-to-b from-emerald-500/14 to-emerald-950/20 px-3 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:border-emerald-400/45 hover:from-emerald-500/20 active:scale-[0.99] touch-manipulation min-h-[48px]"
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/15 text-emerald-100">
                                                <CheckCircle size={18} aria-hidden />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[11px] font-black text-emerald-50 leading-snug">
                                                    تنفيذ ناجح
                                                </span>
                                                <span className="mt-0.5 block text-[9px] font-medium text-emerald-200/75 leading-relaxed">
                                                    {docActions.successLabel}
                                                </span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="visitation-document-absence"
                                            onClick={handleDocumentAbsence}
                                            className="group flex flex-row-reverse items-center gap-3 rounded-xl border border-rose-500/30 bg-gradient-to-b from-rose-600/12 to-rose-950/20 px-3 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-rose-400/40 hover:from-rose-600/18 active:scale-[0.99] touch-manipulation min-h-[48px]"
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-600/15 text-rose-100">
                                                <UserX size={18} aria-hidden />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[11px] font-black text-rose-50 leading-snug">
                                                    نكول / عدم تنفيذ
                                                </span>
                                                <span className="mt-0.5 block text-[9px] font-medium text-rose-200/75 leading-relaxed">
                                                    {docActions.absenceLabel}
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            {canDocument ? (
                                <p className="text-[10px] font-bold text-amber-300/90 text-right">
                                    موعد مستحق — جاهز للتوثيق
                                </p>
                            ) : null}
                        </AppointmentBlock>

                        {canToggleFollowing ? (
                            <button
                                type="button"
                                data-testid="visitation-toggle-following"
                                onClick={() => setShowFollowing((v) => !v)}
                                className="w-full flex flex-col items-center gap-1 py-2 text-[#E6C673]/80 hover:text-[#E6C673] transition-colors touch-manipulation min-h-[44px]"
                            >
                                {showFollowing ? (
                                    <>
                                        <ChevronUp size={22} />
                                        <span className="text-[11px] font-bold">العودة إلى أقرب موعد</span>
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown size={22} />
                                        <span className="text-[11px] font-bold">عرض الموعد التالي</span>
                                    </>
                                )}
                            </button>
                        ) : null}
                    </>
                ) : (
                    <p className="text-sm text-slate-400 text-right">
                        لا توجد مواعيد مجدولة في النافذة الحالية.
                    </p>
                )}
            </div>
        );
    }, [
        ready,
        workspaceTab,
        config,
        setupDraft,
        handleGenerateSchedule,
        sessions,
        todayYmd,
        visitChildNames,
        displayedSession,
        displayedTitle,
        showFollowing,
        canDocument,
        docActions,
        canToggleFollowing,
        handleDocumentSuccess,
        handleDocumentAbsence,
    ]);

    return (
        <>
            <VisitationLauncherCard
                ready={ready}
                visitChildNames={visitChildNames}
                scheduledCount={scheduledCount}
                documentedCount={documentedCount}
                scheduleHint={scheduleHint}
                onOpen={openWorkspace}
            />

            <VisitationWorkspaceSheet
                open={workspaceOpen}
                onClose={requestCloseWorkspace}
                ready={ready}
                activeTab={workspaceTab}
                onTabChange={setWorkspaceTab}
            >
                {workspaceContent}
            </VisitationWorkspaceSheet>
        </>
    );
};

function AppointmentBlock({
    title,
    session,
    config,
    todayYmd,
    tone,
    countdown,
    statusLabel,
    children,
}: {
    title: string;
    session: VisitationSession;
    config: VisitationScheduleConfig;
    todayYmd: string;
    tone: 'current' | 'next';
    countdown?: string;
    statusLabel?: string;
    children?: React.ReactNode;
}) {
    const summary = useMemo(
        () => summarizeVisitationAppointment(config, session.date),
        [config, session.date],
    );
    const pickupTitle =
        config.decisionMode === 'viewing_pickup_sleepover' ? 'موعد الاستلام' : title;
    const isToday =
        tone === 'current' && session.date === todayYmd && session.status === 'scheduled';

    return (
        <div
            className={`rounded-xl border overflow-hidden ${
                tone === 'current'
                    ? 'border-amber-500/30 bg-amber-500/[0.06]'
                    : 'border-white/10 bg-black/15'
            }`}
        >
            <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-white/[0.05]">
                <div className="min-w-0 flex-1 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <span className="text-[10px] font-bold text-[#E6C673]/85">{pickupTitle}</span>
                        {isToday ? (
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                                اليوم
                            </span>
                        ) : null}
                        {statusLabel ? (
                            <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] text-slate-400">
                                {statusLabel}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-0.5 text-[13px] font-black leading-snug text-white">
                        {formatDateCompactAr(session.date)}
                    </p>
                    <p className="text-[9px] text-slate-500">{formatDateLongAr(session.date)}</p>
                </div>
                {countdown ? (
                    <span className="shrink-0 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[9px] font-bold text-amber-100">
                        {countdown}
                    </span>
                ) : null}
            </div>

            <div className="space-y-2 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-row-reverse justify-end">
                    <MapPin size={11} className="shrink-0 text-[#E6C673]/80" />
                    <span className="truncate">{summary.location}</span>
                </p>

                {summary.mode === 'viewing_pickup_sleepover' ? (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 px-2 py-2">
                        <div className="text-right">
                            <p className="text-[8px] font-bold text-[#E6C673]/75">استلام</p>
                            <p className="text-[11px] font-bold text-slate-100">{summary.pickupTime}</p>
                        </div>
                        <div className="flex flex-col items-center px-1">
                            <span className="text-[8px] text-sky-300/90">{summary.nightsLabel}</span>
                            <span className="my-0.5 h-px w-6 bg-gradient-to-l from-sky-400/50 to-[#E6C673]/50" />
                        </div>
                        <div className="text-left">
                            <p className="text-[8px] font-bold text-sky-300/90">إرجاع</p>
                            <p className="text-[10px] font-bold text-slate-100 leading-tight">
                                {summary.returnDateYmd
                                    ? formatDateCompactAr(summary.returnDateYmd)
                                    : '—'}
                            </p>
                            <p className="text-[10px] text-slate-400">{summary.returnTime}</p>
                        </div>
                    </div>
                ) : (
                    <p className="flex items-center gap-1.5 text-[10px] text-slate-300 flex-row-reverse justify-end">
                        <Clock size={11} className="shrink-0 text-[#E6C673]/80" />
                        <span>
                            {summary.pickupTime}
                            {summary.endTime ? ` — ${summary.endTime}` : ''}
                        </span>
                    </p>
                )}
            </div>

            {children ? <div className="border-t border-white/[0.05] px-3 py-2">{children}</div> : null}
        </div>
    );
}
