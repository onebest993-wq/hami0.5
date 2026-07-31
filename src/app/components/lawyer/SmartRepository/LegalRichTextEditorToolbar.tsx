import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, ChevronLeft, ChevronRight, Eraser, Highlighter } from 'lucide-react';
import { FONT_SIZES, TEXT_COLORS } from './legalRichTextEditorConstants';
import { LEGAL_HIGHLIGHT_COLORS } from './legalRichTextEditorHighlight';
import { REPO_TOUCH_ICON } from './smartRepositoryTheme';

type LegalRichTextEditorToolbarProps = {
    activeBold: boolean;
    activeForeColor: string | null;
    activeHighlightColor: string | null;
    onToggleBold: () => void;
    onFontSize: (value: string) => void;
    onToggleForeColor: (color: string) => void;
    onApplyHighlightColor: (color: string) => void;
    onClearHighlight: () => void;
    /** شريط مصغّر أفقي قابل للتمرير (نمط Apple Notes) — لا يغيّر النسخة الافتراضية */
    compact?: boolean;
};

/** أيقونات حجم الخط للنسخة المصغّرة — حرف واحد بحجم متدرّج بدل أزرار نصية عريضة */
const COMPACT_SIZE_GLYPHS: Record<string, string> = {
    '2': 'text-[10px]',
    '3': 'text-[13px]',
    '5': 'text-[16px]',
};

type CompactOverflowState = {
    overflowing: boolean;
    atStart: boolean;
    atEnd: boolean;
};

/**
 * تمرير الشريط المصغّر: الـ scrollbar مخفي، لذا نوفّر ثلاث وسائل صريحة —
 * سحب بالماوس/القلم، عجلة الماوس (عمودي → أفقي)، وأسهم تنقّل عند الطرفين.
 * اللمس يعتمد overflow-x-auto الأصلي بلا تدخّل.
 */
function useCompactToolbarScroll() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });
    const [overflow, setOverflow] = useState<CompactOverflowState>({
        overflowing: false,
        atStart: true,
        atEnd: false,
    });

    const syncOverflow = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        const pos = Math.abs(el.scrollLeft);
        setOverflow((prev) => {
            const next = {
                overflowing: max > 1,
                atStart: pos <= 1,
                atEnd: pos >= max - 1,
            };
            return prev.overflowing === next.overflowing &&
                prev.atStart === next.atStart &&
                prev.atEnd === next.atEnd
                ? prev
                : next;
        });
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        syncOverflow();
        const resizeObserver =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncOverflow) : null;
        resizeObserver?.observe(el);

        // عجلة الماوس العمودية تحرّك الشريط أفقياً (rtl: الاتجاه معكوس)
        const onWheel = (e: WheelEvent) => {
            if (el.scrollWidth <= el.clientWidth + 1) return;
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            const rtl = getComputedStyle(el).direction === 'rtl';
            el.scrollLeft += rtl ? -e.deltaY : e.deltaY;
            e.preventDefault();
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('scroll', syncOverflow, { passive: true });
        return () => {
            resizeObserver?.disconnect();
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('scroll', syncOverflow);
        };
    }, [syncOverflow]);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'touch') return; // اللمس له تمرير أصلي
        const el = scrollRef.current;
        if (!el) return;
        dragRef.current = { active: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const el = scrollRef.current;
        if (!drag.active || !el) return;
        const dx = e.clientX - drag.startX;
        if (!drag.moved && Math.abs(dx) > 4) {
            drag.moved = true;
            el.setPointerCapture(e.pointerId);
        }
        if (drag.moved) el.scrollLeft = drag.startScroll - dx;
    }, []);

    const endDrag = useCallback(() => {
        dragRef.current.active = false;
    }, []);

    const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragRef.current.moved) return;
        // السحب انتهى بنقرة عرضية فوق زر — لا نُفعّل الأداة
        dragRef.current.moved = false;
        e.preventDefault();
        e.stopPropagation();
    }, []);

    /** توجيه فيزيائي: في rtl البداية يمين (+scrollLeft نحو 0) والنهاية يسار (−) */
    const scrollTowards = useCallback((edge: 'start' | 'end') => {
        const el = scrollRef.current;
        if (!el) return;
        const rtl = getComputedStyle(el).direction === 'rtl';
        const step = Math.max(el.clientWidth * 0.6, 120);
        const physicalDir = edge === 'end' ? (rtl ? -1 : 1) : rtl ? 1 : -1;
        el.scrollBy({ left: physicalDir * step, behavior: 'smooth' });
    }, []);

    return {
        scrollRef,
        overflow,
        scrollTowards,
        dragHandlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
            onPointerLeave: endDrag,
            onClickCapture,
        },
    };
}

function CompactToolbarNavButton({
    edge,
    disabled,
    onClick,
}: {
    edge: 'start' | 'end';
    disabled: boolean;
    onClick: () => void;
}) {
    // rtl: زر البداية على اليمين بصرياً (سهم يمين)، زر النهاية على اليسار (سهم يسار)
    const Icon = edge === 'start' ? ChevronRight : ChevronLeft;
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            className="flex h-9 w-6 shrink-0 touch-manipulation items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
            aria-label={edge === 'start' ? 'بداية شريط الأدوات' : 'مزيد من الأدوات'}
            data-testid={`compact-toolbar-nav-${edge}`}
        >
            <Icon size={14} />
        </button>
    );
}

function CompactToolbar({
    activeBold,
    activeForeColor,
    activeHighlightColor,
    onToggleBold,
    onFontSize,
    onToggleForeColor,
    onApplyHighlightColor,
    onClearHighlight,
}: Omit<LegalRichTextEditorToolbarProps, 'compact'>) {
    const { scrollRef, overflow, scrollTowards, dragHandlers } = useCompactToolbarScroll();
    const btnBase =
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg touch-manipulation transition-colors';
    return (
        <div className="flex w-full items-center gap-0.5 rounded-xl border border-white/[0.08] bg-[#0A0F1C]/55 px-1 py-1">
            {overflow.overflowing ? (
                <CompactToolbarNavButton
                    edge="start"
                    disabled={overflow.atStart}
                    onClick={() => scrollTowards('start')}
                />
            ) : null}
            <div
                ref={scrollRef}
                className="flex min-w-0 flex-1 cursor-grab items-center gap-2 overflow-x-auto whitespace-nowrap px-0.5 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="toolbar"
                aria-label="أدوات تنسيق النص"
                onMouseDown={(e) => e.preventDefault()}
                {...dragHandlers}
            >
                <button
                    type="button"
                    onClick={onToggleBold}
                    className={`${btnBase} ${activeBold ? 'bg-[#E6C673]/15 text-[#E6C673]' : 'text-white/75 hover:bg-white/10'}`}
                    aria-label="عريض"
                    aria-pressed={activeBold}
                >
                    <Bold size={14} />
                </button>
                {FONT_SIZES.map((size) => (
                    <button
                        key={size.value}
                        type="button"
                        onClick={() => onFontSize(size.value)}
                        className={`${btnBase} font-black text-white/70 hover:bg-white/10 ${COMPACT_SIZE_GLYPHS[size.value] ?? 'text-[13px]'}`}
                        aria-label={`حجم الخط ${size.label}`}
                        title={size.label}
                    >
                        أ
                    </button>
                ))}
                <span className="mx-1 h-4 w-px shrink-0 bg-white/10" aria-hidden />
                {TEXT_COLORS.map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onToggleForeColor(color)}
                        className={`${btnBase} hover:bg-white/10`}
                        aria-label={`لون النص ${color}`}
                        aria-pressed={activeForeColor === color}
                    >
                        <span
                            className={`h-4 w-4 rounded-full border ${
                                activeForeColor === color
                                    ? 'border-[#E6C673] ring-2 ring-[#E6C673]/40'
                                    : 'border-white/25'
                            }`}
                            style={{ background: color }}
                            aria-hidden
                        />
                    </button>
                ))}
                <span className="mx-1 h-4 w-px shrink-0 bg-white/10" aria-hidden />
                <Highlighter size={12} className="shrink-0 text-white/35" aria-hidden />
                {LEGAL_HIGHLIGHT_COLORS.map((color, i) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onApplyHighlightColor(color)}
                        className={`${btnBase} hover:bg-white/10`}
                        aria-label={`تأشير ${i + 1}`}
                        aria-pressed={activeHighlightColor === color}
                        title="حدّد النص ثم اضغط للتأشير"
                    >
                        <span
                            className={`h-4 w-4 rounded border transition-transform ${
                                activeHighlightColor === color
                                    ? 'scale-110 border-[#E6C673] ring-2 ring-[#E6C673]/45'
                                    : 'border-white/25'
                            }`}
                            style={{ background: color }}
                            aria-hidden
                        />
                    </button>
                ))}
                <button
                    type="button"
                    onClick={onClearHighlight}
                    className={`${btnBase} text-white/50 hover:bg-white/10 hover:text-white/85`}
                    aria-label="إزالة التأشير"
                    title="إزالة التأشير من النص المحدّد"
                >
                    <Eraser size={13} />
                </button>
            </div>
            {overflow.overflowing ? (
                <CompactToolbarNavButton
                    edge="end"
                    disabled={overflow.atEnd}
                    onClick={() => scrollTowards('end')}
                />
            ) : null}
        </div>
    );
}

export function LegalRichTextEditorToolbar({
    activeBold,
    activeForeColor,
    activeHighlightColor,
    onToggleBold,
    onFontSize,
    onToggleForeColor,
    onApplyHighlightColor,
    onClearHighlight,
    compact = false,
}: LegalRichTextEditorToolbarProps) {
    if (compact) {
        return (
            <CompactToolbar
                activeBold={activeBold}
                activeForeColor={activeForeColor}
                activeHighlightColor={activeHighlightColor}
                onToggleBold={onToggleBold}
                onFontSize={onFontSize}
                onToggleForeColor={onToggleForeColor}
                onApplyHighlightColor={onApplyHighlightColor}
                onClearHighlight={onClearHighlight}
            />
        );
    }
    return (
        <div
            className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-white/[0.10] bg-[#0A0F1C]/60 backdrop-blur-sm"
            role="toolbar"
            aria-label="أدوات تنسيق النص"
        >
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onToggleBold}
                className={`${REPO_TOUCH_ICON} rounded-lg hover:bg-white/10 ${activeBold ? 'bg-[#E6C673]/15 text-[#E6C673]' : 'text-white/80'}`}
                aria-label="عريض"
                aria-pressed={activeBold}
            >
                <Bold size={16} />
            </button>
            {FONT_SIZES.map((size) => (
                <button
                    key={size.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onFontSize(size.value)}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-2 rounded-lg text-[11px] font-bold text-white/75 hover:bg-white/10 touch-manipulation"
                >
                    {size.label}
                </button>
            ))}
            <span className="w-px h-5 bg-white/10 mx-0.5" aria-hidden />
            {TEXT_COLORS.map((color) => (
                <button
                    key={color}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onToggleForeColor(color)}
                    className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border ${
                        activeForeColor === color ? 'border-[#E6C673] ring-2 ring-[#E6C673]/40' : 'border-white/20'
                    } touch-manipulation`}
                    style={{ background: color }}
                    aria-label={`لون النص ${color}`}
                    aria-pressed={activeForeColor === color}
                />
            ))}
            <span className="w-px h-5 bg-white/10 mx-0.5" aria-hidden />
            <Highlighter size={14} className="text-white/35 shrink-0" aria-hidden />
            {LEGAL_HIGHLIGHT_COLORS.map((color, i) => (
                <button
                    key={color}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onApplyHighlightColor(color)}
                    className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md border transition-all touch-manipulation ${
                        activeHighlightColor === color
                            ? 'border-[#E6C673] ring-2 ring-[#E6C673]/45 scale-105'
                            : 'border-white/20 hover:border-white/35'
                    }`}
                    style={{ background: color }}
                    aria-label={`تأشير ${i + 1}`}
                    aria-pressed={activeHighlightColor === color}
                    title="حدّد النص ثم اضغط للتأشير — أو فعّل وضع التأشير للكتابة — اضغط مجدداً لإيقافه"
                />
            ))}
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onClearHighlight}
                className={`${REPO_TOUCH_ICON} rounded-lg border border-white/15 text-white/55 hover:text-white/85 hover:bg-white/10 transition-colors`}
                aria-label="إزالة التأشير"
                title="إزالة التأشير من النص المحدّد"
            >
                <Eraser size={14} />
            </button>
        </div>
    );
}
