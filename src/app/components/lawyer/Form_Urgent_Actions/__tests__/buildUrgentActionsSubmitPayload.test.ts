import { describe, expect, it } from 'vitest';
import {
    buildUrgentActionsSubmitPayload,
    validateUrgentActionsForm,
    resolveUrgentSpecificActionType,
} from '../buildUrgentActionsSubmitPayload';
import { PETITION_ORDER_MANUAL_OPTION } from '../constants';
import type { UrgentActionFormData, UrgentPartyEntry } from '../urgentActionsFormTypes';

const baseFormData: UrgentActionFormData = {
    actionType: 'state_order',
    requestNumber: '123',
    requestDate: '2026-01-15',
    firstHearingDate: '',
    courtName: 'محكمة',
    judgeName: '',
    specificActionType: 'منع السفر الولائي',
    procedureDetails: '',
    requestSubject: '',
    urgentReason: '',
    legalBasis: '',
    deadlineGrievance3Days: false,
    deadlineTamyeez7Days: false,
    notes: '',
    defenderEntryPhase: 1,
    stateOrderIssuedDate: '',
    defenderPhase3GrievanceDecisionDate: '',
};

const baseParty1: UrgentPartyEntry[] = [
    { name: 'أحمد', type: 'person', phone: '', address: 'بغداد', isRepresented: false },
];
const baseParty2: UrgentPartyEntry[] = [
    { name: 'محمد', type: 'person', address: 'بصرة', isRepresented: false, isClient: false },
];

describe('buildUrgentActionsSubmitPayload', () => {
    it('requires court name and parties for standard state order', () => {
        const errors = validateUrgentActionsForm({
            formData: { ...baseFormData, courtName: '' },
            party1List: baseParty1,
            party2List: baseParty2,
            selectedSubActionType: 'منع السفر الولائي',
            customSpecificActionType: '',
            party2Hidden: false,
            isRespondentClient: false,
        });
        expect(errors.courtName).toBeTruthy();
    });

    it('builds payload with pathway metadata for valid state order', () => {
        const ctx = {
            formData: baseFormData,
            party1List: baseParty1,
            party2List: baseParty2,
            selectedSubActionType: 'منع السفر الولائي',
            customSpecificActionType: '',
            party2Hidden: false,
            isRespondentClient: false,
        };
        expect(Object.keys(validateUrgentActionsForm(ctx))).toEqual([]);
        const payload = buildUrgentActionsSubmitPayload(ctx);
        expect(payload.specificActionType).toBe('منع السفر الولائي');
        expect(payload.party1Name).toBe('أحمد');
        expect(payload.party2Name).toBe('محمد');
        expect(payload.allParty1).toEqual(baseParty1);
    });

    it('resolves manual petition order option from custom text', () => {
        const resolved = resolveUrgentSpecificActionType({
            formData: baseFormData,
            party1List: baseParty1,
            party2List: baseParty2,
            selectedSubActionType: PETITION_ORDER_MANUAL_OPTION,
            customSpecificActionType: 'أمر ولائي مخصص',
            party2Hidden: false,
            isRespondentClient: false,
        });
        expect(resolved).toBe('أمر ولائي مخصص');
    });
});
