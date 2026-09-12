import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        warning: vi.fn(),
        success: vi.fn(),
        show: vi.fn(),
    },
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        listForumNotifications: vi.fn(() =>
            Promise.resolve({ notifications: [], unreadCount: 0 }),
        ),
        markAllForumNotificationsRead: vi.fn(),
        markForumNotificationRead: vi.fn(),
        dismissForumNotification: vi.fn(),
    },
}));

vi.mock('@/app/hooks/useVisibilityAwareInterval', () => ({
    useVisibilityAwareInterval: vi.fn(),
}));

const { readForumNotificationsCache } = vi.hoisted(() => ({
    readForumNotificationsCache: vi.fn(() =>
        Promise.resolve({ notifications: [] as unknown[], unreadCount: 0 }),
    ),
}));

vi.mock('@/app/services/forum/forumNotificationsWarmCache', () => ({
    peekForumNotificationsCache: () => [],
    peekForumNotificationsFromLocal: () => [],
    peekForumNotificationsUnreadCache: () => 0,
    readForumNotificationsCache: (...args: unknown[]) => readForumNotificationsCache(...args),
    readForumNotificationsCacheTimed: async (
        userId: string,
        _ms: number,
        fallback: () => { notifications: unknown[]; unreadCount: number },
    ) => {
        const snapshot = await readForumNotificationsCache(userId);
        if (!snapshot) return { timedOut: true, ...fallback() };
        return { timedOut: false, ...snapshot };
    },
    warmForumNotificationsCache: vi.fn(),
}));

/* كذلك كان هذا المسار ميّتاً: الوحدة في `CommunityScreen/forumAsync` لا في `hooks/`. */
vi.mock('../../forumAsync', () => ({
    withForumAsyncTimeout: (promise: Promise<unknown>) => promise,
}));

/**
 * كان المسار `'../communityFeedPolicy'` — ويُحلّ **من ملفّ الاختبار** إلى
 * `hooks/communityFeedPolicy` وهو **غير موجود**، بينما الوحدة الحقيقية في
 * `CommunityScreen/communityFeedPolicy`. فالقناع لم يعترض شيئاً قطّ.
 *
 * وما أخفاه: `resolveForumUnreadPollMs` الحقيقيّ يُرجع `90_000 / 12_000` على جهازٍ
 * غير «خفيف» — **وهي قيم القناع حرفاً**. فصدفةُ تطابقٍ في الثوابت جعلت قناعاً ميّتاً
 * يبدو حيّاً. وعلى عدّاء CI (يُصنَّف خفيفاً) يُرجع `180_000 / 24_000` فيسقط الاختباران.
 *
 * والمسار مُصحَّح، والأصل مُمرَّر بـ`importOriginal` لئلّا تختفي بقيّة صادرات الوحدة.
 */
vi.mock('../../communityFeedPolicy', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../communityFeedPolicy')>()),
    resolveForumUnreadPollMs: (stream: boolean) => (stream ? 90_000 : 12_000),
}));

import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import { useForumAppBarNotifications } from '@/app/components/lawyer/CommunityScreen/hooks/useForumAppBarNotifications';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { setForumSurfaceLive, isForumSurfaceLive } from '@/app/runtime/forumOpenIntent';

describe('useForumAppBarNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        readForumNotificationsCache.mockResolvedValue({ notifications: [], unreadCount: 0 });
        setForumSurfaceLive(false);
    });

    afterEach(() => {
        setForumSurfaceLive(false);
    });

    it('يبدأ بلا تنبيهات عند غياب userId', () => {
        const { result } = renderHook(() => useForumAppBarNotifications(null, false));
        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
    });

    it('handleBellClick يحذر عند غياب userId', () => {
        const { result } = renderHook(() => useForumAppBarNotifications(null, false));

        act(() => {
            result.current.handleBellClick();
        });

        expect(SmartToast.warning).toHaveBeenCalledWith('سجّل الدخول لعرض التنبيهات');
        expect(result.current.showNotifPanel).toBe(false);
    });

    it('لا يجلب التنبيهات من الشبكة بينما السطح مغلق', async () => {
        renderHook(() => useForumAppBarNotifications('lawyer-1', false, undefined, undefined, false));
        await Promise.resolve();
        expect(ForumApiService.listForumNotifications).not.toHaveBeenCalled();
    });

    it('يحرّر ملكية الاستطلاع عندما السطح مغلق', () => {
        setForumSurfaceLive(true);
        renderHook(() => useForumAppBarNotifications('lawyer-1', false, undefined, undefined, false));
        expect(isForumSurfaceLive()).toBe(false);
    });

    it('يستطلع التنبيهات بسياسة 12 ثانية دون تيار', () => {
        renderHook(() => useForumAppBarNotifications('lawyer-1', false));
        expect(useVisibilityAwareInterval).toHaveBeenCalledWith(expect.any(Function), 12_000, true);
    });

    /**
     * حارسٌ على المِجَسّ نفسه لا على المنتج: يُجبر طبقة الجهاز على «خفيف» عبر
     * `data-hami-lite` — وهي المدخل الذي يقرؤه `isLitePerformanceActive` أوّلاً.
     *
     * فإن عاد القناع ميّتاً يوماً (مسارٌ خاطئ، أو نقلُ الوحدة) عادت السياسة الحقيقية
     * إلى ٢٤ ثانية تحت هذا الشرط **فيسقط هذا الاختبار باسمه على أيّ جهاز** — بدل أن
     * ينتظر عدّاءً يُصنَّف خفيفاً ليكشفه، كما حدث فعلاً.
     */
    it('السياسة تُقرأ من الوحدة المُقنَّعة لا من طبقة الجهاز — حتى على جهازٍ خفيف', () => {
        document.documentElement.dataset.hamiLite = '1';
        try {
            renderHook(() => useForumAppBarNotifications('lawyer-1', false));
            expect(useVisibilityAwareInterval).toHaveBeenCalledWith(
                expect.any(Function),
                12_000,
                true,
            );
        } finally {
            delete document.documentElement.dataset.hamiLite;
        }
    });

    it('يبطئ استطلاع الشريط عند تشغيل التيار ولا يلغيه', () => {
        renderHook(() => useForumAppBarNotifications('lawyer-1', true));
        expect(useVisibilityAwareInterval).toHaveBeenCalledWith(expect.any(Function), 90_000, true);
    });

    it('لا يعيد جلب الشبكة إن كانت الذاكرة الدافئة مملوءة', async () => {
        readForumNotificationsCache.mockResolvedValue({
            notifications: [
                {
                    id: 'n1',
                    userId: 'lawyer-1',
                    type: 'comment',
                    title: 'تعليق',
                    message: 'نص',
                    read: true,
                    createdAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            unreadCount: 0,
        });
        const { result } = renderHook(() => useForumAppBarNotifications('lawyer-1', false));
        await waitFor(() => {
            expect(result.current.notifications).toHaveLength(1);
        });
        expect(ForumApiService.listForumNotifications).not.toHaveBeenCalled();
    });
});
