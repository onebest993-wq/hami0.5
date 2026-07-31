import type { ExecutionFile } from '@/app/types/execution';

export type SalarySeizureSubjectInfoLite = {
    roleLabel: string;
    personName: string;
};

type ExecutionFileWithDebtorName = ExecutionFile & {
    debtorName?: string;
};

function readSalarySeizureTargetFromAssetLite(details: Record<string, unknown>): 'debtor' | 'guarantor' {
    const direct = String(details.seizureTarget || '').trim();
    if (direct === 'guarantor' || direct === 'debtor') return direct;
    const role = String(details.subjectRole || '').trim();
    if (/كفيل|ضامن/i.test(role)) return 'guarantor';
    return 'debtor';
}

function resolvePrimaryDebtorName(executionData: ExecutionFile | null | undefined): string {
    const debtor = executionData?.debtors?.[0] as unknown as Record<string, unknown> | undefined;
    const executionRecord = executionData as ExecutionFileWithDebtorName | null | undefined;
    const candidates = [
        debtor?.fullName,
        debtor?.name,
        debtor?.legalName,
        debtor?.legal_name,
        debtor?.displayName,
        executionRecord?.debtorName,
    ];
    for (const candidate of candidates) {
        const text = String(candidate || '').trim();
        if (text) return text;
    }
    return '—';
}

export function resolveSalarySeizureSubjectLite(
    asset: Record<string, unknown>,
    executionData: ExecutionFile | null | undefined,
    _executionId?: string,
): SalarySeizureSubjectInfoLite {
    const det =
        typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
            ? (asset.details as Record<string, unknown>)
            : {};
    const explicitRole = String(det.subjectRole || '').trim();
    const explicitName = String(det.subjectName || '').trim();
    if (explicitRole) {
        return { roleLabel: explicitRole, personName: explicitName || '—' };
    }

    const target =
        readSalarySeizureTargetFromAssetLite(det) ||
        (/كفيل|الكفيل|الضامن/i.test(String(asset.type || '')) ? 'guarantor' : 'debtor');

    if (target === 'guarantor') {
        const gf = executionData?.guarantor_followup as Record<string, unknown> | undefined;
        const name = explicitName || String(gf?.guarantor_name || '').trim();
        return { roleLabel: 'الكفيل الضامن', personName: name || '—' };
    }

    return { roleLabel: 'المدين', personName: resolvePrimaryDebtorName(executionData) };
}

export function buildSalarySeizureDescriptionTextLite(input: {
    employerName?: string;
    salaryAmount?: string;
    monthlyDeductionIqd?: number;
    activeDebtorIsDeceased?: boolean;
    subject?: SalarySeizureSubjectInfoLite;
}): string {
    const lines: string[] = [];
    if (input.subject) {
        lines.push(`محل الحجز: ${input.subject.roleLabel}`);
        if (input.subject.personName && input.subject.personName !== '—') {
            lines.push(`الاسم: ${input.subject.personName}`);
        }
    }
    const office = String(input.employerName || '').trim();
    if (office) {
        lines.push(
            `${input.activeDebtorIsDeceased ? 'جهة صرف الحوافز/المخصصات' : 'جهة العمل'}: ${office}`,
        );
    }
    const salary = String(input.salaryAmount || '').trim();
    if (salary) {
        const n = Number(salary.replace(/,/g, '').trim());
        const displaySalary =
            Number.isFinite(n) && n > 0 ? n.toLocaleString('ar-IQ') : salary;
        lines.push(`مقدار الراتب: ${displaySalary} د.ع`);
    }
    if (input.monthlyDeductionIqd && input.monthlyDeductionIqd > 0) {
        lines.push(`مقدار الاستقطاع الشهري: ${input.monthlyDeductionIqd.toLocaleString('ar-IQ')} د.ع`);
    }
    return lines.join('\n');
}
