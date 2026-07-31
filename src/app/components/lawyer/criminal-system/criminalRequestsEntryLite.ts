import type { DecisionAppealabilityCategory } from '@/app/types/criminal';

const MS_PER_DAY = 86_400_000;
const ORDINARY_CASSATION_WINDOW_DAYS = 30;

type LawyerRequestEntryState = {
    status?: string;
    isLocked?: boolean;
    decisionArchived?: boolean;
};

function startOfUtcDayMs(value: string): number {
    const raw = String(value ?? '').trim();
    if (!raw) return Number.NaN;

    const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (ymdMatch) {
        return Date.UTC(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
    }

    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return Number.NaN;

    const date = new Date(parsed);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function todayStartMs(referenceDate: Date): number {
    return Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth(),
        referenceDate.getUTCDate(),
    );
}

function isLawyerRequestLockedLite(request: LawyerRequestEntryState): boolean {
    if (request.status === 'executed') return true;
    return request.isLocked === true || request.decisionArchived === true;
}

export function resolveProceedingsBlockAppealabilityLite(
    blocksProceedings: boolean,
): DecisionAppealabilityCategory {
    return blocksProceedings ? 'قابل للطعن على انفراد' : 'غير قابل للطعن على انفراد';
}

export function computeOrdinaryCassationWindowLite(
    issuedDate: string,
    referenceDate = new Date(),
): { remainingDays: number; isExpired: boolean } {
    const issuedMs = startOfUtcDayMs(issuedDate);
    if (!Number.isFinite(issuedMs)) {
        return { remainingDays: 0, isExpired: true };
    }

    const periodStartMs = issuedMs + MS_PER_DAY;
    const lastDayMs = periodStartMs + (ORDINARY_CASSATION_WINDOW_DAYS - 1) * MS_PER_DAY;
    const todayMs = todayStartMs(referenceDate);

    if (todayMs < periodStartMs) {
        return { remainingDays: ORDINARY_CASSATION_WINDOW_DAYS, isExpired: false };
    }

    if (todayMs > lastDayMs) {
        return { remainingDays: 0, isExpired: true };
    }

    return {
        remainingDays: Math.floor((lastDayMs - todayMs) / MS_PER_DAY) + 1,
        isExpired: false,
    };
}

export function canAddLawyerRequestFollowUpMarginLite(request: LawyerRequestEntryState): boolean {
    if (request.status !== 'pending') return false;
    return !isLawyerRequestLockedLite(request);
}

export function canEditLawyerRequestAttachmentsLite(request: LawyerRequestEntryState): boolean {
    if (request.status !== 'pending') return false;
    return !isLawyerRequestLockedLite(request);
}
