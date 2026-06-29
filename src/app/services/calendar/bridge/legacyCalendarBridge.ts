import {
    normalizeDateToYmd,
    partiesSummaryFromList,
} from './core';
import { fireAndForgetCalendarSync, removeCalendarBySource, upsertCalendarFromModule } from './syncEngine';
import {
    propagateBridgedCalendarRemoval,
    propagateBridgedCalendarUpdate,
} from '@/app/services/calendar/bridgePersistence/propagate';

export const CalendarBridge = {
    upsert: upsertCalendarFromModule,
    remove: removeCalendarBySource,
    syncLawsuitAppointment: (p: {
        userId?: string | null;
        fileId: string | number;
        timelineEventId: string;
        date: string;
        title: string;
        purpose?: string;
        details?: string;
        caseNo?: string;
        court?: string;
        parties?: unknown;
        clientName?: string;
    }) =>
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'lawsuit',
            sourceEntityId: String(p.fileId),
            sourceEventId: p.timelineEventId,
            date: p.date,
            title: p.title || p.purpose || 'موعد',
            type: 'hearing',
            notes: [p.purpose, p.details].filter(Boolean).join(' — '),
            caseNo: p.caseNo,
            court: p.court,
            partiesSummary: partiesSummaryFromList(p.parties),
            clientName: p.clientName,
            sourceLabel: 'دعوى مدنية — موعد',
        }),
    syncLawsuitTask: (p: {
        userId?: string | null;
        fileId: string | number;
        taskId: string;
        title: string;
        dueDate: string;
        caseNo?: string;
        court?: string;
        parties?: unknown;
        isCompleted?: boolean;
    }) =>
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'lawsuit',
            sourceEntityId: String(p.fileId),
            sourceEventId: `task_${p.taskId}`,
            date: p.dueDate,
            title: `مهمة: ${p.title}`,
            type: 'deadline',
            caseNo: p.caseNo,
            court: p.court,
            partiesSummary: partiesSummaryFromList(p.parties),
            isCompleted: p.isCompleted,
            sourceLabel: 'دعوى مدنية — مهمة',
        }),
    syncExecutionTask: (p: {
        userId?: string | null;
        executionId: string | number;
        taskId: string;
        title: string;
        dueDate: string;
        caseNo?: string;
        clientName?: string;
    }) =>
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'execution',
            sourceEntityId: String(p.executionId),
            sourceEventId: `task_${p.taskId}`,
            date: p.dueDate,
            title: `مهمة تنفيذ: ${p.title}`,
            type: 'deadline',
            caseNo: p.caseNo,
            clientName: p.clientName,
            sourceLabel: 'تنفيذ — مهمة',
        }),
    syncExecutionAppointment: (p: {
        userId?: string | null;
        executionId: string | number;
        timelineEventId: string;
        date: string;
        time?: string;
        purpose: string;
        description?: string;
        caseNo?: string;
        clientName?: string;
    }) =>
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'execution',
            sourceEntityId: String(p.executionId),
            sourceEventId: p.timelineEventId,
            date: p.date,
            time: p.time,
            title: p.purpose,
            type: 'execution',
            notes: p.description,
            caseNo: p.caseNo,
            clientName: p.clientName,
            sourceLabel: 'تنفيذ — موعد',
        }),
    syncTransactionAppointment: (p: {
        userId?: string | null;
        transactionId: string;
        stepId: string;
        date: string | Date;
        time?: string;
        title: string;
        clientName?: string;
    }) => {
        const ymd =
            normalizeDateToYmd(p.date instanceof Date ? p.date.toISOString() : String(p.date)) ??
            normalizeDateToYmd(new Date().toISOString());
        if (!ymd) return;
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'transaction',
            sourceEntityId: p.transactionId,
            sourceEventId: p.stepId,
            date: ymd,
            time: p.time,
            title: p.title,
            type: 'consultation',
            clientName: p.clientName,
            sourceLabel: 'معاملة — موعد خطوة',
        });
    },
    syncCriminalTimeline: (p: {
        userId?: string | null;
        caseId: string;
        eventId: string;
        date: string;
        title: string;
        type?: 'hearing' | 'deadline';
        nextDate?: string;
        caseNo?: string;
        notes?: string;
        clientName?: string;
    }) => {
        const eventType = p.type ?? 'hearing';
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'criminal',
            sourceEntityId: p.caseId,
            sourceEventId: p.eventId,
            date: p.date,
            title: p.title,
            type: eventType,
            notes: p.notes,
            caseNo: p.caseNo,
            clientName: p.clientName,
            sourceLabel: 'جزائي — موعد',
        });
        const nextYmd = normalizeDateToYmd(p.nextDate);
        const baseYmd = normalizeDateToYmd(p.date);
        if (nextYmd && nextYmd !== baseYmd) {
            fireAndForgetCalendarSync({
                userId: p.userId,
                sourceModule: 'criminal',
                sourceEntityId: p.caseId,
                sourceEventId: `${p.eventId}_next`,
                date: nextYmd,
                title: `جلسة قادمة — ${p.title}`,
                type: eventType,
                notes: p.notes,
                caseNo: p.caseNo,
                clientName: p.clientName,
                sourceLabel: 'جزائي — موعد قادم',
            });
        }
    },
    syncCriminalTrialSession: (p: {
        userId?: string | null;
        caseId: string;
        sessionId: string;
        date: string;
        title: string;
        nextSessionDate?: string;
        caseNo?: string;
        clientName?: string;
    }) => {
        const eventId = `trial_${p.sessionId}`;
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'criminal',
            sourceEntityId: p.caseId,
            sourceEventId: eventId,
            date: p.date,
            title: p.title,
            type: 'hearing',
            caseNo: p.caseNo,
            clientName: p.clientName,
            sourceLabel: 'جزائي — جلسة محاكمة',
        });
        const nextYmd = normalizeDateToYmd(p.nextSessionDate);
        const baseYmd = normalizeDateToYmd(p.date);
        if (nextYmd && nextYmd !== baseYmd) {
            fireAndForgetCalendarSync({
                userId: p.userId,
                sourceModule: 'criminal',
                sourceEntityId: p.caseId,
                sourceEventId: `${eventId}_next`,
                date: nextYmd,
                title: `جلسة قادمة — ${p.title}`,
                type: 'hearing',
                caseNo: p.caseNo,
                clientName: p.clientName,
                sourceLabel: 'جزائي — جلسة محاكمة',
            });
        }
    },
    syncThreadingTask: (p: {
        userId?: string | null;
        transactionId: string;
        taskId: string;
        title: string;
        dueDate: string;
        clientName?: string;
        isCompleted?: boolean;
    }) => {
        const ymd = normalizeDateToYmd(p.dueDate);
        if (!ymd) return;
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'threading',
            sourceEntityId: p.transactionId,
            sourceEventId: `task_${p.taskId}`,
            date: ymd,
            title: `مهمة: ${p.title}`,
            type: 'deadline',
            clientName: p.clientName,
            isCompleted: p.isCompleted,
            sourceLabel: 'معاملة إدارية — مهمة',
        });
    },
    syncThreadingFinance: (p: {
        userId?: string | null;
        transactionId: string;
        recordId: string;
        title: string;
        date: string;
        clientName?: string;
        financeType: 'expense' | 'advance';
    }) => {
        const ymd = normalizeDateToYmd(p.date);
        if (!ymd) return;
        const kind = p.financeType === 'advance' ? 'مقبوض' : 'مصروف';
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'threading',
            sourceEntityId: p.transactionId,
            sourceEventId: `finance_${p.recordId}`,
            date: ymd,
            title: `${kind}: ${p.title}`,
            type: 'consultation',
            clientName: p.clientName,
            sourceLabel: 'معاملة إدارية — حركة مالية',
        });
    },
    syncNoteReminder: (p: {
        userId?: string | null;
        noteId: string;
        date: string;
        title: string;
        body?: string;
        linkedFileId?: string | number;
    }) => {
        const ymd = normalizeDateToYmd(p.date);
        if (!ymd) return;
        const linkedFile = p.linkedFileId != null ? String(p.linkedFileId).trim() : '';
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'note',
            sourceEntityId: p.noteId,
            sourceEventId: 'reminder',
            date: ymd,
            title: p.title,
            type: 'consultation',
            notes: p.body,
            clientName: p.title,
            caseNo: linkedFile ? undefined : 'ملاحظة',
            linkedDossierId: linkedFile || undefined,
            sourceLabel: 'ملاحظة — تذكير',
        });
    },
    syncFieldTaskDue: (p: {
        userId?: string | null;
        taskId: string;
        date: string;
        title: string;
        location?: string | null;
        linkedCaseId?: string | null;
        isCompleted?: boolean;
        isFatalDeadline?: boolean;
    }) => {
        const ymd = normalizeDateToYmd(p.date);
        if (!ymd) return;
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'task',
            sourceEntityId: p.taskId,
            sourceEventId: 'due',
            date: ymd,
            title: p.title,
            type: 'deadline',
            location: p.location ?? undefined,
            notes: p.location ? `📍 ${p.location}` : undefined,
            clientName: p.title,
            caseNo: p.linkedCaseId?.trim() || 'مهمة ميدان',
            sourceLabel: 'مهمة ميدان',
            isCompleted: p.isCompleted,
        });
    },
    syncUrgentHearing: (p: {
        userId?: string | null;
        caseId: string;
        hearingId: string;
        sessionDate: string;
        stageLabel: string;
        notes?: string;
        caseNo?: string;
        partiesSummary?: string;
        nextSessionDate?: string;
    }) => {
        fireAndForgetCalendarSync({
            userId: p.userId,
            sourceModule: 'urgent',
            sourceEntityId: p.caseId,
            sourceEventId: p.hearingId,
            date: p.sessionDate,
            title: `جلسة — ${p.stageLabel}`,
            type: 'hearing',
            notes: p.notes,
            caseNo: p.caseNo,
            partiesSummary: p.partiesSummary,
            sourceLabel: 'قضاء مستعجل',
        });
        const nextYmd = normalizeDateToYmd(p.nextSessionDate);
        if (nextYmd && nextYmd !== normalizeDateToYmd(p.sessionDate)) {
            fireAndForgetCalendarSync({
                userId: p.userId,
                sourceModule: 'urgent',
                sourceEntityId: p.caseId,
                sourceEventId: `${p.hearingId}_next`,
                date: nextYmd,
                title: `جلسة قادمة — ${p.stageLabel}`,
                type: 'hearing',
                notes: p.notes ? `تأجيل: ${p.notes}` : 'موعد الجلسة القادمة',
                caseNo: p.caseNo,
                partiesSummary: p.partiesSummary,
                sourceLabel: 'قضاء مستعجل',
            });
        }
    },
    propagateUpdate: propagateBridgedCalendarUpdate,
    propagateRemoval: propagateBridgedCalendarRemoval,
};

