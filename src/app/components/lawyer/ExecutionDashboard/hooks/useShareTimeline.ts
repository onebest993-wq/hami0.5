import { useCallback } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

async function copyTextFallback(text: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    if (typeof document === 'undefined') throw new Error('No document');

    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', 'true');
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    if (!ok) throw new Error('Copy failed');
}

export function useShareTimeline(
    activeTimelineEvents: any[],
    executionData: ExecutionFile | null | undefined,
    showToast: (message: string, variant?: 'success' | 'info' | 'warning') => void,
) {
    const handleShareTimeline = useCallback(async () => {
        const dir = String(executionData?.directorate ?? '').trim();
        const num = String(executionData?.fileNumber ?? '').trim();
        const yr = String((executionData as ExecutionFile)?.fileYear ?? '').trim();
        const headerParts = ['السجل الزمني للإضبارة التنفيذية'];
        if (dir || num) headerParts.push([dir, num && yr ? `${num} / ${yr}` : num].filter(Boolean).join(' — '));
        const header = headerParts.join('\n') + '\n' + '—'.repeat(24);
        const body = activeTimelineEvents.length
            ? activeTimelineEvents
                  .map((e, i) => {
                      const when = e.timestamp || e.date;
                      const whenStr = when
                          ? (() => {
                                const t = new Date(when);
                                return Number.isNaN(t.getTime()) ? String(when) : t.toLocaleString('ar-IQ');
                            })()
                          : '—';
                      const desc = (e.description || e.details || '').trim();
                      const src = e.source ? `\nالمصدر: ${e.source}` : '';
                      return `${i + 1}. ${e.title}\n${desc ? desc + '\n' : ''}الوقت: ${whenStr}${src}`;
                  })
                  .join('\n\n')
            : '(لا توجد أحداث في السجل المعروض حالياً)';
        const text = `${header}\n\n${body}`;
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                await navigator.share({
                    title: 'السجل الزمني للإضبارة التنفيذية',
                    text,
                });
                showToast('تمت مشاركة السجل الزمني بنجاح', 'success');
                return;
            }
            await copyTextFallback(text);
            showToast('لا تتوفر مشاركة النظام هنا — تم نسخ السجل للحافظة', 'info');
        } catch {
            showToast('تعذّرت المشاركة/النسخ — تحقق من أذونات المتصفح', 'warning');
        }
    }, [activeTimelineEvents, executionData, showToast]);

    return { handleShareTimeline };
}
