/**
 * 🔒 IMPRISONMENT ELIGIBILITY ENGINE
 * محرك حساب أهلية طلب الحبس - قانون التنفيذ العراقي
 * 
 * This engine implements Iraqi Execution Law rules for determining
 * whether a debtor can be imprisoned based on:
 * - Age constraints (Article 112)
 * - Profession (Government employees are protected)
 * - Kinship relations (Blood relatives cannot be imprisoned EXCEPT for alimony)
 * - Financial calculations (Execution fees, remaining balance)
 */

export interface ImprisonmentCalculationInput {
    debtorAge: number | string;
    debtorProfession: 'موظف' | 'كاسب';
    debtorKinship: '' | 'أصل' | 'فرع' | 'زوج';
    claimType: string;
    debtAmount: number | string;
}

export interface ImprisonmentCalculationResult {
    canRequestImprisonment: boolean;
    executionFee: number;
    remainingBalance: number;
    blockingReasons: string[]; // Array of reasons why imprisonment is blocked
}

/**
 * ✅ RULE 1: Age Constraint (المادة 112)
 * Cannot imprison debtors under 18 or over 60 years old
 */
const checkAgeConstraint = (age: number | string): { blocked: boolean; reason?: string } => {
    const ageNum = typeof age === 'string' ? parseInt(age) : age;
    
    if (isNaN(ageNum) || ageNum === 0) {
        return { blocked: false }; // No age provided, no constraint
    }
    
    if (ageNum < 18) {
        return { 
            blocked: true, 
            reason: '❌ المدين قاصر (أقل من 18 سنة) - لا يجوز الحبس قانوناً' 
        };
    }
    
    if (ageNum > 60) {
        return { 
            blocked: true, 
            reason: '❌ المدين متجاوز الـ60 عاماً - محمي من الحبس بالقانون' 
        };
    }
    
    return { blocked: false };
};

/**
 * ✅ RULE 2: Profession Constraint
 * Government employees (موظف) cannot be imprisoned
 */
const checkProfessionConstraint = (profession: 'موظف' | 'كاسب'): { blocked: boolean; reason?: string } => {
    if (profession === 'موظف') {
        return { 
            blocked: true, 
            reason: '❌ المدين موظف حكومي - محمي من الحبس قانوناً' 
        };
    }
    
    return { blocked: false };
};

/**
 * ✅ RULE 3: Kinship & Alimony Exception (المادة 264)
 * Blood relatives (أصل، فرع) and spouses (زوج/زوجة) cannot be imprisoned
 * EXCEPTION: Alimony cases (نفقة) override kinship protection
 */
const checkKinshipConstraint = (
    kinship: '' | 'أصل' | 'فرع' | 'زوج',
    claimType: string
): { blocked: boolean; reason?: string } => {
    // No kinship = no constraint
    if (!kinship) {
        return { blocked: false };
    }
    
    // Check if this is an alimony case
    const isAlimonyCase = claimType.includes('نفقة') || claimType === 'نفقة';
    
    if (isAlimonyCase) {
        // ✅ EXCEPTION: Alimony cases CAN imprison relatives
        return { 
            blocked: false 
        };
    }
    
    // For non-alimony cases, check kinship
    if (kinship === 'أصل') {
        return { 
            blocked: true, 
            reason: '❌ المدين من الأصول (أب، أم) - لا يجوز حبسهم إلا في النفقة' 
        };
    }
    
    if (kinship === 'فرع') {
        return { 
            blocked: true, 
            reason: '❌ المدين من الفروع (ابن، بنت) - لا يجوز حبسهم إلا في النفقة' 
        };
    }
    
    if (kinship === 'زوج') {
        return { 
            blocked: true, 
            reason: '❌ المدين زوج/زوجة - لا يجوز الحبس إلا في النفقة' 
        };
    }
    
    return { blocked: false };
};

/**
 * ✅ RULE 4: Financial Engine
 * Calculate execution fee (2% of debt) and remaining balance
 */
const calculateFinancials = (debtAmount: number | string): { executionFee: number; remainingBalance: number } => {
    const amount = typeof debtAmount === 'string' ? parseFloat(debtAmount.replace(/,/g, '')) : debtAmount;
    
    if (isNaN(amount) || amount <= 0) {
        return { executionFee: 0, remainingBalance: 0 };
    }
    
    const executionFee = Math.round(amount * 0.02); // 2% fee
    const remainingBalance = amount; // Initial balance equals total debt
    
    return { executionFee, remainingBalance };
};

/**
 * 🔥 MASTER FUNCTION: Calculate Imprisonment Eligibility
 * Applies all rules and returns comprehensive result
 */
export const calculateImprisonmentEligibility = (
    input: ImprisonmentCalculationInput
): ImprisonmentCalculationResult => {
    const blockingReasons: string[] = [];
    
    // Apply Rule 1: Age Constraint
    const ageCheck = checkAgeConstraint(input.debtorAge);
    if (ageCheck.blocked && ageCheck.reason) {
        blockingReasons.push(ageCheck.reason);
    }
    
    // Apply Rule 2: Profession Constraint
    const professionCheck = checkProfessionConstraint(input.debtorProfession);
    if (professionCheck.blocked && professionCheck.reason) {
        blockingReasons.push(professionCheck.reason);
    }
    
    // Apply Rule 3: Kinship Constraint (with Alimony Exception)
    const kinshipCheck = checkKinshipConstraint(input.debtorKinship, input.claimType);
    if (kinshipCheck.blocked && kinshipCheck.reason) {
        blockingReasons.push(kinshipCheck.reason);
    }
    
    // Apply Rule 4: Financial Calculations
    const financials = calculateFinancials(input.debtAmount);
    
    // Final decision
    const canRequestImprisonment = blockingReasons.length === 0;
    
    return {
        canRequestImprisonment,
        executionFee: financials.executionFee,
        remainingBalance: financials.remainingBalance,
        blockingReasons
    };
};

/**
 * 🎯 UI Helper: Get imprisonment status badge
 */
export const getImprisonmentStatusBadge = (canImprison: boolean): {
    text: string;
    color: string;
    icon: string;
} => {
    if (canImprison) {
        return {
            text: 'يمكن طلب الحبس',
            color: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50',
            icon: '🔓'
        };
    } else {
        return {
            text: 'لا يجوز طلب الحبس',
            color: 'text-rose-400 bg-rose-950/30 border-rose-900/50',
            icon: '🔒'
        };
    }
};
