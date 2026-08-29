/**
 * تحضير كروم المنزل تحت الغطاء — يُحمَّل من preamble فقط.
 * ليس داخل lawyer-home-paint: HomeTab يقرأ الحالة من homeBootChromeState.
 */
import {
    isLawyerProfileBootWarmPending,
    BOOT_PROFILE_WARM_BUDGET_MS,
} from '@/app/services/profile/profileBootWarmPending';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { loadHomeTabContent } from '@/app/runtime/homeTabContentLoader';
import { loadCommandHubTiles } from '@/app/runtime/commandHubTilesLoader';
import { loadLawyerHomeHubCardModule } from '@/app/runtime/homeHubCardLoader';
import {
    isHomeBootChromePrepared,
    markHomeBootChromePrepared,
    resetHomeBootChromeForTests as resetHomeBootChromeStateForTests,
} from '@/app/bootstrap/homeBootChromeState';

export {
    isHomeBootChromeReady,
    isHomeGridRevealReady,
    markHomeBootChromeReadyForTests,
    subscribeHomeBootChrome,
} from '@/app/bootstrap/homeBootChromeState';

let preparePromise: Promise<void> | null = null;

export function resetHomeBootChromeForTests(): void {
    preparePromise = null;
    resetHomeBootChromeStateForTests();
}

async function waitWhileProfileWarmPending(maxMs: number): Promise<void> {
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    while (isLawyerProfileBootWarmPending()) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - started >= maxMs) return;
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 16);
        });
    }
}

async function waitWhileLocalProfileUnread(maxMs: number): Promise<void> {
    const session = await peekBootSession();
    const uid = session?.userId?.trim();
    if (!uid) return;
    const { isLawyerProfileLocalUnread } = await import('@/app/services/profile/lawyerProfileLocalRead');
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    while (isLawyerProfileLocalUnread(uid)) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - started >= maxMs) return;
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 16);
        });
    }
}

function notifyProfileChromeUpdated(userId: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
    } catch {
        /* ignore */
    }
}

async function peekBootSession(): Promise<{
    userId?: string;
    userMetadata?: Record<string, unknown>;
} | null> {
    const { peekBootSessionPeekSync } = await import('@/boot/peekBootSessionUserId');
    const session = peekBootSessionPeekSync();
    if (!session) return null;
    return {
        userId: session.userId,
        userMetadata: session.userMetadata ?? undefined,
    };
}

async function prepareIdentityChrome(): Promise<void> {
    const session = await peekBootSession();
    const uid = session?.userId?.trim();
    if (!uid) return;

    const [
        { hydrateProfileWarmCachePeekSync },
        { getProfileWarmCacheRaw },
        { sanitizeProfileMediaUrl },
        { resolveFirstPaintLawyerDisplayName },
        { resolveProfileHeaderInitial },
        { publishUserIdentityUiState },
    ] = await Promise.all([
        import('@/app/services/profile/profileWarmCache'),
        import('@/app/services/profile/profileWarmCacheStore'),
        import('@/app/services/profile/profileUrlSanitize'),
        import('@/app/services/profile/resolveLawyerDisplayName'),
        import('@/app/services/profile/profileHeaderLogic'),
        import('@/app/services/profile/userIdentityUiState'),
    ]);
    hydrateProfileWarmCachePeekSync(uid, session?.userMetadata, uid);
    const cached = getProfileWarmCacheRaw(uid);
    const avatarUrl = sanitizeProfileMediaUrl(cached?.header?.profileImage) ?? '';
    const displayName =
        resolveFirstPaintLawyerDisplayName(cached?.header?.name, uid, session?.userMetadata) || '';
    if (avatarUrl) {
        await Promise.race([
            import('@/app/services/profile/resolveProfileAvatarDisplaySrc').then((avatarMod) =>
                avatarMod.resolveProfileAvatarDisplaySrc(
                    avatarUrl,
                    avatarMod.PROFILE_AVATAR_DISPLAY_MAX_EDGE_TILE,
                ),
            ),
            new Promise<void>((resolve) => {
                setTimeout(resolve, 400);
            }),
        ]).catch(() => undefined);
    }
    /* لقطة ذرّية بعد انتظار الملف المحلي — بلا بذرة «المحامي». الاسم الفارغ حساب جديد جاهز للحرف. */
    const settledName = displayName.trim();
    publishUserIdentityUiState({
        userId: uid,
        displayName: settledName,
        avatarUrl,
        profileInitial: resolveProfileHeaderInitial(settledName || 'م'),
        isLoaded: true,
    });
    notifyProfileChromeUpdated(uid);
}

async function prepareCriticalUiFonts(): Promise<void> {
    if (typeof document === 'undefined') return;
    const fonts = document.fonts;
    if (!fonts || typeof fonts.load !== 'function') return;
    try {
        await Promise.race([
            Promise.all([fonts.load('800 16px Tajawal'), fonts.load('800 16px Cairo')]),
            new Promise<void>((resolve) => {
                setTimeout(resolve, 180);
            }),
        ]);
    } catch {
        /* شبكة/WebView بلا Google Fonts — لا نحجب الإقلاع */
    }
}

async function prepareLiveHomeModules(): Promise<void> {
    kickHomeHubRadarWarm();
    await Promise.all([
        loadHomeTabContent().catch(() => undefined),
        loadCommandHubTiles().catch(() => undefined),
        loadLawyerHomeHubCardModule().catch(() => undefined),
    ]);
}

/** تسخين رادار المنزل تحت الغطاء — لا يُنتظر ولا يحجب markPrepared. */
function kickHomeHubRadarWarm(): void {
    void peekBootSession()
        .then(async (session) => {
            const uid = session?.userId?.trim();
            if (!uid) return;
            const { warmHomeHubRadarCache } = await import('@/app/services/alerts/homeHubRadarWarmCache');
            warmHomeHubRadarCache(uid);
        })
        .catch(() => undefined);
}

function markPrepared(): void {
    markHomeBootChromePrepared();
}

/**
 * يُستدعى من preamble بعد بدء تسخين الملف — لا بعد انتهائه.
 * مقاطع المنزل تُحمَّل فوراً تحت الغطاء بينما تكتمل لقطة الهوية.
 * الكشف: بلاطات حية + كروم مركز (هيكل مكتمل أو بطاقة) + اسم الهوية — بلا انتظار img.
 */
export function prepareHomeBootChrome(): Promise<void> {
    if (isHomeBootChromePrepared()) return Promise.resolve();
    if (!preparePromise) {
        preparePromise = (async () => {
            const liveModules = prepareLiveHomeModules();
            await Promise.all([
                waitWhileProfileWarmPending(BOOT_PROFILE_WARM_BUDGET_MS),
                waitWhileLocalProfileUnread(BOOT_PROFILE_WARM_BUDGET_MS),
            ]);
            await Promise.race([
                Promise.all([
                    prepareIdentityChrome(),
                    prepareCriticalUiFonts(),
                    liveModules,
                ]),
                new Promise<void>((resolve) => {
                    setTimeout(resolve, BOOT_PROFILE_WARM_BUDGET_MS);
                }),
            ]);
            markPrepared();
        })()
            .catch(async () => {
                markPrepared();
            })
            .finally(() => {
                markPrepared();
                if (!isHomeBootChromePrepared()) preparePromise = null;
            });
    }
    return preparePromise;
}
