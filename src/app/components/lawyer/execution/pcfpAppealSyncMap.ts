import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import type {
    PersonalCoerciveAppealSyncSubtype,
    PersonalCoerciveAppealSyncView,
} from '@/app/utils/personalCoerciveAppealSync';

export const PCFP_APPEAL_SYNC_REQUEST_MAP: Partial<
    Record<PersonalCoerciveSubtype, PersonalCoerciveAppealSyncSubtype>
> = {
    forced_bring_in: 'forced_bring_in',
    travel_ban: 'travel_ban',
    arrest_warrant_investigation: 'arrest_warrant_investigation',
    executive_dossier_presentation: 'executive_dossier_presentation',
};

export function appealSyncForRequestSubtype(
    all: Record<PersonalCoerciveAppealSyncSubtype, PersonalCoerciveAppealSyncView>,
    subtype: PersonalCoerciveSubtype,
): PersonalCoerciveAppealSyncView | null {
    const key = PCFP_APPEAL_SYNC_REQUEST_MAP[subtype];
    return key ? all[key] : null;
}
