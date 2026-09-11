import { blurFocusWithin } from '@/app/utils/inertProps';
import {
    FORUM_TEARDOWN_EVENT,
    FORUM_UNREAD_CHANGED_EVENT,
} from '@/app/services/forum/forumNotificationEvents';
import { flushForumRepositoryIndexQueue } from '@/app/services/forum/forumRepositoryIndexQueue';
import { abortForumAttachmentResolve } from '@/app/services/forum/forumAttachmentResolve';
import { abortForumPostPersistActions } from '@/app/services/forum/forumPostPersistActions';
import { unblockAllForumOverlayEscape } from '@/app/components/lawyer/CommunityScreen/forumEscapeStack';
import { clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';
import { clearHubLayerEnter } from '@/app/runtime/overlayHubLayerMotion';
import { FORUM_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';
import { concealForumWarmShell } from '@/app/runtime/forumInstantPaint';

const FORUM_ROOT_SELECTORS = [
    FORUM_HUB_LAYER.layerSelector,
    '[data-forum-layer-open]',
    '[data-community-root]',
    '[data-testid="community-screen"]',
    '[data-testid="forum-tile-root"]',
    '[data-forum-appbar]',
    '[data-testid="forum-member-profile"]',
    '[data-forum-comments-root]',
];

/**
 * يُفكّك حالة المنتدى العائمة — **بلا شرط**، وهذا ما كان يفعله فعلاً.
 *
 * حُذف منها شيئان بقياسٍ في ٢٠٢٦-٠٩-١٢، وكلاهما لم يكن يفعل شيئاً:
 *
 * ١. وسيط `targetSurfaceSessionId` وحارسُه: كان يقارن بـ`window.__hamiForumActiveSessionId`
 *    وهو مفتاحٌ **يُقرأ في هذا الموضع وحده ولا يكتبه أيّ موضع في المستودع**، فالشرط
 *    `currentActiveId !== undefined` كاذبٌ دائماً ولا يخرج أبداً. وكان غيرَ متماسكٍ
 *    أصلاً: المستدعيان يمرّران عدّادين محلّيين لخطّافيهما لا صلة لهما بجلسةٍ عامّة.
 *    وهذه الدالّة نفسها تحذف كلّ مفتاحٍ يبدأ بـ`__hamiForum` — فلو كُتب لمُحي.
 *    التقييدُ الصحيح تصميمٌ (مَن يملك «الجلسة النشطة»؟) لا سطر، فلا يُدّعى بحارسٍ ميت.
 *
 * ٢. كتابةُ `data-hami-forum-closing="true"` على عناصر الطبقة: كلّ قارئٍ لسمة
 *    `*-closing` في المستودع — ٩٠ قاعدة CSS وموضعان في TS — يقرؤها على `html`
 *    وبالقيمة `'1'`. ولا قارئ لها على عنصر. (والثلاثة الشقيقة
 *    `tearDownRepo/Litigation/Execution` تكتب `data-closing="true"` بلا قارئٍ كذلك —
 *    خارج نطاق هذا التغيير، مسجَّلة في `.audit/REVIEW_REPORT_2026-09-11.md`.)
 *
 * والحركة الحقيقية للخروج يملكها `beginHubLayerExit` على `html` — لا هذه الدالّة.
 */
export function tearDownForumFloatingState(): void {
    try {
        try {
            const nodes: HTMLElement[] = [];
            if (typeof document !== 'undefined') {
                for (const selector of FORUM_ROOT_SELECTORS) {
                    const el = document.querySelector(selector);
                    if (el instanceof HTMLElement) nodes.push(el);
                }
                for (const node of nodes) {
                    try {
                        blurFocusWithin(node);
                    } catch {
                        /* P1 blur ignore */
                    }
                }
            }
        } catch {
            /* P1 outer ignore */
        }

        try {
            if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        } catch {
            /* P1 fallback blur ignore */
        }

        try {
            void flushForumRepositoryIndexQueue();
        } catch {
            /* P2 drain queue ignore */
        }

        try {
            unblockAllForumOverlayEscape();
        } catch {
            /* P3 unblock escape ignore */
        }

        try {
            abortForumAttachmentResolve();
            abortForumPostPersistActions();
        } catch {
            /* P3b abort network ignore */
        }

        try {
            if (typeof window !== 'undefined') {
                const events = [FORUM_UNREAD_CHANGED_EVENT];
                for (const ev of events) {
                    try {
                        window.dispatchEvent(new CustomEvent(`${ev}:__teardown`, { cancelable: false }));
                    } catch {
                        /* P4 fan-out teardown ignore */
                    }
                }
            }
        } catch {
            /* P4 outer ignore */
        }

        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent(FORUM_TEARDOWN_EVENT, {
                        detail: { reason: 'tearDown', suppressed: false },
                        cancelable: false,
                    }),
                );
            }
        } catch {
            /* P4 TEARDOWN dispatch ignore */
        }

        try {
            if (typeof window !== 'undefined') {
                const w = window as unknown as Record<string, unknown>;
                const keysToDelete: string[] = [];
                for (const key of Object.keys(w)) {
                    if (
                        key.startsWith('__hamiForum') ||
                        key.startsWith('__hamiCommunity') ||
                        key.startsWith('__hamiDraftForum') ||
                        key.startsWith('__hamiPendingPost') ||
                        key.startsWith('__hamiForumPaint') ||
                        key.startsWith('__hamiForumWarm') ||
                        key.startsWith('__hamiForumBoot') ||
                        key.startsWith('__hamiForumIndex') ||
                        key.startsWith('__hamiForumPerf') ||
                        key.startsWith('__hamiForumTile') ||
                        key.startsWith('__hamiForumProfile') ||
                        key.startsWith('__hamiForumGroup') ||
                        key.startsWith('__hamiForumSearch') ||
                        key.startsWith('__hamiForumComment') ||
                        key.startsWith('__hamiForumRepo') ||
                        key.startsWith('__hamiForumEditor') ||
                        key.startsWith('__hamiForumAttachment') ||
                        key.startsWith('__hamiForumNotify')
                    ) {
                        keysToDelete.push(key);
                    }
                }
                for (const key of keysToDelete) {
                    try {
                        delete (window as unknown as Record<string, unknown>)[key];
                    } catch {
                        /* P5 transient key delete ignore */
                    }
                }
            }
        } catch {
            /* P5 outer cleanup ignore */
        }

        try {
            clearHubLayerEnter(FORUM_HUB_LAYER);
        } catch {
            /* P7 chrome enter cleanup ignore */
        }

        try {
            concealForumWarmShell();
        } catch {
            /* P7 instant covers remove ignore */
        }

        try {
            clearOverlayEnterSettle(FORUM_HUB_LAYER.enterAttr);
        } catch {
            /* P8 settle timeout clear ignore */
        }
    } catch {
        /* top-level safety — never throw from teardown */
    }
}
