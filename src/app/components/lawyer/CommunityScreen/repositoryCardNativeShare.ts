import { SmartToast } from '@/app/components/ui/SmartToast';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { buildRepositoryPublicFileUrl } from '@/app/services/forum/forumUrlSafety';

export async function shareRepositoryDocument(
    doc: Pick<RepositoryDocument, 'storagePath' | 'title' | 'description'>,
    origin: string,
    shareApi: Pick<Navigator, 'share' | 'clipboard'> = navigator,
): Promise<void> {
    const shareUrl = buildRepositoryPublicFileUrl(origin, doc.storagePath);
    if (!shareUrl) {
        SmartToast.error('رابط الملف غير متاح للمشاركة');
        return;
    }
    const shareTitle = doc.title || 'مستند قانوني';
    const shareText = doc.description
        ? `مستند: ${doc.title} — ${doc.description}`
        : `مستند: ${doc.title}`;

    if (shareApi.share) {
        try {
            await shareApi.share({ title: shareTitle, text: shareText, url: shareUrl });
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                SmartToast.error('فشلت عملية المشاركة');
            }
        }
        return;
    }

    try {
        await shareApi.clipboard.writeText(shareUrl);
        SmartToast.success('تم نسخ رابط الملف');
    } catch {
        SmartToast.error('تعذر نسخ الرابط');
    }
}
