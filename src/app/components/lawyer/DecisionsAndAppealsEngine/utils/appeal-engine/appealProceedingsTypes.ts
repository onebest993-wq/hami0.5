import type { ExecutionDecisionAppealPhase } from '@/app/types/execution';
import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';

export function appealTrackSmartPillLabel(
    awaitingTamyeezAfterGrievance: boolean,
    ap: ExecutionDecisionAppealPhase | null | undefined,
    appealStatus: Decision['appealStatus']
): string {
    if (ap === 'grievance' || appealStatus === 'tadhallum_filed') return 'طعن - تظلم';
    if (ap === 'cassation' || appealStatus === 'tamyeez_filed') return 'طعن - تمييز';
    if (awaitingTamyeezAfterGrievance) return 'طعن';
    return 'طعن';
}

export type AppealProceedingRow = {
    stage: 'تظلم' | 'تمييز';
    appellant: string;
    result: string;
};

export type ManualAppealAppellantActor = 'lawyer' | 'debtor';

export function formatManualAppealAppellantsLabel(
    actors: ManualAppealAppellantActor[] | undefined,
    perspective: AppealUiPerspective
): string {
    const list = Array.isArray(actors) ? actors.filter((a) => a === 'lawyer' || a === 'debtor') : [];
    if (list.length === 0) return '—';
    const labels = list.map((actor) => {
        if (actor === 'lawyer') return 'الدائن';
        return perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    });
    return labels.join('، ');
}

export function hasManualExecutorAppealAppellants(row: Decision): boolean {
    return (
        (Array.isArray(row.manualGrievanceAppellants) && row.manualGrievanceAppellants.length > 0) ||
        (Array.isArray(row.manualCassationAppellants) && row.manualCassationAppellants.length > 0)
    );
}
