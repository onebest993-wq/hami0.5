import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { BTN_BASE, BTN_DISABLED, TONE_CUSTODIAN } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function JudicialCustodianBranchSection({
    locked,
    showEvictionFieldworkRequests,
    breakInventoryWorkflowComplete,
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
    | 'showEvictionFieldworkRequests'
    | 'breakInventoryWorkflowComplete'
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
    if (!(breakInventoryWorkflowComplete && showEvictionFieldworkRequests)) return null;

    return (
                    <div
                        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                            inlineExpandedByBranch['Judicial Custodian'] ? 'overflow-visible' : ''
                        }`}
                    >
                        <motion.button
                            type="button"
                            disabled={locked && !isBranchActionable('Judicial Custodian')}
                            aria-expanded={Boolean(
                                inlineExpandedByBranch['Judicial Custodian'] &&
                                    isBranchInProgress('Judicial Custodian')
                            )}
                            className={`${BTN_BASE} ${TONE_CUSTODIAN} ${locked && !isBranchActionable('Judicial Custodian') ? BTN_DISABLED : ''} rounded-none border-0`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBranchPrimaryClick('Judicial Custodian', () =>
                                    setConfirmGate('custodian')
                                );
                            }}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                        >
                            <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                    <UserCheck className="h-6 w-6 text-white/70" strokeWidth={2} />
                                </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                تنصيب حارس قضائي
                            </span>
                            <span className="hidden sm:block shrink-0 text-[9px] text-slate-400 max-w-[42%] truncate">
                                بعد إكمال كسر الأقفال والجرد
                            </span>
                                {renderBranchChevron('Judicial Custodian')}
                                <span className="sr-only">
                                    يظهر بعد إكمال كسر الأقفال والجرد — يمكن تكرار الطلب بعد التعيين
                                </span>
                            </div>
                        </motion.button>
                        <div
                            className={`absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl bg-slate-950/45 px-3 backdrop-blur-xl transition-opacity duration-150 ${
                                confirmGate === 'custodian' ? 'opacity-100' : 'pointer-events-none opacity-0'
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
                                            actionId: EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN,
                                            branch: 'Judicial Custodian',
                                            timelineTitle: '👤 طلب تنصيب حارس قضائي',
                                            timelineDescription: 'طلب عرض على منفذ العدل لتنصيب حارس قضائي على العين.',
                                            requestTitle: 'طلب تنصيب حارس قضائي',
                                            supersedeCompletedHub: isBranchWorkflowComplete(
                                                'Judicial Custodian'
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
                            'Judicial Custodian',
                            'طلب تنصيب حارس قضائي',
                            undefined,
                            () => setConfirmGate('custodian')
                        )}
                    </div>
    );
}
