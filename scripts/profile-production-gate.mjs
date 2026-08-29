#!/usr/bin/env node
/**
 * Gate الملف المهني — اختبارات وحدة + مسارات حرجة.
 *
 * Usage:
 *   npm run gate:profile
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/** ملف .tsx بجانب مجلد بنفس الاسم يحجب index — قنبلة module shadowing */
const PROFILE_SHADOW_STUB = 'src/app/components/lawyer/RoyalLawyerProfile.tsx';

const criticalPaths = [
    'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts',
    'src/app/hooks/lawyerDashboard/profile/profileShellOpenFlow.ts',
    'src/app/hooks/lawyerDashboard/profile/profileLazyImports.ts',
    'src/app/runtime/profileShellPrime.ts',
    'src/app/hooks/lawyerDashboard/useProfileTabMobileSuspend.ts',
    'src/app/hooks/lawyerDashboard/headerShellIntentWarm.ts',
    'src/app/services/profile/profileShellPolicy.ts',
    'src/app/runtime/royalLawyerProfileLoader.ts',
    'src/app/services/cloud/lawyerProfileCloud.ts',
    'src/app/services/profile/profileSaveTimeout.ts',
    'src/app/components/lawyer/dashboard/LawyerDashboardProfileTab.tsx',
    'src/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader.ts',
    'src/app/components/lawyer/RoyalLawyerProfile/ProfileErrorBoundary.tsx',
    'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter.tsx',
    'src/app/components/lawyer/RoyalLawyerProfile/lawyerProfileFx-android.css',
    'src/app/runtime/profileAndroidFxLoader.ts',
    'src/app/services/profileMediaService.ts',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== Profile production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

if (existsSync(PROFILE_SHADOW_STUB)) {
    fail(
        `${PROFILE_SHADOW_STUB} shadows RoyalLawyerProfile/ — delete stub or rename; imports without /index load wrong module`,
    );
} else {
    ok('no RoyalLawyerProfile.tsx shadow stub');
}

console.log('\nRunning profile unit test suite...');
const test = spawnSync(
    'npx',
    [
        'vitest',
        'run',
        'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardProfileTab.test.ts',
        'src/app/hooks/lawyerDashboard/profile/__tests__/profileShellOpenFlow.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/profileIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/lawyerDashboardHeaderPrefetch.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/headerShellIntentWarm.test.ts',
        'src/app/services/profile/__tests__',
        'src/app/hooks/__tests__/useLawyerProfileHeader.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileLifecycle.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileCanvasInView.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileLoader.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileEditSession.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileContentModel.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileDisplayCustomization.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileScreenEscape.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileSettingsFocusTrap.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileCanvasBackgroundEditor.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/components/__tests__/ProfileSettingsSheet.smoke.test.tsx',
        'src/app/components/lawyer/RoyalLawyerProfile/__tests__/lawyerProfileFx-android.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/__tests__/profileTouchTargetFloors.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/__tests__/profileChromeLayout.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/components/__tests__/ProfileChromeHeader.editSafety.test.tsx',
        'src/app/components/lawyer/RoyalLawyerProfile/components/__tests__/ProfileHeroActionRail.visitor.test.tsx',
        'src/app/components/lawyer/RoyalLawyerProfile/__tests__/profileCanvasFxLoader.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/__tests__/profilePageFxBudget.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/__tests__/profileVisualLite.test.ts',
        'src/app/runtime/__tests__/profileAndroidFxLoader.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/components/profileTextCanvas/__tests__/ProfileTextCanvasMaskLayers.test.tsx',
        'src/app/components/lawyer/RoyalLawyerProfile/components/profileTextCanvas/__tests__/useProfileTextCanvasReveal.test.ts',
        'src/app/runtime/__tests__/profileSectionSurgicalCloseHonesty.test.ts',
        'src/app/runtime/__tests__/worldclassProfileCloseHonesty.test.ts',
        'src/app/runtime/__tests__/profileOpenGestureSnappiness.test.ts',
        'src/app/runtime/__tests__/profileShellPrime.test.ts',
    ],
    { stdio: 'inherit', shell: true },
);

if (test.status !== 0) {
    fail('profile unit tests failed');
    process.exit(1);
}
ok('all profile unit tests passed');

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
process.exit(0);
