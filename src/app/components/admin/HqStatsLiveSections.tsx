import React, { useCallback } from 'react';
import { HqMetric } from '@/app/components/admin/hqChrome';
import type { HqJumpHandler } from '@/app/components/admin/hqJump';
import {
    HqStatsSection,
    hqAccountsSummary,
    hqForumSummary,
    hqQueueSummary,
    hqVerificationSummary,
} from '@/app/components/admin/hqStatsChrome';
import {
    hqActionTotalOrDash,
    hqCountOrDash,
    hqReportsTotalOrDash,
    pendingHqActionTotal,
    pendingHqReportsTotal,
    type HqLiveOverview,
} from '@/app/components/admin/hqLiveOverview';
import type { HqUserCreatedFilter, HqUserRoleFilter, HqUserStatusFilter } from '@/app/components/admin/hqUserFilters';

export const HqStatsLiveSections = React.memo(function HqStatsLiveSections({
    live,
    onJump,
}: {
    live: HqLiveOverview;
    onJump?: HqJumpHandler;
}) {
    const pendingReports = pendingHqReportsTotal(live);
    const pendingReportsDisplay = hqReportsTotalOrDash(live);
    const actionTotal = pendingHqActionTotal(live);
    const actionDisplay = hqActionTotalOrDash(live);
    const gaps = live.contentGaps;
    const jumpUsers = useCallback(
        (
            userStatus: HqUserStatusFilter = 'all',
            userRole: HqUserRoleFilter = 'all',
            userCreated: HqUserCreatedFilter = 'all',
        ) => {
            onJump?.('users', { userStatus, userRole, userCreated });
        },
        [onJump],
    );
    const jumpQueueTotal = useCallback(() => {
        if (live.pendingVerification > 0) {
            onJump?.('requests', { verificationStatus: 'pending' });
            return;
        }
        onJump?.('reports', { reportFocus: 'all' });
    }, [live.pendingVerification, onJump]);

    return (
        <>
            <HqStatsSection
                foldId="queue"
                title="يحتاج إجراء الآن"
                summary={hqQueueSummary(actionDisplay)}
                alert={typeof actionTotal === 'number' && actionTotal > 0}
                testId="hq-stats-queue"
                className="hq-ops-hero"
            >
                <div className="hq-ops-hero-grid">
                    <HqMetric
                        label="توثيق معلّق"
                        value={hqCountOrDash(live.pendingVerification, gaps, 'pendingVerification')}
                        hint="بانتظار اعتماد المقر"
                        tone={live.pendingVerification > 0 ? 'warn' : 'ok'}
                        size="lg"
                        onClick={onJump ? () => onJump('requests', { verificationStatus: 'pending' }) : undefined}
                    />
                    <HqMetric
                        label="بلاغات معلّقة"
                        value={pendingReportsDisplay}
                        hint="منشورات وتعليقات بانتظار القرار"
                        tone={pendingReportsDisplay === '—' || pendingReports > 0 ? 'danger' : 'ok'}
                        size="lg"
                        onClick={onJump ? () => onJump('reports', { reportFocus: 'all' }) : undefined}
                    />
                    <HqMetric
                        label="إجمالي يحتاج إجراء"
                        value={actionDisplay}
                        hint="مجموع التوثيق المعلّق والبلاغات"
                        tone={actionDisplay === '—' || actionTotal > 0 ? 'danger' : 'ok'}
                        size="lg"
                        onClick={onJump ? jumpQueueTotal : undefined}
                    />
                </div>
            </HqStatsSection>

            <HqStatsSection
                foldId="accounts"
                title="الحسابات"
                summary={hqAccountsSummary(live)}
                alert={live.usersFrozen > 0 || live.usersLocked > 0}
                testId="hq-stats-accounts"
            >
                <div className="hq-ops-cluster">
                    <p className="hq-ops-cluster-title">الوضع</p>
                    <div className="hq-ops-grid hq-ops-grid-4">
                        <HqMetric
                            label="إجمالي الحسابات"
                            value={hqCountOrDash(live.usersTotal, gaps, 'usersTotal')}
                            hint="غير المحذوفين من الدليل"
                            onClick={onJump ? () => jumpUsers('all', 'all') : undefined}
                        />
                        <HqMetric
                            label="حسابات نشطة"
                            value={hqCountOrDash(live.usersActive, gaps, 'usersActive')}
                            hint="بلا تجميد أو قفل دخول"
                            tone="ok"
                            onClick={onJump ? () => jumpUsers('active', 'all') : undefined}
                        />
                        <HqMetric
                            label="حسابات مجمّدة"
                            value={hqCountOrDash(live.usersFrozen, gaps, 'usersFrozen')}
                            hint="الشبكة موقوفة — الدخول يبقى"
                            tone="danger"
                            onClick={onJump ? () => jumpUsers('frozen', 'all') : undefined}
                        />
                        <HqMetric
                            label="مقفل الدخول"
                            value={hqCountOrDash(live.usersLocked, gaps, 'usersLocked')}
                            hint="لا يُسمح بتسجيل الدخول"
                            tone={live.usersLocked > 0 ? 'danger' : 'gold'}
                            onClick={onJump ? () => jumpUsers('locked', 'all') : undefined}
                        />
                    </div>
                </div>
                <div className="hq-ops-cluster">
                    <p className="hq-ops-cluster-title">الأدوار</p>
                    <div className="hq-ops-grid hq-ops-grid-3">
                        <HqMetric
                            label="محامون"
                            value={hqCountOrDash(live.usersLawyer, gaps, 'usersLawyer')}
                            hint="كل الأدوار المحامي في الدليل"
                            onClick={onJump ? () => jumpUsers('all', 'lawyer') : undefined}
                        />
                        <HqMetric
                            label="مشرفون"
                            value={hqCountOrDash(live.usersModerator, gaps, 'usersModerator')}
                            hint="صلاحية إشراف المنتدى"
                            onClick={onJump ? () => jumpUsers('all', 'moderator') : undefined}
                        />
                        <HqMetric
                            label="إدارة"
                            value={hqCountOrDash(live.usersAdmin, gaps, 'usersAdmin')}
                            hint="حسابات الإدارة في الدليل"
                            onClick={onJump ? () => jumpUsers('all', 'admin') : undefined}
                        />
                    </div>
                </div>
                <div className="hq-ops-cluster">
                    <p className="hq-ops-cluster-title">الوافدون</p>
                    <div className="hq-ops-grid">
                        <HqMetric
                            label="حسابات آخر 24 ساعة"
                            value={hqCountOrDash(live.usersNew24h, gaps, 'usersNew24h')}
                            hint="تاريخ الإنشاء فقط"
                            onClick={onJump ? () => jumpUsers('all', 'all', '24h') : undefined}
                        />
                        <HqMetric
                            label="حسابات آخر 7 أيام"
                            value={hqCountOrDash(live.usersNew7d, gaps, 'usersNew7d')}
                            hint="تاريخ الإنشاء فقط"
                            onClick={onJump ? () => jumpUsers('all', 'all', '7d') : undefined}
                        />
                    </div>
                </div>
            </HqStatsSection>

            <HqStatsSection
                foldId="verification"
                title="توثيق المحامين"
                summary={hqVerificationSummary(live)}
                alert={live.pendingVerification > 0}
                hint={live.verificationCapped ? 'عُدّ حتى حد المسح الآمن. راجع طابور التوثيق للتفاصيل.' : undefined}
                testId="hq-stats-verification"
            >
                <div className="hq-ops-grid hq-ops-grid-3">
                    <HqMetric
                        label="توثيق معلّق"
                        value={hqCountOrDash(live.pendingVerification, gaps, 'pendingVerification')}
                        hint="ينتقل إلى طابور التوثيق"
                        tone="warn"
                        onClick={onJump ? () => onJump('requests', { verificationStatus: 'pending' }) : undefined}
                    />
                    <HqMetric
                        label="توثيق معتمد"
                        value={hqCountOrDash(live.verificationApproved, gaps, 'pendingVerification')}
                        hint="محامون اجتازوا الاعتماد"
                        tone="ok"
                        onClick={onJump ? () => onJump('requests', { verificationStatus: 'active' }) : undefined}
                    />
                    <HqMetric
                        label="توثيق مرفوض"
                        value={hqCountOrDash(live.verificationRejected, gaps, 'pendingVerification')}
                        hint="يحتاج مراجعة أو إعادة تقديم"
                        tone="danger"
                        onClick={onJump ? () => onJump('requests', { verificationStatus: 'rejected' }) : undefined}
                    />
                </div>
            </HqStatsSection>

            <HqStatsSection
                foldId="forum"
                title="المنتدى والبلاغات"
                summary={hqForumSummary(
                    hqCountOrDash(live.forumPosts, gaps, 'forumPosts'),
                    pendingReportsDisplay,
                )}
                alert={pendingReports > 0 || live.contentPartial}
                testId="hq-stats-forum"
            >
                <div className="hq-ops-cluster">
                    <p className="hq-ops-cluster-title">المحتوى</p>
                    <div className="hq-ops-grid hq-ops-grid-4">
                        <HqMetric
                            label="منشورات عامة"
                            value={hqCountOrDash(live.forumPosts, gaps, 'forumPosts')}
                            hint="خارج المجموعات الخاصة"
                            onClick={onJump ? () => onJump('forum', { forumTab: 'posts' }) : undefined}
                        />
                        <HqMetric
                            label="تعليقات"
                            value={hqCountOrDash(live.forumComments, gaps, 'forumComments')}
                            hint="كل التعليقات في المنتدى"
                            onClick={onJump ? () => onJump('forum', { forumTab: 'posts' }) : undefined}
                        />
                        <HqMetric
                            label="منشورات بمرفق"
                            value={hqCountOrDash(live.forumDocuments, gaps, 'forumDocuments')}
                            hint="مستند أو صورة مرفقة"
                            onClick={onJump ? () => onJump('forum', { forumTab: 'posts' }) : undefined}
                        />
                        <HqMetric
                            label="منشورات مثبّتة"
                            value={hqCountOrDash(live.forumPinned, gaps, 'forumPinned')}
                            hint="تظهر أعلى القائمة"
                            onClick={
                                onJump
                                    ? () => onJump('forum', { forumTab: 'posts', forumPostKind: 'pinned' })
                                    : undefined
                            }
                        />
                        <HqMetric
                            label="مناقشات مقفلة"
                            value={hqCountOrDash(live.forumLocked, gaps, 'forumLocked')}
                            hint="لا تُقبل تعليقات جديدة"
                            tone={live.forumLocked > 0 ? 'warn' : 'gold'}
                            onClick={
                                onJump
                                    ? () => onJump('forum', { forumTab: 'posts', forumPostKind: 'locked' })
                                    : undefined
                            }
                        />
                    </div>
                </div>
                <div className="hq-ops-cluster">
                    <p className="hq-ops-cluster-title">الرقابة</p>
                    <div className="hq-ops-grid hq-ops-grid-4">
                        <HqMetric
                            label="حظر منتدى ساري"
                            value={hqCountOrDash(live.forumBansActive, gaps, 'forumBansActive')}
                            hint="دائم أو لم ينتهِ بعد"
                            tone={live.forumBansActive > 0 ? 'warn' : 'gold'}
                            onClick={onJump ? () => onJump('forum', { forumTab: 'bans' }) : undefined}
                        />
                        <HqMetric
                            label="سجلات حظر (كلّها)"
                            value={hqCountOrDash(live.forumBans, gaps, 'forumBans')}
                            hint="يشمل المنتهي والمرفوع"
                            onClick={onJump ? () => onJump('forum', { forumTab: 'bans' }) : undefined}
                        />
                        <HqMetric
                            label="بلاغات منشورات معلّقة"
                            value={hqCountOrDash(live.pendingReports, gaps, 'pendingReports')}
                            hint="صندوق بلاغات المنشورات"
                            tone="danger"
                            onClick={onJump ? () => onJump('reports', { reportFocus: 'posts' }) : undefined}
                        />
                        <HqMetric
                            label="بلاغات تعليقات معلّقة"
                            value={hqCountOrDash(live.pendingCommentReports, gaps, 'pendingCommentReports')}
                            hint="صندوق بلاغات التعليقات"
                            tone="danger"
                            onClick={onJump ? () => onJump('reports', { reportFocus: 'comments' }) : undefined}
                        />
                        <HqMetric
                            label="إجمالي البلاغات المعلّقة"
                            value={pendingReportsDisplay}
                            hint="منشورات + تعليقات"
                            tone="danger"
                            onClick={onJump ? () => onJump('reports', { reportFocus: 'all' }) : undefined}
                        />
                    </div>
                </div>
            </HqStatsSection>
        </>
    );
});
