import type { AlimonyAnalysisFinding, AlimonyCreationContextInput } from './alimonyCreationAnalysisTypes';

export function collectAlimonyCoherenceFindings(
    input: AlimonyCreationContextInput,
): AlimonyAnalysisFinding[] {
    const findings: AlimonyAnalysisFinding[] = [];
    const wifeAmt = parseFloat(input.alimonyWifeMonthly) || 0;
    const childrenAmt = parseFloat(input.alimonyChildrenMonthly) || 0;
    const childrenCount = parseInt(input.alimonyChildrenCount, 10) || 0;

    if (input.alimonyBeneficiary === 'زوجة فقط' && childrenAmt > 0) {
        findings.push({
            id: 'coherence:wife-only-children-amount',
            category: 'cross_field',
            severity: 'warning',
            observation: 'المستفيد «زوجة فقط» لكن نفقة الأولاد مُدخلة — تناقض في بنية المطالبة.',
            evidence: [`نفقة الأولاد: ${childrenAmt.toLocaleString('ar-IQ')} د.ع`],
        });
    }
    if (input.alimonyBeneficiary === 'أولاد فقط' && wifeAmt > 0) {
        findings.push({
            id: 'coherence:children-only-wife-amount',
            category: 'cross_field',
            severity: 'warning',
            observation: 'المستفيد «أولاد فقط» لكن نفقة الزوجة مُدخلة — تناقض في بنية المطالبة.',
            evidence: [`نفقة الزوجة: ${wifeAmt.toLocaleString('ar-IQ')} د.ع`],
        });
    }
    if (
        (input.alimonyBeneficiary === 'أولاد فقط' || input.alimonyBeneficiary === 'زوجة وأولاد') &&
        childrenCount < 1
    ) {
        findings.push({
            id: 'coherence:children-count-missing',
            category: 'amount',
            severity: 'warning',
            observation: 'عدد الأولاد غير محدد رغم تضمينهم ضمن المستفيدين.',
            evidence: [],
        });
    }

    return findings;
}
