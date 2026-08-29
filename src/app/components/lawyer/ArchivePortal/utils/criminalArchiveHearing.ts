import { parseTrialSessionNumber } from '@/app/components/lawyer/criminal-system/trialSessionNumber';
import { normalizeLawsuitArchiveYmd } from './archiveYmd';

const TRIAL_STORED_STAGES = new Set(['محكمة الجنح', 'محكمة الجنايات', 'محكمة الأحداث']);

type CriminalArchiveHearingDisplay = {
    ymd: string;
    label: 'موعد المرافعة' | 'المرافعة القادمة';
    /** يُعرض على البطاقة فقط عند وجود مرافعة قادمة بعد جلسات مُنعَدة فعلياً */
    sessionNumber?: number;
};

function isTrialRecord(record: Record<string, unknown>): boolean {
    const stage = String((record.basics as { stage?: string } | undefined)?.stage ?? '').trim();
    return TRIAL_STORED_STAGES.has(stage);
}

type TrialRow = {
    sessionNumber?: string;
    nextSessionDate?: string;
    status?: string;
};

function trialsFingerprint(trials: unknown[]): string {
    return trials
        .map((raw) => {
            if (!raw || typeof raw !== 'object') return '';
            const row = raw as TrialRow;
            return [
                String(row.sessionNumber ?? ''),
                String(row.status ?? ''),
                String(row.nextSessionDate ?? ''),
            ].join(':');
        })
        .join('|');
}

/** للمزامنة مع بطاقة الأرشيف عند تغيير موعد المرافعة أو سجل الجلسات */
export function criminalArchiveHearingFingerprint(record: Record<string, unknown>): string {
    const location =
        record.location && typeof record.location === 'object'
            ? (record.location as Record<string, unknown>)
            : {};
    const trials = Array.isArray(record.trials) ? record.trials : [];
    return [
        normalizeLawsuitArchiveYmd(location.nextHearingDate) ?? '',
        trialsFingerprint(trials),
    ].join('~');
}

export function resolveCriminalArchiveHearingDisplay(
    record: Record<string, unknown>,
): CriminalArchiveHearingDisplay | null {
    if (!isTrialRecord(record)) return null;

    const location =
        record.location && typeof record.location === 'object'
            ? (record.location as Record<string, unknown>)
            : {};
    const trials = Array.isArray(record.trials) ? record.trials : [];

    const nextFromLocation = normalizeLawsuitArchiveYmd(location.nextHearingDate);

    let postponedNextYmd: string | null = null;
    let postponedNextSessionNum = 0;

    for (const raw of trials) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw as TrialRow;
        const status = String(row.status ?? '').trim();
        if (status !== 'postponed') continue;
        const nextYmd = normalizeLawsuitArchiveYmd(row.nextSessionDate);
        if (!nextYmd) continue;
        const sn = parseTrialSessionNumber(String(row.sessionNumber ?? ''));
        if (!postponedNextYmd || nextYmd > postponedNextYmd) {
            postponedNextYmd = nextYmd;
            postponedNextSessionNum = sn > 0 ? sn + 1 : 0;
        }
    }

    if (postponedNextYmd) {
        return {
            ymd: postponedNextYmd,
            label: 'المرافعة القادمة',
            sessionNumber: postponedNextSessionNum > 0 ? postponedNextSessionNum : undefined,
        };
    }

    const hasHeldProceedings = trials.some((raw) => {
        if (!raw || typeof raw !== 'object') return false;
        const status = String((raw as TrialRow).status ?? '').trim();
        return status === 'postponed' || status === 'verdict_issued';
    });

    if (!hasHeldProceedings && nextFromLocation) {
        return {
            ymd: nextFromLocation,
            label: 'موعد المرافعة',
        };
    }

    if (hasHeldProceedings && nextFromLocation) {
        let maxSessionNum = 0;
        for (const raw of trials) {
            if (!raw || typeof raw !== 'object') continue;
            const sn = parseTrialSessionNumber(String((raw as TrialRow).sessionNumber ?? ''));
            if (sn > maxSessionNum) maxSessionNum = sn;
        }
        return {
            ymd: nextFromLocation,
            label: 'المرافعة القادمة',
            sessionNumber: maxSessionNum > 0 ? maxSessionNum + 1 : undefined,
        };
    }

    return null;
}
