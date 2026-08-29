import React from 'react';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { HUB_DOSSIER_Z_CLASS } from '@/app/components/lawyer/shared/hubZLayers';
import { HAMI_OVERLAY_SAFE_INSETS_CLASS, HAMI_SHELL_OVERLAY_COLUMN_CLASS } from '@/app/utils/overlayPortal';
import { resolveLawsuitJurisdiction } from '@/app/domain/lawsuit/lawsuitJurisdiction';

/**
 * غلاف فوري لإضبارة الدعوى — رأس الكروم فقط حتى يكتمل chunk الإضبارة.
 * بلا عنوان فرعي مقصوص وبلا صناديق هيكل فارغة.
 */
export function SmartFileModalBootChrome({
    file,
    onClose,
}: {
    file: FileData;
    onClose: () => void;
}) {
    const isPersonal = resolveLawsuitJurisdiction(file) === 'personal';
    const chromeTitle = isPersonal ? 'إضبارة الأحوال الشخصية' : 'إضبارة الدعوى';
    const surfaceClass = isPersonal ? 'bg-[#0B1021]' : 'bg-[#0F121E]';

    return (
        <div
            className={`fixed inset-0 ${HUB_DOSSIER_Z_CLASS} flex ${surfaceClass} font-['Tajawal'] overflow-hidden ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`}
            dir="rtl"
            data-testid="smart-file-modal-boot-chrome"
            data-dossier-variant={isPersonal ? 'personal' : 'civil'}
            aria-busy="true"
            aria-label={chromeTitle}
        >
            <div className={HAMI_SHELL_OVERLAY_COLUMN_CLASS}>
                <div className="shrink-0 flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="smart-file-modal-boot-close"
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-hami-navy/45 text-slate-400 touch-manipulation"
                        aria-label="إغلاق"
                    >
                        <HomeXIcon size={17} strokeWidth={2} />
                    </button>
                    <div className="flex min-w-0 flex-1 justify-center">
                        <span className="truncate text-lg font-semibold tracking-tight text-[#E6C673]">
                            {chromeTitle}
                        </span>
                    </div>
                    <span className="inline-flex h-11 w-11 shrink-0" aria-hidden />
                </div>
            </div>
        </div>
    );
}
