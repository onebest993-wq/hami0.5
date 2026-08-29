import SecureStoreService from '@/app/services/SecureStoreService';
import type { JudicialDecision } from '@/app/types/criminal';
import { isInvestigationStoredStage } from '../criminalStageUtils';
import {
    useCriminalStore,
    type CriminalCaseStage,
    type LawyerRequest,
} from '../criminalStore';

export const TEST_CRIMINAL_SESSION_LAWYER_ID = 'test-session-lawyer';

export function resetCriminalStore() {
    SecureStoreService.deleteItemSync('hami:criminal:store');
    useCriminalStore.setState({
        casesById: {},
        sessionOwnerLawyerId: TEST_CRIMINAL_SESSION_LAWYER_ID,
        pendingSeveranceContext: null,
    });
    useCriminalStore.getState().resetDraft();
}

export async function readPersistedCriminalStoreRaw(): Promise<string | null> {
    await SecureStoreService.ensurePersistedReady();
    await new Promise((r) => setTimeout(r, 0));
    return SecureStoreService.getItem('hami:criminal:store');
}

export function seedDraftForNewCase(stage: CriminalCaseStage) {
    const s = useCriminalStore.getState();
    const c1 = useCriminalStore.getState().draft.complainants[0]?.id;
    if (c1) {
        s.toggleDraftComplainantOfficeClient(c1, true);
    }
    s.setBasicField('stage', stage);
    s.setLocationField('investigationCourtName', 'محكمة تحقيق الكرخ');
    s.setLocationField('baseRegisterNumberAndDate', '1/2026 في 2026-05-19');
    s.setLocationField('courtName', isInvestigationStoredStage(stage) ? '' : 'محكمة جنح الكرخ');
    s.setLocationField('caseNumber', isInvestigationStoredStage(stage) ? '' : '123/ج/2026');
    if (!isInvestigationStoredStage(stage)) {
        s.setBasicField('crimeType', 'جنحة');
        s.setBasicField('legalArticle', '413 ق.ع');
    }
    const d1 = useCriminalStore.getState().draft.defendants[0]?.id;
    if (d1) {
        s.setDefendantField(d1, 'fullName', 'محمد قاسم عبد');
        s.setDefendantField(d1, 'birthYear', '1990');
        s.setDefendantField(d1, 'status', 'موقوف');
        s.setDefendantField(d1, 'detentionAuthority', 'سجن التوقيف المركزي');
        s.setDefendantField(d1, 'detentionExpiryDate', '2026-06-01');
    }
}

export function makePendingLawyerRequest(
    id: string,
    requestDate: string,
    type: string,
    lawyerNote = 'ملاحظة اختبار',
): LawyerRequest {
    return {
        id,
        requestDate,
        type,
        lawyerNote,
        status: 'pending',
    };
}

export function makePreparatoryDecision(
    id: string,
    issuedAt: string,
    title: string,
    summary = title,
): JudicialDecision {
    return {
        id,
        issuedAt,
        title,
        summary,
        decisionType: 'preparatory',
        appeals: [],
        isLocked: true,
    };
}
