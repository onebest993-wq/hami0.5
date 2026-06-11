import React, { useEffect, useState } from 'react';
import type { BreakInventoryFurnitureSavePayload } from '@/app/utils/executorApprovalWorkflow';

export interface BreakInventoryFurnitureInlineFormProps {
    requestTitle?: string;
    disabled?: boolean;
    embedded?: boolean;
    ledgerSaved?: boolean;
    onSave: (payload: BreakInventoryFurnitureSavePayload) => void;
    onFinalize: () => void;
}

export const BreakInventoryFurnitureInlineForm: React.FC<BreakInventoryFurnitureInlineFormProps> = ({
    disabled = false,
    embedded = false,
    ledgerSaved = false,
    onSave,
    onFinalize,
}) => {
    const [mode, setMode] = useState<'list' | 'none'>('list');
    const [linesText, setLinesText] = useState('');
    const [saved, setSaved] = useState(ledgerSaved);

    useEffect(() => {
        setSaved(ledgerSaved);
        if (!ledgerSaved) {
            setMode('list');
            setLinesText('');
        }
    }, [ledgerSaved]);

    const handleSave = () => {
        if (mode === 'none') {
            onSave({ mode: 'none', lines: [] });
            setSaved(true);
            return;
        }
        const lines = linesText
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (lines.length === 0) return;
        onSave({ mode: 'list', lines });
        setSaved(true);
    };

    const body = (
        <>
            {!saved ? (
                <>
                    <label className="flex flex-row-reverse items-center gap-2 cursor-pointer text-[11px] text-slate-200">
                        <input
                            type="radio"
                            name="inv-mode-inline"
                            checked={mode === 'list'}
                            disabled={disabled}
                            onChange={() => setMode('list')}
                            className="accent-indigo-500"
                        />
                        <span>إدراج المنقولات المجرودة (سطر لكل بند)</span>
                    </label>
                    <label className="flex flex-row-reverse items-center gap-2 cursor-pointer text-[11px] text-slate-200">
                        <input
                            type="radio"
                            name="inv-mode-inline"
                            checked={mode === 'none'}
                            disabled={disabled}
                            onChange={() => setMode('none')}
                            className="accent-indigo-500"
                        />
                        <span>لا يوجد أثاث في العين وقت الجرد</span>
                    </label>

                    {mode === 'list' ? (
                        <textarea
                            value={linesText}
                            disabled={disabled}
                            onChange={(e) => setLinesText(e.target.value)}
                            rows={5}
                            placeholder="مثال: ثلاجة — طاولة طعام — …"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white text-right resize-y min-h-[100px] focus:outline-none focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-50"
                        />
                    ) : null}

                    <button
                        type="button"
                        disabled={
                            disabled || (mode === 'list' && !linesText.split(/\r?\n/).some((s) => /\S/.test(s)))
                        }
                        onClick={handleSave}
                        className="w-full rounded-xl border border-indigo-500/35 bg-indigo-500/15 px-3 py-2 text-[11px] font-extrabold text-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        حفظ الجرد في الملاحظات
                    </button>
                </>
            ) : (
                <p className="text-[10px] text-emerald-300/90">تم حفظ محضر الجرد.</p>
            )}

            {saved ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onFinalize}
                    className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 disabled:opacity-40"
                >
                    تأكيد اكتمال الكسر والجرد
                </button>
            ) : null}
        </>
    );

    if (embedded) {
        return (
            <div className="space-y-2 text-right" dir="rtl">
                {body}
            </div>
        );
    }

    return (
        <div className="space-y-3 rounded-xl border border-indigo-500/25 bg-indigo-950/15 p-3 text-right" dir="rtl">
            {body}
        </div>
    );
};
