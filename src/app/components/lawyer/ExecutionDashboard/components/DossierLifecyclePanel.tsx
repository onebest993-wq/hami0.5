import React from 'react';
import { createPortal } from 'react-dom';

export interface DossierLifecyclePanelProps {
    dossierLifecyclePanelOpen: boolean;
    dossierLifecyclePopStyle: any;
    dossierLifecyclePanelPhase: 'menu' | 'details';
    setDossierLifecyclePanelPhase: any;
    dossierStatusDraft: any;
    dossierPendingStatus: any;
    setDossierPendingStatus: any;
    dossierReasonDraft: string;
    setDossierReasonDraft: (v: string) => void;
    dossierDateDraft: string;
    setDossierDateDraft: (v: string) => void;
    dossierLifecycleLabelAr: any;
    handleDossierLifecyclePick: any;
    handleDossierLifecycleConfirmDetails: () => void;
    dossierLifecyclePanelPortalRef: React.RefObject<HTMLDivElement | null>;
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
}) => {
    if (!dossierLifecyclePanelOpen || !dossierLifecyclePopStyle) return null;

    return createPortal(
        <div
            ref={dossierLifecyclePanelPortalRef}
            style={{
                position: 'fixed',
                top: dossierLifecyclePopStyle.top,
                left: dossierLifecyclePopStyle.left,
                width: dossierLifecyclePopStyle.width,
                maxWidth: 'min(19rem, calc(100vw - 2.5rem))',
                zIndex: 10050,
            }}
            className="min-w-[14rem] rounded-xl border border-amber-500/40 bg-[#0A0F1C]/98 p-2.5 text-right shadow-2xl shadow-black/50 backdrop-blur-md"
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
                                onClick={() => handleDossierLifecyclePick(s)}
                                className={`w-full rounded-lg border px-2 py-2 text-right text-[10px] font-bold transition ${
                                    dossierStatusDraft === s
                                        ? 'border-amber-500/50 bg-amber-950/45 text-amber-100'
                                        : 'border-white/10 bg-slate-900/65 text-slate-200 hover:bg-slate-800/85'
                                }`}
                            >
                                {s === 'active'
                                    ? '\uD83D\uDFE2 \u0646\u0634\u0637\u0629'
                                    : s === 'paused'
                                        ? '\uD83D\uDFE1 \u0645\u062A\u0648\u0642\u0641\u0629'
                                        : s === 'suspended'
                                            ? '\u23F8\uFE0F \u0645\u0633\u062A\u0623\u062E\u0631\u0629'
                                            : '\uD83D\uDD12 \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0625\u0636\u0628\u0627\u0631\u0629'}
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
                        {'\u2190 \u0631\u062C\u0648\u0639 \u0644\u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u062D\u0627\u0644\u0629'}
                    </button>
                    <p className="mb-2 text-[10px] font-bold text-amber-100">
                        {dossierPendingStatus
                            ? dossierLifecycleLabelAr(dossierPendingStatus)
                            : ''}
                    </p>
                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] text-slate-500">السبب</label>
                        <textarea
                            value={dossierReasonDraft}
                            onChange={(ev) => setDossierReasonDraft(ev.target.value)}
                            rows={2}
                            className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] text-white"
                        />
                        <label className="text-[9px] text-slate-500">التاريخ</label>
                        <input
                            type="date"
                            value={dossierDateDraft}
                            onChange={(ev) => setDossierDateDraft(ev.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] font-mono text-white"
                        />
                        <button
                            type="button"
                            onClick={handleDossierLifecycleConfirmDetails}
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
