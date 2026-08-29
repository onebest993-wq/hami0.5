import { applyBootSurfacePaintFromStorage } from '@/app/services/settings/bootSurfacePaintCache';
import { armLocalOnlyIsolationAtBoot } from '@/app/services/settings/localOnlyBootArm';
import { kickoffBootCriticalPreload } from '@/boot/bootCriticalPreload';
import { shouldPreloadLawyerDashboardBoard } from '@/boot/shouldPreloadLawyerBoard';
import { scheduleCriticalGoogleFonts } from '@/app/runtime/deferredGoogleFonts';
import './styles/critical-shell.css';
import 'virtual:hami-critical-native-android';

/**
 * مدخل المحامي فقط — مقر القيادة له hq.html.
 */
armLocalOnlyIsolationAtBoot();
applyBootSurfacePaintFromStorage();
scheduleCriticalGoogleFonts();

/** Tier 0 — تسخين اللوحة فقط إن وُجدت جلسة مقبولة؛ وإلا مسار الهوية */
if (shouldPreloadLawyerDashboardBoard()) {
    void import('@/app/runtime/lawyerDashboardLoader').then((m) => {
        void m.loadLawyerDashboardModule();
    });
} else {
    void import('@/app/bootstrap/lawyerAuth/prefetchLawyerAuthLane').then((m) => {
        m.prefetchLawyerAuthLane();
    });
}

kickoffBootCriticalPreload();

void import('@/boot/bootStaleChunkReload').then((m) => m.installStaleChunkReload());
void import('@/boot/bootEntryPreamble').then((m) => m.runBootEntryPreamble());
