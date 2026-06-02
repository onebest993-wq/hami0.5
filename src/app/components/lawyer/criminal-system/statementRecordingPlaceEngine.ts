import type { InvestigationPapersAt } from './criminalStore';

/** مكان تدوين الإفادة — مرحلة التحقيق فقط. */
export type StatementRecordingPlace = 'investigation_officer' | 'judicial_investigator';

export const STATEMENT_RECORDING_PLACE_OPTIONS: ReadonlyArray<{
    value: StatementRecordingPlace;
    label: string;
}> = [
    { value: 'investigation_officer', label: 'أمام ضابط التحقيق' },
    { value: 'judicial_investigator', label: 'أمام المحقق القضائي' },
];

export function isJudicialInvestigationDeposit(
    investigationPapersAt: InvestigationPapersAt | '',
): boolean {
    return investigationPapersAt === 'مكتب تحقيق قضائي';
}

/** يظهر عند إيداع الإضبارة خارج مكتب التحقيق القضائي (مركز شرطة / غير محدد). */
export function shouldShowStatementRecordingPlacePicker(
    isInvestigationPhase: boolean,
    investigationPapersAt: InvestigationPapersAt | '',
): boolean {
    if (!isInvestigationPhase) return false;
    return !isJudicialInvestigationDeposit(investigationPapersAt);
}

export function shouldShowJudicialRatificationCheckbox(
    isInvestigationPhase: boolean,
    investigationPapersAt: InvestigationPapersAt | '',
    statementRecordingPlace: StatementRecordingPlace | '',
): boolean {
    if (!isInvestigationPhase) return false;
    if (isJudicialInvestigationDeposit(investigationPapersAt)) return true;
    return statementRecordingPlace === 'judicial_investigator';
}

export function resolveEffectiveStatementRecordingPlace(
    investigationPapersAt: InvestigationPapersAt | '',
    statementRecordingPlace: StatementRecordingPlace | '',
): StatementRecordingPlace | undefined {
    if (isJudicialInvestigationDeposit(investigationPapersAt)) {
        return 'judicial_investigator';
    }
    return statementRecordingPlace || undefined;
}

export function shouldRequireStatementRecordingPlace(
    isInvestigationPhase: boolean,
    investigationPapersAt: InvestigationPapersAt | '',
): boolean {
    return shouldShowStatementRecordingPlacePicker(isInvestigationPhase, investigationPapersAt);
}
