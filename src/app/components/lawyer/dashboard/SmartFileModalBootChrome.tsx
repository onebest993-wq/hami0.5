import React from 'react';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { HUB_DOSSIER_Z_CLASS } from '@/app/components/lawyer/shared/hubZLayers';

function readLawsuitHeadline(file: FileData): string {
    const row = file as unknown as Record<string, unknown>;
    const fileNumber = String(row.fileNumber ?? row.caseNo ?? '').trim();
    const year = String(row.fileYear ?? row.year ?? '').trim();
    if (fileNumber && year) return `${fileNumber}/${year}`;
    if (fileNumber) return fileNumber;
    const title = String(row.title ?? row.caseTitle ?? '').trim();
    if (title) return title;
    return 'إضبارة دعوى';
}

/**
 * غلاف فوري لإضبارة الدعوى — ملء الشاشة (ليس إطار هاتف مثل التنفيذ).
 * يُستبدل فور اكتمال chunk الإضبارة.
 */
export function SmartFileModalBootChrome({
    file,
    onClose,
}: {
    file: FileData;
    onClose: () => void;
}) {
    const headline = readLawsuitHeadline(file);

    return (
        <div
            className={`fixed inset-0 ${HUB_DOSSIER_Z_CLASS} flex flex-col bg-[#0F121E] font-['Tajawal'] overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
            dir="rtl"
            data-testid="smart-file-modal-boot-chrome"
            data-dossier-variant="civil"
            aria-busy="true"
            aria-label="جاري تحميل إضبارة الدعوى"
        >
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
                        إضبارة الدعوى
                    </span>
                </div>
                <span className="inline-flex h-11 w-11 shrink-0" aria-hidden />
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="max-w-md truncate text-base font-bold text-white/85" dir="ltr">
                    {headline}
                </p>
                <div
                    className="h-1 w-36 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuetext="جاري التحميل"
                >
                    <div className="h-full w-2/5 animate-pulse rounded-full bg-[#E6C673]/45" />
                </div>
                <p className="text-xs text-white/40">جاري تحميل الإضبارة…</p>
            </div>
        </div>
    );
}
