import { describe, it, expect } from 'vitest';
import { formatDateToLocalYmd } from '@/app/utils/executionStateMachine';
import { canBeForcefullySummoned, deriveMonetaryClaimNature, deriveEmploymentType } from './summoningImmunityEngine';

const pastNotice = '2020-01-01';
const recentNotice = new Date();
recentNotice.setDate(recentNotice.getDate() - 1);
const recentNoticeStr = formatDateToLocalYmd(recentNotice);

describe('summoningImmunityEngine', () => {
    it('blocks without notification date', () => {
        const r = canBeForcefullySummoned({
            notificationDate: null,
            employmentType: 'كاسب',
            claimNature: 'مالي',
            isAlimony: false,
            salaryCoversAlimony: true,
            hasGuarantor: false,
            hasAttendanceHistory: false,
            forcedAttendanceIssued: false,
        });
        expect(r.canForceSummon).toBe(false);
        expect(r.badges.some((b) => b.id === 'waiting_notification_period')).toBe(true);
    });

    it('guarantor shield blocks financial claim even after grace', () => {
        const r = canBeForcefullySummoned({
            notificationDate: pastNotice,
            employmentType: 'كاسب',
            claimNature: 'مالي',
            isAlimony: false,
            salaryCoversAlimony: true,
            hasGuarantor: true,
            hasAttendanceHistory: false,
            forcedAttendanceIssued: false,
        });
        expect(r.canForceSummon).toBe(false);
        expect(r.badges.some((b) => b.id === 'guarantor_redirect')).toBe(true);
        expect(r.guarantorReplacementNoteAr).toBeTruthy();
    });

    it('employee + financial: immune (salary only)', () => {
        const r = canBeForcefullySummoned({
            notificationDate: pastNotice,
            employmentType: 'موظف',
            claimNature: 'مالي',
            isAlimony: false,
            salaryCoversAlimony: true,
            hasGuarantor: false,
            hasAttendanceHistory: false,
            forcedAttendanceIssued: false,
        });
        expect(r.canForceSummon).toBe(false);
        expect(r.badges.some((b) => b.id === 'employee_salary_garnishment_only')).toBe(true);
    });

    it('earner + financial + monetaryExecutionStrict: no forced summon', () => {
        const r = canBeForcefullySummoned({
            notificationDate: pastNotice,
            employmentType: 'كاسب',
            claimNature: 'مالي',
            isAlimony: false,
            salaryCoversAlimony: true,
            hasGuarantor: false,
            hasAttendanceHistory: false,
            forcedAttendanceIssued: false,
            monetaryExecutionStrict: true,
        });
        expect(r.canForceSummon).toBe(false);
        expect(r.badges.some((b) => b.id === 'earner_monetary_seizures_only')).toBe(true);
    });

    it('employee + financial + alimony shortfall: allows summon', () => {
        const r = canBeForcefullySummoned({
            notificationDate: pastNotice,
            employmentType: 'موظف',
            claimNature: 'مالي',
            isAlimony: true,
            salaryCoversAlimony: false,
            hasGuarantor: false,
            hasAttendanceHistory: false,
            forcedAttendanceIssued: false,
        });
        expect(r.canForceSummon).toBe(true);
        expect(r.badges.some((b) => b.id === 'exposed_alimony_shortfall')).toBe(true);
    });

    it('employee + non-financial: allows after grace', () => {
        const r = canBeForcefullySummoned({
            notificationDate: pastNotice,
            employmentType: 'موظف',
            claimNature: 'غير مالي',
            isAlimony: false,
            salaryCoversAlimony: true,
            hasGuarantor: false,
            hasAttendanceHistory: false,
            forcedAttendanceIssued: false,
        });
        expect(r.canForceSummon).toBe(true);
        expect(r.badges.some((b) => b.id === 'exposed_non_financial')).toBe(true);
    });

    it('attendance history bypasses seven-day wait', () => {
        const r = canBeForcefullySummoned({
            notificationDate: recentNoticeStr,
            employmentType: 'كاسب',
            claimNature: 'مالي',
            isAlimony: false,
            salaryCoversAlimony: true,
            hasGuarantor: false,
            hasAttendanceHistory: true,
            forcedAttendanceIssued: false,
        });
        expect(r.canForceSummon).toBe(true);
    });

    it('deriveMonetaryClaimNature from claim type', () => {
        expect(deriveMonetaryClaimNature('مشاهدة واستصحاب', null)).toBe('غير مالي');
        expect(deriveMonetaryClaimNature('استحصال دين مالي', null)).toBe('مالي');
    });

    it('deriveEmploymentType from occupation', () => {
        expect(deriveEmploymentType('موظف حكومي', null)).toBe('موظف');
        expect(deriveEmploymentType('كاسب', null)).toBe('كاسب');
    });
});
