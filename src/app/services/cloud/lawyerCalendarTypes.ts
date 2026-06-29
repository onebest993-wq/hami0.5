export type CalendarEventType = 'hearing' | 'deadline' | 'consultation' | 'execution' | 'custom';

export type CalendarEvent = {
    id: string;
    userId: string;
    title: string;
    date: string;
    time?: string;
    endTime?: string;
    type: CalendarEventType;
    location?: string;
    notes?: string;
    clientName?: string;
    clientPhone?: string;
    caseId?: string;
    caseNo?: string;
    isCompleted?: boolean;
    revenue?: string;
    createdAt: string;
    updatedAt: string;
    sourceModule?:
        | 'lawsuit'
        | 'execution'
        | 'urgent'
        | 'transaction'
        | 'criminal'
        | 'threading'
        | 'task'
        | 'note'
        | 'manual';
    sourceEntityId?: string;
    sourceEventId?: string;
    partiesSummary?: string;
    court?: string;
    sourceLabel?: string;
};
