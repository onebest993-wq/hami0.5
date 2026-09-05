import { SmartDialog } from '@/app/components/ui/SmartDialog';

export async function openSalarySeizureRequestFlow(input: {
    seizureActionsDisabled: boolean;
    hasActiveSalarySeizure: boolean;
    salaryRowForUi: { id?: string } | null;
    openDecisions: (id: string) => void;
    resolvedExecutionId: string;
    decisions: unknown[];
    coerciveUiLocked: boolean;
    setInlineActionGateKey: (key: string) => void;
}): Promise<void> {
    if (input.seizureActionsDisabled) return;
    if (input.hasActiveSalarySeizure) {
        const open = await SmartDialog.confirm('تم حجز الراتب فعلاً. هل تريد فتح الطلب؟', {
            title: 'حجز الراتب',
            confirmText: 'فتح الطلب',
            cancelText: 'إلغاء',
        });
        if (!open) return;
        const did = String(input.salaryRowForUi?.id || '').trim();
        if (did) {
            input.openDecisions(did);
        }
        return;
    }
    const did = String(input.salaryRowForUi?.id || '').trim();
    if (did) {
        input.openDecisions(did);
        return;
    }
    if (input.coerciveUiLocked) return;
    input.setInlineActionGateKey('seizure_salary');
}
