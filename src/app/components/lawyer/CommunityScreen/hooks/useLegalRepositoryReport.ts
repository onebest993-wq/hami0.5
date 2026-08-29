import { useCallback } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { checkForumRateLimit, peekForumRateLimit } from '../forumRateLimit';
import {
    hasLegalRepositoryLocalReport,
    recordLegalRepositoryLocalReport,
} from '../legalRepositoryLocalReports';

type UseLegalRepositoryReportParams = {
    userId: string | null;
};

/**
 * إبلاغ مستند المستودع — سجل محلي دائم + حد معدّل على الجهاز.
 * لا يُخلط معرّف المستند بمنشورات المنتدى عبر واجهة إبلاغ المنشور.
 */
export function useLegalRepositoryReport({ userId }: UseLegalRepositoryReportParams) {
    const handleReportDocument = useCallback(
        (doc: RepositoryDocument) => {
            if (!userId) {
                SmartToast.warning('سجّل الدخول للإبلاغ');
                return;
            }
            if (doc.authorId === userId) {
                SmartToast.warning('لا يمكنك الإبلاغ عن مستندك');
                return;
            }
            if (hasLegalRepositoryLocalReport(userId, doc.id)) {
                SmartToast.info('أبلغت عن هذا المستند مسبقاً');
                return;
            }
            const peek = peekForumRateLimit('report', userId, { postId: `repo:${doc.id}` });
            if (!peek.allowed) {
                SmartToast.info('أبلغت عن هذا المستند مسبقاً');
                return;
            }
            const stored = recordLegalRepositoryLocalReport(userId, doc.id, doc.title);
            if (!stored) {
                SmartToast.info('أبلغت عن هذا المستند مسبقاً');
                return;
            }
            const rate = checkForumRateLimit('report', userId, { postId: `repo:${doc.id}` });
            if (!rate.allowed) {
                SmartToast.info('أبلغت عن هذا المستند مسبقاً');
                return;
            }
            SmartToast.success('تم تسجيل البلاغ');
        },
        [userId],
    );

    return { handleReportDocument };
}
