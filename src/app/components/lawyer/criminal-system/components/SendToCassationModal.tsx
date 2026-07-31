import type { CassationType, ProsecutionInterventionBasis } from '@/app/types/criminal';
import type { CriminalDefendant } from '../criminalCaseModel';
import { cassationFilingTypeLabel } from '../cassationEngine';
import { DefendantDecisionScopePicker } from './DefendantDecisionScopePicker';

export type SendToCassationModalProps = {
    open: boolean;
    availableCassationFilingTypes: CassationType[];
    cassationType: CassationType;
    setCassationType: (value: CassationType) => void;
    cassationInterventionBasis: ProsecutionInterventionBasis;
    setCassationInterventionBasis: (value: ProsecutionInterventionBasis) => void;
    cassationNumber: string;
    setCassationNumber: (value: string) => void;
    cassationPanelName: string;
    setCassationPanelName: (value: string) => void;
    defendants: CriminalDefendant[];
    cassationAppellantIds: string[];
    setCassationAppellantIds: (ids: string[]) => void;
    onClose: () => void;
    onSubmit: () => void;
};

/** مودال تسجيل تقديم الطعن وإرسال الأوراق للتمييز */
export function SendToCassationModal({
    open,
    availableCassationFilingTypes,
    cassationType,
    setCassationType,
    cassationInterventionBasis,
    setCassationInterventionBasis,
    cassationNumber,
    setCassationNumber,
    cassationPanelName,
    setCassationPanelName,
    defendants,
    cassationAppellantIds,
    setCassationAppellantIds,
    onClose,
    onSubmit,
}: SendToCassationModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[221] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-to-cassation-title"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div
                        id="send-to-cassation-title"
                        className="text-white font-black text-sm whitespace-normal break-words"
                    >
                        تسجيل تقديم الطعن وإرسال الأوراق للتمييز
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words min-h-[44px] min-w-[44px]"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            قناة الطعن / التدخل
                        </label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[44px]"
                            value={
                                availableCassationFilingTypes.includes(cassationType)
                                    ? cassationType
                                    : (availableCassationFilingTypes[0] ?? cassationType)
                            }
                            onChange={(e) => setCassationType(e.target.value as CassationType)}
                        >
                            {availableCassationFilingTypes.map((type) => (
                                <option key={type} value={type} className="bg-slate-900">
                                    {cassationFilingTypeLabel(type)}
                                </option>
                            ))}
                        </select>
                    </div>
                    {cassationType === 'prosecution_intervention_264b' ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                أساس التدخل
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[44px]"
                                value={cassationInterventionBasis}
                                onChange={(e) =>
                                    setCassationInterventionBasis(
                                        e.target.value as ProsecutionInterventionBasis,
                                    )
                                }
                            >
                                <option value="prosecutor_general_review">مطالعة رئيس الادعاء العام</option>
                                <option value="parties_request">طلب الخصوم</option>
                                <option value="court_sua_sponte">المحكمة تلقائياً</option>
                            </select>
                        </div>
                    ) : null}
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            رقم الإضبارة/كتاب الإرسال التمييزي
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[44px]"
                            value={cassationNumber}
                            onChange={(e) => setCassationNumber(e.target.value)}
                            placeholder="مثال: 123/تمييز/2026"
                        />
                    </div>
                    {cassationType !== 'prosecution_intervention_264b' ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                اسم الهيئة التمييزية المستلمة
                            </label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[44px]"
                                value={cassationPanelName}
                                onChange={(e) => setCassationPanelName(e.target.value)}
                                placeholder="مثال: الهيئة الجزائية/الموسعة..."
                            />
                        </div>
                    ) : null}
                    <DefendantDecisionScopePicker
                        defendants={defendants}
                        selectedIds={cassationAppellantIds}
                        onChange={setCassationAppellantIds}
                        title="الطاعن / المشمول بالطعن"
                    />
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words min-h-[44px]"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={
                                !cassationNumber.trim() ||
                                (cassationType !== 'prosecution_intervention_264b' &&
                                    !cassationPanelName.trim())
                            }
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words min-h-[44px]"
                        >
                            حفظ وإرسال
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
