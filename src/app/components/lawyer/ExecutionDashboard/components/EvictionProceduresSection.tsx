import React from 'react';
import { Calendar, Shield, Gavel, UserCheck, Home } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import type { EvictionRequestKind } from '@/app/utils/executorSeizureDecisionQueue';
import type { EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';

export interface EvictionProceduresSectionProps {
    executionCoerciveButtonDisabled: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    gracePeriodEnded: boolean | null | undefined;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    handleEndGracePeriod: () => void;
    appendEvictionProcedure: (procedure: {
        actionId: EvictionTimelineActionId;
        title: string;
        description: string;
    }) => void;
    appendEvictionExecutorRequest: (request: {
        executionId: string;
        title: string;
        body: string;
        requestKind: EvictionRequestKind;
        evictionWorkflowKey?: EvictionExecutorWorkflowKey;
    }) => boolean;
    decisionsStorageExecutionId: string;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    EVICTION_TIMELINE_ACTION_IDS: {
        FIELD_VISIT: string;
        POLICE_FORCE: string;
        BREAK_INVENTORY: string;
        CUSTODIAN: string;
    };
}

export const EvictionProceduresSection: React.FC<EvictionProceduresSectionProps> = ({
    executionCoerciveButtonDisabled,
    inlineActionGateKey,
    gracePeriodEnded,
    setInlineActionGateKey,
    handleEndGracePeriod,
    appendEvictionProcedure,
    appendEvictionExecutorRequest,
    decisionsStorageExecutionId,
    showToast,
    EVICTION_TIMELINE_ACTION_IDS,
}) => {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);

    const openAppeals = React.useCallback(
        (decisionId: string) => {
            if (!executionId || !decisionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: { executionId, tab: 'appeals', decisionId },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [executionId]
    );

    const latestEvictionDecision = React.useCallback(
        (match: RegExp): any | null => {
            const list = Array.isArray(decisions) ? (decisions as any[]) : [];
            const hits = list
                .filter((d) => String(d?.requestKind || '') === 'eviction_procedure')
                .filter((d) => match.test(String(d?.title || '')))
                .sort((a, b) => {
                    const da = String(a?.resolvedAt ?? a?.date ?? '');
                    const db = String(b?.resolvedAt ?? b?.date ?? '');
                    return db.localeCompare(da, undefined, { numeric: true });
                });
            return hits[0] || null;
        },
        [decisions]
    );

    const renderEvictionDecisionAccordion = React.useCallback(
        (label: string, row: any | null, requestKind: string) => {
            if (!row?.id) return null;
            const decisionId = String(row.id || '').trim();
            const rejected = isExecutorRowRejectedAndFinal(row);
            const approved = isExecutorRowEffectivelyApproved(row);
            const pending =
                String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '';

            const steps: ExecutionInlineStep[] = [
                {
                    id: `${decisionId}:sent`,
                    title: label,
                    subtitle: 'تم إرسال الطلب',
                    status: 'done',
                    tone: 'success',
                },
                {
                    id: `${decisionId}:executor`,
                    title: 'قرار المنفذ',
                    subtitle: rejected ? 'تم رفض الطلب' : approved ? 'تمت الموافقة' : pending ? 'قيد البت' : '—',
                    status: rejected || pending ? 'active' : 'done',
                    tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
                    content: rejected ? (
                        <ExecutionInlineExecutorDecisionActions
                            executionId={executionId}
                            decisionId={decisionId}
                            requestKind={requestKind}
                            disabled
                            onOpenAppealCenter={() => openAppeals(decisionId)}
                        />
                    ) : pending ? (
                        <ExecutionInlineExecutorDecisionActions
                            executionId={executionId}
                            decisionId={decisionId}
                            requestKind={requestKind}
                        />
                    ) : null,
                },
            ];

            return (
                <div className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3" dir="rtl">
                    <ExecutionInlineAccordion steps={steps} />
                </div>
            );
        },
        [executionId, openAppeals]
    );

    return (
        <div className="space-y-2.5">
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-stretch">
                {!gracePeriodEnded && (
                    <button
                        type="button"
                        disabled={executionCoerciveButtonDisabled}
                        onClick={() => handleEndGracePeriod()}
                        title="مهلة"
                        aria-label="مهلة"
                        className={`w-full sm:w-[108px] sm:shrink-0 text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 ${
                            executionCoerciveButtonDisabled
                                ? 'opacity-45 cursor-not-allowed hover:border-white/5'
                                : ''
                        }`}
                    >
                        <div className="flex flex-row-reverse items-center justify-center gap-2 sm:flex-col sm:gap-1">
                            <Calendar className="shrink-0 text-sky-300" size={20} />
                            <p className="text-sky-100 font-bold text-sm text-center leading-tight">
                                مهلة
                            </p>
                        </div>
                    </button>
                )}
                <div className="relative flex-1 min-w-0">
                    <button
                        type="button"
                        disabled={executionCoerciveButtonDisabled}
                        onClick={() => {
                            if (executionCoerciveButtonDisabled) return;
                            setInlineActionGateKey('eviction_field_visit');
                        }}
                        className={`w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 ${
                            executionCoerciveButtonDisabled
                                ? 'opacity-45 cursor-not-allowed hover:border-white/5'
                                : ''
                        }`}
                    >
                        <div className="flex flex-row-reverse items-center gap-3">
                            <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                <Calendar className="w-6 h-6 text-white/70" />
                            </span>
                            <p className="text-white font-bold text-sm">
                                طلب تحديد موعد الخروج الميداني
                            </p>
                        </div>
                    </button>
                    <InlineActionGate
                        gateKey="eviction_field_visit"
                        activeKey={inlineActionGateKey}
                        onConfirm={() => {
                            appendEvictionProcedure({
                                actionId: EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT as EvictionTimelineActionId,
                                title: '📍 طلب تحديد موعد الخروج الميداني',
                                description:
                                    'طلب تحديد موعد الخروج الميداني مع منفذ العدل (باشر).',
                            });
                        }}
                        onCancel={() => setInlineActionGateKey(null)}
                    />
                    {renderEvictionDecisionAccordion(
                        'طلب تحديد موعد الخروج الميداني',
                        latestEvictionDecision(/الخروج\s*الميداني/i),
                        'eviction_procedure'
                    )}
                </div>
            </div>
            <div className="relative">
                <button
                    type="button"
                    disabled={executionCoerciveButtonDisabled}
                    onClick={() => {
                        if (executionCoerciveButtonDisabled) return;
                        setInlineActionGateKey('eviction_police_force');
                    }}
                    className={`w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 ${
                        executionCoerciveButtonDisabled
                            ? 'opacity-45 cursor-not-allowed hover:border-white/5'
                            : ''
                    }`}
                >
                    <div className="flex flex-row-reverse items-center gap-3">
                        <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                            <Shield className="w-6 h-6 text-white/70" />
                        </span>
                        <p className="text-white font-bold text-sm">
                            مفاتحة الشرطة للقوة الإجرائية
                        </p>
                    </div>
                </button>
                <InlineActionGate
                    gateKey="eviction_police_force"
                    activeKey={inlineActionGateKey}
                    onConfirm={() =>
                        appendEvictionProcedure({
                            actionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE as EvictionTimelineActionId,
                            title: '🛡️ مفاتحة الشرطة للقوة الإجرائية',
                            description:
                                'تمت مفاتحة الجهة الأمنية لطلب القوة الإجرائية المساندة للتنفيذ الميداني.',
                        })
                    }
                    onCancel={() => setInlineActionGateKey(null)}
                />
                {renderEvictionDecisionAccordion(
                    'مفاتحة الشرطة للقوة الإجرائية',
                    latestEvictionDecision(/القوة\s*الإجرائية|مفاتحة\s*الشرطة/i),
                    'eviction_procedure'
                )}
            </div>
            <div className="relative">
                <button
                    type="button"
                    disabled={executionCoerciveButtonDisabled}
                    onClick={() => {
                        if (executionCoerciveButtonDisabled) return;
                        setInlineActionGateKey('eviction_break_inventory');
                    }}
                    className={`w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 ${
                        executionCoerciveButtonDisabled
                            ? 'opacity-45 cursor-not-allowed hover:border-white/5'
                            : ''
                    }`}
                >
                    <div className="flex flex-row-reverse items-center gap-3">
                        <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                            <Gavel className="w-6 h-6 text-white/70" />
                        </span>
                        <p className="text-white font-bold text-sm">
                            طلب كسر الأقفال وجرد الأثاث
                        </p>
                    </div>
                </button>
                <InlineActionGate
                    gateKey="eviction_break_inventory"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        appendEvictionProcedure({
                            actionId: EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY as EvictionTimelineActionId,
                            title: '🔨 طلب كسر الأقفال وجرد الأثاث',
                            description:
                                'طلب عرض على منفذ العدل بشأن كسر الأقفال وجرد محتويات المنقولات في العين المؤجرة.',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
                {renderEvictionDecisionAccordion(
                    'طلب كسر الأقفال وجرد الأثاث',
                    latestEvictionDecision(/كسر\s*الأقفال|جرد\s*الأثاث/i),
                    'eviction_procedure'
                )}
            </div>
            <div className="relative">
                <button
                    type="button"
                    disabled={executionCoerciveButtonDisabled}
                    onClick={() => {
                        if (executionCoerciveButtonDisabled) return;
                        setInlineActionGateKey('eviction_custodian');
                    }}
                    className={`w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 ${
                        executionCoerciveButtonDisabled
                            ? 'opacity-45 cursor-not-allowed hover:border-white/5'
                            : ''
                    }`}
                >
                    <div className="flex flex-row-reverse items-center gap-3">
                        <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                            <UserCheck className="w-6 h-6 text-white/70" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm">
                                تنصيب حارس قضائي
                            </p>
                            <p className="text-slate-500 text-[10px] mt-0.5">
                                بعد طلب الكسر والجرد — يمكن إضافة أكثر من حارس بعد التعيين
                            </p>
                        </div>
                    </div>
                </button>
                <InlineActionGate
                    gateKey="eviction_custodian"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        appendEvictionProcedure({
                            actionId: EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN as EvictionTimelineActionId,
                            title: '👤 طلب تنصيب حارس قضائي',
                            description:
                                'طلب عرض على منفذ العدل لتنصيب حارس قضائي على العين.',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
                {renderEvictionDecisionAccordion(
                    'تنصيب حارس قضائي',
                    latestEvictionDecision(/حارس\s*قضائي|تنصيب\s*حارس/i),
                    'eviction_procedure'
                )}
            </div>
            <div className="relative">
                <button
                    type="button"
                    disabled={executionCoerciveButtonDisabled}
                    onClick={() => {
                        if (executionCoerciveButtonDisabled) return;
                        setInlineActionGateKey('eviction_forced_eviction');
                    }}
                    className={`w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 ${
                        executionCoerciveButtonDisabled
                            ? 'opacity-45 cursor-not-allowed hover:border-white/5'
                            : ''
                    }`}
                >
                    <div className="flex flex-row-reverse items-center gap-3">
                        <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                            <Home className="w-6 h-6 text-white/70" />
                        </span>
                        <p className="text-white font-bold text-sm">
                            طلب الإخلاء الجبري
                        </p>
                    </div>
                </button>
                <InlineActionGate
                    gateKey="eviction_forced_eviction"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        const ok = appendEvictionExecutorRequest({
                            executionId: decisionsStorageExecutionId,
                            title: 'طلب الإخلاء الجبري',
                            body: 'طلب إخلاء العقار موضوع الإضبارة جبرياً وتسليمه للدائن خاوياً من الشواغل.',
                            requestKind: 'eviction_procedure',
                            evictionWorkflowKey: 'inventory_or_eviction',
                        });
                        if (!ok) {
                            showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                            return;
                        }
                        showToast('تم إنشاء الطلب — قرار المنفذ يظهر هنا.', 'success');
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
                {renderEvictionDecisionAccordion(
                    'طلب الإخلاء الجبري',
                    latestEvictionDecision(/الإخلاء\s*الجبري/i),
                    'eviction_procedure'
                )}
            </div>
        </div>
    );
};
