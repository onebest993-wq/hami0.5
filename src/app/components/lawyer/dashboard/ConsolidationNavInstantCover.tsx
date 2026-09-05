import type { ReactElement } from 'react';
import { HUB_DOSSIER_CHROME_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';

/** هيكل شريط التوحيد — نفس إطار الشريط الحي بلا أيقونة وبلا نص. */
export function ConsolidationNavInstantCover(): ReactElement {
    return (
        <div
            className={`fixed top-0 left-0 right-0 ${HUB_DOSSIER_CHROME_Z_CLASS} px-3 hami-overlay-header-safe-pad pb-2 bg-[#0A0F1C]/95 border-b border-[#E6C673]/15`}
            dir="rtl"
            aria-busy="true"
            aria-label="ربط الدعاوى"
            data-testid="consolidation-nav-instant-cover"
        >
            <div className="flex items-center gap-2 max-w-lg mx-auto">
                <div
                    className="flex-1 min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.03]"
                    aria-hidden
                />
                <div
                    className="flex-1 min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.03]"
                    aria-hidden
                />
            </div>
        </div>
    );
}
