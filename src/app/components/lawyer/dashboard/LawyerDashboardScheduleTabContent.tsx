import React from 'react';
import { SmartToast } from '@/app/components/ui/smartToastBus';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { RadarErrorBoundary } from '@/app/components/lawyer/SmartLegalRadar/RadarErrorBoundary';
import { SmartLegalRadarHost } from '@/app/components/lawyer/dashboard/schedule/SmartLegalRadarHost';
import type { LawyerDashboardScheduleTabProps } from './LawyerDashboardScheduleTab';
import { isFileData } from '../LawyerDashboardParts/utils';

export function LawyerDashboardScheduleTabContent({
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
            className="block h-[100dvh] bg-[#1f1712]"
            data-testid="lawyer-schedule-tab-shell"
            aria-hidden={!visible}
        >
            <RadarErrorBoundary onBack={handleBack}>
                <SmartLegalRadarHost
                    onBack={handleBack}
                    userId={calendarUserId}
                    initialDate={calendarSearchFocus?.date}
                    initialEventId={calendarSearchFocus?.eventId}
                    onOpenSource={(sourceModule, sourceEntityId) => {
                        switch (sourceModule) {
                            case 'lawsuit': {
                                const file = files.find((item) => String(item.id) === sourceEntityId);
                                if (file && isFileData(file)) {
                                    onOpenLawsuitFile(file);
                                    onBackToHome();
                                    return;
                                }
                                SmartToast.info('الإضبارة غير متاحة');
                                return;
                            }
                            case 'execution': {
                                const file = executionFiles.find(
                                    (item) => String(item.id ?? '') === sourceEntityId,
                                );
                                if (file) {
                                    onOpenExecutionFile(file);
                                    onBackToHome();
                                    return;
                                }
                                SmartToast.info('إضبارة التنفيذ غير متاحة');
                                return;
                            }
                            case 'criminal':
                                onOpenCriminalCase(sourceEntityId);
                                return;
                            case 'urgent':
                                onOpenUrgentCase(sourceEntityId);
                                return;
                            case 'transaction': {
                                const file = files.find((item) => String(item.id) === sourceEntityId);
                                if (file && isFileData(file)) {
                                    onOpenLawsuitFile(file);
                                    return;
                                }
                                onOpenTransaction(sourceEntityId);
                                return;
                            }
                            case 'threading':
                                onOpenTransaction(sourceEntityId);
                                return;
                            case 'note':
                                onOpenNote(sourceEntityId);
                                return;
                            case 'task':
                                onBackToHome();
                                onOpenFieldTasks();
                                return;
                            default:
                                SmartToast.info('المصدر غير معروف');
                        }
                    }}
                />
            </RadarErrorBoundary>
        </div>
    );
}
