import React, { useState } from 'react';
import type { LawyerRequest } from '../criminalStore';
import { canAddLawyerRequestFollowUpMargin } from '../lawyerRequestsEngine';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../criminalModalPortal';

export const RequestStarToggle = ({
    starred,
    disabled,
    onToggle,
    className = '',
}: {
    starred: boolean;
    disabled?: boolean;
    onToggle: () => void;
    className?: string;
}) => (
    <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
            e.stopPropagation();
            onToggle();
        }}
        aria-label={starred ? 'إلغاء تمييز القرار' : 'تمييز قرار مصيري'}
        className={`shrink-0 text-[14px] leading-none transition disabled:opacity-40 ${className} ${
            starred ? 'text-[#E6C673]' : 'text-white/30 hover:text-[#E6C673]/70'
        }`}
    >
        {starred ? '⭐️' : '☆'}
    </button>
);

export const LawyerRequestMarginsMiniTimeline = ({
    margins,
}: {
    margins: NonNullable<LawyerRequest['margins']>;
}) => {
    if (!margins.length) return null;
    return (
        <div className="mt-2 pe-2 relative" dir="rtl">
            <div
                className="absolute top-0 bottom-0 w-px bg-slate-600/45"
                style={{ insetInlineEnd: '0.35rem' }}
                aria-hidden
            />
            <ul className="space-y-1.5 list-none m-0 p-0">
                {margins.map((m) => (
                    <li key={m.id} className="relative pe-4">
                        <span
                            className="absolute top-1.5 w-1.5 h-1.5 rounded-full bg-slate-500/70"
                            style={{ insetInlineEnd: '0.15rem' }}
                            aria-hidden
                        />
                        <div className="text-xs text-white/60 font-bold whitespace-normal break-words leading-snug">
                            {m.text}
                        </div>
                        <div className="text-[9px] text-white/35 font-bold mt-0.5 tabular-nums" dir="ltr">
                            {m.date}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const RequestMarginAddButton = ({
    disabled,
    onClick,
}: {
    disabled?: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        className="mt-2 rounded-lg border border-slate-600/45 bg-slate-900/40 px-2.5 py-1 text-[10px] font-black text-white/55 hover:text-white/80 hover:border-slate-500/60 transition disabled:opacity-40"
    >
        ➕ إضافة هامش
    </button>
);

export const RequestMarginPromptModal = ({
    open,
    onClose,
    onSubmit,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (text: string) => void;
}) => {
    const [text, setText] = useState('');
    if (!open) return null;
    return (
        <CriminalModalPortal
            zIndex={CRIMINAL_MODAL_Z.linkedTimeline}
            onClick={onClose}
            className="!bg-black/75"
        >
            <div
                className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-white font-black text-sm">هامش متابعة (قبل الحكم النهائي)</div>
                <p className="text-white/50 text-[11px] font-bold">
                    للملاحظات الإجرائية أثناء النظر — ليس بديلاً عن «هامش القاضي الختامي» عند الإغلاق.
                </p>
                <textarea
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/50 min-h-[88px] resize-none"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="نص الهامش القضائي..."
                />
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setText('');
                            onClose();
                        }}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-black text-white/70"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const trimmed = text.trim();
                            if (!trimmed) return;
                            onSubmit(trimmed);
                            setText('');
                            onClose();
                        }}
                        className="rounded-lg bg-[#E6C673] text-[#0B1021] px-3 py-1.5 text-xs font-black disabled:opacity-40"
                        disabled={!text.trim()}
                    >
                        حفظ الهامش
                    </button>
                </div>
            </div>
        </CriminalModalPortal>
    );
};

export type LawyerRequestUxBlockProps = {
    request: LawyerRequest;
    readOnly?: boolean;
    onAddMargin: (text: string) => void;
    onToggleStar: () => void;
};

export const LawyerRequestUxBlock = ({
    request,
    readOnly,
    onAddMargin,
    onToggleStar,
}: LawyerRequestUxBlockProps) => {
    const [marginOpen, setMarginOpen] = useState(false);
    const margins = request.margins ?? [];
    const canAddMargin = !readOnly && canAddLawyerRequestFollowUpMargin(request);
    return (
        <>
            {canAddMargin ? (
                <RequestMarginAddButton disabled={readOnly} onClick={() => setMarginOpen(true)} />
            ) : null}
            {margins.length > 0 ? <LawyerRequestMarginsMiniTimeline margins={margins} /> : null}
            <RequestMarginPromptModal
                open={marginOpen}
                onClose={() => setMarginOpen(false)}
                onSubmit={onAddMargin}
            />
        </>
    );
};

export const LawyerRequestAttachmentsEditor = ({
    attachments,
    readOnly,
    onAddSimulated,
    onRemove,
}: {
    attachments: { id: string; name: string }[];
    readOnly?: boolean;
    onAddSimulated: () => void;
    onRemove: (attachmentId: string) => void;
}) => (
    <div className="space-y-2">
        {!readOnly ? (
            <button
                type="button"
                onClick={onAddSimulated}
                className="rounded-lg border border-dashed border-slate-600/55 px-3 py-2 text-[11px] font-black text-white/60 hover:text-[#E6C673] hover:border-[#E6C673]/40 transition w-full text-center"
            >
                📎 إرفاق صورة القرار
            </button>
        ) : null}
        {attachments.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
                {attachments.map((att) => (
                    <span
                        key={att.id}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-600/50 bg-slate-900/60 px-2 py-0.5 text-[10px] font-bold text-white/65"
                    >
                        <span className="max-w-[12rem] truncate">{att.name}</span>
                        {!readOnly ? (
                            <button
                                type="button"
                                onClick={() => onRemove(att.id)}
                                className="text-white/40 hover:text-red-300 text-[11px] leading-none"
                                aria-label="حذف المرفق"
                            >
                                ×
                            </button>
                        ) : null}
                    </span>
                ))}
            </div>
        ) : null}
    </div>
);
