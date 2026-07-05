/** يؤجل فتح حوار بعد إغلاق القائمة — يتجنب تعارض focus/pointer مع Radix */
export function runAfterTransactionsMenuClose(action: () => void): void {
    window.setTimeout(action, 120);
}
