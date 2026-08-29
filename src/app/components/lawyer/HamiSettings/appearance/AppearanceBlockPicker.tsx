import React, { useId } from 'react';
import { AppearancePressButton } from './AppearancePressButton';
import type { AppearanceBlockCustomize } from './useAppearanceBlockCustomize';

export function AppearanceBlockPicker({ customize }: { customize: AppearanceBlockCustomize }) {
    const blockListId = useId();

    return (
        <div>
            <p id={blockListId} className="text-[11px] font-bold text-white/80 mb-2">
                الأقسام {customize.selectedCount > 0 ? `(${customize.selectedCount})` : ''}
            </p>
            <div
                className="flex flex-wrap gap-1.5"
                role="listbox"
                aria-multiselectable
                aria-labelledby={blockListId}
            >
                <AppearancePressButton
                    type="button"
                    data-testid="appearance-block-select-all"
                    aria-pressed={customize.isAllSelected}
                    aria-label="تحديد كل الأقسام"
                    onPress={customize.toggleSelectAll}
                    className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-[10px] font-extrabold border-2 border-dashed touch-manipulation shrink-0 ${
                        customize.isAllSelected
                            ? 'border-[#E6C673]/70 bg-[#E6C673]/22 text-[#F7EBC4] shadow-[0_0_0_1px_rgba(230,198,115,0.2)]'
                            : 'border-[#E6C673]/35 bg-[#E6C673]/08 text-[#E6C673] hover:bg-[#E6C673]/14'
                    }`}
                >
                    الكل
                </AppearancePressButton>
                {customize.blocks.map((id) => {
                    const active = customize.isSelected(id);
                    return (
                        <AppearancePressButton
                            key={id}
                            type="button"
                            role="option"
                            aria-selected={active}
                            data-testid={`appearance-block-pick-${id}`}
                            onPress={() => customize.toggleBlock(id)}
                            className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-[10px] font-bold border touch-manipulation ${
                                active
                                    ? 'border-[#E6C673]/50 bg-[#E6C673]/15 text-white'
                                    : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.05]'
                            }`}
                        >
                            {customize.blockLabel(id)}
                        </AppearancePressButton>
                    );
                })}
            </div>
        </div>
    );
}
