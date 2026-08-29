import { canUseServerBackedNetworkFeatures } from '@/app/services/auth/lawyerAccountStatus';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { isHamiPlatformAdminUserId } from '@/app/constants/hamiPlatformAdminId';

/** رفض جلسة للمنتدى/KV بعد 403 حقيقي — يمنع موجة تكرار في الكونسول */
const sessionNetworkFeatureDeniedIds = new Set<string>();

function markSessionNetworkFeaturesDenied(userId: string | null): void {
    sessionNetworkFeatureDeniedIds.add(userId?.trim() || '*');
}

function isSessionNetworkFeaturesDenied(userId: string | null): boolean {
    if (sessionNetworkFeatureDeniedIds.has('*')) return true;
    const id = userId?.trim();
    return Boolean(id && sessionNetworkFeatureDeniedIds.has(id));
}

function isKvProxyPath(pathname: string): boolean {
    return pathname === '/api/kv-proxy' || pathname.startsWith('/api/kv-proxy/');
}

function isNetworkFeatureProtectedPath(pathname: string): boolean {
    if (pathname.startsWith('/api/forum/')) return true;
    if (pathname.startsWith('/api/calendar/')) return true;
    if (isKvProxyPath(pathname)) return true;
    return false;
}

function buildNetworkFeaturesDeniedResponse(): Response {
    return new Response(
        JSON.stringify({
            ok: false,
            error: 'الميزات الشبكية مغلقة حتى اعتماد الحساب',
            code: 'NETWORK_FEATURES_DENIED',
        }),
        {
            status: 403,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        },
    );
}

/** Playwright يضع العلم قبل أي fetch — لا يُضعف إنتاجاً ولا جلسة تطوير عادية */
function isDevForumE2eNetworkPassthrough(): boolean {
    if (!import.meta.env.DEV || import.meta.env.PROD) return false;
    if (typeof window === 'undefined') return false;
    return (window as Window & { __HAMI_E2E_FORUM__?: boolean }).__HAMI_E2E_FORUM__ === true;
}

function shouldAllowProtectedNetworkPath(
    _pathname: string,
    userId: string | null,
    userMetadata: Record<string, unknown> | null,
): boolean {
    if (isHamiPlatformAdminUserId(userId)) return true;
    return canUseServerBackedNetworkFeatures(userId, userMetadata);
}

/** بوابة موحّدة لكل مسارات KV والمنتدى — تُستدعى من hooks والتسخين قبل أي fetch */
export function canReachProtectedServerNetwork(
    userId: string | null | undefined,
    userMetadata?: Record<string, unknown> | null,
): boolean {
    if (isSessionNetworkFeaturesDenied(userId?.trim() || null)) return false;
    return shouldAllowProtectedNetworkPath('', userId?.trim() || null, userMetadata ?? null);
}

export function resolveDeniedNetworkFeatureResponse(pathname: string): Response | null {
    if (!isNetworkFeatureProtectedPath(pathname)) return null;
    if (isDevForumE2eNetworkPassthrough()) return null;
    const persisted = readPersistedSupabaseAuth();
    const userId = getLiveAuthUserId() ?? persisted.user?.id ?? null;
    const userMetadata = (persisted.user?.user_metadata ?? null) as Record<string, unknown> | null;
    if (isSessionNetworkFeaturesDenied(userId)) {
        return buildNetworkFeaturesDeniedResponse();
    }
    if (!shouldAllowProtectedNetworkPath(pathname, userId, userMetadata)) {
        return buildNetworkFeaturesDeniedResponse();
    }
    return null;
}

export function __resetNetworkFeaturesDeniedForTests(): void {
    sessionNetworkFeatureDeniedIds.clear();
}

export function noteProtectedPathForbidden(pathname: string, response: Response, bodyText: string): void {
    if (!isNetworkFeatureProtectedPath(pathname) || response.status !== 403) return;
    const persisted = readPersistedSupabaseAuth();
    const userId = getLiveAuthUserId() ?? persisted.user?.id ?? null;
    const codeMatch = /"code"\s*:\s*"(FORUM_[A-Z_]+|NETWORK_FEATURES_DENIED)"/.exec(bodyText);
    if (
        codeMatch ||
        bodyText.includes('توثيق') ||
        bodyText.includes('قيد التدقيق') ||
        bodyText.includes('المحامين المفعلة')
    ) {
        markSessionNetworkFeaturesDenied(userId);
    }
}

export { isNetworkFeatureProtectedPath };
