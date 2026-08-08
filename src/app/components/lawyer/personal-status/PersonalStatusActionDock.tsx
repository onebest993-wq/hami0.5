import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, FileText, Paperclip, Scale } from '@/app/components/ui/lucideIcons';
import type { CaseFlowActionsPanelProps } from '@/app/components/lawyer/smart-modal/parts/CaseFlowActionsPanel';
import { CaseFlowActionsPanel } from '@/app/components/lawyer/smart-modal/parts/CaseFlowActionsPanel';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { PersonalStatusLawReferencePortal } from '@/app/components/lawyer/personal-status/PersonalStatusLawReferencePortal';
import { prefetchCivilLawArticles } from '@/app/utils/civilLawRemoteCache';
import { PS_DOCK_BTN_ROSE, PS_RIBBON_BTN, PS_RIBBON_STRIP } from './personalStatusPearlTheme';
import { PersonalStatusGlassPanel } from './PersonalStatusMoroccanGlass';

const QUICK_ACTIONS = [
    { id: 'appointment', icon: Calendar, label: 'موعد' },
    { id: 'note', icon: FileText, label: 'ملاحظة' },
    { id: 'document', icon: Paperclip, label: 'مستند' },
    { id: 'legal', icon: Scale, label: 'إجراء' },
] as const;

type PersonalStatusActionDockProps = {
    onAction: (type: string) => void;
    onOpenLegalActions: () => void;
    variant?: 'full' | 'notes-only';
    caseFlow?: CaseFlowActionsPanelProps;
    showCaseFlow?: boolean;
    applicableLaw?: PersonalApplicableLaw | '' | undefined;
    showLawReference?: boolean;
    /** vertical = عمود أوامر · horizontal = شريط أفقي مضغوط */
    orientation?: 'vertical' | 'horizontal';
};

export function PersonalStatusActionDock({
    onAction,
    onOpenLegalActions,
    variant = 'full',
    caseFlow,
    showCaseFlow = true,
    applicableLaw,
    showLawReference = true,
    orientation = 'vertical',
}: PersonalStatusActionDockProps) {
    const [lawPanelOpen, setLawPanelOpen] = useState(false);
    const isHorizontal = orientation === 'horizontal';

    useEffect(() => {
        if (showLawReference) prefetchCivilLawArticles(['civil_procedure', 'evidence']);
    }, [showLawReference]);

    const quickItems =
        variant === 'notes-only'
            ? QUICK_ACTIONS.filter((a) => a.id === 'note' || a.id === 'document')
            : QUICK_ACTIONS;

    const iconBtnClass = isHorizontal ? PS_RIBBON_BTN : PS_DOCK_BTN_ROSE;

    const quickButtons = (
        <>
            {quickItems.map(({ id, icon: Icon, label }) => (
                <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => (id === 'legal' ? onOpenLegalActions() : onAction(id))}
                    className={iconBtnClass}
                >
                    <Icon size={isHorizontal ? 15 : 17} strokeWidth={1.75} />
                </button>
            ))}

            {showLawReference ? (
                <>
                    <div
                        className={
                            isHorizontal
                                ? 'w-px h-6 bg-gradient-to-b from-transparent via-white/[0.18] to-transparent shrink-0 mx-0.5'
                                : 'w-6 h-px bg-gradient-to-r from-transparent via-white/[0.22] to-transparent my-0.5 shrink-0'
                        }
                    />
                    <button
                        type="button"
                        title="المرجع القانوني"
                        onClick={() => setLawPanelOpen(true)}
                        className={iconBtnClass}
                    >
                        <BookOpen size={isHorizontal ? 15 : 17} strokeWidth={1.75} />
                    </button>
                </>
            ) : null}

            {showCaseFlow && caseFlow ? (
                <>
                    <div
                        className={
                            isHorizontal
                                ? 'w-px h-6 bg-gradient-to-b from-transparent via-white/[0.16] to-transparent shrink-0 mx-0.5'
                                : 'w-6 h-px bg-gradient-to-r from-transparent via-white/[0.20] to-transparent my-0.5 shrink-0'
                        }
                    />
                    <CaseFlowActionsPanel
                        {...caseFlow}
                        variant="dock"
                        compactDock={isHorizontal}
                    />
                </>
            ) : null}
        </>
    );

    return (
        <>
            {isHorizontal ? (
                <div className={PS_RIBBON_STRIP} dir="rtl">
                    {quickButtons}
                </div>
            ) : (
                <PersonalStatusGlassPanel
                    tone="rose"
                    className="rounded-[1.15rem] p-1.5 flex flex-col items-center self-start shrink-0"
                    patternOpacity={0.14}
                >
                    <span className="text-[7px] font-black tracking-[0.25em] text-[#FFD4DC]/75 py-0.5 shrink-0">
                        أوامر
                    </span>
                    <div className="flex flex-col items-center gap-1.5 shrink-0 w-full">
                        {quickButtons}
                    </div>
                </PersonalStatusGlassPanel>
            )}

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
