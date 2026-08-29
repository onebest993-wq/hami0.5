import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { evictionInclusiveCalendarDays } from '../helpers';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_TOUCH_TARGET,
} from '../executionModalMobileShell';
import type { EvictionResidentialGraceFollowupModalProps } from './EvictionFollowupModalsChunk.types';

/** مودال مهلة السكن للتخلية */
export function EvictionResidentialGraceFollowupModal(p: EvictionResidentialGraceFollowupModalProps) {
    const {
        setShowEvictionResidentialGraceModal,
        onCloseEvictionResidentialGraceModal,
        graceModalStartYmd,
        setGraceModalStartYmd,
        graceModalEndYmd,
        setGraceModalEndYmd,
        residentialVacateDeadlineMaxIso,
        residentialGraceModalShowPrimarySave,
        submitEvictionResidentialGraceFromModal,
        EXEC_MODAL_BACKDROP_STRONG,
        nestedOverUnifiedZIndex,
    } = p;

    const closeEvictionResidentialGraceModal = () => {
        if (typeof onCloseEvictionResidentialGraceModal === 'function') {
            onCloseEvictionResidentialGraceModal();
        } else {
            setShowEvictionResidentialGraceModal?.(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={{ zIndex: nestedOverUnifiedZIndex }}
            onClick={() => closeEvictionResidentialGraceModal()}
            role="presentation"
        >
            <div
                className="bg-[#0B1120] border-2 border-sky-500/40 rounded-3xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`sticky top-0 bg-[#0B1120] border-b border-sky-500/30 p-4 flex justify-between items-center ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                >
                    <button
                        type="button"
                        onClick={() => closeEvictionResidentialGraceModal()}
                        className={`${EXEC_MODAL_CLOSE_BTN_CLASS} hover:bg-sky-500/20`}
                    >
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-sky-300 font-bold text-lg text-right pr-2">مهلة</h2>
                </div>
                <div className="p-5 space-y-4 text-right">
                    <div>
                        <label className="block text-gray-300 text-xs font-semibold mb-2">
                            تاريخ بداية المهلة
                        </label>
                        <input
                            type="date"
                            value={graceModalStartYmd}
                            onChange={(e) => setGraceModalStartYmd(e.target.value)}
                            max={graceModalEndYmd || undefined}
                            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-white text-sm text-right font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-300 text-xs font-semibold mb-2">
                            تاريخ انتهاء المهلة
                        </label>
                        <input
                            type="date"
                            value={graceModalEndYmd}
                            onChange={(e) => setGraceModalEndYmd(e.target.value)}
                            max={residentialVacateDeadlineMaxIso || undefined}
                            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-white text-sm text-right font-mono"
                        />
                    </div>
                    {residentialVacateDeadlineMaxIso ? (
                        <p className="text-[10px] text-slate-500">
                            أقصى تاريخ مسموح: {residentialVacateDeadlineMaxIso}
                        </p>
                    ) : null}
                    <div className="rounded-xl border border-sky-500/25 bg-sky-950/25 px-3 py-2 text-sky-100 text-sm">
                        <p className="text-xs leading-relaxed">
                            المدة:{' '}
                            <span className="font-mono font-bold tabular-nums">
                                {evictionInclusiveCalendarDays(
                                    graceModalStartYmd.trim(),
                                    graceModalEndYmd.trim()
                                ) || '—'}
                            </span>{' '}
                            يوم
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2 flex-row-reverse">
                            {residentialGraceModalShowPrimarySave ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        submitEvictionResidentialGraceFromModal();
                                    }}
                                    className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl transition-all`}
                                >
                                    حفظ
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => closeEvictionResidentialGraceModal()}
                                className={`${EXEC_MODAL_TOUCH_TARGET} ${residentialGraceModalShowPrimarySave ? 'flex-1' : 'w-full'} bg-slate-700/60 border border-slate-600/50 text-slate-200 font-semibold py-3 rounded-xl`}
                            >
                                إلغاء
                            </button>
                        </div>
                        {!residentialGraceModalShowPrimarySave ? (
                            <p className="text-[10px] text-slate-500 text-right leading-relaxed">
                                المهلة مسجّلة. لإعادة ضبط المدة أو حفظ مهلة جديدة يُنفَّذ أولاً إنهاء دورة
                                المهلة بموافقة المنفذ من الإجراءات الميدانية أو بانتهاء تاريخ الانتهاء.
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
