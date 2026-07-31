import type { DefendantAgeCategory, SeizedAsset } from '../criminalStore';
import { isInvestigationStoredStage } from '../criminalStageRuntimeCore';
import { formatDefendantStatusShortLabel } from '../criminalStagePresentationCore';
import { formatJuvenileInvestigationDetentionDashboardStatus } from '../juvenileInvestigationRules';

export const DEFENDANT_STATUS_MENU_TITLE = 'تغيير حالة المتهم القانونية';

const PARTY_COLUMN_SHELL_CLASS =
    'self-start w-full rounded-xl border backdrop-blur-sm p-3 flex flex-col items-start shadow-lg shadow-black/30';

export const COMPLAINANT_COLUMN_CLASS = `${PARTY_COLUMN_SHELL_CLASS} border-emerald-500/25 bg-emerald-950/[0.12]`;
export const DEFENDANT_COLUMN_CLASS = `${PARTY_COLUMN_SHELL_CLASS} border-sky-500/25 bg-sky-950/[0.12]`;

export const PARTY_NAME_BUTTON_CLASS =
    'text-right text-2xl font-black text-white truncate hover:text-[#E6C673] transition min-w-0 max-w-full block leading-tight';

export const REVEAL_INPUT =
    'w-full bg-[#0B1021] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E6C673]/60 disabled:opacity-50';

/** إطار البطاقة الداخلية — موحّد دائماً بين عمودي المشتكي والمتهم (تصميم فقط). */
export function partyInnerCardClass(isDeathLocked: boolean): string {
    if (isDeathLocked) {
        return 'rounded-md border border-red-950/60 bg-red-950/20 ring-1 ring-red-900/35 px-2.5 py-2 flex flex-col items-start pointer-events-none opacity-75 w-full';
    }
    return 'rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 flex flex-col items-start w-full';
}

export function ageCategoryPillClass(active: boolean, _disabled?: boolean): string {
    const base =
        'rounded-full border px-2 py-0.5 text-[10px] font-black whitespace-nowrap transition disabled:opacity-45 disabled:cursor-not-allowed';
    if (active) {
        return `${base} border-emerald-500/45 bg-emerald-500/15 text-emerald-100`;
    }
    return `${base} border-white/15 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white/85`;
}

export function defendantRevealNameLabel(stage: string, category: DefendantAgeCategory): string {
    if (category === 'under_seven') return 'اسم الصغير';
    if (category === 'juvenile') {
        return isInvestigationStoredStage(stage) ? 'اسم المشكو منه - حدث' : 'اسم المتهم - حدث';
    }
    return 'الاسم الكامل';
}

export function defendantPartyRoleLabel(
    stage: string,
    isJuvenile: boolean,
    isUnderSeven: boolean,
): string | null {
    if (isUnderSeven) return 'صغير دون 7 سنوات';
    if (!isJuvenile) return null;
    return isInvestigationStoredStage(stage) ? 'المشكو منه - حدث' : 'المتهم - حدث';
}

export function asPartyRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function readPartyString(record: Record<string, unknown>, key: string): string {
    return String(record[key] ?? '').trim();
}

export function readPartyBoolean(record: Record<string, unknown>, key: string): boolean {
    return record[key] === true;
}

export function readPartySeizedAssets(record: Record<string, unknown>, key: string): SeizedAsset[] {
    const value = record[key];
    return Array.isArray(value) ? (value as SeizedAsset[]) : [];
}

export function safeTrim(v: unknown): string {
    return String(v ?? '').trim();
}

/** لوحة المحامي الخاصة — الأسماء الرباعية كاملة دون ترميز. */
export function partyDisplayName(fullName: string, _isJuvenile?: boolean): string {
    return String(fullName ?? '').trim() || '—';
}

export function defendantStatusDisplayLabel(
    status: string,
    row?: { isJuvenile?: boolean; detentionAuthority?: string },
): string {
    const juvenileLabel = row
        ? formatJuvenileInvestigationDetentionDashboardStatus(status, {
              isJuvenile: Boolean(row.isJuvenile),
              detentionAuthority: row.detentionAuthority,
          })
        : null;
    if (juvenileLabel) return juvenileLabel;
    const base = formatDefendantStatusShortLabel(status);
    if (!base || base === '—') return 'اختر الحالة';
    if (status === 'bailed_pending_appeal') return `⏳ ${base}`;
    if (status === 'psychiatric_eval') return `🧠 ${base}`;
    return base;
}

/** يَحسب عدد الأيام المتبقية حتى تاريخ انتهاء التوقيف (YYYY-MM-DD)؛ null إن كان التاريخ غير صالح/فارغ. */
export function computeDetentionDaysLeft(expiryDate: string): number | null {
    if (!expiryDate) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate);
    if (!m) return null;
    const expMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const now = new Date();
    const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = expMs - todayMs;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
