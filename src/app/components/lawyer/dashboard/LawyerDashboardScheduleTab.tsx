import React, { useMemo } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { SmartLegalRadar } from '@/app/components/lawyer/SmartLegalRadar';
import { RadarErrorBoundary } from '@/app/components/lawyer/SmartLegalRadar/RadarErrorBoundary';
import type { FileData } from '../LawyerShared';
import type { ExecutionFile } from '@/app/types/execution';
import { RADAR_BG_MAIN } from '@/app/components/lawyer/SmartLegalRadar/radarTheme';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { buildCalendarSparkSupplementalInput } from '@/app/spark/calendar/calendarSparkSupplementalScan';

export type LawyerDashboardScheduleTabProps = {
    visible: boolean;
    active?: boolean;
    scheduleTabSessionKey?: number;
    userId: string | undefined;
    authUserId: string | undefined;
    calendarSearchFocus: { date?: string; eventId?: string } | null;
    onClearCalendarSearchFocus: () => void;
    onBackToHome: () => void;
    files: FileData[];
    executionFiles: ExecutionFile[];
    clusterScanSources?: ClusterScanSources;
    secretaryAlerts?: SecretaryAlert[];
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
    clusterScanSources,
    secretaryAlerts = [],
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

    const calendarSparkSupplemental = useMemo(() => {
        if (clusterScanSources) {
            return buildCalendarSparkSupplementalInput(clusterScanSources, secretaryAlerts);
        }
        return {
            lawsuitFiles: files,
            executionFiles,
            secretaryAlerts,
        };
    }, [clusterScanSources, files, executionFiles, secretaryAlerts]);

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
                    calendarSparkSupplemental={calendarSparkSupplemental}
                    onOpenRepositoryNote={onOpenNote}
                    onOpenSource={(sourceModule, sourceEntityId) => {
                        switch (sourceModule) {
                            case 'lawsuit': {
                                const f = files.find((file) => String(file.id) === sourceEntityId);
                                if (f && isFileData(f)) {
                                    onOpenLawsuitFile(f);
                                    onBackToHome();
                                    return;
                                }
                                SmartToast.info('الإضبارة غير متاحة');
                                return;
                            }
                            case 'execution': {
                                const ex = executionFiles.find(
                                    (file) => String(file.id ?? '') === sourceEntityId,
                                );
                                if (ex) {
                                    onOpenExecutionFile(ex);
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
                                const f = files.find((file) => String(file.id) === sourceEntityId);
                                if (f && isFileData(f)) {
                                    onOpenLawsuitFile(f);
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
