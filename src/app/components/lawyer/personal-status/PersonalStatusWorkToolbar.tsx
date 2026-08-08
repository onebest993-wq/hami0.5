import React, { useEffect, useState } from 'react';
import { Activity, BookOpen, Calendar, FileText, ListTodo, Paperclip, Scale } from '@/app/components/ui/lucideIcons';
import type { CaseFlowActionsPanelProps } from '@/app/components/lawyer/smart-modal/parts/CaseFlowActionsPanel';
import { CaseFlowActionsPanel } from '@/app/components/lawyer/smart-modal/parts/CaseFlowActionsPanel';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { PersonalStatusLawReferencePortal } from '@/app/components/lawyer/personal-status/PersonalStatusLawReferencePortal';
import { prefetchCivilLawArticles } from '@/app/utils/civilLawRemoteCache';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import {
    PersonalStatusRailPrimary,
    PersonalStatusRailSecondary,
    PersonalStatusRailShell,
} from './PersonalStatusActionRail';
import { PS_HERO_ACTION } from './personalStatusPearlTheme';

type PersonalStatusWorkToolbarProps = {
    onAction: (type: string) => void;
    onOpenLegalActions: () => void;
    onOpenTasks: () => void;
    sessionSlot: React.ReactNode;
    variant?: 'full' | 'notes-only';
    caseFlow?: CaseFlowActionsPanelProps;
    applicableLaw?: PersonalApplicableLaw | '' | undefined;
    showLawReference?: boolean;
    showCaseFlow?: boolean;
    taskCount?: number;
};

export function PersonalStatusWorkToolbar({
    onAction,
    onOpenLegalActions,
    onOpenTasks,
    sessionSlot,
    variant = 'full',
    caseFlow,
    applicableLaw,
    showLawReference = true,
    showCaseFlow = true,
    taskCount = 0,
}: PersonalStatusWorkToolbarProps) {
    const [lawPanelOpen, setLawPanelOpen] = useState(false);
    const showAppointment = variant !== 'notes-only';
    const primaryCols = showAppointment ? 3 : 2;

    useEffect(() => {
        if (showLawReference) prefetchCivilLawArticles(['civil_procedure', 'evidence']);
    }, [showLawReference]);

    return (
        <>
            <div className="p-2 space-y-2" dir="rtl">
                <div className="grid grid-cols-2 gap-2 items-stretch min-w-0">
                    <div className="min-w-0">{sessionSlot}</div>
                    <button
                        type="button"
                        title="إجراء"
                        onClick={onOpenLegalActions}
                        className={PS_HERO_ACTION}
                    >
                        <div
                            className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#C9B89A]/10 blur-2xl"
                            aria-hidden
                        />
                        <span className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C9B89A]/35 bg-[#C9B89A]/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                            <Scale size={18} className="text-[#E8DFD0]" aria-hidden />
                        </span>
                        <div className="relative z-[1] min-w-0 flex-1 text-right">
                            <span className="block text-[8px] font-black tracking-[0.18em] text-[#C9B89A]/75 uppercase">
                                قانوني
                            </span>
                            <span className="block text-[13px] font-black text-[#FFFEF9] leading-tight">
                                إجراء
                            </span>
                        </div>
                    </button>
                </div>

                <PersonalStatusRailShell
                    primary={
                        <div
                            className={`col-span-full grid divide-x divide-x-reverse divide-white/[0.08] ${
                                primaryCols === 3 ? 'grid-cols-3' : 'grid-cols-2'
                            }`}
                        >
                            {showAppointment ? (
                                <PersonalStatusRailPrimary
                                    icon={Calendar}
                                    label="موعد"
                                    tone="rose"
                                    onClick={() => onAction('appointment')}
                                />
                            ) : null}
                            <PersonalStatusRailPrimary
                                icon={FileText}
                                label="ملاحظة"
                                tone="pearl"
                                onClick={() => onAction('note')}
                            />
                            {showCaseFlow && caseFlow ? (
                                <CaseFlowActionsPanel {...caseFlow} variant="rail" />
                            ) : (
                                <PersonalStatusRailPrimary
                                    icon={Activity}
                                    label="سير"
                                    tone="flow"
                                    onClick={() => {}}
                                />
                            )}
                        </div>
                    }
                    secondary={
                        <>
                            <PersonalStatusRailSecondary
                                icon={Paperclip}
                                label="مستند"
                                onClick={() => onAction('document')}
                            />
                            <PersonalStatusRailSecondary
                                icon={ListTodo}
                                label="مهمة"
                                onClick={onOpenTasks}
                                testId={CIVIL_LAWSUIT_TEST_IDS.taskAdd}
                                badge={taskCount}
                            />
                            {showLawReference ? (
                                <PersonalStatusRailSecondary
                                    icon={BookOpen}
                                    label="قانون"
                                    onClick={() => setLawPanelOpen(true)}
                                />
                            ) : null}
                        </>
                    }
                />
            </div>

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
