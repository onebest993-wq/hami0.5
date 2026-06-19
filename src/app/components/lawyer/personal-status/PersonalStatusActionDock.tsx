import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, FileText, Paperclip, Scale } from 'lucide-react';
import type { CaseFlowActionsPanelProps } from '@/app/components/lawyer/smart-modal/parts/CaseFlowActionsPanel';
import { CaseFlowActionsPanel } from '@/app/components/lawyer/smart-modal/parts/CaseFlowActionsPanel';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { PersonalStatusLawReferencePortal } from '@/app/components/lawyer/personal-status/PersonalStatusLawReferencePortal';
import { prefetchCivilLawArticles } from '@/app/utils/civilLawRemoteCache';
import { PS_DOCK_BTN_ROSE } from './personalStatusPearlTheme';
import { PersonalStatusGlassPanel } from './PersonalStatusMoroccanGlass';

const QUICK_ACTIONS = [
    { id: 'appointment', icon: Calendar, label: 'موعد' },
    { id: 'note', icon: FileText, label: 'ملاحظة' },
    { id: 'document', icon: Paperclip, label: 'مستند' },
    { id: 'legal', icon: Scale, label: 'إجراء' },
] as const;

export function PersonalStatusActionDock({
    onAction,
    onOpenLegalActions,
    variant = 'full',
    caseFlow,
    showCaseFlow = true,
    applicableLaw,
    showLawReference = true,
}: {
    onAction: (type: string) => void;
    onOpenLegalActions: () => void;
    variant?: 'full' | 'notes-only';
    caseFlow?: CaseFlowActionsPanelProps;
    showCaseFlow?: boolean;
    applicableLaw?: PersonalApplicableLaw | '' | undefined;
    showLawReference?: boolean;
}) {
    const [lawPanelOpen, setLawPanelOpen] = useState(false);

    useEffect(() => {
        if (showLawReference) prefetchCivilLawArticles(['civil_procedure', 'evidence']);
    }, [showLawReference]);

    const quickItems =
        variant === 'notes-only'
            ? QUICK_ACTIONS.filter((a) => a.id === 'note' || a.id === 'document')
            : QUICK_ACTIONS;

    return (
        <>
            <PersonalStatusGlassPanel
                tone="rose"
                className="rounded-[1.35rem] p-1.5 flex flex-col items-center h-full min-h-full self-stretch"
                patternOpacity={0.14}
            >
                <span className={`text-[7px] font-black tracking-[0.25em] text-[#FFD4DC]/75 py-0.5 shrink-0`}>
                    أوامر
                </span>
                <div className="flex flex-col items-center gap-1.5 shrink-0 w-full">
                    {quickItems.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            type="button"
                            title={label}
                            onClick={() => (id === 'legal' ? onOpenLegalActions() : onAction(id))}
                            className={PS_DOCK_BTN_ROSE}
                        >
                            <Icon size={17} strokeWidth={1.75} />
                        </button>
                    ))}

                    {showLawReference ? (
                        <>
                            <div className="w-6 h-px bg-gradient-to-r from-transparent via-white/[0.22] to-transparent my-0.5 shrink-0" />
                            <button
                                type="button"
                                title="المرجع القانوني"
                                onClick={() => setLawPanelOpen(true)}
                                className={PS_DOCK_BTN_ROSE}
                            >
                                <BookOpen size={17} strokeWidth={1.75} />
                            </button>
                        </>
                    ) : null}
                </div>

                <div className="flex-1 min-h-2 w-full" aria-hidden />

                {showCaseFlow && caseFlow ? (
                    <div className="flex flex-col items-center gap-1.5 shrink-0 w-full">
                        <div className="w-6 h-px bg-gradient-to-r from-transparent via-white/[0.20] to-transparent my-0.5 shrink-0" />
                        <CaseFlowActionsPanel {...caseFlow} variant="dock" />
                    </div>
                ) : null}
            </PersonalStatusGlassPanel>

            {showLawReference ? (
                <PersonalStatusLawReferencePortal
                    open={lawPanelOpen}
                    onClose={() => setLawPanelOpen(false)}
                    applicableLaw={applicableLaw}
                />
            ) : null}
        </>
    );
}
