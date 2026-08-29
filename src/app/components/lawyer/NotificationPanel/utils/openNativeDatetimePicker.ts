/** فتح منتقي التاريخ/الوقت الأصلي عند التركيز — WebView قد يرفض showPicker */
export function openNativeDatetimePicker(target: HTMLInputElement): void {
    if (typeof target.showPicker === 'function') {
        try {
            target.showPicker();
        } catch {
            /* ignore */
        }
    }
}
