import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    buildTrialSessionPreparatoryJudicialDecision,
    resolveTrialPreparatoryNonAppealableBadge,
    shouldShowTrialPreparatoryAppealActions,
} from './trialSessionPreparatoryDecisionEngine';

describe('trialSessionPreparatoryDecisionEngine', () => {
    it('builds judicial decision with blocking suit appealability', () => {
        const d = buildTrialSessionPreparatoryJudicialDecision(
            { id: 's1', date: '2026-05-01', sessionNumber: '2' },
            { title: 'تأجيل', details: 'تأجيل لطلب مستند', isBlockingSuit: true },
            'misdemeanor',
        );
        expect(d.decisionAppealability).toBe('قابل للطعن على انفراد');
        expect(d.decisionType).toBe('preparatory');
    });

    it('shows non-appealable badge when blocking suit is false', () => {
        const d: JudicialDecision = {
            id: 'jd1',
            issuedAt: '2026-05-01',
            title: 'قرار',
            summary: 'x',
            decisionType: 'preparatory',
            appeals: [],
            isLocked: true,
            decisionAppealability: 'غير قابل للطعن على انفراد',
        };
        expect(resolveTrialPreparatoryNonAppealableBadge(d)).toContain('لا يطعن');
        expect(shouldShowTrialPreparatoryAppealActions(d, 'misdemeanor')).toBe(false);
    });
});
