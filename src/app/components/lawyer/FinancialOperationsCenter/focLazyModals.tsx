/**
 * مودالات FOC الثقيلة — lazy عند الفتح فقط (لا تغيير بصري عند الإغلاق).
 */
import React, { lazy, Suspense } from 'react';

const LazyFocDisburseModal = lazy(() =>
    import('./components/FocDisburseModal').then((m) => ({ default: m.FocDisburseModal })),
);
const LazyFocGhuramaaModal = lazy(() =>
    import('./components/FocGhuramaaModal').then((m) => ({ default: m.FocGhuramaaModal })),
);
const LazyDebtTotalsEditModal = lazy(() =>
    import('./components/DebtTotalsEditModal').then((m) => ({ default: m.DebtTotalsEditModal })),
);
const LazyFocFeesSheet = lazy(() =>
    import('./components/FocFeesSheet').then((m) => ({ default: m.FocFeesSheet })),
);
const LazyFocExpenseSheet = lazy(() =>
    import('./components/FocExpenseSheet').then((m) => ({ default: m.FocExpenseSheet })),
);
const LazyFocGarnishModal = lazy(() =>
    import('./components/FocGarnishModal').then((m) => ({ default: m.FocGarnishModal })),
);
const LazyGuarantorRegistrationModal = lazy(() =>
    import('../Modal_Guarantor_Registration').then((m) => ({ default: m.GuarantorRegistrationModal })),
);
const LazyAlimonyFinancialBlock = lazy(() =>
    import('../AlimonyFinancialBlock').then((m) => ({ default: m.AlimonyFinancialBlock })),
);

function FocLazyMount({ when, children }: { when: boolean; children: React.ReactNode }) {
    if (!when) return null;
    return <Suspense fallback={null}>{children}</Suspense>;
}

export {
    LazyFocDisburseModal,
    LazyFocGhuramaaModal,
    LazyDebtTotalsEditModal,
    LazyFocFeesSheet,
    LazyFocExpenseSheet,
    LazyFocGarnishModal,
    LazyGuarantorRegistrationModal,
    LazyAlimonyFinancialBlock,
    FocLazyMount,
};
