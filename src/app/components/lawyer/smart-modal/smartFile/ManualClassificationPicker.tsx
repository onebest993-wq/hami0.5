import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useSmartFileModalTheme } from './smartFileModalTheme';
import {
    addManualClassificationTemplate,
    loadManualClassificationTemplates,
    normalizeManualClassificationTag,
    persistManualClassificationTemplates,
    removeManualClassificationTemplate,
} from './manualClassificationTemplates';

export type ManualClassificationPickerProps = {
    mode: 'single' | 'multi';
    selected: string[];
    onSelectedChange: (tags: string[]) => void;
    label?: string;
    hint?: string;
    placeholder?: string;
    inputTestId?: string;
    addTestId?: string;
    chipTestId?: (label: string) => string;
    removeTestId?: (label: string) => string;
};

function slugForTestId(label: string): string {
    return label.replace(/^#+/, '').replace(/\s+/g, '-').slice(0, 40);
}

export function ManualClassificationPicker({
    mode,
    selected,
    onSelectedChange,
    label = 'تصنيف يدوي',
    hint,
    placeholder = 'مثال: #مرافعة',
    inputTestId,
    addTestId,
    chipTestId,
    removeTestId,
}: ManualClassificationPickerProps) {
    const T = useSmartFileModalTheme();
    const isPearl = T.variant === 'personal-pearl';
    const [templates, setTemplates] = useState<string[]>(() => loadManualClassificationTemplates());
    const [draft, setDraft] = useState('');

    const applyHint =
        hint
        ?? (mode === 'single'
            ? 'قوالبك اليدوية — اضغط لاختيار التصنيف'
            : 'قوالبك اليدوية — اضغط لإضافة أو إزالة التصنيف');

    const handleAddTemplate = () => {
        const normalized = normalizeManualClassificationTag(draft);
        if (!normalized) return;
        const next = addManualClassificationTemplate(templates, normalized);
        if (next.length === templates.length) {
            setDraft('');
            return;
        }
        setTemplates(next);
        persistManualClassificationTemplates(next);
        setDraft('');
        if (mode === 'single') {
            onSelectedChange([normalized]);
        } else if (!selected.includes(normalized)) {
            onSelectedChange([...selected, normalized]);
        }
    };

    const handleRemoveTemplate = (tag: string) => {
        const next = removeManualClassificationTemplate(templates, tag);
        setTemplates(next);
        persistManualClassificationTemplates(next);
        if (selected.includes(tag)) {
            onSelectedChange(selected.filter((t) => t !== tag));
        }
    };

    const handleApplyTemplate = (tag: string) => {
        if (mode === 'single') {
            onSelectedChange(selected[0] === tag ? [] : [tag]);
            return;
        }
        onSelectedChange(
            selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag],
        );
    };

    return (
        <div>
            <label className={T.label}>{label}</label>
            <div
                className={`space-y-2.5 rounded-xl border p-3 ${
                    isPearl
                        ? 'border-[#F0A8B4]/22 bg-gradient-to-b from-[#F5C6D0]/[0.10] to-transparent backdrop-blur-sm'
                        : 'border-[#E6C673]/12 bg-gradient-to-b from-[#E6C673]/[0.04] to-transparent'
                }`}
            >
                <p className={`text-[10px] font-bold ${isPearl ? 'text-[#FFD4DC]/85' : 'text-white/45'}`}>{applyHint}</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTemplate();
                            }
                        }}
                        placeholder={placeholder}
                        data-testid={inputTestId}
                        className={`${T.field} flex-1 py-2 text-[11px]`}
                    />
                    <button
                        type="button"
                        onClick={handleAddTemplate}
                        disabled={!normalizeManualClassificationTag(draft)}
                        data-testid={addTestId}
                        className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-all disabled:opacity-40 shrink-0 ${
                            isPearl
                                ? 'bg-[#F5C6D0]/[0.14] border border-[#F0A8B4]/28 text-[#FFE8EC] hover:bg-[#F5C6D0]/[0.22] backdrop-blur-sm'
                                : 'bg-[#E6C673]/10 border border-[#E6C673]/25 text-[#E6C673] hover:bg-[#E6C673]/20'
                        }`}
                    >
                        <Plus size={12} aria-hidden />
                        إضافة قالب
                    </button>
                </div>
                {templates.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {templates.map((tag) => {
                            const isSelected = selected.includes(tag);
                            return (
                                <span
                                    key={tag}
                                    className={[
                                        'inline-flex items-center max-w-full rounded-lg border overflow-hidden transition-colors',
                                        isSelected
                                            ? isPearl
                                                ? 'bg-[#F5C6D0]/[0.16] border-[#F0A8B4]/32'
                                                : 'bg-[#E6C673]/12 border-[#E6C673]/35'
                                            : isPearl
                                              ? 'bg-white/[0.04] border-[#F0A8B4]/16'
                                              : 'bg-white/[0.04] border-white/[0.08]',
                                    ].join(' ')}
                                >
                                    <button
                                        type="button"
                                        data-testid={chipTestId?.(tag) ?? `manual-classification-chip-${slugForTestId(tag)}`}
                                        onClick={() => handleApplyTemplate(tag)}
                                        className={[
                                            'px-2 py-1 transition-all text-[9px] font-semibold truncate text-right',
                                            isSelected
                                                ? isPearl
                                                    ? 'text-[#FFE8EC] hover:bg-[#F5C6D0]/[0.12]'
                                                    : 'text-[#E6C673] hover:bg-[#E6C673]/10'
                                                : isPearl
                                                  ? 'text-[#9894A0] hover:text-[#FFD4DC] hover:bg-[#F5C6D0]/[0.08]'
                                                  : 'text-white/55 hover:text-white/80 hover:bg-[#E6C673]/[0.06]',
                                        ].join(' ')}
                                        title={tag}
                                    >
                                        {tag}
                                    </button>
                                    <button
                                        type="button"
                                        data-testid={removeTestId?.(tag) ?? `manual-classification-remove-${slugForTestId(tag)}`}
                                        onClick={() => handleRemoveTemplate(tag)}
                                        className="px-1.5 py-1 text-white/25 hover:text-rose-300 hover:bg-rose-500/10 border-r border-white/[0.06] transition-colors shrink-0"
                                        aria-label={`حذف القالب ${tag}`}
                                    >
                                        <X size={10} aria-hidden />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                ) : (
                    <p className={`text-[10px] ${isPearl ? 'text-[#9894A0]/75' : 'text-white/30'}`}>
                        لم تُضف قوالب بعد — احفظ تصنيفاتك المتكررة لتسريع الإدخال
                    </p>
                )}
            </div>
        </div>
    );
}
