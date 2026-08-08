import React, { useMemo, useState } from 'react';
import { ChevronDown, Forward, Shuffle, FileText, RefreshCw, MessageSquare } from '@/app/components/ui/lucideIcons';
import type { DossierActionPayload, DossierActionType } from './DossierActionsModal';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    DossierActionFormFields,
    DossierActionFormFooter,
    useDossierActionForm,
} from './DossierActionForm';
import { DossierExecutorDecisionStrip } from './DossierExecutorDecisionStrip';
import {
    findDossierControlDecisionRow,
    resolveDossierControlWorkflowLabels,
    resolveDossierControlWorkflowPhase,
    shouldShowDossierControlExecutorStrip,
} from '../utils/dossierControlDecisions';
import type { InabaCorrespondenceLogEntry } from '../utils/inabaCorrespondenceLog';
import { useExecutorDecisions } from '../hooks/useExecutorDecisions';

const DOSSIER_BTN_BASE =
    'w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] relative z-10 cursor-pointer active:scale-[0.99]';

function DossierWorkflowStepStrip(props: {
    phase: ReturnType<typeof resolveDossierControlWorkflowPhase>;
}) {
    const labels = resolveDossierControlWorkflowLabels(props.phase);
    const sentDone =
        props.phase === 'pending_executor' ||
        props.phase === 'approved_pending_apply' ||
        props.phase === 'rejected' ||
        props.phase === 'completed';
    const executorDone = props.phase === 'approved_pending_apply' || props.phase === 'completed';
    const executorActive = props.phase === 'pending_executor';
    const appliedDone = props.phase === 'completed';
    const appliedActive = props.phase === 'approved_pending_apply';
    const rejected = props.phase === 'rejected';

    const stepClass = (done: boolean, active: boolean, isRejected?: boolean) => {
        if (isRejected) return 'border-rose-400/40 bg-rose-500/10 text-rose-200';
        if (done) return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200';
        if (active) return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
        return 'border-white/10 bg-white/[0.03] text-slate-400';
    };

    return (
        <div className="flex flex-row-reverse items-stretch gap-1.5 px-4 pb-2 pt-1" dir="rtl">
            <div
                className={`flex-1 rounded-xl border px-2 py-1.5 text-center text-[9px] font-bold leading-tight ${stepClass(sentDone, false)}`}
            >
                {labels.sent}
            </div>
            <div
                className={`flex-1 rounded-xl border px-2 py-1.5 text-center text-[9px] font-bold leading-tight ${stepClass(executorDone, executorActive, rejected)}`}
            >
                {labels.executor}
            </div>
            <div
                className={`flex-1 rounded-xl border px-2 py-1.5 text-center text-[9px] font-bold leading-tight ${stepClass(appliedDone, appliedActive)}`}
            >
                {labels.applied}
            </div>
        </div>
    );
}

type DossierControlItem = {
    id: DossierActionType;
    label: string;
    icon: React.ReactNode;
    gradient: string;
};

const ITEMS: DossierControlItem[] = [
    {
        id: 'delegation',
        label: 'طلب الإنابة التنفيذية',
        icon: <Forward size={24} className="text-white/70" />,
        gradient: 'from-amber-500/12 to-transparent hover:from-amber-500/18',
    },
    {
        id: 'inaba_correspondence',
        label: 'طلب مخاطبة الإنابة',
        icon: <MessageSquare size={24} className="text-white/70" />,
        gradient: 'from-sky-500/12 to-transparent hover:from-sky-500/18',
    },
    {
        id: 'unify',
        label: 'طلب توحيد الأضابير',
        icon: <Shuffle size={24} className="text-white/70" />,
        gradient: 'from-violet-500/12 to-transparent hover:from-violet-500/18',
    },
    {
        id: 'transfer',
        label: 'طلب نقل الإضبارة',
        icon: <FileText size={24} className="text-white/70" />,
        gradient: 'from-emerald-500/12 to-transparent hover:from-emerald-500/18',
    },
    {
        id: 'renew',
        label: 'طلب تجديد الإضبارة',
        icon: <RefreshCw size={24} className="text-white/70" />,
        gradient: 'from-rose-500/12 to-transparent hover:from-rose-500/18',
    },
];

export type DossierControlsTabProps = {
    parentFileId: string;
    decisionsStorageExecutionId: string;
    inabaTargets: { id: string; directorate: string }[];
    showInabaCorrespondence: boolean;
    inabaCorrespondenceLog: InabaCorrespondenceLogEntry[];
    showRenew: boolean;
    saving?: boolean;
    onSubmit: (payload: DossierActionPayload) => boolean | Promise<boolean>;
    onExecutorOutcomeApplied?: () => void;
    appealPerspective?: AppealUiPerspective;
};

function DossierControlAccordionRow(props: {
    item: DossierControlItem;
    expanded: boolean;
    onToggle: () => void;
    parentFileId: string;
    decisionsStorageExecutionId: string;
    inabaTargets: { id: string; directorate: string }[];
    inabaCorrespondenceLog: InabaCorrespondenceLogEntry[];
    onExecutorOutcomeApplied?: () => void;
    saving?: boolean;
    onSubmit: (payload: DossierActionPayload) => boolean | Promise<boolean>;
    appealPerspective?: AppealUiPerspective;
}) {
    const {
        item,
        expanded,
        onToggle,
        parentFileId,
        decisionsStorageExecutionId,
        inabaTargets,
        inabaCorrespondenceLog,
        onExecutorOutcomeApplied,
        saving,
        onSubmit,
        appealPerspective = 'creditor_agent',
    } = props;
    const { decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const executorStripVisible = useMemo(
        () =>
            shouldShowDossierControlExecutorStrip({
                executionId: decisionsStorageExecutionId,
                parentExecutionId: parentFileId,
                actionType: item.id,
                decisions,
                appealPerspective,
            }),
        [
            appealPerspective,
            decisions,
            decisionsStorageExecutionId,
            item.id,
            parentFileId,
        ]
    );
    const activeRow = useMemo(
        () =>
            findDossierControlDecisionRow(decisions, item.id, {
                parentExecutionId: parentFileId,
                appealPerspective,
            }),
        [appealPerspective, decisions, item.id, parentFileId]
    );
    const workflowPhase = useMemo(
        () =>
            resolveDossierControlWorkflowPhase(activeRow, {
                parentExecutionId: parentFileId,
                allDecisions: decisions,
                appealPerspective,
            }),
        [activeRow, appealPerspective, decisions, parentFileId]
    );
    const showSubmitForm = expanded && !executorStripVisible;
    const form = useDossierActionForm(item.id, showSubmitForm, parentFileId, inabaTargets);
    const handleConfirm = async () => {
        const sent = await onSubmit(form.buildPayload());
        if (!sent) return;
        form.resetFields();
    };

    const handleHeaderClick = () => {
        onToggle();
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right" dir="rtl">
            <button
                type="button"
                aria-expanded={expanded}
                onClick={handleHeaderClick}
                className={`w-full ${DOSSIER_BTN_BASE} bg-gradient-to-l ${item.gradient}`}
            >
                <div className="flex flex-row-reverse items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                        {item.icon}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-bold text-white">{item.label}</p>
                    {executorStripVisible ? (
                        <span className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-100">
                            إجراء قائم
                        </span>
                    ) : null}
                    {!executorStripVisible ? (
                        <ChevronDown
                            size={18}
                            strokeWidth={2}
                            className={`shrink-0 text-[#D4AF37]/55 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        />
                    ) : null}
                </div>
            </button>

            {executorStripVisible ? (
                <DossierWorkflowStepStrip phase={workflowPhase} />
            ) : null}

            <DossierExecutorDecisionStrip
                executionId={decisionsStorageExecutionId}
                parentExecutionId={parentFileId}
                actionType={item.id}
                decisions={decisions}
                onOutcomeApplied={onExecutorOutcomeApplied}
                appealPerspective={appealPerspective}
            />

            {showSubmitForm ? (
                <div className="relative z-10 border-t border-white/10 bg-[#05060D]/40 px-4 pb-3 pt-3">
                    <DossierActionFormFields
                        actionType={item.id}
                        form={form}
                        inabaTargets={inabaTargets}
                    />
                    <DossierActionFormFooter
                        saving={saving}
                        disabled={form.isConfirmDisabled}
                        onCancel={onToggle}
                        onConfirm={handleConfirm}
                    />
                </div>
            ) : null}
        </div>
    );
}

export const DossierControlsTab: React.FC<DossierControlsTabProps> = ({
    parentFileId,
    decisionsStorageExecutionId,
    inabaTargets,
    showInabaCorrespondence,
    inabaCorrespondenceLog,
    showRenew,
    saving,
    onSubmit,
    onExecutorOutcomeApplied,
    appealPerspective = 'creditor_agent',
}) => {
    const [expandedId, setExpandedId] = useState<DossierActionType | null>(null);

    const visibleItems = ITEMS.filter((item) => {
        if (item.id === 'inaba_correspondence') return showInabaCorrespondence;
        if (item.id === 'renew') return showRenew;
        return true;
    });

    return (
        <div className="space-y-3" dir="rtl">
            {visibleItems.map((item) => (
                <DossierControlAccordionRow
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
                    parentFileId={parentFileId}
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inabaTargets={inabaTargets}
                    inabaCorrespondenceLog={inabaCorrespondenceLog}
                    onExecutorOutcomeApplied={onExecutorOutcomeApplied}
                    appealPerspective={appealPerspective}
                    saving={saving}
                    onSubmit={async (payload) => {
                        const sent = await onSubmit(payload);
                        if (sent) setExpandedId(item.id);
                        return sent;
                    }}
                />
            ))}
        </div>
    );
};
