/** معرّفات داخلية للإضبارة الجنائية — UUID عند التوفر. */
export function createCriminalId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && 'randomUUID' in cryptoObj && typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
