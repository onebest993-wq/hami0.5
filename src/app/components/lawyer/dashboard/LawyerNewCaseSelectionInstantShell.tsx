import React from 'react';
import { X } from 'lucide-react';
import { JURISDICTIONS } from '@/app/components/lawyer/LawyerNewCase/constants';
import { JurisdictionGlassPanel } from '@/app/components/lawyer/LawyerNewCase/components/JurisdictionGlassPanel';
import { HUB_NESTED_OVERLAY_Z_CLASS } from './hubOverlayStack';
import { NC_HEADER } from '@/app/components/lawyer/LawyerNewCase/newCaseGlassTheme';

const noop = () => undefined;

/** غلاف فوري لخطوة «اختصاص الدعوى» أثناء تحميل chunk LawyerNewCase */
export function LawyerNewCaseSelectionInstantShell({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement {
    return (
        <div
            className={`fixed inset-0 ${HUB_NESTED_OVERLAY_Z_CLASS} flex flex-col overflow-hidden bg-[#080c14] font-['Tajawal']`}
            aria-busy="true"
            data-testid="lawyer-new-case-instant-shell"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(230,198,115,0.07),transparent_52%)]" aria-hidden />
            <div className={NC_HEADER}>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors touch-manipulation"
                    aria-label="إغلاق"
                >
                    <X size={20} />
                </button>
                <h2 className="text-sm font-bold text-white/90">اختر التصنيف القضائي</h2>
                <div className="w-9" aria-hidden />
            </div>
            <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-5 pt-4 pb-14 max-w-md mx-auto w-full">
                <h2 className="mb-7 text-right text-lg font-bold text-white/88">اختصاص الدعوى</h2>
                <div className="pointer-events-none opacity-95" aria-hidden>
                    <JurisdictionGlassPanel items={JURISDICTIONS} onSelect={noop} />
                </div>
            </div>
        </div>
    );
}
