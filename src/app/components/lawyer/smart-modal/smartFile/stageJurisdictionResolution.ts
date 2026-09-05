import type { LawsuitJurisdictionSource } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import type { CourtJurisdiction, FirstInstanceDegree } from './judgmentStageMetadataTypes';
import {
    isAppellateAppealAllowed,
    type AppealRouteContext,
} from './appealRouteEligibility';

type JurisdictionFile = LawsuitJurisdictionSource & {
    type?: string;
    selectedType?: string;
    docType?: string;
};

/** يستنتج اختصاص الإضبارة من نوع الملف */
export function resolveCourtJurisdiction(
    file?: JurisdictionFile | Record<string, unknown> | null,
): CourtJurisdiction {
    if (!file || typeof file !== 'object') return 'CIVIL';
    const ctx = file as JurisdictionFile;
    if (isPersonalStatusFile(ctx)) return 'PERSONAL_STATUS';

    const type = String(ctx.type ?? '').toLowerCase();
    const selected = String(ctx.selectedType ?? '').toLowerCase();
    const docType = String(ctx.docType ?? '').toLowerCase();
    const jurisdiction = String(ctx.lawsuitJurisdiction ?? '').toLowerCase();

    if (
        type.includes('labor')
        || selected === 'labor'
        || docType.includes('عمال')
        || jurisdiction === 'labor'
    ) {
        return 'LABOR';
    }
    if (
        type.includes('commercial')
        || selected === 'commercial'
        || docType.includes('تجار')
        || jurisdiction === 'commercial'
    ) {
        return 'COMMERCIAL';
    }
    if (
        type === 'lawsuit'
        || selected === 'civil'
        || jurisdiction === 'lawsuit'
        || jurisdiction === 'civil'
    ) {
        return 'CIVIL';
    }
    return 'CIVIL';
}

/**
 * درجة الطعn من البداءة — استئnaaf (FIRST_DEGREE) أم تمyيز مباشر (FINAL_DEGREE).
 * يعتمد على appealRouteEligibility (قيمة ≤ 1M → تمyيز فقط).
 */
export function resolveFirstInstanceDegree(
    appealRoute: AppealRouteContext | null | undefined,
): FirstInstanceDegree {
    if (!appealRoute) return 'FIRST_DEGREE';
    return isAppellateAppealAllowed(appealRoute) ? 'FIRST_DEGREE' : 'FINAL_DEGREE';
}
