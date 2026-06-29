import { toBaghdadYmd } from '@/app/utils/baghdadTime';
import type { CalendarBridgePayload, CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';

const BRIDGE_ID_PREFIX = 'hami_bridge';

/** معرّف التطوير — لا يُستخدم في الإنتاج عند غياب جلسة */
export const CALENDAR_DEV_FALLBACK_USER_ID = 'dev-user-uuid-1';

export function buildStableBridgeId(
    sourceModule: string,
    sourceEntityId: string,
    sourceEventId: string,
): string {
    const safe = (s: string) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    return `${BRIDGE_ID_PREFIX}_${safe(sourceModule)}_${safe(sourceEntityId)}_${safe(sourceEventId)}`;
}

function stableBridgeId(
    sourceModule: string,
    sourceEntityId: string,
    sourceEventId: string,
): string {
    return buildStableBridgeId(sourceModule, sourceEntityId, sourceEventId);
}

/** يستخرج معرّف المحامي من الجلسة المحفوظة أو يستخدم معرّف التطوير */
export function resolveCalendarUserId(preferred?: string | null): string {
    if (preferred && String(preferred).trim()) return String(preferred).trim();
    try {
        if (typeof localStorage !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || !key.includes('-auth-token')) continue;
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const parsed = JSON.parse(raw) as {
                    user?: { id?: string };
                    currentSession?: { user?: { id?: string } };
                };
                const uid = parsed?.user?.id ?? parsed?.currentSession?.user?.id;
                if (typeof uid === 'string' && uid.trim()) return uid.trim();
            }
        }
    } catch {
        /* ignore */
    }
    if (import.meta.env.DEV || import.meta.env.VITEST) {
        return CALENDAR_DEV_FALLBACK_USER_ID;
    }
    return '';
}

/** معرّف موحّد للتقويم — يُستخدم في كل الأقسام */
export const getCanonicalCalendarUserId = resolveCalendarUserId;

/** YYYY-MM-DD من ISO أو نص محلي */
/**
 * يُطبّع تواريخ متعدّدة الصيغ إلى YYYY-MM-DD بـ Asia/Baghdad.
 *
 * - "2026-06-01" → "2026-06-01" (لا تحويل)
 * - "2026-06-01T22:30:00Z" → "2026-06-02" (يُحوَّل إلى بغداد)
 * - "Jun 1, 2026" → يستخدم Asia/Baghdad للتحويل
 *
 * هذا يضمن أن لاعبَين على جهازين بمنطقتين زمنيتين مختلفتين يرون نفس
 * "اليوم" للحدث.
 */
export function normalizeDateToYmd(input: string | undefined | null): string | null {
    if (!input || !String(input).trim()) return null;
    const s = String(input).trim();
    // YYYY-MM-DD صريح → نحترمه (لا نُغيّر دلالته)
    const ymdMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) return s;
    // utility موحّد لـ Asia/Baghdad (يضمن نفس "اليوم" عبر الأجهزة)
    return toBaghdadYmd(s);
}

export function moduleLabelAr(module: CalendarSourceModule): string {
    switch (module) {
        case 'lawsuit':
            return 'دعوى مدنية';
        case 'execution':
            return 'تنفيذ';
        case 'urgent':
            return 'قضاء مستعجل';
        case 'transaction':
            return 'معاملة';
        case 'criminal':
            return 'قضية جزائية';
        case 'threading':
            return 'معاملة إدارية';
        case 'task':
            return 'مهمة ميدان';
        case 'note':
            return 'ملاحظة';
        default:
            return 'موعد';
    }
}

export function buildNotesBlock(payload: CalendarBridgePayload): string {
    const lines: string[] = [];
    const label = payload.sourceLabel || moduleLabelAr(payload.sourceModule);
    lines.push(`📂 المصدر: ${label}`);
    if (payload.court) lines.push(`🏛 المحكمة: ${payload.court}`);
    if (payload.partiesSummary) lines.push(`👥 ${payload.partiesSummary}`);
    if (payload.notes) lines.push(payload.notes);
    return lines.filter(Boolean).join('\n');
}

let calendarUpdateMuteDepth = 0;

export function notifyCalendarUpdated(): void {
    if (calendarUpdateMuteDepth > 0) return;
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT));
        }
    } catch {
        /* ignore */
    }
}

/** يكتم أحداث تحديث التقويم أثناء المزامنة الدفعية (يمنع عاصفة طلبات API). */
export function muteCalendarUpdates(): () => void {
    calendarUpdateMuteDepth += 1;
    return () => {
        calendarUpdateMuteDepth = Math.max(0, calendarUpdateMuteDepth - 1);
    };
}

export function dispatchCalendarUpdatedEvent(): void {
    notifyCalendarUpdated();
}

export function partiesSummaryFromList(
    parties: unknown,
    max = 4,
): string {
    if (!Array.isArray(parties)) return '';
    const parts: string[] = [];
    for (const p of parties) {
        if (!p || typeof p !== 'object') continue;
        const o = p as { name?: string; role?: string };
        const name = typeof o.name === 'string' ? o.name.trim() : '';
        if (!name) continue;
        const role = typeof o.role === 'string' ? o.role.trim() : '';
        parts.push(role ? `${name} (${role})` : name);
        if (parts.length >= max) break;
    }
    return parts.join(' · ');
}

