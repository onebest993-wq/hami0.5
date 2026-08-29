import React from 'react';
import { EXECUTION_DOSSIER_TEST_IDS } from '@/app/components/lawyer/ExecutionDashboard/executionDossierTestIds';
import { HAMI_OVERLAY_SAFE_INSETS_CLASS } from '@/app/utils/overlayPortal';

/** إطار ملء الشاشة — خلفية Navy صلبة خفيفة (بلا blur ثقيل). z فوق مخزن التنفيذ (220). */
export function ExecutionDashboardRootFrame({ children }: { children: React.ReactNode }) {
    return (
        <div
            className={`fixed inset-0 bg-[#05060D] z-[230] flex items-center justify-center p-0 ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`}
            dir="rtl"
            data-testid={EXECUTION_DOSSIER_TEST_IDS.dossier}
        >
            {children}
        </div>
    );
}
