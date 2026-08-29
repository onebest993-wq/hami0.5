import { useMemo } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import { resolveMergedCaseIds, type CriminalCase, type CriminalDefendant } from './criminalStore';
import { buildMergedCaseHeaderBadges } from './caseMergeTimeline';
import { computeOrdinaryCassationWindowLite } from './criminalRequestsEntryLite';
import { availableCassationTypesForStage } from './cassationEngine';

type UseCriminalDashboardCaseBannersParams = {
    criminalCase: CriminalCase;
    displayCasesById: Record<string, CriminalCase | undefined>;
    stage: string;
    caseStage: CaseStage;
    defendants: CriminalDefendant[];
    finalDecision: CriminalCase['finalDecision'];
    isSentToCassation: boolean;
    isArchived: boolean;
    isEffectivelyArchived: boolean;
    isDashboardReadOnly: boolean;
};

/**
 * لافتات/مشتقّات التمييز (عدّاد الموعد النهائي، أنواع الطعن المتاحة، تنبيهات الغياب) وضم الإضبارات —
 * مستخرَجة من الـ runtime. المُعالِجات (open/submit) تبقى في الـ runtime.
 */
export function useCriminalDashboardCaseBanners({
    criminalCase,
    displayCasesById,
    stage,
    caseStage,
    defendants,
    finalDecision,
    isSentToCassation,
    isArchived,
    isEffectivelyArchived,
    isDashboardReadOnly,
}: UseCriminalDashboardCaseBannersParams) {
    const verdictDate =
        String(criminalCase.verdictDate ?? '').trim() ||
        (() => {
            const relevant = (Array.isArray(criminalCase.timelineEvents) ? criminalCase.timelineEvents : []).filter(
                (e) => /نطق بالقرار|قرار حكم/.test(String(e.category ?? '').trim()),
            );
            if (!relevant.length) return '';
            relevant.sort(
                (a, b) =>
                    (Date.parse(String(b.date ?? '')) || 0) -
                    (Date.parse(String(a.date ?? '')) || 0),
            );
            return String(relevant[0]?.date ?? '').trim();
        })();

    const mandatoryCassationAutoSend = Boolean(
        finalDecision?.decisionType === 'conviction' &&
            (finalDecision.punishmentType === 'death' || finalDecision.punishmentType === 'life'),
    );

    const effectiveVerdictDate =
        verdictDate || (finalDecision?.decisionType === 'conviction' ? String(finalDecision?.date ?? '').trim() : '');

    const cassationDeadlineDaysLeft = useMemo(() => {
        if (!effectiveVerdictDate) return null;
        const window = computeOrdinaryCassationWindowLite(
            effectiveVerdictDate,
            mandatoryCassationAutoSend ? new Date() : new Date(),
        );
        if (mandatoryCassationAutoSend) {
            const base = Date.parse(effectiveVerdictDate);
            if (!Number.isFinite(base) || base <= 0) return null;
            const deadline = base + 10 * 24 * 60 * 60 * 1000;
            return Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
        }
        return window.isExpired ? 0 : window.remainingDays;
    }, [effectiveVerdictDate, mandatoryCassationAutoSend]);

    const availableCassationFilingTypes = useMemo(
        () => availableCassationTypesForStage(stage, caseStage),
        [stage, caseStage],
    );

    const showCassationCountdownBanner =
        (stage === 'محكمة الجنح' || stage === 'محكمة الجنايات') &&
        Boolean(effectiveVerdictDate) &&
        !isSentToCassation &&
        !isArchived &&
        cassationDeadlineDaysLeft !== null;

    const inAbsentiaBanners = useMemo(() => {
        const list = Array.isArray(defendants) ? defendants : [];
        const today = new Date();
        const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const parseYmdUtc = (ymd: string): number | null => {
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? '').trim());
            if (!m) return null;
            return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        };
        return list
            .map((d) => {
                const det = d.inAbsentiaDetails;
                if (!det || det.isObjectionFiled) return null;
                const notifiedDate = String(det.notifiedDate ?? '').trim();
                const deadline = String(det.objectionDeadline ?? '').trim();
                const deadlineMs = parseYmdUtc(deadline);
                const daysLeft =
                    typeof deadlineMs === 'number' ? Math.ceil((deadlineMs - todayMs) / (24 * 60 * 60 * 1000)) : null;
                const isExpired = typeof daysLeft === 'number' ? daysLeft < 0 : false;
                const needsNotification = !notifiedDate || !deadline;
                return {
                    id: d.id,
                    name: String(d.fullName ?? '').trim() || '—',
                    objectionDeadline: deadline,
                    daysLeft,
                    isExpired,
                    needsNotification,
                };
            })
            .filter(Boolean) as {
            id: string;
            name: string;
            objectionDeadline: string;
            daysLeft: number | null;
            isExpired: boolean;
            needsNotification: boolean;
        }[];
    }, [defendants]);

    const mergedCaseIds = useMemo(() => resolveMergedCaseIds(criminalCase), [criminalCase]);

    const mergedCaseDisplayLinks = useMemo(
        () => buildMergedCaseHeaderBadges(criminalCase, displayCasesById),
        [criminalCase, displayCasesById],
    );

    const canShowMergeMenuItem = !isEffectivelyArchived && !isDashboardReadOnly;
    const isMergeMenuItemDisabled = false;

    return {
        verdictDate,
        mandatoryCassationAutoSend,
        effectiveVerdictDate,
        cassationDeadlineDaysLeft,
        availableCassationFilingTypes,
        showCassationCountdownBanner,
        inAbsentiaBanners,
        mergedCaseIds,
        mergedCaseDisplayLinks,
        canShowMergeMenuItem,
        isMergeMenuItemDisabled,
    };
}
