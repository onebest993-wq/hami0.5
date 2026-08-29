/**
 * keepAlive الدافئ يُكلّف شجرة React كاملة في الخلفية.
 * على الهاتف الأصلي أو وضع التوفير نُبقي المقطع في الذاكرة فقط ونركّب الشجرة عند الفتح.
 */
export function shouldKeepNotificationHostWarm(): boolean {
    if (typeof document === 'undefined') return true;
    const root = document.documentElement.dataset;
    if (root.hamiLite === '1') return false;
    if (root.hamiNative === '1') return false;
    return true;
}
