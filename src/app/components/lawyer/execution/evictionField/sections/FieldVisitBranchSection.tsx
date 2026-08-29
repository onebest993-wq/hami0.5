import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { InlineActionGate } from '@/app/components/lawyer/ExecutionDashboard/components/InlineActionGate';
import { BTN_BASE, BTN_DISABLED, TONE_FIELD_VISIT } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function FieldVisitBranchSection({
    locked,
    showEvictionFieldworkRequests,
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
                    className={`relative rounded-2xl border border-white/10 bg-black/10 ${
                        inlineExpandedByBranch['Field Visit Date'] && isBranchInProgress('Field Visit Date')
                            ? 'overflow-visible'
                            : 'overflow-hidden'
                    }`}
                >
                    <motion.button
                        type="button"
                        disabled={locked && !isBranchActionable('Field Visit Date')}
                        aria-expanded={Boolean(
                            inlineExpandedByBranch['Field Visit Date'] &&
                                isBranchInProgress('Field Visit Date')
                        )}
                        className={`${BTN_BASE} ${TONE_FIELD_VISIT} ${locked && !isBranchActionable('Field Visit Date') ? BTN_DISABLED : ''} rounded-none border-0`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBranchPrimaryClick('Field Visit Date', () =>
                                setInlineActionGateKey('eviction_field_visit')
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                <Calendar className="h-6 w-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                تحديد موعد الخروج الميداني
                            </span>
                            {renderBranchChevron('Field Visit Date')}
                        </div>
                    </motion.button>
                    {!isBranchInProgress('Field Visit Date') ? (
                        <InlineActionGate
                            gateKey="eviction_field_visit"
                            activeKey={inlineActionGateKey}
                            mode={
                                isBranchWorkflowComplete('Field Visit Date')
                                    ? 'resubmit_warning'
                                    : 'initial'
                            }
                            onConfirm={() =>
                                submitEvictionRequest({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT,
                                    branch: 'Field Visit Date',
                                    timelineTitle: '📍 تحديد موعد الخروج الميداني',
                                    timelineDescription:
                                        'تم جدولة / تحديد موعد الخروج الميداني مع منفذ العدل (باشر).',
                                    requestTitle: 'طلب تحديد موعد الخروج الميداني',
                                    supersedeCompletedHub: isBranchWorkflowComplete('Field Visit Date'),
                                })
                            }
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    ) : null}
                    {renderEvictionBranchPanelBody(
                        'Field Visit Date',
                        'طلب تحديد موعد الخروج الميداني',
                        undefined,
                        () => setInlineActionGateKey('eviction_field_visit')
                    )}
                </div>
    );
}
