import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type {
    VisitationScheduleBundle,
    VisitationScheduleConfig,
    VisitationSession,
    VisitationSessionStatus,
} from '@/app/types/visitationSchedule';
import {
    findNearestScheduledSession,
    findNextVisitationSessionAfter,
    formatCountdownAr,
    formatDateLongAr,
    formatVisitationSessionDateAr,
    getVisitationDocumentationActions,
    getVisitationFieldLabels,
    openVisitationBreachMemoPrint,
    isVisitationSessionDocumented,
    sessionCalendarLabel,
    syncRollingCalendarSessions,
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

function partyDisplayName(row: { name?: string; fullName?: string } | undefined): string {
    return String(row?.name || row?.fullName || '').trim();
}

function readBundle(data: ExecutionFile | null | undefined): VisitationScheduleBundle | null {
    const raw = (data as { visitationSchedule?: VisitationScheduleBundle } | undefined)?.visitationSchedule;
    if (!raw?.config || !Array.isArray(raw.sessions)) return null;
    return raw;
}

function sessionsSignature(list: VisitationSession[]): string {
    return list.map((s) => `${s.id}:${s.status}:${s.documentedAt ?? ''}`).join('|');
}

const CHILD_CHIP_COLORS = [
    'bg-[#E6C673]/15 border-[#E6C673]/35 text-[#E6C673]',
    'bg-white/5 border-white/15 text-slate-200',
    'bg-amber-500/10 border-amber-500/30 text-amber-100',
];

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
    const stored = readBundle(executionData);
    const creditorName = partyDisplayName(executionData?.creditors?.[0] as { name?: string });
    const debtorName = partyDisplayName(executionData?.debtors?.[0] as { name?: string });
    const [showFollowing, setShowFollowing] = useState(false);

    const sessions = stored?.sessions ?? [];
    const config = stored?.config;

    useEffect(() => {
        if (!config || !stored) return;
        const rolled = syncRollingCalendarSessions(config, sessions, todayYmd);
        if (sessionsSignature(rolled) !== sessionsSignature(sessions)) {
            persistExecutionMerge({ visitationSchedule: { config, sessions: rolled } });
        }
    }, [config, stored, sessions, todayYmd, persistExecutionMerge]);

    const nearestSession = useMemo(
        () => findNearestScheduledSession(sessions, todayYmd),
        [sessions, todayYmd]
    );

    const followingSession = useMemo(() => {
        if (!nearestSession) return null;
        return findNextVisitationSessionAfter(sessions, nearestSession.date);
    }, [sessions, nearestSession]);

    const canToggleFollowing = Boolean(
        followingSession && followingSession.id !== nearestSession?.id
    );

    const displayedSession =
        showFollowing && followingSession ? followingSession : nearestSession;

    const displayedTitle =
        showFollowing && followingSession ? 'الموعد التالي' : 'أقرب موعد';

    const docActions = useMemo(
        () => (config ? getVisitationDocumentationActions(config.decisionMode) : null),
        [config]
    );

    const canDocument =
        Boolean(nearestSession) &&
        !showFollowing &&
        displayedSession?.id === nearestSession?.id &&
        nearestSession!.status === 'scheduled' &&
        nearestSession!.date <= todayYmd;

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
                    : s
            );
            let merged = nextSessions;
            const rolled = syncRollingCalendarSessions(config, merged, todayYmd);
            if (sessionsSignature(rolled) !== sessionsSignature(merged)) merged = rolled;

            persistExecutionMerge({ visitationSchedule: { config, sessions: merged } });
            setShowFollowing(false);

            const session = merged.find((s) => s.id === sessionId);
            if (!session) return;

            if (status === 'completed') {
                showToast(docActions.successToast, 'success');
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'procedural',
                    title: docActions.timelineSuccessTitle,
                    description: `${docActions.statusSuccessShort} — ${formatVisitationSessionDateAr(session)}.`,
                    date: session.date,
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
                type: 'procedural',
                title: docActions.timelineAbsenceTitle,
                description: `${docActions.statusAbsenceShort} — ${absentLabel} — ${formatVisitationSessionDateAr(session)}.`,
                date: session.date,
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
        ]
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

    if (!stored || sessions.length === 0) {
        return (
            <div className="w-full px-3 py-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-right">
                    <p className="text-sm font-bold text-slate-300">جدول التنفيذ والمتابعة</p>
                    <p className="text-xs text-slate-500 mt-2">لم يُولَّد الجدول بعد.</p>
                </div>
            </div>
        );
    }

    const labels = getVisitationFieldLabels(config!.decisionMode);

    return (
        <div className="w-full px-3 py-4 space-y-3">
            <p className="text-[#E6C673] font-bold text-base text-right px-1">جدول التنفيذ والمتابعة</p>

            <div className="rounded-3xl border border-[#E6C673]/30 bg-gradient-to-br from-[#E6C673]/12 via-[#0B1120] to-[#0B1120] p-5 space-y-4">
                {visitChildNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end">
                        {visitChildNames.map((name, i) => (
                            <span
                                key={`${name}-${i}`}
                                className={`inline-flex px-3 py-1.5 rounded-full border text-sm font-bold ${
                                    CHILD_CHIP_COLORS[i % CHILD_CHIP_COLORS.length]
                                }`}
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                )}

                {displayedSession ? (
                    <>
                        <AppointmentBlock
                            title={displayedTitle}
                            session={displayedSession}
                            config={config!}
                            labels={labels}
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
                                          config!.decisionMode,
                                          todayYmd
                                      )
                                    : undefined
                            }
                        >
                            {canDocument && docActions && (
                                <div className="flex flex-col sm:flex-row-reverse gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleDocumentSuccess}
                                        className="flex-1 py-3 rounded-xl bg-emerald-600/25 border border-emerald-500/45 text-emerald-100 text-sm font-bold hover:bg-emerald-600/35"
                                    >
                                        {docActions.successLabel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDocumentAbsence}
                                        className="flex-1 py-3 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-100 text-sm font-bold hover:bg-rose-600/30"
                                    >
                                        {docActions.absenceLabel}
                                    </button>
                                </div>
                            )}
                            {canDocument && (
                                <p className="text-xs font-bold text-amber-300 text-right pt-1">
                                    موعد مستحق — جاهز للتوثيق وفق نوع القرار
                                </p>
                            )}
                        </AppointmentBlock>

                        {canToggleFollowing && (
                            <button
                                type="button"
                                onClick={() => setShowFollowing((v) => !v)}
                                className="w-full flex flex-col items-center gap-1 py-2 text-[#E6C673]/80 hover:text-[#E6C673] transition-colors"
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
                        )}
                    </>
                ) : (
                    <p className="text-sm text-slate-400 text-right">لا توجد مواعيد مجدولة في النافذة الحالية.</p>
                )}
            </div>
        </div>
    );
};

function AppointmentBlock({
    title,
    session,
    config,
    labels,
    todayYmd,
    tone,
    countdown,
    statusLabel,
    children,
}: {
    title: string;
    session: VisitationSession;
    config: VisitationScheduleConfig;
    labels: ReturnType<typeof getVisitationFieldLabels>;
    todayYmd: string;
    tone: 'current' | 'next';
    countdown?: string;
    statusLabel?: string;
    children?: React.ReactNode;
}) {
    return (
        <div
            className={`rounded-2xl border px-4 py-3 space-y-2 ${
                tone === 'current'
                    ? 'border-amber-500/35 bg-amber-500/8'
                    : 'border-white/10 bg-black/20'
            }`}
        >
            <div className="text-right">
                <p className="text-[11px] font-bold text-slate-400">{title}</p>
                <p className="text-base font-black text-white mt-0.5">{formatDateLongAr(session.date)}</p>
                {countdown && (
                    <p className="text-xs font-bold text-amber-200/90 mt-1">{countdown}</p>
                )}
                {tone === 'current' && session.date === todayYmd && session.status === 'scheduled' && (
                    <p className="text-xs font-bold text-amber-300 mt-1">موعد اليوم</p>
                )}
                {statusLabel && (
                    <p className="text-xs text-slate-500 text-right pt-1">{statusLabel}</p>
                )}
            </div>
            <div className="text-xs text-slate-400 space-y-1 text-right">
                <p className="flex items-center gap-2 flex-row-reverse justify-end">
                    <MapPin size={13} className="text-[#E6C673] shrink-0" />
                    {labels.location}: {config.location}
                </p>
                <p className="flex items-center gap-2 flex-row-reverse justify-end">
                    <Clock size={13} className="text-[#E6C673] shrink-0" />
                    {labels.startTime}: {config.startTime}
                    {config.endTime ? ` — ${config.endTime}` : ''}
                </p>
                {config.decisionMode === 'viewing_pickup_sleepover' && (
                    <p className="text-right">
                        ليالي المبيت: {config.sleepoverNights} — {labels.returnTime}: {config.returnTime}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}
