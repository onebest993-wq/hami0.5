/**
 * 🧪 IMPRISONMENT ENGINE UNIT TESTS
 * اختبارات محرك أهلية الحبس
 * 
 * This file contains comprehensive unit tests for the imprisonment eligibility engine.
 * Run tests with: npm test imprisonmentEngine.test.ts
 */

import { calculateImprisonmentEligibility, getImprisonmentStatusBadge } from './imprisonmentEngine';

describe('Imprisonment Eligibility Engine', () => {
    
    // ========== TEST SUITE 1: AGE CONSTRAINTS ==========
    describe('Age Constraints (Rule 1)', () => {
        
        test('Should allow imprisonment for debtor aged 18-60', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 35,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(true);
            expect(result.blockingReasons).toHaveLength(0);
        });
        
        test('Should block imprisonment for debtor under 18 (minor)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 16,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons).toContain('❌ المدين قاصر (أقل من 18 سنة) - لا يجوز الحبس قانوناً');
        });
        
        test('Should block imprisonment for debtor over 60 (elderly)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 65,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons).toContain('❌ المدين متجاوز الـ60 عاماً - محمي من الحبس بالقانون');
        });
        
        test('Should allow imprisonment at age boundaries (18 and 60)', () => {
            const result18 = calculateImprisonmentEligibility({
                debtorAge: 18,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            const result60 = calculateImprisonmentEligibility({
                debtorAge: 60,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result18.canRequestImprisonment).toBe(true);
            expect(result60.canRequestImprisonment).toBe(true);
        });
    });
    
    // ========== TEST SUITE 2: PROFESSION CONSTRAINTS ==========
    describe('Profession Constraints (Rule 2)', () => {
        
        test('Should block imprisonment for government employee (موظف)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'موظف',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons).toContain('❌ المدين موظف حكومي - محمي من الحبس قانوناً');
        });
        
        test('Should allow imprisonment for self-employed (كاسب)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(true);
        });
    });
    
    // ========== TEST SUITE 3: KINSHIP CONSTRAINTS ==========
    describe('Kinship Constraints (Rule 3)', () => {
        
        test('Should block imprisonment for ascendant (أصل) in non-alimony case', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: 'أصل',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons).toContain('❌ المدين من الأصول (أب، أم) - لا يجوز حبسهم إلا في النفقة');
        });
        
        test('Should block imprisonment for descendant (فرع) in non-alimony case', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: 'فرع',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons).toContain('❌ المدين من الفروع (ابن، بنت) - لا يجوز حبسهم إلا في النفقة');
        });
        
        test('Should block imprisonment for spouse (زوج) in non-alimony case', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: 'زوج',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons).toContain('❌ المدين زوج/زوجة - لا يجوز الحبس إلا في النفقة');
        });
        
        test('Should allow imprisonment when no kinship exists', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(true);
        });
    });
    
    // ========== TEST SUITE 4: ALIMONY EXCEPTION (GOLDEN RULE) ==========
    describe('Alimony Exception (Rule 3 - Special Case)', () => {
        
        test('🔥 Should ALLOW imprisonment for ascendant (أصل) in ALIMONY case', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: 'أصل',
                claimType: 'نفقة',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(true);
            expect(result.blockingReasons).toHaveLength(0);
        });
        
        test('🔥 Should ALLOW imprisonment for descendant (فرع) in ALIMONY case', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: 'فرع',
                claimType: 'نفقة',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(true);
            expect(result.blockingReasons).toHaveLength(0);
        });
        
        test('🔥 Should ALLOW imprisonment for spouse (زوج) in ALIMONY case', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: 'زوج',
                claimType: 'نفقة',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(true);
            expect(result.blockingReasons).toHaveLength(0);
        });
    });
    
    // ========== TEST SUITE 5: PRIORITY CONFLICTS ==========
    describe('Priority Conflicts (Multiple Blocking Reasons)', () => {
        
        test('Age constraint should take priority over alimony exception (minor + relative + alimony)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 16,
                debtorProfession: 'كاسب',
                debtorKinship: 'أصل',
                claimType: 'نفقة',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons).toContain('❌ المدين قاصر (أقل من 18 سنة) - لا يجوز الحبس قانوناً');
        });
        
        test('Profession constraint should take priority over alimony exception (employee + relative + alimony)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'موظف',
                debtorKinship: 'زوج',
                claimType: 'نفقة',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons).toContain('❌ المدين موظف حكومي - محمي من الحبس قانوناً');
        });
        
        test('Should accumulate multiple blocking reasons', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 65,
                debtorProfession: 'موظف',
                debtorKinship: 'أصل',
                claimType: 'استحصال دين مالي',
                debtAmount: 1000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons.length).toBeGreaterThan(1);
        });
    });
    
    // ========== TEST SUITE 6: FINANCIAL CALCULATIONS ==========
    describe('Financial Calculations (Rule 4)', () => {
        
        test('Should calculate 2% execution fee correctly', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 10000000
            });
            
            expect(result.executionFee).toBe(200000); // 2% of 10,000,000
        });
        
        test('Should set remaining balance equal to debt amount', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 5000000
            });
            
            expect(result.remainingBalance).toBe(5000000);
        });
        
        test('Should handle string debt amounts with commas', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: '5,000,000'
            });
            
            expect(result.executionFee).toBe(100000);
            expect(result.remainingBalance).toBe(5000000);
        });
        
        test('Should handle zero or invalid debt amounts', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 30,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 0
            });
            
            expect(result.executionFee).toBe(0);
            expect(result.remainingBalance).toBe(0);
        });
    });
    
    // ========== TEST SUITE 7: UI HELPER FUNCTIONS ==========
    describe('UI Helper Functions', () => {
        
        test('Should return green badge for allowed imprisonment', () => {
            const badge = getImprisonmentStatusBadge(true);
            
            expect(badge.text).toBe('يمكن طلب الحبس');
            expect(badge.color).toContain('emerald');
            expect(badge.icon).toBe('🔓');
        });
        
        test('Should return red badge for blocked imprisonment', () => {
            const badge = getImprisonmentStatusBadge(false);
            
            expect(badge.text).toBe('لا يجوز طلب الحبس');
            expect(badge.color).toContain('rose');
            expect(badge.icon).toBe('🔒');
        });
    });
    
    // ========== TEST SUITE 8: REAL-WORLD SCENARIOS ==========
    describe('Real-World Scenarios', () => {
        
        test('Scenario 1: Typical debt collection case (allowed)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 35,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 5000000
            });
            
            expect(result.canRequestImprisonment).toBe(true);
            expect(result.executionFee).toBe(100000);
        });
        
        test('Scenario 2: Alimony case against spouse (allowed with exception)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 38,
                debtorProfession: 'كاسب',
                debtorKinship: 'زوج',
                claimType: 'نفقة',
                debtAmount: 2000000
            });
            
            expect(result.canRequestImprisonment).toBe(true);
            expect(result.executionFee).toBe(40000);
        });
        
        test('Scenario 3: Debt from father (blocked)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 55,
                debtorProfession: 'كاسب',
                debtorKinship: 'أصل',
                claimType: 'استحصال دين مالي',
                debtAmount: 4000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons).toHaveLength(1);
        });
        
        test('Scenario 4: Elderly debtor (blocked)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 65,
                debtorProfession: 'كاسب',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 6000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.executionFee).toBe(120000);
        });
        
        test('Scenario 5: Government employee (blocked)', () => {
            const result = calculateImprisonmentEligibility({
                debtorAge: 40,
                debtorProfession: 'موظف',
                debtorKinship: '',
                claimType: 'استحصال دين مالي',
                debtAmount: 3000000
            });
            
            expect(result.canRequestImprisonment).toBe(false);
            expect(result.blockingReasons[0]).toContain('موظف حكومي');
        });
    });
});
