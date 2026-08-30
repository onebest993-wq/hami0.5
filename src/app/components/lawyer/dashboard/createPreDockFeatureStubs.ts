import { snapScheduleShellClose, snapScheduleShellOpen } from '@/app/services/schedule/scheduleShellSnap';
import { applyRepositoryOpaqueChrome, concealRepositoryWarmShell, paintRepositoryInstantChrome } from '@/app/runtime/repositoryInstantPaint';
import { loadRepositoryHubModule, prefetchRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';
import { applyForumOpaqueChrome, concealForumWarmShell, paintForumInstantChrome } from '@/app/runtime/forumInstantPaint';
import { markForumOpenIntentPending } from '@/app/runtime/forumOpenIntent';
import { armForumE2eForceOpenStub } from '@/app/runtime/forumE2eForceOpen';
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
    return false;
}

/** جلسة مستودع مفتوحة — لا يُسلَّح PreDock (منتدى+تقويم) معها */
export function readRepositoryEarlyArm(): boolean {
    if (typeof window === 'undefined') return false;
    return readInitialRepositorySession().open;
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

    /* E2E: الخطاف الحي يُسجَّل بعد PreDock الكسول — الـ stub يملأ الفجوة */
    armForumE2eForceOpenStub(() => community.openCommunityTab());

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

    const repository: PreDockFeatureBag['repository'] = {
        isRepositoryOpen: false,
        repositoryTab: 'notepad',
        notepadMode: 'list',
        focusNoteId: undefined,
        vaultOpenScanner: false,
        repositorySessionKey: 0,
        repositoryHostMounted: false,
        primeRepositoryShellMount: () => requestArm('repository'),
        resetRepositoryShell: noop,
        openRepository: () => undefined,
        openNotepad: () => undefined,
        openVaultModal: () => undefined,
        closeRepository: () => undefined,
        isNotepadOpen: false,
        closeNotepad: () => undefined,
        showDocs: false,
        closeVault: () => undefined,
        primeNotepadShellMount: () => requestArm('repository'),
        primeVaultShellMount: () => requestArm('repository'),
        notepadSessionKey: 0,
        vaultSessionKey: 0,
    };

    const snapRepositoryStubOpen = () => {
        /* قشرة فورية. تسليح جزيرة المستودع فوراً — لا ننتظر المقطع ولا PreDock */
        repository.isRepositoryOpen = true;
        repository.isNotepadOpen = true;
        repository.showDocs = true;
        repository.repositoryHostMounted = true;
        applyRepositoryOpaqueChrome();
        paintRepositoryInstantChrome();
        prefetchRepositoryHubModule();
        requestArm('repository');
        void loadRepositoryHubModule().catch(() => undefined);
    };

    const snapRepositoryStubClose = () => {
        repository.isRepositoryOpen = false;
        repository.isNotepadOpen = false;
        repository.showDocs = false;
        repository.repositoryHostMounted = false;
        concealRepositoryWarmShell();
        clearPending?.('repository');
    };

    repository.openRepository = snapRepositoryStubOpen;
    repository.openNotepad = snapRepositoryStubOpen;
    repository.openVaultModal = snapRepositoryStubOpen;
    repository.closeRepository = snapRepositoryStubClose;
    repository.closeNotepad = snapRepositoryStubClose;
    repository.closeVault = snapRepositoryStubClose;

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
