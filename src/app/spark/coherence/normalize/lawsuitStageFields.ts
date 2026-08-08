import type { CaseStage } from '@/app/components/lawyer/LawyerShared';

function extractYmd(value: unknown): string {
    const v = String(value ?? '').trim();
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
}

/** حقول مرحلة الدعوى الاختيارية غير المعرّفة صراحةً في النوع */
export function readLawsuitStageYmd(stage: CaseStage, ...keys: string[]): string {
    const bag = stage as unknown as Record<string, unknown>;
    for (const key of keys) {
        const ymd = extractYmd(bag[key]);
        if (ymd) return ymd;
    }
    return '';
}

export function readLawsuitStageText(stage: CaseStage, ...keys: string[]): string {
    const bag = stage as unknown as Record<string, unknown>;
    for (const key of keys) {
        const v = String(bag[key] ?? '').trim();
        if (v) return v;
    }
    return '';
}

export function readRecordYmd(record: Record<string, unknown> | undefined, ...keys: string[]): string {
    if (!record) return '';
    for (const key of keys) {
        const ymd = extractYmd(record[key]);
        if (ymd) return ymd;
    }
    return '';
}

export function readTimelineBody(ev: {
    notes?: string;
    description?: string;
    details?: string;
    text?: string;
}): string {
    return String(ev.notes ?? ev.description ?? ev.details ?? ev.text ?? '').trim();
}
