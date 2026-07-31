import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { URGENT_DOSSIER_INPUT } from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';
import {
    PETITION_ORDERS_DROPDOWN_OPTIONS,
    URGENT_JUDICIARY_DROPDOWN_OPTIONS,
    PROCEDURE_CATEGORY_GROUP_LABELS,
    resolveProcedureCategory,
} from './constants';

const OTHER_VALUE = 'other';

const GROUPS = [
    {
        id: 'petition_orders' as const,
        label: PROCEDURE_CATEGORY_GROUP_LABELS.petition_orders,
        options: PETITION_ORDERS_DROPDOWN_OPTIONS,
        headerClass: 'text-[#E6C673] bg-[#E6C673]/8 border-[#E6C673]/20',
        itemActiveClass: 'border-[#E6C673]/35 bg-[#E6C673]/12 text-[#F5F0E6]',
        dotClass: 'bg-[#E6C673]',
    },
    {
        id: 'urgent_judiciary' as const,
        label: PROCEDURE_CATEGORY_GROUP_LABELS.urgent_judiciary,
        options: URGENT_JUDICIARY_DROPDOWN_OPTIONS,
        headerClass: 'text-cyan-200 bg-cyan-500/8 border-cyan-500/20',
        itemActiveClass: 'border-cyan-500/35 bg-cyan-500/12 text-cyan-50',
        dotClass: 'bg-cyan-400',
    },
];

function categoryForValue(value: string): 'petition_orders' | 'urgent_judiciary' | null {
    if (!value || value === OTHER_VALUE) return null;
    if ((PETITION_ORDERS_DROPDOWN_OPTIONS as readonly string[]).includes(value)) return 'petition_orders';
    if ((URGENT_JUDICIARY_DROPDOWN_OPTIONS as readonly string[]).includes(value)) return 'urgent_judiciary';
    return resolveProcedureCategory(null, value);
}

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

    const selectedCategory = categoryForValue(value);
    const selectedGroup = GROUPS.find((g) => g.id === selectedCategory);

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
                          className="fixed inset-0 z-[10050] bg-[#05060D]/55 backdrop-blur-[2px]"
                          aria-hidden
                          onMouseDown={() => setOpen(false)}
                      />
                      <div
                          ref={panelRef}
                          role="listbox"
                          style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
                          className="fixed z-[10061] rounded-2xl border border-[#E6C673]/25 bg-[#0A0F1C] shadow-[0_24px_64px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06] overflow-hidden"
                      >
                          <div className="px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                              <p className="text-[11px] font-bold text-white/50">تصنيف الإجراء</p>
                          </div>
                          <div className="max-h-[min(380px,65vh)] overflow-y-auto overscroll-y-contain p-3 space-y-4">
                              {GROUPS.map((group) => (
                                  <div key={group.id} className="space-y-2">
                                      <div
                                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-extrabold tracking-wide ${group.headerClass}`}
                                      >
                                          {group.label}
                                      </div>
                                      <div className="space-y-1.5">
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
                                                      className={`w-full text-right px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors touch-manipulation flex items-center gap-2.5 ${
                                                          selected
                                                              ? group.itemActiveClass
                                                              : 'border-white/[0.06] bg-[#12182a] text-white/80 hover:border-white/12 hover:bg-[#161d32] hover:text-white'
                                                      }`}
                                                  >
                                                      <span
                                                          className={`shrink-0 w-1.5 h-1.5 rounded-full ${group.dotClass} ${selected ? 'opacity-100' : 'opacity-35'}`}
                                                          aria-hidden
                                                      />
                                                      <span className="min-w-0 flex-1 leading-snug">{option}</span>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              ))}

                              <div className="pt-2 border-t border-white/[0.08]">
                                  <button
                                      type="button"
                                      role="option"
                                      aria-selected={value === OTHER_VALUE}
                                      onClick={() => {
                                          onChange(OTHER_VALUE);
                                          setOpen(false);
                                      }}
                                      className={`w-full text-right px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors touch-manipulation ${
                                          value === OTHER_VALUE
                                              ? 'border-white/20 bg-white/10 text-white'
                                              : 'border-white/[0.06] bg-[#12182a] text-white/55 hover:border-white/12 hover:bg-[#161d32] hover:text-white'
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
                    open ? 'border-[#E6C673]/45 ring-1 ring-[#E6C673]/20' : ''
                }`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="min-w-0 flex-1 flex items-center gap-2">
                    {selectedGroup ? (
                        <span
                            className={`shrink-0 w-1.5 h-1.5 rounded-full ${selectedGroup.dotClass}`}
                            aria-hidden
                        />
                    ) : null}
                    <span className={`truncate ${value ? 'text-white' : 'text-white/40'}`}>{displayValue}</span>
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-[#E6C673]/70 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {dropdownLayer}
        </div>
    );
}
