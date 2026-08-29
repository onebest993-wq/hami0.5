import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface DossierLifecyclePanelProps {
    dossierLifecyclePanelOpen: boolean;
    dossierLifecyclePopStyle: { top: number; left: number; width: number } | null;
    dossierLifecyclePanelPhase: 'menu' | 'details';
    setDossierLifecyclePanelPhase: (phase: 'menu' | 'details') => void;
    dossierStatusDraft: string;
    dossierPendingStatus: string | null;
    setDossierPendingStatus: (status: string | null) => void;
    dossierReasonDraft: string;
    setDossierReasonDraft: (v: string) => void;
    dossierDateDraft: string;
    setDossierDateDraft: (v: string) => void;
    dossierLifecycleLabelAr: (value: string) => string;
    handleDossierLifecyclePick: (status: string) => void;
    handleDossierLifecycleConfirmDetails: (reason?: string, date?: string) => void;
    dossierLifecyclePanelPortalRef: React.RefObject<HTMLDivElement | null>;
    dossierLifecyclePopoverRef?: React.RefObject<HTMLDivElement | null>;
}

function computePopStyleFromTrigger(
    trigger: HTMLElement | null,
): { top: number; left: number; width: number } | null {
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const width = Math.min(304, Math.max(rect.width, 224));
    const left = Math.min(
        Math.max(12, rect.left),
        Math.max(12, viewportWidth - width - 12),
    );
    return {
        top: rect.bottom + 8,
        left,
        width,
    };
}

export const DossierLifecyclePanel: React.FC<DossierLifecyclePanelProps> = ({
    dossierLifecyclePanelOpen,
    dossierLifecyclePopStyle,
    dossierLifecyclePanelPhase,
    setDossierLifecyclePanelPhase,
    dossierStatusDraft,
    dossierPendingStatus,
    setDossierPendingStatus,
    dossierReasonDraft,
    setDossierReasonDraft,
    dossierDateDraft,
    setDossierDateDraft,
    dossierLifecycleLabelAr,
    handleDossierLifecyclePick,
    handleDossierLifecycleConfirmDetails,
    dossierLifecyclePanelPortalRef,
    dossierLifecyclePopoverRef,
}) => {
    const reasonRef = useRef<HTMLTextAreaElement | null>(null);
    const [localReasonDraft, setLocalReasonDraft] = useState(dossierReasonDraft);
    const [localDateDraft, setLocalDateDraft] = useState(dossierDateDraft);

    useEffect(() => {
        if (dossierLifecyclePanelPhase !== 'details') return;
        setLocalReasonDraft(dossierReasonDraft);
        setLocalDateDraft(dossierDateDraft);
    }, [dossierDateDraft, dossierLifecyclePanelPhase, dossierReasonDraft]);

    useEffect(() => {
        if (!dossierLifecyclePanelOpen || dossierLifecyclePanelPhase !== 'details') return;
        reasonRef.current?.focus();
    }, [dossierLifecyclePanelOpen, dossierLifecyclePanelPhase]);

    const resolvedPopStyle = useMemo(() => {
        if (dossierLifecyclePopStyle) return dossierLifecyclePopStyle;
        return computePopStyleFromTrigger(dossierLifecyclePopoverRef?.current ?? null);
    }, [dossierLifecyclePopStyle, dossierLifecyclePopoverRef]);

    if (!dossierLifecyclePanelOpen || !resolvedPopStyle) return null;

    const confirmDetails = () => {
        setDossierReasonDraft(localReasonDraft);
        setDossierDateDraft(localDateDraft);
        if (typeof handleDossierLifecycleConfirmDetails === 'function') {
            handleDossierLifecycleConfirmDetails(localReasonDraft, localDateDraft);
        }
    };

    return createPortal(
        <div
            ref={dossierLifecyclePanelPortalRef}
            style={{
                position: 'fixed',
                top: resolvedPopStyle.top,
                left: resolvedPopStyle.left,
                width: resolvedPopStyle.width,
                maxWidth: 'min(19rem, calc(100vw - 2.5rem))',
                zIndex: 10050,
            }}
            className="min-w-[14rem] rounded-lg border border-white/12 bg-[#0B1021] p-2 text-right"
            dir="rtl"
            role="dialog"
            aria-label="حالة الإضبارة"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            {dossierLifecyclePanelPhase === 'menu' ? (
                <>
                    <p className="mb-2 text-[9px] font-semibold text-slate-500">
                        اختر حالة الإضبارة
                    </p>
                    <div className="flex flex-col gap-1">
                        {(
                            [
                                'active',
                                'paused',
                                'suspended',
                                'finished',
                            ] as const
                        ).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => {
                                    if (typeof handleDossierLifecyclePick === 'function') {
                                        handleDossierLifecyclePick(s);
                                    }
                                }}
                                className={`w-full min-h-[44px] rounded-lg border px-2 py-2 text-right text-[10px] font-bold transition touch-manipulation ${
                                    dossierStatusDraft === s
                                        ? 'border-amber-500/50 bg-amber-950/45 text-amber-100'
                                        : 'border-white/10 bg-slate-900/65 text-slate-200 hover:bg-slate-800/85'
                                }`}
                            >
                                {dossierLifecycleLabelAr(s)}
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <button
                        type="button"
                        className="mb-2 block w-full text-right text-[9px] text-amber-300/95 hover:underline"
                        onClick={() => {
                            setDossierLifecyclePanelPhase('menu');
                            setDossierPendingStatus(null);
                        }}
                    >
                        ← رجوع لاختيار الحالة
                    </button>
                    <p className="mb-2 text-[10px] font-bold text-amber-100">
                        {dossierPendingStatus
                            ? dossierLifecycleLabelAr(dossierPendingStatus)
                            : ''}
                    </p>
                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] text-slate-500" htmlFor="dossier-lifecycle-reason">
                            السبب
                        </label>
                        <textarea
                            id="dossier-lifecycle-reason"
                            ref={reasonRef}
                            aria-label="السبب"
                            value={localReasonDraft}
                            onChange={(ev) => setLocalReasonDraft(ev.target.value)}
                            rows={2}
                            className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] text-white"
                        />
                        <label className="text-[9px] text-slate-500" htmlFor="dossier-lifecycle-date">
                            التاريخ
                        </label>
                        <input
                            id="dossier-lifecycle-date"
                            type="date"
                            aria-label="التاريخ"
                            value={localDateDraft}
                            onChange={(ev) => setLocalDateDraft(ev.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] font-mono text-white"
                        />
                        <button
                            type="button"
                            onClick={confirmDetails}
                            className="mt-1 rounded-lg bg-amber-800/75 py-2 text-[10px] font-bold text-amber-50 hover:bg-amber-700/85"
                        >
                            اعتماد وتسجيل في السجل الزمني
                        </button>
                    </div>
                </>
            )}
        </div>,
        document.body,
    );
};
