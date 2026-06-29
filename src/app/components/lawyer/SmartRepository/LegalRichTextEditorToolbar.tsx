import React from 'react';
import { Bold, Eraser, Highlighter } from 'lucide-react';
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
};

export function LegalRichTextEditorToolbar({
    activeBold,
    activeForeColor,
    activeHighlightColor,
    onToggleBold,
    onFontSize,
    onToggleForeColor,
    onApplyHighlightColor,
    onClearHighlight,
}: LegalRichTextEditorToolbarProps) {
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
