import type { FinalizeCoerciveSeizureInput } from './executionDashboardCoerciveFinalizeTypes';

const loadFinalizeSalary = () => import('./executionDashboardCoerciveFinalizeSalary');
const loadFinalizeProperty = () => import('./executionDashboardCoerciveFinalizeProperty');
const loadFinalizeMovable = () => import('./executionDashboardCoerciveFinalizeMovable');

export function finalizeCoerciveSeizureDetails(input: FinalizeCoerciveSeizureInput): void {
    const runtime =
        input.actionType === 'salary'
            ? loadFinalizeSalary().then((m) => m.finalizeCoerciveSalarySeizure)
            : input.actionType === 'property'
              ? loadFinalizeProperty().then((m) => m.finalizeCoercivePropertySeizure)
              : loadFinalizeMovable().then((m) => m.finalizeCoerciveMovableSeizure);

    void runtime
        .then((finalize) => finalize(input))
        .catch(() => {
            input.showToast('تعذر تحميل مسار تثبيت الحجز حالياً.', 'error');
        });
}
