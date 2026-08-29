import { withAllowedClipboardAction } from '@/app/runtime/screenshotDeterrentRuntime';

export async function copyTransactionsText(text: string): Promise<void> {
    await withAllowedClipboardAction(async () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        if (typeof document === 'undefined') {
            throw new Error('clipboard-unavailable');
        }
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        if (!ok) throw new Error('clipboard-unavailable');
    });
}
