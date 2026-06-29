import type { CriminalCase, TimelineEvent } from './criminalCaseModel';
import { isLockedInvestigationTimelineEvent } from './criminalStageUtils';

export function isMergedDossierCase(c: CriminalCase | undefined): boolean {
    if (!c) return false;
    return c.dossierStatus === 'merged' || Boolean(String(c.mergedIntoCaseId ?? '').trim());
}

export function caseMutationBlocked(target: CriminalCase): boolean {
    return target.isArchived === true || target.isFrozen === true || isMergedDossierCase(target);
}

export function timelineEventAllowedWhenFrozen(event: TimelineEvent): boolean {
    const category = String(event.category ?? '').trim();
    return (
        category === 'تبليغ رسمي بالحكم الغيابي' ||
        category === 'تقديم اعتراض على الحكم الغيابي' ||
        category === 'جلسة المحاكمة الاعتراضية الأولى'
    );
}

export function isTimelineEventInsertBlocked(target: CriminalCase, event: TimelineEvent): boolean {
    if (caseMutationBlocked(target) && !timelineEventAllowedWhenFrozen(event)) return true;
    const category = String(event.category ?? '').trim();
    const type = String(event.type ?? '').trim();
    return Boolean(target.isInvestigationLocked && isLockedInvestigationTimelineEvent(category, type));
}
