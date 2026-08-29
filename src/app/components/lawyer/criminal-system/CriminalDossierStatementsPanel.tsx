import React, { type ReactNode } from 'react';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';

/**
 * غلاف لوحة تبويب الإفادات — مستخرَج حرفياً من CriminalDashboardDossierBody.
 * LazyCriminalDashboardStatementsTab يبقى مكتوباً في المضيف.
 */
export function CriminalDossierStatementsPanel({ children }: { children: ReactNode }) {
    return (
        <div
            key="criminal-tab-statements"
            data-testid={CRIMINAL_DOSSIER_TEST_IDS.statementsPanel}
            className="flex flex-col p-4 max-w-5xl mx-auto w-full gap-4 print:text-black"
        >
            {children}
        </div>
    );
}
