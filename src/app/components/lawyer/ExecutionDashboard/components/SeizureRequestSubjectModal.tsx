import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';

export type SeizureRequestSubjectModalTone = 'amber' | 'sky';

const TONE_STYLES: Record<
    SeizureRequestSubjectModalTone,
    {
        border: string;
        headerBorder: string;
        title: string;
        submit: string;
    }
> = {
    amber: {
        border: 'border-2 border-amber-500/35',
        headerBorder: 'border-b border-amber-500/20',
        title: 'text-amber-200',
        submit: 'border border-amber-500/35 bg-amber-600/15 text-amber-100 hover:bg-amber-600/20',
    },
    sky: {
        border: 'border-2 border-sky-500/35',
        headerBorder: 'border-b border-sky-500/20',
        title: 'text-sky-200',
        submit: 'border border-sky-500/35 bg-sky-600/15 text-sky-100 hover:bg-sky-600/20',
    },
};

export type SeizureRequestSubjectModalProps = {
    open: boolean;
    title: string;
    placeholder: string;
    subjectDraft: string;
    tone?: SeizureRequestSubjectModalTone;
    onClose: () => void;
    onSubjectDraftChange: (value: string) => void;
    onSubmit: () => void;
};

export function SeizureRequestSubjectModal({
    open,
    title,
    placeholder,
    subjectDraft,
    tone = 'sky',
    onClose,
    onSubjectDraftChange,
    onSubmit,
}: SeizureRequestSubjectModalProps) {
    if (!open || typeof document === 'undefined') return null;

    const styles = TONE_STYLES[tone];

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={`w-full max-w-md rounded-3xl bg-[#0B1120] shadow-2xl shadow-black/50 ${styles.border}`}
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className={`flex items-center justify-between p-4 ${styles.headerBorder}`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <p className={`text-[12px] font-black ${styles.title}`}>{title}</p>
                    <span className="w-8" aria-hidden />
                </div>
                <div className="p-4 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                        <label className="block text-[10px] text-slate-400 text-right mb-2">موضوع الطلب</label>
                        <textarea
                            value={subjectDraft}
                            onChange={(e) => onSubjectDraftChange(e.target.value)}
                            className="min-h-[96px] w-full resize-none rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                            placeholder={placeholder}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onSubmit}
                        className={`w-full rounded-2xl px-4 py-3 text-[12px] font-black ${styles.submit}`}
                    >
                        إرسال إلى المنفذ
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
