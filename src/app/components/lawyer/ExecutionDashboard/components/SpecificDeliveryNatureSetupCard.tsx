import React, { useState } from 'react';
import type { SpecificDeliveryItemNature } from '@/app/utils/executionModuleStrategies';
import {
    createEmptySpecificDeliveryItem,
    readSpecificDeliveryItems,
} from '@/app/utils/specificDeliveryItemsUtils';

export type SpecificDeliveryNatureSetupCardProps = {
    executionData: Record<string, unknown> | null | undefined;
    persistExecutionMerge?: (patch: Record<string, unknown>) => void | boolean;
    showToast?: (message: string, type: 'success' | 'warning' | 'info') => void;
    onSaved?: () => void;
};

function buildNaturePersistPatch(
    executionData: Record<string, unknown> | null | undefined,
    nature: SpecificDeliveryItemNature,
    itemName: string,
): Record<string, unknown> {
    const existing = readSpecificDeliveryItems(executionData);
    const trimmedName = String(itemName || '').trim();
    if (existing.length > 0) {
        return {
            specificDeliveryItemNature: nature,
            specificDeliveryItems: existing.map((item) => ({ ...item, nature })),
            ...(trimmedName ? { specificDeliveryItemName: trimmedName } : {}),
        };
    }
    const legacyName = String(executionData?.specificDeliveryItemName || '').trim();
    const name = trimmedName || legacyName || '—';
    return {
        specificDeliveryItemNature: nature,
        specificDeliveryItemName: name,
        specificDeliveryItems: [{ ...createEmptySpecificDeliveryItem(nature), name }],
    };
}

/** خطوة أولى لتسليم شيء معين — تحديد طبيعة الشيء لتفعيل الإجراءات الميدانية */
export function SpecificDeliveryNatureSetupCard({
    executionData,
    persistExecutionMerge,
    showToast,
    onSaved,
}: SpecificDeliveryNatureSetupCardProps) {
    const [itemName, setItemName] = useState(
        () => String(executionData?.specificDeliveryItemName || '').trim(),
    );

    const saveNature = (nature: SpecificDeliveryItemNature) => {
        if (typeof persistExecutionMerge !== 'function') {
            showToast?.('تعذّر الحفظ — أعد فتح المحضر.', 'warning');
            return;
        }
        const patch = buildNaturePersistPatch(executionData, nature, itemName);
        const ok = persistExecutionMerge(patch);
        if (ok === false) {
            showToast?.('تعذّر حفظ طبيعة الشيء — أعد المحاولة.', 'warning');
            return;
        }
        showToast?.('تم حفظ طبيعة الشيء — ستظهر إجراءات التسليم الآن.', 'success');
        onSaved?.();
    };

    return (
        <div
            className="rounded-2xl border border-amber-500/35 bg-amber-950/25 px-3 py-3 text-right space-y-2.5"
            dir="rtl"
        >
            <p className="text-[11px] font-bold text-amber-100">
                تفعيل إجراءات «تسليم شيء معين»
            </p>
            <p className="text-[10px] leading-relaxed text-amber-200/85">
                حدّد طبيعة الشيء (منقول أو غير منقول) لتظهر إجراءات الميدان، الخبراء، والتحويل
                المالي في هذا التبويب.
            </p>
            <div>
                <label className="mb-1 block text-[10px] text-amber-200/75">الشيء المراد تسليمه</label>
                <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="وصف مختصر للشيء"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white focus:border-amber-400/45 focus:outline-none"
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => saveNature('movable')}
                    className="rounded-xl border border-sky-500/35 bg-sky-500/10 py-2.5 text-[11px] font-bold text-sky-100 hover:bg-sky-500/15"
                >
                    منقول
                </button>
                <button
                    type="button"
                    onClick={() => saveNature('immovable')}
                    className="rounded-xl border border-violet-500/35 bg-violet-500/10 py-2.5 text-[11px] font-bold text-violet-100 hover:bg-violet-500/15"
                >
                    غير منقول
                </button>
            </div>
        </div>
    );
}
