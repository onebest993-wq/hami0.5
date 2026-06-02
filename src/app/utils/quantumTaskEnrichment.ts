import type { LegalTask } from '@/app/types/TaskEngine';
import { parseTaskInput, startOfLocalDay } from '@/app/utils/nlpParser';

export type TaskEnrichmentOptions = {
    scheduledFor?: Date;
};

/** Phase 34 — تعزيز صامت دون عرض أي شرح للمستخدم */
export function applySilentPracticalEnrichment(
    trimmed: string,
    parsed: ReturnType<typeof parseTaskInput>,
    options?: TaskEnrichmentOptions,
): Pick<LegalTask, 'rawText' | 'title' | 'location' | 'parsedDate' | 'isFatalDeadline' | 'linkedCaseId'> {
    const silentFatal = /حتمي|تمييز|سقوط/i.test(trimmed);
    const isFatalDeadline = parsed.isFatalDeadline || silentFatal;

    const location = parsed.location;

    let parsedDate: Date | null = null;
    if (options?.scheduledFor !== undefined) {
        parsedDate = startOfLocalDay(options.scheduledFor);
    } else {
        parsedDate = parsed.parsedDate;
    }

    return {
        rawText: trimmed,
        title: parsed.title.trim() || trimmed,
        location,
        parsedDate,
        isFatalDeadline,
        linkedCaseId: parsed.linkedCaseId,
    };
}
