import React from 'react';
import { X } from 'lucide-react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { EXECUTION_DOSSIER_TEST_IDS } from '@/app/components/lawyer/ExecutionDashboard/executionDossierTestIds';

function readDossierHeadline(file: FileData): string {
    const row = file as unknown as Record<string, unknown>;
    const fileNumber = String(row.fileNumber ?? row.caseNo ?? '').trim();
    const year = String(row.fileYear ?? row.year ?? '').trim();
    if (fileNumber && year) return `${fileNumber}/${year}`;
    if (fileNumber) return fileNumber;
    const directorate = String(row.directorate ?? '').trim();
    if (directorate) return directorate;
    return 'إضبارة تنفيذ';
}

/**
 * غلاف فوري بنفس هيكل إطار الهاتف في لوحة التنفيذ — يُستبدل بسلاسة عند اكتمال الـ chunk.
 */
export function ExecutionDashboardBootChrome({
    file,
    onClose,
}: {
    file: FileData;
    onClose: () => void;
}) {
    const headline = readDossierHeadline(file);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-3xl p-0"
            dir="rtl"
            data-testid={EXECUTION_DOSSIER_TEST_IDS.dossier}
        >
            <div className="flex h-full w-full max-w-md flex-col border border-slate-700/30 bg-slate-900/95 shadow-2xl">
                <div className="mx-2 mt-2 rounded-xl border-b border-black/50 border-t border-white/10 bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl">
                    <div className="flex w-full items-center gap-2 px-3 py-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            data-testid={EXECUTION_DOSSIER_TEST_IDS.close}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-hami-navy/45 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md"
                            aria-label="إغلاق"
                        >
                            <X size={17} strokeWidth={2} />
                        </button>
                        <div className="flex min-w-0 flex-1 justify-center">
                            <span className="truncate text-lg font-semibold tracking-tight text-green-400">
                                الإضبارة التنفيذية
                            </span>
                        </div>
                        <span className="inline-flex h-9 w-9 shrink-0 rounded-xl border border-white/8 bg-hami-navy/30" aria-hidden />
                        <span className="inline-flex h-9 w-9 shrink-0 rounded-xl border border-white/8 bg-hami-navy/30" aria-hidden />
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden px-3 pt-3">
                    <div className="mb-3 rounded-2xl border border-amber-500/25 bg-[#0B1120]/55 px-3 py-3">
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
