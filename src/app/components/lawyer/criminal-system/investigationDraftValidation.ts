import type { CriminalCaseDraft } from './criminalStore';
import type { DefendantStatus } from './criminalStore';
import { isInvestigationStoredStage } from './criminalStageUtils';

export function requiresDetentionAuthorityForStatus(status: DefendantStatus | ''): boolean {
    return (
        status === 'موقوف' ||
        status === 'ملقى القبض عليه' ||
        status === 'juvenile_detention' ||
        status === 'psychiatric_eval'
    );
}

/** حقول مكان التحقيق الإلزامية عند إنشاء إضبارة في مرحلة التحقيق. */
export function isInvestigationDraftLocationIncomplete(
    stage: string,
    location: CriminalCaseDraft['location'],
): boolean {
    if (!isInvestigationStoredStage(stage)) return false;
    if (!String(location.investigationCourtName ?? '').trim()) return true;
    const papersAt = String(location.investigationPapersAt ?? '').trim();
    if (papersAt !== 'مركز شرطة' && papersAt !== 'مكتب تحقيق قضائي') return true;
    if (papersAt === 'مركز شرطة' && !String(location.policeStationName ?? '').trim()) return true;
    if (papersAt === 'مكتب تحقيق قضائي' && !String(location.investigationOfficeName ?? '').trim()) {
        return true;
    }
    return false;
}

export function hasDefendantMissingDetentionAuthority(
    defendants: Array<{ status?: DefendantStatus | '' ; detentionAuthority?: string }>,
): boolean {
    return defendants.some(
        (d) =>
            requiresDetentionAuthorityForStatus((d.status ?? '') as DefendantStatus | '') &&
            !String(d.detentionAuthority ?? '').trim(),
    );
}
