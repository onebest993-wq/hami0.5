import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { resolveRequestProponent } from '../appealRequestOrigin';
import {
    resolveGrievanceFilerActor,
    resolveHarmedPartyAppealActor,
} from './appealActorFiling';

export function resolveAppealActorLabel(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): string {
    const debtorLabel = perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    if (d.appealActor === 'lawyer') return 'الدائن';
    if (d.appealActor === 'debtor') return debtorLabel;
    const filer =
        resolveGrievanceFilerActor(d, perspective) ??
        resolveHarmedPartyAppealActor(d, perspective);
    if (filer === 'debtor') return debtorLabel;
    if (filer === 'lawyer') return 'الدائن';
    const proponent = resolveRequestProponent(d, perspective);
    if (proponent === 'debtor') return debtorLabel;
    if (proponent === 'creditor') return 'الدائن';
    if (proponent === 'executor') return 'المنفذ';
    return '—';
}

export function appellantLabelFromLogMessage(
    message: string,
    perspective: AppealUiPerspective = 'creditor_agent'
): string | null {
    const m = String(message || '');
    const debtorLabel = perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    if (/موكّ?ل\s*المدين|موكّ?لنا|تظلم\s+موكّ?ل/.test(m)) return debtorLabel;
    if (/تمييز\s+موكّ?ل|تمييز\s+المدين|المدين.*تمييز|تظلم\s+المدين/.test(m)) return debtorLabel;
    if (/تمييز\s+الدائن|تمييز\s+وكيل|وكيل\s+الدائن.*تمييز|تظلم\s+الدائن|تظلم\s+وكيل/.test(m)) {
        return 'الدائن';
    }
    if (/المدين/.test(m)) return debtorLabel;
    if (/وكيل\s*الدائن|الدائن/.test(m)) return 'الدائن';
    return null;
}
