import { persistCommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { OpenCriminalCaseOptions } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { GlobalSearchNavigate } from '@/app/services/globalSearchIndex';
import { openExecutionDossierWithContract } from '@/app/runtime/executionOpenContract';
import { openLawsuitDossierWithContract } from '@/app/runtime/lawsuitOpenContract';
import { coerceExecutionFilePreserveId } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import type { Dispatch, SetStateAction } from 'react';
import type { OpenNotepadOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type { OpenScheduleTabOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';

export type GlobalSearchNavDispatchContext = {
    userId: string | null;
    files: FileData[];
    executionFiles: ExecutionFile[];
    closeGlobalSearch: () => void;
    openNotifications: () => void;
    openProfileTab: () => void;
    openScheduleTab: (opts?: OpenScheduleTabOptions) => void;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    openCommunityTab: () => void;
    setCommunityDeepLink: Dispatch<
        SetStateAction<{ postId?: string; openComments?: boolean } | null>
    >;
    openUrgentInLawsuitsWorkspace: (caseId?: string) => void;
    openCriminalCase: (caseId: string, options?: OpenCriminalCaseOptions) => void;
    openTransactionsHub: (focusId?: string) => void;
    openTasksManager: (focusTaskId?: string) => void;
    openNotepad: (opts?: OpenNotepadOptions) => void;
    openVaultModal: (opts?: { scanner?: boolean }) => void;
    setActiveFile: Dispatch<SetStateAction<FileData | ExecutionFile | null>>;
    selectCase: (caseId: string) => void;
    onNavigateToCase?: (caseId: string) => void;
};

/** يُنفّذ التنقّل من نتيجة البحث — يُرجع true إذا عُولج الطلب. */
export function dispatchGlobalSearchNavigate(
    nav: GlobalSearchNavigate,
    ctx: GlobalSearchNavDispatchContext,
): boolean {
    if (!isRealSignedIn(ctx.userId)) {
        ctx.closeGlobalSearch();
        return true;
    }

    if (nav.type === 'notifications') {
        ctx.openNotifications();
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'calendar') {
        ctx.openScheduleTab({ date: nav.date, eventId: nav.eventId });
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'repository') {
        persistCommunitySection('repository');
        ctx.openCommunityTab();
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'community') {
        ctx.openCommunityTab();
        if (nav.postId) {
            ctx.setCommunityDeepLink({ postId: nav.postId, openComments: false });
        }
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'profile') {
        ctx.openProfileTab();
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'urgent') {
        ctx.setActiveTab('home');
        ctx.openUrgentInLawsuitsWorkspace(nav.urgentId);
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'criminal') {
        ctx.openCriminalCase(nav.criminalId);
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'transactions') {
        ctx.setActiveTab('home');
        ctx.openTransactionsHub(nav.transactionId);
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'tasks_manager') {
        ctx.setActiveTab('home');
        ctx.openTasksManager(nav.taskId);
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'note' || nav.type === 'voice') {
        ctx.setActiveTab('home');
        ctx.openNotepad({ mode: 'list', focusNoteId: nav.noteId });
        ctx.closeGlobalSearch();
        return true;
    }
    if (nav.type === 'vault') {
        ctx.setActiveTab('home');
        ctx.openVaultModal();
        ctx.closeGlobalSearch();
        return true;
    }

    if (nav.type === 'file') {
        return dispatchGlobalSearchFileNavigate(nav, ctx);
    }
    if (nav.type === 'case') {
        return dispatchGlobalSearchCaseNavigate(nav, ctx);
    }

    ctx.closeGlobalSearch();
    return true;
}

function dispatchGlobalSearchFileNavigate(
    nav: Extract<GlobalSearchNavigate, { type: 'file' }>,
    ctx: GlobalSearchNavDispatchContext,
): boolean {
    if (!isRealSignedIn(ctx.userId)) {
        ctx.closeGlobalSearch();
        return true;
    }
    ctx.setActiveTab('home');
    const id = String(nav.fileId);
    const lawsuitHit = ctx.files.find((f) => String(f.id) === id);
    const executionHit = ctx.executionFiles.find((f) => String(f.id) === id);
    if (!lawsuitHit && !executionHit) {
        ctx.closeGlobalSearch();
        return true;
    }
    if (executionHit) {
        openExecutionDossierWithContract(() => {
            ctx.setActiveFile(coerceExecutionFilePreserveId(executionHit));
            ctx.closeGlobalSearch();
        });
        return true;
    }
    if (lawsuitHit) {
        openLawsuitDossierWithContract(() => {
            if (typeof nav.stageIndex === 'number' || typeof nav.eventId === 'string') {
                ctx.setActiveFile({
                    ...lawsuitHit,
                    ...(typeof nav.stageIndex === 'number'
                        ? { activeStageIndex: nav.stageIndex }
                        : {}),
                    ...(typeof nav.eventId === 'string'
                        ? { __searchFocusEventId: nav.eventId }
                        : {}),
                } as FileData);
            } else {
                ctx.setActiveFile(lawsuitHit);
            }
            ctx.closeGlobalSearch();
        });
    }
    return true;
}

function dispatchGlobalSearchCaseNavigate(
    nav: Extract<GlobalSearchNavigate, { type: 'case' }>,
    ctx: GlobalSearchNavDispatchContext,
): boolean {
    if (!isRealSignedIn(ctx.userId)) {
        ctx.closeGlobalSearch();
        return true;
    }
    ctx.setActiveTab('home');
    ctx.selectCase(nav.caseId);
    const lawsuitHit = ctx.files.find((f) => String(f.id) === nav.caseId);
    const executionHit = ctx.executionFiles.find((f) => String(f.id) === nav.caseId);
    if (executionHit) {
        openExecutionDossierWithContract(() => {
            ctx.setActiveFile(coerceExecutionFilePreserveId(executionHit));
            ctx.closeGlobalSearch();
        });
    } else if (lawsuitHit) {
        openLawsuitDossierWithContract(() => {
            ctx.setActiveFile(lawsuitHit);
            ctx.closeGlobalSearch();
        });
    } else {
        ctx.closeGlobalSearch();
    }
    ctx.onNavigateToCase?.(nav.caseId);
    return true;
}
