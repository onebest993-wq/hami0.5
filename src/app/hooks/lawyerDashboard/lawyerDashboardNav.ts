import { parseCommunityDeepLinkFromLocation } from '@/app/components/lawyer/CommunityScreen/communityDeepLink';
import { isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { wasProfileOpenedThisPage } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

export const LAWYER_DASHBOARD_TAB_KEY = 'hami:lawyer-dashboard-tab';
export const LAWYER_COMMUNITY_OPEN_KEY = 'hami:lawyer-community-open';
/** استعادة المستودع بعد إعادة التحميل — لمراجعة أول فتح بارد (مثل المنتدى) */
export const LAWYER_REPOSITORY_OPEN_KEY = 'hami:lawyer-repository-open';
export const LAWYER_REPOSITORY_TAB_KEY = 'hami:lawyer-repository-tab';
/** استعادة مركز المعاملات بعد إعادة التحميل — لمراجعة أول فتح بارد */
export const LAWYER_TRANSACTIONS_OPEN_KEY = 'hami:lawyer-transactions-open';
/** استعادة الإعدادات بعد إعادة التحميل — لمراجعة أول فتح بارد */
export const LAWYER_SETTINGS_OPEN_KEY = 'hami:lawyer-settings-open';
/** استعادة مهام الميدان/الأجندة بعد إعادة التحميل — لمراجعة أول فتح بارد (مثل المنتدى) */
export const LAWYER_FIELD_TASKS_OPEN_KEY = 'hami:lawyer-field-tasks-open';
export const LAWYER_FIELD_TASKS_SURFACE_KEY = 'hami:lawyer-field-tasks-surface';
/** فتح صندوق طلبات المساعدة بعد فتح مدير المهام (من تنبيه تعارض التقويم) */
export const LAWYER_TASKS_HELP_INBOX_KEY = 'hami:lawyer-tasks-help-inbox';
export const HAMI_OPEN_TASKS_HELP_INBOX_EVENT = 'hami:open-tasks-help-inbox';
/** استعادة لوحة الإشعارات بعد إعادة التحميل — لمراجعة أول فتح بارد */
export const LAWYER_NOTIFICATIONS_OPEN_KEY = 'hami:lawyer-notifications-open';
/** استعادة البحث الشامل بعد إعادة التحميل — لمراجعة أول فتح بارد */
export const LAWYER_GLOBAL_SEARCH_OPEN_KEY = 'hami:lawyer-global-search-open';

export type LawyerDashboardTab = 'home' | 'notifications' | 'profile' | 'schedule';

export type LawyerRepositorySessionTab = 'notepad' | 'vault';

export type LawyerFieldTasksSurface = 'sheet' | 'manager';

export function readInitialCommunityOpen(): boolean {
    if (typeof window === 'undefined') return false;
    if (parseCommunityDeepLinkFromLocation(window.location)) return true;
    try {
        /* overlay — لا يُستعاد بعد reload (يفتح المنتدى تلقائياً ويُربك المستخدم) */
        if (sessionStorage.getItem(LAWYER_COMMUNITY_OPEN_KEY) === '1') {
            sessionStorage.removeItem(LAWYER_COMMUNITY_OPEN_KEY);
        }
        if (sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY) === 'community') {
            sessionStorage.removeItem(LAWYER_DASHBOARD_TAB_KEY);
        }
    } catch {
        /* ignore storage */
    }
    return false;
}

export function readInitialRepositorySession(): {
    open: boolean;
    tab: LawyerRepositorySessionTab;
} {
    if (typeof window === 'undefined') return { open: false, tab: 'vault' };
    try {
        /* overlay — لا يُستعاد بعد reload */
        if (sessionStorage.getItem(LAWYER_REPOSITORY_OPEN_KEY) === '1') {
            sessionStorage.removeItem(LAWYER_REPOSITORY_OPEN_KEY);
        }
        sessionStorage.removeItem(LAWYER_REPOSITORY_TAB_KEY);
        return { open: false, tab: 'vault' };
    } catch {
        return { open: false, tab: 'vault' };
    }
}

export function persistRepositorySessionOpen(
    open: boolean,
    tab: LawyerRepositorySessionTab = 'vault',
): void {
    if (typeof window === 'undefined') return;
    try {
        if (open) {
            sessionStorage.setItem(LAWYER_REPOSITORY_OPEN_KEY, '1');
            sessionStorage.setItem(LAWYER_REPOSITORY_TAB_KEY, tab);
            return;
        }
        sessionStorage.removeItem(LAWYER_REPOSITORY_OPEN_KEY);
        sessionStorage.removeItem(LAWYER_REPOSITORY_TAB_KEY);
    } catch {
        /* ignore storage */
    }
}

export function readInitialTransactionsSession(): { open: boolean } {
    if (typeof window === 'undefined') return { open: false };
    try {
        /* overlay — لا يُستعاد بعد reload (يفتح المركز تلقائياً ويُربك المستخدم) */
        if (sessionStorage.getItem(LAWYER_TRANSACTIONS_OPEN_KEY) === '1') {
            sessionStorage.removeItem(LAWYER_TRANSACTIONS_OPEN_KEY);
        }
        return { open: false };
    } catch {
        return { open: false };
    }
}

export function persistTransactionsSessionOpen(open: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        if (open) {
            sessionStorage.setItem(LAWYER_TRANSACTIONS_OPEN_KEY, '1');
            return;
        }
        sessionStorage.removeItem(LAWYER_TRANSACTIONS_OPEN_KEY);
    } catch {
        /* ignore storage */
    }
}

export function readInitialSettingsSession(): { open: boolean } {
    /* لا نستعيد فتح الإعدادات بعد reload — كان يعلق sessionStorage عند فشل الإغلاق */
    return { open: false };
}

export function persistSettingsSessionOpen(open: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        if (open) {
            sessionStorage.setItem(LAWYER_SETTINGS_OPEN_KEY, '1');
            return;
        }
        sessionStorage.removeItem(LAWYER_SETTINGS_OPEN_KEY);
    } catch {
        /* ignore storage */
    }
}

export function readInitialFieldTasksSession(): {
    open: boolean;
    surface: LawyerFieldTasksSurface;
} {
    if (typeof window === 'undefined') return { open: false, surface: 'sheet' };
    try {
        /* overlay — لا يُستعاد بعد reload (يفتح الستارة تلقائياً ويُربك المستخدم) */
        if (sessionStorage.getItem(LAWYER_FIELD_TASKS_OPEN_KEY) === '1') {
            sessionStorage.removeItem(LAWYER_FIELD_TASKS_OPEN_KEY);
        }
        sessionStorage.removeItem(LAWYER_FIELD_TASKS_SURFACE_KEY);
        return { open: false, surface: 'sheet' };
    } catch {
        return { open: false, surface: 'sheet' };
    }
}

export function persistFieldTasksSessionOpen(
    open: boolean,
    surface: LawyerFieldTasksSurface = 'sheet',
): void {
    if (typeof window === 'undefined') return;
    try {
        if (open) {
            sessionStorage.setItem(LAWYER_FIELD_TASKS_OPEN_KEY, '1');
            sessionStorage.setItem(LAWYER_FIELD_TASKS_SURFACE_KEY, surface);
            return;
        }
        sessionStorage.removeItem(LAWYER_FIELD_TASKS_OPEN_KEY);
        sessionStorage.removeItem(LAWYER_FIELD_TASKS_SURFACE_KEY);
    } catch {
        /* ignore storage */
    }
}

export function readInitialNotificationsSession(): { open: boolean } {
    if (typeof window === 'undefined') return { open: false };
    try {
        return { open: sessionStorage.getItem(LAWYER_NOTIFICATIONS_OPEN_KEY) === '1' };
    } catch {
        return { open: false };
    }
}

export function persistNotificationsSessionOpen(open: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        if (open) {
            sessionStorage.setItem(LAWYER_NOTIFICATIONS_OPEN_KEY, '1');
            return;
        }
        sessionStorage.removeItem(LAWYER_NOTIFICATIONS_OPEN_KEY);
    } catch {
        /* ignore storage */
    }
}

export function readInitialGlobalSearchSession(): { open: boolean } {
    if (typeof window === 'undefined') return { open: false };
    try {
        /* overlay — لا يُستعاد بعد reload (يفتح البحث تلقائياً ويُربك المستخدم) */
        if (sessionStorage.getItem(LAWYER_GLOBAL_SEARCH_OPEN_KEY) === '1') {
            sessionStorage.removeItem(LAWYER_GLOBAL_SEARCH_OPEN_KEY);
        }
        return { open: false };
    } catch {
        return { open: false };
    }
}

export function persistGlobalSearchSessionOpen(open: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        if (open) {
            sessionStorage.setItem(LAWYER_GLOBAL_SEARCH_OPEN_KEY, '1');
            return;
        }
        sessionStorage.removeItem(LAWYER_GLOBAL_SEARCH_OPEN_KEY);
    } catch {
        /* ignore storage */
    }
}

export function readInitialLawyerTab(): LawyerDashboardTab {
    if (typeof window === 'undefined') return 'home';
    try {
        /* الملف والتقويم overlays داخل اللوحة — لا يُستعادان بعد reload */
        const savedTab = sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY);
        if (savedTab === 'profile' || savedTab === 'schedule') {
            sessionStorage.removeItem(LAWYER_DASHBOARD_TAB_KEY);
        }
        /* أول إقلاع للجلسة: دائماً الرئيسية */
        if (!isBootRevealDone()) {
            return 'home';
        }
        const saved = sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY);
        if (saved === 'notifications') {
            sessionStorage.removeItem(LAWYER_DASHBOARD_TAB_KEY);
        }
    } catch {
        /* ignore storage */
    }
    return 'home';
}

/** يمسح تبويب التقويم من الجلسة — يُستدعى عند الإغلاق */
export function clearPersistedLawyerScheduleTab(): void {
    if (typeof window === 'undefined') return;
    try {
        if (sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY) === 'schedule') {
            sessionStorage.removeItem(LAWYER_DASHBOARD_TAB_KEY);
        }
    } catch {
        /* ignore storage */
    }
}

/** يمسح تبويب الملف من الجلسة — يُستدعى عند الإغلاق */
export function clearPersistedLawyerProfileTab(): void {
    if (typeof window === 'undefined') return;
    try {
        if (sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY) === 'profile') {
            sessionStorage.removeItem(LAWYER_DASHBOARD_TAB_KEY);
        }
    } catch {
        /* ignore storage */
    }
}

/** إغلاق snap + جلسة — يُستدعى عند cold boot لمنع ظهور الملف دون نية */
export function resetProfileShellOnColdDashboardBoot(): void {
    /* إعادة تركيب اللوحة ليست cold boot إن كانت نية الفتح قائمة في هذه الصفحة */
    if (wasProfileOpenedThisPage()) return;
    clearPersistedLawyerProfileTab();
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute('data-hami-profile-open');
    document.documentElement.removeAttribute('data-hami-profile-closing');
}

export type CriminalReturnTarget = 'lawsuits_workspace' | 'main';

export type OpenCriminalCaseOptions = {
    /** فتح من مخزن الإضابير — الرجوع يعيد المخزن */
    fromLawsuitsWorkspace?: boolean;
    /** تبديل إضبارة داخل اللوحة دون تغيير وجهة الرجوع */
    keepReturnTarget?: boolean;
};

export function persistTasksHelpInboxIntent(open: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        if (open) {
            sessionStorage.setItem(LAWYER_TASKS_HELP_INBOX_KEY, '1');
            return;
        }
        sessionStorage.removeItem(LAWYER_TASKS_HELP_INBOX_KEY);
    } catch {
        /* ignore storage */
    }
}

export function consumeTasksHelpInboxIntent(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const open = sessionStorage.getItem(LAWYER_TASKS_HELP_INBOX_KEY) === '1';
        if (open) sessionStorage.removeItem(LAWYER_TASKS_HELP_INBOX_KEY);
        return open;
    } catch {
        return false;
    }
}

/** من التقويم: افتح مدير المهام + صندوق المساعدة */
export function requestOpenTasksHelpInbox(): void {
    if (typeof window === 'undefined') return;
    persistTasksHelpInboxIntent(true);
    window.dispatchEvent(new CustomEvent(HAMI_OPEN_TASKS_HELP_INBOX_EVENT));
}
