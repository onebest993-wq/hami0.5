#!/usr/bin/env node
/**
 * Gate المنتدى القانوني (home-dock-forum) — اختبارات وحدة + مسارات حرجة.
 *
 * Usage:
 *   npm run gate:forum
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const criticalPaths = [
    'src/app/hooks/lawyerDashboard/useLawyerDashboardCommunity.ts',
    'src/app/hooks/lawyerDashboard/community/communityShellOpenFlow.ts',
    'src/app/hooks/lawyerDashboard/community/communityLazyImports.ts',
    'src/app/hooks/lawyerDashboard/forumIntentWarm.ts',
    'src/app/services/forum/forumPerfMetrics.ts',
    'src/app/services/forum/forumShellNavigation.ts',
    'src/app/runtime/communityHubLoader.ts',
    'src/app/runtime/communityBootHydrator.ts',
    'src/app/runtime/communityOverlayEntryLoader.ts',
    'src/app/components/lawyer/CommunityScreen/CommunityScreenHost.tsx',
    'src/app/runtime/forumInstantPaint.ts',
    'src/app/components/lawyer/CommunityScreen/hooks/useForumEscapeStack.ts',
    'src/app/components/lawyer/CommunityScreen/hooks/useForumLifecycle.ts',
    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCommunityOverlayEntry.tsx',
    'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== Forum production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

console.log('\nRunning forum unit test suite...');
const test = spawnSync(
    'npx',
    [
        'vitest',
        'run',
        'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardCommunity.test.ts',
        'src/app/api/forum/_auth.test.ts',
        'src/app/api/forum/posts.route.test.ts',
        'src/app/api/forum/authorization-and-sanitization.route.test.ts',
        'src/app/services/__tests__/secureApiNetworkFeatures.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/forumIntentWarmBehavior.test.ts',
        'src/app/hooks/lawyerDashboard/community/__tests__/communityShellOpenFlow.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/forumEscapeStack.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useForumFeedWindow.test.ts',
        'src/app/runtime/__tests__/forumDockSectionSurgicalCloseHonesty.test.ts',
        'src/app/runtime/__tests__/forumInstantPaint.test.ts',
        'src/app/runtime/__tests__/communityBootHydrator.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useForumEscapeStack.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/CommunityScreenAccessGate.test.tsx',
        'src/app/services/forum/__tests__/forumPerfMetrics.test.ts',
        'src/app/services/forum/__tests__/forumShellNavigation.test.ts',
        'src/app/services/forum/__tests__/forumShellOrchestration.test.ts',
        'src/app/services/forum/__tests__/forumInputSecurity.test.ts',
        'src/app/services/forum/__tests__/forumUrlSafety.test.ts',
        'src/app/services/forum/__tests__/forumPostCreateGuard.test.ts',
        'src/app/services/forum/__tests__/forumPostsWarmCache.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useCommunityAddQuestion.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useCommunityPostActions.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/communityAddQuestionPublishGuard.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/forumVoiceRecorderControl.test.ts',
        'src/app/components/lawyer/CommunityScreen/communityPermissions.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/legalRepositoryListQuery.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/legalRepositoryNormalize.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useLegalRepositoryMutations.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/forumRateLimit.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useCommunityScreenPostAdmin.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useCommunityScreenFollowActions.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useCommentThreadWindow.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/communityCommentContent.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/communityAddQuestionPublishDraft.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/forumAsync.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/forumLazySectionMount.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/legalRepositoryCloudSync.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/communityAddQuestionPublishCommit.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useLegalRepositoryUpload.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useForumLifecycle.hiddenHost.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/communityScreenLazySections.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/legalRepositoryLocalReports.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useLegalRepositoryBootstrap.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useCommunityScreenLazySectionMount.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useExpandingVisibleCount.test.ts',
        'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useInViewOnce.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/forumGroupCreateGuard.test.ts',
        'src/app/components/lawyer/CommunityScreen/__tests__/forumCommentRowLayout.test.ts',
        'src/app/components/lawyer/CommunityScreen/components/ForumCommentRow.test.tsx',
        'src/app/components/lawyer/CommunityScreen/__tests__/forumSwipeEdgeGuard.test.ts',
    ],
    { stdio: 'inherit', shell: true },
);

if (test.status !== 0) {
    fail('forum unit tests failed');
    process.exit(1);
}
ok('all forum unit tests passed');

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
process.exit(0);
