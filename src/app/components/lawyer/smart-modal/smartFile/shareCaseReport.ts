import { debug } from '@/app/utils/debug';
import { SmartToast } from '@/app/components/ui/SmartToast';

type PartyRow = { name?: string; role?: string; isClient?: boolean };
type TimelineRow = { title?: string; date?: string };

export function buildCaseShareReportText(stage: {
    court?: string;
    caseNo?: string;
    parties?: PartyRow[];
    timeline?: TimelineRow[];
}): string {
    const parties = stage.parties ?? [];
    const plaintiff =
        parties.find(
            (p) =>
                p.role === 'المدعي' ||
                p.role === 'plaintiff' ||
                p.role === 'الموكل' ||
                p.isClient,
        ) ??
        parties[0] ??
        { name: 'غير محدد' };
    const defendant =
        parties.find(
            (p) => p.role === 'المدعى عليه' || p.role === 'defendant' || p.role === 'الخصم' || !p.isClient,
        ) ??
        parties[1] ??
        { name: 'غير محدد' };

    const lastEvent = stage.timeline?.length ? stage.timeline[0] : null;
    const lastUpdateText = lastEvent ? `${lastEvent.title} (${lastEvent.date})` : 'لا توجد إجراءات مسجلة بعد';

    return `📌 تقرير حالة دعوى قضائية

المحكمة: ${stage.court || 'غير محدد'}
رقم الدعوى: ${stage.caseNo || 'غير محدد'}

الطرف الأول: ${plaintiff.name}
الطرف الثاني: ${defendant.name}

آخر إجراء: ${lastUpdateText}`;
}

export async function shareCaseReport(stage: Parameters<typeof buildCaseShareReportText>[0]): Promise<void> {
    const text = buildCaseShareReportText(stage);

    try {
        if (navigator.share) {
            await navigator.share({ title: 'تقرير حالة الدعوى', text });
            return;
        }
        throw new Error('Web Share API not supported');
    } catch {
        try {
            await navigator.clipboard.writeText(text);
            SmartToast.success('تم نسخ التقرير إلى الحافظة.');
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                SmartToast.success('تم نسخ التقرير إلى الحافظة.');
            } catch (execError) {
                SmartToast.error('عذراً، لم نتمكن من نسخ النص. يرجى النسخ يدوياً.');
                debug.error('Copy failed', execError);
            }
            document.body.removeChild(textArea);
        }
    }
}
