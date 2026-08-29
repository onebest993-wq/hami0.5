import React from 'react';
import { Link2 } from '@/app/components/ui/icons/Link2';
import { X } from '@/app/components/ui/icons/X';

import { resolveCriminalCaseDisplayLabel, useCriminalStore } from '../criminalStore';

export type PendingSeveranceResumeBarProps = {
    /** عند التقييد بإضبارة أم معيّنة — null = أي تفريق معلّق. */
    parentCaseId?: string | null;
    onResume: () => void;
    className?: string;
};

/**
 * شريط علوي: يظهر عند وجود تفريق لم يُكتمل — لا يلوّث نموذج «إضبارة جديدة» العادي.
 */
export const PendingSeveranceResumeBar = ({
    parentCaseId = null,
    onResume,
    className = '',
}: PendingSeveranceResumeBarProps) => {
    const pendingSeveranceContext = useCriminalStore((s) => s.pendingSeveranceContext);
    const cancelPendingSeverance = useCriminalStore((s) => s.cancelPendingSeverance);
    const casesById = useCriminalStore((s) => s.casesById);

    if (!pendingSeveranceContext) return null;
    if (parentCaseId && pendingSeveranceContext.parentCaseId !== parentCaseId) return null;

    const parent = casesById[pendingSeveranceContext.parentCaseId];
    const parentLabel = parent
        ? resolveCriminalCaseDisplayLabel(parent)
        : '—';

    return (
        <div
            className={`w-full border-b border-[#E6C673]/40 bg-gradient-to-l from-[#E6C673]/10 via-[#E6C673]/5 to-transparent px-4 py-3 print:hidden ${className}`}
            dir="rtl"
            role="status"
            aria-live="polite"
        >
            <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="flex items-start gap-2.5 min-w-0">
                    <span className="grid place-items-center h-8 w-8 rounded-full bg-[#E6C673]/15 border border-[#E6C673]/30 shrink-0 mt-0.5">
                        <Link2 className="h-4 w-4 text-[#E6C673]" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <div className="text-white font-black text-sm whitespace-normal break-words">
                            تفريق إضبارة قيد الإكمال
                        </div>
                        <div className="text-white/55 text-[11px] font-bold mt-0.5 whitespace-normal break-words">
                            الإضبارة الأم: {parentLabel} — أكمل التفريق من نفس الإضبارة دون مغادرة السياق.
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 sm:flex-nowrap flex-wrap">
                    <button
                        type="button"
                        onClick={onResume}
                        className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black px-4 py-2.5 text-xs hover:brightness-110 transition whitespace-nowrap"
                    >
                        إكمال ملء بيانات الإضبارة المفرّقة
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const ok =
                                typeof globalThis.confirm === 'function'
                                    ? globalThis.confirm(
                                          'إلغاء التفريق المعلّق وحذف المسودّة المحفوظة؟ لا يمكن التراجع.',
                                      )
                                    : false;
                            if (!ok) return;
                            cancelPendingSeverance();
                        }}
                        className="rounded-xl border border-white/15 bg-white/5 text-white/70 font-black px-3 py-2.5 text-xs hover:bg-white/10 transition inline-flex items-center gap-1"
                        title="إلغاء التفريق"
                    >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};
