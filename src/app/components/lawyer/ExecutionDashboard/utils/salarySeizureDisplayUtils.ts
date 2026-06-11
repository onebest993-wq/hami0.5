import type { ExecutionFile } from '@/app/types/execution';
import {
    getExecutorDecisionRowById,
    readSeizureRequestTarget,
} from '@/app/utils/executorSeizureDecisionQueue';
import { getExecutionPartyDisplayName } from '@/app/utils/partyDisplayName';
import { parseSalaryIqdInput } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureLedgerSync';

export type SalarySeizureSubjectInfo = {
    roleLabel: string;
    personName: string;
};

export function formatSalaryAmountDisplay(raw: string | number | null | undefined): string {
    if (raw == null) return '';
    const text = String(raw).trim();
    if (!text) return '';
    const n = typeof raw === 'number' ? raw : parseSalaryIqdInput(text);
    if (!Number.isFinite(n) || n <= 0) return text;
    return n.toLocaleString('ar-IQ');
}

export function resolveSalarySeizureSubject(
    asset: Record<string, unknown>,
    executionData: ExecutionFile | null | undefined,
    executionId?: string
): SalarySeizureSubjectInfo {
    const det =
        typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
            ? (asset.details as Record<string, unknown>)
            : {};
    const decisionRowId = String(det.decisionRowId || '').trim();
    let target: 'debtor' | 'guarantor' = 'debtor';

    const directTarget = String(det.seizureTarget || '').trim();
    if (directTarget === 'guarantor' || directTarget === 'debtor') {
        target = directTarget;
    } else if (decisionRowId && executionId) {
        const row = getExecutorDecisionRowById(executionId, decisionRowId);
        target = readSeizureRequestTarget(row);
    } else if (/كفيل|الكفيل|الضامن/i.test(String(asset.type || ''))) {
        target = 'guarantor';
    }

    if (target === 'guarantor') {
        const gf = executionData?.guarantor_followup;
        let name = String(gf?.guarantor_name || '').trim();
        if (!name && decisionRowId && executionId) {
            const row = getExecutorDecisionRowById(executionId, decisionRowId);
            const body = String(row?.body || '');
            const match = body.match(/اسم\s*الكفيل\s*:\s*(.+)/i);
            if (match?.[1]) name = match[1].trim();
        }
        return { roleLabel: 'الكفيل الضامن', personName: name || '—' };
    }

    const debtor = executionData?.debtors?.[0];
    const { text } = getExecutionPartyDisplayName(debtor, 'debtor', 0, executionData ?? null);
    return { roleLabel: 'المدين', personName: text };
}

export function buildSalarySeizureDescriptionLines(input: {
    employerName?: string;
    salaryAmount?: string;
    monthlyDeductionIqd?: number;
    activeDebtorIsDeceased?: boolean;
    subject?: SalarySeizureSubjectInfo;
}): string[] {
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
            `${input.activeDebtorIsDeceased ? 'جهة صرف الحوافز/المخصصات' : 'جهة العمل'}: ${office}`
        );
    }
    const salary = String(input.salaryAmount || '').trim();
    if (salary) {
        lines.push(`مقدار الراتب: ${formatSalaryAmountDisplay(salary)} د.ع`);
    }
    if (input.monthlyDeductionIqd && input.monthlyDeductionIqd > 0) {
        lines.push(
            `مقدار الاستقطاع الشهري: ${input.monthlyDeductionIqd.toLocaleString('ar-IQ')} د.ع`
        );
    }
    return lines;
}

export function buildSalarySeizureDescriptionText(
    input: Parameters<typeof buildSalarySeizureDescriptionLines>[0]
): string {
    return buildSalarySeizureDescriptionLines(input).join('\n');
}
