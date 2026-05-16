import type { UnifiedLedgerStore } from './types';

/** تحويل الرقم إلى صيغة IQD مع الفواصل */
export function formatIqdDisplay(value: number): string {
    const n = Number.isFinite(value) ? Math.max(0, value) : 0;
    return Math.round(n).toLocaleString('en-US');
}

/** تحويل النص الرقمي (عربي/إنجليزي) إلى رقم حقيقي */
export function parseAmount(raw: string): number {
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(String(raw))
        .replace(/[,\u066C\u060C\s]/g, '')
        .replace(/\u066B/g, '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function parseStoredMoney(raw: unknown): number {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
    if (typeof raw !== 'string') return NaN;
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(raw)
        .replace(/[,\u066C\u060C\s]/g, '')
        .replace(/\u066B/g, '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : NaN;
}

export function formatNumberInput(raw: string): string {
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(String(raw))
        .replace(/[,\u066C\u060C\s]/g, '')
        .replace(/\u066B/g, '.')
        .replace(/[^0-9.]/g, '');
    if (!normalized) return '';
    const [intPartRaw, ...rest] = normalized.split('.');
    const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || '0';
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (!rest.length) return grouped;
    const decimal = rest.join('').replace(/\./g, '');
    return decimal ? `${grouped}.${decimal}` : grouped;
}

export function computeTrustBalanceFromPayments(payments: Array<{ amount?: unknown; entryType?: unknown }>): number {
    let trust = 0;
    for (const r of payments) {
        const amt = typeof r.amount === 'number' ? (Number.isFinite(r.amount) ? r.amount : 0) : parseStoredMoney(r.amount);
        const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
        if (et === 'disburse') trust -= Number.isFinite(amt) ? amt : 0;
        else trust += Number.isFinite(amt) ? amt : 0;
    }
    return Math.max(0, trust);
}

export function extractYmd(raw: string): string {
    const m = /^\d{4}-\d{2}-\d{2}/.exec(String(raw || '').trim());
    return m ? m[0] : '';
}

export function localYmdToDate(ymd: string): Date | null {
    const v = extractYmd(ymd);
    if (!v) return null;
    const dt = new Date(`${v}T12:00:00`);
    return Number.isFinite(dt.getTime()) ? dt : null;
}

export function formatLocalYmd(dt: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

export function addDaysToYmd(ymd: string, days: number): string {
    const base = localYmdToDate(ymd);
    if (!base) return '';
    const next = new Date(base);
    next.setDate(next.getDate() + days);
    return formatLocalYmd(next);
}

export function diffDaysYmd(dueYmd: string, currentYmd: string): number | null {
    const a = localYmdToDate(dueYmd);
    const b = localYmdToDate(currentYmd);
    if (!a || !b) return null;
    return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

export function addMonthsToYmd(ymd: string, months: number): string {
    const v = extractYmd(ymd);
    if (!v) return '';
    const [yy, mm, dd] = v.split('-').map((x) => Number(x));
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return '';
    const targetMonthIndex = (mm - 1) + months;
    const base = new Date(yy, mm - 1, dd, 12, 0, 0);
    if (!Number.isFinite(base.getTime())) return '';
    const tentative = new Date(yy, targetMonthIndex, dd, 12, 0, 0);
    if (!Number.isFinite(tentative.getTime())) return '';
    if (tentative.getMonth() !== ((targetMonthIndex % 12) + 12) % 12) {
        const lastDay = new Date(yy, targetMonthIndex + 1, 0, 12, 0, 0);
        return formatLocalYmd(lastDay);
    }
    return formatLocalYmd(tentative);
}

export function isEmployeeDebtor(job: string, employmentType?: string): boolean {
    const et = String(employmentType || '').toLowerCase();
    if (et === 'employee' || et === 'موظف') return true;
    const j = String(job || '');
    return j.includes('موظف') || j.includes('حكومي');
}

export function invalidPositiveAmountMessage(fieldLabel: string): string {
    return `يرجى إدخال ${fieldLabel} بصيغة رقمية صحيحة أكبر من صفر.`;
}

import { unifiedFundsLedgerStorageKey } from '@/app/utils/unifiedFundsLedgerStorage';

export function storageKey(executionId: string): string {
    return unifiedFundsLedgerStorageKey(executionId);
}

export function emptyStore(): UnifiedLedgerStore {
    return {
        lawyerFees: [],
        expenses: [],
        payments: [],
        completed: false,
        garnishment: false,
        seeded: false,
        principalSnapshot: null,
        collectionRequestActive: false,
        collectionRequestedTotal: null,
        evictionLedgerActivated: false,
        pendingSettlement: null,
    };
}
