/**
 * djb2 — هاش نصّي مضغوط (deterministic, worker-safe).
 * يُستخدم لبناء توقيعات كاش واعية بالمحتوى دون إطالة المفتاح.
 */
export function djb2Hash(text: string): number {
    let hash = 5381;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    }
    return hash >>> 0;
}
