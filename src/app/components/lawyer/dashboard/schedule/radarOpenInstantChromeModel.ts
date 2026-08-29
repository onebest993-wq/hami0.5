import { getLocalTodayYmd } from '@/app/utils/localYmd';

/** نفس تسميات الرادار — بلا استيراد SmartLegalRadar حتى لا يدخل جذع MainView */
export const RADAR_OPEN_INSTANT_WEEK_DAYS = [
    'أحد',
    'اثنين',
    'ثلاثاء',
    'أربعاء',
    'خميس',
    'جمعة',
    'سبت',
] as const;

export const RADAR_OPEN_INSTANT_MONTHS = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
] as const;

export type RadarOpenInstantWeekDay = {
    ymd: string;
    name: string;
    dayNum: number;
    selected: boolean;
    muted: boolean;
};

export type RadarOpenInstantSnapshot = {
    selectedDate: string;
    viewMonth: number;
    viewYear: number;
    monthLabel: string;
    dayTitle: string;
    dayMeta: string;
    week: RadarOpenInstantWeekDay[];
};

function toYmdParts(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function buildWeekStrip(selectedDate: string): string[] {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return [];
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return Array.from({ length: 7 }, (_, i) => {
        const x = new Date(start);
        x.setDate(start.getDate() + i);
        return toYmdParts(x);
    });
}

function formatDayCaption(selectedDate: string): { title: string; meta: string } {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
        return { title: selectedDate, meta: '' };
    }
    try {
        return {
            title: new Intl.DateTimeFormat('ar-IQ', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            }).format(d),
            meta: new Intl.DateTimeFormat('ar-IQ', { year: 'numeric' }).format(d),
        };
    } catch {
        return { title: selectedDate, meta: '' };
    }
}

/** لقطة اليوم للفتح الفوري — شريط الشهر/الأسبوع كما في الرادار لا صناديق فارغة */
export function buildRadarOpenInstantSnapshot(now: Date = new Date()): RadarOpenInstantSnapshot {
    const selectedDate = getLocalTodayYmd(now);
    const viewMonth = now.getMonth();
    const viewYear = now.getFullYear();
    const caption = formatDayCaption(selectedDate);
    const weekYmd = buildWeekStrip(selectedDate);

    return {
        selectedDate,
        viewMonth,
        viewYear,
        monthLabel: `${RADAR_OPEN_INSTANT_MONTHS[viewMonth]} ${viewYear}`,
        dayTitle: caption.title,
        dayMeta: caption.meta,
        week: weekYmd.map((ymd, index) => ({
            ymd,
            name: RADAR_OPEN_INSTANT_WEEK_DAYS[index] ?? '',
            dayNum: Number(ymd.slice(8, 10)),
            selected: ymd === selectedDate,
            muted: Number(ymd.slice(5, 7)) - 1 !== viewMonth,
        })),
    };
}
