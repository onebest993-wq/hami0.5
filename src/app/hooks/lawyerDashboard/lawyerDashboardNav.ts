import { parseCommunityDeepLinkFromLocation } from '@/app/components/lawyer/CommunityScreen/communityDeepLink';

export const LAWYER_DASHBOARD_TAB_KEY = 'hami:lawyer-dashboard-tab';
export const LAWYER_COMMUNITY_OPEN_KEY = 'hami:lawyer-community-open';

export type LawyerDashboardTab = 'home' | 'notifications' | 'profile' | 'schedule';

export function readInitialCommunityOpen(): boolean {
    if (typeof window === 'undefined') return false;
    if (parseCommunityDeepLinkFromLocation(window.location)) return true;
    try {
        return (
            sessionStorage.getItem(LAWYER_COMMUNITY_OPEN_KEY) === '1' ||
            sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY) === 'community'
        );
    } catch {
        return false;
    }
}

export function readInitialLawyerTab(): LawyerDashboardTab {
    if (typeof window === 'undefined') return 'home';
    try {
        const saved = sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY);
        if (saved === 'schedule' || saved === 'profile' || saved === 'notifications') {
            return saved;
        }
    } catch {
        /* ignore storage */
    }
    return 'home';
}

export type CriminalReturnTarget = 'lawsuits_workspace' | 'main';

export type OpenCriminalCaseOptions = {
    /** فتح من مخزن الإضابير — الرجوع يعيد المخزن */
    fromLawsuitsWorkspace?: boolean;
    /** تبديل إضبارة داخل اللوحة دون تغيير وجهة الرجوع */
    keepReturnTarget?: boolean;
};
