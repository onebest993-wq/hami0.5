/**
 * أثناء تسليم stub→live يُركَّب الـ hook والعلم البصري مفتوح بينما
 * React state ما زال مغلقاً. إغلاق فوري في useLayoutEffect يطرد المستخدم.
 *
 * 1) نؤجّل الإغلاق إلى macrotask: إن فتح الـ handoff غيّر الحالة، يُلغى المؤقّت.
 * 2) إن بقي تسليم معلّق (مقطع كسول لم يصل بعد)، لا يُغلق اليتيم — وإلا تُطرد
 *    كل الأقسام عند أول دخول ثم تعمل في الثانية بعد اكتمال الكاش.
 */

const pendingHandoffs = new Set<string>();

export function markShellHandoffPending(id: string): void {
    pendingHandoffs.add(id);
}

export function clearShellHandoffPending(id: string): void {
    pendingHandoffs.delete(id);
}

export function isShellHandoffPending(id?: string): boolean {
    if (id) return pendingHandoffs.has(id);
    return pendingHandoffs.size > 0;
}

export function resetShellHandoffPendingForTests(): void {
    pendingHandoffs.clear();
}

export function deferShellConcealAfterHandoff(conceal: () => void): () => void {
    if (typeof window === 'undefined') {
        conceal();
        return () => undefined;
    }
    const timer = window.setTimeout(() => {
        conceal();
    }, 0);
    return () => {
        window.clearTimeout(timer);
    };
}
