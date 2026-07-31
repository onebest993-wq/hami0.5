import type { CriminalDefendant } from '../criminalCaseModel';
import { isGuarantorForfeited, normalizeGuarantorDetails } from '../criminalGuarantorModel';

export type GuarantorForfeitureStripProps = {
    defendants: CriminalDefendant[];
    onOpenForfeitureUpdate: (defendantId: string) => void;
};

/** بطاقات مصادرة الكفالة تحت شبكة الأطراف */
export function GuarantorForfeitureStrip({
    defendants,
    onOpenForfeitureUpdate,
}: GuarantorForfeitureStripProps) {
    const forfeited = defendants.filter((d) => isGuarantorForfeited(d.guarantorDetails));
    if (!forfeited.length) return null;

    return (
        <div className="max-w-5xl mx-auto w-full px-6 pb-2 print:hidden">
            <div className="space-y-3">
                {forfeited.map((d) => {
                    const g = normalizeGuarantorDetails(d.guarantorDetails);
                    const notes = String(g?.guarantorInfo ?? '').trim();
                    return (
                        <div key={String(d.id)} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-white font-black text-sm whitespace-normal break-words">
                                    مصادرة الكفالة — المتهم: {String(d.fullName ?? '').trim() || '—'}
                                </div>
                                <div className="rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1 text-[11px] font-black text-red-200 whitespace-normal break-words">
                                    ⛔ مصادرة
                                </div>
                            </div>
                            {notes ? (
                                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/30 p-3">
                                    <div className="text-white/60 text-xs font-black mb-1 whitespace-normal break-words">
                                        ملاحظات المتابعة
                                    </div>
                                    <div className="text-white font-black text-sm whitespace-normal break-words">
                                        {notes}
                                    </div>
                                </div>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onOpenForfeitureUpdate(String(d.id))}
                                    className="rounded-full border border-slate-600/60 bg-slate-800/50 px-3 py-1 text-[11px] font-black text-white/80 hover:text-white hover:bg-slate-800 transition whitespace-normal break-words min-h-[44px]"
                                >
                                    تحديث بيانات المصادرة
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
