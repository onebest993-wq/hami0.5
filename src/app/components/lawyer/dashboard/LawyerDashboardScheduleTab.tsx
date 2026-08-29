import React from 'react';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
import { SmartLegalRadar } from '@/app/components/lawyer/SmartLegalRadar';
import { RadarErrorBoundary } from '@/app/components/lawyer/SmartLegalRadar/RadarErrorBoundary';
import type { FileData } from '../LawyerShared';
import type { ExecutionFile } from '@/app/types/execution';
import { RADAR_BG_MAIN } from '@/app/components/lawyer/SmartLegalRadar/radarTheme';
import { openCalendarRadarSource } from '@/app/components/lawyer/dashboard/schedule/openCalendarRadarSource';

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

/** تبويب التقويم — رادار واحد بدون host متداخل */
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
    const handleBack = () => {
        onClearCalendarSearchFocus();
        onBackToHome();
    };

    const calendarUserId = resolveCalendarUserId(userId ?? authUserId ?? null);

    return (
        <div
            className="block h-[100dvh]"
            style={{ backgroundColor: RADAR_BG_MAIN }}
            data-testid="lawyer-schedule-tab-shell"
            aria-hidden={!visible}
        >
            <RadarErrorBoundary onBack={handleBack}>
                <SmartLegalRadar
                    screenActive={visible}
                    onBack={handleBack}
                    userId={calendarUserId}
                    initialDate={calendarSearchFocus?.date}
                    initialEventId={calendarSearchFocus?.eventId}
                    onOpenSource={(sourceModule, sourceEntityId, sourceEventId) =>
                        openCalendarRadarSource(sourceModule, sourceEntityId, {
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
                        }, sourceEventId)
                    }
                />
            </RadarErrorBoundary>
        </div>
    );
}
