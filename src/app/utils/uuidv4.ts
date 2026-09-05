/** معرّف محلي — بلا KV ولا بوابة عمل ولا SecureAPI. */
export function uuidv4(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}
