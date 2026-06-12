import React, { useMemo, useState } from 'react';
import { ChevronDown, Forward, Shuffle, FileText, RefreshCw, MessageSquare } from 'lucide-react';
import type { DossierActionPayload, DossierActionType } from './DossierActionsModal';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    DossierActionFormFields,
    DossierActionFormFooter,
    useDossierActionForm,
} from './DossierActionForm';
import { DossierExecutorDecisionStrip } from './DossierExecutorDecisionStrip';
import { shouldShowDossierControlExecutorStrip } from '../utils/dossierControlDecisions';
import type { InabaCorrespondenceLogEntry } from '../utils/inabaCorrespondenceLog';
import { useExecutorDecisions } from '../hooks/useExecutorDecisions';

const DOSSIER_BTN_BASE =
    'w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] relative z-10 cursor-pointer active:scale-[0.99]';

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
    onSubmit: (payload: DossierActionPayload) => boolean;
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
    onSubmit: (payload: DossierActionPayload) => boolean;
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
    const showSubmitForm = expanded && !executorStripVisible;
    const form = useDossierActionForm(item.id, showSubmitForm, parentFileId, inabaTargets);
    const handleConfirm = () => {
        const sent = onSubmit(form.buildPayload());
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
                    {!executorStripVisible ? (
                        <ChevronDown
                            size={18}
                            strokeWidth={2}
                            className={`shrink-0 text-[#D4AF37]/55 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        />
                    ) : null}
                </div>
            </button>

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
                    onSubmit={(payload) => {
                        const sent = onSubmit(payload);
                        if (sent) setExpandedId(null);
                        return sent;
                    }}
                />
            ))}
        </div>
    );
};
