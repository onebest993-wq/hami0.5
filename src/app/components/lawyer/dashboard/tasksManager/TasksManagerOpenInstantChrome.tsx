import React from 'react';
import { createPortal } from 'react-dom';
import { getHamiOverlayPortalRoot, HAMI_OVERLAY_SAFE_INSETS_CLASS } from '@/app/utils/overlayPortal';

function getOverlayPortalRoot(): HTMLElement {
    return getHamiOverlayPortalRoot({ id: 'hami-overlay-portal', zIndex: 229 });
}

/** قشرة أجندة المهام — خارج مقطع TasksManager حتى تظهر قبل تحميل الـ chunk */
export function TasksManagerOpenInstantChrome(): React.ReactElement {
    const content = (
        <div
            className={`pointer-events-auto fixed inset-0 z-[230] w-[100vw] max-w-[100vw] h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#0A0F1C] ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`}
            data-testid="tasks-manager-open-chrome"
            data-hami-overlay-safe="1"
            role="status"
            aria-busy="true"
            aria-label="أجندة المهام"
            dir="rtl"
        >
            <div className="relative flex h-full min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#0A0F1C] font-['Tajawal','Cairo',sans-serif]">
                <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0A0F1C] px-4 py-3">
                    <div className="min-w-0 text-right">
                        <h1 className="truncate text-lg font-semibold text-[#F4F4F5]">أجندة المهام</h1>
                        <p className="mt-0.5 text-[11px] font-medium text-white/40">الأسبوع الحالي</p>
                    </div>
                </header>
                <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-5">
                    {Array.from({ length: 5 }, (_, day) => (
                        <div key={day} className="h-16 rounded-2xl bg-white/[0.04]" />
                    ))}
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, getOverlayPortalRoot());
}
