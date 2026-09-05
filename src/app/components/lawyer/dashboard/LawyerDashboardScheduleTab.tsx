import React, { useCallback, useEffect } from 'react';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
import { SmartLegalRadar } from '@/app/components/lawyer/SmartLegalRadar';
import { RadarErrorBoundary } from '@/app/components/lawyer/SmartLegalRadar/RadarErrorBoundary';
import type { FileData } from '../LawyerShared';
import type { ExecutionFile } from '@/app/types/execution';
import { subscribeCalendarOpenSource } from '@/app/services/calendar/calendarOpenSourceIntent';

export type LawyerDashboardScheduleTabProps = {
    visible: boolean;
    /** مفتاح إعادة تركيب الشِل من الجلسة — يُستخدم كمفتاح في MainView */
    scheduleTabSessionKey?: number;
    userId: string | undefined;
    authUserId: string | undefined;
    calendarSearchFocus: { date?: string; eventId?: string } | null;
    onClearCalendarSearchFocus: () => void;
    onBackToHome: () => void;
    files: FileData[];
    executionFiles: ExecutionFile[];
    onOpenLawsuitFile: (file: FileData) => void;
    onOpenExecutionFile: (file: ExecutionFile) => void;
    onOpenCriminalCase: (caseId: string) => void;
    onOpenUrgentCase: (caseId: string) => void;
    onOpenTransaction: (entityId: string, file?: FileData) => void;
    onOpenNote: (noteId: string) => void;
    onOpenFieldTasks: () => void;
};

/** تبويب التقويم — جسم الرادار داخل كروم الصدفة */
export function LawyerDashboardScheduleTab({
    visible,
    userId,
    authUserId,
    calendarSearchFocus,
    onClearCalendarSearchFocus,
    onBackToHome,
    files,
    executionFiles,
    onOpenLawsuitFile,
    onOpenExecutionFile,
    onOpenCriminalCase,
    onOpenUrgentCase,
    onOpenTransaction,
    onOpenNote,
    onOpenFieldTasks,
}: LawyerDashboardScheduleTabProps) {
    const handleBack = useCallback(() => {
        onClearCalendarSearchFocus();
        onBackToHome();
    }, [onBackToHome, onClearCalendarSearchFocus]);

    const calendarUserId = resolveCalendarUserId(userId ?? authUserId ?? null);

    const handleOpenSource = useCallback(
        (sourceModule: string, sourceEntityId: string, sourceEventId?: string) => {
            const handlers = {
                files,
                executionFiles,
                onOpenLawsuitFile,
                onOpenExecutionFile,
                onOpenCriminalCase,
                onOpenUrgentCase,
                onOpenTransaction,
                onOpenNote,
                onOpenFieldTasks,
                onBackToHome,
            };
            void import('@/app/components/lawyer/dashboard/schedule/openCalendarRadarSource').then(
                ({ openCalendarRadarSource }) => {
                    openCalendarRadarSource(
                        sourceModule,
                        sourceEntityId,
                        handlers,
                        sourceEventId,
                    );
                },
            );
        },
        [
            executionFiles,
            files,
            onBackToHome,
            onOpenCriminalCase,
            onOpenExecutionFile,
            onOpenFieldTasks,
            onOpenLawsuitFile,
            onOpenNote,
            onOpenTransaction,
            onOpenUrgentCase,
        ],
    );

    useEffect(() => subscribeCalendarOpenSource((detail) => {
        handleOpenSource(detail.sourceModule, detail.sourceEntityId, detail.sourceEventId);
    }), [handleOpenSource]);

    return (
        <div
            className="block h-full min-h-0"
            data-testid="lawyer-schedule-tab-shell"
            aria-hidden={!visible}
        >
            <RadarErrorBoundary
                onBack={handleBack}
                resetKey={`${visible ? '1' : '0'}:${calendarUserId}`}
            >
                <SmartLegalRadar
                    embedInChrome
                    screenActive={visible}
                    onBack={handleBack}
                    userId={calendarUserId}
                    initialDate={calendarSearchFocus?.date}
                    initialEventId={calendarSearchFocus?.eventId}
                    onOpenSource={handleOpenSource}
                />
            </RadarErrorBoundary>
        </div>
    );
}
