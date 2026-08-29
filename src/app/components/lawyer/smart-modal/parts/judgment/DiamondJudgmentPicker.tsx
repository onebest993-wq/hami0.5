import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { Check } from '@/app/components/ui/icons/Check';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import type { JudgmentOption } from './judgmentOptionsForStage';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';

function eventInside(el: HTMLElement | null, event: Event): boolean {
    if (!el) return false;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (path.includes(el)) return true;
    const target = event.target;
    return target instanceof Node && el.contains(target);
}

export function DiamondJudgmentPicker({
    value,
    onChange,
    options,
    styles: s,
}: {
    value: string;
    onChange: (value: string) => void;
    options: JudgmentOption[];
    styles: JudgmentModalStyles;
}) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<{
        top: number;
        left: number;
        width: number;
        maxHeight: number;
    } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const suppressTriggerClickRef = useRef(false);
    const selected = options.find((o) => o.value === value);

    const closeMenu = useCallback(() => {
        setOpen(false);
        setMenuStyle(null);
    }, []);

    const choose = useCallback(
        (next: string) => {
            onChange(next);
            closeMenu();
            suppressTriggerClickRef.current = true;
        },
        [onChange, closeMenu],
    );

    const updateMenuPosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const gap = 8;
        const padding = 12;
        const preferredMax = 280;
        const spaceBelow = window.innerHeight - rect.bottom - gap - padding;
        const spaceAbove = rect.top - gap - padding;

        let maxHeight = Math.min(preferredMax, Math.max(spaceBelow, 0));
        let top = rect.bottom + gap;

        if (maxHeight < 120 && spaceAbove > spaceBelow) {
            maxHeight = Math.min(preferredMax, spaceAbove);
            top = Math.max(padding, rect.top - gap - maxHeight);
        }

        setMenuStyle({
            top,
            left: rect.left,
            width: rect.width,
            maxHeight: Math.max(maxHeight, 120),
        });
    }, []);

    useEffect(() => {
        if (!open) {
            setMenuStyle(null);
            return;
        }
        updateMenuPosition();
        const onReposition = () => updateMenuPosition();
        window.addEventListener('resize', onReposition);
        window.addEventListener('scroll', onReposition, true);
        return () => {
            window.removeEventListener('resize', onReposition);
            window.removeEventListener('scroll', onReposition, true);
        };
    }, [open, updateMenuPosition]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (eventInside(menuRef.current, event)) return;
            if (eventInside(triggerRef.current, event)) return;
            closeMenu();
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open, closeMenu]);

    const menuPortal =
        open && menuStyle && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      ref={menuRef}
                      role="listbox"
                      dir="rtl"
                      style={{
                          position: 'fixed',
                          top: menuStyle.top,
                          left: menuStyle.left,
                          width: menuStyle.width,
                          maxHeight: menuStyle.maxHeight,
                          zIndex: 320,
                      }}
                      className={s.diamondMenu}
                      onPointerDown={(event) => event.stopPropagation()}
                  >
                      {options.map((option) => {
                          const isActive = value === option.value;
                          return (
                              <button
                                  key={option.value}
                                  type="button"
                                  role="option"
                                  aria-selected={isActive}
                                  data-testid={`smart-judgment-option-${option.value}`}
                                  onPointerDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      choose(option.value);
                                  }}
                                  onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      choose(option.value);
                                  }}
                                  className={isActive ? s.diamondOptionActive : s.diamondOptionIdle}
                              >
                                  <span className="min-w-0 flex-1 text-right">
                                      <span className="block truncate">{option.label}</span>
                                      {option.hint ? (
                                          <span className="block text-[10px] font-normal text-white/35 truncate mt-0.5">
                                              {option.hint}
                                          </span>
                                      ) : null}
                                  </span>
                                  {isActive ? (
                                      <Check size={14} className={`shrink-0 ${s.accentCheck}`} />
                                  ) : null}
                              </button>
                          );
                      })}
                  </div>,
                  document.body,
              )
            : null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker}
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => {
                    if (suppressTriggerClickRef.current) {
                        suppressTriggerClickRef.current = false;
                        return;
                    }
                    if (open) {
                        closeMenu();
                        return;
                    }
                    updateMenuPosition();
                    setOpen(true);
                }}
                className={s.diamondTrigger}
            >
                <span className={`min-w-0 flex-1 truncate ${value ? 'text-white' : 'text-white/40'}`}>
                    {selected ? (
                        <>
                            <span className="block truncate">{selected.label}</span>
                            {selected.hint ? (
                                <span className="block text-[10px] font-normal text-white/35 truncate mt-0.5">
                                    {selected.hint}
                                </span>
                            ) : null}
                        </>
                    ) : (
                        'اختر النتيجة...'
                    )}
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 ${s.accentChevron} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {menuPortal}
        </>
    );
}
