import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Shield } from '@/app/components/ui/icons/Shield';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { InlineActionGate } from '@/app/components/lawyer/ExecutionDashboard/components/InlineActionGate';
import { BTN_BASE, BTN_DISABLED, TONE_POLICE } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function PoliceAssistanceBranchSection({
    locked,
    showEvictionFieldworkRequests,
    policeBtnRef,
    inlineExpandedByBranch,
    inlineActionGateKey,
    setInlineActionGateKey,
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
    | 'policeBtnRef'
    | 'inlineExpandedByBranch'
    | 'inlineActionGateKey'
    | 'setInlineActionGateKey'
    | 'isBranchInProgress'
    | 'isBranchActionable'
    | 'isBranchWorkflowComplete'
    | 'handleBranchPrimaryClick'
    | 'submitEvictionRequest'
    | 'renderEvictionBranchPanelBody'
    | 'renderBranchChevron'
>) {
    if (!showEvictionFieldworkRequests) return null;

    return (
                <div
                    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                        inlineExpandedByBranch['Police Assistance Request'] ? 'overflow-visible' : ''
                    }`}
                >
                    <motion.button
                        type="button"
                        disabled={locked && !isBranchActionable('Police Assistance Request')}
                        aria-expanded={Boolean(
                            inlineExpandedByBranch['Police Assistance Request'] &&
                                isBranchInProgress('Police Assistance Request')
                        )}
                        className={`${BTN_BASE} ${TONE_POLICE} ${locked && !isBranchActionable('Police Assistance Request') ? BTN_DISABLED : ''} rounded-none border-0`}
                        ref={policeBtnRef}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBranchPrimaryClick('Police Assistance Request', () =>
                                setInlineActionGateKey('eviction_police_force')
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                <Shield className="h-6 w-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                القوة الجبرية
                            </span>
                            {renderBranchChevron('Police Assistance Request')}
                        </div>
                    </motion.button>
                    {!isBranchInProgress('Police Assistance Request') ? (
                        <InlineActionGate
                            gateKey="eviction_police_force"
                            activeKey={inlineActionGateKey}
                            mode={
                                isBranchWorkflowComplete('Police Assistance Request')
                                    ? 'resubmit_warning'
                                    : 'initial'
                            }
                            onConfirm={() =>
                                submitEvictionRequest({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE,
                                    branch: 'Police Assistance Request',
                                    timelineTitle: '🛡️ القوة الجبرية',
                                    timelineDescription:
                                        'طلب قوة جبرية مساندة للتنفيذ الميداني (قرار منفذ). عند الموافقة: احفظ الجهة المرافقة من بطاقة القرار.',
                                    requestTitle: 'مفاتحة الشرطة للقوة الإجرائية',
                                    supersedeCompletedHub: isBranchWorkflowComplete(
                                        'Police Assistance Request'
                                    ),
                                })
                            }
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    ) : null}
                    {renderEvictionBranchPanelBody(
                        'Police Assistance Request',
                        'طلب القوة الجبرية',
                        undefined,
                        () => setInlineActionGateKey('eviction_police_force')
                    )}
                </div>
    );
}
