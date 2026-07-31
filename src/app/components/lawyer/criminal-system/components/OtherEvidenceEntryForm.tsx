import { useState } from 'react';
import type { OtherEvidenceItem } from '../criminalCaseModel';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';
import { PremiumSwitchRow } from '../CriminalNewCase/helpers';

export type OtherEvidenceEntryFormProps = {
    /** يُرجع رسالة خطأ عند الفشل أو null عند النجاح */
    onSubmit: (item: OtherEvidenceItem) => string | null;
    onClose: () => void;
    showLegalToast: (message: string, durationMs?: number) => void;
};

/**
 * نموذج إدخال «أدلة الإثبات الأخرى» — حالة الحقول محلية بالكامل
 * (مستخرَج من CriminalDashboardResolvedRuntime ضمن تفكيك المكوّن العملاق).
 */
export function OtherEvidenceEntryForm({ onSubmit, onClose, showLegalToast }: OtherEvidenceEntryFormProps) {
    const [typeInput, setTypeInput] = useState('');
    const [linkedInput, setLinkedInput] = useState(false);
    const [dateInput, setDateInput] = useState('');
    const [notesInput, setNotesInput] = useState('');

    const submit = () => {
        const evidenceType = typeInput.trim();
        if (!evidenceType) {
            showLegalToast('يرجى إدخال نوع الدليل.', 4500);
            return;
        }
        if (linkedInput && !dateInput.trim()) {
            showLegalToast('يرجى إدخال تاريخ الإرفاق عند تفعيل الربط في الإضبارة.', 4500);
            return;
        }
        const err = onSubmit({
            id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            evidenceType,
            isLinkedToDossier: linkedInput,
            attachmentDate: linkedInput ? dateInput.trim() : undefined,
            notes: notesInput.trim(),
        });
        if (err) {
            showLegalToast(err, 4500);
            return;
        }
        showLegalToast('✓ تم حفظ الدليل في سجل الإثبات.', 3500);
        onClose();
    };

    const fieldClass =
        'w-full min-h-[44px] rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.045] to-[#070a14]/80 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[border-color,box-shadow] focus:border-[#E6C673]/55 focus:shadow-[0_0_0_3px_rgba(230,198,115,0.12)] touch-manipulation';

    return (
        <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/20 p-4 shadow-[0_8px_28px_rgba(0,0,0,0.2)] backdrop-blur-sm">
            <div>
                <label className="mb-1.5 block text-[11px] font-bold text-white/65">نوع الدليل</label>
                <input
                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.otherEvidenceType}
                    className={fieldClass}
                    value={typeInput}
                    onChange={(e) => setTypeInput(e.target.value)}
                    placeholder="مثال: تقرير طبي / مخطط كشف / كاميرات مراقبة"
                />
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-black/25 px-3.5 py-2.5">
                <PremiumSwitchRow
                    label="هل تم ربطه في الإضبارة؟"
                    pressed={linkedInput}
                    onToggle={() => {
                        const next = !linkedInput;
                        setLinkedInput(next);
                        if (!next) setDateInput('');
                    }}
                />
            </div>
            {linkedInput ? (
                <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-white/65">تاريخ الإرفاق</label>
                    <input
                        type="date"
                        className={fieldClass}
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                    />
                </div>
            ) : null}
            <div>
                <label className="mb-1.5 block text-[11px] font-bold text-white/65">ملاحظات الدليل</label>
                <textarea
                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.otherEvidenceNotes}
                    className={`${fieldClass} min-h-[88px]`}
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 pt-1">
                <button
                    type="button"
                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.otherEvidenceSave}
                    onClick={submit}
                    className="min-h-[44px] rounded-xl bg-[#E6C673] px-4 py-2 text-sm font-black text-[#0B1021] transition hover:brightness-110 touch-manipulation"
                >
                    حفظ الدليل
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-black text-white transition hover:bg-white/10 touch-manipulation"
                >
                    إلغاء
                </button>
            </div>
        </div>
    );
}
