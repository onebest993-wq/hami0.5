import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { CRIMINAL_MODAL_Z } from './criminalModalPortal';

type CriminalDashboardPortalProps = {
    children: React.ReactNode;
    fallback?: React.ReactNode;
};

/** إضبارة جنائية كاملة — portal إلى body فوق لوحة المحامي */
export function CriminalDashboardPortal({ children, fallback = null }: CriminalDashboardPortalProps) {
    const layer = (
        <Suspense fallback={fallback}>
            <div
                className="fixed inset-0 flex flex-col overflow-hidden bg-slate-900 print:bg-white"
                style={{ zIndex: CRIMINAL_MODAL_Z.shell }}
            >
                {children}
            </div>
        </Suspense>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
