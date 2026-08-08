import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from '@/app/components/ui/lucideIcons';
import { cn } from './utils';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** ISO yyyy-MM-dd → dd/MM/yyyy */
export function isoYmdToDmy(iso: string): string {
    const m = String(iso ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    return `${m[3]}/${m[2]}/${m[1]}`;
}

/** dd/MM/yyyy → ISO yyyy-MM-dd (empty if invalid) */
export function dmyToIsoYmd(dmy: string): string {
    const m = String(dmy ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return '';
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return '';
    const iso = `${year}-${pad2(month)}-${pad2(day)}`;
    const check = new Date(`${iso}T12:00:00`);
    if (
        check.getFullYear() !== year ||
        check.getMonth() + 1 !== month ||
        check.getDate() !== day
    ) {
        return '';
    }
    return iso;
}

function parseIsoYmd(iso: string): Date | undefined {
    const m = String(iso ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return undefined;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function dateToIsoYmd(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAY_LABELS = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'] as const;
const MONTH_LABELS = [
    'كانون الثاني',
    'شباط',
    'آذار',
    'نيسان',
    'أيار',
    'حزيران',
    'تموز',
    'آب',
    'أيلول',
    'تشرين الأول',
    'تشرين الثاني',
    'كانون الأول',
] as const;

function buildMonthCells(viewYear: number, viewMonth: number): (Date | null)[] {
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push(new Date(viewYear, viewMonth, day, 12, 0, 0, 0));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

export type HamiDateInputProps = Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'type' | 'value' | 'onChange' | 'children'
> & {
    /** ISO yyyy-MM-dd */
    value: string;
    onValueChange?: (isoYmd: string) => void;
    min?: string;
    max?: string;
    placeholder?: string;
};

/**
 * Read-only DMY display + native graphical calendar (no react-day-picker / date-fns).
 * Calendar renders in a body portal at z-[9999] to escape overflow clipping.
 */
export const HamiDateInput: React.FC<HamiDateInputProps> = ({
    value,
    onValueChange,
    min,
    max,
    className = '',
    placeholder = 'اختر التاريخ من التقويم',
    disabled,
    ...rest
}) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const selected = parseIsoYmd(value);
    const minDate = min ? parseIsoYmd(min) : undefined;
    const maxDate = max ? parseIsoYmd(max) : undefined;
    const displayText = isoYmdToDmy(value);
    const today = useMemo(() => startOfDay(new Date()), []);

    const initialView = selected ?? today;
    const [viewYear, setViewYear] = useState(initialView.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialView.getMonth());

    useEffect(() => {
        if (!open) return;
        const anchor = selected ?? today;
        setViewYear(anchor.getFullYear());
        setViewMonth(anchor.getMonth());
    }, [open, value, selected, today]);

    useLayoutEffect(() => {
        if (!open || !triggerRef.current) {
            setPopoverPos(null);
            return;
        }
        const update = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const viewportPadding = 8;
            const gap = 6;
            const calendarWidth = Math.min(304, window.innerWidth - viewportPadding * 2);
            const popoverHeight = popoverRef.current?.offsetHeight ?? 392;

            let left = rect.left + (rect.width - calendarWidth) / 2;
            if (left + calendarWidth > window.innerWidth - viewportPadding) {
                left = window.innerWidth - calendarWidth - viewportPadding;
            }
            if (left < viewportPadding) left = viewportPadding;

            const belowTop = rect.bottom + gap;
            const aboveTop = rect.top - popoverHeight - gap;
            const fitsBelow = belowTop + popoverHeight <= window.innerHeight - viewportPadding;
            const fitsAbove = aboveTop >= viewportPadding;
            const top = fitsBelow
                ? belowTop
                : fitsAbove
                  ? aboveTop
                  : Math.max(viewportPadding, window.innerHeight - popoverHeight - viewportPadding);

            setPopoverPos({ top, left, width: calendarWidth });
        };
        update();
        const raf = requestAnimationFrame(update);
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, viewYear, viewMonth]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (ev: MouseEvent) => {
            const t = ev.target as Node;
            if (rootRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKeyDown = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);

    const isDisabledDay = (day: Date) => {
        const d = startOfDay(day);
        if (minDate && d < startOfDay(minDate)) return true;
        if (maxDate && d > startOfDay(maxDate)) return true;
        return false;
    };

    const shiftMonth = (delta: number) => {
        const d = new Date(viewYear, viewMonth + delta, 1);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
    };

    const pickDay = (day: Date) => {
        if (isDisabledDay(day)) return;
        onValueChange?.(dateToIsoYmd(day));
        setOpen(false);
    };

    const calendarPanel =
        open && !disabled && popoverPos ? (
            <div
                ref={popoverRef}
                role="dialog"
                aria-label="تقويم اختيار التاريخ"
                dir="rtl"
                style={{ top: popoverPos.top, left: popoverPos.left, width: popoverPos.width }}
                className="fixed z-[9999] flex max-h-[min(420px,calc(100dvh-16px))] flex-col overflow-hidden rounded-2xl border border-[#E6C673]/22 bg-[radial-gradient(circle_at_top,rgba(230,198,115,0.08),transparent_38%),linear-gradient(180deg,rgba(12,18,31,0.98),rgba(8,12,22,0.99))] shadow-[0_20px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl p-4 text-white"
            >
                <div className="flex shrink-0 items-center justify-between gap-2 mb-3 pb-2 border-b border-white/[0.06]">
                    <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        className="p-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-[#E6C673]/10 hover:border-[#E6C673]/25 transition-colors"
                        aria-label="الشهر السابق"
                    >
                        <ChevronRight className="size-4 text-[#E6C673]/85" />
                    </button>
                    <div className="text-sm font-black text-center flex-1 text-[#F4E9CD]">
                        {MONTH_LABELS[viewMonth]} <span className="text-[#E6C673] tabular-nums">{viewYear}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        className="p-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-[#E6C673]/10 hover:border-[#E6C673]/25 transition-colors"
                        aria-label="الشهر التالي"
                    >
                        <ChevronLeft className="size-4 text-[#E6C673]/85" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(230,198,115,0.2)_transparent]">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {WEEKDAY_LABELS.map((label) => (
                            <div key={label} className="text-center text-[10px] font-bold text-[#E6C673]/55 py-1">
                                {label}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {cells.map((day, idx) => {
                            if (!day) {
                                return <div key={`empty-${idx}`} className="h-9" />;
                            }
                            const disabledDay = isDisabledDay(day);
                            const isSelected = selected ? isSameDay(day, selected) : false;
                            const isToday = isSameDay(day, today);
                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    disabled={disabledDay}
                                    onClick={() => pickDay(day)}
                                    className={cn(
                                        'h-9 rounded-xl text-xs font-bold transition-colors',
                                        disabledDay && 'opacity-20 cursor-not-allowed',
                                        !disabledDay && !isSelected && 'hover:bg-white/[0.08] hover:border-white/[0.08] border border-transparent',
                                        isSelected && 'bg-[#E6C673] text-[#0B1021] shadow-[0_0_16px_rgba(230,198,115,0.35)] border border-[#E6C673]/60',
                                        !isSelected && isToday && 'ring-1 ring-[#E6C673]/45 bg-[#E6C673]/8 text-[#E6C673]',
                                    )}
                                >
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-3 shrink-0 pt-2 border-t border-white/[0.06] flex justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            if (!isDisabledDay(today)) pickDay(today);
                        }}
                        className="text-[11px] font-bold text-[#E6C673] px-3 py-1.5 rounded-lg border border-[#E6C673]/25 bg-[#E6C673]/10 hover:bg-[#E6C673]/16 transition-colors"
                    >
                        اليوم
                    </button>
                </div>
            </div>
        ) : null;

    return (
        <div ref={rootRef} className="relative z-[999] w-full">
            <button
                {...rest}
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => {
                    if (!disabled) setOpen((o) => !o);
                }}
                className={cn(
                    'w-full flex items-center justify-between gap-2 text-left cursor-pointer',
                    disabled && 'opacity-50 cursor-not-allowed',
                    className,
                )}
            >
                <span
                    dir="ltr"
                    className={cn('tabular-nums', displayText ? 'text-inherit' : 'text-white/30')}
                >
                    {displayText || placeholder}
                </span>
                <CalendarIcon className="size-4 shrink-0 text-[#E6C673]/85" aria-hidden />
            </button>

            {typeof document !== 'undefined' && calendarPanel ? createPortal(calendarPanel, document.body) : null}
        </div>
    );
};
