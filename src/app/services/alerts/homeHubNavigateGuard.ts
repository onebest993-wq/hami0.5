/** حراسة تفاعل البطاقة ومسار التنقّل — بلا UI. */
import { parseWorkspaceRoute } from '@/app/workspace/workspaceRoutes';

export const HOME_HUB_CARD_FEATURE = 'بطاقة التنبيهات';

type OpenHomeHubCardInteractionInput = {
    signedIn: boolean;
    onProceed: () => void;
    onSignedOut?: () => void;
};

export function openHomeHubCardInteraction(input: OpenHomeHubCardInteractionInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onProceed();
    return true;
}

/** مسارات تنقّل خاصة مسموحة من البطاقة/الدوك وليست أنواع تثبيت */
const HOME_HUB_SPECIAL_NAV_ROUTES = [
    'workspace:schedule:calendar',
    'repository:session',
] as const;

function isSafeHomeHubRoutePayload(routePath: string): boolean {
    if (routePath.includes('\0')) return false;
    const compact = routePath.replace(/\s+/g, '');
    if (/javascript:/i.test(compact)) return false;
    if (/^(data|vbscript|file):/i.test(compact)) return false;
    if (routePath.includes('://')) return false;
    if (/[<>"'`]/.test(routePath)) return false;
    return true;
}

/** يتحقق أن مسار workspace آمن قبل التنقل من البطاقة */
export function isSafeHomeHubNavigateRoute(routePath: string): boolean {
    if (!routePath || typeof routePath !== 'string') return false;
    const trimmed = routePath.trim();
    if (!trimmed || !isSafeHomeHubRoutePayload(trimmed)) return false;
    if ((HOME_HUB_SPECIAL_NAV_ROUTES as readonly string[]).includes(trimmed)) return true;
    return parseWorkspaceRoute(trimmed) !== null;
}

export function guardedHomeHubNavigateRoute(
    routePath: string,
    signedIn: boolean,
    onNavigate: (routePath: string) => void,
    onSignedOut?: () => void,
): boolean {
    if (!isSafeHomeHubNavigateRoute(routePath)) return false;
    return openHomeHubCardInteraction({
        signedIn,
        onProceed: () => onNavigate(routePath),
        onSignedOut,
    });
}
