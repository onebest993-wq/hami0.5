import { SmartToast } from '@/app/components/ui/SmartToast';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/types/execution';
import { EXECUTION_VISIT_NEXT_EVENT_ID } from '@/app/services/calendar/dossierSync/visitationCalendarSync';
import { requestOpenExecutionVisitationWorkspace } from '@/app/runtime/executionVisitationOpenIntent';

type CalendarRadarSourceHandlers = {
    files: FileData[];
    executionFiles: ExecutionFile[];
    onOpenLawsuitFile: (file: FileData) => void;
    onOpenExecutionFile: (file: ExecutionFile) => void;
    onOpenCriminalCase: (caseId: string) => void;
    onOpenUrgentCase: (caseId: string) => void;
    onOpenTransaction: (entityId: string, file?: FileData) => void;
    onOpenNote: (noteId: string) => void;
    onOpenFieldTasks: () => void;
    onBackToHome: () => void;
};

export function openCalendarRadarSource(
    sourceModule: string,
    sourceEntityId: string,
    handlers: CalendarRadarSourceHandlers,
    sourceEventId?: string,
): void {
    switch (sourceModule) {
        case 'lawsuit': {
            const f = handlers.files.find((file) => String(file.id) === sourceEntityId);
            if (f) {
                leaveCalendarThen(handlers, () => handlers.onOpenLawsuitFile(f));
                return;
            }
            SmartToast.info('الإضبارة غير متاحة');
            return;
        }
        case 'execution': {
            const ex = handlers.executionFiles.find(
                (file) => String(file.id ?? '') === sourceEntityId,
            );
            if (ex) {
                if (sourceEventId === EXECUTION_VISIT_NEXT_EVENT_ID) {
                    requestOpenExecutionVisitationWorkspace(String(ex.id ?? ''));
                }
                leaveCalendarThen(handlers, () => handlers.onOpenExecutionFile(ex));
                return;
            }
            SmartToast.info('إضبارة التنفيذ غير متاحة');
            return;
        }
        case 'criminal':
            leaveCalendarThen(handlers, () => handlers.onOpenCriminalCase(sourceEntityId));
            return;
        case 'urgent':
            leaveCalendarThen(handlers, () => handlers.onOpenUrgentCase(sourceEntityId));
            return;
        case 'transaction': {
            const f = handlers.files.find((file) => String(file.id) === sourceEntityId);
            if (f) {
                leaveCalendarThen(handlers, () => handlers.onOpenLawsuitFile(f));
                return;
            }
            leaveCalendarThen(handlers, () => handlers.onOpenTransaction(sourceEntityId));
            return;
        }
        case 'threading':
            leaveCalendarThen(handlers, () => handlers.onOpenTransaction(sourceEntityId));
            return;
        case 'note':
            leaveCalendarThen(handlers, () => handlers.onOpenNote(sourceEntityId));
            return;
        case 'task':
            leaveCalendarThen(handlers, () => handlers.onOpenFieldTasks());
            return;
        default:
            SmartToast.info('المصدر غير معروف');
    }
}

function leaveCalendarThen(handlers: CalendarRadarSourceHandlers, open: () => void): void {
    handlers.onBackToHome();
    open();
}
