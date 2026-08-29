import React from 'react';
import { Bold } from '@/app/components/ui/icons/Bold';
import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import { Eraser } from '@/app/components/ui/icons/Eraser';
import { Highlighter } from '@/app/components/ui/icons/Highlighter';
import { FONT_SIZES, TEXT_COLORS } from './legalRichTextEditorConstants';
import { LEGAL_HIGHLIGHT_COLORS } from './legalRichTextEditorHighlight';
import { useCompactToolbarScroll } from './hooks/useCompactToolbarScroll';
import type { LegalRichTextEditorToolbarActions } from './legalRichTextEditorToolbarTypes';

type LegalRichTextEditorCompactToolbarProps = LegalRichTextEditorToolbarActions;

const COMPACT_SIZE_GLYPHS: Record<string, string> = {
    '2': 'text-[10px]',
    '3': 'text-[13px]',
    '5': 'text-[16px]',
};

function CompactToolbarNavButton({
    edge,
    disabled,
    onClick,
}: {
    edge: 'start' | 'end';
    disabled: boolean;
    onClick: () => void;
}) {
    // rtl: ╪▓╪▒ ╪د┘╪ذ╪»╪د┘è╪ر ╪╣┘┘ë ╪د┘┘è┘à┘è┘ ╪ذ╪╡╪▒┘è╪د┘ï (╪│┘ç┘à ┘è┘à┘è┘)╪î ╪▓╪▒ ╪د┘┘┘ç╪د┘è╪ر ╪╣┘┘ë ╪د┘┘è╪│╪د╪▒ (╪│┘ç┘à ┘è╪│╪د╪▒)
    const Icon = edge === 'start' ? ChevronRight : ChevronLeft;
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            className="flex min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
            aria-label={edge === 'start' ? '╪ذ╪»╪د┘è╪ر ╪┤╪▒┘è╪╖ ╪د┘╪ث╪»┘ê╪د╪ز' : '┘à╪▓┘è╪» ┘à┘ ╪د┘╪ث╪»┘ê╪د╪ز'}
            data-testid={`compact-toolbar-nav-${edge}`}
        >
            <Icon size={14} />
        </button>
    );
}

export function LegalRichTextEditorCompactToolbar({
    activeBold,
    activeForeColor,
    activeHighlightColor,
    onToggleBold,
    onFontSize,
    onToggleForeColor,
    onApplyHighlightColor,
    onClearHighlight,
}: LegalRichTextEditorCompactToolbarProps) {
    const { scrollRef, overflow, scrollTowards, dragHandlers } = useCompactToolbarScroll();
    const btnBase =
        'inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg touch-manipulation transition-colors';
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
                className="flex min-w-0 flex-1 cursor-grab items-center gap-2 overflow-x-auto whitespace-nowrap px-0.5 touch-pan-x active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="toolbar"
                aria-label="╪ث╪»┘ê╪د╪ز ╪ز┘╪│┘è┘é ╪د┘┘╪╡"
                onMouseDown={(e) => e.preventDefault()}
                {...dragHandlers}
            >
                <button
                    type="button"
                    onClick={onToggleBold}
                    className={`${btnBase} ${activeBold ? 'bg-[#E6C673]/15 text-[#E6C673]' : 'text-white/75 hover:bg-white/10'}`}
                    aria-label="╪╣╪▒┘è╪╢"
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
                        aria-label={`╪ص╪ش┘à ╪د┘╪«╪╖ ${size.label}`}
                        title={size.label}
                    >
                        ╪ث
                    </button>
                ))}
                <span className="mx-1 h-4 w-px shrink-0 bg-white/10" aria-hidden />
                {TEXT_COLORS.map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onToggleForeColor(color)}
                        className={`${btnBase} hover:bg-white/10`}
                        aria-label={`┘┘ê┘ ╪د┘┘╪╡ ${color}`}
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
                        aria-label={`╪ز╪ث╪┤┘è╪▒ ${i + 1}`}
                        aria-pressed={activeHighlightColor === color}
                        title="╪ص╪»┘ّ╪» ╪د┘┘╪╡ ╪س┘à ╪د╪╢╪║╪╖ ┘┘╪ز╪ث╪┤┘è╪▒"
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
                    aria-label="╪ح╪▓╪د┘╪ر ╪د┘╪ز╪ث╪┤┘è╪▒"
                    title="╪ح╪▓╪د┘╪ر ╪د┘╪ز╪ث╪┤┘è╪▒ ┘à┘ ╪د┘┘╪╡ ╪د┘┘à╪ص╪»┘ّ╪»"
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
