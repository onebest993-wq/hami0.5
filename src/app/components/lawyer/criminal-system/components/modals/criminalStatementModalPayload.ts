import type {
    CriminalComplainant,
    CriminalDefendant,
    InvestigationPapersAt,
    Statement,
} from '../../criminalStore';
import { sanitizeContentHighlights } from '../../statementContentHighlights';
import {
    resolveEffectiveStatementRecordingPlace,
    type StatementRecordingPlace,
} from '../../statementRecordingPlaceEngine';
import type { PersonOption } from './criminalStatementModalHelpers';

export type StatementCanSaveInput = {
    statementDate: string;
    statementGiverType: Statement['giverType'] | '';
    statementContent: string;
    requireStatementPlace: boolean;
    statementRecordingPlace: StatementRecordingPlace | '';
    witnessName: string;
    witnessPartySide: 'complainant' | 'defendant' | '';
    witnessPartyIds: string[];
    editingStatementId: string | null;
    statementManualName: string;
    isPartyPickerGiver: boolean;
    statementPartyId: string;
    eligibleDefendants: CriminalDefendant[];
    defendants: PersonOption[];
};

export function computeStatementCanSave(input: StatementCanSaveInput): boolean {
    if (!input.statementDate.trim()) return false;
    if (!input.statementGiverType) return false;
    if (!input.statementContent.trim()) return false;
    if (
        input.requireStatementPlace &&
        input.statementRecordingPlace !== 'investigation_officer' &&
        input.statementRecordingPlace !== 'judicial_investigator'
    ) {
        return false;
    }
    if (input.statementGiverType === 'witness') {
        return (
            Boolean(input.witnessName.trim()) &&
            (input.witnessPartySide === 'complainant' || input.witnessPartySide === 'defendant') &&
            input.witnessPartyIds.length > 0
        );
    }
    if (input.editingStatementId) return Boolean(input.statementManualName.trim());
    if (input.isPartyPickerGiver) {
        if (!input.statementPartyId) return false;
        if (input.statementGiverType === 'defendant') {
            const hit =
                input.eligibleDefendants.find((d) => d.id === input.statementPartyId) ??
                input.defendants.find((d) => d.id === input.statementPartyId);
            if (hit && 'isJuvenile' in hit && hit.isJuvenile && !String(hit.guardianName ?? '').trim()) {
                return false;
            }
        }
        return true;
    }
    return false;
}

export type StatementPayloadInput = {
    statementDate: string;
    statementGiverType: Statement['giverType'] | '';
    statementContent: string;
    showLawyerNotes: boolean;
    statementNotes: string;
    initialStatement: Statement | null;
    investigationPapersAt: InvestigationPapersAt | '';
    statementRecordingPlace: StatementRecordingPlace | '';
    showRatificationCheckbox: boolean;
    statementIsRatified: boolean;
    contentHighlights: Statement['contentHighlights'];
    witnessName: string;
    witnessDetails: string;
    witnessPartySide: 'complainant' | 'defendant' | '';
    witnessPartyIds: string[];
    editingStatementId: string | null;
    statementManualName: string;
    isPartyPickerGiver: boolean;
    statementPartyId: string;
    partyOptionsForGiver: PersonOption[];
    complainants: PersonOption[];
    eligibleDefendants: CriminalDefendant[];
};

export function buildCriminalStatementPayload(
    input: StatementPayloadInput,
): Omit<Statement, 'id'> | null {
    const cleanDate = input.statementDate.trim();
    const giverType = input.statementGiverType;
    const cleanContent = input.statementContent.trim();
    const cleanNotes = input.showLawyerNotes
        ? input.statementNotes.trim()
        : String(input.initialStatement?.notes ?? '').trim();
    if (!cleanDate || !giverType || !cleanContent) return null;

    const recordingPlace = resolveEffectiveStatementRecordingPlace(
        input.investigationPapersAt,
        input.statementRecordingPlace,
    );
    const recordingPlaceField = recordingPlace ? recordingPlace : undefined;
    const ratifiedFlag =
        input.showRatificationCheckbox && input.statementIsRatified ? true : undefined;
    const highlights = sanitizeContentHighlights(input.contentHighlights, cleanContent.length);
    const highlightsField = highlights.length ? highlights : undefined;

    if (giverType === 'witness') {
        const wn = input.witnessName.trim();
        if (!wn) return null;
        if (input.witnessPartySide !== 'complainant' && input.witnessPartySide !== 'defendant') {
            return null;
        }
        if (!input.witnessPartyIds.length) return null;
        return {
            date: cleanDate,
            giverType,
            giverName: wn,
            witnessName: wn,
            witnessDetails: input.witnessDetails.trim() ? input.witnessDetails.trim() : undefined,
            witnessPartySide: input.witnessPartySide,
            witnessPartyIds: input.witnessPartyIds,
            witnessKind: input.witnessPartySide === 'complainant' ? 'prosecution' : 'defense',
            content: cleanContent,
            contentHighlights: highlightsField,
            notes: cleanNotes ? cleanNotes : undefined,
            statementRecordingPlace: recordingPlaceField,
            isJudiciallyRatified: ratifiedFlag,
        };
    }

    const giverName = input.editingStatementId
        ? input.statementManualName.trim()
        : input.isPartyPickerGiver
          ? (
                input.partyOptionsForGiver.find((p) => p.id === input.statementPartyId)?.fullName ??
                input.complainants.find((c) => c.id === input.statementPartyId)?.fullName ??
                input.eligibleDefendants.find((d) => d.id === input.statementPartyId)?.fullName ??
                ''
            ).trim()
          : input.statementManualName.trim();

    if (!giverName) return null;

    return {
        date: cleanDate,
        giverType,
        giverName,
        content: cleanContent,
        contentHighlights: highlightsField,
        notes: cleanNotes ? cleanNotes : undefined,
        statementRecordingPlace: recordingPlaceField,
        isJudiciallyRatified: ratifiedFlag,
    };
}
