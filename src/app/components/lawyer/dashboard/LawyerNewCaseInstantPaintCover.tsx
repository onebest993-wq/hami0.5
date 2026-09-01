import React from 'react';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import {
    NC_FIELD,
    NC_HEADER,
    NC_LABEL,
    NC_SECTION,
    NC_SECTION_TITLE,
} from '@/app/components/lawyer/LawyerNewCase/newCaseGlassTheme';
import { HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS, HUB_NESTED_OVERLAY_Z_CLASS } from './hubOverlayStack';

export function NewCaseInstantPaintSlots(): React.ReactElement {
    return (
        <div
            className="relative flex-1 min-h-0 overflow-hidden"
            aria-hidden
            data-testid="lawyer-new-case-instant-slots"
        >
            <div className={NC_SECTION}>
                <h4 className={NC_SECTION_TITLE}>أساسيات الدعوى</h4>
                <label className={NC_LABEL}>رقم الدعوى</label>
                <div className={`${NC_FIELD} pointer-events-none min-h-[44px]`} />
            </div>
        </div>
    );
}

/**
 * غطاء Suspense / انتظار الموديول — يطابق رأس النموذج الحقيقي (رقم الدعوى فقط).
 */
export function LawyerNewCaseInstantPaintCover({
    onClose,
    dossierNewCaseElevated = false,
}: {
    onClose: () => void;
    dossierNewCaseElevated?: boolean;
}): React.ReactElement {
    return (
        <div
            className={`fixed inset-0 ${dossierNewCaseElevated ? HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS : HUB_NESTED_OVERLAY_Z_CLASS} flex flex-col overflow-hidden bg-[#080c14] font-['Tajawal']`}
            aria-busy="true"
            aria-label="إضبارة الدعوى"
            data-testid="lawyer-new-case-overlay-paint-cover"
        >
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(230,198,115,0.07),transparent_52%)]"
                aria-hidden
            />
            <div className={NC_HEADER}>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors touch-manipulation"
                    aria-label="إغلاق"
                >
                    <HomeXIcon size={20} />
                </button>
                <h2 className="text-sm font-bold text-white/90">إضبارة الدعوى</h2>
                <div className="w-9" aria-hidden />
            </div>
            <NewCaseInstantPaintSlots />
        </div>
    );
}
