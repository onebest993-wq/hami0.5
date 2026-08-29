import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    formatCreditorPartyDeathSummaryAr,
    parseCreditorPartyDeathPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import type { Decision } from '../types';

export type DecisionsAppealsAppealDetailModalProps = {
    appealDetailDecision: Decision | null;
    setAppealDetailDecision: (d: Decision | null) => void;
    goToAppealsWithScroll: (id: string) => void;
    decisionBtnPrimaryWFull: string;
};

export function DecisionsAppealsAppealDetailModal({
    appealDetailDecision,
    setAppealDetailDecision,
    goToAppealsWithScroll,
    decisionBtnPrimaryWFull,
}: DecisionsAppealsAppealDetailModalProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
                                    {appealDetailDecision ? (
                                        <motion.div
                                            key="appeal-detail-overlay"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="fixed inset-0 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-sm"
                                            style={{ zIndex: EXEC_MODAL_Z.nestedOverDecisions }}
                                            role="presentation"
                                            onClick={(e) => {
                                                if (e.target === e.currentTarget) setAppealDetailDecision(null);
                                            }}
                                        >
                                            <motion.div
                                                initial={{ scale: 0.94, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.94, opacity: 0 }}
                                                transition={{ duration: 0.18 }}
                                                className="my-auto flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900/45 shadow-lg backdrop-blur-sm"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 p-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAppealDetailDecision(null)}
                                                        className="rounded-lg border border-transparent p-2 text-slate-200 hover:border-white/15 hover:bg-white/10"
                                                        aria-label="إغلاق"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                    <h2 className="flex-1 text-right text-sm font-bold text-orange-100">
                                                        تفاصيل القرار المطعون به
                                                    </h2>
                                                </div>
                                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 text-right">
                                                    <p className="text-sm font-bold text-white">{appealDetailDecision.title}</p>
                                                    <p className="text-xs text-slate-400">
                                                        تاريخ القرار:{' '}
                                                        {Number.isNaN(new Date(appealDetailDecision.date).getTime())
                                                            ? appealDetailDecision.date
                                                            : new Date(appealDetailDecision.date).toLocaleDateString('ar-EG')}
                                                    </p>
                                                    {appealDetailDecision.body ? (
                                                        <p className="text-xs leading-relaxed text-slate-100 whitespace-pre-line">
                                                            {appealDetailDecision.requestKind === 'creditor_party_death'
                                                                ? (() => {
                                                                      const json =
                                                                          String(
                                                                              appealDetailDecision.creditorPartyDeathPayloadJson ||
                                                                                  ''
                                                                          ).trim() ||
                                                                          String(appealDetailDecision.body || '');
                                                                      const p = parseCreditorPartyDeathPayload(json);
                                                                      return p
                                                                          ? formatCreditorPartyDeathSummaryAr(p)
                                                                          : appealDetailDecision.body;
                                                                  })()
                                                                : appealDetailDecision.body}
                                                        </p>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const id = appealDetailDecision.id;
                                                            setAppealDetailDecision(null);
                                                            goToAppealsWithScroll(id);
                                                        }}
                                                        className={decisionBtnPrimaryWFull}
                                                    >
                                                        الانتقال لتبويب الطعون
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    ) : null}
        </AnimatePresence>,
        document.body,
    );
}
