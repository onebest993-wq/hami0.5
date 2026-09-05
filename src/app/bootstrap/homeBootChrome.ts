/**
 * تحضير كروم المنزل تحت الغطاء — يُحمَّل من preamble فقط.
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
import { BOOT_REVEAL_DONE_EVENT } from '@/app/bootstrap/bootReveal';
import { peekBootSessionPeekSync } from '@/boot/peekBootSessionUserId';

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

const DATA_HAMI_ATTRS: MutationObserverInit['attributeFilter'] = [
    'data-hami-boot-revealed',
    'data-hami-theme',
    'data-hami-wallpaper',
    'data-hami-home-container-border',
    'data-hami-color-mode',
    'data-hami-shape',
    'data-hami-native',
    'data-hami-initial-boot',
];

/**
 * انتظار حتى ينتهي تسخين الملف أو انتهاء المهلة — عبر أحداث لا busy-polling.
 *
 * قبل: while(isPending) { await sleep(16ms) } — 60 wakeup/ثانية على Main Thread.
 * الآن: استماع لـ LAWYER_PROFILE_UPDATED + BOOT_REVEAL_DONE_EVENT + MutationObserver
 *       على data-hami-* attrs، مع مهلة صارمة كحارس أخير بنفس maxMs الأصلي.
 * النتيجة: 0 wakeups — يستيقظ فقط عند حدوث تغير فعلي أو انتهاء المهلة.
 */
async function waitWhileProfileWarmPending(maxMs: number): Promise<void> {
    if (!isLawyerProfileBootWarmPending()) return;
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            window.removeEventListener(LAWYER_PROFILE_UPDATED, check);
            window.removeEventListener(BOOT_REVEAL_DONE_EVENT, check);
            if (observer) observer.disconnect();
            resolve();
        };
        const check = () => {
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (!isLawyerProfileBootWarmPending() || now - started >= maxMs) {
                finish();
            }
        };
        const observer =
            typeof MutationObserver !== 'undefined' && typeof document !== 'undefined'
                ? new MutationObserver(check)
                : null;
        if (observer && document.documentElement) {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: DATA_HAMI_ATTRS,
            });
        }
        window.addEventListener(LAWYER_PROFILE_UPDATED, check, { passive: true });
        window.addEventListener(BOOT_REVEAL_DONE_EVENT, check, { once: true, passive: true });
        setTimeout(check, maxMs);
    });
}

/**
 * نفس النمط event-driven: انتظار حتى يصبح الملف المحلي مقروءاً.
 * استبدال while+16ms بـ MutationObserver + events + timeout guard.
 * لا يختبر الشرط إلا عند حدوث تغير فعلي — 0 ضجيج على Main Thread.
 */
async function waitWhileLocalProfileUnread(maxMs: number): Promise<void> {
    const session = peekBootSessionPeekSync();
    const uid = session?.userId?.trim();
    if (!uid) return;
    const { isLawyerProfileLocalUnread } = await import('@/app/services/profile/lawyerProfileLocalRead');
    if (!isLawyerProfileLocalUnread(uid)) return;
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            window.removeEventListener(LAWYER_PROFILE_UPDATED, check);
            window.removeEventListener(BOOT_REVEAL_DONE_EVENT, check);
            if (observer) observer.disconnect();
            resolve();
        };
        const check = () => {
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (!isLawyerProfileLocalUnread(uid) || now - started >= maxMs) {
                finish();
            }
        };
        const observer =
            typeof MutationObserver !== 'undefined' && typeof document !== 'undefined'
                ? new MutationObserver(check)
                : null;
        if (observer && document.documentElement) {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: DATA_HAMI_ATTRS,
            });
        }
        window.addEventListener(LAWYER_PROFILE_UPDATED, check, { passive: true });
        window.addEventListener(BOOT_REVEAL_DONE_EVENT, check, { once: true, passive: true });
        setTimeout(check, maxMs);
    });
}

function notifyProfileChromeUpdated(userId: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
    } catch {
        /* ignore */
    }
}

async function prepareIdentityChrome(): Promise<void> {
    const session = peekBootSessionPeekSync();
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
        resolveFirstPaintLawyerDisplayName(cached?.header?.name, uid, session?.userMetadata ?? undefined) || '';
    const settledName = displayName.trim();
    publishUserIdentityUiState({
        userId: uid,
        displayName: settledName,
        avatarUrl,
        profileInitial: resolveProfileHeaderInitial(settledName || 'م'),
        isLoaded: true,
    });
    notifyProfileChromeUpdated(uid);
    if (avatarUrl) {
        void Promise.race([
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
    void loadLawyerHomeHubCardModule().catch(() => undefined);
    await Promise.all([
        loadHomeTabContent().catch(() => undefined),
        loadCommandHubTiles().catch(() => undefined),
    ]);
}

/** تسخين رادار المنزل تحت الغطاء — لا يُنتظر ولا يحجب markPrepared. */
function kickHomeHubRadarWarm(): void {
    const session = peekBootSessionPeekSync();
    const uid = session?.userId?.trim();
    if (!uid) return;
    void import('@/app/services/alerts/homeHubRadarWarmCache')
        .then(({ warmHomeHubRadarCache }) => {
            warmHomeHubRadarCache(uid);
        })
        .catch(() => undefined);
}

function markPrepared(): void {
    markHomeBootChromePrepared();
}

/**
 * يُستدعى من preamble بعد بدء تسخين الملف — لا بعد انتهائه.
 * مقاطع المنزل تُحمَّل فوراً تحت الغطاء بينما تُنشر لقطة الهوية من peek.
 * فك الملف المحلي يُغني الاسم بعد الكشف. بطاقة المركز تُسخَّن دون حجب الكروم.
 */
export function prepareHomeBootChrome(): Promise<void> {
    if (isHomeBootChromePrepared()) return Promise.resolve();
    if (!preparePromise) {
        preparePromise = (async () => {
            const liveModules = prepareLiveHomeModules();
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
            void Promise.all([
                waitWhileProfileWarmPending(BOOT_PROFILE_WARM_BUDGET_MS),
                waitWhileLocalProfileUnread(BOOT_PROFILE_WARM_BUDGET_MS),
            ]).then(() => {
                void prepareIdentityChrome();
            });
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
