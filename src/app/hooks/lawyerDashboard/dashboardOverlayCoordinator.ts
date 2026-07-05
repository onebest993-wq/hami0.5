import {
    HAMI_DISMISS_OVERLAYS_EVENT,
    reconcileBodyScrollLock,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';

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
    'home-layout-edit',
]);

function shouldSkipCloser(id: TransientOverlayId, except?: TransientOverlayId): boolean {
    if (!except) return false;
    if (id === except) return true;
    if (REPOSITORY_OVERLAY_GROUP.has(except) && REPOSITORY_OVERLAY_GROUP.has(id)) return true;
    if (FIELD_TASKS_OVERLAY_GROUP.has(except) && FIELD_TASKS_OVERLAY_GROUP.has(id)) return true;
    if (PROFILE_OVERLAY_GROUP.has(except) && PROFILE_OVERLAY_GROUP.has(id)) return true;
    return false;
}

/** تبويب الملف يُغلق فقط عند dismiss كامل أو فتح شاشة بديلة — لا عند إشعارات/بحث */
export function shouldEvictProfileTabOnDismiss(except?: TransientOverlayId): boolean {
    if (except === undefined) return true;
    if (PROFILE_OVERLAY_GROUP.has(except)) return false;
    if (PROFILE_PERSIST_EXCEPTS.has(except)) return false;
    if (REPOSITORY_OVERLAY_GROUP.has(except)) return true;
    if (FIELD_TASKS_OVERLAY_GROUP.has(except)) return true;
    if (except === 'forum' || except === 'transactions') return true;
    return false;
}

function onDismissEvent(event: Event): void {
    const except = (event as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
    const evictProfile = shouldEvictProfileTabOnDismiss(except);
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
