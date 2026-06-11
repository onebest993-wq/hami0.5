/** نوع القرار — يحدد المسميات والحقول */
export type VisitationDecisionMode =
    | 'viewing_only'
    | 'viewing_pickup'
    | 'viewing_pickup_sleepover';

export type VisitationSessionStatus =
    | 'scheduled'
    | 'completed'
    | 'default_party_one'
    | 'default_party_two';

export interface VisitationScheduleConfig {
    decisionMode: VisitationDecisionMode;
    location: string;
    startTime: string;
    endTime?: string;
    sleepoverNights?: number;
    returnTime?: string;
    /** تاريخ المباشرة بالتنفيذ — نقطة الشروع للاحتساب الآلي */
    executionStartDate: string;
    /** أول موعد فعلي — يُحسب آلياً من executionStartDate + أيام/أسابيع */
    anchorDate: string;
    /** 0=الأحد … 6=السبت (معيار JavaScript) */
    weekDays: number[];
    /** 1–4: الأسبوع الأول … الرابع من الشهر */
    monthWeeks: number[];
    generatedAt?: string;
}

export interface VisitationSession {
    id: string;
    date: string;
    dayLabel: string;
    status: VisitationSessionStatus;
    documentedAt?: string;
    defaultParty?: 'first' | 'second';
}

export interface VisitationScheduleBundle {
    config: VisitationScheduleConfig;
    sessions: VisitationSession[];
}
