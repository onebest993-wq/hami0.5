import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { URGENT_DOSSIER_INPUT } from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';
import {
    PETITION_ORDERS_DROPDOWN_OPTIONS,
    URGENT_JUDICIARY_DROPDOWN_OPTIONS,
    PROCEDURE_CATEGORY_GROUP_LABELS,
} from './constants';

const OTHER_VALUE = 'other';

const GROUPS = [
    {
        id: 'petition_orders' as const,
        label: PROCEDURE_CATEGORY_GROUP_LABELS.petition_orders,
        options: PETITION_ORDERS_DROPDOWN_OPTIONS,
    },
    {
        id: 'urgent_judiciary' as const,
        label: PROCEDURE_CATEGORY_GROUP_LABELS.urgent_judiciary,
        options: URGENT_JUDICIARY_DROPDOWN_OPTIONS,
    },
];

type ProcedureCategoryActionPickerProps = {
    value: string;
    onChange: (next: string) => void;
};

export function ProcedureCategoryActionPicker({ value, onChange }: ProcedureCategoryActionPickerProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

    useLayoutEffect(() => {
        if (!open || !triggerRef.current) {
            setPanelPos(null);
            return;
        }
        const update = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const viewportPadding = 12;
            const gap = 8;
            const estimatedHeight = Math.min(380, window.innerHeight * 0.65);
            const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
            let left = rect.left;
            if (left + width > window.innerWidth - viewportPadding) {
                left = window.innerWidth - width - viewportPadding;
            }
            if (left < viewportPadding) left = viewportPadding;

            const belowTop = rect.bottom + gap;
            const aboveTop = rect.top - estimatedHeight - gap;
            const fitsBelow = belowTop + estimatedHeight <= window.innerHeight - viewportPadding;
            const fitsAbove = aboveTop >= viewportPadding;
            const top = fitsBelow
                ? belowTop
                : fitsAbove
                  ? aboveTop
                  : Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);

            setPanelPos({ top, left, width });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const displayValue =
        !value ? 'اختر نوع الإجراء...' : value === OTHER_VALUE ? 'أخرى — يرجى التحديد' : value;

    const dropdownLayer =
        open && panelPos
            ? createPortal(
                  <>
                      <div
                          className="fixed inset-0 z-[10050] bg-black/50"
                          aria-hidden
                          onMouseDown={() => setOpen(false)}
                      />
                      <div
                          ref={panelRef}
                          role="listbox"
                          style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
                          className="fixed z-[10061] rounded-lg border border-white/10 bg-[#0B1021] overflow-hidden"
                      >
                          <div className="px-3 py-2 border-b border-white/10">
                              <p className="text-[11px] font-bold text-white/50">تصنيف الإجراء</p>
                          </div>
                          <div className="max-h-[min(380px,65vh)] overflow-y-auto overscroll-y-contain p-3 space-y-3">
                              {GROUPS.map((group) => (
                                  <div key={group.id} className="space-y-1.5">
                                      <div className="px-1 text-[11px] font-bold text-white/45">
                                          {group.label}
                                      </div>
                                      <div className="space-y-1">
                                          {group.options.map((option) => {
                                              const selected = value === option;
                                              return (
                                                  <button
                                                      key={option}
                                                      type="button"
                                                      role="option"
                                                      aria-selected={selected}
                                                      onClick={() => {
                                                          onChange(option);
                                                          setOpen(false);
                                                      }}
                                                      className={`w-full text-right px-3 py-2.5 min-h-[44px] rounded-lg border text-sm font-semibold touch-manipulation ${
                                                          selected
                                                              ? 'border-white/20 bg-white/[0.12] text-white'
                                                              : 'border-white/10 bg-transparent text-white/80 hover:bg-white/[0.06] hover:text-white'
                                                      }`}
                                                  >
                                                      <span className="min-w-0 leading-snug">{option}</span>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              ))}

                              <div className="pt-2 border-t border-white/10">
                                  <button
                                      type="button"
                                      role="option"
                                      aria-selected={value === OTHER_VALUE}
                                      onClick={() => {
                                          onChange(OTHER_VALUE);
                                          setOpen(false);
                                      }}
                                      className={`w-full text-right px-3 py-2.5 min-h-[44px] rounded-lg border text-sm font-semibold touch-manipulation ${
                                          value === OTHER_VALUE
                                              ? 'border-white/20 bg-white/[0.12] text-white'
                                              : 'border-white/10 bg-transparent text-white/55 hover:bg-white/[0.06] hover:text-white'
                                      }`}
                                  >
                                      أخرى — يرجى التحديد
                                  </button>
                              </div>
                          </div>
                      </div>
                  </>,
                  document.body,
              )
            : null;

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`${URGENT_DOSSIER_INPUT} flex items-center justify-between gap-3 text-right cursor-pointer touch-manipulation ${
                    open ? 'border-white/25' : ''
                }`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={`min-w-0 flex-1 truncate ${value ? 'text-white' : 'text-white/40'}`}>
                    {displayValue}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-white/45 ${open ? 'rotate-180' : ''}`} />
            </button>
            {dropdownLayer}
        </div>
    );
}
