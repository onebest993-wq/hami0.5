
// --- IRAQI INHERITANCE ENGINE (THE BRAIN) ---
// This engine implements the "Software Design Document" requirements for Iraqi Law.
// It handles: Triage, Shar'i (Sunni/Ja'fari), Nidhami (Civil), Obligatory Bequest (Art 74), and Judicial Math.

export type Sect = 'sunni' | 'jafari';
export type AssetType = 'movable' | 'statutory' | 'mixed'; // mixed = movable logic + statutory logic

export interface HeirInput {
    type: string; // 'wife', 'husband', 'son', 'daughter', 'father', 'mother', 'son_son', 'son_daughter', etc.
    count: number;
    isAlive: boolean; // For parents mainly
}

export interface ShareResult {
    heirName: string;
    fraction: string; // "1/8"
    stocks: number;   // 3
    percentage: number; // 12.5
    note?: string; // AI Insight
}

export interface CalculationResult {
    base: number; // Asl al-Mas'ala
    finalBase: number; // After Tas'heeh or Awal
    shares: ShareResult[];
    messages: string[]; // AI Insights regarding exclusions, Article 74, etc.
    category: string; // "Qassam Shar'i" or "Qassam Nidhami"
}

// --- MATH UTILS ---
const gcd = (a: number, b: number): number => (!b ? a : gcd(b, a % b));
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

class Fraction {
    constructor(public n: number, public d: number) {}
    
    add(other: Fraction): Fraction {
        const common = lcm(this.d, other.d);
        const n1 = this.n * (common / this.d);
        const n2 = other.n * (common / other.d);
        return new Fraction(n1 + n2, common);
    }

    sub(other: Fraction): Fraction {
        const common = lcm(this.d, other.d);
        const n1 = this.n * (common / this.d);
        const n2 = other.n * (common / other.d);
        return new Fraction(n1 - n2, common);
    }

    simplify(): Fraction {
        const common = gcd(this.n, this.d);
        return new Fraction(this.n / common, this.d / common);
    }
}

// --- UNIT 4: OBLIGATORY BEQUEST (Article 74) ---
const calculateArticle74 = (heirs: HeirInput[], totalEstate: number = 24): { deduction: number, shares: ShareResult[], notes: string[] } => {
    // Logic: Calculate what the deceased son/daughter would have inherited.
    // Cap at 1/3.
    // This is a simplified implementation for the "Software Design" proof of concept.
    // In a real production engine, this requires a recursive simulation of the parent's estate.
    
    // Check for grandchildren with deceased parents
    const grandSons = heirs.find(h => h.type === 'son_son')?.count || 0;
    const grandDaughters = heirs.find(h => h.type === 'son_daughter')?.count || 0;

    if (grandSons === 0 && grandDaughters === 0) return { deduction: 0, shares: [], notes: [] };

    // Placeholder Logic for Art 74 (Assuming 1 deceased son for simulation)
    // In real engine: We need to know how many sons/daughters exist to calc the "Virtual Share"
    const virtualShare = 1/3; // Simplified for demo. Usually calculated dynamically.
    const cappedShare = Math.min(virtualShare, 1/3);
    
    // In a sophisticated engine, we return the specific stocks deducted from the top.
    return {
        deduction: cappedShare,
        shares: [
            { heirName: 'أحفاد (وصية واجبة م74)', fraction: '1/3', stocks: 0, percentage: 33.3, note: 'استخراج الوصية الواجبة قبل القسمة (سقف الثلث)' }
        ],
        notes: ['تم تطبيق المادة 74 (الوصية الواجبة) للأحفاد من الابن/البنت المتوفى.']
    };
};

// --- UNIT 2: SHAR'I ENGINE ---
const calculateShari = (sect: Sect, heirs: HeirInput[]): CalculationResult => {
    let base = 24; // Standard base (LCM of 8, 6, 4, 3, 2)
    let shares: ShareResult[] = [];
    let messages: string[] = [];

    const wife = heirs.find(h => h.type === 'wife')?.count || 0;
    const husband = heirs.find(h => h.type === 'husband')?.count || 0;
    const sons = heirs.find(h => h.type === 'son')?.count || 0;
    const daughters = heirs.find(h => h.type === 'daughter')?.count || 0;
    const father = heirs.find(h => h.type === 'father')?.isAlive;
    const mother = heirs.find(h => h.type === 'mother')?.isAlive;

    const hasBranch = sons > 0 || daughters > 0; // Far' Warith

    // 1. Spouses
    if (wife > 0) {
        const share = hasBranch ? new Fraction(1, 8) : new Fraction(1, 4);
        const stocks = (share.n / share.d) * base;
        shares.push({ heirName: 'زوجة', fraction: hasBranch ? '1/8' : '1/4', stocks, percentage: (stocks/base)*100, note: hasBranch ? 'وجود فرع وارث' : 'عدم وجود فرع وارث' });
    }
    if (husband > 0) {
        const share = hasBranch ? new Fraction(1, 4) : new Fraction(1, 2);
        const stocks = (share.n / share.d) * base;
        shares.push({ heirName: 'زوج', fraction: hasBranch ? '1/4' : '1/2', stocks, percentage: (stocks/base)*100, note: hasBranch ? 'وجود فرع وارث' : 'عدم وجود فرع وارث' });
    }

    // 2. Parents
    if (father) {
        // Simple logic: 1/6 if branch, else Tasib (Sunni) or Combined (Jafari)
        const share = hasBranch ? new Fraction(1, 6) : new Fraction(0, 0); // Placeholder for complex logic
        if (hasBranch) {
             const stocks = (share.n / share.d) * base;
             shares.push({ heirName: 'أب', fraction: '1/6', stocks, percentage: (stocks/base)*100 });
        } else {
             // Father takes remainder in many cases, logic simplified for display
             shares.push({ heirName: 'أب', fraction: 'الباقي', stocks: 0, percentage: 0, note: 'يرث بالتعصيب (الباقي)' });
        }
    }
    if (mother) {
        // 1/6 if branch or multiple siblings, else 1/3
        const share = hasBranch ? new Fraction(1, 6) : new Fraction(1, 3);
        const stocks = (share.n / share.d) * base;
        shares.push({ heirName: 'أم', fraction: hasBranch ? '1/6' : '1/3', stocks, percentage: (stocks/base)*100 });
    }

    // 3. Children (Residue / Asabah)
    const assignedStocks = shares.reduce((acc, s) => acc + s.stocks, 0);
    let remainder = base - assignedStocks;

    if (sons > 0 || daughters > 0) {
        if (sect === 'sunni') {
            // Male = 2 * Female
            const totalShares = (sons * 2) + daughters;
            
            // UNIT 5: CORRECTION (Tas'heeh)
            // If remainder doesn't divide by totalShares, we multiply the base
            // Simplified here: Just showing the ratio logic
            const unitShare = remainder / totalShares;
            
            if (sons > 0) shares.push({ heirName: 'أبناء (عصبة)', fraction: 'لذكر مثل حظ الأنثيين', stocks: unitShare * 2 * sons, percentage: 0 });
            if (daughters > 0) shares.push({ heirName: 'بنات', fraction: 'لذكر مثل حظ الأنثيين', stocks: unitShare * daughters, percentage: 0 });
        
        } else {
            // Ja'fari (Often similar for children, but no Ta'sib for siblings)
            messages.push('فقه جعفري: الطبقة الأولى تحجب الطبقات اللاحقة (الإخوة/الأجداد) تماماً.');
             const totalShares = (sons * 2) + daughters;
             const unitShare = remainder / totalShares;
             if (sons > 0) shares.push({ heirName: 'أبناء', fraction: 'للذكر مثل حظ الأنثيين', stocks: unitShare * 2 * sons, percentage: 0 });
             if (daughters > 0) shares.push({ heirName: 'بنات', fraction: 'للذكر مثل حظ الأنثيين', stocks: unitShare * daughters, percentage: 0 });
        }
    }

    return {
        base,
        finalBase: base, // Should be updated by Unit 5 logic
        shares,
        messages,
        category: `قسام شرعي (${sect === 'sunni' ? 'سني' : 'جعفري'})`
    };
};

// --- UNIT 3: NIDHAMI ENGINE (Statutory) ---
const calculateNidhami = (heirs: HeirInput[]): CalculationResult => {
    let base = 2400; // Common base for Statutory to allow fine division
    let shares: ShareResult[] = [];
    let messages: string[] = ['توزيع قانوني (أراضي أميرية) - المادة 118 وما بعدها'];

    const wife = heirs.find(h => h.type === 'wife')?.count || 0;
    const husband = heirs.find(h => h.type === 'husband')?.count || 0;
    const sons = heirs.find(h => h.type === 'son')?.count || 0;
    const daughters = heirs.find(h => h.type === 'daughter')?.count || 0;

    const hasBranch = sons > 0 || daughters > 0;

    // Statutory Spouse Rule: 1/4 if branch, 1/2 if parents, All if alone
    let spouseShare = 0;
    if (wife > 0 || husband > 0) {
        if (hasBranch) spouseShare = 0.25; // 1/4
        else spouseShare = 0.5; // 1/2 (assuming parents exist, simplified)
        
        const stocks = base * spouseShare;
        shares.push({ 
            heirName: wife > 0 ? 'زوجة' : 'زوج', 
            fraction: hasBranch ? '1/4' : '1/2', 
            stocks, 
            percentage: spouseShare * 100,
            note: 'انتقال حق التصرف (مساواة في القانون)' 
        });
    }

    // Statutory Children Rule: EQUALITY (Male = Female)
    const remainder = base * (1 - spouseShare);
    const totalKids = sons + daughters;
    
    if (totalKids > 0) {
        const sharePerKid = remainder / totalKids;
        if (sons > 0) {
            shares.push({ 
                heirName: 'أبناء', 
                fraction: 'بالتساوي', 
                stocks: sharePerKid * sons, 
                percentage: (sharePerKid * sons / base) * 100,
                note: 'للذكر مثل حظ الأنثى (قانوناً)'
            });
        }
        if (daughters > 0) {
            shares.push({ 
                heirName: 'بنات', 
                fraction: 'بالتساوي', 
                stocks: sharePerKid * daughters, 
                percentage: (sharePerKid * daughters / base) * 100,
                note: 'للذكر مثل حظ الأنثى (قانوناً)'
            });
        }
    }

    return {
        base,
        finalBase: base,
        shares,
        messages,
        category: 'قسام نظامي (قانون مدني)'
    };
};

// --- MAIN PUBLIC INTERFACE ---
export const IraqiInheritanceCalculator = {
    calculate: (assetType: AssetType, sect: Sect, heirs: HeirInput[]): CalculationResult => {
        // Triage Logic
        if (assetType === 'statutory') {
            return calculateNidhami(heirs);
        } else if (assetType === 'mixed') {
            // Note: For mixed, we usually run both. 
            // In this specific return signature, we will return the Shar'i one but append a specific message.
            const result = calculateShari(sect, heirs);
            result.messages.push('⚠️ تنبيه: هذه تركة مختلطة (بستان). تم حساب المشيدات والأشجار شرعاً. يجب إصدار قسام نظامي مستقل للأرض (حق التصرف).');
            return result;
        } else {
            // Movable / Freehold
            const result = calculateShari(sect, heirs);
            
            // Check Art 74 Logic
            const art74 = calculateArticle74(heirs);
            if (art74.deduction > 0) {
                result.shares.unshift(...art74.shares);
                result.messages.push(...art74.notes);
            }
            return result;
        }
    }
};
