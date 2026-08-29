import type { TimelineEvent, TimelineSmartPriority } from '@/app/types/execution';
import { stripPendingLabelsFromExecutorSubject } from '@/app/utils/executorDecisionTitles';
import { mergeResidentialGraceTimelineForDisplay } from '@/app/utils/residentialGraceTimeline';
import { dedupeTimelineEventsForDisplay } from '@/app/utils/timelineDedup';

const MS_DAY = 86400000;

function startOfLocalDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

/** تحليل تاريخ مهلة من السجل (يفضّل YYYY-MM-DD أو ISO) */
export function parseTimelineDeadlineDate(raw: string | undefined): Date | null {
    if (!raw) return null;
    const s = String(raw).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTimelineWhenAr(raw: string | undefined): string {
    if (!raw) return '—';
    const s = String(raw).trim();
    if (!s) return '—';
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
    const d = parseTimelineDeadlineDate(s);
    if (!d) return s;
    const dateStr = d.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    if (dateOnly) return dateStr;
    const timeStr = d.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
    });
    return `${dateStr} · ${timeStr}`;
}

/** فرق الأيام من «اليوم» إلى أجل المهلة (سالب بعد انقضاء المهلة) */
export function timelineDeadlineDaysLeft(deadlineDate: string | undefined): number | null {
    const end = parseTimelineDeadlineDate(deadlineDate);
    if (!end) return null;
    const today = startOfLocalDay(new Date());
    const e0 = startOfLocalDay(end);
    return Math.round((e0.getTime() - today.getTime()) / MS_DAY);
}

function eventSortTimeMs(e: TimelineEvent): number {
    const ts = e.timestamp || e.date;
    const d = parseTimelineDeadlineDate(ts);
    return d ? d.getTime() : 0;
}

/** صف مع أولوية محسوبة للعرض في الرادار — لا يُكتب تلقائياً في التخزين */
export type TimelineRadarComputedRow = TimelineEvent & {
    radarSmartPriority: TimelineSmartPriority;
    radarDeadlineDaysLeft: number | null;
};

function isDeadlineCriticalRow(r: TimelineRadarComputedRow): boolean {
    return Boolean(r.deadlineDate) && r.radarDeadlineDaysLeft !== null && r.radarDeadlineDaysLeft <= 3;
}

/**
 * أهم N حدث: مثبّت أولاً، ثم مواعيد حرجة (≤3 أيام أو متأخرة)، ثم الأحدث زمنياً.
 */
export function computeSmartTimelineRadarTop(
    events: TimelineEvent[],
    options?: { limit?: number }
): TimelineRadarComputedRow[] {
    const limit = options?.limit ?? 5;
    const enriched: TimelineRadarComputedRow[] = events.map((e) => {
        const radarDeadlineDaysLeft = timelineDeadlineDaysLeft(e.deadlineDate);
        let radarSmartPriority: TimelineSmartPriority = 'normal';
        if (radarDeadlineDaysLeft !== null && radarDeadlineDaysLeft <= 3) {
            radarSmartPriority = radarDeadlineDaysLeft < 0 ? 'deadline' : 'urgent';
        }
        return { ...e, radarSmartPriority, radarDeadlineDaysLeft };
    });

    enriched.sort((a, b) => {
        const ap = a.isPinned ? 1 : 0;
        const bp = b.isPinned ? 1 : 0;
        if (ap !== bp) return bp - ap;

        const ac = isDeadlineCriticalRow(a) ? 1 : 0;
        const bc = isDeadlineCriticalRow(b) ? 1 : 0;
        if (ac !== bc) return bc - ac;

        if (ac && bc) {
            const da = a.radarDeadlineDaysLeft ?? 999;
            const db = b.radarDeadlineDaysLeft ?? 999;
            if (da !== db) return da - db;
        }

        return eventSortTimeMs(b) - eventSortTimeMs(a);
    });

    return enriched.slice(0, limit);
}

/** يضمن مفتاحاً فريداً لكل صف — ضروري لتوسيع التفاصيل ولـ React key عند تكرار id قديم */
export function ensureUniqueTimelineRowIds(events: TimelineEvent[]): TimelineEvent[] {
    const seenCount = new Map<string, number>();
    return events.map((e, index) => {
        const raw =
            e.id != null && String(e.id).trim() !== ''
                ? String(e.id)
                : `tl_${index}_${String(e.timestamp || e.date || '').replace(/\s/g, '')}`;
        const n = (seenCount.get(raw) ?? 0) + 1;
        seenCount.set(raw, n);
        const id = n === 1 ? raw : `${raw}__${n}`;
        return id === e.id ? e : { ...e, id };
    });
}

/**
 * يدمج أحداث المهلة السكنية (تسجيل + موعد انتهاء) ويزيل التكرار — للعرض فقط.
 */
export function mergeLegacyEvictionResidentialGracePairs(events: TimelineEvent[]): TimelineEvent[] {
    return mergeResidentialGraceTimelineForDisplay(events);
}

/** مفتاح صف الرادار — يطابق التوسيع و React key */
export function timelineRadarRowKey(event: TimelineEvent): string {
    const headerTime =
        event.timestamp && String(event.timestamp).trim() !== '' ? event.timestamp : event.date;
    const id = String(event.id ?? '').trim();
    const t = String(headerTime ?? '').trim();
    return `${id || 'tl'}__${t || 't'}`;
}

/** تحضير أحداث الرادار: dedup + دمج مهلة سكنية + معرّفات فريدة */
export function prepareTimelineRadarEvents(events: TimelineEvent[]): TimelineEvent[] {
    return ensureUniqueTimelineRowIds(
        mergeLegacyEvictionResidentialGracePairs(dedupeTimelineEventsForDisplay(events))
    );
}

/** مصدر السجل للعرض */
const LEGACY_AI_SOURCE_RE =
    /AI Copilot|Copilot|مساعد الذكاء|الذكاء الاصطناعي|محلل|مُحلل/i;

const LEGACY_AI_TITLE_RE =
    /AI Copilot|Copilot|مساعد الذكاء|الذكاء الاصطناعي|🤖|اقتراح AI|تحليل مساعد/i;

export function timelineSourceForDisplay(source: string | undefined): string | undefined {
    if (!source) return undefined;
    if (LEGACY_AI_SOURCE_RE.test(source)) return undefined;
    if (source === 'المهلة') return 'الإجراءات الجبرية — تخلية';
    return source;
}

/** عنوان الحدث للعرض — نفس القواعد السابقة دون تغيير المنطق المخزّن */
export function timelineTitleForDisplay(event: TimelineEvent): string {
    const t0 = String(event.title || '');
    let t = t0
        .replace(/🤖\s*تحليل مساعد الذكاء الاصطناعي للإضبارة/gi, '')
        .replace(/🤖\s*حفظ اقتراح AI كملاحظة/gi, '')
        .replace(/🤖\s*تحويل اقتراح AI إلى مهمة/gi, '')
        .replace(/📝\s*نسخ طلب AI جاهز/gi, '')
        .replace(/^اقتراح AI:/gi, '')
        .replace(LEGACY_AI_SOURCE_RE, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!t) t = 'إجراء على الإضبارة';
    if (!t || !/قيد\s*البت/i.test(t)) return t;
    const fromDecisions =
        event.type === 'decision' || String(event.source || '').includes('قرارات');
    if (!fromDecisions) return t;
    const m = t.match(
        /^(✅\s*موافقة المنفذ|❌\s*رفض\s*(?:المنفذ|الطلب)|🔄\s*قرار بديل)\s*:\s*(.+)$/i
    );
    if (m) {
        const rest = stripPendingLabelsFromExecutorSubject(m[2] || '');
        const label = String(m[1])
            .replace(/^✅\s*/u, '')
            .replace(/^❌\s*/u, '')
            .replace(/^🔄\s*/u, '')
            .trim();
        return rest ? `${label}: ${rest}` : label;
    }
    t = stripPendingLabelsFromExecutorSubject(t);
    return t.replace(/^[\s✅❌🔄📌📄📝🔔💰⚖️🏠🤖⏳🔢🏛️📈⏸️🔀🛑🔒⚡🔎🙋]+/u, '').trim();
}

/** إزالة إيموجي العنوان — نطاق يوافق طلب الواجهة */
export const TIMELINE_TITLE_EMOJI_RE =
    /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{1F600}-\u{1F64F}\u{1F004}\u{1F0CF}\uFE0F\u200D]/gu;

/** إزالة مصطلحات «بدائي/بداءة» من عناوين العرض فقط — لا تغيّر التخزين */
function stripFirstInstanceWording(title: string): string {
    return title
        .replace(/تاريخ الحكم البدائي/gi, 'تاريخ الحكم')
        .replace(/طعن على الحكم البدائي/gi, 'طعن على الحكم')
        .replace(/الحكم البدائي/gi, 'الحكم')
        .replace(/المرحلة البدائية/gi, 'المرحلة الأولى')
        .replace(/\s*البدائي\s*/gi, ' ')
        .replace(/\s*بدائي\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function cleanTimelineCardTitle(event: TimelineEvent): string {
    return stripFirstInstanceWording(
        timelineTitleForDisplay(event)
            .replace(TIMELINE_TITLE_EMOJI_RE, '')
            .replace(/\s+/g, ' ')
            .trim(),
    );
}

function normTimelineText(s: string): string {
    return s.replace(TIMELINE_TITLE_EMOJI_RE, '').replace(/\s+/g, ' ').trim();
}

const DOSSIER_NOTE_STAMP_HTML_RE = /<p[^>]*data-dossier-note-stamp[^>]*>[\s\S]*?<\/p>/gi;

/** يزيل HTML الملاحظات السريعة (طابع الوقت) قبل عرض السجل الزمني */
export function stripTimelineHtmlForDisplay(raw: string): string {
    let text = String(raw ?? '');
    if (!text.includes('<')) return text.trim();

    text = text.replace(DOSSIER_NOTE_STAMP_HTML_RE, '');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\n{3,}/g, '\n\n');

    return text.trim();
}

/** وصف العرض — يزيل تكرار العنوان ويُبقي التفاصيل الفعلية */
export function timelineDescriptionForDisplay(event: TimelineEvent): string {
    const raw = stripTimelineHtmlForDisplay(String(event.description ?? event.details ?? ''));
    if (!raw) return '';
    const title = normTimelineText(cleanTimelineCardTitle(event));

    let lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (title && lines.length > 0) {
        const firstNorm = normTimelineText(lines[0]);
        if (firstNorm === title) {
            lines = lines.slice(1);
        } else if (firstNorm.startsWith(title)) {
            const rest = firstNorm.slice(title.length).replace(/^[\s:—\-–،]+/, '').trim();
            lines = rest ? [rest, ...lines.slice(1)] : lines.slice(1);
        }
    }

    const normalizedLines = lines.map((l) => normTimelineText(l)).filter(Boolean);
    const unique = normalizedLines.filter((line, idx) => normalizedLines.indexOf(line) === idx);
    return unique.join('\n');
}

/** لون عنوان بطاقة السجل الزمني (وضع ليلي هادئ) — بديل الأيقونات */
export function timelineCardTitleClassName(
    event: Pick<TimelineEvent, 'type' | 'source' | 'title'>
): string {
    const src = String(event.source || '');
    const title = String(event.title || '');
    const blob = `${src} ${title}`;
    if (LEGACY_AI_TITLE_RE.test(blob)) {
        return 'text-amber-400';
    }
    const t = event.type;
    if (t === 'decision') return 'text-blue-400';
    if (/محكمة|قرار|طعن|تمييز|قضاء|محضر تنفيذ|القرارات والطعون/i.test(src)) {
        return 'text-blue-400';
    }
    if (t === 'payment' || t === 'notification' || t === 'settlement') {
        return 'text-emerald-400';
    }
    if (/تبليغ|إخبار|مال|دفع|رسوم|محفظة|المركز المالي|الحجز المالي/i.test(src)) {
        return 'text-emerald-400';
    }
    return 'text-gray-200';
}

export function stripEmojisFromText(s: string): string {
    return String(s || '')
        .replace(TIMELINE_TITLE_EMOJI_RE, '')
        .replace(/\s+/g, ' ')
        .trim();
}
