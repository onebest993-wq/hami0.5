import { EXECUTION_PHONE_BODY_PROP_KEYS } from './executionPhoneBodyPropKeys';

/** ينسخ كل مصادر scope إلى ref — بدون قائمة بيضاء جزئية */
export function assignExecutionPhoneBodyScope(
    target: Record<string, unknown>,
    sources: Record<string, unknown>,
): void {
    for (const key of EXECUTION_PHONE_BODY_PROP_KEYS) {
        if (Object.prototype.hasOwnProperty.call(sources, key)) {
            target[key] = sources[key];
        }
    }
    for (const key of Object.keys(sources)) {
        if (!Object.prototype.hasOwnProperty.call(target, key)) {
            target[key] = sources[key];
        }
    }
}

export function pickExecutionPhoneBodyProps(
    sources: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of EXECUTION_PHONE_BODY_PROP_KEYS) {
        out[key] = sources[key];
    }
    return out;
}
