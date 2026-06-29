import type { CriminalDefendant } from './criminalCaseModel';

function createLocalDefendantId(): string {
    return `cd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** صف متهم فارغ (معلوم) — للمسودات والنماذج. */
export function makeEmptyDefendant(): CriminalDefendant {
    return {
        id: createLocalDefendantId(),
        fullName: '',
        address: '',
        birthYear: '',
        status: '',
        detentionAuthority: '',
        detentionExpiryDate: '',
        detentionHistoryLog: [],
        totalDetentionDays: 0,
        hasFelonyCourtPermit: false,
        isJuvenile: false,
        isUnderSeven: false,
        birthDate: '',
        guardianName: '',
        guardianRelationship: '',
        personalStage: 'under_investigation',
        isPartyRecordLocked: false,
        investigationStatus: 'active',
        isIdentityUnknown: false,
    };
}
