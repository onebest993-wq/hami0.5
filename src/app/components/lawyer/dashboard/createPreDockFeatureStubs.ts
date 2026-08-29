import { snapScheduleShellClose, snapScheduleShellOpen } from '@/app/services/schedule/scheduleShellSnap';
import { applyRepositoryOpaqueChrome, concealRepositoryWarmShell } from '@/app/runtime/repositoryInstantPaint';
import { applyForumOpaqueChrome, concealForumWarmShell, paintForumInstantChrome } from '@/app/runtime/forumInstantPaint';
import { markForumOpenIntentPending } from '@/app/runtime/forumOpenIntent';
import {
    readInitialCommunityOpen,
    readInitialLawyerTab,
    readInitialRepositorySession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type {
    PreDockFeatureBag,
    PreDockPendingOp,
} from '@/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces.types';

const noop = () => undefined;

export function readPreDockEarlyArm(): boolean {
    if (typeof window === 'undefined') return false;
    if (readInitialCommunityOpen()) return true;
    if (readInitialLawyerTab() === 'schedule') return true;
    if (readInitialRepositorySession().open) return true;
    return false;
}

function prefetchScheduleHostChunk(): void {
    void import('@/app/runtime/scheduleHubLoader')
        .then((m) => m.loadScheduleTabHostModule())
        .catch(() => undefined);
}

/** stubs خفيفة قبل first-tab-open — تفتح عبر requestArm ثم تُنفَّذ عند onReady */
export function createPreDockFeatureStubs(
    requestArm: (op: PreDockPendingOp) => void,
    clearPending?: (op?: PreDockPendingOp) => void,
): PreDockFeatureBag {
    const community = {
        showCommunity: false,
        setShowCommunity: noop as PreDockFeatureBag['community']['setShowCommunity'],
        communitySessionKey: 0,
        communityHostMounted: false,
        communityDeepLink: null,
        setCommunityDeepLink: noop as PreDockFeatureBag['community']['setCommunityDeepLink'],
        openCommunityTab: () => {
            markForumOpenIntentPending();
            applyForumOpaqueChrome();
            paintForumInstantChrome();
            requestArm('community');
        },
        closeCommunity: () => {
            concealForumWarmShell();
            clearPending?.('community');
        },
        primeCommunityShellMount: () => requestArm('community'),
        resetCommunityScreen: noop,
        resetCommunityShell: noop,
    } satisfies PreDockFeatureBag['community'];

    const schedule = {
        calendarSearchFocus: null,
        setCalendarSearchFocus: noop as PreDockFeatureBag['schedule']['setCalendarSearchFocus'],
        clearCalendarSearchFocus: noop,
        primeScheduleTabMount: () => {
            prefetchScheduleHostChunk();
            requestArm('schedule');
        },
        scheduleTabSessionKey: 0,
        scheduleHostMounted: false,
        resetScheduleTabShell: noop,
        openScheduleTab: () => {
            /* ستارة فورية + تسليح PreDock؛ الرجوع يعمل حتى قبل live hook */
            snapScheduleShellOpen();
            prefetchScheduleHostChunk();
            requestArm('schedule');
        },
        backToHomeFromSchedule: () => {
            snapScheduleShellClose();
            clearPending?.('schedule');
        },
    } satisfies PreDockFeatureBag['schedule'];

    const repository = {
        isRepositoryOpen: false,
        repositoryTab: 'notepad' as const,
        notepadMode: 'list' as const,
        focusNoteId: undefined,
        vaultOpenScanner: false,
        repositorySessionKey: 0,
        repositoryHostMounted: false,
        primeRepositoryShellMount: () => requestArm('repository'),
        resetRepositoryShell: noop,
        openRepository: () => {
            applyRepositoryOpaqueChrome();
            requestArm('repository');
        },
        openNotepad: () => {
            applyRepositoryOpaqueChrome();
            requestArm('repository');
        },
        openVaultModal: () => {
            applyRepositoryOpaqueChrome();
            requestArm('repository');
        },
        closeRepository: () => {
            concealRepositoryWarmShell();
            clearPending?.('repository');
        },
        isNotepadOpen: false,
        closeNotepad: () => {
            concealRepositoryWarmShell();
            clearPending?.('repository');
        },
        showDocs: false,
        closeVault: () => {
            concealRepositoryWarmShell();
            clearPending?.('repository');
        },
        primeNotepadShellMount: () => requestArm('repository'),
        primeVaultShellMount: () => requestArm('repository'),
        notepadSessionKey: 0,
        vaultSessionKey: 0,
    } satisfies PreDockFeatureBag['repository'];

    return { community, schedule, repository };
}

export function runPreDockPendingOp(bag: PreDockFeatureBag, op: PreDockPendingOp): void {
    if (!op) return;
    if (op === 'community') bag.community.openCommunityTab();
    else if (op === 'schedule') bag.schedule.openScheduleTab();
    else if (op === 'repository') bag.repository.openRepository();
}

/** الفتح البصري اكتمل — يُصفَّر التسليم دون إعادة فتح. */
export function isPreDockPendingOpSatisfied(bag: PreDockFeatureBag, op: PreDockPendingOp): boolean {
    if (!op) return true;
    if (op === 'community') return bag.community.showCommunity;
    if (op === 'schedule') return bag.schedule.scheduleHostMounted;
    if (op === 'repository') return bag.repository.isRepositoryOpen;
    return false;
}
