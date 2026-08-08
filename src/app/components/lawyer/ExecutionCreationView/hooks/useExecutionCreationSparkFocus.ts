import { useCallback } from 'react';

export type ExecutionCreationSparkActionId =
    | 'focus_directorate'
    | 'focus_debtor_address'
    | 'focus_creditors'
    | 'focus_claim_amount'
    | 'focus_alimony'
    | 'focus_judgment'
    | 'focus_past_alimony'
    | 'apply_alimony_execution_today'
    | 'apply_alimony_sync_execution'
    | 'focus_coherence_timeline'
    | 'focus_coherence_fields';

export type ExecutionCreationSparkFocusHandlers = {
    onLawsuitDateChange?: (v: string) => void;
    onExecutionDateChange?: (v: string) => void;
    getTodayYmd?: () => string;
    getLawsuitDate?: () => string;
};

function scrollToSparkFocus(target: string): void {
    if (typeof document === 'undefined') return;
    const el =
        document.querySelector(`[data-spark-focus="${target}"]`) ??
        document.querySelector(`[data-spark-focus="${target}"] input`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el instanceof HTMLElement) {
        const input = el.matches('input,textarea,select,button')
            ? el
            : el.querySelector<HTMLElement>('input,textarea,select,button');
        window.setTimeout(() => input?.focus({ preventScroll: true }), 280);
    }
}

/** تنفيذ إجراءات سبارك في نموذج إنشاء التنفيذ — تركيز وتصحيح ذكي */
export function useExecutionCreationSparkFocus(handlers: ExecutionCreationSparkFocusHandlers = {}) {
    const runAction = useCallback(
        (actionId: string) => {
            switch (actionId as ExecutionCreationSparkActionId) {
                case 'focus_directorate':
                    scrollToSparkFocus('directorate');
                    break;
                case 'focus_debtor_address':
                    scrollToSparkFocus('debtor-address');
                    break;
                case 'focus_creditors':
                    scrollToSparkFocus('creditors');
                    break;
                case 'focus_claim_amount':
                    scrollToSparkFocus('claim-amount');
                    break;
                case 'focus_alimony':
                    scrollToSparkFocus('alimony');
                    break;
                case 'focus_judgment':
                    scrollToSparkFocus('judgment');
                    break;
                case 'focus_past_alimony':
                    scrollToSparkFocus('past-alimony');
                    break;
                case 'apply_alimony_execution_today': {
                    const today = handlers.getTodayYmd?.() ?? '';
                    const lawsuit = handlers.getLawsuitDate?.() ?? '';
                    const corrected =
                        lawsuit && lawsuit > today ? lawsuit : today || lawsuit;
                    if (corrected) handlers.onExecutionDateChange?.(corrected);
                    scrollToSparkFocus('alimony');
                    break;
                }
                case 'focus_coherence_timeline':
                case 'focus_coherence_fields':
                case 'apply_alimony_sync_execution':
                    scrollToSparkFocus('alimony');
                    break;
                default:
                    break;
            }
        },
        [handlers],
    );

    return { runAction, scrollToSparkFocus };
}
