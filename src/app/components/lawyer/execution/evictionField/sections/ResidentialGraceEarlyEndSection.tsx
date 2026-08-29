import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Timer } from '@/app/components/ui/icons/Timer';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { BTN_BASE, BTN_DISABLED, TONE_EARLY_END } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function ResidentialGraceEarlyEndSection({
    locked,
    showResidentialGraceEarlyEndRequest,
    inlineExpandedByBranch,
    confirmGate,
    setConfirmGate,
    confirmBusy,
    setConfirmBusy,
    isBranchInProgress,
    isBranchActionable,
    isBranchWorkflowComplete,
    handleBranchPrimaryClick,
    submitEvictionRequest,
    renderEvictionBranchPanelBody,
    renderBranchChevron,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showResidentialGraceEarlyEndRequest'
    | 'inlineExpandedByBranch'
    | 'confirmGate'
    | 'setConfirmGate'
    | 'confirmBusy'
    | 'setConfirmBusy'
    | 'isBranchInProgress'
    | 'isBranchActionable'
    | 'isBranchWorkflowComplete'
    | 'handleBranchPrimaryClick'
    | 'submitEvictionRequest'
    | 'renderEvictionBranchPanelBody'
    | 'renderBranchChevron'
>) {
    if (!showResidentialGraceEarlyEndRequest) return null;

    return (
                    <div
                        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                            inlineExpandedByBranch['Residential Grace Early End'] ? 'overflow-visible' : ''
                        }`}
                    >
                        <motion.button
                            type="button"
                            disabled={locked && !isBranchActionable('Residential Grace Early End')}
                            aria-expanded={Boolean(
                                inlineExpandedByBranch['Residential Grace Early End'] &&
                                    isBranchInProgress('Residential Grace Early End')
                            )}
                            className={`${BTN_BASE} ${TONE_EARLY_END} ${locked && !isBranchActionable('Residential Grace Early End') ? BTN_DISABLED : ''} rounded-none border-0`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBranchPrimaryClick('Residential Grace Early End', () =>
                                    setConfirmGate('early_end')
                                );
                            }}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                        >
                            <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                    <Timer className="h-6 w-6 text-white/70" strokeWidth={2} />
                                </div>
                                <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                    طلب إنهاء مهلة التخلية السكنية
                                </span>
                                {renderBranchChevron('Residential Grace Early End')}
                                <span className="sr-only">يظهر أثناء سريان مهلة سكنية مسجّلة فقط</span>
                            </div>
                        </motion.button>
                        <div
                            className={`absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl bg-slate-950/45 px-3 backdrop-blur-xl transition-opacity duration-150 ${
                                confirmGate === 'early_end' ? 'opacity-100' : 'pointer-events-none opacity-0'
                            }`}
                            role="presentation"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmBusy(true);
                                    try {
                                        submitEvictionRequest({
                                            actionId: EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END,
                                            branch: 'Residential Grace Early End',
                                            timelineTitle: '⏱️ طلب إنهاء مهلة التخلية السكنية (موافقة المنفذ)',
                                            timelineDescription:
                                                'طلب عرض على منفذ العدل لإنهاء مهلة التخلية السكنية قبل انتهاء المدة وإعادة دورة المهلة في الإضبارة عند الموافقة.',
                                            requestTitle: 'طلب إنهاء مهلة التخلية السكنية (موافقة المنفذ)',
                                            supersedeCompletedHub: isBranchWorkflowComplete(
                                                'Residential Grace Early End'
                                            ),
                                        });
                                    } finally {
                                        setConfirmBusy(false);
                                        setConfirmGate(null);
                                    }
                                }}
                                className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                            >
                                تأكيد وإرسال للقرارات
                            </button>
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmGate(null);
                                }}
                                className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                        </div>

                        {renderEvictionBranchPanelBody(
                            'Residential Grace Early End',
                            'طلب إنهاء مهلة التخلية السكنية',
                            undefined,
                            () => setConfirmGate('early_end')
                        )}
                    </div>
    );
}
