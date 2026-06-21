/**
 * يدمج طلبات wife-sign المتزامنة المتطابقة لنفس المستخدم على نفس المثيل.
 * لا TTL cache — كل nonce يُستهلك مرة عند استدعاء API الهدف.
 */

type WifeSignInflightInput = {
    subject: string;
    method: string;
    url: string;
    body: string;
    contentHash?: string;
};

const inflight = new Map<string, Promise<Record<string, string>>>();

function buildKey(input: WifeSignInflightInput): string {
    return JSON.stringify({
        s: input.subject,
        m: input.method.toUpperCase(),
        u: input.url,
        b: input.body,
        c: input.contentHash ?? '',
    });
}

export async function coalesceWifeSign<T>(
    input: WifeSignInflightInput,
    sign: () => Promise<T>,
): Promise<T> {
    const key = buildKey(input);
    const pending = inflight.get(key);
    if (pending) {
        return pending as Promise<T>;
    }

    const promise = sign().finally(() => {
        if (inflight.get(key) === promise) {
            inflight.delete(key);
        }
    });

    inflight.set(key, promise as Promise<Record<string, string>>);
    return promise;
}

/** للاختبارات */
export function clearWifeSignInflightForTests(): void {
    inflight.clear();
}
