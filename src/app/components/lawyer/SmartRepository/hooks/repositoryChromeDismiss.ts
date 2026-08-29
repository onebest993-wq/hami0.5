/**
 * طبقات كروم المستودع (قوائم إضافة/غرف/تصنيف/نقل) — تُغلق قبل المودال نفسه.
 * Capture Escape في useRepositoryEscapeStack يستدعي الأعلى أولاً.
 */

export type RepositoryChromeDismisser = () => boolean;

const stack: RepositoryChromeDismisser[] = [];

export function registerRepositoryChromeDismiss(dismiss: RepositoryChromeDismisser): () => void {
    stack.push(dismiss);
    return () => {
        const i = stack.lastIndexOf(dismiss);
        if (i >= 0) stack.splice(i, 1);
    };
}

/** يغلق أعلى طبقة كروم مفتوحة. true = استُهلك الحدث */
export function dismissTopRepositoryChrome(): boolean {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i]()) {
            stack.splice(i, 1);
            return true;
        }
    }
    return false;
}

/** عند إخفاء المستودع — يصفّر القوائم كي لا تبقى مفتوحة عند إعادة الفتح */
export function dismissAllRepositoryChrome(): void {
    const copy = stack.slice().reverse();
    for (const dismiss of copy) dismiss();
}

export function resetRepositoryChromeDismissStackForTests(): void {
    stack.length = 0;
}
