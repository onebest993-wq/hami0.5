/**
 * Unit Tests للحسابات القانونية
 * 
 * هذه الاختبارات تضمن دقة الحسابات القانونية الحساسة:
 * - حساب رسوم المحكمة
 * - حساب المواعيد القانونية
 * - التحقق من صلاحية المواعيد
 * - حساب الأيام المتبقية
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDateToLocalYmd } from '@/app/utils/executionStateMachine';
import {
    FINANCIAL,
    LEGAL_DEADLINES,
    calculateCourtFees,
    isDeadlineValid,
    getDaysRemaining,
    getReverseRole,
    PARTY_ROLES
} from '@/app/constants/legal';

describe('Legal Calculations', () => {
    
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-19T00:00:00Z'));
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
    // ========================================
    // حساب رسوم المحكمة
    // ========================================
    describe('calculateCourtFees', () => {
        
        it('should calculate 2% of claim amount', () => {
            const claimAmount = 1000000; // 1,000,000 دينار
            const expectedFees = 20000; // 2% = 20,000 دينار
            
            expect(calculateCourtFees(claimAmount)).toBe(expectedFees);
        });
        
        it('should enforce minimum court fees (10,000 IQD)', () => {
            const smallClaim = 100000; // 100,000 دينار
            const calculatedFees = smallClaim * FINANCIAL.COURT_FEES_PERCENTAGE; // 2,000
            
            // يجب أن يرجع الحد الأدنى
            expect(calculateCourtFees(smallClaim)).toBe(FINANCIAL.MIN_COURT_FEES);
            expect(calculateCourtFees(smallClaim)).toBeGreaterThan(calculatedFees);
        });
        
        it('should enforce maximum court fees (5,000,000 IQD)', () => {
            const hugeClaim = 500000000; // 500,000,000 دينار
            const calculatedFees = hugeClaim * FINANCIAL.COURT_FEES_PERCENTAGE; // 10,000,000
            
            // يجب أن يرجع الحد الأقصى
            expect(calculateCourtFees(hugeClaim)).toBe(FINANCIAL.MAX_COURT_FEES);
            expect(calculateCourtFees(hugeClaim)).toBeLessThan(calculatedFees);
        });
        
        it('should handle zero and negative amounts', () => {
            expect(calculateCourtFees(0)).toBe(FINANCIAL.MIN_COURT_FEES);
            expect(calculateCourtFees(-1000)).toBe(FINANCIAL.MIN_COURT_FEES);
        });
        
        it('should calculate correctly for common claim amounts', () => {
            const testCases = [
                { claim: 500000, expected: 10000 }, // 500K → 10K (minimum)
                { claim: 1000000, expected: 20000 }, // 1M → 20K
                { claim: 5000000, expected: 100000 }, // 5M → 100K
                { claim: 10000000, expected: 200000 }, // 10M → 200K
                { claim: 50000000, expected: 1000000 }, // 50M → 1M
                { claim: 100000000, expected: 2000000 }, // 100M → 2M
                { claim: 250000000, expected: 5000000 }, // 250M → 5M (maximum)
            ];
            
            testCases.forEach(({ claim, expected }) => {
                expect(calculateCourtFees(claim)).toBe(expected);
            });
        });
    });
    
    // ========================================
    // التحقق من صلاحية الموعد القانوني
    // ========================================
    describe('isDeadlineValid', () => {
        
        it('should return true if deadline has not passed', () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const isValid = isDeadlineValid(
                formatDateToLocalYmd(yesterday),
                LEGAL_DEADLINES.APPEAL_DEADLINE // 30 days
            );
            
            expect(isValid).toBe(true);
        });
        
        it('should return false if deadline has passed', () => {
            const today = new Date();
            const twoMonthsAgo = new Date(today);
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
            
            const isValid = isDeadlineValid(
                formatDateToLocalYmd(twoMonthsAgo),
                LEGAL_DEADLINES.APPEAL_DEADLINE // 30 days
            );
            
            expect(isValid).toBe(false);
        });
        
        it('should handle exact deadline day (inclusive)', () => {
            const today = new Date();
            const exactDeadline = new Date(today);
            exactDeadline.setDate(exactDeadline.getDate() - LEGAL_DEADLINES.APPEAL_DEADLINE);
            
            const isValid = isDeadlineValid(
                formatDateToLocalYmd(exactDeadline),
                LEGAL_DEADLINES.APPEAL_DEADLINE
            );
            
            // اليوم الأخير يجب أن يكون صالحاً
            expect(isValid).toBe(true);
        });
        
        it('should work with different deadline periods', () => {
            vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
            const decisionDate = '2026-01-01';
            
            expect(isDeadlineValid(decisionDate, 30)).toBe(true); // 30 days - valid
            expect(isDeadlineValid(decisionDate, 10)).toBe(false); // 10 days - invalid
            expect(isDeadlineValid(decisionDate, 15)).toBe(true); // 15 days - valid (inclusive)
        });
    });
    
    // ========================================
    // حساب الأيام المتبقية
    // ========================================
    describe('getDaysRemaining', () => {
        
        it('should calculate days remaining correctly', () => {
            const today = new Date();
            const decisionDate = new Date(today);
            decisionDate.setDate(decisionDate.getDate() - 10); // 10 days ago
            
            const remaining = getDaysRemaining(
                formatDateToLocalYmd(decisionDate),
                LEGAL_DEADLINES.APPEAL_DEADLINE // 30 days
            );
            
            // 30 - 10 = 20 days remaining
            expect(remaining).toBe(20);
        });
        
        it('should return 0 if deadline has passed', () => {
            const today = new Date();
            const oldDate = new Date(today);
            oldDate.setDate(oldDate.getDate() - 60); // 60 days ago
            
            const remaining = getDaysRemaining(
                formatDateToLocalYmd(oldDate),
                LEGAL_DEADLINES.APPEAL_DEADLINE // 30 days
            );
            
            expect(remaining).toBe(0);
        });
        
        it('should handle edge cases', () => {
            const today = new Date();
            
            // Same day decision
            const todayStr = formatDateToLocalYmd(today);
            expect(getDaysRemaining(todayStr, 10)).toBe(10);
            
            // Future date (should handle gracefully)
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 5);
            const futureDays = getDaysRemaining(formatDateToLocalYmd(futureDate), 10);
            expect(futureDays).toBeGreaterThanOrEqual(10);
        });
    });
    
    // ========================================
    // انقلاب المراكز (Role Reversal)
    // ========================================
    describe('getReverseRole', () => {
        
        it('should reverse plaintiff to appellee', () => {
            expect(getReverseRole(PARTY_ROLES.PLAINTIFF))
                .toBe(PARTY_ROLES.APPELLEE);
        });
        
        it('should reverse defendant to appellant', () => {
            expect(getReverseRole(PARTY_ROLES.DEFENDANT))
                .toBe(PARTY_ROLES.APPELLANT);
        });
        
        it('should reverse appellant to appellee', () => {
            expect(getReverseRole(PARTY_ROLES.APPELLANT))
                .toBe(PARTY_ROLES.APPELLEE);
        });
        
        it('should reverse appellee to appellant', () => {
            expect(getReverseRole(PARTY_ROLES.APPELLEE))
                .toBe(PARTY_ROLES.APPELLANT);
        });
        
        it('should return same role if not reversible', () => {
            expect(getReverseRole(PARTY_ROLES.CREDITOR))
                .toBe(PARTY_ROLES.CREDITOR);
            
            expect(getReverseRole(PARTY_ROLES.DEBTOR))
                .toBe(PARTY_ROLES.DEBTOR);
        });
        
        it('should handle invalid roles', () => {
            expect(getReverseRole('invalid-role'))
                .toBe('invalid-role');
        });
    });
    
    // ========================================
    // القيم الثابتة (Constants Validation)
    // ========================================
    describe('Legal Constants', () => {
        
        it('should have correct financial constants', () => {
            expect(FINANCIAL.COURT_FEES_PERCENTAGE).toBe(0.02); // 2%
            expect(FINANCIAL.MIN_COURT_FEES).toBe(10000);
            expect(FINANCIAL.MAX_COURT_FEES).toBe(5000000);
            expect(FINANCIAL.EXECUTION_FEES_PERCENTAGE).toBe(0.01); // 1%
        });
        
        it('should have correct legal deadlines', () => {
            expect(LEGAL_DEADLINES.APPEAL_DEADLINE).toBe(30);
            expect(LEGAL_DEADLINES.CASSATION_DEADLINE).toBe(30);
            expect(LEGAL_DEADLINES.OBJECTION_DEADLINE).toBe(10);
            expect(LEGAL_DEADLINES.VOLUNTARY_EXECUTION).toBe(10);
        });
        
        it('should have all required party roles', () => {
            expect(PARTY_ROLES.PLAINTIFF).toBe('المدعي');
            expect(PARTY_ROLES.DEFENDANT).toBe('المدعى عليه');
            expect(PARTY_ROLES.APPELLANT).toBe('المستأنف');
            expect(PARTY_ROLES.APPELLEE).toBe('المستأنف عليه');
            expect(PARTY_ROLES.CREDITOR).toBe('الدائن');
            expect(PARTY_ROLES.DEBTOR).toBe('المدين');
        });
    });
    
    // ========================================
    // Integration Tests (اختبارات تكاملية)
    // ========================================
    describe('Integration: Appeal Filing Scenario', () => {
        
        it('should handle complete appeal filing workflow', () => {
            vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));
            
            // السيناريو: حكم صدر بمبلغ 10,000,000 دينار في 2026-01-01
            const judgmentAmount = 10000000;
            const judgmentDate = '2026-01-01';
            
            // 1. حساب رسوم الاستئناف (3% من قيمة الحكم)
            const appealFees = judgmentAmount * FINANCIAL.APPEAL_FEES_PERCENTAGE;
            expect(appealFees).toBe(300000); // 300,000 دينار
            
            // 2. التحقق من صلاحية موعد الاستئناف
            const isValid = isDeadlineValid(judgmentDate, LEGAL_DEADLINES.APPEAL_DEADLINE);
            expect(isValid).toBe(true); // 19 days < 30 days
            
            // 3. حساب الأيام المتبقية
            const daysLeft = getDaysRemaining(judgmentDate, LEGAL_DEADLINES.APPEAL_DEADLINE);
            expect(daysLeft).toBe(11); // 30 - 19 = 11 days
            
            // 4. انقلاب المراكز
            const newPlaintiffRole = getReverseRole(PARTY_ROLES.DEFENDANT);
            expect(newPlaintiffRole).toBe(PARTY_ROLES.APPELLANT);
        });
    });
});
