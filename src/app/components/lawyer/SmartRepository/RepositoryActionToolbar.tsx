import React from 'react';
import { FileText, ImageIcon, Mic, Plus, Scan } from 'lucide-react';
import { REPO_ACTION_BTN, REPO_ACTION_GRID } from './smartRepositoryTheme';

type RepositoryActionToolbarProps = {
    onCreateNote: () => void;
    onOpenScanner: () => void;
    onOpenVoice: () => void;
    disabled?: boolean;
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    pdfInputRef: React.RefObject<HTMLInputElement | null>;
    onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPdfSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

type ActionTone = 'gold' | 'emerald' | 'sky' | 'rose' | 'violet' | 'slate';

const TONE_CLASS: Record<ActionTone, string> = {
    gold: 'border-[#E6C673]/28 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/16 hover:border-[#E6C673]/40',
    emerald: 'border-emerald-400/28 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/16 hover:border-emerald-400/40',
    sky: 'border-sky-400/28 bg-sky-500/10 text-sky-300 hover:bg-sky-500/16 hover:border-sky-400/40',
    rose: 'border-rose-400/28 bg-rose-500/10 text-rose-300 hover:bg-rose-500/16 hover:border-rose-400/40',
    violet: 'border-violet-400/28 bg-violet-500/10 text-violet-300 hover:bg-violet-500/16 hover:border-violet-400/40',
    slate: 'border-white/14 bg-white/[0.05] text-white/65 hover:bg-white/[0.08] hover:border-white/22 hover:text-[#E6C673]',
};

function ActionCell({
    tone,
    label,
    icon,
    onClick,
    testId,
    children,
    disabled = false,
}: {
    tone: ActionTone;
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    testId?: string;
    children?: React.ReactNode;
    disabled?: boolean;
}) {
    const className = `${REPO_ACTION_BTN} ${TONE_CLASS[tone]} ${disabled ? 'opacity-40 pointer-events-none' : ''}`;
    if (children) {
        return (
            <label
                className={`${className} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                data-testid={testId}
                aria-disabled={disabled}
            >
                {icon}
                <span>{label}</span>
                {children}
            </label>
        );
    }
    return (
        <button type="button" onClick={onClick} className={className} data-testid={testId} disabled={disabled}>
            {icon}
            <span>{label}</span>
        </button>
    );
}

export function RepositoryActionToolbar({
    onCreateNote,
    onOpenScanner,
    onOpenVoice,
    disabled = false,
    imageInputRef,
    pdfInputRef,
    onImageSelect,
    onPdfSelect,
}: RepositoryActionToolbarProps) {
    return (
        <div className={REPO_ACTION_GRID} dir="rtl">
            <ActionCell
                tone="gold"
                label="بطاقة"
                icon={<Plus size={17} strokeWidth={2.25} />}
                onClick={onCreateNote}
                testId="repository-note-create"
                disabled={disabled}
            />
            <ActionCell
                tone="emerald"
                label="مسح"
                icon={<Scan size={17} strokeWidth={2.25} />}
                onClick={onOpenScanner}
                testId="repository-open-scanner"
                disabled={disabled}
            />
            <ActionCell tone="sky" label="صورة" icon={<ImageIcon size={17} strokeWidth={2.25} />} testId="repository-upload-image" disabled={disabled}>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={onImageSelect}
                />
            </ActionCell>
            <ActionCell tone="rose" label="PDF" icon={<FileText size={17} strokeWidth={2.25} />} testId="repository-upload-pdf" disabled={disabled}>
                <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="sr-only"
                    onChange={onPdfSelect}
                />
            </ActionCell>
            <ActionCell
                tone="violet"
                label="تسجيل"
                icon={<Mic size={17} strokeWidth={2.25} />}
                onClick={onOpenVoice}
                testId="repository-voice-record"
                disabled={disabled}
            />
        </div>
    );
}
