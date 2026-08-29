/**
 * تصنيف عنصر الجدول ومدّته الافتراضية — أوّليات نقية بلا اعتماديات.
 *
 * كانت تسكن `scheduleConflictDetector`، فاضطر `calendarDurationUtils` إلى
 * استيرادها منه بينما الكاشف يستورد منه المدّة الصريحة — دائرة استيراد كاملة
 * بين ملفين. فصلها هنا يجعل الاتجاه واحداً: كلاهما يستورد من هذه الورقة.
 */
export type ScheduleItemSource = 'HEARING' | 'TRANSACTION' | 'TASK';

const DEFAULT_DURATION_MINUTES: Record<ScheduleItemSource, number> = {
    HEARING: 60,
    TRANSACTION: 45,
    TASK: 30,
};

export function resolveScheduleItemDurationMinutes(
    source: ScheduleItemSource,
    explicitMinutes?: number | null,
): number {
    const raw = Number(explicitMinutes);
    if (Number.isFinite(raw) && raw > 0) return Math.round(raw);
    return DEFAULT_DURATION_MINUTES[source];
}

/** خريطة مصدر الجسر → تصنيف الكاشف */
export function mapCalendarModuleToScheduleSource(
    sourceModule: string | null | undefined,
    fallbackSource?: string | null,
    eventType?: string | null,
): ScheduleItemSource {
    const mod = String(sourceModule ?? '').trim().toLowerCase();
    if (mod === 'transaction' || mod === 'threading') return 'TRANSACTION';
    if (mod === 'task' || mod === 'note') return 'TASK';
    if (mod === 'lawsuit' || mod === 'execution' || mod === 'criminal' || mod === 'urgent') {
        return 'HEARING';
    }
    const fb = String(fallbackSource ?? '').trim().toLowerCase();
    if (fb === 'hearing' || fb === 'deadline') return 'HEARING';
    const typ = String(eventType ?? '').trim().toLowerCase();
    if (typ === 'consultation' || typ === 'deadline') return 'TASK';
    if (typ === 'execution') return 'HEARING';
    return 'HEARING';
}
