export type SeizureWorkflowStepBackContext = {
    activeIdx: number;
    inlineFocusKey: string | null;
    step2Lane: 'auction' | 'objection' | null;
    hasPendingOnActiveStep: boolean;
    hasOptimisticPending: boolean;
    dismissedApprovedInlineForStep: number | null;
    expertApprovedUnsaved: boolean;
    expertCommitteeApprovedUnsaved: boolean;
    auctionApprovedUnsaved: boolean;
    reauctionApprovedUnsaved: boolean;
};

/** هل الخطوة الحالية تعرض حاوية متداخلة (مسار، قرار معلّق، أو نموذج بعد الموافقة)؟ */
export function isSeizureWorkflowNestedView(ctx: SeizureWorkflowStepBackContext): boolean {
    if (String(ctx.inlineFocusKey || '').trim()) return true;
    if (ctx.activeIdx === 2 && ctx.step2Lane) return true;
    if (ctx.hasPendingOnActiveStep || ctx.hasOptimisticPending) return true;
    if (ctx.dismissedApprovedInlineForStep === ctx.activeIdx) return false;

    switch (ctx.activeIdx) {
        case 1:
            return ctx.expertApprovedUnsaved;
        case 2:
            return ctx.auctionApprovedUnsaved;
        case 3:
            return ctx.expertCommitteeApprovedUnsaved;
        case 6:
            return ctx.auctionApprovedUnsaved;
        case 7:
            return ctx.reauctionApprovedUnsaved;
        default:
            return false;
    }
}

export function seizureWorkflowStepBackLabel(ctx: SeizureWorkflowStepBackContext): string {
    if (ctx.hasPendingOnActiveStep || ctx.hasOptimisticPending) {
        return 'سحب الطلب المعلّق';
    }
    if (ctx.activeIdx === 2 && ctx.step2Lane) {
        return 'رجوع لاختيار المسار';
    }
    if (isSeizureWorkflowNestedView(ctx)) {
        return 'رجوع';
    }
    return 'تراجع عن هذه الخطوة';
}

/** سهم واحد على الخطوة النشطة — عند وجود حاوية متداخلة أو خطوة سابقة */
export function shouldShowSeizureWorkflowStepBack(ctx: SeizureWorkflowStepBackContext): boolean {
    return isSeizureWorkflowNestedView(ctx) || ctx.activeIdx > 0;
}
