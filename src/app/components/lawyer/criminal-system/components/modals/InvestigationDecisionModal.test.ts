import { describe, expect, it } from 'vitest';
import { investigationDecisionValidationError } from './InvestigationDecisionModal';

describe('investigationDecisionValidationError (referral-only)', () => {
    const base = {
        decisionDate: '2026-05-21',
        referralTarget: '' as const,
        courtName: '',
        scopedDefendantIds: ['d1'],
    };

    it('requires decision date', () => {
        expect(
            investigationDecisionValidationError({
                ...base,
                decisionDate: '',
            }),
        ).toMatch(/تاريخ صدور القرار/);
    });

    it('requires at least one scoped defendant', () => {
        expect(
            investigationDecisionValidationError({
                ...base,
                scopedDefendantIds: [],
            }),
        ).toMatch(/متهماً واحداً على الأقل/);
    });

    it('requires referral target for adult referral', () => {
        expect(investigationDecisionValidationError(base)).toMatch(/جهة الإحالة/);
    });

    it('requires misdemeanor type when referring to misdemeanor court', () => {
        expect(
            investigationDecisionValidationError({
                ...base,
                referralTarget: 'misdemeanor',
                courtName: 'محكمة الجنح',
            }),
        ).toMatch(/نوع الدعوى/);
    });

    it('passes valid misdemeanor referral without court case number', () => {
        expect(
            investigationDecisionValidationError({
                ...base,
                referralTarget: 'misdemeanor',
                misdemeanorType: 'موجزة',
                courtName: 'محكمة الجنح',
            }),
        ).toBeNull();
    });

    it('passes valid felony referral', () => {
        expect(
            investigationDecisionValidationError({
                ...base,
                referralTarget: 'felony',
                courtName: 'محكمة الجنايات',
            }),
        ).toBeNull();
    });

    it('passes valid juvenile referral when all scoped defendants are juvenile', () => {
        expect(
            investigationDecisionValidationError({
                ...base,
                referralTarget: 'juvenile',
                courtName: 'محكمة الأحداث',
                scopedAllJuvenile: true,
                scopedIncludesJuvenile: true,
            }),
        ).toBeNull();
    });

    it('rejects mixed juvenile and adult referral scope', () => {
        expect(
            investigationDecisionValidationError({
                ...base,
                referralTarget: 'misdemeanor',
                misdemeanorType: 'موجزة',
                courtName: 'محكمة الجنح',
                scopedAllJuvenile: false,
                scopedIncludesJuvenile: true,
            }),
        ).toMatch(/تفريق الإضبارة/);
    });

    it('rejects referral when dossier mixes unknown and identified defendants', () => {
        expect(
            investigationDecisionValidationError({
                ...base,
                referralTarget: 'misdemeanor',
                misdemeanorType: 'موجزة',
                courtName: 'محكمة الجنح',
                dossierMixesUnknownAndIdentified: true,
            }),
        ).toMatch(/كشف هوية المجهول/);
    });
});
