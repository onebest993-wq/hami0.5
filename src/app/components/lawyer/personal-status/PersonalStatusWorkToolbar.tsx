import React, { useEffect, useState } from 'react';
import { CalendarDays } from '@/app/components/ui/icons/CalendarDays';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { ListChecks } from '@/app/components/ui/icons/ListChecks';
import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { ScrollText } from '@/app/components/ui/icons/ScrollText';
import { StickyNote } from '@/app/components/ui/icons/StickyNote';
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
    const showFlowRail = showCaseFlow && Boolean(caseFlow);
    const primaryCols = (showAppointment ? 1 : 0) + 1 + (showFlowRail ? 1 : 0);

    useEffect(() => {
        if (showLawReference) prefetchCivilLawArticles(['civil_procedure', 'evidence']);
    }, [showLawReference]);

    return (
        <>
            <div className="p-1.5 space-y-1.5" dir="rtl">
                <div className="grid grid-cols-2 gap-1.5 items-stretch min-w-0">
                    <div className="min-w-0">{sessionSlot}</div>
                    <button
                        type="button"
                        title="إجراء قانوني"
                        onClick={onOpenLegalActions}
                        className={PS_HERO_ACTION}
                    >
                        <Gavel size={15} className="shrink-0 text-white/55" strokeWidth={1.7} aria-hidden />
                        <span className="min-w-0 flex-1 text-right text-[12px] font-bold text-white/88">
                            إجراء قانوني
                        </span>
                    </button>
                </div>

                <PersonalStatusRailShell
                    secondaryCount={2 + (showLawReference ? 1 : 0)}
                    primary={
                        <div
                            className={`col-span-full grid divide-x divide-x-reverse divide-white/[0.08] ${
                                primaryCols === 3
                                    ? 'grid-cols-3'
                                    : primaryCols === 2
                                      ? 'grid-cols-2'
                                      : 'grid-cols-1'
                            }`}
                        >
                            {showAppointment ? (
                                <PersonalStatusRailPrimary
                                    icon={CalendarDays}
                                    label="موعد"
                                    onClick={() => onAction('appointment')}
                                />
                            ) : null}
                            <PersonalStatusRailPrimary
                                icon={StickyNote}
                                label="ملاحظة"
                                onClick={() => onAction('note')}
                            />
                            {showFlowRail && caseFlow ? (
                                <CaseFlowActionsPanel {...caseFlow} variant="rail" />
                            ) : null}
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
                                icon={ListChecks}
                                label="مهمة"
                                onClick={onOpenTasks}
                                testId={CIVIL_LAWSUIT_TEST_IDS.taskAdd}
                                badge={taskCount}
                            />
                            {showLawReference ? (
                                <PersonalStatusRailSecondary
                                    icon={ScrollText}
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
