import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Hammer } from '@/app/components/ui/icons/Hammer';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { InlineActionGate } from '@/app/components/lawyer/ExecutionDashboard/components/InlineActionGate';
import { BTN_BASE, BTN_DISABLED, TONE_BREAK } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function BreakInventoryBranchSection({
    locked,
    showBreakInventoryRequest,
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
    | 'showBreakInventoryRequest'
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
    if (!showBreakInventoryRequest) return null;

    return (
                <div
                    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                        inlineExpandedByBranch['Lock Breaking & Inventory'] ? 'overflow-visible' : ''
                    }`}
                >
                    <motion.button
                        type="button"
                        disabled={locked && !isBranchActionable('Lock Breaking & Inventory')}
                        aria-expanded={Boolean(
                            inlineExpandedByBranch['Lock Breaking & Inventory'] &&
                                isBranchInProgress('Lock Breaking & Inventory')
                        )}
                        className={`${BTN_BASE} ${TONE_BREAK} ${locked && !isBranchActionable('Lock Breaking & Inventory') ? BTN_DISABLED : ''} rounded-none border-0`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBranchPrimaryClick('Lock Breaking & Inventory', () =>
                                setInlineActionGateKey('eviction_break_inventory')
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                <Hammer className="h-6 w-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                طلب كسر الأقفال وجرد الأثاث
                            </span>
                            {renderBranchChevron('Lock Breaking & Inventory')}
                        </div>
                    </motion.button>
                    {!isBranchInProgress('Lock Breaking & Inventory') ? (
                        <InlineActionGate
                            gateKey="eviction_break_inventory"
                            activeKey={inlineActionGateKey}
                            mode={
                                isBranchWorkflowComplete('Lock Breaking & Inventory')
                                    ? 'resubmit_warning'
                                    : 'initial'
                            }
                            onConfirm={() =>
                                submitEvictionRequest({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY,
                                    branch: 'Lock Breaking & Inventory',
                                    timelineTitle: '🔨 طلب كسر الأقفال وجرد الأثاث',
                                    timelineDescription:
                                        'طلب عرض على منفذ العدل بشأن كسر الأقفال وجرد محتويات المنقولات في العين المؤجرة.',
                                    requestTitle: 'طلب كسر الأقفال وجرد الأثاث',
                                    supersedeCompletedHub: isBranchWorkflowComplete(
                                        'Lock Breaking & Inventory'
                                    ),
                                })
                            }
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    ) : null}
                    {renderEvictionBranchPanelBody(
                        'Lock Breaking & Inventory',
                        'طلب كسر الأقفال وجرد الأثاث',
                        undefined,
                        () => setInlineActionGateKey('eviction_break_inventory')
                    )}
                </div>
    );
}
