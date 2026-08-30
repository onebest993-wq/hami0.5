import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(rel: string): string {
    return readFileSync(join(ROOT, rel), 'utf8');
}

/**
 * قفل صدق: الحلقات الدائمة على اللوحة يجب أن تتوقف في الخلفية.
 * مؤقّتات الحوار/التسجيل/العدّ التنازلي قصيرة العمر وتُستثنى.
 */
describe('mobile battery — dashboard intervals pause in background', () => {
    it('تذكير التقويم الأصلي يعيد المزامنة بمؤقّت يحترم الخفاء', () => {
        const src = read('src/app/services/notifications/native/useCalendarNativeReminderSync.ts');
        expect(src).toContain('useVisibilityAwareInterval');
        expect(src).not.toMatch(/window\.setInterval\(/);
    });

    it('مشاركة القضايا لا تستقصي والتطبيق مخفى', () => {
        const src = read('src/app/hooks/useIncomingCaseShares.ts');
        expect(src).toContain('useVisibilityAwareInterval');
        expect(src).not.toMatch(/window\.setInterval\(/);
    });

    it('تنظيف العاجل يتوقف في الخلفية', () => {
        const src = read(
            'src/app/components/lawyer/View_Urgent_And_Orders_Dashboard/hooks/useUrgentCasesStorage.ts',
        );
        expect(src).toContain('useVisibilityAwareInterval');
        expect(src).not.toMatch(/window\.setInterval\(/);
    });

    it('محرك القرارات لا ينبض كل دقيقة في الجيب', () => {
        const src = read(
            'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsHubUiState.ts',
        );
        expect(src).toContain('useVisibilityAwareInterval');
        expect(src).not.toMatch(/window\.setInterval\(/);
    });

    it('قفل الخمول يتوقف في الخلفية — القفل عند الإخفاء يبقى حدثاً لا حلقة', () => {
        const src = read('src/app/hooks/useAppLock.ts');
        expect(src).toContain('useVisibilityAwareInterval');
        expect(src).not.toMatch(/window\.setInterval\(/);
    });

    it('نبض المقر لا يوقظ JS كل ٣٠ث والتطبيق مخفى', () => {
        const src = read('src/app/components/admin/useHeadquartersStatus.ts');
        expect(src).toContain('useVisibilityAwareInterval');
        expect(src).not.toMatch(/window\.setInterval\(/);
    });

    it('منبّه التقويم يوقف الصوت عند الخفاء والحالة الأصلية', () => {
        const src = read('src/app/components/lawyer/SmartLegalRadar/CalendarReminderModal.tsx');
        expect(src).toContain('visibilitychange');
        expect(src).toContain('document.hidden');
        expect(src).toContain('HAMI_APP_STATE_EVENT');
        expect(src).toContain('pagehide');
        expect(src).toContain('stopLoop()');
    });

    it('تنبيهات السكرتير تتوقف على الحالة الأصلية لا الرؤية وحدها', () => {
        const src = read('src/app/hooks/useAppAlerts.ts');
        expect(src).toContain('HAMI_APP_STATE_EVENT');
        expect(src).toContain('pagehide');
        expect(src).toContain('stopInterval');
    });

    it('حارس جلسة BFF يوقف النبض في الخلفية', () => {
        const src = read('src/app/utils/bffAuthClient.ts');
        expect(src).toContain('HAMI_APP_STATE_EVENT');
        expect(src).toContain('stopKeeperTimer');
        expect(src).toContain('applyKeeperForeground');
    });

    it('دورة حياة Capacitor تُربَط مرة واحدة', () => {
        const src = read('src/app/runtime/capacitorAppLifecycle.ts');
        expect(src).toContain('if (wired) return');
        expect(src).toContain('wired = true');
    });

    it('عدّ إعادة إرسال الرمز من موعد نهائي لا حلقة ثانية في الجيب', () => {
        const src = read('src/app/bootstrap/lawyerAuth/LawyerAuthOtpPanel.tsx');
        expect(src).toContain('useVisibilityAwareInterval');
        expect(src).toContain('resendDeadlineRef');
        expect(src).not.toMatch(/window\.setInterval\(/);
    });

    it('مستمع appStateChange الأصلي واحد — الناشر في دورة الحياة', () => {
        const lifecycle = read('src/app/runtime/capacitorAppLifecycle.ts');
        expect(lifecycle).toContain("addListener('appStateChange'");
        expect(read('src/app/runtime/nativeResumeFastPath.ts')).not.toContain(
            "addListener('appStateChange'",
        );
        expect(read('src/app/runtime/nativeResumeFastPath.ts')).not.toContain(
            "addEventListener('visibilitychange'",
        );
        expect(read('src/app/runtime/privacyBlurRuntime.ts')).not.toContain(
            "addListener('appStateChange'",
        );
        expect(read('src/app/services/platform/mediaCaptureBackgroundRelease.ts')).not.toContain(
            "addListener('appStateChange'",
        );
        expect(read('src/app/hooks/lawyerDashboard/useNotificationBackgroundSync.ts')).not.toContain(
            "addListener('appStateChange'",
        );
        expect(read('src/app/hooks/lawyerDashboard/useNotificationBackgroundSync.ts')).toContain(
            'useVisibilityAwareInterval',
        );
        expect(read('src/app/hooks/useVisibilityAwareInterval.ts')).toContain('HAMI_APP_STATE_EVENT');

        const hits: string[] = [];
        const walk = (dir: string) => {
            for (const ent of readdirSync(dir, { withFileTypes: true })) {
                const p = join(dir, ent.name);
                if (ent.isDirectory()) {
                    if (ent.name === '__tests__' || ent.name === 'node_modules') continue;
                    walk(p);
                    continue;
                }
                if (!/\.(ts|tsx)$/.test(ent.name)) continue;
                if (/\.test\.(ts|tsx)$/.test(ent.name)) continue;
                const text = readFileSync(p, 'utf8');
                if (text.includes("addListener('appStateChange'")) hits.push(p.replace(/\\/g, '/'));
            }
        };
        walk(join(ROOT, 'src'));
        expect(hits).toEqual([
            join(ROOT, 'src/app/runtime/capacitorAppLifecycle.ts').replace(/\\/g, '/'),
        ]);
    });

    it('عدّ المسح يُلغى في الخلفية ولا يكتمل في الجيب', () => {
        const src = read('src/app/components/lawyer/HamiSettings/hooks/useWipeCountdown.ts');
        expect(src).toContain('subscribeAppForeground');
        expect(src).toContain('onSuspend: cancelCountdown');
    });

    it('عدّ الحذف النهائي يُصفَّر ويُوقف في الخلفية', () => {
        const src = read(
            'src/app/components/lawyer/View_Urgent_And_Orders_Dashboard/hooks/useUrgentLifecycleModals.ts',
        );
        expect(src).toContain('subscribeAppForeground');
        expect(src).toContain('resetAndPause');
    });

    it('دفع الويب VAPID لا يُشتَرك على الأصلي — FCM يملك التسليم', () => {
        const push = read('src/app/services/PushNotificationService.ts');
        expect(push).toContain("blockPushSubscribe('native-fcm')");
        expect(push).toContain('isCapacitorNativePlatform()');
        const sync = read('src/app/services/appAlertPushSync.ts');
        expect(sync).toContain('if (isCapacitorNativePlatform()) return');
    });

    it('إيقاع الرسم يتوقف على بوابة المقدّمة لا الرؤية وحدها', () => {
        const src = read('src/app/runtime/framePacingGuard.ts');
        expect(src).toContain('subscribeAppForeground');
        expect(src).toContain('isAppForeground()');
    });

    it('تسجيل صوت المنتدى يحرّر المايك عند الخلفية', () => {
        const src = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityAddQuestionVoice.ts',
        );
        expect(src).toContain('subscribeCaptureBackgroundRelease');
        expect(src).toContain("haltVoiceSession({ discard: true })");
    });
});
