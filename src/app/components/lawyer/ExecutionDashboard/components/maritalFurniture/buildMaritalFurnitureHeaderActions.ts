import { createElement, Fragment, type ReactNode } from 'react';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';

export function buildMaritalFurnitureHeaderActions(input: {
    locked: boolean;
    isEditing: boolean;
    handleSave: () => void;
    cancelEdit: () => void;
    startEdit: () => void;
    deliveryRecorded: boolean;
    canEditAfterDelivery: boolean;
    displayItems: MaritalFurnitureItem[];
}): ReactNode {
    const {
        locked,
        isEditing,
        handleSave,
        cancelEdit,
        startEdit,
        deliveryRecorded,
        canEditAfterDelivery,
        displayItems,
    } = input;

    return !locked
        ? isEditing
            ? createElement(
                  Fragment,
                  null,
                  createElement(
                      'button',
                      {
                          type: 'button',
                          'data-testid': 'marital-furniture-save-list',
                          onClick: handleSave,
                          className:
                              'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25 touch-manipulation',
                      },
                      'حفظ',
                  ),
                  createElement(
                      'button',
                      {
                          type: 'button',
                          'data-testid': 'marital-furniture-cancel-edit',
                          onClick: cancelEdit,
                          className:
                              'inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10 touch-manipulation',
                      },
                      'إلغاء',
                  ),
              )
            : deliveryRecorded && !canEditAfterDelivery
              ? null
              : createElement(
                    'button',
                    {
                        type: 'button',
                        'data-testid': 'marital-furniture-start-edit',
                        onClick: startEdit,
                        className:
                            'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-3 py-1.5 text-[11px] font-bold text-[#E6C673] hover:bg-[#E6C673]/20 touch-manipulation',
                    },
                    createElement(Pencil, { size: 12 }),
                    displayItems.length === 0
                        ? 'إضافة'
                        : deliveryRecorded
                          ? 'تعديل غير المُسلَّم'
                          : 'تعديل',
                )
        : null;
}
