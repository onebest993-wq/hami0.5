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
 * غلاف فوري لإضبارة الدعوى (SmartFileModal) — يُستبدل عند اكتمال الـ chunk.
 * نفس طبقة z للإضبارة حتى لا تظهر فجوة للرئيسية.
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
            className={`fixed inset-0 ${HUB_DOSSIER_Z_CLASS} flex items-center justify-center bg-[#0F121E] p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]`}
            dir="rtl"
            data-testid="smart-file-modal-boot-chrome"
        >
            <div className="flex h-full w-full max-w-md flex-col border border-slate-700/30 bg-slate-900/95 shadow-2xl">
                <div className="mx-2 mt-2 rounded-xl border-b border-black/50 border-t border-white/10 bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
                    <div className="flex w-full items-center gap-2 px-3 py-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            data-testid="smart-file-modal-boot-close"
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-hami-navy/45 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md touch-manipulation"
                            aria-label="إغلاق"
                        >
                            <HomeXIcon size={17} strokeWidth={2} />
                        </button>
                        <div className="flex min-w-0 flex-1 justify-center">
                            <span className="truncate text-lg font-semibold tracking-tight text-[#E6C673]">
                                إضبارة الدعوى
                            </span>
                        </div>
                        <span className="inline-flex h-11 w-11 shrink-0 rounded-xl border border-white/8 bg-hami-navy/30" aria-hidden />
                        <span className="inline-flex h-11 w-11 shrink-0 rounded-xl border border-white/8 bg-hami-navy/30" aria-hidden />
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden px-3 pt-3">
                    <div className="mb-3 rounded-2xl border border-[#E6C673]/25 bg-[#0B1120]/55 px-3 py-3">
                        <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                        <p className="mt-2 truncate text-center text-sm font-bold text-amber-50/90">{headline}</p>
                    </div>
                    <div className="space-y-3">
                        <div className="h-20 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
                        <div className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
                        <div className="h-24 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
                    </div>
                </div>
            </div>
        </div>
    );
}
