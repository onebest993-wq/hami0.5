import React from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { Check } from 'lucide-react';
import { ecg } from './executionCreationGlassUi';

export type ExecutionOptionSheetMultiSelectPanel = {
    options: { value: string; label: string }[];
    draftValues: string[];
    onToggleDraft: (value: string) => void;
    onConfirm: () => void;
    confirmLabel?: string;
    sectionTitle?: string;
    hint?: string;
};

interface ExecutionOptionSheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    options: { value: string; label: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
    comingSoonOptions?: { label: string }[];
    comingSoonCaption?: string;
    multiSelectPanel?: ExecutionOptionSheetMultiSelectPanel;
    exclusiveSectionTitle?: string;
}

function SheetSectionHeader({
    title,
    badge,
}: {
    title: string;
    badge: string;
}) {
    return (
        <div className={ecg.sheetSectionHeader}>
            <span className={ecg.sheetSectionBadge}>{badge}</span>
            <p className={ecg.sheetSectionTitle}>{title}</p>
        </div>
    );
}

function ExecutionOptionSheet({
    open,
    onClose,
    title,
    options,
    selectedValue,
    onSelect,
    comingSoonOptions,
    comingSoonCaption = 'في مرحلة الدراسة والتطوير',
    multiSelectPanel,
    exclusiveSectionTitle,
}: ExecutionOptionSheetProps) {
    const draftSet = new Set(multiSelectPanel?.draftValues ?? []);
    if (!open) return null;

    const hasExclusive = options.length > 0 || (comingSoonOptions?.length ?? 0) > 0;
    const sheetHeight = multiSelectPanel
        ? 'h-[min(88vh,720px)] max-h-[min(88vh,720px)]'
        : 'h-[min(56vh,440px)] max-h-[min(56vh,440px)]';

    const exclusiveButtons = (
        <>
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(opt.value);
                        onClose();
                    }}
                    className={`${ecg.optionBtn} ${
                        selectedValue === opt.value ? ecg.optionBtnActive : ecg.optionBtnIdle
                    }`}
                >
                    {opt.label}
                </button>
            ))}
            {comingSoonOptions && comingSoonOptions.length > 0 ? (
                <div className="mt-2 border-t border-white/6 pt-2 space-y-1.5">
                    <p className="px-1 pb-1 text-[10px] font-bold text-slate-500">{comingSoonCaption}</p>
                    {comingSoonOptions.map((opt) => (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                SmartToast.info(`«${opt.label}» — ${comingSoonCaption}`, 3500);
                            }}
                            className="w-full text-right rounded-2xl px-4 py-3 text-sm font-medium text-slate-500/85 border border-white/5 bg-white/[0.02] cursor-pointer select-none transition-colors hover:border-amber-500/20 hover:bg-amber-500/[0.04] hover:text-slate-400 active:scale-[0.99]"
                            aria-label={`${opt.label} — ${comingSoonCaption}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </>
    );

    return (
        <>
            <div
                className={ecg.sheetBackdrop}
                onClick={onClose}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                role="presentation"
            />
            <div
                className={`${ecg.sheetPanel} ${sheetHeight} overflow-hidden flex flex-col`}
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="execution-sheet-title"
            >
                <div className={ecg.sheetHeader}>
                    <button type="button" onClick={onClose} className={ecg.sheetClose}>
                        إغلاق
                    </button>
                    <span id="execution-sheet-title" className={ecg.sheetTitle}>
                        {title}
                    </span>
                    <span className="min-w-[3rem]" />
                </div>

                {multiSelectPanel ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className={ecg.sheetBodyUnified}>
                            <div className={ecg.sheetGroupedCard}>
                                {hasExclusive ? (
                                    <section className="space-y-2">
                                        {exclusiveSectionTitle ? (
                                            <SheetSectionHeader
                                                title={exclusiveSectionTitle}
                                                badge="اختيار واحد"
                                            />
                                        ) : null}
                                        <div className="space-y-1.5">{exclusiveButtons}</div>
                                    </section>
                                ) : null}

                                {hasExclusive && multiSelectPanel ? (
                                    <div className={ecg.sheetSectionDivider} aria-hidden="true" />
                                ) : null}

                                <section className={ecg.multiPanel}>
                                    {multiSelectPanel.sectionTitle ? (
                                        <SheetSectionHeader
                                            title={multiSelectPanel.sectionTitle}
                                            badge="متعدد"
                                        />
                                    ) : null}
                                    <p className={ecg.multiHint}>
                                        {multiSelectPanel.hint ?? 'يمكن اختيار أكثر من مطالبة هنا'}
                                    </p>
                                    <div className={ecg.multiList}>
                                        {multiSelectPanel.options.map((opt) => {
                                            const checked = draftSet.has(opt.value);
                                            return (
                                                <label
                                                    key={opt.value}
                                                    className={`${ecg.multiItem} ${
                                                        checked ? ecg.multiItemChecked : ecg.multiItemIdle
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() =>
                                                            multiSelectPanel.onToggleDraft(opt.value)
                                                        }
                                                        className="sr-only"
                                                    />
                                                    <span className="flex-1 text-sm font-semibold text-slate-50 text-right leading-snug">
                                                        {opt.label}
                                                    </span>
                                                    <span
                                                        aria-hidden="true"
                                                        className={`${ecg.multiToggle} ${
                                                            checked
                                                                ? ecg.multiToggleChecked
                                                                : ecg.multiToggleIdle
                                                        }`}
                                                    >
                                                        {checked ? (
                                                            <Check
                                                                size={13}
                                                                strokeWidth={3}
                                                                className="text-[#0A0F1C] drop-shadow-sm"
                                                            />
                                                        ) : null}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className={ecg.sheetFooter}>
                            <button
                                type="button"
                                disabled={multiSelectPanel.draftValues.length === 0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    multiSelectPanel.onConfirm();
                                }}
                                className={ecg.saveBtn}
                            >
                                {multiSelectPanel.confirmLabel ?? 'حفظ الاختيار'}
                            </button>
                        </div>
                    </div>
                ) : hasExclusive ? (
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-1.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        {exclusiveButtons}
                    </div>
                ) : null}
            </div>
        </>
    );
}

export default ExecutionOptionSheet;
export type { ExecutionOptionSheetProps };
