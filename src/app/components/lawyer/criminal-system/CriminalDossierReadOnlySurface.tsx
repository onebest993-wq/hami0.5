import React, { type ReactNode } from 'react';

/**
 * غلاف قراءة-فقط لشبكة الأطراف والتبويبات — مستخرَج حرفياً من CriminalDashboardDossierBody.
 */
export function CriminalDossierReadOnlySurface({
    isDashboardReadOnly,
    children,
}: {
    isDashboardReadOnly: boolean;
    children: ReactNode;
}) {
    return (
        <div
            className={
                isDashboardReadOnly
                    ? 'select-none opacity-55 print:opacity-100'
                    : ''
            }
        >
            {children}
        </div>
    );
}
