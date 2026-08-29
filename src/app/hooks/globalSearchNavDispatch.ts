import { persistCommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { OpenCriminalCaseOptions } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { GlobalSearchNavigate } from '@/app/services/globalSearchIndex';
import { isOwnedCriminalCaseId } from '@/app/services/search/globalSearchCriminalOwnership';
import { sanitizeGlobalSearchNavigate } from '@/app/services/search/globalSearchNavigateSecurity';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import { openExecutionDossierWithContract } from '@/app/runtime/executionOpenContract';
import { openLawsuitDossierWithContract } from '@/app/runtime/lawsuitOpenContract';
import { coerceExecutionFilePreserveId } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { findLawsuitFileAcrossSegments } from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import type { Dispatch, SetStateAction } from 'react';
import type { OpenNotepadOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type { OpenScheduleTabOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';

/** رسالة واحدة عند الفشل — بلا تمييز ملكية عن غياب حتى لا يُربك أو يُسرَّب. */
export const GLOBAL_SEARCH_NAV_UNAVAILABLE = 'تعذّر فتح النتيجة';

export type GlobalSearchNavDispatchContext = {
    userId: string | null;
    files: FileData[];
    executionFiles: ExecutionFile[];
    criminalCases?: unknown[];
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
    if (!hasLocalAppSession(ctx.userId)) {
        return failSearchNavigate(ctx);
    }
    const safe = sanitizeGlobalSearchNavigate(nav);
    if (!safe) {
        return failSearchNavigate(ctx);
    }
    nav = safe;

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
        if (!isOwnedCriminalCaseId(ctx.criminalCases ?? [], nav.criminalId)) {
            return failSearchNavigate(ctx);
        }
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

    return failSearchNavigate(ctx);
}

function failSearchNavigate(ctx: GlobalSearchNavDispatchContext): true {
    SmartToast.error(GLOBAL_SEARCH_NAV_UNAVAILABLE);
    ctx.closeGlobalSearch();
    return true;
}

function dispatchGlobalSearchFileNavigate(
    nav: Extract<GlobalSearchNavigate, { type: 'file' }>,
    ctx: GlobalSearchNavDispatchContext,
): boolean {
    const id = String(nav.fileId);
    const lawsuitHit =
        ctx.files.find((f) => String(f.id) === id) ?? findLawsuitFileAcrossSegments(id) ?? undefined;
    const executionHit = ctx.executionFiles.find((f) => String(f.id) === id);
    if (!lawsuitHit && !executionHit) {
        return failSearchNavigate(ctx);
    }
    ctx.setActiveTab('home');
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
    const lawsuitHit = ctx.files.find((f) => String(f.id) === nav.caseId);
    const executionHit = ctx.executionFiles.find((f) => String(f.id) === nav.caseId);
    if (!lawsuitHit && !executionHit) {
        return failSearchNavigate(ctx);
    }
    ctx.setActiveTab('home');
    ctx.selectCase(nav.caseId);
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
    }
    ctx.onNavigateToCase?.(nav.caseId);
    return true;
}
