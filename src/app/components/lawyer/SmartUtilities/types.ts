export interface DeadlineResult {
    type: 'standard' | 'admin';
    finalDate?: Date;
    logicNote?: string;
    proc?: {
        id: string;
        label: string;
        val: number;
        unit: string;
        cat: string;
        ref: string;
        urgency?: string;
    };
    steps?: Array<{
        label: string;
        date: Date;
        note: string;
    }>;
}

export interface FeeResult {
    base: number;
    stamps: number;
    total: number;
}
