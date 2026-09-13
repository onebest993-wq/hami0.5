import { useLayoutEffect, type RefObject } from 'react';

/**
 * يبتلع click/pointerup المتبقّي من لمسة فتح الطبقة — حتى لا تُغلق الإضبارة من إعادة توجيه النقرة.
 * نافذة قصيرة: اللمسة التالية بعد رفع الإصبع لا تُبتلع.
 *
 * **ويُعلن حالته بسمة `data-hami-ghost-shield="armed"` ما دام يبتلع** — عقدُ مراقبةٍ لا مظهر.
 *
 * والسبب مقيس (٢٠٢٦-٠٩-١٣): Execution Gate كانت تسقط لأنّ مساعد E2E يضغط **لحظةَ ظهور
 * الزرّ**، داخل هذه النافذة، فيُبتلع الضغط ولا تُفتح النافذة. وبتعطيل الدرع مؤقّتاً
 * نجح اختبارُ مركز القرارات (وكان يسقط في كلّ مرّة)، ونجحت اختباراتُ المتابعة ٩/٩ (وكانت
 * تسقط تذبذباً). **فالمنتج سليم — الإنسان لا يضغط خلال ١٨٠ م.ث — والاختبار لم يكن يعرف.**
 *
 * **والثابتُ الذي يعتمد عليه المنتظِر: غيابُ السمة ⇐ النقرُ يمرّ.** يصحّ بالبناء: `until`
 * يُحسب قبل جدولة المؤقّت، و`setTimeout` لا ينطلق قبل موعده أبداً (قد يتأخّر فقط، وذلك آمن).
 */
export function useOverlayGhostClickShield(
    rootRef: RefObject<HTMLElement | null>,
    durationMs = 180,
): void {
    useLayoutEffect(() => {
        const node = rootRef.current;
        if (!node || durationMs <= 0) return undefined;
        const until = performance.now() + durationMs;
        const swallow = (event: Event) => {
            if (performance.now() >= until) return;
            event.preventDefault();
            event.stopPropagation();
        };
        node.addEventListener('click', swallow, true);
        node.addEventListener('pointerup', swallow, true);
        node.setAttribute('data-hami-ghost-shield', 'armed');
        const disarm = window.setTimeout(() => {
            node.removeAttribute('data-hami-ghost-shield');
        }, durationMs);
        return () => {
            window.clearTimeout(disarm);
            node.removeAttribute('data-hami-ghost-shield');
            node.removeEventListener('click', swallow, true);
            node.removeEventListener('pointerup', swallow, true);
        };
    }, [rootRef, durationMs]);
}
