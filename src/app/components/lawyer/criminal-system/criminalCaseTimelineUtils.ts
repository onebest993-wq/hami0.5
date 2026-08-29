type TimelineEventCorruptionCheckInput = {
    date?: string;
    title?: string;
    description?: string;
    category?: string;
    nextDate?: string;
};

/** يستبعد أحداث التايم لاين التجريبية/الميتة عند التحميل من التخزين المحلي. */
export function isCorruptTimelineEvent(ev: TimelineEventCorruptionCheckInput): boolean {
    const date = String(ev?.date ?? '').trim();
    const next = String(ev?.nextDate ?? '').trim();
    const title = String(ev?.title ?? '').trim();
    const desc = String(ev?.description ?? '').trim();
    const category = String(ev?.category ?? '').trim();

    if (!date) return true;
    if (next && date && next < date) return true;
    if (/^f+$/i.test(title) || /^f+$/i.test(desc)) return true;
    if (/^[!؟?.\-_\s]{1,5}$/.test(title) || /^[!؟?.\-_\s]{1,5}$/.test(desc)) return true;
    if (!category && !title && !desc) return true;
    return false;
}
