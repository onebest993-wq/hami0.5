import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileText, ImageIcon, Mic, Plus, Scan } from '@/app/components/ui/lucideIcons';
import { REPO_ADD_MENU_BTN, REPO_ADD_MENU_ITEM, REPO_ADD_MENU_PANEL } from './smartRepositoryTheme';

type RepositoryAddMenuProps = {
    onCreateNote: () => void;
    onOpenScanner: () => void;
    onOpenVoice: () => void;
    disabled?: boolean;
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    pdfInputRef: React.RefObject<HTMLInputElement | null>;
    onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPdfSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

/**
 * زر ذهبي «+ إضافة» بجانب البحث — يستبدل شبكة الأزرار الخمسة الكبيرة.
 */
export function RepositoryAddMenu({
    onCreateNote,
    onOpenScanner,
    onOpenVoice,
    disabled = false,
    imageInputRef,
    pdfInputRef,
    onImageSelect,
    onPdfSelect,
}: RepositoryAddMenuProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const run = (fn: () => void) => {
        if (disabled) return;
        setOpen(false);
        fn();
    };

    return (
        <div className="relative shrink-0" ref={rootRef} data-testid="repository-add-menu">
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                data-testid="repository-upload-image-input"
                onChange={(e) => {
                    setOpen(false);
                    onImageSelect(e);
                }}
            />
            <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="sr-only"
                data-testid="repository-upload-pdf-input"
                onChange={(e) => {
                    setOpen(false);
                    onPdfSelect(e);
                }}
            />

            <button
                type="button"
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={open}
                data-testid="repository-add-menu-trigger"
                onClick={() => !disabled && setOpen((v) => !v)}
                className={`${REPO_ADD_MENU_BTN} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
            >
                <Plus size={16} strokeWidth={2.5} aria-hidden />
                <span>إضافة</span>
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>

            {open ? (
                <div
                    role="menu"
                    className={REPO_ADD_MENU_PANEL}
                    data-testid="repository-add-menu-panel"
                >
                    <button
                        type="button"
                        role="menuitem"
                        data-testid="repository-note-create"
                        className={REPO_ADD_MENU_ITEM}
                        onClick={() => run(onCreateNote)}
                    >
                        <Plus size={15} aria-hidden />
                        بطاقة
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        data-testid="repository-open-scanner"
                        className={REPO_ADD_MENU_ITEM}
                        onClick={() => run(onOpenScanner)}
                    >
                        <Scan size={15} aria-hidden />
                        مسح ضوئي
                    </button>
                    <label
                        role="menuitem"
                        data-testid="repository-upload-image"
                        className={`${REPO_ADD_MENU_ITEM} cursor-pointer`}
                        onClick={() => {
                            if (disabled) return;
                            imageInputRef.current?.click();
                        }}
                    >
                        <ImageIcon size={15} aria-hidden />
                        صورة
                    </label>
                    <label
                        role="menuitem"
                        data-testid="repository-upload-pdf"
                        className={`${REPO_ADD_MENU_ITEM} cursor-pointer`}
                        onClick={() => {
                            if (disabled) return;
                            pdfInputRef.current?.click();
                        }}
                    >
                        <FileText size={15} aria-hidden />
                        PDF
                    </label>
                    <button
                        type="button"
                        role="menuitem"
                        data-testid="repository-voice-record"
                        className={REPO_ADD_MENU_ITEM}
                        onClick={() => run(onOpenVoice)}
                    >
                        <Mic size={15} aria-hidden />
                        تسجيل صوتي
                    </button>
                </div>
            ) : null}
        </div>
    );
}
