import React from 'react';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { JURISDICTIONS, type JurisdictionId } from '@/app/components/lawyer/LawyerNewCase/wordLists';
import { JurisdictionGlassPanel } from '@/app/components/lawyer/LawyerNewCase/components/JurisdictionGlassPanel';
import { HUB_NESTED_OVERLAY_Z_CLASS, HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS } from './hubOverlayStack';
import { NC_HEADER } from '@/app/components/lawyer/LawyerNewCase/newCaseGlassTheme';

const noop = () => undefined;

/** غلاف فوري أثناء تحميل chunk LawyerNewCase — أو اختيار اختصاص عند المسارات القديمة */
export function LawyerNewCaseSelectionInstantShell({
    onClose,
    mode = 'picker',
    onSelectJurisdiction,
    onJurisdictionPointerEnter,
    dossierNewCaseElevated = false,
}: {
    onClose: () => void;
    mode?: 'loading' | 'picker';
    onSelectJurisdiction?: (id: JurisdictionId) => void;
    onJurisdictionPointerEnter?: (id: JurisdictionId) => void;
    dossierNewCaseElevated?: boolean;
}): React.ReactElement {
    const isLoading = mode === 'loading';

    return (
        <div
            className={`fixed inset-0 ${dossierNewCaseElevated ? HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS : HUB_NESTED_OVERLAY_Z_CLASS} flex flex-col overflow-hidden bg-[#080c14] font-['Tajawal']`}
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
                    <HomeXIcon size={20} />
                </button>
                <h2 className="text-sm font-bold text-white/90">
                    {isLoading ? 'إضبارة جديدة' : 'اختر التصنيف القضائي'}
                </h2>
                <div className="w-9" aria-hidden />
            </div>

            {isLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-16">
                    <div
                        className="h-9 w-9 rounded-full border-2 border-[#E6C673]/25 border-t-[#E6C673] animate-spin"
                        aria-hidden
                    />
                    <p className="text-sm font-bold text-[#E6C673]/85 animate-pulse">جاري تحميل النموذج...</p>
                </div>
            ) : (
                <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-5 pt-4 pb-14 max-w-md mx-auto w-full">
                    <h2 className="mb-7 text-right text-lg font-bold text-white/88">اختصاص الدعوى</h2>
                    <JurisdictionGlassPanel
                        items={JURISDICTIONS}
                        onSelect={onSelectJurisdiction ?? noop}
                        onItemPointerEnter={onJurisdictionPointerEnter}
                    />
                </div>
            )}
        </div>
    );
}
