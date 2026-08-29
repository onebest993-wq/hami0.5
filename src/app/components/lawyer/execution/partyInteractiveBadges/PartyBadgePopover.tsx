import React from 'react';
import { createPortal } from 'react-dom';
import {
    formatNumberInput,
    parseAmount,
} from '@/app/utils/execution/amountInput';
import {
    BADGE_POPOVER_Z_INDEX,
    type FixedPopoverLayout,
} from '../anchoredPopoverPosition';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { EyeOff } from '@/app/components/ui/icons/EyeOff';
import { Pin } from '@/app/components/ui/icons/Pin';
import { X } from '@/app/components/ui/icons/X';
import type { PartyInteractiveBadge } from './types';

export type PartyBadgePopoverProps = {
    openBadge: PartyInteractiveBadge;
    popoverPos: FixedPopoverLayout;
    popoverRef: React.RefObject<HTMLDivElement | null>;
    onClose: () => void;
    onHide: () => void;
    guarantorNameDraft: string;
    setGuarantorNameDraft: (v: string) => void;
    guarantorWorkplaceDraft: string;
    setGuarantorWorkplaceDraft: (v: string) => void;
    guarantorSalaryDraft: string;
    setGuarantorSalaryDraft: (v: string) => void;
    guarantorDeductionDraft: string;
    setGuarantorDeductionDraft: (v: string) => void;
    guarantorNameInputRef: React.RefObject<HTMLInputElement | null>;
    guarantorWorkInputRef: React.RefObject<HTMLInputElement | null>;
    guarantorSalaryInputRef: React.RefObject<HTMLInputElement | null>;
    guarantorDeductionInputRef: React.RefObject<HTMLInputElement | null>;
    onPersistGuarantorFollowup?: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: { salaryIqd: number | null; deductionIqd: number | null }
    ) => void;
    evictionGracePinned?: boolean;
    onToggleEvictionGracePinned?: () => void;
};

export function PartyBadgePopover({
    openBadge,
    popoverPos,
    popoverRef,
    onClose,
    onHide,
    guarantorNameDraft,
    setGuarantorNameDraft,
    guarantorWorkplaceDraft,
    setGuarantorWorkplaceDraft,
    guarantorSalaryDraft,
    setGuarantorSalaryDraft,
    guarantorDeductionDraft,
    setGuarantorDeductionDraft,
    guarantorNameInputRef,
    guarantorWorkInputRef,
    guarantorSalaryInputRef,
    guarantorDeductionInputRef,
    onPersistGuarantorFollowup,
    evictionGracePinned = false,
    onToggleEvictionGracePinned,
}: PartyBadgePopoverProps): React.ReactPortal | null {
    if (typeof document === 'undefined') return null;
    return createPortal(
        <div
            ref={popoverRef}
            className="rounded-2xl border border-indigo-500/35 bg-[#0B1120]/98 backdrop-blur-sm shadow-lg p-3.5 text-right"
            style={{
                position: 'fixed',
                top: popoverPos.top,
                left: popoverPos.left,
                width: popoverPos.width,
                maxHeight: popoverPos.maxHeight,
                overflowY: 'auto',
                zIndex: BADGE_POPOVER_Z_INDEX,
            }}
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                className="mb-1 inline-flex rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                onClick={onClose}
                aria-label="إغلاق"
            >
                <X size={14} />
            </button>
            {openBadge.id === 'guarantor_followup' && onPersistGuarantorFollowup ? (
                <div className="space-y-2 mb-3 text-right">
                    <div className="space-y-1.5">
                        <label className="block text-[9px] text-slate-500 mb-1">اسم الكفيل</label>
                        <input
                            ref={guarantorNameInputRef}
                            type="text"
                            value={guarantorNameDraft}
                            onChange={(e) => setGuarantorNameDraft(e.target.value)}
                            className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600"
                            placeholder="اسم الكفيل"
                            dir="rtl"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[9px] text-slate-500 mb-1">مكان العمل</label>
                        <input
                            ref={guarantorWorkInputRef}
                            type="text"
                            value={guarantorWorkplaceDraft}
                            onChange={(e) => setGuarantorWorkplaceDraft(e.target.value)}
                            className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600"
                            placeholder="جهة / مكان العمل"
                            dir="rtl"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[9px] text-slate-500 mb-1">الراتب (د.ع) إن وُجد</label>
                        <input
                            ref={guarantorSalaryInputRef}
                            type="text"
                            inputMode="decimal"
                            value={guarantorSalaryDraft}
                            onChange={(e) => setGuarantorSalaryDraft(formatNumberInput(e.target.value))}
                            className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 font-mono text-right"
                            placeholder="اختياري"
                            dir="ltr"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[9px] text-slate-500 mb-1">الاستقطاع من الراتب (د.ع)</label>
                        <input
                            ref={guarantorDeductionInputRef}
                            type="text"
                            inputMode="decimal"
                            value={guarantorDeductionDraft}
                            onChange={(e) => setGuarantorDeductionDraft(formatNumberInput(e.target.value))}
                            className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 font-mono text-right"
                            placeholder="اختياري"
                            dir="ltr"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const n = guarantorNameDraft.trim();
                            const w = guarantorWorkplaceDraft.trim();
                            if (!n || !w) return;
                            const parseIqd = (s: string): number | null => {
                                const n = parseAmount(s);
                                return Number.isFinite(n) ? n : null;
                            };
                            onPersistGuarantorFollowup(n, w, {
                                salaryIqd: parseIqd(guarantorSalaryDraft),
                                deductionIqd: parseIqd(guarantorDeductionDraft),
                            });
                            onClose();
                        }}
                        className="w-full rounded-lg border border-indigo-400/45 bg-gradient-to-r from-indigo-950/70 to-indigo-900/65 py-2.5 text-[10px] font-extrabold text-indigo-100 hover:from-indigo-900/80 hover:to-indigo-800/80"
                    >
                        تثبيت بجانب المدين
                    </button>
                </div>
            ) : (
                <ul className="space-y-1.5 text-[10px] text-slate-300 mb-3">
                    {openBadge.detailLines.map((line, li) => (
                        <li key={`${openBadge.id}-${li}-${line.k}`} className="leading-snug">
                            <span className="text-slate-500">{line.k}: </span>
                            <span className="text-slate-100">{line.v}</span>
                        </li>
                    ))}
                </ul>
            )}
            {openBadge.onActivate &&
                (openBadge.id === 'memo_notice' ||
                    openBadge.id === 'summons_attendance' ||
                    openBadge.id === 'taklif_attendance' ||
                    openBadge.id === 'publication_notice' ||
                    openBadge.id === 'eviction_grace' ||
                    openBadge.id === 'eviction_police_assistance') && (
                    <button
                        type="button"
                        onClick={() => {
                            openBadge.onActivate?.();
                            onClose();
                        }}
                        className="w-full mb-2 rounded-lg border border-indigo-500/35 bg-indigo-950/45 py-2 text-[10px] font-bold text-indigo-100 hover:bg-indigo-950/60"
                    >
                        {openBadge.id === 'memo_notice'
                            ? 'إدارة تواريخ المذكرة'
                            : openBadge.id === 'publication_notice'
                              ? 'فتح مركز التبليغ والتكليف'
                            : openBadge.id === 'taklif_attendance'
                              ? 'فتح مركز التبليغ والتكليف'
                              : openBadge.id === 'eviction_grace'
                                ? 'فتح المهلة'
                                : openBadge.id === 'eviction_police_assistance'
                                  ? 'فتح القوة الجبرية'
                                  : 'مراجعة التكليف والغاية'}
                    </button>
                )}
            {openBadge.id === 'eviction_grace' && onToggleEvictionGracePinned ? (
                <button
                    type="button"
                    onClick={() => {
                        onToggleEvictionGracePinned();
                        onClose();
                    }}
                    className="w-full mb-2 flex flex-row-reverse items-center justify-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-950/35 py-2 text-[10px] font-bold text-amber-100 hover:bg-amber-950/50"
                >
                    <Pin size={14} strokeWidth={2} />
                    {evictionGracePinned ? 'إلغاء تثبيت المهلة' : 'تثبيت المهلة في الحاوية'}
                </button>
            ) : null}
            <button
                type="button"
                onClick={onHide}
                className={`w-full flex flex-row-reverse items-center justify-center gap-1.5 rounded-lg border py-2 text-[10px] font-bold hover:brightness-110 ${
                    openBadge.dismissVariant === 'complete'
                        ? 'border-emerald-500/35 bg-emerald-950/35 text-emerald-100'
                        : 'border-rose-500/35 bg-rose-950/40 text-rose-100 hover:bg-rose-950/55'
                }`}
            >
                {openBadge.dismissVariant === 'complete' ? (
                    <CheckCircle size={14} strokeWidth={2} />
                ) : (
                    <EyeOff size={14} strokeWidth={2} />
                )}
                {openBadge.dismissLabel || 'إخفاء الشارة من البطاقة'}
            </button>
        </div>,
        document.body
    );
}
