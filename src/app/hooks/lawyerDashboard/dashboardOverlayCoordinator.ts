import {
    HAMI_DISMISS_OVERLAYS_EVENT,
    reconcileBodyScrollLock,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';
import { markOverlaySnapClosing } from '@/app/runtime/overlaySnapClose';
import { isProfileShellSnappedOpen } from '@/app/services/profile/profileShellSnap';
import { isViteE2eHooksEnabled } from '@/app/utils/viteE2eHooks';

type OverlayCloser = () => void;

const closers = new Map<TransientOverlayId, OverlayCloser>();
let coordinatorInstalled = false;

/** المستودع الموحّد — معرّفات legacy تُعامل كطبقة واحدة */
const REPOSITORY_OVERLAY_GROUP = new Set<TransientOverlayId>(['repository', 'notepad', 'vault']);

/** ستارة الميدان + الأجندة — فتح أحدهما لا يُغلق الآخر عبر dismiss متقاطع */
const FIELD_TASKS_OVERLAY_GROUP = new Set<TransientOverlayId>(['field-tasks', 'tasks-manager']);

/** تبويب الملف + استوديو الإعدادات — فتح التبويب لا يُغلق نفسه عبر profile-settings */
const PROFILE_OVERLAY_GROUP = new Set<TransientOverlayId>(['profile', 'profile-settings']);

/** طبقات الهيدر الخفيفة — لا تُطرد تبويب الملف عند فتحها */
const PROFILE_PERSIST_EXCEPTS = new Set<TransientOverlayId>([
    'notifications',
    'global-search',
    'settings',
]);

function shouldSkipCloser(id: TransientOverlayId, except?: TransientOverlayId): boolean {
    if (!except) return false;
    if (id === except) return true;
    if (REPOSITORY_OVERLAY_GROUP.has(except) && REPOSITORY_OVERLAY_GROUP.has(id)) return true;
    if (FIELD_TASKS_OVERLAY_GROUP.has(except) && FIELD_TASKS_OVERLAY_GROUP.has(id)) return true;
    if (PROFILE_OVERLAY_GROUP.has(except) && PROFILE_OVERLAY_GROUP.has(id)) return true;
    return false;
}

/**
 * تبويب الملف يُغلق عند فتح شاشة بديلة (منتدى/مستودع/…) لا عند dismiss عام للستائر.
 * العودة للرئيسية تمسح snap أولاً ثم تستدعي dismiss — لا تعتمد على طرد التبويب من هنا.
 */
export function shouldEvictProfileTabOnDismiss(except?: TransientOverlayId): boolean {
    if (except === undefined) return !isProfileShellSnappedOpen();
    if (PROFILE_OVERLAY_GROUP.has(except)) return false;
    if (PROFILE_PERSIST_EXCEPTS.has(except)) return false;
    if (REPOSITORY_OVERLAY_GROUP.has(except)) return true;
    if (FIELD_TASKS_OVERLAY_GROUP.has(except)) return true;
    if (except === 'forum' || except === 'transactions') return true;
    return false;
}

function recordE2eOverlayDismiss(except: TransientOverlayId | undefined, evictProfile: boolean): void {
    if (!isViteE2eHooksEnabled() || typeof window === 'undefined') return;
    const w = window as Window & {
        __hamiE2eLastOverlayDismiss?: {
            except: TransientOverlayId | null;
            evictProfile: boolean;
            profileOpen: string | null;
            at: number;
            stack: string;
        };
    };
    w.__hamiE2eLastOverlayDismiss = {
        except: except ?? null,
        evictProfile,
        profileOpen:
            typeof document === 'undefined'
                ? null
                : document.documentElement.getAttribute('data-hami-profile-open'),
        at: Date.now(),
        stack: new Error().stack?.split('\n').slice(0, 14).join('\n') ?? '',
    };
}

function onDismissEvent(event: Event): void {
    markOverlaySnapClosing();
    const except = (event as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
    const evictProfile = shouldEvictProfileTabOnDismiss(except);
    recordE2eOverlayDismiss(except, evictProfile);
    for (const [id, close] of closers) {
        if (shouldSkipCloser(id, except)) continue;
        if (id === 'profile' && !evictProfile) continue;
        close();
    }
    reconcileBodyScrollLock();
}

function ensureCoordinator(): void {
    if (coordinatorInstalled || typeof window === 'undefined') return;
    coordinatorInstalled = true;
    window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismissEvent);
}

/** تسجيل إغلاق overlay واحد — مستمع dismiss موحّد */
export function registerDashboardOverlayCloser(
    id: TransientOverlayId,
    close: OverlayCloser,
): () => void {
    ensureCoordinator();
    closers.set(id, close);
    return () => {
        closers.delete(id);
    };
}

/** للاختبارات */
export function resetDashboardOverlayCoordinatorForTests(): void {
    closers.clear();
    if (coordinatorInstalled && typeof window !== 'undefined') {
        window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismissEvent);
    }
    coordinatorInstalled = false;
}

export function getRegisteredDashboardOverlayIds(): TransientOverlayId[] {
    return [...closers.keys()];
}
