import React, { Suspense } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { LazySmartLegalRadar } from '@/app/utils/lazyComponents';
import { LAWYER_LAZY_FALLBACK } from '../LawyerDashboardParts/constants';
import type { FileData } from '../LawyerShared';
import type { ExecutionFile } from '../LawyerDashboardParts/types';
import { coerceExecutionFilePreserveId, isFileData } from '../LawyerDashboardParts/utils';

export type LawyerDashboardScheduleTabProps = {
    visible: boolean;
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
    if (!visible) return null;

    return (
        <div className="block h-[100dvh]">
            <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                <LazySmartLegalRadar
                    onBack={() => {
                        onClearCalendarSearchFocus();
                        onBackToHome();
                    }}
                    userId={resolveCalendarUserId(userId ?? authUserId ?? null)}
                    initialDate={calendarSearchFocus?.date}
                    initialEventId={calendarSearchFocus?.eventId}
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
                                    onOpenExecutionFile(coerceExecutionFilePreserveId(ex));
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
            </Suspense>
        </div>
    );
}
